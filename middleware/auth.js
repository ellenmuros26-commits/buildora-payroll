import { randomBytes } from "node:crypto";
import {
  rows,
  ApiError
} from "../models/payroll-finance/PayrollPeriod.js";

export async function authenticate(req, res, next) {
  try {
    const userId = req.session?.userId || req.session?.user?.id;

    if (!userId) {
      if (req.originalUrl.includes("/api/")) {
        throw new ApiError(401, "Login required");
      }
      return res.redirect("/login");
    }

    const accounts = await rows(
      `SELECT id, name, email
       FROM users
       WHERE id = :id`,
      { id: userId }
    );

    if (!accounts.length) {
      throw new ApiError(401, "Account not found");
    }

    const grants = await rows(
      `SELECT DISTINCT r.role_name, p.permission_name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = :id`,
      { id: userId }
    );

    const roles = [...new Set(grants.map(r => r.role_name))];
    const permissions = [
      ...new Set(grants.map(r => r.permission_name).filter(Boolean))
    ];

    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString("hex");
    }

    req.user = {
      ...accounts[0],
      roles,
      permissions
    };

    req.session.userId = accounts[0].id;
    req.session.user = {
      id: accounts[0].id,
      name: accounts[0].name,
      email: accounts[0].email,
      roles
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function csrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  if (
    !req.session?.csrfToken ||
    req.get("X-CSRF-Token") !== req.session.csrfToken
  ) {
    return next(new ApiError(403, "Invalid CSRF token"));
  }

  next();
}