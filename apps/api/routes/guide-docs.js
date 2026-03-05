import { Router } from "express";
import { JOB_NAMES } from "@competitor-stalker/shared/constants.js";

export const guideDocsRoutes = Router();

// List all trackings
guideDocsRoutes.get("/", async (req, res) => {
  const items = await req.prisma.guideDocsTracking.findMany({
    orderBy: { createdAt: "asc" },
  });
  res.json(items);
});

// Create
guideDocsRoutes.post("/", async (req, res) => {
  try {
    const { name, url } = req.body;
    const tracking = await req.prisma.guideDocsTracking.create({
      data: { name, url },
    });
    res.status(201).json(tracking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update (name or url)
guideDocsRoutes.put("/:id", async (req, res) => {
  try {
    const { name, url, active } = req.body;
    const tracking = await req.prisma.guideDocsTracking.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(tracking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
guideDocsRoutes.delete("/:id", async (req, res) => {
  try {
    await req.prisma.guideDocsTracking.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get snapshots
guideDocsRoutes.get("/:id/snapshots", async (req, res) => {
  try {
    const { limit = "50" } = req.query;
    const snapshots = await req.prisma.guideDocsSnapshot.findMany({
      where: { trackingId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
    });
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual scrape
guideDocsRoutes.post("/:id/scrape", async (req, res) => {
  try {
    const tracking = await req.prisma.guideDocsTracking.findUnique({
      where: { id: req.params.id },
    });
    if (!tracking) return res.status(404).json({ error: "Not found" });

    const jobId = await req.boss.send(JOB_NAMES.SCRAPE_GUIDE_DOCS, { trackingId: tracking.id });
    res.json({ jobId, message: `Guide docs scrape job queued for "${tracking.name}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scrape all
guideDocsRoutes.post("/scrape-all", async (req, res) => {
  try {
    const trackings = await req.prisma.guideDocsTracking.findMany({
      where: { active: true },
    });
    const jobIds = await Promise.all(
      trackings.map((t) => req.boss.send(JOB_NAMES.SCRAPE_GUIDE_DOCS, { trackingId: t.id }))
    );
    res.json({ jobIds, message: `${jobIds.length} guide docs scrape jobs queued` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard: timeline of all scrape sessions with changes per tracking
guideDocsRoutes.get("/dashboard", async (req, res) => {
  try {
    const trackings = await req.prisma.guideDocsTracking.findMany({
      orderBy: { createdAt: "asc" },
    });

    const allSnapshots = await req.prisma.guideDocsSnapshot.findMany({
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
