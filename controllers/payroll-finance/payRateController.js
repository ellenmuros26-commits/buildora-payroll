
import {
  rows, one, insert, run, atomic, audit, check,
  positiveId, amount, dateOnly, enumValue, ok
} from "../../models/payroll-finance/PayrollPeriod.js";

const PAY_TYPES = ["Hourly", "Daily", "Monthly"];

function sqlDate(value) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

export async function listRates(req, res) {
  const rates = await rows(
    "SELECT r.*, w.worker_code, " +
    "CONCAT(w.first_name, ' ', w.last_name) AS worker_name " +
    "FROM worker_pay_rates r " +
    "JOIN workers w ON w.id = r.worker_id " +
    "ORDER BY r.effective_date DESC, r.id DESC"
  );

  return ok(res, rates);
}

export async function createRate(req, res) {
  const b = req.body || {};

  const workerId = positiveId(b.worker_id);
  const type = enumValue(b.pay_type, PAY_TYPES, "Pay type");
  const rateAmount = amount(b.pay_rate, 0.01);
  const startDate = dateOnly(b.effective_date, "Effective date");
  const endDate = dateOnly(b.end_date, "End date", true);

  check(
    !endDate || endDate >= startDate,
    "End date cannot be before effective date"
  );

  const created = await atomic(async (tx) => {
    const worker = await one(
      "SELECT id, employment_status FROM workers WHERE id = :id FOR UPDATE",
      { id: workerId },
      tx
    );

    check(worker, "Worker not found", 404);

    check(
      worker.employment_status === "Active",
      "Only active workers can receive a pay rate",
      409
    );

    const conflict = await one(
      "SELECT id FROM worker_pay_rates " +
      "WHERE worker_id = :workerId " +
      "AND effective_date <= COALESCE(:endDate, '9999-12-31') " +
      "AND (end_date IS NULL OR end_date >= :startDate) " +
      "LIMIT 1",
      {
        workerId,
        endDate,
        startDate
      },
      tx
    );

    check(
      !conflict,
      "A pay rate already covers these dates. Close it first.",
      409
    );

    const id = await insert(
      "INSERT INTO worker_pay_rates " +
      "(worker_id, pay_type, pay_rate, effective_date, end_date, created_by) " +
      "VALUES (:workerId, :type, :rateAmount, :startDate, :endDate, :createdBy)",
      {
        workerId,
        type,
        rateAmount,
        startDate,
        endDate,
        createdBy: req.user.id
      },
      tx
    );

    await audit(
      req.user.id,
      "rate.create",
      id,
      "Worker #" + workerId + ": " + type + " PHP " + rateAmount,
      tx
    );

    return {
      id,
      worker_id: workerId,
      pay_type: type,
      pay_rate: rateAmount
    };
  });

  return ok(res, created, 201);
}

export async function closeRate(req, res) {
  const rateId = positiveId(req.params.id);
  const endDate = dateOnly(req.body?.end_date, "End date");

  const updated = await atomic(async (tx) => {
    const rate = await one(
      "SELECT * FROM worker_pay_rates WHERE id = :id FOR UPDATE",
      { id: rateId },
      tx
    );

    check(rate, "Pay rate not found", 404);

    check(
      endDate >= sqlDate(rate.effective_date),
      "End date cannot be before effective date"
    );

    if (rate.end_date) {
      check(
        endDate <= sqlDate(rate.end_date),
        "Cannot extend an already closed rate",
        409
      );
    }

    const used = await one(
      "SELECT COUNT(*) AS total FROM payroll_records r " +
      "JOIN payroll_periods p ON p.id = r.payroll_period_id " +
      "WHERE r.pay_rate_id = :rateId AND p.end_date > :endDate",
      {
        rateId,
        endDate
      },
      tx
    );

    check(
      Number(used.total) === 0,
      "This rate is used by payroll after the selected end date",
      409
    );

    await run(
      "UPDATE worker_pay_rates SET end_date = :endDate WHERE id = :rateId",
      {
        endDate,
        rateId
      },
      tx
    );

    await audit(
      req.user.id,
      "rate.close",
      rateId,
      "Effective until " + endDate,
      tx
    );

    return {
      id: rateId,
      end_date: endDate
    };
  });

  return ok(res, updated);
}