import { DataTypes as T } from "sequelize";
import { sequelize } from "./PayrollPeriod.js";

export const WorkerPayRate = sequelize.define("WorkerPayRate", {
  id: { type: T.INTEGER, primaryKey: true, autoIncrement: true },
  worker_id: T.INTEGER,
  pay_type: T.ENUM("Hourly", "Daily", "Monthly"),
  pay_rate: T.DECIMAL(12, 2),
  effective_date: T.DATEONLY,
  end_date: T.DATEONLY,
  created_by: T.INTEGER
}, {
  tableName: "worker_pay_rates",
  timestamps: false
});

export default WorkerPayRate;