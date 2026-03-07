import { Router } from "express";
import { db } from "../db/firestore.js";
import { getById, addSnapshot, getLatestSnapshot, serializeDoc, isDuplicateDiff } from "../db/helpers.js";
import { scrapeCompetitor } from "../scrapers/competitorScraper.js";
import { computeDiff } from "../scrapers/differ.js";

const COLLECTION = "competitors";
export const jobRoutes = Router();

jobRoutes.post("/scrape/:competitorId", async (req, res) => {
  try {
    const competitor = await getById(COLLECTION, req.params.competitorId);
    if (!competitor) return res.status(404).json({ error: "Competitor not found" });

    // Get tracked fields
    const tfSnap = await db.collection(COLLECTION).doc(competitor.id).collection("trackedFields").get();
    competitor.trackedFields = tfSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const results = await scrapeCompetitor(competitor);

    for (const result of results) {
      if (result.content === null) continue;

      const previous = await getLatestSnapshot(COLLECTION, competitor.id);
      // Find previous snapshot for this field
      const allSnaps = await db
        .collection(COLLECTION)
        .doc(competitor.id)
        .collection("snapshots")
        .where("fieldName", "==", result.fieldName)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      const prevSnap = allSnaps.empty ? null : allSnaps.docs[0].data();

      let { diff, diffSummary, hasChanges } = computeDiff(
        prevSnap?.content || null,
        result.content
      );

      if (hasChanges) {
        const diffSnaps = await db
          .collection(COLLECTION).doc(competitor.id).collection("snapshots")
          .where("fieldName", "==", result.fieldName)
          .orderBy("createdAt", "desc").limit(5).get();
        const lastWithDiff = diffSnaps.docs.map(d => d.data()).find(s => s.diff != null);
        if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
          hasChanges = false;
          diff = null;
          diffSummary = null;
        }
      }

      await addSnapshot(COLLECTION, competitor.id, {
        competitorId: competitor.id,
        fieldName: result.fieldName,
        content: result.content,
        diff: hasChanges ? diff : null,
        diffSummary: hasChanges ? diffSummary : null,
      });
    }

    res.json({ message: "Scrape completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

jobRoutes.post("/scrape-all", async (req, res) => {
  try {
    const snap = await db.collection(COLLECTION).where("active", "==", true).get();
    const competitors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    for (const competitor of competitors) {
      try {
        const tfSnap = await db.collection(COLLECTION).doc(competitor.id).collection("trackedFields").get();
        competitor.trackedFields = tfSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const results = await scrapeCompetitor(competitor);
        for (const result of results) {
          if (result.content === null) continue;

          const allSnaps = await db
            .collection(COLLECTION)
            .doc(competitor.id)
            .collection("snapshots")
            .where("fieldName", "==", result.fieldName)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
          const prevSnap = allSnaps.empty ? null : allSnaps.docs[0].data();

          let { diff, diffSummary, hasChanges } = computeDiff(
            prevSnap?.content || null,
            result.content
          );

          if (hasChanges) {
            const diffSnaps = await db
              .collection(COLLECTION).doc(competitor.id).collection("snapshots")
              .where("fieldName", "==", result.fieldName)
              .orderBy("createdAt", "desc").limit(5).get();
            const lastWithDiff = diffSnaps.docs.map(d => d.data()).find(s => s.diff != null);
            if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
              hasChanges = false;
              diff = null;
              diffSummary = null;
            }
          }

          await addSnapshot(COLLECTION, competitor.id, {
            competitorId: competitor.id,
            fieldName: result.fieldName,
            content: result.content,
            diff: hasChanges ? diff : null,
            diffSummary: hasChanges ? diffSummary : null,
          });
        }
      } catch (err) {
        console.error(`[scrape] Failed for ${competitor.name}:`, err.message);
      }
    }

    res.json({ message: `${competitors.length} scrape jobs completed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
