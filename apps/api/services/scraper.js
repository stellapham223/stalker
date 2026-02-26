import puppeteer from "puppeteer";

/**
 * Scrape a competitor's tracked fields.
 * @param {object} competitor - Competitor record with trackedFields included
 * @returns {Array<{fieldName: string, content: string}>}
 */
export async function scrapeCompetitor(competitor) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );
    await page.goto(competitor.url, { waitUntil: "networkidle2", timeout: 30000 });

    const results = [];

    for (const field of competitor.trackedFields) {
      try {
        const content = await extractField(page, field, competitor.type);
        results.push({ fieldName: field.name, content });
      } catch (err) {
        console.error(`Failed to scrape field "${field.name}" for ${competitor.name}:`, err.message);
        results.push({ fieldName: field.name, content: null });
      }
    }

    return results;
  } finally {
    await browser.close();
  }
}

/**
 * Extract a single field from a page using its CSS selector.
 */
async function extractField(page, field, competitorType) {
  // For Shopify App Store listings, wait for dynamic content
  if (competitorType === "shopify_app") {
    await page.waitForSelector(field.selector, { timeout: 10000 });
  }

  const content = await page.$eval(field.selector, (el) => el.innerText.trim());
  return content || "";
}
