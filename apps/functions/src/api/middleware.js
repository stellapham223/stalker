import crypto from "crypto";
import { getUserByEmail } from "../db/allowedUsers.js";
import { getById } from "../db/helpers.js";

function verifyAuthToken(email, token) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(email).digest("hex");
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export async function requireAuth(req, res, next) {
  const email = req.headers["x-user-email"];
  const authToken = req.headers["x-auth-token"];
  if (!email || !authToken) return res.status(401).json({ error: "Not authenticated" });

  try {
    if (!verifyAuthToken(email.toLowerCase().trim(), authToken)) {
      return res.status(401).json({ error: "Invalid auth token" });
    }
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    req.userEmail = user.email;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function checkOwnership(collection, id, userEmail) {
  const doc = await getById(collection, id);
  if (!doc) return { doc: null, allowed: false, notFound: true };
  if (doc.ownerEmail !== userEmail) return { doc, allowed: false, notFound: false };
  return { doc, allowed: true, notFound: false };
}
