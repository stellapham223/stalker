/**
 * Shared diff counting utilities — SINGLE SOURCE OF TRUTH.
 *
 * Both the Changes API (badges) and Scheduler (Telegram notifications)
 * MUST import from here. Never duplicate this logic.
 *
 * @module diff-utils
 */

// ─── Diff Format Spec ─────────────────────────────────────────────────────────
//
// The system has 7 diff formats. Each scraper produces a different shape.
// When adding a new scraper, use one of these formats or update diffChangeCount().
//
// IMPORTANT: If you change a diff format, you MUST update:
//   1. The scraper that produces it
//   2. diffChangeCount() in this file
//   3. The unit tests in diff-utils.test.js
//   4. The frontend component that renders it

/**
 * Format 1 — Autocomplete diff. Arrays can be null when no changes of that type.
 * @typedef {object} AutocompleteDiff
 * @property {string[]|null} added - New suggestions
 * @property {string[]|null} removed - Removed suggestions
 * @property {{suggestion: string, oldPosition: number, newPosition: number}[]|null} reordered
 */

/**
 * Format 2 — App Listing diff. Each changed field is a key with {old, new} values.
 * @typedef {Object<string, {old: *, new: *}>} AppListingDiff
 * @example { title: { old: "Old", new: "New" }, screenshots: { old: [...], new: [...] } }
 */

/**
 * Format 3 — Menu diff. Arrays can be null when no changes of that type.
 * @typedef {object} MenuDiff
 * @property {{label: string, url: string}[]|null} added
 * @property {{label: string, url: string}[]|null} removed
 * @property {{oldLabel: string, newLabel: string, url: string}[]|null} renamed
 * @property {{parentLabel: string, addedChildren: object[], removedChildren: object[]}[]|null} childrenChanged
 */

/**
 * Format 4 — Guide Docs diff. Same shape as MenuDiff but arrays are NEVER null (always []).
 * @typedef {object} GuideDocsDiff
 * @property {{label: string, url: string}[]} added
 * @property {{label: string, url: string}[]} removed
 * @property {{oldLabel: string, newLabel: string, url: string}[]} renamed
 * @property {{parentLabel: string, addedChildren: object[], removedChildren: object[]}[]} childrenChanged
 */

/**
 * Format 5 — Homepage diff. Has BOTH arrays AND summary counts.
 * CRITICAL: Use addedCount/removedCount for counting, NOT array lengths — avoids double-counting.
 * @typedef {object} HomepageDiff
 * @property {string[]|null} added - Added lines
 * @property {string[]|null} removed - Removed lines
 * @property {number} addedCount - Summary count of additions
 * @property {number} removedCount - Summary count of removals
 */

/**
 * Format 6 — Keyword ranking changes. Stored as TOP-LEVEL snapshot fields, NOT in a `diff` field.
 * Use keywordChangeCount() instead of diffChangeCount() for this format.
 * @typedef {object} KeywordChanges
 * @property {{appName: string, appSlug: string, position: number}[]|null} newEntries
 * @property {{appName: string, appSlug: string, previousPosition: number}[]|null} droppedEntries
 * @property {{appName: string, appSlug: string, oldPosition: number, newPosition: number}[]|null} positionChanges
 */

/**
 * Format 7 — Competitor raw diff string (from `diff` npm package).
 * Lines prefixed with + (added) or - (removed).
 * @typedef {string} CompetitorDiff
 */

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Count the number of changes in a keyword ranking snapshot.
 *
 * Keywords store changes as top-level fields (not in a `diff` field):
 *   - newEntries: apps that appeared in rankings
 *   - droppedEntries: apps that left rankings
 *   - positionChanges: apps that moved position
 *
 * @param {object|null} snap - A keyword snapshot with newEntries, droppedEntries, positionChanges
 * @returns {number} Total number of keyword ranking changes
 */
export function keywordChangeCount(snap) {
  if (!snap) return 0;
  const n = snap.newEntries?.length ?? 0;
  const d = snap.droppedEntries?.length ?? 0;
  const p = snap.positionChanges?.length ?? 0;
  return n + d + p;
}

/**
 * Count the number of changes in a diff object.
 *
 * Handles all non-keyword diff formats:
 *   - Homepage (Format 5): prefers addedCount/removedCount over arrays to avoid double-counting
 *   - Array-based (Formats 1, 3, 4): sums array lengths for added, removed, renamed, reordered, childrenChanged
 *   - Field-based (Format 2 — App Listing): counts {old, new} field pairs; for array fields, counts set diff
 *   - String diffs (Format 7 — Competitor): returns 1 if non-empty string
 *
 * @param {object|string|null} diff - A diff object from any scraper (except keywords)
 * @returns {number} Total number of changes
 */
export function diffChangeCount(diff) {
  if (!diff) return 0;

  // Format 7: Competitor raw string diff
  if (typeof diff === "string") return diff.length > 0 ? 1 : 0;

  let count = 0;

  // Format 5: Homepage — has both added[] and addedCount.
  // Use counts when available to avoid double-counting.
  if (typeof diff.addedCount === "number" || typeof diff.removedCount === "number") {
    count += diff.addedCount ?? 0;
    count += diff.removedCount ?? 0;
  } else {
    // Formats 1, 3, 4: Array-based diffs
    if (Array.isArray(diff.added)) count += diff.added.length;
    if (Array.isArray(diff.removed)) count += diff.removed.length;
  }

  // Shared array fields across Formats 1, 3, 4
  if (Array.isArray(diff.renamed)) count += diff.renamed.length;
  if (Array.isArray(diff.reordered)) count += diff.reordered.length;
  if (Array.isArray(diff.childrenChanged)) count += diff.childrenChanged.length;

  // Format 2: App Listing field-based diffs — { fieldName: { old, new } }
  // Only fall back to this if no array-based changes were found
  if (count === 0) {
    const fieldChanges = Object.entries(diff).filter(
      ([, v]) => v && typeof v === "object" && "old" in v && "new" in v
    );
    for (const [, change] of fieldChanges) {
      if (Array.isArray(change.old) && Array.isArray(change.new)) {
        // For array fields (screenshots, videos, etc.), count set diff
        const oldSet = new Set(change.old.map((x) => JSON.stringify(x)));
        const newSet = new Set(change.new.map((x) => JSON.stringify(x)));
        let delta = 0;
        for (const item of newSet) if (!oldSet.has(item)) delta++;
        for (const item of oldSet) if (!newSet.has(item)) delta++;
        count += delta || 1; // at least 1 if arrays differ
      } else {
        count += 1;
      }
    }
  }

  return count;
}
