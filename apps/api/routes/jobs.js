import { Router } from "express";

export const jobRoutes = Router();

// Trigger a scrape job for a specific competitor
jobRoutes.post("/scrape/:competitorId", async (req, res) => {
  try {
    const { competitorId } = req.params;
    const competitor = await req.prisma.competitor.findUnique({
      where: { id: competitorId },
      include: { trackedFields: true },
    });
    if (!competitor) return res.status(404).json({ error: "Competitor not found" });

    const jobId = await req.boss.send("scrape-competitor", {
      competitorId: competitor.id,
    });

    res.json({ jobId, message: "Scrape job queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger scrape for all active competitors
jobRoutes.post("/scrape-all", async (req, res) => {
  try {
    const competitors = await req.prisma.competitor.findMany({
      where: { active: true },
    });

    const jobIds = await Promise.all(
      competitors.map((c) =>
        req.boss.send("scrape-competitor", { competitorId: c.id })
      )
    );

    res.json({ jobIds, message: `${jobIds.length} scrape jobs queued` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
