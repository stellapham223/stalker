import { Router } from "express";
import { JOB_NAMES } from "@competitor-stalker/shared/constants.js";

export const websiteMenuRoutes = Router();

// List all tracked websites
websiteMenuRoutes.get("/", async (req, res) => {
  const items = await req.prisma.websiteMenuTracking.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

// Add a new website to track
websiteMenuRoutes.post("/", async (req, res) => {
  const { name, url, interactionType } = req.body;
  const tracking = await req.prisma.websiteMenuTracking.create({
    data: { name, url, interactionType: interactionType || "hover" },
  });
  res.status(201).json(tracking);
});

// Update config
websiteMenuRoutes.put("/:id", async (req, res) => {
  const { name, url, interactionType, active } = req.body;
  const tracking = await req.prisma.websiteMenuTracking.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(url !== undefined && { url }),
      ...(interactionType !== undefined && { interactionType }),
      ...(active !== undefined && { active }),
    },
  });
  res.json(tracking);
});

// Delete
websiteMenuRoutes.delete("/:id", async (req, res) => {
  await req.prisma.websiteMenuTracking.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Get snapshots
websiteMenuRoutes.get("/:id/snapshots", async (req, res) => {
  const { limit = "50" } = req.query;
  const snapshots = await req.prisma.websiteMenuSnapshot.findMany({
    where: { trackingId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: parseInt(limit, 10),
  });
  res.json(snapshots);
});

// Get latest snapshot
websiteMenuRoutes.get("/:id/snapshots/latest", async (req, res) => {
  const snapshot = await req.prisma.websiteMenuSnapshot.findFirst({
    where: { trackingId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(snapshot);
});

// Get changes only
websiteMenuRoutes.get("/:id/changes", async (req, res) => {
  const { limit = "30" } = req.query;
  const changes = await req.prisma.websiteMenuSnapshot.findMany({
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
websiteMenuRoutes.get("/dashboard", async (req, res) => {
  try {
    const trackings = await req.prisma.websiteMenuTracking.findMany({
      orderBy: { createdAt: "asc" },
    });

    const allSnapshots = await req.prisma.websiteMenuSnapshot.findMany({
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
          (diff.added && diff.added.length > 0) ||
          (diff.removed && diff.removed.length > 0) ||
          (diff.renamed && diff.renamed.length > 0) ||
          (diff.childrenChanged && diff.childrenChanged.length > 0)
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
websiteMenuRoutes.post("/:id/scrape", async (req, res) => {
  const tracking = await req.prisma.websiteMenuTracking.findUnique({
    where: { id: req.params.id },
  });
  if (!tracking) return res.status(404).json({ error: "Not found" });

  const jobId = await req.boss.send(JOB_NAMES.SCRAPE_WEBSITE_MENUS, { trackingId: tracking.id });
  res.json({ jobId, message: `Menu scrape job queued for "${tracking.name}"` });
});

// Scrape all
websiteMenuRoutes.post("/scrape-all", async (req, res) => {
  const trackings = await req.prisma.websiteMenuTracking.findMany({
    where: { active: true },
  });
  const jobIds = await Promise.all(
    trackings.map((t) => req.boss.send(JOB_NAMES.SCRAPE_WEBSITE_MENUS, { trackingId: t.id }))
  );
  res.json({ jobIds, message: `${jobIds.length} menu scrape jobs queued` });
});
