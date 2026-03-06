import { Router } from "express";
import { getUserByEmail, listUsers, addUser, updateUser, deleteUser, importUsers } from "../db/allowedUsers.js";
import { serializeDocs, serializeDoc } from "../db/helpers.js";

export const adminRoutes = Router();

const ALLOWED_FIELDS = [
  "isAdmin",
  "appListing",
  "keywordRankings",
  "autocomplete",
  "websiteMenus",
  "homepageMonitor",
  "guideDocs",
];

// Auth + admin middleware
adminRoutes.use(async (req, res, next) => {
  const email = req.headers["x-user-email"];
  if (!email) return res.status(401).json({ error: "Not authenticated" });

  const user = await getUserByEmail(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  if (!user.isAdmin) return res.status(403).json({ error: "Admin access required" });

  req.userEmail = user.email;
  next();
});

adminRoutes.get("/users", async (req, res) => {
  try {
    const users = await listUsers();
    res.json(serializeDocs(users));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

adminRoutes.post("/users", async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await addUser(email);
    res.status(201).json(serializeDoc(user));
  } catch (err) {
    if (err.code === "ALREADY_EXISTS") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: err.message });
  }
});

adminRoutes.patch("/users/:id", async (req, res) => {
  try {
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => ALLOWED_FIELDS.includes(k))
    );
    const user = await updateUser(req.params.id, updates);
    res.json(serializeDoc(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

adminRoutes.delete("/users/:id", async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

adminRoutes.post("/users/import", async (req, res) => {
  try {
    const emails = (req.body.emails || [])
      .map((e) => e.toLowerCase().trim())
      .filter(Boolean);
    const result = await importUsers(emails);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
