
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
    
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";

import {
  one,
  rows,
  wrap,
  ok,
  sequelize
} from "../models/payroll-finance/PayrollPeriod.js";

import {
  landingPage,
  PO,
  FM,
  HR,
  WORKER
} from "../middleware/role.js";

const ALLOWED = [PO, FM, HR, WORKER];

export function loginPage(req, res) {
  if (req.session?.userId && req.session?.user?.roles) {
    return res.redirect(landingPage(req.session.user.roles));
  }

  res.render("login", {
    title: "BUILDORA | Payroll & Finance"
  });
}

export function registerPage(req, res) {
  res.status(403).send("Public registration is disabled.");
}

export function registerUser(req, res) {
  res.status(403).send("Accounts are administrator-managed.");
}

export function forgotPasswordPage(req, res) {
  res.status(404).send(
    "Please contact your BUILDORA administrator to reset your password."
  );
}

export function dashboardPage(req, res) {
  if (!req.session?.userId) {
    return res.redirect("/login");
  }

  return res.redirect(landingPage(req.session.user?.roles || []));
}

export const loginUser = wrap(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.redirect("/login?error=invalid");
  }

  const user = await one(
    `SELECT id, name, email, password
     FROM users
     WHERE email = :email`,
    { email }
  );

  const dummyHash =
    "$2b$12$KbQiGFIhqQTBE28g.lmmKOBt5tbopQvvpG9nDyNn03K9uHCTdV5Ue";

  const matched = await bcrypt.compare(
    password,
    user?.password || dummyHash
  ).catch(() => false);

  if (!user || !matched) {
    return res.redirect("/login?error=invalid");
  }

  const records = await rows(
    `SELECT DISTINCT r.role_name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = :id`,
    { id: user.id }
  );

  const roles = records.map(record => record.role_name);

  if (!roles.some(role => ALLOWED.includes(role))) {
    return res.redirect("/login?error=role");
  }

  await new Promise((resolve, reject) =>
    req.session.regenerate(error =>
      error ? reject(error) : resolve()
    )
  );

  req.session.userId = user.id;
  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    roles
  };
  req.session.csrfToken = randomBytes(32).toString("hex");

  await new Promise((resolve, reject) =>
    req.session.save(error =>
      error ? reject(error) : resolve()
    )
  );

  res.redirect(landingPage(roles));
});

export const login = loginUser;

export const me = (req, res) => ok(res, {
  id: req.user.id,
  name: req.user.name,
  email: req.user.email,
  roles: req.user.roles,
  permissions: req.user.permissions,
  csrfToken: req.session.csrfToken
});

function endSession(req, res, next, json = false) {
  req.session.destroy(error => {
    if (error) return next(error);

    res.clearCookie("connect.sid", { path: "/" });
    res.clearCookie("buildora.sid", { path: "/" });

    if (json) {
      return res.json({
        success: true,
        data: { message: "Logged out" }
      });
    }

    return res.redirect("/login");
  });
}

export const logoutUser = (req, res, next) =>
  endSession(req, res, next);

export const logout = (req, res, next) =>
  endSession(req, res, next, true);
