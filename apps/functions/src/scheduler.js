import { db } from "./db/firestore.js";
import { getLatestSnapshot, getLatestSnapshotWithDiff, getRecentDiffs, addSnapshot, getRecentSnapshotsWithDiff, isDuplicateDiff, isNoisyFieldDiff } from "./db/helpers.js";
import { diffChangeCount, keywordChangeCount } from "./shared/diff-utils.js";

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
 * Run all scrapers in parallel, then send Telegram notification.
 * Each scraper type runs concurrently via Promise.allSettled to stay within
 * the Firebase Function timeout (540s). Items within each type still run
 * sequentially to avoid overwhelming a single target site.
 */
export async function runScrapeAll() {
  const scrapeStartTime = new Date().toISOString();

  const scraperTasks = [
    { name: "competitors", fn: scrapeAllCompetitors },
    { name: "keywords", fn: scrapeAllKeywords },
    { name: "autocomplete", fn: scrapeAllAutocomplete },
    { name: "app-listing", fn: scrapeAllAppListing },
    { name: "website-menus", fn: scrapeAllWebsiteMenus },
    { name: "homepage", fn: scrapeAllHomepage },
    { name: "guide-docs", fn: scrapeAllGuideDocs },
  ];

  console.log(`[scheduler] Starting ${scraperTasks.length} scraper types in parallel...`);
  const results = await Promise.allSettled(scraperTasks.map((t) => t.fn()));

  let totalJobs = 0;
  for (let i = 0; i < results.length; i++) {
    const { name } = scraperTasks[i];
    const result = results[i];
    if (result.status === "fulfilled") {
      console.log(`[scheduler] ✓ ${name}: ${result.value} jobs`);
      totalJobs += result.value;
    } else {
      console.error(`[scheduler] ✗ ${name}: FAILED —`, result.reason?.message || result.reason);
    }
  }

  console.log(`[scheduler] Completed ${totalJobs} scrape jobs`);

  await sendNotification(scrapeStartTime);
}

async function scrapeAllCompetitors() {
  let jobs = 0;
  const snap = await db.collection("competitors").where("active", "==", true).get();
  for (const doc of snap.docs) {
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

        let { diff, diffSummary, hasChanges } = computeDiff(
          prevSnap?.content || null,
          result.content
        );

        if (hasChanges) {
          // Find last snapshot with non-null diff for this field to avoid null-diff cycle
          const diffSnaps = await doc.ref
            .collection("snapshots")
            .where("fieldName", "==", result.fieldName)
            .orderBy("createdAt", "desc")
            .limit(5)
            .get();
          const lastWithDiff = diffSnaps.docs.map(d => d.data()).find(s => s.diff != null);
          if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
            hasChanges = false;
            diff = null;
            diffSummary = null;
          }
        }

        await addSnapshot("competitors", competitor.id, {
          competitorId: competitor.id,
          fieldName: result.fieldName,
          content: result.content,
          diff: hasChanges ? diff : null,
          diffSummary: hasChanges ? diffSummary : null,
        });
      }
      jobs++;
    } catch (err) {
      console.error(`[scrape] Failed for ${competitor.name}:`, err.message);
    }
  }
  return jobs;
}

async function scrapeAllKeywords() {
  let jobs = 0;
  const snap = await db.collection("keywordTrackings").where("active", "==", true).get();
  for (const doc of snap.docs) {
    const keyword = { id: doc.id, ...doc.data() };
    try {
      const rankings = await scrapeKeywordRanking(keyword.searchUrl);
      const previous = await getLatestSnapshot("keywordTrackings", keyword.id);
      let { newEntries, droppedEntries, positionChanges, hasChanges } = computeRankingDiff(
        previous?.rankings || null,
        rankings
      );

      if (hasChanges) {
        // Keywords store diff in top-level fields, not in `diff` — find last snapshot with changes manually
        const kwSnaps = await db.collection("keywordTrackings").doc(keyword.id)
          .collection("snapshots").orderBy("createdAt", "desc").limit(10).get();
        const lastKwWithDiff = kwSnaps.docs.map(d => d.data()).find(s => s.newEntries != null || s.droppedEntries != null || s.positionChanges != null);
        if (lastKwWithDiff && isDuplicateDiff(
          { n: lastKwWithDiff.newEntries, d: lastKwWithDiff.droppedEntries, p: lastKwWithDiff.positionChanges },
          { n: newEntries, d: droppedEntries, p: positionChanges }
        )) {
          hasChanges = false;
          newEntries = null;
          droppedEntries = null;
          positionChanges = null;
        }
      }

      await addSnapshot("keywordTrackings", keyword.id, {
        keywordId: keyword.id,
        rankings,
        newEntries: hasChanges ? newEntries : null,
        droppedEntries: hasChanges ? droppedEntries : null,
        positionChanges: hasChanges ? positionChanges : null,
      });
      jobs++;
    } catch (err) {
      console.error(`[keywords] Failed for "${keyword.keyword}":`, err.message);
    }
  }
  return jobs;
}

async function scrapeAllAutocomplete() {
  let jobs = 0;
  const snap = await db.collection("autocompleteTrackings").where("active", "==", true).get();
  for (const doc of snap.docs) {
    const tracking = { id: doc.id, ...doc.data() };
    try {
      const { suggestions, appSuggestions, rawResponse } = await scrapeAutocomplete(tracking.query);
      const previous = await getLatestSnapshot("autocompleteTrackings", tracking.id);
      let { diff, hasChanges } = computeAutocompleteDiff(
        previous?.suggestions || null,
        suggestions
      );

      if (hasChanges) {
        const lastWithDiff = await getLatestSnapshotWithDiff("autocompleteTrackings", tracking.id);
        if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
          hasChanges = false;
          diff = null;
        }
      }

      await addSnapshot("autocompleteTrackings", tracking.id, {
        trackingId: tracking.id,
        suggestions,
        appSuggestions,
        rawResponse,
        diff: hasChanges ? diff : null,
      });
      jobs++;
    } catch (err) {
      console.error(`[autocomplete] Failed for "${tracking.query}":`, err.message);
    }
  }
  return jobs;
}

