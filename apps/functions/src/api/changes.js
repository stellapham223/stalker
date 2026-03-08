import { Router } from "express";
import { db } from "../db/firestore.js";
import { requireAuth } from "./middleware.js";
import { diffChangeCount, keywordChangeCount } from "@competitor-stalker/shared/diff-utils.js";

export const changesRoutes = Router();

changesRoutes.use(requireAuth);

changesRoutes.get("/latest", async (req, res) => {
  try {
    const email = req.userEmail;
    const [
      keywordsSnap,
      autocompletesSnap,
      appListingSnap,
      menuSnap,
      homepageSnap,
      guideDocsSnap,
    ] = await Promise.all([
      db.collection("keywordTrackings").where("active", "==", true).where("ownerEmail", "==", email).get(),
      db.collection("autocompleteTrackings").where("active", "==", true).where("ownerEmail", "==", email).get(),
      db.collection("appListingCompetitors").where("active", "==", true).where("ownerEmail", "==", email).get(),
      db.collection("websiteMenuTrackings").where("active", "==", true).where("ownerEmail", "==", email).get(),
      db.collection("homepageTrackings").where("active", "==", true).where("ownerEmail", "==", email).get(),
      db.collection("guideDocsTrackings").where("active", "==", true).where("ownerEmail", "==", email).get(),
    ]);

    const keywords = keywordsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const autocompletes = autocompletesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const appListingCompetitors = appListingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const menuTrackings = menuSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const homepageTrackings = homepageSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const guideDocsTrackings = guideDocsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    function keywordSummary(snap) {
      if (!snap || keywordChangeCount(snap) === 0) return null;
      const parts = [];
      if (snap.newEntries?.length) parts.push(`+${snap.newEntries.length} app mới`);
      if (snap.droppedEntries?.length) parts.push(`-${snap.droppedEntries.length} app rời`);
      if (snap.positionChanges?.length) parts.push(`~${snap.positionChanges.length} dịch chuyển`);
      return parts.join(", ");
    }

    function diffSummary(diff) {
      if (!diff) return null;
      const parts = [];
      if (diff.added?.length) parts.push(`+${diff.added.length} thêm`);
      if (diff.removed?.length) parts.push(`-${diff.removed.length} xóa`);
      if (diff.renamed?.length) parts.push(`~${diff.renamed.length} đổi tên`);
      if (diff.reordered?.length) parts.push(`↕${diff.reordered.length} thứ tự`);
      if (diff.childrenChanged?.length) parts.push(`↻${diff.childrenChanged.length} mục con`);
      if (diff.addedCount || diff.removedCount) {
        if (diff.addedCount) parts.push(`+${diff.addedCount} dòng`);
        if (diff.removedCount) parts.push(`-${diff.removedCount} dòng`);
      }
      if (parts.length === 0) {
        const fields = Object.entries(diff)
          .filter(([, v]) => v && typeof v === "object" && "old" in v && "new" in v)
          .map(([k]) => k);
        if (fields.length) parts.push(fields.join(", ") + " thay đổi");
      }
      return parts.length ? parts.join(", ") : null;
    }

    async function getLatestWithChanges(collection, id, isKeyword = false) {
      // Get recent snapshots and find the most recent one WITH changes
      const snap = await db
        .collection(collection)
        .doc(id)
        .collection("snapshots")
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      if (snap.empty) return null;
      for (const doc of snap.docs) {
        const data = { id: doc.id, ...doc.data() };
        if (isKeyword) {
          if (data.newEntries?.length || data.droppedEntries?.length || data.positionChanges?.length) return data;
        } else {
          if (data.diff) return data;
        }
      }
      return null;
    }

    const keywordsResult = await Promise.all(
      keywords.map(async (k) => {
        const snap = await getLatestWithChanges("keywordTrackings", k.id, true);
        const count = keywordChangeCount(snap);
        const snapAt = snap?.createdAt?.toDate ? snap.createdAt.toDate().toISOString() : snap?.createdAt ?? null;
        return { id: k.id, name: k.keyword, hasChanges: count > 0, changeCount: count, summary: keywordSummary(snap), snapshotAt: snapAt };
      })
    );

    const autocompleteResult = await Promise.all(
      autocompletes.map(async (a) => {
        const snap = await getLatestWithChanges("autocompleteTrackings", a.id);
        const count = diffChangeCount(snap?.diff);
        const snapAt = snap?.createdAt?.toDate ? snap.createdAt.toDate().toISOString() : snap?.createdAt ?? null;
        return { id: a.id, name: a.query, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snapAt };
      })
    );

    const appListingResult = await Promise.all(
      appListingCompetitors.map(async (c) => {
        const snap = await getLatestWithChanges("appListingCompetitors", c.id);
        const count = diffChangeCount(snap?.diff);
        const snapAt = snap?.createdAt?.toDate ? snap.createdAt.toDate().toISOString() : snap?.createdAt ?? null;
        return { id: c.id, name: c.name, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snapAt };
      })
    );

    const websiteMenusResult = await Promise.all(
      menuTrackings.map(async (m) => {
        const snap = await getLatestWithChanges("websiteMenuTrackings", m.id);
        const count = diffChangeCount(snap?.diff);
        const snapAt = snap?.createdAt?.toDate ? snap.createdAt.toDate().toISOString() : snap?.createdAt ?? null;
        return { id: m.id, name: m.name, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snapAt };
      })
    );

    const homepageResult = await Promise.all(
      homepageTrackings.map(async (h) => {
        const snap = await getLatestWithChanges("homepageTrackings", h.id);
        const count = diffChangeCount(snap?.diff);
        const snapAt = snap?.createdAt?.toDate ? snap.createdAt.toDate().toISOString() : snap?.createdAt ?? null;
        return { id: h.id, name: h.name, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snapAt };
      })
    );

    const guideDocsResult = await Promise.all(
      guideDocsTrackings.map(async (g) => {
        const snap = await getLatestWithChanges("guideDocsTrackings", g.id);
        const count = diffChangeCount(snap?.diff);
        const snapAt = snap?.createdAt?.toDate ? snap.createdAt.toDate().toISOString() : snap?.createdAt ?? null;
        return { id: g.id, name: g.name, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snapAt };
      })
    );

    const allItems = [
      ...keywordsResult,
      ...autocompleteResult,
      ...appListingResult,
      ...websiteMenusResult,
      ...homepageResult,
      ...guideDocsResult,
    ];

    const sessionAt = allItems
      .filter((i) => i.snapshotAt)
      .map((i) => new Date(i.snapshotAt).getTime())
      .reduce((max, t) => Math.max(max, t), 0);

    const totalChanges = allItems.reduce((sum, i) => sum + i.changeCount, 0);

    res.json({
      sessionAt: sessionAt ? new Date(sessionAt).toISOString() : null,
      totalChanges,
      features: {
        keywords: keywordsResult,
        autocomplete: autocompleteResult,
        appListing: appListingResult,
        websiteMenus: websiteMenusResult,
        homepage: homepageResult,
        guideDocs: guideDocsResult,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
