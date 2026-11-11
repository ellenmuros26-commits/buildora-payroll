import { DataTypes as T } from "sequelize";
import { sequelize } from "./PayrollPeriod.js";

export const ProjectBudget = sequelize.define("ProjectBudget", {
  id: { type: T.INTEGER, primaryKey: true, autoIncrement: true },
  project_id: T.INTEGER,
  created_by: T.INTEGER,
  budget_name: T.STRING(150),
  budget_category: T.ENUM(
    "Materials", "Labor", "Equipment",
    "Transportation", "Utilities", "Other"
  ),
  allocated_amount: T.DECIMAL(14, 2),
  start_date: T.DATEONLY,
  end_date: T.DATEONLY,
  budget_status: T.ENUM("Draft", "Approved", "Closed"),
  approved_by: T.INTEGER,
  approved_at: T.DATE,
  remarks: T.TEXT
}, {
  tableName: "project_budgets",
  timestamps: false
});

export default ProjectBudget;