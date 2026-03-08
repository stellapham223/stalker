import { Router } from "express";
import { db } from "../db/firestore.js";
import {
  getAllOrderedByOwner, getAllSnapshotsByOwner, getActiveItemsByOwner, getById, createDoc, deleteDocWithSnapshots,
  addSnapshot, getSnapshots, getLatestSnapshot, getRecentDiffs, isNoisyFieldDiff,
  serializeDocs, serializeDoc,
} from "../db/helpers.js";
import { scrapeAppListing, computeAppListingDiff } from "../scrapers/appListingScraper.js";
import { requireAuth, checkOwnership } from "./middleware.js";
import { groupSnapshotsIntoSessions } from "../shared/constants.js";

const COLLECTION = "appListingCompetitors";
export const appListingRoutes = Router();

appListingRoutes.use(requireAuth);

appListingRoutes.get("/", async (req, res) => {
  try {
    const items = await getAllOrderedByOwner(COLLECTION, req.userEmail, "asc");
    res.json(serializeDocs(items));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appListingRoutes.post("/", async (req, res) => {
  try {
    const { name, appUrl } = req.body;
    const item = await createDoc(COLLECTION, { name, appUrl, active: true, ownerEmail: req.userEmail });
    res.status(201).json(serializeDoc(item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appListingRoutes.delete("/:id", async (req, res) => {
  try {
    const { allowed, notFound } = await checkOwnership(COLLECTION, req.params.id, req.userEmail);
    if (notFound) return res.status(404).json({ error: "Not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    await deleteDocWithSnapshots(COLLECTION, req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appListingRoutes.get("/:id/snapshots", async (req, res) => {
  try {
    const { limit = "2" } = req.query;
    const snapshots = await getSnapshots(COLLECTION, req.params.id, parseInt(limit, 10));
    res.json(serializeDocs(snapshots.map((s) => ({ ...s, competitorId: req.params.id }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appListingRoutes.post("/:id/scrape", async (req, res) => {
  try {
    const competitor = await getById(COLLECTION, req.params.id);
    if (!competitor) return res.status(404).json({ error: "Not found" });
    await runAppListingScrape(competitor);
    res.json({ message: "App listing scrape completed" });
  } catch (err) {
    console.error("[app-listing] Scrape error:", err);
    res.status(500).json({ error: err.message });
  }
});

appListingRoutes.get("/dashboard", async (req, res) => {
  try {
    const competitors = await getAllOrderedByOwner(COLLECTION, req.userEmail, "asc");
    const allSnapshots = await getAllSnapshotsByOwner(COLLECTION, req.userEmail);

    const sessions = groupSnapshotsIntoSessions(allSnapshots);

    const FIELDS = ["title", "screenshots", "videos", "appDetails", "languages", "worksWith", "categories", "pricing"];

    const timeline = sessions.map((session) => {
      const rows = competitors.map((competitor) => {
        const competitorSnaps = session.snapshots.filter((s) => s.parentId === competitor.id);
        if (competitorSnaps.length === 0) return { competitorId: competitor.id, name: competitor.name, changes: null };
        // Prefer a snapshot with changes; fall back to the latest one
        const snap = competitorSnaps.find((s) => s.diff && Object.keys(s.diff).length > 0) || competitorSnaps[0];

        const diff = snap.diff;
        if (!diff || Object.keys(diff).length === 0) {
          return { competitorId: competitor.id, name: competitor.name, changes: [] };
        }

        const changes = [];
        for (const field of FIELDS) {
          if (diff[field]) changes.push({ field, old: diff[field].old, new: diff[field].new });
        }
        return { competitorId: competitor.id, name: competitor.name, changes };
      });

      const createdAt = session.createdAt?.toDate ? session.createdAt.toDate().toISOString() : session.createdAt;
      return { createdAt, rows };
    });

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appListingRoutes.post("/scrape-all", async (req, res) => {
  try {
    const competitors = await getActiveItemsByOwner(COLLECTION, req.userEmail);
    for (const competitor of competitors) {
      try { await runAppListingScrape(competitor); }
      catch (err) { console.error(`[app-listing] Failed to scrape "${competitor.name}":`, err.message); }
    }
    res.json({ message: `${competitors.length} app listing scrapes completed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export async function runAppListingScrape(competitor) {
  console.log(`[app-listing] Starting scrape for: ${competitor.name}`);
  const data = await scrapeAppListing(competitor.appUrl);
  const previous = await getLatestSnapshot(COLLECTION, competitor.id);
  let { diff, hasChanges } = computeAppListingDiff(previous?.data || null, data);
  if (hasChanges) {
    const recentDiffs = await getRecentDiffs(COLLECTION, competitor.id);
    if (isNoisyFieldDiff(recentDiffs, diff)) {
      hasChanges = false;
      diff = null;
    }
  }
  await addSnapshot(COLLECTION, competitor.id, {
    competitorId: competitor.id, data, diff: hasChanges ? diff : null,
  });
  if (hasChanges) console.log(`[app-listing] Changes detected for "${competitor.name}"`);
  console.log(`[app-listing] Completed scrape for "${competitor.name}"`);
}
