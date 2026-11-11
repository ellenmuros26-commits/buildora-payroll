import { randomBytes } from "node:crypto";

import {
  rows, one, insert, run, atomic, audit,
  check, positiveId, amount, round,
  enumValue, optional, ok
} from "../../models/payroll-finance/PayrollPeriod.js";

const METHODS = ["Cash", "Bank Transfer", "E-Wallet", "Check"];

export async function listPayments(req, res) {
  ok(res, await rows(
    `SELECT pay.*, r.net_pay, r.payroll_status,
            CONCAT(w.first_name, ' ', w.last_name) AS worker_name,
            p.period_name
     FROM payroll_payments pay
     JOIN payroll_records r ON r.id = pay.payroll_record_id
     JOIN workers w ON w.id = r.worker_id
     JOIN payroll_periods p ON p.id = r.payroll_period_id
     ORDER BY pay.id DESC`
  ));
}

export async function recordPayment(req, res) {
  const b = req.body;
  const recordId = positiveId(b.payroll_record_id);
  const value = amount(b.payment_amount, 0.01);
  const method = enumValue(b.payment_method, METHODS, "Payment method");

  const result = await atomic(async tx => {
    const record = await one(
      `SELECT *
       FROM payroll_records
       WHERE id = :id FOR UPDATE`,
      { id: recordId },
      tx
    );

    check(record, "Payroll record not found", 404);
    check(record.payroll_status === "Approved",
      "Only Finance Manager-approved payroll can be paid", 409);

    const totals = await one(
      `SELECT COALESCE(SUM(payment_amount), 0) AS paid
       FROM payroll_payments
       WHERE payroll_record_id = :record
         AND payment_status = 'Completed'`,
      { record: recordId },
      tx
    );

    const alreadyPaid = round(totals.paid);
    const remaining = round(Number(record.net_pay) - alreadyPaid);

    check(remaining > 0, "Payroll already fully paid", 409);
    check(value <= remaining,
      "Payment exceeds remaining balance (" + {remaining} + ")", 409);

    const reference =
      "PAY-" + Date.now() + "-" + randomBytes(4).toString("hex").toUpperCase();

    const paymentId = await insert(
      `INSERT INTO payroll_payments
       (
         payroll_record_id, payment_reference, payment_amount,
         payment_method, payment_date, payment_status,
         processed_by, remarks
       )
       VALUES
       (
         :record, :reference, :amount,
         :method, NOW(), 'Completed',
         :user, :remarks
       )`,
      {
        record: recordId,
        reference,
        amount: value,
        method,
        user: req.user.id,
        remarks: optional(b.remarks)
      },
      tx
    );

    const fullyPaid = round(remaining - value) === 0;

    if (fullyPaid) {
      await run(
        `UPDATE payroll_records
         SET payroll_status = 'Paid'
         WHERE id = :id`,
        { id: recordId },
        tx
      );

      const unfinished = await one(
        `SELECT COUNT(*) AS total
         FROM payroll_records
         WHERE payroll_period_id = :period
           AND payroll_status != 'Paid'`,
        { period: record.payroll_period_id },
        tx
      );

      if (Number(unfinished.total) === 0) {
        await run(
          `UPDATE payroll_periods
           SET period_status = 'Closed'
           WHERE id = :id`,
          { id: record.payroll_period_id },
          tx
        );
      }
    }

    await audit(req.user.id, "payment.record", paymentId,
      "Payroll #" + recordId  + ":" + reference, tx);

    return {
      id: paymentId,
      payment_reference: reference,
      payment_amount: value,
      remaining: round(remaining - value),
      payroll_status: fullyPaid ? "Paid" : "Approved"
    };
  });

  ok(res, result, 201);
}