/**
 * Fetch autocomplete suggestions from Shopify App Store.
 * Uses the public API endpoint directly - no Puppeteer needed.
 */
export async function scrapeAutocomplete(query) {
  const url = `https://apps.shopify.com/search/autocomplete?q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Autocomplete API returned ${res.status}`);
  }

  const data = await res.json();

  const suggestions = (data.searches || []).map((s) => s.name);

  const appSuggestions =
    data.apps && data.apps.length > 0
      ? data.apps.map((a) => ({
          appName: a.name,
          appSlug: a.target?.match(/\/([a-z0-9-]+)(?:\?|$)/)?.[1] || null,
        }))
      : null;

  const rawResponse = {
    searches: data.searches || [],
    taxonomy: data.taxonomy || [],
    categoryFeatures: data.category_features || [],
    apps: data.apps || [],
    guides: data.guides || [],
    collections: data.collections || [],
  };

  return { suggestions, appSuggestions, rawResponse };
}

export function computeAutocompleteDiff(previousSuggestions, currentSuggestions) {
  if (!previousSuggestions || previousSuggestions.length === 0) {
    return { diff: null, hasChanges: false };
  }

  const prevSet = new Set(previousSuggestions);
  const currSet = new Set(currentSuggestions);

  const added = currentSuggestions.filter((s) => !prevSet.has(s));
  const removed = previousSuggestions.filter((s) => !currSet.has(s));

  const reordered = [];
  currentSuggestions.forEach((s, newIdx) => {
    const oldIdx = previousSuggestions.indexOf(s);
    if (oldIdx !== -1 && oldIdx !== newIdx) {
      reordered.push({ suggestion: s, oldPosition: oldIdx + 1, newPosition: newIdx + 1 });
    }
  });

  const hasChanges = added.length > 0 || removed.length > 0 || reordered.length > 0;

  return {
    diff: hasChanges
      ? {
          added: added.length > 0 ? added : null,
          removed: removed.length > 0 ? removed : null,
          reordered: reordered.length > 0 ? reordered : null,
        }
      : null,
    hasChanges,
  };
}
