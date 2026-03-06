import puppeteer from "puppeteer";

async function launchBrowser() {
  return puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  });
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

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
      setTimeout(() => { clearInterval(timer); resolve(); }, 15000);
    });
  });
}

export async function scrapeHomepageContent(url) {
  const browser = await launchBrowser();

  try {
    const page = await setupPage(browser);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(2000);
    await autoScroll(page);
    await sleep(2000);

    const result = await page.evaluate(() => {
      const removeSelectors = [
        "header", "footer", "nav",
        "#header", "#footer", ".header", ".footer",
        "[role='banner']", "[role='contentinfo']", "[role='navigation']",
        "[class*='cookie']", "[class*='Cookie']",
        "[class*='chat-widget']", "[class*='chatWidget']",
        "[id*='intercom']", "[id*='hubspot']", "[id*='drift']",
        "[class*='popup']", "[class*='modal']",
      ];
      for (const sel of removeSelectors) {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      }

      const sections = [];
      const sectionEls = document.querySelectorAll("section, [class*='section'], main > div");

      if (sectionEls.length > 0) {
        let order = 0;
        for (const sec of sectionEls) {
          const heading = sec.querySelector("h1, h2, h3");
          const headingText = heading?.textContent?.trim().replace(/\s+/g, " ") || "";
          const paragraphs = [...sec.querySelectorAll("p, li")]
            .map((p) => p.textContent?.trim().replace(/\s+/g, " "))
            .filter((t) => t && t.length > 5);
          const ctas = [...sec.querySelectorAll("a[class*='btn'], a[class*='button'], button[class*='btn'], button[class*='button'], a[class*='cta'], a[class*='Btn'], a[class*='Button']")]
            .map((b) => b.textContent?.trim().replace(/\s+/g, " "))
            .filter((t) => t && t.length > 1 && t.length < 50);
          const content = paragraphs.join("\n");
          if (!headingText && !content) continue;
          sections.push({
            heading: headingText,
            content,
            ctaText: ctas.length > 0 ? ctas : null,
            order: order++,
          });
        }
      }

      if (sections.length === 0) {
        const headings = document.querySelectorAll("h1, h2, h3, h4");
        let order = 0;
        for (const h of headings) {
          const headingText = h.textContent?.trim().replace(/\s+/g, " ");
          if (!headingText) continue;
          const contentParts = [];
          let sibling = h.nextElementSibling;
          while (sibling && !sibling.matches("h1, h2, h3, h4")) {
            const text = sibling.textContent?.trim().replace(/\s+/g, " ");
            if (text && text.length > 5) contentParts.push(text);
            sibling = sibling.nextElementSibling;
          }
          sections.push({
            heading: headingText,
            content: contentParts.join("\n"),
            ctaText: null,
            order: order++,
          });
        }
      }

      const bodyText = document.body.textContent || "";
      const statsRegex = /[\d,]+[+]?\s*(?:merchants|stores|brands|reviews|stars|subscribers|customers|users|downloads|apps|integrations|countries|years|updates|renewals|orders|revenue|satisfaction|conversion|retention|growth|processed|monthly|daily|active)/gi;
      const statsMatches = bodyText.match(statsRegex) || [];
      const stats = [...new Set(statsMatches.map((s) => s.trim()))];

      const testimonials = [];
      const quoteEls = document.querySelectorAll("blockquote, [class*='testimonial'], [class*='quote'], [class*='review']");
      for (const q of quoteEls) {
        const text = q.textContent?.trim().replace(/\s+/g, " ");
        if (text && text.length > 20 && text.length < 500) {
          testimonials.push(text);
        }
      }

      const fullText = sections.map((s) => {
        let text = "";
        if (s.heading) text += s.heading + "\n";
        if (s.content) text += s.content + "\n";
        if (s.ctaText) text += s.ctaText.join(" | ") + "\n";
        return text;
      }).join("\n---\n");

      return {
        sections,
        stats: stats.length > 0 ? stats : null,
        testimonials: testimonials.length > 0 ? testimonials : null,
        fullText: fullText || bodyText.substring(0, 10000).trim(),
      };
    });

    return result;
  } finally {
    await browser.close();
  }
}

export function computeHomepageDiff(previousFullText, currentFullText) {
  if (!previousFullText) {
    return { diff: null, hasChanges: false };
  }

  if (previousFullText === currentFullText) {
    return { diff: null, hasChanges: false };
  }

  const prevLines = previousFullText.split("\n").filter((l) => l.trim());
  const currLines = currentFullText.split("\n").filter((l) => l.trim());

  const prevSet = new Set(prevLines);
  const currSet = new Set(currLines);

  const added = currLines.filter((l) => !prevSet.has(l));
  const removed = prevLines.filter((l) => !currSet.has(l));

  const hasChanges = added.length > 0 || removed.length > 0;

  return {
    diff: hasChanges ? {
      added: added.length > 0 ? added : null,
      removed: removed.length > 0 ? removed : null,
      addedCount: added.length,
      removedCount: removed.length,
    } : null,
    hasChanges,
  };
}
