import { Router } from "express";
import { checkEmail, getSessionInfo } from "../db/allowedUsers.js";

export const authRoutes = Router();

// Guard: only allow calls from Next.js server
authRoutes.use((req, res, next) => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return next();
  if (req.headers["x-internal-auth"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

authRoutes.post("/check-email", async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({ allowed: false });

    const allowed = await checkEmail(email);
    res.json({ allowed });
  } catch (err) {
    res.status(500).json({ allowed: false, error: err.message });
  }
});

authRoutes.post("/session-info", async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({});

    const info = await getSessionInfo(email);
    if (!info) return res.status(404).json({});

    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
