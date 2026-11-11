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

import "dotenv/config";
import { Sequelize } from "sequelize";

// ======================================
// BUILDORA SHARED DATABASE CONNECTION
// ======================================

const database = process.env.DB_DATABASE || process.env.DB_NAME;
const username = process.env.DB_USER || process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;
const host = process.env.DB_HOST;
const port = Number(process.env.DB_PORT || 3306);

// ======================================
// VALIDATE ENVIRONMENT CONFIGURATION
// ======================================

if (!database || !username || password === undefined || !host) {
  throw new Error(
    "Missing database configuration. Check DB_HOST, DB_PORT, " +
    "DB_DATABASE/DB_NAME, DB_USER/DB_USERNAME, and DB_PASSWORD in .env"
  );
}

// ======================================
// SEQUELIZE CONNECTION
// ======================================

export const sequelize = new Sequelize(
  database,
  username,
  password,
  {
    host,
    port,
    dialect: "mysql",
    logging: false,

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },

    dialectOptions: {
      connectTimeout: 10000
    }
  }
);

export default sequelize;