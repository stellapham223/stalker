import { db } from "./firestore.js";

const COLLECTION = "allowedUsers";
const FIRST_ADMIN = "phuongptt@avadagroup.com";

export async function checkEmail(email) {
  if (email === FIRST_ADMIN) {
    const ref = db.collection(COLLECTION).doc(email);
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set({
        email,
        isAdmin: true,
        appListing: true,
        keywordRankings: true,
        autocomplete: true,
        websiteMenus: true,
        homepageMonitor: true,
        guideDocs: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await ref.update({ isAdmin: true, updatedAt: new Date() });
    }
    return true;
  }

  const doc = await db.collection(COLLECTION).doc(email).get();
  return doc.exists;
}

export async function getSessionInfo(email) {
  const doc = await db.collection(COLLECTION).doc(email).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    isAdmin: data.isAdmin || false,
    permissions: {
      appListing: data.appListing ?? true,
      keywordRankings: data.keywordRankings ?? true,
      autocomplete: data.autocomplete ?? true,
      websiteMenus: data.websiteMenus ?? true,
      homepageMonitor: data.homepageMonitor ?? true,
      guideDocs: data.guideDocs ?? true,
    },
  };
}

export async function getUserByEmail(email) {
  const doc = await db.collection(COLLECTION).doc(email).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function listUsers() {
  const snap = await db.collection(COLLECTION).orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addUser(email) {
  const ref = db.collection(COLLECTION).doc(email);
  const existing = await ref.get();
  if (existing.exists) throw { code: "ALREADY_EXISTS" };
  const data = {
    email,
    isAdmin: false,
    appListing: true,
    keywordRankings: true,
    autocomplete: true,
    websiteMenus: true,
    homepageMonitor: true,
    guideDocs: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await ref.set(data);
  return { id: email, ...data };
}

export async function updateUser(id, updates) {
  const ref = db.collection(COLLECTION).doc(id);
  await ref.update({ ...updates, updatedAt: new Date() });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

export async function deleteUser(id) {
  await db.collection(COLLECTION).doc(id).delete();
}

export async function importUsers(emails) {
  let created = 0;
  let failed = 0;
  for (const email of emails) {
    try {
      const ref = db.collection(COLLECTION).doc(email);
      const existing = await ref.get();
      if (!existing.exists) {
        await ref.set({
          email,
          isAdmin: false,
          appListing: true,
          keywordRankings: true,
          autocomplete: true,
          websiteMenus: true,
          homepageMonitor: true,
          guideDocs: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      created++;
    } catch {
      failed++;
    }
  }
  return { created, failed, total: emails.length };
}
