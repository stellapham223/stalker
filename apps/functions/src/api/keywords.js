import { Router } from "express";
import { db } from "../db/firestore.js";
import {
  getAllOrdered, getById, createDoc, deleteDocWithSnapshots,
  addSnapshot, getSnapshots, getLatestSnapshot, getSnapshotsWithChanges,
  getAllSnapshots, serializeDocs, serializeDoc,
} from "../db/helpers.js";
import { scrapeKeywordRanking, computeRankingDiff } from "../scrapers/keywordScraper.js";

const COLLECTION = "keywordTrackings";
export const keywordRoutes = Router();

keywordRoutes.get("/", async (req, res) => {
  try {
    const items = await getAllOrdered(COLLECTION, "desc");
    res.json(serializeDocs(items));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

keywordRoutes.post("/", async (req, res) => {
  try {
    const { keyword, searchUrl } = req.body;
    const item = await createDoc(COLLECTION, {
      keyword,
      searchUrl: searchUrl || `https://apps.shopify.com/search?q=${encodeURIComponent(keyword)}`,
      active: true,
    });
    res.status(201).json(serializeDoc(item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

keywordRoutes.delete("/:id", async (req, res) => {
  try {
    await deleteDocWithSnapshots(COLLECTION, req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

keywordRoutes.get("/:id/snapshots", async (req, res) => {
  try {
    const { limit = "50" } = req.query;
    const snapshots = await getSnapshots(COLLECTION, req.params.id, parseInt(limit, 10));
    res.json(serializeDocs(snapshots.map((s) => ({ ...s, keywordId: req.params.id }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

keywordRoutes.get("/:id/snapshots/latest", async (req, res) => {
  try {
    const snapshot = await getLatestSnapshot(COLLECTION, req.params.id);
    if (!snapshot) return res.status(404).json({ error: "No snapshots yet" });
    res.json(serializeDoc({ ...snapshot, keywordId: req.params.id }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

keywordRoutes.get("/:id/changes", async (req, res) => {
  try {
    const { limit = "30" } = req.query;
    // For keywords, "has changes" means newEntries/droppedEntries/positionChanges are not null
    const allSnaps = await getSnapshots(COLLECTION, req.params.id, parseInt(limit, 10) * 3);
    const changes = allSnaps
      .filter((s) => s.newEntries || s.droppedEntries || s.positionChanges)
      .slice(0, parseInt(limit, 10))
      .map((s) => ({ ...s, keywordId: req.params.id }));
    res.json(serializeDocs(changes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

keywordRoutes.get("/dashboard", async (req, res) => {
  try {
    const keywords = await getAllOrdered(COLLECTION, "asc");
    const allSnapshots = await getAllSnapshots(COLLECTION);

    const WINDOW_MS = 5 * 60 * 1000;
    const sessions = [];
    let currentSession = null;

    for (const snap of allSnapshots) {
      const snapTime = snap.createdAt?.toDate ? snap.createdAt.toDate().getTime() : new Date(snap.createdAt).getTime();
      if (!currentSession || currentSession.time - snapTime > WINDOW_MS) {
        currentSession = { time: snapTime, createdAt: snap.createdAt, snapshots: [] };
        sessions.push(currentSession);
      }
      currentSession.snapshots.push(snap);
    }

    const timeline = sessions.map((session) => {
      const rows = keywords.map((kw) => {
        const snap = session.snapshots.find((s) => s.parentId === kw.id);
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

      const createdAt = session.createdAt?.toDate ? session.createdAt.toDate().toISOString() : session.createdAt;
      return { createdAt, rows };
    });

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

keywordRoutes.post("/:id/scrape", async (req, res) => {
  try {
    const keyword = await getById(COLLECTION, req.params.id);
    if (!keyword) return res.status(404).json({ error: "Not found" });

    await runKeywordScrape(keyword);
    res.json({ message: "Keyword ranking scrape completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

keywordRoutes.post("/scrape-all", async (req, res) => {
  try {
    const snap = await db.collection(COLLECTION).where("active", "==", true).get();
    const keywords = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    for (const keyword of keywords) {
      try {
        await runKeywordScrape(keyword);
      } catch (err) {
        console.error(`[keywords] Failed to scrape "${keyword.keyword}":`, err.message);
      }
    }

    res.json({ message: `${keywords.length} keyword scrapes completed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export async function runKeywordScrape(keyword) {
  console.log(`[keywords] Starting scrape for "${keyword.keyword}"`);

  const rankings = await scrapeKeywordRanking(keyword.searchUrl);

  const previous = await getLatestSnapshot(COLLECTION, keyword.id);

  const { newEntries, droppedEntries, positionChanges, hasChanges } = computeRankingDiff(
    previous?.rankings || null,
    rankings
  );

  await addSnapshot(COLLECTION, keyword.id, {
    keywordId: keyword.id,
    rankings,
    newEntries: hasChanges ? newEntries : null,
    droppedEntries: hasChanges ? droppedEntries : null,
    positionChanges: hasChanges ? positionChanges : null,
  });

  if (hasChanges) {
    console.log(`[keywords] Changes detected for "${keyword.keyword}"`);
  }

  console.log(`[keywords] Completed scrape for "${keyword.keyword}" (${rankings.length} results)`);
}
