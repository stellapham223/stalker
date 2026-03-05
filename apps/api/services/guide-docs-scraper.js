import puppeteer from "puppeteer";

async function launchBrowser() {
  return puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
}

/**
 * Scrape the navigation/sidebar structure of a guide/docs page.
 * Returns [{label, url, children:[{label, url}]}]
 */
export async function scrapeGuideDocs(url) {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait a bit for any JS rendering
    await new Promise((r) => setTimeout(r, 2000));

    const navData = await page.evaluate(() => {
      // ── Strategy 1: Intercom Help Center ──
      // Collections page: each collection has a title + optional articles
      const intercomCollections = document.querySelectorAll(
        "[data-testid='collection-list-item'], .collection-item, .paper.collection"
      );
      if (intercomCollections.length > 0) {
        const items = [];
        intercomCollections.forEach((el) => {
          const link = el.querySelector("a");
          const label = link?.textContent?.trim() || el.textContent?.trim();
          const href = link?.href || "";
          if (label && label.length > 1) {
            items.push({ label, url: href, children: [] });
          }
        });
        if (items.length > 0) return items;
      }

      // ── Strategy 2: Intercom article list (within a collection) ──
      const intercomArticles = document.querySelectorAll(
        ".article-list a, [data-testid='article-list-item'] a"
      );
      if (intercomArticles.length > 0) {
        const items = [];
        intercomArticles.forEach((el) => {
          const label = el.textContent?.trim();
          const href = el.href || "";
          if (label && label.length > 1) {
            items.push({ label, url: href, children: [] });
          }
        });
        if (items.length > 0) return items;
      }

      // ── Strategy 3: Helpscout / Beacon docs ──
      const hsCategories = document.querySelectorAll(
        ".category-list-item, .hs-category, [class*='CategoryList'] li"
      );
      if (hsCategories.length > 0) {
        const items = [];
        hsCategories.forEach((el) => {
          const link = el.querySelector("a");
          const label = link?.textContent?.trim() || el.textContent?.trim();
          const href = link?.href || "";
          if (label && label.length > 1) {
            items.push({ label, url: href, children: [] });
          }
        });
        if (items.length > 0) return items;
      }

      // ── Strategy 4: Generic sidebar/nav with nested structure ──
      const sidebars = document.querySelectorAll(
        "aside nav, .sidebar nav, [class*='sidebar'] nav, nav[class*='sidebar'], [class*='toc'], [class*='table-of-contents']"
      );
      for (const sidebar of sidebars) {
        const topItems = sidebar.querySelectorAll(":scope > ul > li, :scope > ol > li");
        if (topItems.length > 2) {
          const items = [];
          topItems.forEach((li) => {
            const link = li.querySelector(":scope > a");
            const label = link?.textContent?.trim() || li.firstChild?.textContent?.trim() || "";
            const href = link?.href || "";
            const children = [];
            li.querySelectorAll(":scope > ul > li > a, :scope > ol > li > a").forEach((child) => {
              const childLabel = child.textContent?.trim();
              if (childLabel && childLabel.length > 1) {
                children.push({ label: childLabel, url: child.href || "" });
              }
            });
            if (label && label.length > 1) {
              items.push({ label, url: href, children });
            }
          });
          if (items.length > 2) return items;
        }
      }

      // ── Strategy 5: Any nav with enough links ──
      const navs = document.querySelectorAll("nav, aside");
      for (const nav of navs) {
        const links = nav.querySelectorAll("a");
        if (links.length > 5) {
          const items = [];
          const seen = new Set();
          links.forEach((a) => {
            const label = a.textContent?.trim();
            if (!label || label.length < 2 || seen.has(label)) return;
            seen.add(label);
            items.push({ label, url: a.href || "", children: [] });
          });
          if (items.length > 5) return items;
        }
      }

      // ── Fallback: all links in the page that look like doc links ──
      const allLinks = document.querySelectorAll("a[href]");
      const baseOrigin = window.location.origin;
      const items = [];
      const seen = new Set();
      allLinks.forEach((a) => {
        const label = a.textContent?.trim();
        const href = a.href || "";
        if (!label || label.length < 2 || seen.has(label)) return;
        if (!href.startsWith(baseOrigin) && !href.startsWith("https://")) return;
        seen.add(label);
        items.push({ label, url: href, children: [] });
      });
      return items.slice(0, 50); // cap at 50
    });

    return navData || [];
  } finally {
    await browser.close();
  }
}

/**
 * Compare two navData arrays to detect structural changes.
 */
export function computeGuideDocsDiff(previousNav, currentNav) {
  if (!previousNav) return { diff: null, hasChanges: false };

  const prevMap = new Map(previousNav.map((item) => [item.label, item]));
  const currMap = new Map(currentNav.map((item) => [item.label, item]));

  // Added and removed (by label)
  const added = currentNav.filter((item) => !prevMap.has(item.label));
  const removed = previousNav.filter((item) => !currMap.has(item.label));

  // Renamed: same URL, different label
  const prevByUrl = new Map(previousNav.map((item) => [item.url, item]));
  const renamed = [];
  for (const curr of currentNav) {
    const prevByUrlMatch = prevByUrl.get(curr.url);
    if (prevByUrlMatch && prevByUrlMatch.label !== curr.label && !prevMap.has(curr.label)) {
      renamed.push({ oldLabel: prevByUrlMatch.label, newLabel: curr.label, url: curr.url });
    }
  }

  // Children changed: for sections present in both
  const childrenChanged = [];
  for (const curr of currentNav) {
    const prev = prevMap.get(curr.label);
    if (!prev) continue;
    const prevChildren = prev.children || [];
    const currChildren = curr.children || [];
    const prevChildLabels = new Set(prevChildren.map((c) => c.label));
    const currChildLabels = new Set(currChildren.map((c) => c.label));
    const addedChildren = currChildren.filter((c) => !prevChildLabels.has(c.label)).map((c) => c.label);
    const removedChildren = prevChildren.filter((c) => !currChildLabels.has(c.label)).map((c) => c.label);
    if (addedChildren.length > 0 || removedChildren.length > 0) {
      childrenChanged.push({ parentLabel: curr.label, addedChildren, removedChildren });
    }
  }

  const hasChanges = added.length > 0 || removed.length > 0 || renamed.length > 0 || childrenChanged.length > 0;

  if (!hasChanges) return { diff: null, hasChanges: false };

  return {
    diff: { added, removed, renamed, childrenChanged },
    hasChanges: true,
  };
}
