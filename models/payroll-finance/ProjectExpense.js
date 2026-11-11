import { DataTypes as T } from "sequelize";
import { sequelize } from "./PayrollPeriod.js";

export const ProjectExpense = sequelize.define("ProjectExpense", {
  id: { type: T.INTEGER, primaryKey: true, autoIncrement: true },
  project_id: T.INTEGER,
  recorded_by: T.INTEGER,
  expense_code: T.STRING(50),
  expense_category: T.ENUM(
    "Materials", "Labor", "Equipment",
    "Transportation", "Utilities", "Other"
  ),
  expense_description: T.TEXT,
  expense_amount: T.DECIMAL(14, 2),
  expense_date: T.DATEONLY,
  payment_status: T.ENUM("Unpaid", "Partially Paid", "Paid"),
  receipt_reference: T.STRING(100),
  remarks: T.TEXT
}, {
  tableName: "project_expenses",
  timestamps: false
});

export default ProjectExpense;