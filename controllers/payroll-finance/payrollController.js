
import {
  rows, one, insert, run, atomic, audit, check,
  positiveId, str, optional, amount, round,
  dateOnly, enumValue, ok
} from "../../models/payroll-finance/PayrollPeriod.js";

// Initial development payroll policy.
// Confirm statutory deductions and overtime rules before real payroll.
const REGULAR_HOURS_PER_DAY = 8;

// ========================================
// INTERNAL HELPERS
// ========================================

async function getPeriod(id, tx = null, lock = false) {
  const sql =
    "SELECT * FROM payroll_periods WHERE id = :id" +
    (lock ? " FOR UPDATE" : "");

  const period = await one(sql, { id }, tx);

  check(period, "Payroll period not found", 404);

  return period;
}

async function getRecord(id, tx = null, lock = false) {
  const sql =
    "SELECT * FROM payroll_records WHERE id = :id" +
    (lock ? " FOR UPDATE" : "");

  const record = await one(sql, { id }, tx);

  check(record, "Payroll record not found", 404);

  return record;
}

// ========================================
// PAYROLL CALCULATION
// ========================================

async function calculatePay(
  period,
  workerId,
  monthlyBasePay,
  tx = null
) {
  const worker = await one(
    "SELECT id, worker_code, first_name, last_name, employment_status " +
    "FROM workers WHERE id = :id",
    { id: workerId },
    tx
  );

  check(worker, "Worker not found", 404);

  check(
    worker.employment_status === "Active",
    "Only active workers can be processed",
    409
  );

  // Find a single pay rate covering the entire payroll period.
  const rates = await rows(
    "SELECT * FROM worker_pay_rates " +
    "WHERE worker_id = :workerId AND effective_date <= :startDate " +
    "AND (end_date IS NULL OR end_date >= :endDate) " +
    "ORDER BY effective_date DESC, id DESC",
    {
      workerId,
      startDate: period.start_date,
      endDate: period.end_date
    },
    tx
  );

  check(
    rates.length === 1,
    "Exactly one pay rate must cover the entire payroll period",
    409
  );

  const rate = rates[0];

  // Do not process payroll while attendance remains unverified.
  const pending = await one(
    "SELECT COUNT(*) AS total FROM attendance " +
    "WHERE worker_id = :workerId " +
    "AND attendance_date BETWEEN :startDate AND :endDate " +
    "AND verification_status <> 'Verified'",
    {
      workerId,
      startDate: period.start_date,
      endDate: period.end_date
    },
    tx
  );

  check(
    Number(pending.total) === 0,
    "Unverified attendance exists. Ask Workforce to finalize it first.",
    409
  );

  const summary = await one(
    "SELECT COUNT(*) AS verified_days, " +
    "COALESCE(SUM(total_work_hours), 0) AS total_hours, " +
    "COALESCE(SUM(LEAST(total_work_hours, :regularHours)), 0) AS regular_hours " +
    "FROM attendance " +
    "WHERE worker_id = :workerId " +
    "AND attendance_date BETWEEN :startDate AND :endDate " +
    "AND verification_status = 'Verified' " +
    "AND attendance_status IN ('Present', 'Late', 'Half Day')",
    {
      workerId,
      startDate: period.start_date,
      endDate: period.end_date,
      regularHours: REGULAR_HOURS_PER_DAY
    },
    tx
  );

  check(
    Number(summary.verified_days) > 0,
    "No verified payable attendance for this worker",
    409
  );

  const totalHours = round(summary.total_hours);
  const regularHours = round(summary.regular_hours);
  const workDays = round(
    regularHours / REGULAR_HOURS_PER_DAY
  );

  const payRate = Number(rate.pay_rate);

  let basicPay;

  if (rate.pay_type === "Hourly") {
    basicPay = round(regularHours * payRate);

  } else if (rate.pay_type === "Daily") {
    basicPay = round(workDays * payRate);

  } else {
    // Monthly salary requires an approved basic amount.
    // No automatic proration without an approved payroll policy.
    basicPay = amount(monthlyBasePay, 0.01);
  }

  check(
    basicPay > 0,
    "Basic pay must be greater than zero",
    409
  );

  return {
    worker,
    pay_rate_id: rate.id,
    pay_type: rate.pay_type,
    pay_rate: payRate,
    total_work_hours: totalHours,
    total_work_days: workDays,
    regular_hours: regularHours,
    excess_hours: round(
      Math.max(0, totalHours - regularHours)
    ),
    basic_pay: basicPay,
    warning:
      "Overtime multipliers and statutory deductions are not automatically computed."
  };
}

