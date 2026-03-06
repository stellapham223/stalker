import { Router } from "express";
import { db } from "../db/firestore.js";
import {
  getAllOrdered, getById, createDoc, updateDoc, deleteDocWithSnapshots,
  getSnapshots, serializeDocs, serializeDoc, uuid,
} from "../db/helpers.js";

const COLLECTION = "competitors";
export const competitorRoutes = Router();

competitorRoutes.get("/", async (req, res) => {
  try {
    const competitors = await getAllOrdered(COLLECTION, "desc");
    // Include trackedFields subcollection
    for (const comp of competitors) {
      const tfSnap = await db.collection(COLLECTION).doc(comp.id).collection("trackedFields").get();
      comp.trackedFields = tfSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    res.json(serializeDocs(competitors));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

competitorRoutes.get("/:id", async (req, res) => {
  try {
    const competitor = await getById(COLLECTION, req.params.id);
    if (!competitor) return res.status(404).json({ error: "Not found" });

    // Get tracked fields
    const tfSnap = await db.collection(COLLECTION).doc(req.params.id).collection("trackedFields").get();
    competitor.trackedFields = tfSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Get recent snapshots
    competitor.snapshots = serializeDocs(await getSnapshots(COLLECTION, req.params.id, 20));

    res.json(serializeDoc(competitor));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

competitorRoutes.post("/", async (req, res) => {
  try {
    const { name, url, type, trackedFields } = req.body;
    const competitor = await createDoc(COLLECTION, {
      name, url, type: type || "website", active: true,
    });

    // Create tracked fields as subcollection
    if (trackedFields && trackedFields.length > 0) {
      for (const tf of trackedFields) {
        const tfId = uuid();
        await db.collection(COLLECTION).doc(competitor.id).collection("trackedFields").doc(tfId).set({
          name: tf.name,
          selector: tf.selector,
          createdAt: new Date(),
        });
      }
    }

    const tfSnap = await db.collection(COLLECTION).doc(competitor.id).collection("trackedFields").get();
    competitor.trackedFields = tfSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.status(201).json(serializeDoc(competitor));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

competitorRoutes.patch("/:id", async (req, res) => {
  try {
    const { name, url, type, active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (type !== undefined) updates.type = type;
    if (active !== undefined) updates.active = active;

    const competitor = await updateDoc(COLLECTION, req.params.id, updates);

    const tfSnap = await db.collection(COLLECTION).doc(req.params.id).collection("trackedFields").get();
    competitor.trackedFields = tfSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json(serializeDoc(competitor));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

competitorRoutes.delete("/:id", async (req, res) => {
  try {
    // Delete tracked fields subcollection too
    const tfSnap = await db.collection(COLLECTION).doc(req.params.id).collection("trackedFields").get();
    const batch = db.batch();
    tfSnap.docs.forEach((d) => batch.delete(d.ref));
    if (tfSnap.docs.length > 0) await batch.commit();

    await deleteDocWithSnapshots(COLLECTION, req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
