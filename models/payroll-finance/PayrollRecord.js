import { DataTypes as T } from "sequelize";
import { sequelize } from "./PayrollPeriod.js";

export const PayrollRecord = sequelize.define("PayrollRecord", {
  id: { type: T.INTEGER, primaryKey: true, autoIncrement: true },
  payroll_period_id: T.INTEGER,
  worker_id: T.INTEGER,
  pay_rate_id: T.INTEGER,
  total_work_hours: T.DECIMAL(8, 2),
  total_work_days: T.DECIMAL(8, 2),
  basic_pay: T.DECIMAL(12, 2),
  overtime_pay: T.DECIMAL(12, 2),
  allowances: T.DECIMAL(12, 2),
  total_deductions: T.DECIMAL(12, 2),
  gross_pay: T.DECIMAL(12, 2),
  net_pay: T.DECIMAL(12, 2),
  payroll_status: T.ENUM(
    "Draft", "For Approval", "Approved", "Paid", "Cancelled"
  ),
  approved_by: T.INTEGER,
  approved_at: T.DATE,
  remarks: T.TEXT
}, {
  tableName: "payroll_records",
  timestamps: false
});

export default PayrollRecord;