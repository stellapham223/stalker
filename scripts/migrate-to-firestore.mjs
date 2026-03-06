import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import pg from "pg";

const { Client } = pg;

// Firebase service account
initializeApp({
  credential: cert({
    projectId: "marketing-stalker-tool",
    privateKeyId: "d570fe600e072dec7973f69dc07e623d82ad1dd5",
    privateKey:
      "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDdHhG6owx0gZKS\nlbnyMAyQ0pC9+5nlydRQITwhE7Us+lQbcVboCJASKle9mSoXVi2zx8c2hx35/tf3\nX8rVYOylU8SUgr+PMkN9Mha6kwpp/au1Lpw7PRyxx8ktw3asJmhdzxt5M2s3E6um\nMyDRce5+XG6g/O0IUnBgpakglX+F/dCEjtIllikj7V75/nzv1573q1ns+6BgRHoG\nWGdTAq6EEBIaMvvexS0Y6ivdrkNDFwMTGnzOpZ+CXi9YaEcGbJsLNmejLXQQ/0NQ\nkY4eJahXBS95ixZFOGyvCkeiwRZC8HZKRgo9OiLZ4tz6sTnjbtBMD3gLrm3TNiW/\nYlWu0nP3AgMBAAECggEAasiGNFVggvU+NSc0pPa6YsglmXIjuNq2+zmJocm0MbP0\noUojd6wG85baR5hrwNhf+tXsaXNoMR526qKqwFBuCEuDgFsCKqPR/uiNHG49VcFp\nRnbrgRo6vMpoZ/7g1TM5LLCDqoz/5pnLx9giLbOxQvndfUaYK/AwECSAoFlCPBDY\n8RUUbCOJ5QofPFKF3pBCQe7xkcT+RB5SDMZND7hr+z0QRa0GnTI8uVN9VVLdGrio\nknnagiRe2pm4l9YSrykYkfO8iDUgsrXGGZoO4VBRathZFVdCRMGpkUODj5Va/iDt\nsLJMOeBWuJRejEvc6cMenVHLm4ej4QCxo0v6odsFeQKBgQDuk5x+Psogvl0rtSKP\nN0QgwbCgc4Bsbah1bXz9ZGLBuEqsnCviJ7V9GyH3MUKLF27DgYAP3stUIl9ICkiz\n7l5qhiTINSR4x4UzcLaAUSQWAeKivtfhfdbpjDRGOH/54nwZURNMLJQz1Ab9cFTR\nPVdqQNUKNgmlL1gkYw1W81XODwKBgQDtRAtrJHHN4yJxovSnZN3Bf5JkzB83D5cW\nKzadMYR8oVBNQ9gUP9tXv5AW/3sg9zd7mvNAJXgM5h7FYps6lB20pH+m7av83qF3\nlmCqX26wXkTVdNT+0dcLhcRUTmLBNuJDrvUG7wwxZggTi3Urmmg7pNj6bYmUGG5u\nGpQxGv3jmQKBgCpoAHwMKx9w1tzLAI6WUzzDUOLkROKBB12ADaR4sHkgid1ukPpM\n9px7MyleDybsDlsf7KRlhJy601bZxRx+dTfYCjewAoCZblq7YSUjxxdGVIN7CqJh\nHM88hZopts2y7T4OxDBZCCrCOE/aJKlgjuYrCfMbsdEzviYRmTBoZksPAoGAVqU7\nukPT34kr4e3NhHfcV7Z7wp2cZKIn3auoRR15MX5DcgPtm+957YCCYTOpRm+hbl02\nqd1FCwjageCxqWG/u2E7UL2Iyk6PDrn20SEKrhOu9Xi189yzuHyAJv19KOwfEvKI\nfqC7hiqplmGeR28a03Uu2702ucN2SHUiWxBtWTkCgYBT/YQ87XnRuxDWzgezNiJO\nZRLsALVBb0h94y+jON2J7SYLg1QuHk3t+k3Eu17XvoT8qWuOw+p6t84cyA5+6XHM\n4hjLPpn/RtVC22rlqc82edwp7JuVINyQ49VCO+AMbY7ScjcxCLJ7lZT4TsiJm0OK\nbSKir4u0IcmeQxpgJE7YlA==\n-----END PRIVATE KEY-----\n",
    clientEmail: "firebase-adminsdk-fbsvc@marketing-stalker-tool.iam.gserviceaccount.com",
  }),
});

const db = getFirestore();

const pgClient = new Client({
  connectionString: "postgresql://stalker:stalker_pass@localhost:5435/competitor_stalker",
});