async function scrapeAllAppListing() {
  let jobs = 0;
  const snap = await db.collection("appListingCompetitors").where("active", "==", true).get();
  for (const doc of snap.docs) {
    const competitor = { id: doc.id, ...doc.data() };
    try {
      const data = await scrapeAppListing(competitor.appUrl);
      const previous = await getLatestSnapshot("appListingCompetitors", competitor.id);
      let { diff, hasChanges } = computeAppListingDiff(
        previous?.data || null,
        data
      );

      if (hasChanges) {
        const recentDiffs = await getRecentDiffs("appListingCompetitors", competitor.id);
        if (isNoisyFieldDiff(recentDiffs, diff)) {
          hasChanges = false;
          diff = null;
        }
      }

      await addSnapshot("appListingCompetitors", competitor.id, {
        competitorId: competitor.id,
        data,
        diff: hasChanges ? diff : null,
      });
      jobs++;
    } catch (err) {
      console.error(`[app-listing] Failed for "${competitor.name}":`, err.message);
    }
  }
  return jobs;
}

async function scrapeAllWebsiteMenus() {
  let jobs = 0;
  const snap = await db.collection("websiteMenuTrackings").where("active", "==", true).get();
  for (const doc of snap.docs) {
    const tracking = { id: doc.id, ...doc.data() };
    try {
      const menuData = await scrapeWebsiteMenu(tracking.url, tracking.interactionType);
      const previous = await getLatestSnapshot("websiteMenuTrackings", tracking.id);
      let { diff, hasChanges } = computeMenuDiff(
        previous?.menuData || null,
        menuData
      );

      if (hasChanges) {
        const lastWithDiff = await getLatestSnapshotWithDiff("websiteMenuTrackings", tracking.id);
        if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
          hasChanges = false;
          diff = null;
        }
      }

      await addSnapshot("websiteMenuTrackings", tracking.id, {
        trackingId: tracking.id,
        menuData,
        diff: hasChanges ? diff : null,
      });
      jobs++;
    } catch (err) {
      console.error(`[website-menus] Failed for "${tracking.name}":`, err.message);
    }
  }
  return jobs;
}

async function scrapeAllHomepage() {
  let jobs = 0;
  const snap = await db.collection("homepageTrackings").where("active", "==", true).get();
  for (const doc of snap.docs) {
    const tracking = { id: doc.id, ...doc.data() };
    try {
      const { sections, stats, testimonials, fullText } = await scrapeHomepageContent(tracking.url);
      const previous = await getLatestSnapshot("homepageTrackings", tracking.id);
      let { diff, hasChanges } = computeHomepageDiff(
        previous?.fullText || null,
        fullText
      );

      if (hasChanges) {
        const lastWithDiff = await getLatestSnapshotWithDiff("homepageTrackings", tracking.id);
        if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
          hasChanges = false;
          diff = null;
        }
      }

      await addSnapshot("homepageTrackings", tracking.id, {
        trackingId: tracking.id,
        sections,
        stats,
        testimonials,
        fullText,
        diff: hasChanges ? diff : null,
      });
      jobs++;
    } catch (err) {
      console.error(`[homepage] Failed for "${tracking.name}":`, err.message);
    }
  }
  return jobs;
}

async function scrapeAllGuideDocs() {
  let jobs = 0;
  const snap = await db.collection("guideDocsTrackings").where("active", "==", true).get();
  for (const doc of snap.docs) {
    const tracking = { id: doc.id, ...doc.data() };
    try {
      const navData = await scrapeGuideDocs(tracking.url);
      const previous = await getLatestSnapshot("guideDocsTrackings", tracking.id);
      let { diff, hasChanges } = computeGuideDocsDiff(
        previous?.navData || null,
        navData
      );

      if (hasChanges) {
        const lastWithDiff = await getLatestSnapshotWithDiff("guideDocsTrackings", tracking.id);
        if (lastWithDiff && isDuplicateDiff(lastWithDiff.diff, diff)) {
          hasChanges = false;
          diff = null;
        }
      }

      await addSnapshot("guideDocsTrackings", tracking.id, {
        trackingId: tracking.id,
        navData,
        diff: hasChanges ? diff : null,
      });
      jobs++;
    } catch (err) {
      console.error(`[guide-docs] Failed for "${tracking.name}":`, err.message);
    }
  }
  return jobs;
}

async function sendNotification(scrapeStartTime) {
  console.log("[notify] Building change summary...");
  const since = scrapeStartTime;

  const lines = [];
  let totalChanges = 0;

  // Keywords
  const kwItems = await db.collection("keywordTrackings").where("active", "==", true).get();
  const kwChanged = [];
  for (const doc of kwItems.docs) {
    const kw = { id: doc.id, ...doc.data() };
    const snap = await getRecentSnapshotsWithDiff("keywordTrackings", kw.id, since);
    const count = keywordChangeCount(snap);
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
      const count = diffChangeCount(snap.diff);
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
      const count = diffChangeCount(snap.diff);
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
      const count = diffChangeCount(snap.diff);
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
