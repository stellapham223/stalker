import { getUserByEmail } from "../db/allowedUsers.js";

export async function requireAuth(req, res, next) {
  const email = req.headers["x-user-email"];
  if (!email) return res.status(401).json({ error: "Not authenticated" });

  try {
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    req.userEmail = user.email;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
