import puppeteer from "puppeteer";

export async function scrapeCompetitor(competitor) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );
    await page.goto(competitor.url, { waitUntil: "networkidle2", timeout: 30000 });

    const results = [];

    for (const field of competitor.trackedFields || []) {
      try {
        if (competitor.type === "shopify_app") {
          await page.waitForSelector(field.selector, { timeout: 10000 });
        }
        const content = await page.$eval(field.selector, (el) => el.innerText.trim());
        results.push({ fieldName: field.name, content: content || "" });
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
