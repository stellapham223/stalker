import { Router } from "express";
import { JOB_NAMES } from "@competitor-stalker/shared/constants.js";

export const homepageRoutes = Router();

// List all tracked homepages
homepageRoutes.get("/", async (req, res) => {
  const items = await req.prisma.homepageTracking.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

// Add a new homepage to track
homepageRoutes.post("/", async (req, res) => {
  const { name, url } = req.body;
  const tracking = await req.prisma.homepageTracking.create({
    data: { name, url },
  });
  res.status(201).json(tracking);
});

// Delete
homepageRoutes.delete("/:id", async (req, res) => {
  await req.prisma.homepageTracking.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Get snapshots
homepageRoutes.get("/:id/snapshots", async (req, res) => {
  const { limit = "50" } = req.query;
  const snapshots = await req.prisma.homepageSnapshot.findMany({
    where: { trackingId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: parseInt(limit, 10),
  });
  res.json(snapshots);
});

// Get latest snapshot
homepageRoutes.get("/:id/snapshots/latest", async (req, res) => {
  const snapshot = await req.prisma.homepageSnapshot.findFirst({
    where: { trackingId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(snapshot);
});

// Get changes only
homepageRoutes.get("/:id/changes", async (req, res) => {
  const { limit = "30" } = req.query;
  const changes = await req.prisma.homepageSnapshot.findMany({
    where: {
      trackingId: req.params.id,
      diff: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: parseInt(limit, 10),
  });
  res.json(changes);
});

// Dashboard: timeline of all scrape sessions with changes per tracking
homepageRoutes.get("/dashboard", async (req, res) => {
  try {
    const trackings = await req.prisma.homepageTracking.findMany({
      orderBy: { createdAt: "asc" },
    });

    const allSnapshots = await req.prisma.homepageSnapshot.findMany({
      orderBy: { createdAt: "desc" },
    });

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

    const timeline = sessions.map((session) => {
      const rows = trackings.map((tracking) => {
        const snap = session.snapshots.find((s) => s.trackingId === tracking.id);
        if (!snap) return { trackingId: tracking.id, name: tracking.name, changes: null };

        const diff = snap.diff;
        const hasChanges = diff && (
          (diff.addedCount && diff.addedCount > 0) ||
          (diff.removedCount && diff.removedCount > 0)
        );

        return {
          trackingId: tracking.id,
          name: tracking.name,
          changes: hasChanges ? diff : [],
        };
      });

      return { createdAt: session.createdAt, rows };
    });

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual scrape
homepageRoutes.post("/:id/scrape", async (req, res) => {
  const tracking = await req.prisma.homepageTracking.findUnique({
    where: { id: req.params.id },
  });
  if (!tracking) return res.status(404).json({ error: "Not found" });

  const jobId = await req.boss.send(JOB_NAMES.SCRAPE_HOMEPAGE_CONTENT, { trackingId: tracking.id });
  res.json({ jobId, message: `Homepage scrape job queued for "${tracking.name}"` });
});

// Scrape all
homepageRoutes.post("/scrape-all", async (req, res) => {
  const trackings = await req.prisma.homepageTracking.findMany({
    where: { active: true },
  });
  const jobIds = await Promise.all(
    trackings.map((t) => req.boss.send(JOB_NAMES.SCRAPE_HOMEPAGE_CONTENT, { trackingId: t.id }))
  );
  res.json({ jobIds, message: `${jobIds.length} homepage scrape jobs queued` });
});
