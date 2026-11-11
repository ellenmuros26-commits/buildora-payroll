import {
  ApiError
} from "../models/payroll-finance/PayrollPeriod.js";

// ======================================
// BUILDORA PAYROLL & FINANCE ROLES
// ======================================

export const PO = "Payroll / Finance Officer";
export const FM = "Finance Manager";
export const HR = "HR Manager";
export const WORKER = "Worker";

// ======================================
// CHECK USER ROLE
// ======================================

export function hasRole(req, ...roles) {
  if (!req.user || !Array.isArray(req.user.roles)) {
    return false;
  }

  return roles.some((role) => {
    return req.user.roles.includes(role);
  });
}

// ======================================
// CHECK USER PERMISSION
// ======================================

export function can(req, permission) {
  if (
    !req.user ||
    !Array.isArray(req.user.permissions)
  ) {
    return false;
  }

  return req.user.permissions.includes(permission);
}

// ======================================
// ROLE AND PERMISSION MIDDLEWARE
// ======================================

export function permit(roles, permission = null) {
  return (req, res, next) => {

    // Check authorized role
    if (!hasRole(req, ...roles)) {
      return next(
        new ApiError(
          403,
          "Your role cannot access this feature."
        )
      );
    }

    // Check required database permission
    if (permission && !can(req, permission)) {
      return next(
        new ApiError(
          403,
          "Missing permission: " + permission
        )
      );
    }

    // Authorized
    return next();
  };
}

// ======================================
// REDIRECT USER BASED ON ROLE
// ======================================

export function landingPage(roles = []) {

  if (roles.includes(PO)) {
    return "/payroll-finance/payroll-finance-officer";
  }

  if (roles.includes(FM)) {
    return "/payroll-finance/finance-manager";
  }

  if (roles.includes(HR)) {
    return "/payroll-finance/hr-manager";
  }

  // Optional read-only worker payslip
  if (roles.includes(WORKER)) {
    return "/payroll-finance/worker-payslip";
  }

  return "/login?error=role";
}