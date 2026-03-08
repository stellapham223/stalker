import { describe, expect, test } from "bun:test";
import { diffChangeCount, keywordChangeCount } from "./diff-utils.js";

describe("keywordChangeCount", () => {
  test("returns 0 for null/undefined", () => {
    expect(keywordChangeCount(null)).toBe(0);
    expect(keywordChangeCount(undefined)).toBe(0);
  });

  test("counts newEntries + droppedEntries + positionChanges", () => {
    expect(keywordChangeCount({
      newEntries: [{ appName: "A", position: 1 }, { appName: "B", position: 2 }],
      droppedEntries: [{ appName: "C", previousPosition: 3 }],
      positionChanges: [{ appName: "D", oldPosition: 1, newPosition: 2 }],
    })).toBe(4);
  });

  test("handles null/undefined fields", () => {
    expect(keywordChangeCount({ newEntries: null, droppedEntries: null, positionChanges: null })).toBe(0);
    expect(keywordChangeCount({ newEntries: [{ appName: "A" }] })).toBe(1);
  });

  test("handles empty arrays", () => {
    expect(keywordChangeCount({ newEntries: [], droppedEntries: [], positionChanges: [] })).toBe(0);
  });
});

describe("diffChangeCount", () => {
  test("returns 0 for null/undefined", () => {
    expect(diffChangeCount(null)).toBe(0);
    expect(diffChangeCount(undefined)).toBe(0);
  });

  // Format 1: Autocomplete — { added[], removed[], reordered[] }
  test("Format 1 (Autocomplete): counts added + removed + reordered arrays", () => {
    expect(diffChangeCount({
      added: ["suggestion1", "suggestion2"],
      removed: ["old1"],
      reordered: [{ suggestion: "s", oldPosition: 1, newPosition: 2 }],
    })).toBe(4);
  });

  test("Format 1: handles null arrays", () => {
    expect(diffChangeCount({ added: null, removed: null, reordered: null })).toBe(0);
  });

  // Format 2: App Listing — { fieldName: { old, new } }
  test("Format 2 (App Listing): counts field changes", () => {
    expect(diffChangeCount({
      title: { old: "Old Title", new: "New Title" },
      subtitle: { old: "Old Sub", new: "New Sub" },
    })).toBe(2);
  });

  test("Format 2: counts array field set diff (screenshots)", () => {
    expect(diffChangeCount({
      screenshots: {
        old: [{ url: "a.jpg" }, { url: "b.jpg" }],
        new: [{ url: "b.jpg" }, { url: "c.jpg" }],
      },
    })).toBe(2); // a.jpg removed, c.jpg added
  });

  test("Format 2: array field with identical items returns 1", () => {
    // Arrays differ in JSON but no set diff — should return at least 1
    expect(diffChangeCount({
      screenshots: {
        old: [{ url: "a.jpg", alt: "x" }],
        new: [{ url: "a.jpg", alt: "y" }],
      },
    })).toBe(2); // {url:"a.jpg",alt:"x"} removed, {url:"a.jpg",alt:"y"} added
  });

  // Format 3: Menu — { added[], removed[], renamed[], childrenChanged[] }
  test("Format 3 (Menu): counts all array types", () => {
    expect(diffChangeCount({
      added: [{ label: "New Menu", url: "/new" }],
      removed: [{ label: "Old Menu", url: "/old" }],
      renamed: [{ oldLabel: "Old", newLabel: "New", url: "/path" }],
      childrenChanged: [{ parentLabel: "Parent", addedChildren: [], removedChildren: [] }],
    })).toBe(4);
  });

  // Format 4: Guide Docs — same shape as Menu, but arrays are never null
  test("Format 4 (Guide Docs): handles empty arrays (never null)", () => {
    expect(diffChangeCount({
      added: [],
      removed: [],
      renamed: [],
      childrenChanged: [],
    })).toBe(0);
  });

  test("Format 4 (Guide Docs): counts non-empty arrays", () => {
    expect(diffChangeCount({
      added: [{ label: "New Doc" }],
      removed: [],
      renamed: [{ oldLabel: "A", newLabel: "B" }],
      childrenChanged: [],
    })).toBe(2);
  });

  // Format 5: Homepage — { added[], removed[], addedCount, removedCount }
  // CRITICAL: Must use addedCount/removedCount, NOT array lengths, to avoid double-counting
  test("Format 5 (Homepage): uses addedCount/removedCount, ignores array lengths", () => {
    expect(diffChangeCount({
      added: ["line1", "line2", "line3"],
      removed: ["line4"],
      addedCount: 3,
      removedCount: 1,
    })).toBe(4); // 3 + 1, NOT 3 + 1 + 3 + 1
  });

  test("Format 5: handles zero counts", () => {
    expect(diffChangeCount({
      added: [],
      removed: [],
      addedCount: 0,
      removedCount: 0,
    })).toBe(0);
  });

  test("Format 5: only addedCount present", () => {
    expect(diffChangeCount({
      addedCount: 5,
    })).toBe(5);
  });

  // Format 7: Competitor raw string diff
  test("Format 7 (Competitor): raw string diff returns 1", () => {
    expect(diffChangeCount("+ new line\n- old line")).toBe(1);
  });

  test("Format 7: empty string returns 0", () => {
    expect(diffChangeCount("")).toBe(0);
  });

  // Edge cases
  test("empty object returns 0", () => {
    expect(diffChangeCount({})).toBe(0);
  });

  test("mixed: array-based fields take priority over field-based fallback", () => {
    // If added[] has items, field-based detection (count === 0 check) is skipped
    expect(diffChangeCount({
      added: [{ label: "X" }],
      title: { old: "A", new: "B" }, // should NOT be counted since added[] already counted
    })).toBe(1);
  });
});
