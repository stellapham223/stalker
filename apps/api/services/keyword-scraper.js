import puppeteer from "puppeteer";
import { RANKING_TOP_N } from "@competitor-stalker/shared/constants.js";

/**
 * Launch a stealth browser to avoid bot detection.
 */
async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  return browser;
}

async function setupPage(browser) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  );
  return page;
}

/**
 * Scrape top N organic (non-ad) results from a Shopify App Store search.
 * Uses data-controller="app-card" elements with data attributes.
 */
export async function scrapeKeywordRanking(searchUrl) {
  const browser = await launchBrowser();

  try {
    const page = await setupPage(browser);
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for real app cards to render (Shopify uses data-controller="app-card")
    await page
      .waitForSelector('[data-controller="app-card"]', { timeout: 15000 })
      .catch(() => {
        console.log("[keyword] App cards not found with primary selector, trying fallback...");
      });

    await sleep(5000);

    const rankings = await page.evaluate((topN) => {
      const results = [];

      // Primary strategy: Shopify App Store uses data-controller="app-card" with data attributes
      const appCards = document.querySelectorAll('[data-controller="app-card"]');

      for (const card of appCards) {
        const handle = card.getAttribute("data-app-card-handle-value") || "";
        const name = card.getAttribute("data-app-card-name-value") || "";
        const appLink = card.getAttribute("data-app-card-app-link-value") || "";

        if (!handle) continue;

        // Check if ad: ads have "offer-token" in the link or an Ad badge in the card
        const offerToken = card.getAttribute("data-app-card-offer-token-value") || "";
        const cardText = card.textContent || "";
        const isAd = offerToken.length > 0 || /\bAd\b/.test(cardText.split("\n").map(l => l.trim()).filter(l => l === "Ad").length > 0 ? "Ad" : "");

        // More reliable ad check: look for the Ad badge element
        const adBadge = card.querySelector('[class*="tw-cursor-help"]');
        const adBadgeText = adBadge?.textContent?.trim() || "";
        const isAdFinal = adBadgeText === "Ad" || offerToken.length > 0;

        if (isAdFinal) continue;

        // Extract rating from text content
        const ratingMatch = cardText.match(/([\d.]+)\s*\n\s*out of 5 stars/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

        // Extract review count
        const reviewMatch = cardText.match(/\((\d[\d,]*)\)\s*\n\s*(\d[\d,]*)\s*total reviews/);
        const reviewCount = reviewMatch
          ? parseInt(reviewMatch[2].replace(/,/g, ""), 10)
          : null;

        // Extract pricing
        const pricingPatterns = [
          /Free plan available/i,
          /Free to install/i,
          /Free trial available/i,
          /Free$/m,
          /\$[\d,.]+\/month/i,
          /From \$[\d,.]+\/month/i,
        ];
        let pricingLabel = "";
        for (const pattern of pricingPatterns) {
          const match = cardText.match(pattern);
          if (match) {
            pricingLabel = match[0];
            break;
          }
        }

        // Extract description (tagline) — it's the first meaningful line
        // after pricing info and before "Built for Shopify"
        const lines = cardText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        let description = "";
        for (const line of lines) {
          if (
            line !== name &&
            line !== "Ad" &&
            line !== "Built for Shopify" &&
            !line.match(/out of 5 stars/) &&
            !line.match(/total reviews/) &&
            !line.match(/^[\d.]+$/) &&
            !line.match(/^\(\d/) &&
            !line.match(/^•$/) &&
            !line.match(/^Meets our highest/) &&
            !line.match(/Learn more/) &&
            !line.match(/Opens in new window/) &&
            !pricingPatterns.some(p => p.test(line)) &&
            line.length > 10
          ) {
            description = line;
            break; // take the first match — that's the tagline
          }
        }

        results.push({
          position: results.length + 1,
          appName: name,
          appSlug: handle,
          appUrl: `https://apps.shopify.com/${handle}`,
          developer: "",
          rating,
          reviewCount,
          pricingLabel,
          description,
        });

        if (results.length >= topN) break;
      }

      return results;
    }, RANKING_TOP_N);

    return rankings;
  } finally {
    await browser.close();
  }
}

/**
 * Compare two ranking snapshots and detect changes.
 */
export function computeRankingDiff(previousRankings, currentRankings) {
  if (!previousRankings || previousRankings.length === 0) {
    return { newEntries: null, droppedEntries: null, positionChanges: null, hasChanges: false };
  }

  const prevMap = new Map(previousRankings.map((r) => [r.appSlug, r]));
  const currMap = new Map(currentRankings.map((r) => [r.appSlug, r]));

  const newEntries = currentRankings
    .filter((r) => !prevMap.has(r.appSlug))
    .map((r) => ({ appName: r.appName, appSlug: r.appSlug, position: r.position }));

  const droppedEntries = previousRankings
    .filter((r) => !currMap.has(r.appSlug))
    .map((r) => ({ appName: r.appName, appSlug: r.appSlug, previousPosition: r.position }));

  const positionChanges = currentRankings
    .filter((r) => prevMap.has(r.appSlug) && prevMap.get(r.appSlug).position !== r.position)
    .map((r) => ({
      appName: r.appName,
      appSlug: r.appSlug,
      oldPosition: prevMap.get(r.appSlug).position,
      newPosition: r.position,
    }));

  const hasChanges = newEntries.length > 0 || droppedEntries.length > 0 || positionChanges.length > 0;

  return {
    newEntries: newEntries.length > 0 ? newEntries : null,
    droppedEntries: droppedEntries.length > 0 ? droppedEntries : null,
    positionChanges: positionChanges.length > 0 ? positionChanges : null,
    hasChanges,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
