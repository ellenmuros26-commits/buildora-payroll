import { Router } from "express";
import {
  loginUser,
  registerUser,
  logout,
  logoutUser,
  me
} from "../controllers/authController.js";

import { authenticate, csrf } from "../middleware/auth.js";

const router = Router();

router.post("/auth/login", loginUser);
router.post("/register", registerUser);

router.get("/logout", authenticate, (req, res) =>
  res.redirect("/dashboard")
);

router.post("/auth/logout", authenticate, csrf, logout);
router.post("/api/logout", authenticate, csrf, logout);
router.post("/logout", authenticate, csrf, logoutUser);
router.get("/api/me", authenticate, me);

export default router;