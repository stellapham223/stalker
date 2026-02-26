import { Router } from "express";

export const competitorRoutes = Router();

// List all competitors
competitorRoutes.get("/", async (req, res) => {
  try {
    const competitors = await req.prisma.competitor.findMany({
      include: { trackedFields: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(competitors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single competitor with recent snapshots
competitorRoutes.get("/:id", async (req, res) => {
  try {
    const competitor = await req.prisma.competitor.findUnique({
      where: { id: req.params.id },
      include: {
        trackedFields: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!competitor) return res.status(404).json({ error: "Not found" });
    res.json(competitor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create competitor
competitorRoutes.post("/", async (req, res) => {
  try {
    const { name, url, type, trackedFields } = req.body;
    const competitor = await req.prisma.competitor.create({
      data: {
        name,
        url,
        type: type || "website",
        trackedFields: {
          create: trackedFields || [],
        },
      },
      include: { trackedFields: true },
    });
    res.status(201).json(competitor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update competitor
competitorRoutes.patch("/:id", async (req, res) => {
  try {
    const { name, url, type, active } = req.body;
    const competitor = await req.prisma.competitor.update({
      where: { id: req.params.id },
      data: { name, url, type, active },
      include: { trackedFields: true },
    });
    res.json(competitor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete competitor
competitorRoutes.delete("/:id", async (req, res) => {
  try {
    await req.prisma.competitor.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
