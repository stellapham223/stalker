import { Router } from "express";

export const appListingRoutes = Router();

// List all competitors
appListingRoutes.get("/", async (req, res) => {
  try {
    const competitors = await req.prisma.appListingCompetitor.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json(competitors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a competitor
appListingRoutes.post("/", async (req, res) => {
  try {
    const { name, appUrl } = req.body;
    const competitor = await req.prisma.appListingCompetitor.create({
      data: { name, appUrl },
    });
    res.status(201).json(competitor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a competitor
appListingRoutes.delete("/:id", async (req, res) => {
  try {
    await req.prisma.appListingCompetitor.delete({
      where: { id: req.params.id },
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get snapshots for a competitor
appListingRoutes.get("/:id/snapshots", async (req, res) => {
  try {
    const { limit = "2" } = req.query;
    const snapshots = await req.prisma.appListingSnapshot.findMany({
      where: { competitorId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
    });
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual scrape for one competitor
appListingRoutes.post("/:id/scrape", async (req, res) => {
  try {
    const competitor = await req.prisma.appListingCompetitor.findUnique({
      where: { id: req.params.id },
    });
    if (!competitor) return res.status(404).json({ error: "Not found" });

    const jobId = await req.boss.send("scrape-app-listing", {
      competitorId: competitor.id,
    });
    res.json({ jobId, message: "App listing scrape job queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard: timeline of all scrape sessions with changes per competitor
appListingRoutes.get("/dashboard", async (req, res) => {
  try {
    const competitors = await req.prisma.appListingCompetitor.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Get all snapshots for all competitors, ordered by time desc
    const allSnapshots = await req.prisma.appListingSnapshot.findMany({
      orderBy: { createdAt: "desc" },
      include: { competitor: { select: { name: true } } },
    });

    // Group snapshots by "scrape session" — snapshots within 5 minutes of each other = same session
    const WINDOW_MS = 5 * 60 * 1000;
    const sessions = [];
    let currentSession = null;

    for (const snap of allSnapshots) {
      const snapTime = new Date(snap.createdAt).getTime();
      if (!currentSession || currentSession.time - snapTime > WINDOW_MS) {
        currentSession = { time: snapTime, createdAt: snap.createdAt, snapshots: [] };
        sessions.push(currentSession);
      }
      currentSession.snapshots.push(snap);
    }

    // For each session, build per-competitor changes summary
    const FIELDS = ["title", "screenshots", "videos", "appDetails", "languages", "worksWith", "categories", "pricing"];

    const timeline = sessions.map((session) => {
      const rows = competitors.map((competitor) => {
        const snap = session.snapshots.find((s) => s.competitorId === competitor.id);
        if (!snap) return { competitorId: competitor.id, name: competitor.name, changes: null };

        // Use stored diff if available
        const diff = snap.diff;
        if (!diff || Object.keys(diff).length === 0) {
          return { competitorId: competitor.id, name: competitor.name, changes: [] };
        }

        const changes = [];
        for (const field of FIELDS) {
          if (diff[field]) {
            changes.push({ field, old: diff[field].old, new: diff[field].new });
          }
        }
        return { competitorId: competitor.id, name: competitor.name, changes };
      });

      return { createdAt: session.createdAt, rows };
    });

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger scrape for all competitors
appListingRoutes.post("/scrape-all", async (req, res) => {
  try {
    const competitors = await req.prisma.appListingCompetitor.findMany({
      where: { active: true },
    });
    const jobIds = await Promise.all(
      competitors.map((c) =>
        req.boss.send("scrape-app-listing", { competitorId: c.id })
      )
    );
    res.json({ jobIds, message: `${jobIds.length} app listing scrape jobs queued` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
