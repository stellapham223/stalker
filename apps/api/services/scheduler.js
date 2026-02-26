import { scrapeCompetitor } from "./scraper.js";
import { computeDiff } from "./differ.js";
import { SCRAPE_INTERVAL_CRON } from "@competitor-stalker/shared/constants.js";

/**
 * Register all pg-boss workers and schedules.
 */
export async function registerWorkers(boss, prisma) {
  // Create the queue
  await boss.createQueue("scrape-competitor");
  await boss.createQueue("scrape-all");

  // Register the worker for individual competitor scraping
  await boss.work("scrape-competitor", { teamSize: 2 }, async (job) => {
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

      // Get previous snapshot for this field
      const previous = await prisma.snapshot.findFirst({
        where: { competitorId: competitor.id, fieldName: result.fieldName },
        orderBy: { createdAt: "desc" },
      });

      const { diff, diffSummary, hasChanges } = computeDiff(
        previous?.content || null,
        result.content
      );

      // Always store snapshot to track scrape history
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

  // Schedule recurring scrapes for all active competitors
  await boss.schedule("scrape-all", SCRAPE_INTERVAL_CRON, {}, {});

  await boss.work("scrape-all", async () => {
    const competitors = await prisma.competitor.findMany({
      where: { active: true },
    });

    for (const competitor of competitors) {
      await boss.send("scrape-competitor", { competitorId: competitor.id });
    }

    console.log(`[scheduler] Queued ${competitors.length} scrape jobs`);
  });

  console.log("[scheduler] Workers registered, cron schedule active");
}
