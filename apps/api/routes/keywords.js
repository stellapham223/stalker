import { Router } from "express";

export const keywordRoutes = Router();

// List all tracked keywords
keywordRoutes.get("/", async (req, res) => {
  try {
    const keywords = await req.prisma.keywordTracking.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(keywords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a keyword tracking
keywordRoutes.post("/", async (req, res) => {
  try {
    const { keyword, searchUrl } = req.body;
    const tracking = await req.prisma.keywordTracking.create({
      data: {
        keyword,
        searchUrl: searchUrl || `https://apps.shopify.com/search?q=${encodeURIComponent(keyword)}`,
      },
    });
    res.status(201).json(tracking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a keyword tracking
keywordRoutes.delete("/:id", async (req, res) => {
  try {
    await req.prisma.keywordTracking.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ranking snapshots for a keyword
keywordRoutes.get("/:id/snapshots", async (req, res) => {
  try {
    const { limit = "50" } = req.query;
    const snapshots = await req.prisma.keywordRankingSnapshot.findMany({
      where: { keywordId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
    });
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get latest snapshot
keywordRoutes.get("/:id/snapshots/latest", async (req, res) => {
  try {
    const snapshot = await req.prisma.keywordRankingSnapshot.findFirst({
      where: { keywordId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    if (!snapshot) return res.status(404).json({ error: "No snapshots yet" });
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get changes only
keywordRoutes.get("/:id/changes", async (req, res) => {
  try {
    const { limit = "30" } = req.query;
    const changes = await req.prisma.keywordRankingSnapshot.findMany({
      where: {
        keywordId: req.params.id,
        OR: [
          { newEntries: { not: null } },
          { droppedEntries: { not: null } },
          { positionChanges: { not: null } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
    });
    res.json(changes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard: timeline of all scrape sessions with changes per keyword
keywordRoutes.get("/dashboard", async (req, res) => {
  try {
    const keywords = await req.prisma.keywordTracking.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Get all snapshots, ordered by time desc
    const allSnapshots = await req.prisma.keywordRankingSnapshot.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Group into sessions (within 5 min = same session)
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
      const rows = keywords.map((kw) => {
        const snap = session.snapshots.find((s) => s.keywordId === kw.id);
        if (!snap) return { keywordId: kw.id, keyword: kw.keyword, changes: null };

        const newEntries = snap.newEntries || [];
        const droppedEntries = snap.droppedEntries || [];
        const positionChanges = snap.positionChanges || [];
        const hasChanges = newEntries.length > 0 || droppedEntries.length > 0 || positionChanges.length > 0;

        return {
          keywordId: kw.id,
          keyword: kw.keyword,
          changes: hasChanges ? { newEntries, droppedEntries, positionChanges } : [],
        };
      });

      return { createdAt: session.createdAt, rows };
    });

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual scrape for one keyword
keywordRoutes.post("/:id/scrape", async (req, res) => {
  try {
    const keyword = await req.prisma.keywordTracking.findUnique({
      where: { id: req.params.id },
    });
    if (!keyword) return res.status(404).json({ error: "Not found" });

    const jobId = await req.boss.send("scrape-keywords", {
      keywordId: keyword.id,
    });
    res.json({ jobId, message: "Keyword ranking scrape job queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual scrape for all keywords
keywordRoutes.post("/scrape-all", async (req, res) => {
  try {
    const keywords = await req.prisma.keywordTracking.findMany({
      where: { active: true },
    });

    const jobIds = await Promise.all(
      keywords.map((k) => req.boss.send("scrape-keywords", { keywordId: k.id }))
    );

    res.json({ jobIds, message: `${jobIds.length} keyword scrape jobs queued` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
