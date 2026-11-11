
import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  authenticate,
  csrf
} from "../../middleware/auth.js";

import {
  permit,
  PO,
  FM,
  HR,
  WORKER
} from "../../middleware/role.js";

import {
  wrap
} from "../../models/payroll-finance/PayrollPeriod.js";

import {
  me
} from "../../controllers/authController.js";

import * as payroll from "../../controllers/payroll-finance/payrollController.js";
import * as rates from "../../controllers/payroll-finance/payRateController.js";
import * as payments from "../../controllers/payroll-finance/paymentController.js";
import * as budgets from "../../controllers/payroll-finance/budgetController.js";
import * as expenses from "../../controllers/payroll-finance/expenseController.js";
import * as reports from "../../controllers/payroll-finance/reportController.js";

// ========================================
// BUILDORA PAYROLL & FINANCE ROUTER
// ========================================

const router = Router();

// Require login before accessing this module.
router.use(authenticate);

// ========================================
// ROLE-BASED DASHBOARD PAGES
// ========================================

const pages = [
  [
    "/payroll-finance-officer",
    PO,
    "payroll-finance-officer"
  ],
  [
    "/finance-manager",
    FM,
    "finance-manager"
  ],
  [
    "/hr-manager",
    HR,
    "hr-manager"
  ],
  [
    "/worker-payslip",
    WORKER,
    "worker-payslip"
  ]
];

for (const [url, role, view] of pages) {
  router.get(
    url,
    permit([role]),
    (req, res) => {
      return res.render("payroll-finance/" + view);
    }
  );
}

// ========================================
// SHARED DASHBOARD JAVASCRIPT
// ========================================

router.get("/assets/ui.js", (req, res) => {
  const directory = path.dirname(
    fileURLToPath(import.meta.url)
  );

  return res.sendFile(
    path.resolve(
      directory,
      "../../views/payroll-finance/ui.js"
    )
  );
});

// ========================================
// API ROUTER
// ========================================

const api = Router();

// Check CSRF tokens on write requests.
api.use(csrf);

// ========================================
// ROUTE HELPERS
// ========================================

const get = (url, roles, permission, handler) => {
  return api.get(
    url,
    permit(roles, permission),
    wrap(handler)
  );
};

const post = (url, roles, permission, handler) => {
  return api.post(
    url,
    permit(roles, permission),
    wrap(handler)
  );
};

const patch = (url, roles, permission, handler) => {
  return api.patch(
    url,
    permit(roles, permission),
    wrap(handler)
  );
};

const del = (url, roles, permission, handler) => {
  return api.delete(
    url,
    permit(roles, permission),
    wrap(handler)
  );
};

// ========================================
// AUTHENTICATED USER
// ========================================

get(
  "/me",
  [PO, FM, HR, WORKER],
  null,
  me
);

// ========================================
// PAYROLL PERIODS
// ========================================

get(
  "/periods",
  [PO, FM],
  null,
  payroll.listPeriods
);

post(
  "/periods",
  [PO],
  "payroll.manage",
  payroll.createPeriod
);

// ========================================
// PAYROLL PROCESSING
// ========================================

get(
  "/payroll",
  [PO, FM],
  null,
  payroll.listPayroll
);

get(
  "/payroll/preview/:periodId/:workerId",
  [PO],
  "payroll.manage",
  payroll.previewPayroll
);

get(
  "/payroll/:id",
  [PO, FM],
  null,
  payroll.showPayroll
);

post(
  "/payroll",
  [PO],
  "payroll.manage",
  payroll.generatePayroll
);

post(
  "/payroll/:id/items",
  [PO],
  "payroll.manage",
  payroll.addItem
);

del(
  "/payroll/items/:id",
  [PO],
  "payroll.manage",
  payroll.removeItem
);

// Payroll Officer submits payroll for approval.
post(
  "/payroll/:id/submit",
  [PO],
  "payroll.manage",
  payroll.submitPayroll
);

// Finance Manager approves submitted payroll.
post(
  "/payroll/:id/approve",
  [FM],
  "finance.approve",
  payroll.approvePayroll
);

// ========================================
// WORKER PAY RATES
// ========================================

get(
  "/rates",
  [PO],
  "payroll.manage",
  rates.listRates
);

post(
  "/rates",
  [PO],
  "payroll.manage",
  rates.createRate
);

patch(
  "/rates/:id/close",
  [PO],
  "payroll.manage",
  rates.closeRate
);

// ========================================
// PAYROLL PAYMENTS
// ========================================

get(
  "/payments",
  [PO, FM],
  null,
  payments.listPayments
);

post(
  "/payments",
  [PO],
  "payroll.manage",
  payments.recordPayment
);

// ========================================
// PROJECT BUDGETS
// ========================================

get(
  "/budgets",
  [PO, FM],
  "finance.view",
  budgets.listBudgets
);

post(
  "/budgets/:id/approve",
  [FM],
  "finance.approve",
  budgets.approveBudget
);

// ========================================
// PROJECT EXPENSES
// ========================================

get(
  "/expenses",
  [PO, FM],
  "finance.view",
  expenses.listExpenses
);

// ========================================
// WORKER DIRECTORY
// ========================================

get(
  "/workers",
  [PO, HR],
  "workers.view",
  reports.listWorkers
);

// ========================================
// VERIFIED ATTENDANCE
// ========================================

get(
  "/attendance",
  [PO, HR],
  "attendance.view",
  reports.listAttendance
);

// ========================================
// DASHBOARDS AND REPORTS
// ========================================

get(
  "/dashboard",
  [PO, FM, HR],
  null,
  reports.dashboard
);

get(
  "/reports",
  [PO, FM],
  "finance.view",
  reports.reports
);

// ========================================
// WORKER READ-ONLY PAYSLIPS
// ========================================

get(
  "/payslips",
  [WORKER],
  "payroll.view_own",
  payroll.myPayslips
);

// ========================================
// REGISTER MODULE API
// ========================================

router.use("/api", api);

export default router;