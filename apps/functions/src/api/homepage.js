import { Router } from "express";
import { db } from "../db/firestore.js";
import {
  getAllOrderedByOwner, getAllSnapshotsByOwner, getById, createDoc, deleteDocWithSnapshots,
  addSnapshot, getSnapshots, getLatestSnapshot, getLatestSnapshotWithDiff, getSnapshotsWithChanges, isDuplicateDiff,
  serializeDocs, serializeDoc,
} from "../db/helpers.js";
import { scrapeHomepageContent, computeHomepageDiff } from "../scrapers/homepageScraper.js";
import { requireAuth, checkOwnership } from "./middleware.js";

const COLLECTION = "homepageTrackings";
export const homepageRoutes = Router();

homepageRoutes.use(requireAuth);

homepageRoutes.get("/", async (req, res) => {
  try {
    const items = await getAllOrderedByOwner(COLLECTION, req.userEmail, "desc");
    res.json(serializeDocs(items));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

homepageRoutes.post("/", async (req, res) => {
  try {
    const { name, url } = req.body;
    const tracking = await createDoc(COLLECTION, { name, url, active: true, ownerEmail: req.userEmail });
    res.status(201).json(serializeDoc(tracking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

homepageRoutes.delete("/:id", async (req, res) => {
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

homepageRoutes.get("/:id/snapshots", async (req, res) => {
  try {
    const { limit = "50" } = req.query;
    const snapshots = await getSnapshots(COLLECTION, req.params.id, parseInt(limit, 10));
    res.json(serializeDocs(snapshots.map((s) => ({ ...s, trackingId: req.params.id }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

homepageRoutes.get("/:id/snapshots/latest", async (req, res) => {
  try {
    const snapshot = await getLatestSnapshot(COLLECTION, req.params.id);
    res.json(snapshot ? serializeDoc({ ...snapshot, trackingId: req.params.id }) : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

homepageRoutes.get("/:id/changes", async (req, res) => {
  try {
    const { limit = "30" } = req.query;
    const changes = await getSnapshotsWithChanges(COLLECTION, req.params.id, parseInt(limit, 10));
    res.json(serializeDocs(changes.map((s) => ({ ...s, trackingId: req.params.id }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

homepageRoutes.get("/dashboard", async (req, res) => {
  try {
    const trackings = await getAllOrderedByOwner(COLLECTION, req.userEmail, "asc");
    const allSnapshots = await getAllSnapshotsByOwner(COLLECTION, req.userEmail);

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
      const rows = trackings.map((tracking) => {
        const snap = session.snapshots.find((s) => s.parentId === tracking.id);
        if (!snap) return { trackingId: tracking.id, name: tracking.name, changes: null };

        const diff = snap.diff;
        const hasChanges = diff && (
          (diff.addedCount && diff.addedCount > 0) ||
          (diff.removedCount && diff.removedCount > 0)
        );
        return { trackingId: tracking.id, name: tracking.name, changes: hasChanges ? diff : [] };
      });

      const createdAt = session.createdAt?.toDate ? session.createdAt.toDate().toISOString() : session.createdAt;
      return { createdAt, rows };
    });

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

homepageRoutes.post("/:id/scrape", async (req, res) => {
  try {
    const tracking = await getById(COLLECTION, req.params.id);
    if (!tracking) return res.status(404).json({ error: "Not found" });
    await runHomepageScrape(tracking);
    res.json({ message: `Homepage scrape completed for "${tracking.name}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

homepageRoutes.post("/scrape-all", async (req, res) => {
  try {
    const snap = await db.collection(COLLECTION).where("active", "==", true).where("ownerEmail", "==", req.userEmail).get();
    const trackings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    for (const tracking of trackings) {
      try { await runHomepageScrape(tracking); }
      catch (err) { console.error(`[homepage] Failed to scrape "${tracking.name}":`, err.message); }
    }
    res.json({ message: `${trackings.length} homepage scrapes completed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export async function runHomepageScrape(tracking) {
  console.log(`[homepage] Starting scrape for: ${tracking.name}`);
  const { sections, stats, testimonials, fullText } = await scrapeHomepageContent(tracking.url);
  const previous = await getLatestSnapshot(COLLECTION, tracking.id);
  let { diff, hasChanges } = computeHomepageDiff(previous?.fullText || null, fullText);
  if (hasChanges) {
    const lastWithDiff = await getLatestSnapshotWithDiff(COLLECTION, tracking.id);
    if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
      hasChanges = false;
      diff = null;
    }
  }
  await addSnapshot(COLLECTION, tracking.id, {
    trackingId: tracking.id, sections, stats, testimonials, fullText,
    diff: hasChanges ? diff : null,
  });
  if (hasChanges) console.log(`[homepage] Changes detected for "${tracking.name}"`);
  console.log(`[homepage] Completed scrape for "${tracking.name}" (${sections.length} sections)`);
}
