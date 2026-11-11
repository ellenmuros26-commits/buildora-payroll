import bcrypt from "bcrypt";
import { QueryTypes } from "sequelize";
import { sequelize } from "../models/userModel.js";

// BUILDORA Payroll & Finance roles
const ALLOWED_ROLES = [
  "Payroll / Finance Officer",
  "Finance Manager",
  "HR Manager",
  "Worker"
];

async function createRoleAccount() {
  const [nameArg, emailArg, roleArg] = process.argv.slice(2);

  const name = String(nameArg || "").trim();
  const email = String(emailArg || "").trim().toLowerCase();
  const roleName = String(roleArg || "").trim();

  const password = process.env.BUILDORA_SETUP_PASSWORD || "";

  // Validate account information
  if (!name || !email || !roleName) {
    throw new Error(
      'Usage: node services/createRoleAccount.js "Full Name" "email@example.com" "Finance Manager"'
    );
  }

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address.");
  }

  // Validate BUILDORA role
  if (!ALLOWED_ROLES.includes(roleName)) {
    throw new Error(
      "Invalid BUILDORA role. Allowed roles: " +
      ALLOWED_ROLES.join(", ")
    );
  }

  // Validate password
  if (!password) {
    throw new Error(
      "BUILDORA_SETUP_PASSWORD is not configured."
    );
  }

  // Allow buildora123 for local development only
  const isLocalTestPassword =
    password === "buildora123" &&
    process.env.NODE_ENV !== "production";

  if (password.length < 12 && !isLocalTestPassword) {
    throw new Error(
      "Password must have at least 12 characters."
    );
  }

  // Connect to BUILDORA database
  await sequelize.authenticate();

  console.log("Database connected successfully.");

  // Check if role exists
  const roles = await sequelize.query(
    "SELECT id, role_name FROM roles WHERE role_name = :role LIMIT 1",
    {
      replacements: {
        role: roleName
      },
      type: QueryTypes.SELECT
    }
  );

  if (roles.length === 0) {
    throw new Error(
      'Role "' + roleName + '" does not exist in the database.'
    );
  }

  // Check if user already exists
  const existingUsers = await sequelize.query(
    "SELECT id FROM users WHERE email = :email LIMIT 1",
    {
      replacements: {
        email: email
      },
      type: QueryTypes.SELECT
    }
  );

  if (existingUsers.length > 0) {
    throw new Error(
      'Account "' + email + '" already exists.'
    );
  }

  // Hash password using bcrypt
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create account and assign role
  const result = await sequelize.transaction(
    async (transaction) => {

      // Insert user
      const [userId] = await sequelize.query(
        `INSERT INTO users
          (name, email, password, createdAt, updatedAt)
         VALUES
          (:name, :email, :password, NOW(), NOW())`,
        {
          replacements: {
            name: name,
            email: email,
            password: hashedPassword
          },
          type: QueryTypes.INSERT,
          transaction: transaction
        }
      );

      // Assign role
      await sequelize.query(
        `INSERT INTO user_roles
          (user_id, role_id)
         VALUES
          (:userId, :roleId)`,
        {
          replacements: {
            userId: userId,
            roleId: roles[0].id
          },
          type: QueryTypes.INSERT,
          transaction: transaction
        }
      );

      return {
        id: userId,
        name: name,
        email: email,
        role: roleName
      };
    }
  );

  // Success message
  console.log("");
  console.log("BUILDORA ACCOUNT CREATED SUCCESSFULLY");
  console.log("----------------------------------------");
  console.log("User ID:", result.id);
  console.log("Name:", result.name);
  console.log("Email:", result.email);
  console.log("Role:", result.role);
  console.log("----------------------------------------");
  console.log("Password securely hashed using bcrypt.");
  console.log("Account created successfully.");
  console.log("");
}

// Execute
try {
  await createRoleAccount();
} catch (error) {
  console.error("");
  console.error("BUILDORA ACCOUNT CREATION FAILED");
  console.error("----------------------------------------");
  console.error(
    error.original?.sqlMessage ||
    error.message ||
    "Unknown error occurred."
  );
  console.error("");

  process.exitCode = 1;
} finally {
  await sequelize.close();
}