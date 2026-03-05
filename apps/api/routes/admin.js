import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const adminRoutes = Router();

// All admin routes require authentication + admin role
adminRoutes.use(requireAuth);
adminRoutes.use(requireAdmin);

const ALLOWED_FIELDS = [
  "isAdmin",
  "appListing",
  "keywordRankings",
  "autocomplete",
  "websiteMenus",
  "homepageMonitor",
  "guideDocs",
];

// GET /api/admin/users
adminRoutes.get("/users", async (req, res) => {
  try {
    const users = await req.prisma.allowedUser.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users — add single email
adminRoutes.post("/users", async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await req.prisma.allowedUser.create({
      data: { email },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id — update permissions/admin flag
adminRoutes.patch("/users/:id", async (req, res) => {
  try {
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => ALLOWED_FIELDS.includes(k))
    );
    const user = await req.prisma.allowedUser.update({
      where: { id: req.params.id },
      data: updates,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
adminRoutes.delete("/users/:id", async (req, res) => {
  try {
    await req.prisma.allowedUser.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/import — bulk import emails
adminRoutes.post("/users/import", async (req, res) => {
  try {
    const emails = (req.body.emails || [])
      .map((e) => e.toLowerCase().trim())
      .filter(Boolean);

    const results = await Promise.allSettled(
      emails.map((email) =>
        req.prisma.allowedUser.upsert({
          where: { email },
          create: { email },
          update: {},
        })
      )
    );

    const created = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    res.json({ created, failed, total: emails.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
