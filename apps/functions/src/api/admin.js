import { Router } from "express";
import { getUserByEmail, listUsers, addUser, updateUser, deleteUser, importUsers } from "../db/allowedUsers.js";
import { serializeDocs, serializeDoc } from "../db/helpers.js";

export const adminRoutes = Router();

const ALLOWED_FIELDS = [
  "isAdmin",
  "appListing",
  "keywordRankings",
  "autocomplete",
  "websiteMenus",
  "homepageMonitor",
  "guideDocs",
];

// Auth + admin middleware
adminRoutes.use(async (req, res, next) => {
  const email = req.headers["x-user-email"];
  if (!email) return res.status(401).json({ error: "Not authenticated" });

  const user = await getUserByEmail(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  if (!user.isAdmin) return res.status(403).json({ error: "Admin access required" });

  req.userEmail = user.email;
  next();
});

adminRoutes.get("/users", async (req, res) => {
  try {
    const users = await listUsers();
    res.json(serializeDocs(users));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

adminRoutes.post("/users", async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await addUser(email);
    res.status(201).json(serializeDoc(user));
  } catch (err) {
    if (err.code === "ALREADY_EXISTS") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: err.message });
  }
});

adminRoutes.patch("/users/:id", async (req, res) => {
  try {
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => ALLOWED_FIELDS.includes(k))
    );
    const user = await updateUser(req.params.id, updates);
    res.json(serializeDoc(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

adminRoutes.delete("/users/:id", async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

adminRoutes.post("/users/import", async (req, res) => {
  try {
    const emails = (req.body.emails || [])
      .map((e) => e.toLowerCase().trim())
      .filter(Boolean);
    const result = await importUsers(emails);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ONE-TIME migration: duplicate all legacy docs (no ownerEmail) for each existing user
// Call once as admin, then this endpoint can be removed
adminRoutes.post("/migrate-ownership", async (req, res) => {
  const { db } = await import("../db/firestore.js");
  const { uuid } = await import("../db/helpers.js");

  const EXISTING_USERS = [
    "phuongptt@avadagroup.com",
    "longlv@avadagroup.com",
    "stellapham.work@gmail.com",
  ];

  const COLLECTIONS = [
    "competitors",
    "keywordTrackings",
    "autocompleteTrackings",
    "appListingCompetitors",
    "websiteMenuTrackings",
    "homepageTrackings",
    "guideDocsTrackings",
  ];

  const summary = {};

  try {
    for (const col of COLLECTIONS) {
      summary[col] = { processed: 0, skipped: 0 };
      const snap = await db.collection(col).get();

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.ownerEmail) {
          summary[col].skipped++;
          continue; // already has owner, skip
        }

        // Assign doc gốc cho user đầu tiên
        await docSnap.ref.update({ ownerEmail: EXISTING_USERS[0] });

        // Lấy snapshots của doc gốc để copy
        const snapshotsSnap = await docSnap.ref.collection("snapshots").get();

        // Tạo bản sao cho user 2 và 3
        for (let i = 1; i < EXISTING_USERS.length; i++) {
          const newId = uuid();
          const newRef = db.collection(col).doc(newId);
          await newRef.set({ ...data, ownerEmail: EXISTING_USERS[i], createdAt: data.createdAt || new Date().toISOString() });

          // Copy snapshots
          for (const snapDoc of snapshotsSnap.docs) {
            await newRef.collection("snapshots").doc(uuid()).set(snapDoc.data());
          }
        }

        summary[col].processed++;
      }
    }

    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ error: err.message, summary });
  }
});
