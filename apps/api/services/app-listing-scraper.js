import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

/**
 * Scrape a single Shopify app listing page using fetch + cheerio.
 * No Puppeteer needed — Shopify app pages are server-side rendered.
 */
export async function scrapeAppListing(appUrl) {
  const res = await fetch(appUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Failed to fetch ${appUrl}: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // 1. Title
  const title = $("h1").first().text().trim();

  // 1b. Subtitle — extracted from <title> tag: "App Name - Subtitle | Shopify App Store"
  const pageTitle = $("title").text().trim();
  const subtitleMatch = pageTitle.match(/^.+?\s*[-–]\s*(.+?)\s*\|\s*Shopify App Store/);
  const subtitle = subtitleMatch ? subtitleMatch[1].trim() : "";

  // 2. Screenshots — dedup by base URL (strip query params) to avoid counting same image at different resolutions
  const screenshotMap = new Map(); // baseUrl → { url, alt }
  $('img[src*="cdn.shopify.com/app-store/listing_images"]').each((_, el) => {
    const url = $(el).attr("src")?.trim();
    const alt = $(el).attr("alt")?.trim() || "";
    if (!url) return;
    const baseUrl = url.split("?")[0];
    if (!screenshotMap.has(baseUrl)) screenshotMap.set(baseUrl, { url: baseUrl, alt });
  });
  const screenshots = [...screenshotMap.values()].filter((s) => s.alt !== title);

  // 3. Videos (deduplicated iframe src)
  const videoSet = new Set();
  $('iframe[src*="youtube"], iframe[src*="vimeo"]').each((_, el) => {
    videoSet.add($(el).attr("src"));
  });
  const videos = [...videoSet];

  // 4. App Details — extract meaningful text lines, normalized to avoid HTML structure noise
  const skipTitles = [
    "Pricing", "Reviews", "Support", "Featured in", "More apps like this",
    "Want to add an app?", "Log in to your Shopify store",
    "This app isn't compatible", "Apps by category", "Featured images gallery",
  ];
  const skipWords = ["Close", "Previous", "Next", "Show features", "Hide features", "more"];
  let appDetails = "";
  $("h2").each((_, el) => {
    if (appDetails) return;
    const heading = $(el).text().trim();
    if (skipTitles.some((s) => heading.startsWith(s))) return;
    if (heading.length < 10) return;

    let container = $(el).closest("section, [class*='tw-container']");
    if (!container.length) container = $(el).parent().parent();

    // Collect all leaf text nodes, normalize each line, deduplicate
    const lines = [];
    const seen = new Set();
    container.find("*").addBack().contents().each((_, node) => {
      if (node.type !== "text") return;
      const line = (node.data || "").replace(/\s+/g, " ").trim();
      if (!line) return;
      if (skipWords.includes(line)) return;
      if (line === heading) return;
      if (line.startsWith("Languages")) return;
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
    });

    appDetails = lines.join("\n").trim();
  });

  // 5. Languages / Works With / Categories — find via tw-grid containers
  const extractGridSection = (label) => {
    let result = "";
    $('[class*="tw-grid"]').each((_, el) => {
      if (result) return;
      const text = $(el).text().trim();
      if (text.startsWith(label)) {
        result = text
          .replace(new RegExp("^" + label + "\\s*"), "")
          .replace(/\s+/g, " ")
          .trim();
      }
    });
    return result;
  };

  const languages = extractGridSection("Languages");
  const worksWith = extractGridSection("Works with");

  // Categories — needs the parent of the grid to get expanded features
  let categories = "";
  $('[class*="tw-grid"]').each((_, el) => {
    if (categories) return;
    const text = $(el).text().trim();
    if (text.startsWith("Categories")) {
      const parent = $(el).parent();
      categories = (parent.text() || text)
        .trim()
        .replace(/^Categories\s*/, "")
        .replace(/Show features/g, "")
        .replace(/Hide features/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  });

  // 6. Pricing — find plan cards
  const pricing = [];
  $('[class*="pricing-plan-card"]').each((_, el) => {
    const card = $(el);
    // Heading = h3 text (includes "$ / month" or "Free")
    const h3 = card.find("h3").first();
    const heading = h3.text().trim().replace(/\s+/g, " ");
    const cardText = card.text().trim().replace(/\s+/g, " ");
    if (heading) pricing.push({ heading, cardText });
  });

  return { title, subtitle, screenshots, videos, appDetails, languages, worksWith, categories, pricing };
}

/**
 * Compare two app listing snapshots field-by-field.
 */
function normalizeForCompare(field, val) {
  if (!Array.isArray(val)) return val;
  if (field === "screenshots") {
    // Sort by URL (strip query params) to ignore CDN reordering
    return [...val].sort((a, b) => {
      const au = (a.url || "").split("?")[0];
      const bu = (b.url || "").split("?")[0];
      return au < bu ? -1 : au > bu ? 1 : 0;
    }).map((s) => ({ url: (s.url || "").split("?")[0], alt: s.alt || "" }));
  }
  return val;
}

export function computeAppListingDiff(previousData, currentData) {
  if (!previousData) return { diff: null, hasChanges: false };

  const changes = {};
  let hasChanges = false;

  const fields = ["title", "subtitle", "screenshots", "videos", "appDetails", "languages", "worksWith", "categories", "pricing"];
  for (const field of fields) {
    const oldVal = previousData[field];
    const newVal = currentData[field];
    if (JSON.stringify(normalizeForCompare(field, oldVal)) !== JSON.stringify(normalizeForCompare(field, newVal))) {
      changes[field] = { old: oldVal ?? null, new: newVal };
      hasChanges = true;
    }
  }

  return { diff: hasChanges ? changes : null, hasChanges };
}
