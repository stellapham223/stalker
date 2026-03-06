import { getUserByEmail } from "../db/allowedUsers.js";
import { getById } from "../db/helpers.js";

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

export async function checkOwnership(collection, id, userEmail) {
  const doc = await getById(collection, id);
  if (!doc) return { doc: null, allowed: false, notFound: true };
  if (doc.ownerEmail !== userEmail) return { doc, allowed: false, notFound: false };
  return { doc, allowed: true, notFound: false };
}
