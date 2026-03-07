import { db } from "./db/firestore.js";
import { getLatestSnapshot, addSnapshot, getRecentSnapshotsWithDiff } from "./db/helpers.js";

import { scrapeCompetitor } from "./scrapers/competitorScraper.js";
import { computeDiff } from "./scrapers/differ.js";
import { scrapeKeywordRanking, computeRankingDiff } from "./scrapers/keywordScraper.js";
import { scrapeAutocomplete, computeAutocompleteDiff } from "./scrapers/autocompleteScraper.js";
import { scrapeAppListing, computeAppListingDiff } from "./scrapers/appListingScraper.js";
import { scrapeWebsiteMenu, computeMenuDiff } from "./scrapers/menuScraper.js";
import { scrapeHomepageContent, computeHomepageDiff } from "./scrapers/homepageScraper.js";
import { scrapeGuideDocs, computeGuideDocsDiff } from "./scrapers/guideDocsScraper.js";
import { sendTelegramMessage } from "./scrapers/telegram.js";

/**
 * Run all scrapers sequentially, then send Telegram notification.
 * Replaces pg-boss job queue + cron schedule.
 */
export async function runScrapeAll() {
  const scrapeStartTime = new Date();
  let totalJobs = 0;

  // 1. Competitor scraping
  const competitorsSnap = await db.collection("competitors").where("active", "==", true).get();
  for (const doc of competitorsSnap.docs) {
    const competitor = { id: doc.id, ...doc.data() };
    try {
      const tfSnap = await doc.ref.collection("trackedFields").get();
      competitor.trackedFields = tfSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const results = await scrapeCompetitor(competitor);
      for (const result of results) {
        if (result.content === null) continue;
        const allSnaps = await doc.ref
          .collection("snapshots")
          .where("fieldName", "==", result.fieldName)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();
        const prevSnap = allSnaps.empty ? null : allSnaps.docs[0].data();

        const { diff, diffSummary, hasChanges } = computeDiff(
          prevSnap?.content || null,
          result.content
        );

        await addSnapshot("competitors", competitor.id, {
          competitorId: competitor.id,
          fieldName: result.fieldName,
          content: result.content,
          diff: hasChanges ? diff : null,
          diffSummary: hasChanges ? diffSummary : null,
        });
      }
      totalJobs++;
    } catch (err) {
      console.error(`[scrape] Failed for ${competitor.name}:`, err.message);
    }
  }

  // 2. Keyword scraping
  const keywordsSnap = await db.collection("keywordTrackings").where("active", "==", true).get();
  for (const doc of keywordsSnap.docs) {
    const keyword = { id: doc.id, ...doc.data() };
    try {
      const rankings = await scrapeKeywordRanking(keyword.searchUrl);
      const previous = await getLatestSnapshot("keywordTrackings", keyword.id);
      const { newEntries, droppedEntries, positionChanges, hasChanges } = computeRankingDiff(
        previous?.rankings || null,
        rankings
      );
      await addSnapshot("keywordTrackings", keyword.id, {
        keywordId: keyword.id,
        rankings,
        newEntries: hasChanges ? newEntries : null,
        droppedEntries: hasChanges ? droppedEntries : null,
        positionChanges: hasChanges ? positionChanges : null,
      });
      totalJobs++;
    } catch (err) {
      console.error(`[keywords] Failed for "${keyword.keyword}":`, err.message);
    }
  }

  // 3. Autocomplete scraping
  const autocompleteSnap = await db.collection("autocompleteTrackings").where("active", "==", true).get();
  for (const doc of autocompleteSnap.docs) {
    const tracking = { id: doc.id, ...doc.data() };
    try {
      const { suggestions, appSuggestions, rawResponse } = await scrapeAutocomplete(tracking.query);
      const previous = await getLatestSnapshot("autocompleteTrackings", tracking.id);
      const { diff, hasChanges } = computeAutocompleteDiff(
        previous?.suggestions || null,
        suggestions
      );
      await addSnapshot("autocompleteTrackings", tracking.id, {
        trackingId: tracking.id,
        suggestions,
        appSuggestions,
        rawResponse,
        diff: hasChanges ? diff : null,
      });
      totalJobs++;
    } catch (err) {
      console.error(`[autocomplete] Failed for "${tracking.query}":`, err.message);
    }
  }

  // 4. App Listing scraping
  const appListingSnap = await db.collection("appListingCompetitors").where("active", "==", true).get();
  for (const doc of appListingSnap.docs) {
    const competitor = { id: doc.id, ...doc.data() };
    try {
      const data = await scrapeAppListing(competitor.appUrl);
      const previous = await getLatestSnapshot("appListingCompetitors", competitor.id);
      const { diff, hasChanges } = computeAppListingDiff(
        previous?.data || null,
        data
      );
      await addSnapshot("appListingCompetitors", competitor.id, {
        competitorId: competitor.id,
        data,
        diff: hasChanges ? diff : null,
      });
      totalJobs++;
    } catch (err) {
      console.error(`[app-listing] Failed for "${competitor.name}":`, err.message);
    }
  }

  // 5. Website Menu scraping
  const menuSnap = await db.collection("websiteMenuTrackings").where("active", "==", true).get();
  for (const doc of menuSnap.docs) {
    const tracking = { id: doc.id, ...doc.data() };
    try {
      const menuData = await scrapeWebsiteMenu(tracking.url, tracking.interactionType);
      const previous = await getLatestSnapshot("websiteMenuTrackings", tracking.id);
      const { diff, hasChanges } = computeMenuDiff(
        previous?.menuData || null,
        menuData
      );
      await addSnapshot("websiteMenuTrackings", tracking.id, {
        trackingId: tracking.id,
        menuData,
        diff: hasChanges ? diff : null,
      });
      totalJobs++;
    } catch (err) {
      console.error(`[website-menus] Failed for "${tracking.name}":`, err.message);
    }
  }

  // 6. Homepage scraping
  const homepageSnap = await db.collection("homepageTrackings").where("active", "==", true).get();
  for (const doc of homepageSnap.docs) {
    const tracking = { id: doc.id, ...doc.data() };
    try {
      const { sections, stats, testimonials, fullText } = await scrapeHomepageContent(tracking.url);
      const previous = await getLatestSnapshot("homepageTrackings", tracking.id);
      const { diff, hasChanges } = computeHomepageDiff(
        previous?.fullText || null,
        fullText
      );
      await addSnapshot("homepageTrackings", tracking.id, {
        trackingId: tracking.id,
        sections,
        stats,
        testimonials,
        fullText,
        diff: hasChanges ? diff : null,
      });
      totalJobs++;
    } catch (err) {
      console.error(`[homepage] Failed for "${tracking.name}":`, err.message);
    }
  }

  // 7. Guide Docs scraping
  const guideDocsSnap = await db.collection("guideDocsTrackings").where("active", "==", true).get();
  for (const doc of guideDocsSnap.docs) {
    const tracking = { id: doc.id, ...doc.data() };
    try {
      const navData = await scrapeGuideDocs(tracking.url);
      const previous = await getLatestSnapshot("guideDocsTrackings", tracking.id);
      const { diff, hasChanges } = computeGuideDocsDiff(
        previous?.navData || null,
        navData
      );
      await addSnapshot("guideDocsTrackings", tracking.id, {
        trackingId: tracking.id,
        navData,
        diff: hasChanges ? diff : null,
      });
      totalJobs++;
    } catch (err) {
      console.error(`[guide-docs] Failed for "${tracking.name}":`, err.message);
    }
  }

  console.log(`[scheduler] Completed ${totalJobs} scrape jobs`);

  // 8. Send Telegram notification
  await sendNotification(scrapeStartTime);
}