// ========================================
// PAYROLL PERIODS
// ========================================

export async function listPeriods(req, res) {
  const periods = await rows(
    "SELECT p.*, " +
    "(SELECT COUNT(*) FROM payroll_records r WHERE r.payroll_period_id = p.id) " +
    "AS record_count FROM payroll_periods p " +
    "ORDER BY p.start_date DESC, p.id DESC"
  );

  return ok(res, periods);
}

export async function createPeriod(req, res) {
  const b = req.body || {};

  const periodName = str(
    b.period_name,
    "Period name",
    100
  );

  const startDate = dateOnly(
    b.start_date,
    "Start date"
  );

  const endDate = dateOnly(
    b.end_date,
    "End date"
  );

  const paymentDate = dateOnly(
    b.payment_date,
    "Payment date",
    true
  );

  check(
    startDate <= endDate,
    "End date cannot be before start date"
  );

  const created = await atomic(async (tx) => {
    const overlap = await one(
      "SELECT id FROM payroll_periods " +
      "WHERE start_date <= :endDate AND end_date >= :startDate LIMIT 1",
      {
        startDate,
        endDate
      },
      tx
    );

    check(
      !overlap,
      "A payroll period overlaps these dates",
      409
    );

    const id = await insert(
      "INSERT INTO payroll_periods " +
      "(period_name, start_date, end_date, payment_date, created_by) " +
      "VALUES (:periodName, :startDate, :endDate, :paymentDate, :userId)",
      {
        periodName,
        startDate,
        endDate,
        paymentDate,
        userId: req.user.id
      },
      tx
    );

    await audit(
      req.user.id,
      "period.create",
      id,
      "Payroll period " + startDate + " to " + endDate,
      tx
    );

    return { id };
  });

  return ok(res, created, 201);
}

// ========================================
// PAYROLL PREVIEW
// ========================================

export async function previewPayroll(req, res) {
  const period = await getPeriod(
    positiveId(req.params.periodId)
  );

  const calculated = await calculatePay(
    period,
    positiveId(req.params.workerId),
    req.query.basic_pay
  );

  return ok(res, calculated);
}

// ========================================
// PAYROLL RECORDS
// ========================================

export async function listPayroll(req, res) {
  const records = await rows(
    "SELECT r.*, p.period_name, p.start_date, p.end_date, " +
    "w.worker_code, CONCAT(w.first_name, ' ', w.last_name) AS worker_name " +
    "FROM payroll_records r " +
    "JOIN payroll_periods p ON p.id = r.payroll_period_id " +
    "JOIN workers w ON w.id = r.worker_id " +
    "ORDER BY r.id DESC"
  );

  return ok(res, records);
}

export async function showPayroll(req, res) {
  const id = positiveId(req.params.id);

  const record = await one(
    "SELECT r.*, p.period_name, " +
    "CONCAT(w.first_name, ' ', w.last_name) AS worker_name " +
    "FROM payroll_records r " +
    "JOIN payroll_periods p ON p.id = r.payroll_period_id " +
    "JOIN workers w ON w.id = r.worker_id " +
    "WHERE r.id = :id",
    { id }
  );

  check(record, "Payroll record not found", 404);

  const items = await rows(
    "SELECT * FROM payroll_items WHERE payroll_record_id = :id ORDER BY id",
    { id }
  );

  const payments = await rows(
    "SELECT * FROM payroll_payments WHERE payroll_record_id = :id ORDER BY id",
    { id }
  );

  return ok(res, {
    ...record,
    items,
    payments
  });
}

// ========================================
// GENERATE PAYROLL
// ========================================

