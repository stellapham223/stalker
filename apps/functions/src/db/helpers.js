import { db } from "./firestore.js";
import crypto from "crypto";

/**
 * Generate a UUID for document IDs (matching Prisma's default UUID behavior).
 */
export function uuid() {
  return crypto.randomUUID();
}

/**
 * Get all active documents from a collection.
 */
export async function getActiveItems(collection) {
  const snap = await db
    .collection(collection)
    .where("active", "==", true)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all documents from a collection, ordered by createdAt.
 */
export async function getAllOrdered(collection, order = "asc") {
  const snap = await db
    .collection(collection)
    .orderBy("createdAt", order)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all documents belonging to a specific owner, ordered by createdAt.
 */
export async function getAllOrderedByOwner(collection, ownerEmail, order = "asc") {
  const snap = await db
    .collection(collection)
    .where("ownerEmail", "==", ownerEmail)
    .orderBy("createdAt", order)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get active documents belonging to a specific owner.
 */
export async function getActiveItemsByOwner(collection, ownerEmail) {
  const snap = await db
    .collection(collection)
    .where("ownerEmail", "==", ownerEmail)
    .where("active", "==", true)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all snapshots across documents owned by a specific user (for dashboard).
 */
export async function getAllSnapshotsByOwner(collection, ownerEmail) {
  const parents = await db
    .collection(collection)
    .where("ownerEmail", "==", ownerEmail)
    .get();
  const allSnapshots = [];

  for (const parent of parents.docs) {
    const snaps = await parent.ref
      .collection("snapshots")
      .orderBy("createdAt", "desc")
      .get();
    snaps.docs.forEach((s) => {
      allSnapshots.push({
        id: s.id,
        parentId: parent.id,
        parentName: parent.data().name || parent.data().keyword || parent.data().query || "",
        ...s.data(),
      });
    });
  }

  allSnapshots.sort((a, b) => {
    const ta = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const tb = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return tb - ta;
  });

  return allSnapshots;
}

/**
 * Get a single document by ID.
 */
export async function getById(collection, id) {
  const doc = await db.collection(collection).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * Create a document with auto-generated ID.
 */
export async function createDoc(collection, data) {
  const id = uuid();
  const now = new Date();
  const docData = { ...data, createdAt: now, updatedAt: now };
  await db.collection(collection).doc(id).set(docData);
  return { id, ...docData };
}

/**
 * Update a document.
 */
export async function updateDoc(collection, id, data) {
  await db
    .collection(collection)
    .doc(id)
    .update({ ...data, updatedAt: new Date() });
  return getById(collection, id);
}

/**
 * Delete a document and all its subcollection snapshots.
 */
export async function deleteDocWithSnapshots(collection, id) {
  const docRef = db.collection(collection).doc(id);

  // Delete snapshots subcollection in chunks (Firestore batch limit is 500)
  const snapshotsSnap = await docRef.collection("snapshots").get();
  const docs = snapshotsSnap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach((snap) => batch.delete(snap.ref));
    await batch.commit();
  }

  await docRef.delete();
}

/**
 * Add a snapshot to a document's snapshots subcollection.
 */
export async function addSnapshot(collection, parentId, snapshotData) {
  const id = uuid();
  const now = new Date();
  const data = { ...snapshotData, createdAt: now };
  await db
    .collection(collection)
    .doc(parentId)
    .collection("snapshots")
    .doc(id)
    .set(data);
  return { id, ...data };
}

/**
 * Get snapshots for a parent document, ordered by createdAt desc.
 */
export async function getSnapshots(collection, parentId, limit = 50) {
  const snap = await db
    .collection(collection)
    .doc(parentId)
    .collection("snapshots")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get the latest snapshot for a parent document.
 */
export async function getLatestSnapshot(collection, parentId) {
  const snap = await db
    .collection(collection)
    .doc(parentId)
    .collection("snapshots")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Get snapshots that have changes (diff != null).
 */
export async function getSnapshotsWithChanges(
  collection,
  parentId,
  limit = 30
) {
  const snap = await db
    .collection(collection)
    .doc(parentId)
    .collection("snapshots")
    .orderBy("createdAt", "desc")
    .limit(limit * 3)
    .get();

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.diff != null)
    .slice(0, limit);
}

/**
 * Get all snapshots across all documents in a collection (for dashboard).
 */
export async function getAllSnapshots(collection) {
  const parents = await db.collection(collection).get();
  const allSnapshots = [];

  for (const parent of parents.docs) {
    const snaps = await parent.ref
      .collection("snapshots")
      .orderBy("createdAt", "desc")
      .get();
    snaps.docs.forEach((s) => {
      allSnapshots.push({
        id: s.id,
        parentId: parent.id,
        parentName: parent.data().name || parent.data().keyword || parent.data().query || "",
        ...s.data(),
      });
    });
  }

  // Sort all snapshots by createdAt desc
  allSnapshots.sort((a, b) => {
    const ta = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const tb = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return tb - ta;
  });

  return allSnapshots;
}

/**
 * Get recent snapshots with diffs (for notification).
 */
export async function getRecentSnapshotsWithDiff(collection, parentId, sinceDate) {
  const snap = await db
    .collection(collection)
    .doc(parentId)
    .collection("snapshots")
    .where("createdAt", ">=", sinceDate)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Convert Firestore Timestamp to ISO string for API responses.
 */
export function serializeDoc(doc) {
  if (!doc) return doc;
  const result = { ...doc };
  if (result.createdAt?.toDate) result.createdAt = result.createdAt.toDate().toISOString();
  if (result.updatedAt?.toDate) result.updatedAt = result.updatedAt.toDate().toISOString();
  return result;
}

export function serializeDocs(docs) {
  return docs.map(serializeDoc);
}
