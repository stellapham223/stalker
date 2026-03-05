import { Router } from "express";

export const autocompleteRoutes = Router();

// List all tracked queries
autocompleteRoutes.get("/", async (req, res) => {
  try {
    const trackings = await req.prisma.autocompleteTracking.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(trackings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new autocomplete tracking
autocompleteRoutes.post("/", async (req, res) => {
  try {
    const { query, targetUrl } = req.body;
    const tracking = await req.prisma.autocompleteTracking.create({
      data: {
        query,
        targetUrl: targetUrl || "https://apps.shopify.com",
      },
    });
    res.status(201).json(tracking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete tracking
autocompleteRoutes.delete("/:id", async (req, res) => {
  try {
    await req.prisma.autocompleteTracking.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get snapshots
autocompleteRoutes.get("/:id/snapshots", async (req, res) => {
  try {
    const { limit = "50" } = req.query;
    const snapshots = await req.prisma.autocompleteSnapshot.findMany({
      where: { trackingId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
    });
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get latest snapshot
autocompleteRoutes.get("/:id/snapshots/latest", async (req, res) => {
  try {
    const snapshot = await req.prisma.autocompleteSnapshot.findFirst({
      where: { trackingId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    if (!snapshot) return res.status(404).json({ error: "No snapshots yet" });
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get changes only
autocompleteRoutes.get("/:id/changes", async (req, res) => {
  try {
    const { limit = "30" } = req.query;
    const changes = await req.prisma.autocompleteSnapshot.findMany({
      where: {
        trackingId: req.params.id,
        diff: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
    });
    res.json(changes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard: timeline of all scrape sessions with changes per tracking
autocompleteRoutes.get("/dashboard", async (req, res) => {
  try {
    const trackings = await req.prisma.autocompleteTracking.findMany({
      orderBy: { createdAt: "asc" },
    });

    const allSnapshots = await req.prisma.autocompleteSnapshot.findMany({
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
        if (!snap) return { trackingId: tracking.id, query: tracking.query, changes: null };

        const diff = snap.diff;
        const hasChanges = diff && (
          (diff.added && diff.added.length > 0) ||
          (diff.removed && diff.removed.length > 0) ||
          (diff.reordered && diff.reordered.length > 0)
        );

        return {
          trackingId: tracking.id,
          query: tracking.query,
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

// Trigger scrape for all trackings
autocompleteRoutes.post("/scrape-all", async (req, res) => {
  try {
    const trackings = await req.prisma.autocompleteTracking.findMany({
      where: { active: true },
    });
    const jobIds = await Promise.all(
      trackings.map((t) => req.boss.send("scrape-autocomplete", { trackingId: t.id }))
    );
    res.json({ jobIds, message: `${jobIds.length} autocomplete scrape jobs queued` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual scrape
autocompleteRoutes.post("/:id/scrape", async (req, res) => {
  try {
    const tracking = await req.prisma.autocompleteTracking.findUnique({
      where: { id: req.params.id },
    });
    if (!tracking) return res.status(404).json({ error: "Not found" });

    const jobId = await req.boss.send("scrape-autocomplete", {
      trackingId: tracking.id,
    });
    res.json({ jobId, message: "Autocomplete scrape job queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
