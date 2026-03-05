import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PrismaClient } from "./generated/prisma/index.js";
import PgBoss from "pg-boss";
import { competitorRoutes } from "./routes/competitors.js";
import { snapshotRoutes } from "./routes/snapshots.js";
import { jobRoutes } from "./routes/jobs.js";
import { keywordRoutes } from "./routes/keywords.js";
import { autocompleteRoutes } from "./routes/autocomplete.js";
import { appListingRoutes } from "./routes/app-listing.js";
import { websiteMenuRoutes } from "./routes/website-menus.js";
import { homepageRoutes } from "./routes/homepage.js";
import { guideDocsRoutes } from "./routes/guide-docs.js";
import { changesRoutes } from "./routes/changes.js";
import { authRoutes } from "./routes/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { registerWorkers } from "./services/scheduler.js";

const app = express();
const prisma = new PrismaClient();
const boss = new PgBoss(process.env.DATABASE_URL);

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Attach prisma and boss to req for route handlers
app.use((req, res, next) => {
  req.prisma = prisma;
  req.boss = boss;
  next();
});

// Internal auth routes (called server-to-server from NextAuth callbacks)
app.use("/api/auth", authRoutes);

// Protect all mutation (non-GET) endpoints except health check
app.use((req, res, next) => {
  if (req.method === "GET") return next();
  if (req.path === "/api/health") return next();
  if (req.path === "/api/scrape-all") return next(); // internal trigger — skip auth for now
  return requireAuth(req, res, next);
});

// Routes
app.use("/api/competitors", competitorRoutes);
app.use("/api/snapshots", snapshotRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/keywords", keywordRoutes);
app.use("/api/autocomplete", autocompleteRoutes);
app.use("/api/app-listing", appListingRoutes);
app.use("/api/website-menus", websiteMenuRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/guide-docs", guideDocsRoutes);
app.use("/api/changes", changesRoutes);
app.use("/api/admin", adminRoutes);

// Global scrape-all: triggers the SCRAPE_ALL pg-boss job (same as daily cron)
app.post("/api/scrape-all", async (_req, res) => {
  try {
    await boss.send("scrape-all", {});
    res.json({ message: "scrape-all job queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;

async function main() {
  await boss.start();
  await registerWorkers(boss, prisma);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
