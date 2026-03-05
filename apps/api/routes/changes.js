import { Router } from "express";

export const changesRoutes = Router();

/**
 * GET /api/changes/latest
 * Returns the most recent snapshot for each tracked item across all features,
 * indicating whether it has changes and a change count.
 * Used by frontend for badge display.
 */
changesRoutes.get("/latest", async (req, res) => {
  try {
    const prisma = req.prisma;

    const [
      keywords,
      autocompletes,
      appListingCompetitors,
      menuTrackings,
      homepageTrackings,
      guideDocsTrackings,
    ] = await Promise.all([
      prisma.keywordTracking.findMany({ where: { active: true } }),
      prisma.autocompleteTracking.findMany({ where: { active: true } }),
      prisma.appListingCompetitor.findMany({ where: { active: true } }),
      prisma.websiteMenuTracking.findMany({ where: { active: true } }),
      prisma.homepageTracking.findMany({ where: { active: true } }),
      prisma.guideDocsTracking.findMany({ where: { active: true } }),
    ]);

    // Returns the most recent snapshot only if it has changes (diff != null / keyword fields != null)
    // If the latest scrape had no changes, returns null (no badge shown)
    async function latestSnapshotWithChanges(model, foreignKey, id) {
      const latest = await prisma[model].findFirst({
        where: { [foreignKey]: id },
        orderBy: { createdAt: "desc" },
      });
      if (!latest) return null;
      // For keyword snapshots: check newEntries/droppedEntries/positionChanges
      if ("newEntries" in latest) {
        const hasChanges = latest.newEntries?.length || latest.droppedEntries?.length || latest.positionChanges?.length;
        return hasChanges ? latest : null;
      }
      // For all other snapshots: check diff field
      return latest.diff ? latest : null;
    }

    function keywordChangeCount(snap) {
      if (!snap) return 0;
      const n = snap.newEntries?.length ?? 0;
      const d = snap.droppedEntries?.length ?? 0;
      const p = snap.positionChanges?.length ?? 0;
      return n + d + p;
    }

    function diffChangeCount(diff) {
      if (!diff) return 0;
      let count = 0;
      if (Array.isArray(diff.added)) count += diff.added.length;
      if (Array.isArray(diff.removed)) count += diff.removed.length;
      if (Array.isArray(diff.renamed)) count += diff.renamed.length;
      if (Array.isArray(diff.reordered)) count += diff.reordered.length;
      if (Array.isArray(diff.childrenChanged)) count += diff.childrenChanged.length;
      if (diff.addedCount) count += diff.addedCount;
      if (diff.removedCount) count += diff.removedCount;
      // App listing format: { fieldName: { old, new } }
      if (count === 0) {
        const fieldChanges = Object.values(diff).filter(
          (v) => v && typeof v === "object" && "old" in v && "new" in v
        );
        count = fieldChanges.length;
      }
      return count;
    }

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
      // App listing format: { fieldName: { old, new } }
      if (parts.length === 0) {
        const fields = Object.entries(diff)
          .filter(([, v]) => v && typeof v === "object" && "old" in v && "new" in v)
          .map(([k]) => k);
        if (fields.length) parts.push(fields.join(", ") + " thay đổi");
      }
      return parts.length ? parts.join(", ") : null;
    }

    const keywordsResult = await Promise.all(
      keywords.map(async (k) => {
        const snap = await latestSnapshotWithChanges("keywordRankingSnapshot", "keywordId", k.id);
        const count = keywordChangeCount(snap);
        return { id: k.id, name: k.keyword, hasChanges: count > 0, changeCount: count, summary: keywordSummary(snap), snapshotAt: snap?.createdAt ?? null };
      })
    );

    const autocompleteResult = await Promise.all(
      autocompletes.map(async (a) => {
        const snap = await latestSnapshotWithChanges("autocompleteSnapshot", "trackingId", a.id);
        const count = diffChangeCount(snap?.diff);
        return { id: a.id, name: a.query, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snap?.createdAt ?? null };
      })
    );

    const appListingResult = await Promise.all(
      appListingCompetitors.map(async (c) => {
        const snap = await latestSnapshotWithChanges("appListingSnapshot", "competitorId", c.id);
        const count = diffChangeCount(snap?.diff);
        return { id: c.id, name: c.name, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snap?.createdAt ?? null };
      })
    );

    const websiteMenusResult = await Promise.all(
      menuTrackings.map(async (m) => {
        const snap = await latestSnapshotWithChanges("websiteMenuSnapshot", "trackingId", m.id);
        const count = diffChangeCount(snap?.diff);
        return { id: m.id, name: m.name, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snap?.createdAt ?? null };
      })
    );

    const homepageResult = await Promise.all(
      homepageTrackings.map(async (h) => {
        const snap = await latestSnapshotWithChanges("homepageSnapshot", "trackingId", h.id);
        const count = diffChangeCount(snap?.diff);
        return { id: h.id, name: h.name, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snap?.createdAt ?? null };
      })
    );

    const guideDocsResult = await Promise.all(
      guideDocsTrackings.map(async (g) => {
        const snap = await latestSnapshotWithChanges("guideDocsSnapshot", "trackingId", g.id);
        const count = diffChangeCount(snap?.diff);
        return { id: g.id, name: g.name, hasChanges: count > 0, changeCount: count, summary: diffSummary(snap?.diff), snapshotAt: snap?.createdAt ?? null };
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
