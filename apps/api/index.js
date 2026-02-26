import express from "express";
import cors from "cors";
import { PrismaClient } from "./generated/prisma/index.js";
import PgBoss from "pg-boss";
import { competitorRoutes } from "./routes/competitors.js";
import { snapshotRoutes } from "./routes/snapshots.js";
import { jobRoutes } from "./routes/jobs.js";
import { registerWorkers } from "./services/scheduler.js";

const app = express();
const prisma = new PrismaClient();
const boss = new PgBoss(process.env.DATABASE_URL);

app.use(cors());
app.use(express.json());

// Attach prisma and boss to req for route handlers
app.use((req, res, next) => {
  req.prisma = prisma;
  req.boss = boss;
  next();
});

// Routes
app.use("/api/competitors", competitorRoutes);
app.use("/api/snapshots", snapshotRoutes);
app.use("/api/jobs", jobRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;

async function main() {
  await boss.start();
  await registerWorkers(boss, prisma);
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
