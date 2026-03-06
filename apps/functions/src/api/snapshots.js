import { Router } from "express";
import { db } from "../db/firestore.js";
import { serializeDocs, serializeDoc } from "../db/helpers.js";

const COLLECTION = "competitors";
export const snapshotRoutes = Router();

// Get changes-only (snapshots that have diffs)
snapshotRoutes.get("/changes/recent", async (req, res) => {
  try {
    const { limit = "30" } = req.query;
    const limitNum = parseInt(limit, 10);

    // Get all competitors, then their snapshots with diffs
    const competitorsSnap = await db.collection(COLLECTION).get();
    const allChanges = [];

    for (const comp of competitorsSnap.docs) {
      const snapsSnap = await comp.ref
        .collection("snapshots")
        .orderBy("createdAt", "desc")
        .limit(limitNum)
        .get();

      for (const s of snapsSnap.docs) {
        const data = s.data();
        if (data.diff) {
          allChanges.push({
            id: s.id,
            ...data,
            competitorId: comp.id,
            competitor: { name: comp.data().name, url: comp.data().url },
          });
        }
      }
    }

    // Sort by createdAt desc and limit
    allChanges.sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
      const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
      return tb - ta;
    });

    res.json(serializeDocs(allChanges.slice(0, limitNum)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List snapshots for a competitor
snapshotRoutes.get("/", async (req, res) => {
  try {
    const { competitorId, fieldName, limit = "50" } = req.query;
    const limitNum = parseInt(limit, 10);

    if (!competitorId) {
      return res.json([]);
    }

    const snapsSnap = await db
      .collection(COLLECTION)
      .doc(competitorId)
      .collection("snapshots")
      .orderBy("createdAt", "desc")
      .limit(limitNum)
      .get();

    let results = snapsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      competitorId,
    }));

    if (fieldName) {
      results = results.filter((s) => s.fieldName === fieldName);
    }

    // Get competitor info
    const comp = await db.collection(COLLECTION).doc(competitorId).get();
    const compData = comp.exists ? { name: comp.data().name, url: comp.data().url } : {};

    res.json(serializeDocs(results.map((s) => ({ ...s, competitor: compData }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single snapshot
snapshotRoutes.get("/:id", async (req, res) => {
  try {
    // We need to search across all competitors for this snapshot ID
    const competitorsSnap = await db.collection(COLLECTION).get();
    for (const comp of competitorsSnap.docs) {
      const snapDoc = await comp.ref.collection("snapshots").doc(req.params.id).get();
      if (snapDoc.exists) {
        return res.json(serializeDoc({
          id: snapDoc.id,
          ...snapDoc.data(),
          competitorId: comp.id,
          competitor: { name: comp.data().name, url: comp.data().url },
        }));
      }
    }
    res.status(404).json({ error: "Not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
