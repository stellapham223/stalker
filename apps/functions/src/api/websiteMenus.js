import { Router } from "express";
import { db } from "../db/firestore.js";
import {
  getAllOrdered, getById, createDoc, updateDoc, deleteDocWithSnapshots,
  addSnapshot, getSnapshots, getLatestSnapshot, getSnapshotsWithChanges,
  getAllSnapshots, serializeDocs, serializeDoc,
} from "../db/helpers.js";
import { scrapeWebsiteMenu, computeMenuDiff } from "../scrapers/menuScraper.js";

const COLLECTION = "websiteMenuTrackings";
export const websiteMenuRoutes = Router();

websiteMenuRoutes.get("/", async (req, res) => {
  const items = await getAllOrdered(COLLECTION, "desc");
  res.json(serializeDocs(items));
});

websiteMenuRoutes.post("/", async (req, res) => {
  const { name, url, interactionType } = req.body;
  const tracking = await createDoc(COLLECTION, {
    name, url, interactionType: interactionType || "hover", active: true,
  });
  res.status(201).json(serializeDoc(tracking));
});

websiteMenuRoutes.put("/:id", async (req, res) => {
  const { name, url, interactionType, active } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (url !== undefined) updates.url = url;
  if (interactionType !== undefined) updates.interactionType = interactionType;
  if (active !== undefined) updates.active = active;
  const tracking = await updateDoc(COLLECTION, req.params.id, updates);
  res.json(serializeDoc(tracking));
});

websiteMenuRoutes.delete("/:id", async (req, res) => {
  await deleteDocWithSnapshots(COLLECTION, req.params.id);
  res.status(204).end();
});

websiteMenuRoutes.get("/:id/snapshots", async (req, res) => {
  const { limit = "50" } = req.query;
  const snapshots = await getSnapshots(COLLECTION, req.params.id, parseInt(limit, 10));
  res.json(serializeDocs(snapshots.map((s) => ({ ...s, trackingId: req.params.id }))));
});

websiteMenuRoutes.get("/:id/snapshots/latest", async (req, res) => {
  const snapshot = await getLatestSnapshot(COLLECTION, req.params.id);
  res.json(snapshot ? serializeDoc({ ...snapshot, trackingId: req.params.id }) : null);
});

websiteMenuRoutes.get("/:id/changes", async (req, res) => {
  const { limit = "30" } = req.query;
  const changes = await getSnapshotsWithChanges(COLLECTION, req.params.id, parseInt(limit, 10));
  res.json(serializeDocs(changes.map((s) => ({ ...s, trackingId: req.params.id }))));
});

websiteMenuRoutes.get("/dashboard", async (req, res) => {
  try {
    const trackings = await getAllOrdered(COLLECTION, "asc");
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

        return {
          trackingId: tracking.id,
          name: tracking.name,
          changes: hasChanges ? diff : [],
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

websiteMenuRoutes.post("/:id/scrape", async (req, res) => {
  const tracking = await getById(COLLECTION, req.params.id);
  if (!tracking) return res.status(404).json({ error: "Not found" });

  await runWebsiteMenuScrape(tracking);
  res.json({ message: `Menu scrape completed for "${tracking.name}"` });
});

websiteMenuRoutes.post("/scrape-all", async (req, res) => {
  const snap = await db.collection(COLLECTION).where("active", "==", true).get();
  const trackings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  for (const tracking of trackings) {
    try {
      await runWebsiteMenuScrape(tracking);
    } catch (err) {
      console.error(`[website-menus] Failed to scrape "${tracking.name}":`, err.message);
    }
  }

  res.json({ message: `${trackings.length} menu scrapes completed` });
});

export async function runWebsiteMenuScrape(tracking) {
  console.log(`[website-menus] Starting scrape for: ${tracking.name}`);

  const menuData = await scrapeWebsiteMenu(tracking.url, tracking.interactionType);

  const previous = await getLatestSnapshot(COLLECTION, tracking.id);

  const { diff, hasChanges } = computeMenuDiff(
    previous?.menuData || null,
    menuData
  );

  await addSnapshot(COLLECTION, tracking.id, {
    trackingId: tracking.id,
    menuData,
    diff: hasChanges ? diff : null,
  });

  if (hasChanges) {
    console.log(`[website-menus] Changes detected for "${tracking.name}"`);
  }

  console.log(`[website-menus] Completed scrape for "${tracking.name}" (${menuData.length} top-level items)`);
}
