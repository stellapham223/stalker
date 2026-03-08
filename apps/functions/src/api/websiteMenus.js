import { Router } from "express";
import {
  getAllOrderedByOwner, getAllSnapshotsByOwner, getActiveItemsByOwner, getById, createDoc, updateDoc, deleteDocWithSnapshots,
  addSnapshot, getSnapshots, getLatestSnapshot, getLatestSnapshotWithDiff, getSnapshotsWithChanges, isDuplicateDiff,
  serializeDocs, serializeDoc,
} from "../db/helpers.js";
import { scrapeWebsiteMenu, computeMenuDiff } from "../scrapers/menuScraper.js";
import { requireAuth, checkOwnership } from "./middleware.js";
import { groupSnapshotsIntoSessions } from "../shared/constants.js";

const COLLECTION = "websiteMenuTrackings";
export const websiteMenuRoutes = Router();

websiteMenuRoutes.use(requireAuth);

websiteMenuRoutes.get("/", async (req, res) => {
  try {
    const items = await getAllOrderedByOwner(COLLECTION, req.userEmail, "desc");
    res.json(serializeDocs(items));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

websiteMenuRoutes.post("/", async (req, res) => {
  try {
    const { name, url, interactionType } = req.body;
    const tracking = await createDoc(COLLECTION, {
      name, url, interactionType: interactionType || "hover", active: true, ownerEmail: req.userEmail,
    });
    res.status(201).json(serializeDoc(tracking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

websiteMenuRoutes.put("/:id", async (req, res) => {
  try {
    const { allowed, notFound } = await checkOwnership(COLLECTION, req.params.id, req.userEmail);
    if (notFound) return res.status(404).json({ error: "Not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const { name, url, interactionType, active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (interactionType !== undefined) updates.interactionType = interactionType;
    if (active !== undefined) updates.active = active;
    const tracking = await updateDoc(COLLECTION, req.params.id, updates);
    res.json(serializeDoc(tracking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

websiteMenuRoutes.delete("/:id", async (req, res) => {
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

websiteMenuRoutes.get("/:id/snapshots", async (req, res) => {
  try {
    const { limit = "50" } = req.query;
    const snapshots = await getSnapshots(COLLECTION, req.params.id, parseInt(limit, 10));
    res.json(serializeDocs(snapshots.map((s) => ({ ...s, trackingId: req.params.id }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

websiteMenuRoutes.get("/:id/snapshots/latest", async (req, res) => {
  try {
    const snapshot = await getLatestSnapshot(COLLECTION, req.params.id);
    res.json(snapshot ? serializeDoc({ ...snapshot, trackingId: req.params.id }) : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

websiteMenuRoutes.get("/:id/changes", async (req, res) => {
  try {
    const { limit = "30" } = req.query;
    const changes = await getSnapshotsWithChanges(COLLECTION, req.params.id, parseInt(limit, 10));
    res.json(serializeDocs(changes.map((s) => ({ ...s, trackingId: req.params.id }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

websiteMenuRoutes.get("/dashboard", async (req, res) => {
  try {
    const trackings = await getAllOrderedByOwner(COLLECTION, req.userEmail, "asc");
    const allSnapshots = await getAllSnapshotsByOwner(COLLECTION, req.userEmail);

    const sessions = groupSnapshotsIntoSessions(allSnapshots);

    const timeline = sessions.map((session) => {
      const rows = trackings.map((tracking) => {
        const snap = session.snapshots.find((s) => s.parentId === tracking.id);
        if (!snap) return { trackingId: tracking.id, name: tracking.name, changes: null };

        const diff = snap.diff;
        const hasChanges = diff && (
          (diff.added && diff.added.length > 0) ||
          (diff.removed && diff.removed.length > 0) ||
          (diff.renamed && diff.renamed.length > 0) ||
          (diff.childrenChanged && diff.childrenChanged.length > 0)
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

websiteMenuRoutes.post("/:id/scrape", async (req, res) => {
  try {
    const tracking = await getById(COLLECTION, req.params.id);
    if (!tracking) return res.status(404).json({ error: "Not found" });
    await runWebsiteMenuScrape(tracking);
    res.json({ message: `Menu scrape completed for "${tracking.name}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

websiteMenuRoutes.post("/scrape-all", async (req, res) => {
  try {
    const trackings = await getActiveItemsByOwner(COLLECTION, req.userEmail);
    for (const tracking of trackings) {
      try { await runWebsiteMenuScrape(tracking); }
      catch (err) { console.error(`[website-menus] Failed to scrape "${tracking.name}":`, err.message); }
    }
    res.json({ message: `${trackings.length} menu scrapes completed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export async function runWebsiteMenuScrape(tracking) {
  console.log(`[website-menus] Starting scrape for: ${tracking.name}`);
  const menuData = await scrapeWebsiteMenu(tracking.url, tracking.interactionType);
  const previous = await getLatestSnapshot(COLLECTION, tracking.id);
  let { diff, hasChanges } = computeMenuDiff(previous?.menuData || null, menuData);
  if (hasChanges) {
    const lastWithDiff = await getLatestSnapshotWithDiff(COLLECTION, tracking.id);
    if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
      hasChanges = false;
      diff = null;
    }
  }
  await addSnapshot(COLLECTION, tracking.id, {
    trackingId: tracking.id, menuData, diff: hasChanges ? diff : null,
  });
  if (hasChanges) console.log(`[website-menus] Changes detected for "${tracking.name}"`);
  console.log(`[website-menus] Completed scrape for "${tracking.name}" (${menuData.length} top-level items)`);
}
