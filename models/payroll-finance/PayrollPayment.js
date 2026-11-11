import { DataTypes as T } from "sequelize";
import { sequelize } from "./PayrollPeriod.js";

export const PayrollPayment = sequelize.define("PayrollPayment", {
  id: { type: T.INTEGER, primaryKey: true, autoIncrement: true },
  payroll_record_id: T.INTEGER,
  payment_reference: T.STRING(100),
  payment_amount: T.DECIMAL(12, 2),
  payment_method: T.ENUM(
    "Cash", "Bank Transfer", "E-Wallet", "Check"
  ),
  payment_date: T.DATE,
  payment_status: T.ENUM(
    "Pending", "Completed", "Failed", "Cancelled"
  ),
  processed_by: T.INTEGER,
  remarks: T.TEXT
}, {
  tableName: "payroll_payments",
  timestamps: false
});

export default PayrollPayment;