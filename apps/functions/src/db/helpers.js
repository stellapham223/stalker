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
  if (!ownerEmail) throw new Error(`getActiveItemsByOwner: ownerEmail is required (collection: ${collection})`);
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
  if (!data.ownerEmail) throw new Error(`createDoc: ownerEmail is required (collection: ${collection})`);
  if (data.createdAt instanceof Date) throw new Error("createDoc: createdAt must be an ISO string, not a Date object");
  const id = uuid();
  const now = new Date().toISOString();
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
    .update({ ...data, updatedAt: new Date().toISOString() });
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
  if (!collection) throw new Error("addSnapshot: collection is required");
  if (!parentId) throw new Error("addSnapshot: parentId is required");
  // Guard: createdAt must never be a Date object (Firestore converts it to Timestamp,
  // breaking orderBy queries that mix Timestamps and ISO strings)
  if (snapshotData.createdAt instanceof Date) {
    throw new Error("addSnapshot: createdAt must be an ISO string, not a Date object");
  }
  const id = uuid();
  const now = new Date().toISOString();
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
 * Get the most recent snapshot that had a non-null diff.
 * Used by isDuplicateDiff guard to avoid the null-diff cycle problem.
 */
export async function getLatestSnapshotWithDiff(collection, parentId) {
  const snap = await db
    .collection(collection)
    .doc(parentId)
    .collection("snapshots")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  if (snap.empty) return null;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.diff != null) return { id: doc.id, ...data };
  }
  return null;
}

/**
 * Get recent diffs (non-null) from snapshots.
 * Used by isNoisyFieldDiff to collect noisy field keys across multiple scrapes.
 */
export async function getRecentDiffs(collection, parentId, count = 5) {
  const snap = await db
    .collection(collection)
    .doc(parentId)
    .collection("snapshots")
    .orderBy("createdAt", "desc")
    .limit(count * 3)
    .get();
  if (snap.empty) return [];
  return snap.docs
    .map((d) => d.data().diff)
    .filter((d) => d != null)
    .slice(0, count);
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

/**
 * Check if a newly computed diff is identical to the previous snapshot's diff.
 * Guards against non-deterministic scraper output (dynamic counters, rotating
 * carousels, load-timing artifacts) that cause false-positive change detection.
 *
 * Handles two diff formats:
 * 1. Array-based: {added: [...], removed: [...]} — exact JSON match
 * 2. Field-based: {fieldName: {old, new}} (App Listing) — compare field keys only,
 *    because old/new values shift each scrape even when nothing really changed
 */
export function isDuplicateDiff(previousDiff, newDiff) {
  if (!newDiff || !previousDiff) return false;

  // Exact match covers most scraper types (menu, autocomplete, homepage, etc.)
  if (JSON.stringify(previousDiff) === JSON.stringify(newDiff)) return true;

  return false;
}

/**
 * For field-based diffs (App Listing: {fieldName: {old, new}}), check if ALL keys
 * in the new diff have appeared in ANY recent diffs. This catches rotating noisy fields
 * (e.g., scrape 1 changes "subtitle", scrape 2 changes "screenshots", scrape 3 changes "subtitle" again).
 */
export function isNoisyFieldDiff(recentDiffs, newDiff) {
  if (!newDiff || !recentDiffs || recentDiffs.length === 0) return false;

  const isFieldDiff = (obj) =>
    typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj).length > 0 &&
    Object.values(obj).every((v) => v && typeof v === "object" && "old" in v && "new" in v);

  if (!isFieldDiff(newDiff)) return false;

  // Collect all field keys that have appeared in recent diffs
  const noisyKeys = new Set();
  for (const d of recentDiffs) {
    if (d && isFieldDiff(d)) {
      for (const key of Object.keys(d)) noisyKeys.add(key);
    }
  }

  // If ALL keys in the new diff are known noisy keys, suppress it
  const newKeys = Object.keys(newDiff);
  return newKeys.length > 0 && newKeys.every((k) => noisyKeys.has(k));
}
