import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const staff = await prisma.staffUser.findUnique({ where: { email } });
  if (!staff) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, staff.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign(
    { staffId: staff.id, restaurantId: staff.restaurantId },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token, restaurantId: staff.restaurantId });
}));

export default router;