export async function generatePayroll(req, res) {
  const b = req.body || {};

  const periodId = positiveId(b.payroll_period_id);
  const workerId = positiveId(b.worker_id);

  const created = await atomic(async (tx) => {
    const period = await getPeriod(
      periodId,
      tx,
      true
    );

    check(
      ["Open", "Processing"].includes(period.period_status),
      "This payroll period cannot be processed",
      409
    );

    const existing = await one(
      "SELECT id FROM payroll_records " +
      "WHERE payroll_period_id = :periodId AND worker_id = :workerId",
      {
        periodId,
        workerId
      },
      tx
    );

    check(
      !existing,
      "Payroll already generated for this worker and period",
      409
    );

    const calc = await calculatePay(
      period,
      workerId,
      b.basic_pay,
      tx
    );

    const id = await insert(
      "INSERT INTO payroll_records " +
      "(payroll_period_id, worker_id, pay_rate_id, " +
      "total_work_hours, total_work_days, basic_pay, " +
      "overtime_pay, allowances, total_deductions, gross_pay, net_pay, " +
      "payroll_status, remarks) " +
      "VALUES (:periodId, :workerId, :rateId, " +
      ":hours, :days, :basic, 0, 0, 0, :basic, :basic, 'Draft', :remarks)",
      {
        periodId,
        workerId,
        rateId: calc.pay_rate_id,
        hours: calc.total_work_hours,
        days: calc.total_work_days,
        basic: calc.basic_pay,
        remarks: optional(b.remarks)
      },
      tx
    );

    await run(
      "UPDATE payroll_periods SET period_status = 'Processing' WHERE id = :id",
      { id: periodId },
      tx
    );

    await audit(
      req.user.id,
      "payroll.generate",
      id,
      "Worker #" + workerId + "; period #" + periodId,
      tx
    );

    return {
      id,
      payroll_status: "Draft",
      ...calc
    };
  });

  return ok(res, created, 201);
}

// ========================================
// RECALCULATE EARNINGS AND DEDUCTIONS
// ========================================

async function recalculate(recordId, tx) {
  const record = await getRecord(
    recordId,
    tx,
    true
  );

  const totals = await one(
    "SELECT " +
    "COALESCE(SUM(CASE WHEN item_type = 'Earning' THEN amount ELSE 0 END),0) " +
    "AS earnings, " +
    "COALESCE(SUM(CASE WHEN item_type = 'Deduction' THEN amount ELSE 0 END),0) " +
    "AS deductions FROM payroll_items WHERE payroll_record_id = :id",
    { id: recordId },
    tx
  );

  const earnings = round(totals.earnings);
  const deductions = round(totals.deductions);

  const gross = round(
    Number(record.basic_pay) +
    Number(record.overtime_pay) +
    earnings
  );

  check(
    deductions <= gross,
    "Deductions cannot exceed gross pay",
    409
  );

  const net = round(gross - deductions);

  await run(
    "UPDATE payroll_records SET allowances = :earnings, " +
    "total_deductions = :deductions, gross_pay = :gross, net_pay = :net " +
    "WHERE id = :id",
    {
      id: recordId,
      earnings,
      deductions,
      gross,
      net
    },
    tx
  );

  return {
    earnings,
    deductions,
    gross_pay: gross,
    net_pay: net
  };
}

// ========================================
// ADD PAYROLL ITEM
// ========================================

export async function addItem(req, res) {
  const recordId = positiveId(req.params.id);
  const b = req.body || {};

  const itemType = enumValue(
    b.item_type,
    ["Earning", "Deduction"],
    "Item type"
  );

  const itemName = str(
    b.item_name,
    "Item name",
    150
  );

  const itemAmount = amount(b.amount, 0.01);

  const result = await atomic(async (tx) => {
    const record = await getRecord(
      recordId,
      tx,
      true
    );

    check(
      record.payroll_status === "Draft",
      "Only Draft payroll can be modified",
      409
    );

    const id = await insert(
      "INSERT INTO payroll_items " +
      "(payroll_record_id, item_type, item_name, amount, description) " +
      "VALUES (:recordId, :itemType, :itemName, :itemAmount, :description)",
      {
        recordId,
        itemType,
        itemName,
        itemAmount,
        description: optional(b.description)
      },
      tx
    );

    const totals = await recalculate(
      recordId,
      tx
    );

    await audit(
      req.user.id,
      "payroll.item.add",
      recordId,
      itemType + ": " + itemName,
      tx
    );

    return {
      id,
      ...totals
    };
  });

  return ok(res, result, 201);
}

// ========================================
// REMOVE PAYROLL ITEM
// ========================================

