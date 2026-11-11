import { DataTypes as T, QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../userModel.js";

export { sequelize };

// ======================================
// PAYROLL PERIOD MODEL
// ======================================

export const PayrollPeriod = sequelize.define(
  "PayrollPeriod",
  {
    id: {
      type: T.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    period_name: {
      type: T.STRING(100),
      allowNull: false
    },

    start_date: {
      type: T.DATEONLY,
      allowNull: false
    },

    end_date: {
      type: T.DATEONLY,
      allowNull: false
    },

    payment_date: {
      type: T.DATEONLY
    },

    period_status: {
      type: T.ENUM(
        "Open",
        "Processing",
        "Approved",
        "Closed"
      )
    },

    created_by: {
      type: T.INTEGER
    }
  },
  {
    tableName: "payroll_periods",
    timestamps: false
  }
);

// ======================================
// CUSTOM ERROR
// ======================================

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ======================================
// VALIDATION HELPERS
// ======================================

export function check(condition, message, status = 422) {
  if (!condition) {
    throw new ApiError(status, message);
  }
}

export function positiveId(value) {
  const n = Number(value);

  check(
    Number.isSafeInteger(n) && n > 0,
    "Invalid ID"
  );

  return n;
}

export function str(value, name, max = 255) {
  const result = String(value ?? "").trim();

  check(
    result.length > 0 && result.length <= max,
    "Invalid " + name
  );

  return result;
}

export function optional(value, max = 2000) {
  const result = String(value ?? "").trim();

  check(
    result.length <= max,
    "Text is too long"
  );

  return result || null;
}

export function amount(value, minimum = 0) {
  const n = Number(value);

  check(
    value !== "" &&
    value !== null &&
    value !== undefined &&
    Number.isFinite(n) &&
    n >= minimum &&
    n <= 9999999999,
    "Invalid amount"
  );

  return Math.round(
    (n + Number.EPSILON) * 100
  ) / 100;
}

export function round(value) {
  return Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;
}

export function dateOnly(
  value,
  name = "Date",
  nullable = false
) {
  if (nullable && !value) {
    return null;
  }

  const s = String(value || "");

  check(
    /^\d{4}-\d{2}-\d{2}$/.test(s),
    "Invalid " + name
  );

  const d = new Date(s + "T00:00:00Z");

  check(
    !Number.isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === s,
    "Invalid " + name
  );

  return s;
}

export function enumValue(value, values, label) {
  check(
    values.includes(value),
    "Invalid " + label
  );

  return value;
}

// ======================================
// RESPONSE HELPERS
// ======================================

export function ok(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data
  });
}

export const wrap = (fn) => {
  return (req, res, next) => {
    return Promise.resolve(
      fn(req, res, next)
    ).catch(next);
  };
};

// ======================================
// DATABASE QUERY HELPERS
// ======================================

export function rows(
  query,
  replacements = {},
  transaction = null
) {
  return sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
    transaction
  });
}

export async function one(
  query,
  replacements = {},
  transaction = null
) {
  const result = await rows(
    query,
    replacements,
    transaction
  );

  return result[0] || null;
}

export async function insert(
  query,
  replacements = {},
  transaction = null
) {
  const [id] = await sequelize.query(query, {
    replacements,
    type: QueryTypes.INSERT,
    transaction
  });

  return Number(id);
}

export function run(
  query,
  replacements = {},
  transaction = null
) {
  return sequelize.query(query, {
    replacements,
    transaction
  });
}

// ======================================
// DATABASE TRANSACTIONS
// ======================================

export function atomic(handler) {
  return sequelize.transaction(
    {
      isolationLevel:
        Transaction.ISOLATION_LEVELS.READ_COMMITTED
    },
    handler
  );
}

// ======================================
// AUDIT LOGGING
// ======================================

export async function audit(
  userId,
  action,
  recordId,
  description,
  tx = null
) {
  await insert(
    "INSERT INTO audit_logs " +
    "(user_id, action, module_name, record_id, description) " +
    "VALUES (:user, :action, 'Payroll and Finance', :record, :description)",
    {
      user: userId,
      action,
      record: recordId,
      description
    },
    tx
  );
}

// ======================================
// DEFAULT EXPORT
// ======================================

export default PayrollPeriod;