async function batchWrite(collection, docs) {
  const BATCH_SIZE = 500;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const { id, data } of docs.slice(i, i + BATCH_SIZE)) {
      batch.set(collection.doc(id), data);
    }
    await batch.commit();
  }
}

async function migrate() {
  await pgClient.connect();
  console.log("Connected to PostgreSQL");

  // 1. AllowedUsers
  console.log("\n→ Migrating AllowedUsers...");
  const { rows: users } = await pgClient.query('SELECT * FROM "AllowedUser"');
  await batchWrite(
    db.collection("allowedUsers"),
    users.map((u) => ({
      id: u.email,
      data: {
        email: u.email,
        isAdmin: u.isAdmin,
        permissions: {
          appListing: u.appListing,
          keywordRankings: u.keywordRankings,
          autocomplete: u.autocomplete,
          websiteMenus: u.websiteMenus,
          homepageMonitor: u.homepageMonitor,
          guideDocs: u.guideDocs,
        },
        createdAt: u.createdAt.toISOString(),
      },
    }))
  );
  console.log(`  ✓ ${users.length} users`);

  // 2. AppListingCompetitors + snapshots
  console.log("\n→ Migrating AppListingCompetitors...");
  const { rows: appComps } = await pgClient.query('SELECT * FROM "AppListingCompetitor"');
  await batchWrite(
    db.collection("appListingCompetitors"),
    appComps.map((c) => ({
      id: c.id,
      data: { name: c.name, appUrl: c.appUrl, active: c.active, createdAt: c.createdAt.toISOString() },
    }))
  );
  const { rows: appSnaps } = await pgClient.query('SELECT * FROM "AppListingSnapshot" ORDER BY "createdAt" ASC');
  await batchWrite(
    db.collection("appListingCompetitors"),
    appSnaps.map((s) => ({
      id: `${s.competitorId}/snapshots/${s.id}`,
      data: { competitorId: s.competitorId, data: s.data, diff: s.diff, createdAt: s.createdAt.toISOString() },
    }))
  );
  console.log(`  ✓ ${appComps.length} competitors, ${appSnaps.length} snapshots`);

  // 3. KeywordTrackings + snapshots
  console.log("\n→ Migrating KeywordTrackings...");
  const { rows: keywords } = await pgClient.query('SELECT * FROM "KeywordTracking"');
  await batchWrite(
    db.collection("keywordTrackings"),
    keywords.map((k) => ({
      id: k.id,
      data: { keyword: k.keyword, searchUrl: k.searchUrl, active: k.active, createdAt: k.createdAt.toISOString() },
    }))
  );
  const { rows: kwSnaps } = await pgClient.query('SELECT * FROM "KeywordRankingSnapshot" ORDER BY "createdAt" ASC');
  await batchWrite(
    db.collection("keywordTrackings"),
    kwSnaps.map((s) => ({
      id: `${s.keywordId}/snapshots/${s.id}`,
      data: { keywordId: s.keywordId, rankings: s.rankings, newEntries: s.newEntries, droppedEntries: s.droppedEntries, positionChanges: s.positionChanges, createdAt: s.createdAt.toISOString() },
    }))
  );
  console.log(`  ✓ ${keywords.length} keywords, ${kwSnaps.length} snapshots`);

  // 4. AutocompleteTrackings + snapshots
  console.log("\n→ Migrating AutocompleteTrackings...");
  const { rows: autos } = await pgClient.query('SELECT * FROM "AutocompleteTracking"');
  await batchWrite(
    db.collection("autocompleteTrackings"),
    autos.map((a) => ({
      id: a.id,
      data: { query: a.query, targetUrl: a.targetUrl, active: a.active, createdAt: a.createdAt.toISOString() },
    }))
  );
  const { rows: autoSnaps } = await pgClient.query('SELECT * FROM "AutocompleteSnapshot" ORDER BY "createdAt" ASC');
  await batchWrite(
    db.collection("autocompleteTrackings"),
    autoSnaps.map((s) => ({
      id: `${s.trackingId}/snapshots/${s.id}`,
      data: { trackingId: s.trackingId, suggestions: s.suggestions, appSuggestions: s.appSuggestions, rawResponse: s.rawResponse, diff: s.diff, createdAt: s.createdAt.toISOString() },
    }))
  );
  console.log(`  ✓ ${autos.length} trackings, ${autoSnaps.length} snapshots`);

  // 5. WebsiteMenuTrackings + snapshots
  console.log("\n→ Migrating WebsiteMenuTrackings...");
  const { rows: menus } = await pgClient.query('SELECT * FROM "WebsiteMenuTracking"');
  await batchWrite(
    db.collection("websiteMenuTrackings"),
    menus.map((m) => ({
      id: m.id,
      data: { name: m.name, url: m.url, interactionType: m.interactionType, active: m.active, createdAt: m.createdAt.toISOString() },
    }))
  );
  const { rows: menuSnaps } = await pgClient.query('SELECT * FROM "WebsiteMenuSnapshot" ORDER BY "createdAt" ASC');
  await batchWrite(
    db.collection("websiteMenuTrackings"),
    menuSnaps.map((s) => ({
      id: `${s.trackingId}/snapshots/${s.id}`,
      data: { trackingId: s.trackingId, menuData: s.menuData, diff: s.diff, createdAt: s.createdAt.toISOString() },
    }))
  );
  console.log(`  ✓ ${menus.length} trackings, ${menuSnaps.length} snapshots`);

  // 6. HomepageTrackings + snapshots
  console.log("\n→ Migrating HomepageTrackings...");
  const { rows: homepages } = await pgClient.query('SELECT * FROM "HomepageTracking"');
  await batchWrite(
    db.collection("homepageTrackings"),
    homepages.map((h) => ({
      id: h.id,
      data: { name: h.name, url: h.url, active: h.active, createdAt: h.createdAt.toISOString() },
    }))
  );
  const { rows: hpSnaps } = await pgClient.query('SELECT * FROM "HomepageSnapshot" ORDER BY "createdAt" ASC');
  await batchWrite(
    db.collection("homepageTrackings"),
    hpSnaps.map((s) => ({
      id: `${s.trackingId}/snapshots/${s.id}`,
      data: { trackingId: s.trackingId, sections: s.sections, stats: s.stats, testimonials: s.testimonials, fullText: s.fullText, diff: s.diff, createdAt: s.createdAt.toISOString() },
    }))
  );
  console.log(`  ✓ ${homepages.length} trackings, ${hpSnaps.length} snapshots`);

  // 7. GuideDocsTrackings + snapshots
  console.log("\n→ Migrating GuideDocsTrackings...");
  const { rows: guideDocs } = await pgClient.query('SELECT * FROM "GuideDocsTracking"');
  await batchWrite(
    db.collection("guideDocsTrackings"),
    guideDocs.map((g) => ({
      id: g.id,
      data: { name: g.name, url: g.url, active: g.active, createdAt: g.createdAt.toISOString() },
    }))
  );
  const { rows: gdSnaps } = await pgClient.query('SELECT * FROM "GuideDocsSnapshot" ORDER BY "createdAt" ASC');
  await batchWrite(
    db.collection("guideDocsTrackings"),
    gdSnaps.map((s) => ({
      id: `${s.trackingId}/snapshots/${s.id}`,
      data: { trackingId: s.trackingId, navData: s.navData, diff: s.diff, createdAt: s.createdAt.toISOString() },
    }))
  );
  console.log(`  ✓ ${guideDocs.length} trackings, ${gdSnaps.length} snapshots`);

  // 8. Competitors + trackedFields + snapshots
  console.log("\n→ Migrating Competitors...");
  const { rows: comps } = await pgClient.query('SELECT * FROM "Competitor"');
  await batchWrite(
    db.collection("competitors"),
    comps.map((c) => ({
      id: c.id,
      data: { name: c.name, url: c.url, type: c.type, active: c.active, createdAt: c.createdAt.toISOString() },
    }))
  );
  const { rows: fields } = await pgClient.query('SELECT * FROM "TrackedField"');
  await batchWrite(
    db.collection("competitors"),
    fields.map((f) => ({
      id: `${f.competitorId}/trackedFields/${f.id}`,
      data: { competitorId: f.competitorId, name: f.name, selector: f.selector, createdAt: f.createdAt.toISOString() },
    }))
  );
  const { rows: compSnaps } = await pgClient.query('SELECT * FROM "Snapshot" ORDER BY "createdAt" ASC');
  await batchWrite(
    db.collection("competitors"),
    compSnaps.map((s) => ({
      id: `${s.competitorId}/snapshots/${s.id}`,
      data: { competitorId: s.competitorId, fieldName: s.fieldName, content: s.content, diff: s.diff, diffSummary: s.diffSummary, createdAt: s.createdAt.toISOString() },
    }))
  );
  console.log(`  ✓ ${comps.length} competitors, ${fields.length} fields, ${compSnaps.length} snapshots`);

  await pgClient.end();
  console.log("\n✅ Migration completed!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
