import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const email = "payroll@buildora.local";
const password = process.env.BUILDORA_CHECK_PASSWORD;

async function checkPayrollLogin() {
  let connection;

  try {
    if (!password) {
      throw new Error("Payroll website password was not provided.");
    }

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || process.env.DB_NAME
    });

    const [users] = await connection.execute(
      `SELECT id, email, password
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      console.log("ACCOUNT NOT FOUND");
      return;
    }

    const user = users[0];

    const isCorrect = await bcrypt.compare(
      password,
      user.password
    );

    console.log("Account:", user.email);

    console.log(
      "Password verification:",
      isCorrect ? "CORRECT" : "INCORRECT"
    );

  } catch (error) {
    console.error("Login test failed:", error.message);
    process.exitCode = 1;

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPayrollLogin();