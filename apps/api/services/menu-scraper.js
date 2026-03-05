import puppeteer from "puppeteer";

async function launchBrowser() {
  return puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
}

async function setupPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
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

/**
 * Scrape the navigation menu from a website.
 * @param {string} url - The website URL
 * @param {string} interactionType - "hover" or "click"
 * @returns {Array} - Nested menu structure [{label, url, children}]
 */
export async function scrapeWebsiteMenu(url, interactionType) {
  const browser = await launchBrowser();

  try {
    const page = await setupPage(browser);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(3000);
    // Extra wait for JS-heavy sites (React, Next.js)
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

    // DOM-based scraping: parse menu structure directly without hover/click
    // All menu content is in the DOM, just hidden via CSS
    const menuData = await page.evaluate(() => {
      const skipPattern = /^(logo|skip|close|toggle|sign|log\s*in|get\s*started|install|try free|start free|book a demo|book demo|open main menu)/i;
      const results = [];
      const seen = new Set();

      function cleanLabel(text) {
        // Strip any HTML tags that might leak into textContent
        let clean = text?.trim().replace(/\s+/g, " ") || "";
        // Remove labels that start with < (leaked HTML)
        if (clean.startsWith("<")) return "";
        // Trim to reasonable length
        return clean.substring(0, 60);
      }

      function extractLinks(container, excludeLabel) {
        const links = [];
        const linkSeen = new Set();
        // Get only direct-ish links (not deeply nested sub-sub-menus)
        for (const a of container.querySelectorAll(":scope a, :scope > li > a")) {
          const label = cleanLabel(a.textContent);
          if (!label || label.length > 60 || linkSeen.has(label)) continue;
          if (label === excludeLabel || skipPattern.test(label)) continue;
          linkSeen.add(label);
          links.push({ label, url: a.getAttribute("href") || null, children: [] });
        }
        return links;
      }

      // Strategy 1: Webflow standard (.w-dropdown + .w-nav-link)
      const wfDropdowns = document.querySelectorAll(".w-dropdown");
      if (wfDropdowns.length > 0) {
        for (const dd of wfDropdowns) {
          const toggle = dd.querySelector(".w-dropdown-toggle");
          const list = dd.querySelector(".w-dropdown-list");
          if (!toggle) continue;
          const textEl = toggle.querySelector(".text-block, span") || toggle;
          const label = cleanLabel(textEl.textContent);
          if (!label || skipPattern.test(label) || seen.has(label)) continue;
          seen.add(label);
          const children = list ? extractLinks(list, label) : [];
          results.push({ label, url: null, children });
        }
        const wfNavLinks = document.querySelectorAll(".w-nav-menu > .w-nav-link");
        for (const link of wfNavLinks) {
          const label = cleanLabel(link.textContent);
          if (!label || skipPattern.test(label) || seen.has(label)) continue;
          seen.add(label);
          results.push({ label, url: link.getAttribute("href") || null, children: [] });
        }
        if (results.length > 0) return results;
      }

      // Strategy 2: Webflow custom (link-block-nav + dropdown-container, e.g. Subi)
      const wfCustomLinks = document.querySelectorAll(".link-block-nav");
      if (wfCustomLinks.length > 0) {
        for (const navEl of wfCustomLinks) {
          const li = navEl.closest("li");
          if (!li) continue;
          // Skip if this li is nested inside another nav li we already processed
          if (li.parentElement?.closest("li")?.querySelector(":scope > .link-block-nav")) continue;
          const rect = navEl.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          // Get label from inner text node (may be in .menu-item-text or .nav-item)
          const textEl = navEl.querySelector(".menu-item-text, .nav-item") || navEl;
          const label = cleanLabel(textEl.textContent);
          if (!label || skipPattern.test(label) || seen.has(label)) continue;
          seen.add(label);

          // Check for dropdown children
          const dropdown = li.querySelector(".dropdown-container");
          const children = dropdown ? extractLinks(dropdown, label) : [];
          const href = navEl.tagName === "A" ? navEl.getAttribute("href") : null;
          results.push({ label, url: href, children });
        }
        if (results.length > 0) return results;
      }

      // Strategy 3: WordPress (li.menu-item) - only in header area
      const allMenuItems = document.querySelectorAll("li.menu-item");
      if (allMenuItems.length > 0) {
        for (const li of allMenuItems) {
          if (li.parentElement?.closest("li.menu-item")) continue;
          // Only include menu items in the top part of the page (not footer)
          const rect = li.getBoundingClientRect();
          if (rect.top > 200) continue;
          // Try a, then button, then any direct child with text
          const link = li.querySelector(":scope > a") || li.querySelector(":scope > button");
          let label = link ? cleanLabel(link.textContent) : "";
          // Fallback: use the first non-generic class name as label (e.g. "platform" from "platform menu-item ...")
          if (!label) {
            const firstClass = li.className.split(" ").find(c => c && c !== "menu-item" && !c.startsWith("menu-item-"));
            if (firstClass) label = firstClass.charAt(0).toUpperCase() + firstClass.slice(1);
          }
          if (!label || skipPattern.test(label) || seen.has(label)) continue;
          seen.add(label);
          const subMenu = li.querySelector(":scope > ul, :scope > div");
          const children = subMenu ? extractLinks(subMenu, label) : [];
          const href = link?.tagName === "A" ? link.getAttribute("href") : null;
          results.push({ label, url: href, children });
        }
        if (results.length > 0) return results;
      }

      // Strategy 4: Standard nav > ul > li with nested ul
      // Expanded container detection: header, nav, [class*='navbar'], [role='navigation']
      const header = document.querySelector("header")
        || document.querySelector("nav")
        || document.querySelector("[class*='navbar']")
        || document.querySelector("[role='navigation']");
      if (!header) {
        // Strategy 5 (global fallback): visible links in top area of page
        const allLinks = document.querySelectorAll("a");
        for (const a of allLinks) {
          const rect = a.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.top > 120) continue;
          const label = cleanLabel(a.textContent);
          if (!label || label.length > 40 || skipPattern.test(label) || seen.has(label)) continue;
          seen.add(label);
          results.push({ label, url: a.getAttribute("href") || null, children: [] });
        }
        return results;
      }

      const navUl = header.querySelector("nav > ul") || header.querySelector("ul");
      if (navUl) {
        for (const li of navUl.querySelectorAll(":scope > li")) {
          const link = li.querySelector(":scope > a, :scope > button, :scope > .link-block-nav");
          if (!link) continue;
          const label = cleanLabel(link.textContent);
          if (!label || skipPattern.test(label) || seen.has(label)) continue;
          seen.add(label);
          const subUl = li.querySelector(":scope > ul, :scope > div > ul, :scope > .dropdown-container");
          const children = subUl ? extractLinks(subUl, label) : [];
          const href = link.tagName === "A" ? link.getAttribute("href") : null;
          results.push({ label, url: href, children });
        }
        if (results.length > 0) return results;
      }

      // Strategy 6: Fallback - visible links in header/nav area
      const navLinks = header.querySelectorAll("a");
      for (const a of navLinks) {
        const rect = a.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.top > 120) continue;
        const label = cleanLabel(a.textContent);
        if (!label || label.length > 40 || skipPattern.test(label) || seen.has(label)) continue;
        seen.add(label);
        results.push({ label, url: a.getAttribute("href") || null, children: [] });
      }

      return results;
    });

    return menuData;
  } finally {
    await browser.close();
  }
}

/**
 * Compare two menu snapshots and detect changes.
 */
export function computeMenuDiff(previousMenu, currentMenu) {
  if (!previousMenu || previousMenu.length === 0) {
    return { diff: null, hasChanges: false };
  }

  const added = [];
  const removed = [];
  const renamed = [];
  const childrenChanged = [];

  const prevMap = new Map(previousMenu.map((m) => [m.label, m]));
  const currMap = new Map(currentMenu.map((m) => [m.label, m]));

  // Added top-level items
  for (const item of currentMenu) {
    if (!prevMap.has(item.label)) {
      const byUrl = item.url && previousMenu.find((p) => p.url === item.url && !currMap.has(p.label));
      if (byUrl) {
        renamed.push({ oldLabel: byUrl.label, newLabel: item.label, url: item.url });
      } else {
        added.push({ label: item.label, url: item.url });
      }
    }
  }

  // Removed top-level items
  for (const item of previousMenu) {
    if (!currMap.has(item.label)) {
      const wasRenamed = renamed.some((r) => r.oldLabel === item.label);
      if (!wasRenamed) {
        removed.push({ label: item.label, url: item.url });
      }
    }
  }

  // Children changes
  for (const item of currentMenu) {
    const prev = prevMap.get(item.label);
    if (!prev) continue;

    const prevChildren = (prev.children || []).map((c) => c.label).sort();
    const currChildren = (item.children || []).map((c) => c.label).sort();

    if (JSON.stringify(prevChildren) !== JSON.stringify(currChildren)) {
      const addedChildren = currChildren.filter((c) => !prevChildren.includes(c));
      const removedChildren = prevChildren.filter((c) => !currChildren.includes(c));
      if (addedChildren.length > 0 || removedChildren.length > 0) {
        childrenChanged.push({ parentLabel: item.label, addedChildren, removedChildren });
      }
    }
  }

  const hasChanges = added.length > 0 || removed.length > 0 || renamed.length > 0 || childrenChanged.length > 0;

  return {
    diff: hasChanges ? {
      added: added.length > 0 ? added : null,
      removed: removed.length > 0 ? removed : null,
      renamed: renamed.length > 0 ? renamed : null,
      childrenChanged: childrenChanged.length > 0 ? childrenChanged : null,
    } : null,
    hasChanges,
  };
}