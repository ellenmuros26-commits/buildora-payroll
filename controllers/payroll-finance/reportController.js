import {
  rows, one, ok
} from "../../models/payroll-finance/PayrollPeriod.js";

import {
  PO, FM, HR, hasRole
} from "../../middleware/role.js";

export async function listWorkers(req, res) {
  ok(res, await rows(
    `SELECT id, worker_code, first_name, middle_name, last_name,
            employment_type, hire_date, employment_status
     FROM workers
     ORDER BY first_name, last_name`
  ));
}

export async function listAttendance(req, res) {
  // HR and Payroll can review verified attendance.
  // Workforce remains the owner of attendance verification.
  ok(res, await rows(
    `SELECT a.id, a.worker_id, a.attendance_date,
            a.total_work_hours, a.attendance_status,
            a.verification_status, a.verified_at,
            w.worker_code,
            CONCAT(w.first_name, ' ', w.last_name) AS worker_name
     FROM attendance a
     JOIN workers w ON w.id = a.worker_id
     WHERE a.verification_status = 'Verified'
     ORDER BY a.attendance_date DESC, a.id DESC
     LIMIT 500`
  ));
}

export async function dashboard(req, res) {
  if (hasRole(req, HR) && !hasRole(req, PO, FM)) {
    const stats = await one(
      `SELECT
        (SELECT COUNT(*) FROM workers
         WHERE employment_status = 'Active') AS active_workers,
        (SELECT COUNT(*) FROM attendance
         WHERE verification_status = 'Verified') AS verified_attendance,
        (SELECT COUNT(*) FROM attendance
         WHERE verification_status = 'Pending') AS pending_attendance,
        (SELECT COALESCE(SUM(total_work_hours),0)
         FROM attendance
         WHERE verification_status = 'Verified') AS verified_hours`
    );

    return ok(res, {
      role: HR,
      stats
    });
  }

  const stats = await one(
    `SELECT
      (SELECT COUNT(*) FROM payroll_periods) AS periods,
      (SELECT COUNT(*) FROM payroll_records) AS payroll_records,
      (SELECT COUNT(*) FROM payroll_records
       WHERE payroll_status = 'For Approval') AS pending_approval,
      (SELECT COALESCE(SUM(net_pay),0) FROM payroll_records
       WHERE payroll_status IN ('Approved','Paid')) AS approved_payroll,
      (SELECT COALESCE(SUM(payment_amount),0) FROM payroll_payments
       WHERE payment_status = 'Completed') AS disbursed,
      (SELECT COALESCE(SUM(allocated_amount),0) FROM project_budgets
       WHERE budget_status = 'Approved') AS approved_budget,
      (SELECT COALESCE(SUM(expense_amount),0) FROM project_expenses)
       AS project_expenses`
  );

  ok(res, {
    role: hasRole(req, FM) ? FM : PO,
    stats
  });
}

export async function reports(req, res) {
  const byStatus = await rows(
    `SELECT payroll_status AS status,
            COUNT(*) AS records,
            COALESCE(SUM(gross_pay), 0) AS gross,
            COALESCE(SUM(total_deductions), 0) AS deductions,
            COALESCE(SUM(net_pay), 0) AS net
     FROM payroll_records
     GROUP BY payroll_status`
  );

  const byPeriod = await rows(
    `SELECT p.id, p.period_name, p.period_status,
            COUNT(r.id) AS workers,
            COALESCE(SUM(r.gross_pay), 0) AS gross,
            COALESCE(SUM(r.net_pay), 0) AS net
     FROM payroll_periods p
     LEFT JOIN payroll_records r ON r.payroll_period_id = p.id
     GROUP BY p.id, p.period_name, p.period_status
     ORDER BY p.start_date DESC`
  );

  const spending = await rows(
    `SELECT p.project_name,
            COALESCE(SUM(e.expense_amount),0) AS total_expenses
     FROM projects p
     LEFT JOIN project_expenses e ON e.project_id = p.id
     GROUP BY p.id, p.project_name
     ORDER BY total_expenses DESC`
  );

  ok(res, { byStatus, byPeriod, spending });
}