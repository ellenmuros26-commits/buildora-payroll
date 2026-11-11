import {
  rows, one, run, atomic, audit,
  check, positiveId, ok
} from "../../models/payroll-finance/PayrollPeriod.js";

export async function listBudgets(req, res) {
  ok(res, await rows(
    `SELECT b.*, p.project_code, p.project_name,
            creator.name AS created_by_name,
            approver.name AS approved_by_name
     FROM project_budgets b
     JOIN projects p ON p.id = b.project_id
     JOIN users creator ON creator.id = b.created_by
     LEFT JOIN users approver ON approver.id = b.approved_by
     ORDER BY b.id DESC`
  ));
}

export async function approveBudget(req, res) {
  const budgetId = positiveId(req.params.id);

  const result = await atomic(async tx => {
    const budget = await one(
      `SELECT * FROM project_budgets
       WHERE id = :id FOR UPDATE`,
      { id: budgetId },
      tx
    );

    check(budget, "Budget not found", 404);
    check(budget.budget_status === "Draft",
      "Only Draft budgets can be approved", 409);

    await run(
      `UPDATE project_budgets
       SET budget_status = 'Approved',
           approved_by = :user,
           approved_at = NOW()
       WHERE id = :id`,
      { id: budgetId, user: req.user.id },
      tx
    );

    await audit(req.user.id, "budget.approve", budgetId,
      budget.budget_name, tx);

    return { id: budgetId, budget_status: "Approved" };
  });

  ok(res, result);
}