async function sendNotification(scrapeStartTime) {
  console.log("[notify] Building change summary...");
  const since = scrapeStartTime;

  function countKeywordChanges(snap) {
    if (!snap) return 0;
    return (snap.newEntries?.length ?? 0) + (snap.droppedEntries?.length ?? 0) + (snap.positionChanges?.length ?? 0);
  }

  function countDiffChanges(diff) {
    if (!diff) return 0;
    let n = 0;
    // Homepage diffs have both added[] and addedCount — prefer counts to avoid double-counting
    if (typeof diff.addedCount === "number" || typeof diff.removedCount === "number") {
      n += diff.addedCount ?? 0;
      n += diff.removedCount ?? 0;
    } else {
      if (Array.isArray(diff.added)) n += diff.added.length;
      if (Array.isArray(diff.removed)) n += diff.removed.length;
    }
    if (Array.isArray(diff.renamed)) n += diff.renamed.length;
    if (Array.isArray(diff.reordered)) n += diff.reordered.length;
    if (Array.isArray(diff.childrenChanged)) n += diff.childrenChanged.length;
    if (n === 0) {
      const fieldChanges = Object.values(diff).filter(
        (v) => v && typeof v === "object" && "old" in v && "new" in v
      );
      n = fieldChanges.length;
    }
    return n;
  }

  const lines = [];
  let totalChanges = 0;

  // Keywords
  const kwItems = await db.collection("keywordTrackings").where("active", "==", true).get();
  const kwChanged = [];
  for (const doc of kwItems.docs) {
    const kw = { id: doc.id, ...doc.data() };
    const snap = await getRecentSnapshotsWithDiff("keywordTrackings", kw.id, since);
    const count = countKeywordChanges(snap);
    if (count > 0) {
      const parts = [];
      if (snap.newEntries?.length) parts.push(`+${snap.newEntries.length} app mới`);
      if (snap.droppedEntries?.length) parts.push(`-${snap.droppedEntries.length} app rời`);
      if (snap.positionChanges?.length) parts.push(`~${snap.positionChanges.length} dịch chuyển`);
      kwChanged.push(`  • ${kw.keyword}: ${parts.join(", ")}`);
      totalChanges += count;
    }
  }
  if (kwChanged.length) lines.push(`<b>Keywords (${kwChanged.length} keyword có thay đổi)</b>\n${kwChanged.join("\n")}`);

  // Autocomplete
  const acItems = await db.collection("autocompleteTrackings").where("active", "==", true).get();
  const acChanged = [];
  for (const doc of acItems.docs) {
    const ac = { id: doc.id, ...doc.data() };
    const snap = await getRecentSnapshotsWithDiff("autocompleteTrackings", ac.id, since);
    if (snap && snap.diff) {
      const count = countDiffChanges(snap.diff);
      const parts = [];
      if (snap.diff.added?.length) parts.push(`+${snap.diff.added.length}`);
      if (snap.diff.removed?.length) parts.push(`-${snap.diff.removed.length}`);
      if (snap.diff.reordered?.length) parts.push(`↕${snap.diff.reordered.length}`);
      acChanged.push(`  • "${ac.query}": ${parts.join(", ")}`);
      totalChanges += count;
    }
  }
  if (acChanged.length) lines.push(`<b>Autocomplete</b>\n${acChanged.join("\n")}`);

  // App Listing
  const alItems = await db.collection("appListingCompetitors").where("active", "==", true).get();
  const alChanged = [];
  for (const doc of alItems.docs) {
    const al = { id: doc.id, ...doc.data() };
    const snap = await getRecentSnapshotsWithDiff("appListingCompetitors", al.id, since);
    if (snap && snap.diff) {
      const fields = Object.keys(snap.diff);
      alChanged.push(`  • ${al.name}: ${fields.join(", ")} thay đổi`);
      totalChanges += fields.length;
    }
  }
  if (alChanged.length) lines.push(`<b>App Listing</b>\n${alChanged.join("\n")}`);

  // Website Menus
  const wmItems = await db.collection("websiteMenuTrackings").where("active", "==", true).get();
  const wmChanged = [];
  for (const doc of wmItems.docs) {
    const wm = { id: doc.id, ...doc.data() };
    const snap = await getRecentSnapshotsWithDiff("websiteMenuTrackings", wm.id, since);
    if (snap && snap.diff) {
      const count = countDiffChanges(snap.diff);
      wmChanged.push(`  • ${wm.name}: ${count} thay đổi`);
      totalChanges += count;
    }
  }
  if (wmChanged.length) lines.push(`<b>Website Menus</b>\n${wmChanged.join("\n")}`);

  // Homepage
  const hpItems = await db.collection("homepageTrackings").where("active", "==", true).get();
  const hpChanged = [];
  for (const doc of hpItems.docs) {
    const hp = { id: doc.id, ...doc.data() };
    const snap = await getRecentSnapshotsWithDiff("homepageTrackings", hp.id, since);
    if (snap && snap.diff) {
      const parts = [];
      if (snap.diff.addedCount) parts.push(`+${snap.diff.addedCount} dòng`);
      if (snap.diff.removedCount) parts.push(`-${snap.diff.removedCount} dòng`);
      hpChanged.push(`  • ${hp.name}: ${parts.join(", ")}`);
      totalChanges += (snap.diff.addedCount ?? 0) + (snap.diff.removedCount ?? 0);
    }
  }
  if (hpChanged.length) lines.push(`<b>Homepage</b>\n${hpChanged.join("\n")}`);

  // Guide Docs
  const gdItems = await db.collection("guideDocsTrackings").where("active", "==", true).get();
  const gdChanged = [];
  for (const doc of gdItems.docs) {
    const gd = { id: doc.id, ...doc.data() };
    const snap = await getRecentSnapshotsWithDiff("guideDocsTrackings", gd.id, since);
    if (snap && snap.diff) {
      const count = countDiffChanges(snap.diff);
      gdChanged.push(`  • ${gd.name}: ${count} thay đổi`);
      totalChanges += count;
    }
  }
  if (gdChanged.length) lines.push(`<b>Guide Docs</b>\n${gdChanged.join("\n")}`);

  if (totalChanges === 0) {
    console.log("[notify] No changes detected, skipping Telegram notification.");
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleString("vi-VN", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });
  const message = [
    `🔍 <b>Competitor Stalker — Daily Report</b>`,
    `📅 ${dateStr}`,
    ``,
    lines.join("\n\n"),
    ``,
    `Tổng: <b>${totalChanges} thay đổi</b>`,
  ].join("\n");

  await sendTelegramMessage(message);
  console.log(`[notify] Sent Telegram notification (${totalChanges} changes)`);
}
