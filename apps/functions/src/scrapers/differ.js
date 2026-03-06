import { diffLines } from "diff";

export function computeDiff(previousContent, newContent) {
  if (!previousContent) {
    return { diff: null, diffSummary: null, hasChanges: false };
  }

  if (previousContent === newContent) {
    return { diff: null, diffSummary: null, hasChanges: false };
  }

  const changes = diffLines(previousContent, newContent);

  const added = changes.filter((c) => c.added).length;
  const removed = changes.filter((c) => c.removed).length;

  const diff = changes
    .map((part) => {
      const prefix = part.added ? "+ " : part.removed ? "- " : "  ";
      return part.value
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => `${prefix}${line}`)
        .join("\n");
    })
    .join("\n");

  const diffSummary = `${added} section(s) added, ${removed} section(s) removed`;

  return { diff, diffSummary, hasChanges: true };
}
