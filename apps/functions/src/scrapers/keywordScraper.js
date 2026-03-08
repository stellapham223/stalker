import puppeteer from "puppeteer";

const RANKING_TOP_N = 12;

async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeKeywordRanking(searchUrl) {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await setupPage(browser);
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 60000 });

    await page
      .waitForSelector('[data-controller="app-card"]', { timeout: 15000 })
      .catch(() => {
        console.log("[keyword] App cards not found with primary selector, trying fallback...");
      });

    await sleep(5000);

    const rankings = await page.evaluate((topN) => {
      const results = [];

      const appCards = document.querySelectorAll('[data-controller="app-card"]');

      for (const card of appCards) {
        const handle = card.getAttribute("data-app-card-handle-value") || "";
        const name = card.getAttribute("data-app-card-name-value") || "";

        if (!handle) continue;

        const offerToken = card.getAttribute("data-app-card-offer-token-value") || "";
        const cardText = card.textContent || "";

        const adBadge = card.querySelector('[class*="tw-cursor-help"]');
        const adBadgeText = adBadge?.textContent?.trim() || "";
        const isAdFinal = adBadgeText === "Ad" || offerToken.length > 0;

        if (isAdFinal) continue;

        const ratingMatch = cardText.match(/([\d.]+)\s*\n\s*out of 5 stars/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

        const reviewMatch = cardText.match(/\((\d[\d,]*)\)\s*\n\s*(\d[\d,]*)\s*total reviews/);
        const reviewCount = reviewMatch
          ? parseInt(reviewMatch[2].replace(/,/g, ""), 10)
          : null;

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
            break;
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
    if (browser) await browser.close();
  }
}

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
