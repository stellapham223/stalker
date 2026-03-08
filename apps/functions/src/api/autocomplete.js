import { Router } from "express";
import {
  getAllOrderedByOwner, getAllSnapshotsByOwner, getActiveItemsByOwner, getById, createDoc, deleteDocWithSnapshots,
  addSnapshot, getSnapshots, getLatestSnapshot, getLatestSnapshotWithDiff, getSnapshotsWithChanges, isDuplicateDiff,
  serializeDocs, serializeDoc,
} from "../db/helpers.js";
import { scrapeAutocomplete, computeAutocompleteDiff } from "../scrapers/autocompleteScraper.js";
import { requireAuth, checkOwnership } from "./middleware.js";
import { groupSnapshotsIntoSessions } from "../shared/constants.js";

const COLLECTION = "autocompleteTrackings";
export const autocompleteRoutes = Router();

autocompleteRoutes.use(requireAuth);

autocompleteRoutes.get("/", async (req, res) => {
  try {
    const items = await getAllOrderedByOwner(COLLECTION, req.userEmail, "desc");
    res.json(serializeDocs(items));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

autocompleteRoutes.post("/", async (req, res) => {
  try {
    const { query, targetUrl } = req.body;
    const item = await createDoc(COLLECTION, {
      query,
      targetUrl: targetUrl || "https://apps.shopify.com",
      active: true,
      ownerEmail: req.userEmail,
    });
    res.status(201).json(serializeDoc(item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

autocompleteRoutes.delete("/:id", async (req, res) => {
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

autocompleteRoutes.get("/:id/snapshots", async (req, res) => {
  try {
    const { limit = "50" } = req.query;
    const snapshots = await getSnapshots(COLLECTION, req.params.id, parseInt(limit, 10));
    res.json(serializeDocs(snapshots.map((s) => ({ ...s, trackingId: req.params.id }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

autocompleteRoutes.get("/:id/snapshots/latest", async (req, res) => {
  try {
    const snapshot = await getLatestSnapshot(COLLECTION, req.params.id);
    if (!snapshot) return res.status(404).json({ error: "No snapshots yet" });
    res.json(serializeDoc({ ...snapshot, trackingId: req.params.id }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

autocompleteRoutes.get("/:id/changes", async (req, res) => {
  try {
    const { limit = "30" } = req.query;
    const changes = await getSnapshotsWithChanges(COLLECTION, req.params.id, parseInt(limit, 10));
    res.json(serializeDocs(changes.map((s) => ({ ...s, trackingId: req.params.id }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

autocompleteRoutes.get("/dashboard", async (req, res) => {
  try {
    const trackings = await getAllOrderedByOwner(COLLECTION, req.userEmail, "asc");
    const allSnapshots = await getAllSnapshotsByOwner(COLLECTION, req.userEmail);

    const sessions = groupSnapshotsIntoSessions(allSnapshots);

    const timeline = sessions.map((session) => {
      const rows = trackings.map((tracking) => {
        const snap = session.snapshots.find((s) => s.parentId === tracking.id);
        if (!snap) return { trackingId: tracking.id, query: tracking.query, changes: null };

        const diff = snap.diff;
        const hasChanges = diff && (
          (diff.added && diff.added.length > 0) ||
          (diff.removed && diff.removed.length > 0) ||
          (diff.reordered && diff.reordered.length > 0)
        );
        return { trackingId: tracking.id, query: tracking.query, changes: hasChanges ? diff : [] };
      });

      const createdAt = session.createdAt?.toDate ? session.createdAt.toDate().toISOString() : session.createdAt;
      return { createdAt, rows };
    });

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

autocompleteRoutes.post("/scrape-all", async (req, res) => {
  try {
    const trackings = await getActiveItemsByOwner(COLLECTION, req.userEmail);
    for (const tracking of trackings) {
      try { await runAutocompleteScrape(tracking); }
      catch (err) { console.error(`[autocomplete] Failed to scrape "${tracking.query}":`, err.message); }
    }
    res.json({ message: `${trackings.length} autocomplete scrapes completed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

autocompleteRoutes.post("/:id/scrape", async (req, res) => {
  try {
    const tracking = await getById(COLLECTION, req.params.id);
    if (!tracking) return res.status(404).json({ error: "Not found" });
    await runAutocompleteScrape(tracking);
    res.json({ message: "Autocomplete scrape completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export async function runAutocompleteScrape(tracking) {
  console.log(`[autocomplete] Starting scrape for "${tracking.query}"`);
  const { suggestions, appSuggestions, rawResponse } = await scrapeAutocomplete(tracking.query);
  const previous = await getLatestSnapshot(COLLECTION, tracking.id);
  let { diff, hasChanges } = computeAutocompleteDiff(previous?.suggestions || null, suggestions);
  if (hasChanges) {
    const lastWithDiff = await getLatestSnapshotWithDiff(COLLECTION, tracking.id);
    if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
      hasChanges = false;
      diff = null;
    }
  }
  await addSnapshot(COLLECTION, tracking.id, {
    trackingId: tracking.id, suggestions, appSuggestions, rawResponse,
    diff: hasChanges ? diff : null,
  });
  if (hasChanges) console.log(`[autocomplete] Changes detected for "${tracking.query}"`);
  console.log(`[autocomplete] Completed scrape for "${tracking.query}" (${suggestions.length} suggestions)`);
}
