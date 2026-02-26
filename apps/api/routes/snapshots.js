import { Router } from "express";

export const snapshotRoutes = Router();

// Get changes-only (snapshots that have diffs) - must be before /:id
snapshotRoutes.get("/changes/recent", async (req, res) => {
  try {
    const { limit = "30" } = req.query;
    const changes = await req.prisma.snapshot.findMany({
      where: { diff: { not: null } },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      include: {
        competitor: { select: { name: true, url: true } },
      },
    });
    res.json(changes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List snapshots for a competitor, optionally filtered by field
snapshotRoutes.get("/", async (req, res) => {
  try {
    const { competitorId, fieldName, limit = "50" } = req.query;
    const where = {};
    if (competitorId) where.competitorId = competitorId;
    if (fieldName) where.fieldName = fieldName;

    const snapshots = await req.prisma.snapshot.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      include: {
        competitor: { select: { name: true, url: true } },
      },
    });
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single snapshot
snapshotRoutes.get("/:id", async (req, res) => {
  try {
    const snapshot = await req.prisma.snapshot.findUnique({
      where: { id: req.params.id },
      include: {
        competitor: { select: { name: true, url: true } },
      },
    });
    if (!snapshot) return res.status(404).json({ error: "Not found" });
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
