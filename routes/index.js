
  /*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    
import { Router } from "express";

import authRoutes from "./auth.js";
import payrollFinance from "./payroll-finance/index.js";

import {
  homePage
} from "../controllers/homeController.js";

import {
  loginPage,
  registerPage,
  dashboardPage,
  forgotPasswordPage
} from "../controllers/authController.js";

import {
  sequelize,
  ok,
  wrap
} from "../models/payroll-finance/PayrollPeriod.js";

const router = Router();

router.get("/", homePage);
router.get("/login", loginPage);
router.get("/register", registerPage);
router.get("/dashboard", dashboardPage);
router.get("/forgotpassword", forgotPasswordPage);

router.get("/api/health", wrap(async (req, res) => {
  await sequelize.authenticate();
  ok(res, {
    system: "BUILDORA Payroll & Finance",
    database: "connected"
  });
}));

router.use(authRoutes);
router.use("/payroll-finance", payrollFinance);

// Handle errors from custom payroll routes.
router.use((err, req, res, next) => {
  const status =
    err.status ||
    (err.original?.errno === 1062 ? 409 : 500);

  if (status >= 500) {
    console.error("[PAYROLL & FINANCE]", err);
  }

  const message = status >= 500
    ? "Database or server error. Check the terminal logs."
    : err.message;

  if (req.originalUrl.includes("/api/")) {
    return res.status(status).json({
      success: false,
      message
    });
  }

  res.status(status).send(message);
});

export default router;