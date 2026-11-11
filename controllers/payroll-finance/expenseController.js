import {
  rows, ok
} from "../../models/payroll-finance/PayrollPeriod.js";

export async function listExpenses(req, res) {
  ok(res, await rows(
    `SELECT e.*, p.project_code, p.project_name,
            u.name AS recorded_by_name
     FROM project_expenses e
     JOIN projects p ON p.id = e.project_id
     JOIN users u ON u.id = e.recorded_by
     ORDER BY e.expense_date DESC, e.id DESC`
  ));
}
