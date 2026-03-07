import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import express from "express";
import cors from "cors";

import { authRoutes } from "./api/auth.js";
import { adminRoutes } from "./api/admin.js";
import { competitorRoutes } from "./api/competitors.js";
import { snapshotRoutes } from "./api/snapshots.js";
import { jobRoutes } from "./api/jobs.js";
import { keywordRoutes } from "./api/keywords.js";
import { autocompleteRoutes } from "./api/autocomplete.js";
import { appListingRoutes } from "./api/appListing.js";
import { websiteMenuRoutes } from "./api/websiteMenus.js";
import { homepageRoutes } from "./api/homepage.js";
import { guideDocsRoutes } from "./api/guideDocs.js";
import { changesRoutes } from "./api/changes.js";
import { requireAuth } from "./api/middleware.js";

import { runScrapeAll } from "./scheduler.js";

// Define secrets
const telegramBotToken = defineSecret("TELEGRAM_BOT_TOKEN");
const telegramChatId = defineSecret("TELEGRAM_CHAT_ID");
const nextauthSecret = defineSecret("NEXTAUTH_SECRET");

// ============ Express API (single Firebase Function) ============
const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// Internal auth routes (called server-to-server from NextAuth callbacks)
app.use("/auth", authRoutes);

// Protect all mutation (non-GET) endpoints except health check
app.use((req, res, next) => {
  if (req.method === "GET") return next();
  if (req.path === "/health") return next();
  return requireAuth(req, res, next);
});

// Routes
app.use("/competitors", competitorRoutes);
app.use("/snapshots", snapshotRoutes);
app.use("/jobs", jobRoutes);
app.use("/keywords", keywordRoutes);
app.use("/autocomplete", autocompleteRoutes);
app.use("/app-listing", appListingRoutes);
app.use("/website-menus", websiteMenuRoutes);
app.use("/homepage", homepageRoutes);
app.use("/guide-docs", guideDocsRoutes);
app.use("/changes", changesRoutes);
app.use("/admin", adminRoutes);

// Global scrape-all trigger (requires internal auth secret)
app.post("/scrape-all", async (req, res) => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || req.headers["x-internal-auth"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    await runScrapeAll();
    res.json({ message: "scrape-all completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Export as a single Firebase Function (Gen 2)
export const api = onRequest(
  {
    region: "asia-southeast1",
    memory: "1GiB",
    timeoutSeconds: 300,
    invoker: "public",
    secrets: [telegramBotToken, telegramChatId, nextauthSecret],
  },
  app
);

// ============ Scheduled scraper (daily at 6AM GMT+7 = 23:00 UTC) ============
export const scheduledScrape = onSchedule(
  {
    schedule: "0 23 * * *",
    timeZone: "UTC",
    region: "asia-southeast1",
    memory: "4GiB",
    timeoutSeconds: 540,
    secrets: [telegramBotToken, telegramChatId],
  },
  async () => {
    console.log("[scheduler] Starting daily scrape at", new Date().toISOString());
    await runScrapeAll();
    console.log("[scheduler] Daily scrape completed");
  }
);