export async function removeItem(req, res) {
  const itemId = positiveId(req.params.id);

  const result = await atomic(async (tx) => {
    const item = await one(
      "SELECT * FROM payroll_items WHERE id = :id",
      { id: itemId },
      tx
    );

    check(item, "Payroll item not found", 404);

    const record = await getRecord(
      item.payroll_record_id,
      tx,
      true
    );

    check(
      record.payroll_status === "Draft",
      "Only Draft payroll items can be removed",
      409
    );

    await run(
      "DELETE FROM payroll_items WHERE id = :id",
      { id: itemId },
      tx
    );

    const totals = await recalculate(
      record.id,
      tx
    );

    await audit(
      req.user.id,
      "payroll.item.remove",
      record.id,
      "Item #" + itemId,
      tx
    );

    return totals;
  });

  return ok(res, result);
}

// ========================================
// SUBMIT PAYROLL FOR APPROVAL
// ========================================

export async function submitPayroll(req, res) {
  const recordId = positiveId(req.params.id);

  const result = await atomic(async (tx) => {
    const record = await getRecord(
      recordId,
      tx,
      true
    );

    check(
      record.payroll_status === "Draft",
      "Only Draft payroll can be submitted",
      409
    );

    check(
      Number(record.net_pay) >= 0,
      "Net pay cannot be negative",
      409
    );

    await run(
      "UPDATE payroll_records SET payroll_status = 'For Approval' WHERE id = :id",
      { id: recordId },
      tx
    );

    await audit(
      req.user.id,
      "payroll.submit",
      recordId,
      "Submitted for Finance Manager review",
      tx
    );

    return {
      id: recordId,
      payroll_status: "For Approval"
    };
  });

  return ok(res, result);
}

// ========================================
// FINANCE MANAGER APPROVAL
// ========================================

export async function approvePayroll(req, res) {
  const recordId = positiveId(req.params.id);

  const result = await atomic(async (tx) => {
    const record = await getRecord(
      recordId,
      tx,
      true
    );

    check(
      record.payroll_status === "For Approval",
      "Only submitted payroll can be approved",
      409
    );

    await run(
      "UPDATE payroll_records SET payroll_status = 'Approved', " +
      "approved_by = :userId, approved_at = NOW() WHERE id = :id",
      {
        id: recordId,
        userId: req.user.id
      },
      tx
    );

    const remaining = await one(
      "SELECT COUNT(*) AS total FROM payroll_records " +
      "WHERE payroll_period_id = :periodId " +
      "AND payroll_status NOT IN ('Approved', 'Paid')",
      { periodId: record.payroll_period_id },
      tx
    );

    if (Number(remaining.total) === 0) {
      await run(
        "UPDATE payroll_periods SET period_status = 'Approved' WHERE id = :id",
        { id: record.payroll_period_id },
        tx
      );
    }

    await audit(
      req.user.id,
      "payroll.approve",
      recordId,
      "Approved by Finance Manager",
      tx
    );

    return {
      id: recordId,
      payroll_status: "Approved"
    };
  });

  return ok(res, result);
}

// ========================================
// WORKER READ-ONLY PAYSLIPS
// ========================================

export async function myPayslips(req, res) {
  // Each worker can access only their linked worker record.
  const worker = await one(
    "SELECT id FROM workers WHERE user_id = :userId",
    { userId: req.user.id }
  );

  if (!worker) {
    return ok(res, []);
  }

  const records = await rows(
    "SELECT r.id, r.total_work_hours, r.total_work_days, " +
    "r.basic_pay, r.overtime_pay, r.allowances, " +
    "r.total_deductions, r.gross_pay, r.net_pay, " +
    "p.period_name, p.start_date, p.end_date, p.payment_date " +
    "FROM payroll_records r " +
    "JOIN payroll_periods p ON p.id = r.payroll_period_id " +
    "WHERE r.worker_id = :workerId AND r.payroll_status = 'Paid' " +
    "ORDER BY p.end_date DESC",
    { workerId: worker.id }
  );

  for (const record of records) {
    record.items = await rows(
      "SELECT item_type, item_name, amount, description " +
      "FROM payroll_items WHERE payroll_record_id = :id ORDER BY id",
      { id: record.id }
    );
  }

  return ok(res, records);
}