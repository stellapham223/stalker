import { scrapeCompetitor } from "./scraper.js";
import { scrapeKeywordRanking, computeRankingDiff } from "./keyword-scraper.js";
import { scrapeAutocomplete, computeAutocompleteDiff } from "./autocomplete-scraper.js";
import { scrapeAppListing, computeAppListingDiff } from "./app-listing-scraper.js";
import { scrapeWebsiteMenu, computeMenuDiff } from "./menu-scraper.js";
import { scrapeHomepageContent, computeHomepageDiff } from "./homepage-scraper.js";
import { scrapeGuideDocs, computeGuideDocsDiff } from "./guide-docs-scraper.js";
import { computeDiff } from "./differ.js";
import { sendTelegramMessage } from "./telegram.js";
import {
  SCRAPE_INTERVAL_CRON,
  JOB_NAMES,
} from "@competitor-stalker/shared/constants.js";

/**
 * Register all pg-boss workers and schedules.
 */
export async function registerWorkers(boss, prisma) {
  // Create queues
  await boss.createQueue(JOB_NAMES.SCRAPE_COMPETITOR);
  await boss.createQueue(JOB_NAMES.SCRAPE_ALL);
  await boss.createQueue(JOB_NAMES.SCRAPE_KEYWORDS);
  await boss.createQueue(JOB_NAMES.SCRAPE_AUTOCOMPLETE);
  await boss.createQueue(JOB_NAMES.SCRAPE_APP_LISTING);
  await boss.createQueue(JOB_NAMES.SCRAPE_WEBSITE_MENUS);
  await boss.createQueue(JOB_NAMES.SCRAPE_HOMEPAGE_CONTENT);
  await boss.createQueue(JOB_NAMES.SCRAPE_GUIDE_DOCS);
  await boss.createQueue(JOB_NAMES.NOTIFY_CHANGES);

  // ============ Existing: Competitor scraping ============
  await boss.work(JOB_NAMES.SCRAPE_COMPETITOR, { teamSize: 2 }, async ([job]) => {
    const { competitorId } = job.data;
    console.log(`[scrape] Starting job for competitor: ${competitorId}`);

    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: { trackedFields: true },
    });

    if (!competitor || !competitor.active) {
      console.log(`[scrape] Competitor ${competitorId} not found or inactive, skipping`);
      return;
    }

    const results = await scrapeCompetitor(competitor);

    for (const result of results) {
      if (result.content === null) continue;

      const previous = await prisma.snapshot.findFirst({
        where: { competitorId: competitor.id, fieldName: result.fieldName },
        orderBy: { createdAt: "desc" },
      });

      const { diff, diffSummary, hasChanges } = computeDiff(
        previous?.content || null,
        result.content
      );

      await prisma.snapshot.create({
        data: {
          competitorId: competitor.id,
          fieldName: result.fieldName,
          content: result.content,
          diff: hasChanges ? diff : null,
          diffSummary: hasChanges ? diffSummary : null,
        },
      });

      if (hasChanges) {
        console.log(`[scrape] Change detected: ${competitor.name} / ${result.fieldName}`);
      }
    }

    console.log(`[scrape] Completed job for: ${competitor.name}`);
  });


  // ============ Feature 2: Keyword ranking scraping ============
  await boss.work(JOB_NAMES.SCRAPE_KEYWORDS, async ([job]) => {
    const { keywordId } = job.data;
    console.log(`[keywords] Starting scrape for keyword: ${keywordId}`);

    const keyword = await prisma.keywordTracking.findUnique({
      where: { id: keywordId },
    });

    if (!keyword || !keyword.active) {
      console.log(`[keywords] Keyword ${keywordId} not found or inactive`);
      return;
    }

    try {
      const rankings = await scrapeKeywordRanking(keyword.searchUrl);

      const previous = await prisma.keywordRankingSnapshot.findFirst({
        where: { keywordId: keyword.id },
        orderBy: { createdAt: "desc" },
      });

      const { newEntries, droppedEntries, positionChanges, hasChanges } = computeRankingDiff(
        previous?.rankings || null,
        rankings
      );

      await prisma.keywordRankingSnapshot.create({
        data: {
          keywordId: keyword.id,
          rankings,
          newEntries: hasChanges ? newEntries : null,
          droppedEntries: hasChanges ? droppedEntries : null,
          positionChanges: hasChanges ? positionChanges : null,
        },
      });

      if (hasChanges) {
        console.log(`[keywords] Changes detected for "${keyword.keyword}": new=${newEntries?.length || 0}, dropped=${droppedEntries?.length || 0}, moved=${positionChanges?.length || 0}`);
      }

      console.log(`[keywords] Completed scrape for "${keyword.keyword}" (${rankings.length} results)`);
    } catch (err) {
      console.error(`[keywords] Failed to scrape "${keyword.keyword}":`, err.message);
    }
  });

  // ============ Feature 3: Autocomplete scraping ============
  await boss.work(JOB_NAMES.SCRAPE_AUTOCOMPLETE, { teamSize: 5, teamConcurrency: 5 }, async ([job]) => {
    const { trackingId } = job.data;
    console.log(`[autocomplete] Starting scrape for tracking: ${trackingId}`);

    const tracking = await prisma.autocompleteTracking.findUnique({
      where: { id: trackingId },
    });

    if (!tracking || !tracking.active) {
      console.log(`[autocomplete] Tracking ${trackingId} not found or inactive`);
      return;
    }

    try {
      const { suggestions, appSuggestions, rawResponse } = await scrapeAutocomplete(
        tracking.query
      );

      const previous = await prisma.autocompleteSnapshot.findFirst({
        where: { trackingId: tracking.id },
        orderBy: { createdAt: "desc" },
      });

      const { diff, hasChanges } = computeAutocompleteDiff(
        previous?.suggestions || null,
        suggestions
      );

      await prisma.autocompleteSnapshot.create({
        data: {
          trackingId: tracking.id,
          suggestions,
          appSuggestions,
          rawResponse,
          diff: hasChanges ? diff : null,
        },
      });

      if (hasChanges) {
        console.log(`[autocomplete] Changes detected for "${tracking.query}"`);
      }

      console.log(`[autocomplete] Completed scrape for "${tracking.query}" (${suggestions.length} suggestions)`);
    } catch (err) {
      console.error(`[autocomplete] Failed to scrape "${tracking.query}":`, err.message);
    }
  });

  // ============ Feature 4: App Listing scraping ============
  await boss.work(JOB_NAMES.SCRAPE_APP_LISTING, { teamSize: 6, teamConcurrency: 6 }, async ([job]) => {
    const { competitorId } = job.data;
    console.log(`[app-listing] Starting scrape for competitor: ${competitorId}`);

    const competitor = await prisma.appListingCompetitor.findUnique({
      where: { id: competitorId },
    });

    if (!competitor || !competitor.active) {
      console.log(`[app-listing] Competitor ${competitorId} not found or inactive`);
      return;
    }

    try {
      const data = await scrapeAppListing(competitor.appUrl);

      const previous = await prisma.appListingSnapshot.findFirst({
        where: { competitorId: competitor.id },
        orderBy: { createdAt: "desc" },
      });

      const { diff, hasChanges } = computeAppListingDiff(
        previous?.data || null,
        data
      );

      await prisma.appListingSnapshot.create({
        data: {
          competitorId: competitor.id,
          data,
          diff: hasChanges ? diff : null,
        },
      });

      if (hasChanges) {
        console.log(`[app-listing] Changes detected for "${competitor.name}"`);
      }

      console.log(`[app-listing] Completed scrape for "${competitor.name}"`);
    } catch (err) {
      console.error(`[app-listing] Failed to scrape "${competitor.name}":`, err.message);
    }
  });

  // ============ Feature 5: Website Menu scraping ============
  await boss.work(JOB_NAMES.SCRAPE_WEBSITE_MENUS, async ([job]) => {
    const { trackingId } = job.data;
    console.log(`[website-menus] Starting scrape for: ${trackingId}`);

    const tracking = await prisma.websiteMenuTracking.findUnique({
      where: { id: trackingId },
    });

    if (!tracking || !tracking.active) {
      console.log(`[website-menus] Tracking ${trackingId} not found or inactive`);
      return;
    }

    try {
      const menuData = await scrapeWebsiteMenu(tracking.url, tracking.interactionType);

      const previous = await prisma.websiteMenuSnapshot.findFirst({
        where: { trackingId: tracking.id },
        orderBy: { createdAt: "desc" },
      });

      const { diff, hasChanges } = computeMenuDiff(
        previous?.menuData || null,
        menuData
      );

      await prisma.websiteMenuSnapshot.create({
        data: {
          trackingId: tracking.id,
          menuData,
          diff: hasChanges ? diff : null,
        },
      });

      if (hasChanges) {
        console.log(`[website-menus] Changes detected for "${tracking.name}"`);
      }

      console.log(`[website-menus] Completed scrape for "${tracking.name}" (${menuData.length} top-level items)`);
    } catch (err) {
      console.error(`[website-menus] Failed to scrape "${tracking.name}":`, err.message);
    }
  });

  // ============ Feature 6: Homepage Content scraping ============
  await boss.work(JOB_NAMES.SCRAPE_HOMEPAGE_CONTENT, async ([job]) => {
    const { trackingId } = job.data;
    console.log(`[homepage] Starting scrape for: ${trackingId}`);

    const tracking = await prisma.homepageTracking.findUnique({
      where: { id: trackingId },
    });

    if (!tracking || !tracking.active) {
      console.log(`[homepage] Tracking ${trackingId} not found or inactive`);
      return;
    }

    try {
      const { sections, stats, testimonials, fullText } = await scrapeHomepageContent(tracking.url);

      const previous = await prisma.homepageSnapshot.findFirst({
        where: { trackingId: tracking.id },
        orderBy: { createdAt: "desc" },
      });

      const { diff, hasChanges } = computeHomepageDiff(
        previous?.fullText || null,
        fullText
      );

      await prisma.homepageSnapshot.create({
        data: {
          trackingId: tracking.id,
          sections,
          stats,
          testimonials,
          fullText,
          diff: hasChanges ? diff : null,
        },
      });

      if (hasChanges) {
        console.log(`[homepage] Changes detected for "${tracking.name}"`);
      }

      console.log(`[homepage] Completed scrape for "${tracking.name}" (${sections.length} sections)`);
    } catch (err) {
      console.error(`[homepage] Failed to scrape "${tracking.name}":`, err.message);
    }
  });

  // ============ Feature 7: Guide Docs scraping ============
  await boss.work(JOB_NAMES.SCRAPE_GUIDE_DOCS, async ([job]) => {
    const { trackingId } = job.data;
    console.log(`[guide-docs] Starting scrape for: ${trackingId}`);

    const tracking = await prisma.guideDocsTracking.findUnique({
      where: { id: trackingId },
    });

    if (!tracking || !tracking.active) {
      console.log(`[guide-docs] Tracking ${trackingId} not found or inactive`);
      return;
    }

    try {
      const navData = await scrapeGuideDocs(tracking.url);

      const previous = await prisma.guideDocsSnapshot.findFirst({
        where: { trackingId: tracking.id },
        orderBy: { createdAt: "desc" },
      });

      const { diff, hasChanges } = computeGuideDocsDiff(
        previous?.navData || null,
        navData
      );

      await prisma.guideDocsSnapshot.create({
        data: {
          trackingId: tracking.id,
          navData,
          diff: hasChanges ? diff : null,
        },
      });

      if (hasChanges) {
        console.log(`[guide-docs] Changes detected for "${tracking.name}"`);
      }

      console.log(`[guide-docs] Completed scrape for "${tracking.name}" (${navData.length} items)`);
    } catch (err) {
      console.error(`[guide-docs] Failed to scrape "${tracking.name}":`, err.message);
    }
  });

  // ============ Schedule: daily at 6:00 AM GMT+7 (23:00 UTC) ============
  await boss.schedule(JOB_NAMES.SCRAPE_ALL, SCRAPE_INTERVAL_CRON, {}, {});

  await boss.work(JOB_NAMES.SCRAPE_ALL, async ([job]) => {
    const competitors = await prisma.competitor.findMany({ where: { active: true } });
    for (const competitor of competitors) {
      await boss.send(JOB_NAMES.SCRAPE_COMPETITOR, { competitorId: competitor.id });
    }

    const keywords = await prisma.keywordTracking.findMany({ where: { active: true } });
    for (const keyword of keywords) {
      await boss.send(JOB_NAMES.SCRAPE_KEYWORDS, { keywordId: keyword.id });
    }

    const trackings = await prisma.autocompleteTracking.findMany({ where: { active: true } });
    for (const tracking of trackings) {
      await boss.send(JOB_NAMES.SCRAPE_AUTOCOMPLETE, { trackingId: tracking.id });
    }

    const appListingCompetitors = await prisma.appListingCompetitor.findMany({ where: { active: true } });
    for (const alc of appListingCompetitors) {
      await boss.send(JOB_NAMES.SCRAPE_APP_LISTING, { competitorId: alc.id });
    }

    const menuTrackings = await prisma.websiteMenuTracking.findMany({ where: { active: true } });
    for (const mt of menuTrackings) {
      await boss.send(JOB_NAMES.SCRAPE_WEBSITE_MENUS, { trackingId: mt.id });
    }

    const homepageTrackings = await prisma.homepageTracking.findMany({ where: { active: true } });
    for (const ht of homepageTrackings) {
      await boss.send(JOB_NAMES.SCRAPE_HOMEPAGE_CONTENT, { trackingId: ht.id });
    }

    const guideDocsTrackings = await prisma.guideDocsTracking.findMany({ where: { active: true } });
    for (const gd of guideDocsTrackings) {
      await boss.send(JOB_NAMES.SCRAPE_GUIDE_DOCS, { trackingId: gd.id });
    }

    const total = competitors.length + keywords.length + trackings.length + appListingCompetitors.length + menuTrackings.length + homepageTrackings.length + guideDocsTrackings.length;
    console.log(`[scheduler] Queued ${total} scrape jobs`);

    // Schedule notification 10 minutes later (after scrapers should be done)
    await boss.send(JOB_NAMES.NOTIFY_CHANGES, {}, { startAfter: 600 });
  });

  // ============ Telegram notification after scrape ============
  await boss.work(JOB_NAMES.NOTIFY_CHANGES, async ([_job]) => {
    console.log("[notify] Building change summary...");
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000); // last 2 hours

    function countKeywordChanges(snap) {
      if (!snap) return 0;
      return (snap.newEntries?.length ?? 0) + (snap.droppedEntries?.length ?? 0) + (snap.positionChanges?.length ?? 0);
    }

    function countDiffChanges(diff) {
      if (!diff) return 0;
      let n = 0;
      if (Array.isArray(diff.added)) n += diff.added.length;
      if (Array.isArray(diff.removed)) n += diff.removed.length;
      if (Array.isArray(diff.renamed)) n += diff.renamed.length;
      if (Array.isArray(diff.reordered)) n += diff.reordered.length;
      if (Array.isArray(diff.childrenChanged)) n += diff.childrenChanged.length;
      if (diff.addedCount) n += diff.addedCount;
      if (diff.removedCount) n += diff.removedCount;
      return n || Object.keys(diff).length;
    }

    const lines = [];
    let totalChanges = 0;

    // Keywords
    const kwItems = await prisma.keywordTracking.findMany({ where: { active: true } });
    const kwChanged = [];
    for (const kw of kwItems) {
      const snap = await prisma.keywordRankingSnapshot.findFirst({
        where: { keywordId: kw.id, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
      });
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
    const acItems = await prisma.autocompleteTracking.findMany({ where: { active: true } });
    const acChanged = [];
    for (const ac of acItems) {
      const snap = await prisma.autocompleteSnapshot.findFirst({
        where: { trackingId: ac.id, createdAt: { gte: since }, diff: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (snap) {
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
    const alItems = await prisma.appListingCompetitor.findMany({ where: { active: true } });
    const alChanged = [];
    for (const al of alItems) {
      const snap = await prisma.appListingSnapshot.findFirst({
        where: { competitorId: al.id, createdAt: { gte: since }, diff: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (snap) {
        const fields = Object.keys(snap.diff);
        alChanged.push(`  • ${al.name}: ${fields.join(", ")} thay đổi`);
        totalChanges += fields.length;
      }
    }
    if (alChanged.length) lines.push(`<b>App Listing</b>\n${alChanged.join("\n")}`);

    // Website Menus
    const wmItems = await prisma.websiteMenuTracking.findMany({ where: { active: true } });
    const wmChanged = [];
    for (const wm of wmItems) {
      const snap = await prisma.websiteMenuSnapshot.findFirst({
        where: { trackingId: wm.id, createdAt: { gte: since }, diff: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (snap) {
        const count = countDiffChanges(snap.diff);
        wmChanged.push(`  • ${wm.name}: ${count} thay đổi`);
        totalChanges += count;
      }
    }
    if (wmChanged.length) lines.push(`<b>Website Menus</b>\n${wmChanged.join("\n")}`);

    // Homepage
    const hpItems = await prisma.homepageTracking.findMany({ where: { active: true } });
    const hpChanged = [];
    for (const hp of hpItems) {
      const snap = await prisma.homepageSnapshot.findFirst({
        where: { trackingId: hp.id, createdAt: { gte: since }, diff: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (snap) {
        const parts = [];
        if (snap.diff.addedCount) parts.push(`+${snap.diff.addedCount} dòng`);
        if (snap.diff.removedCount) parts.push(`-${snap.diff.removedCount} dòng`);
        hpChanged.push(`  • ${hp.name}: ${parts.join(", ")}`);
        totalChanges += (snap.diff.addedCount ?? 0) + (snap.diff.removedCount ?? 0);
      }
    }
    if (hpChanged.length) lines.push(`<b>Homepage</b>\n${hpChanged.join("\n")}`);

    // Guide Docs
    const gdItems = await prisma.guideDocsTracking.findMany({ where: { active: true } });
    const gdChanged = [];
    for (const gd of gdItems) {
      const snap = await prisma.guideDocsSnapshot.findFirst({
        where: { trackingId: gd.id, createdAt: { gte: since }, diff: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (snap) {
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
  });

  console.log("[scheduler] Workers registered, daily cron at 6:00 AM GMT+7 (23:00 UTC)");
}
