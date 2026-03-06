import { Router } from "express";
import { db } from "../db/firestore.js";
import {
  getAllOrdered, getById, createDoc, deleteDocWithSnapshots,
  addSnapshot, getSnapshots, getLatestSnapshot, getAllSnapshots,
  serializeDocs, serializeDoc,
} from "../db/helpers.js";
import { scrapeAppListing, computeAppListingDiff } from "../scrapers/appListingScraper.js";

const COLLECTION = "appListingCompetitors";
export const appListingRoutes = Router();

appListingRoutes.get("/", async (req, res) => {
  try {
    const items = await getAllOrdered(COLLECTION, "asc");
    res.json(serializeDocs(items));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appListingRoutes.post("/", async (req, res) => {
  try {
    const { name, appUrl } = req.body;
    const item = await createDoc(COLLECTION, { name, appUrl, active: true });
    res.status(201).json(serializeDoc(item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appListingRoutes.delete("/:id", async (req, res) => {
  try {
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
    res.status(500).json({ error: err.message });
  }
});

appListingRoutes.get("/dashboard", async (req, res) => {
  try {
    const competitors = await getAllOrdered(COLLECTION, "asc");
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

    const FIELDS = ["title", "screenshots", "videos", "appDetails", "languages", "worksWith", "categories", "pricing"];

    const timeline = sessions.map((session) => {
      const rows = competitors.map((competitor) => {
        const snap = session.snapshots.find((s) => s.parentId === competitor.id);
        if (!snap) return { competitorId: competitor.id, name: competitor.name, changes: null };

        const diff = snap.diff;
        if (!diff || Object.keys(diff).length === 0) {
          return { competitorId: competitor.id, name: competitor.name, changes: [] };
        }

        const changes = [];
        for (const field of FIELDS) {
          if (diff[field]) {
            changes.push({ field, old: diff[field].old, new: diff[field].new });
          }
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
    const snap = await db.collection(COLLECTION).where("active", "==", true).get();
    const competitors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    for (const competitor of competitors) {
      try {
        await runAppListingScrape(competitor);
      } catch (err) {
        console.error(`[app-listing] Failed to scrape "${competitor.name}":`, err.message);
      }
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

  const { diff, hasChanges } = computeAppListingDiff(
    previous?.data || null,
    data
  );

  await addSnapshot(COLLECTION, competitor.id, {
    competitorId: competitor.id,
    data,
    diff: hasChanges ? diff : null,
  });

  if (hasChanges) {
    console.log(`[app-listing] Changes detected for "${competitor.name}"`);
  }

  console.log(`[app-listing] Completed scrape for "${competitor.name}"`);
}
