"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchAppListingDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const FIELD_LABELS = {
  title: "App Title",
  subtitle: "Subtitle",
  screenshots: "Screenshots",
  videos: "Videos",
  appDetails: "App Details",
  languages: "Languages",
  worksWith: "Works With",
  categories: "Categories",
  pricing: "Pricing",
};

export function normalizeScreenshots(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const result = [];
  for (const s of arr) {
    const url = typeof s === "string" ? s.split("?")[0] : (s.url || "").split("?")[0];
    const alt = typeof s === "string" ? "" : (s.alt || "");
    const key = alt || url;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ url, alt });
  }
  return result;
}

export function diffScreenshots(oldArr, newArr) {
  const old = normalizeScreenshots(oldArr);
  const nw = normalizeScreenshots(newArr);
  const getKey = (s) => s.alt || s.url;
  const oldMap = new Map(old.map((s) => [getKey(s), s]));
  const newMap = new Map(nw.map((s) => [getKey(s), s]));
  const added = nw.filter((s) => !oldMap.has(getKey(s)));
  const removed = old.filter((s) => !newMap.has(getKey(s)));
  const captionChanged = nw.filter((s) => oldMap.has(getKey(s)) && oldMap.get(getKey(s)).alt !== s.alt);
  return { added, removed, captionChanged, unchanged: nw.filter((s) => oldMap.has(getKey(s)) && oldMap.get(getKey(s)).alt === s.alt) };
}

function buildSummary(changes) {
  const parts = [];
  for (const c of changes) {
    const label = FIELD_LABELS[c.field] || c.field;
    if (c.field === "screenshots") {
      const { added, removed, captionChanged } = diffScreenshots(c.old, c.new);
      const sub = [];
      if (added.length) sub.push(`+${added.length} new`);
      if (removed.length) sub.push(`-${removed.length} removed`);
      if (captionChanged.length) sub.push(`${captionChanged.length} captions changed`);
      if (sub.length) parts.push(`${label}: ${sub.join(", ")}`);
    } else if (c.field === "pricing") {
      const currMap = new Map((c.new || []).map((p) => [p.heading, p]));
      const prevMap = new Map((c.old || []).map((p) => [p.heading, p]));
      const added = [...currMap.keys()].filter((k) => !prevMap.has(k));
      const removed = [...prevMap.keys()].filter((k) => !currMap.has(k));
      const changed = [...currMap.keys()].filter((k) => prevMap.has(k) && JSON.stringify(currMap.get(k)) !== JSON.stringify(prevMap.get(k)));
      const sub = [];
      if (added.length) sub.push(`added plan "${added[0]}"`);
      if (removed.length) sub.push(`removed plan "${removed[0]}"`);
      if (changed.length) sub.push(`${changed.length} plans changed`);
      if (sub.length) parts.push(`${label}: ${sub.join(", ")}`);
    } else if (c.field === "title") {
      parts.push(`${label}: renamed`);
    } else if (c.field === "appDetails") {
      parts.push(`${label}: content changed`);
    } else {
      parts.push(label);
    }
  }
  return parts.length ? parts.join(" · ") : "";
}

function ChangeItem({ change }) {
  const label = FIELD_LABELS[change.field] || change.field;

  if (change.field === "screenshots") {
    const { added, removed, captionChanged, unchanged } = diffScreenshots(change.old, change.new);
    if (added.length === 0 && removed.length === 0 && captionChanged.length === 0) {
      return (
        <div className="text-xs">
          <span className="font-medium">[{label}]</span>
          <span className="ml-2 text-muted-foreground italic">No changes</span>
        </div>
      );
    }
    return (
      <div className="text-xs">
        <span className="font-medium">[{label}]</span>
        <div className="ml-2 mt-0.5 space-y-0.5">
          {removed.map((s, i) => (
            <div key={`rm-${i}`}><span className="text-diff-remove-foreground">- {s.alt || s.url}</span></div>
          ))}
          {added.map((s, i) => (
            <div key={`add-${i}`}><span className="text-diff-add-foreground">+ {s.alt || s.url}</span></div>
          ))}
          {captionChanged.map((s, i) => {
            const oldCap = normalizeScreenshots(change.old).find((o) => o.url === s.url)?.alt;
            return (
              <div key={`cap-${i}`}>
                <span className="text-diff-remove-foreground line-through">{oldCap}</span>{" "}
                <span className="text-diff-add-foreground">→ {s.alt}</span>
              </div>
            );
          })}
          {unchanged.length > 0 && (
            <div className="text-muted-foreground">{unchanged.length} unchanged</div>
          )}
        </div>
      </div>
    );
  }

  if (change.field === "pricing") {
    const currMap = new Map((change.new || []).map((p) => [p.heading, p]));
    const prevMap = new Map((change.old || []).map((p) => [p.heading, p]));
    return (
      <div className="text-xs">
        <span className="font-medium">[{label}]</span>
        <div className="ml-2 mt-0.5 space-y-0.5">
          {[...prevMap.keys()].filter((k) => !currMap.has(k)).map((k) => (
            <div key={k}><span className="text-diff-remove-foreground">- {k}</span></div>
          ))}
          {[...currMap.keys()].filter((k) => !prevMap.has(k)).map((k) => (
            <div key={k}><span className="text-diff-add-foreground">+ {k}</span></div>
          ))}
          {[...currMap.keys()].filter((k) => prevMap.has(k) && JSON.stringify(currMap.get(k)) !== JSON.stringify(prevMap.get(k))).map((k) => (
            <div key={k}><span className="text-warning">~ {k}</span><span className="text-muted-foreground"> content changed</span></div>
          ))}
        </div>
      </div>
    );
  }

  const oldStr = typeof change.old === "string" ? change.old : JSON.stringify(change.old);
  const newStr = typeof change.new === "string" ? change.new : JSON.stringify(change.new);

  if (change.field === "title") {
    return (
      <div className="text-xs">
        <span className="font-medium">[{label}]</span>
        <span className="ml-2 text-diff-remove-foreground line-through">{oldStr}</span>
        <span className="ml-1 text-diff-add-foreground">→ {newStr}</span>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <span className="font-medium">[{label}]</span>
      <div className="ml-2 mt-0.5">
        <span className="text-diff-remove-foreground">- {oldStr.substring(0, 120)}{oldStr.length > 120 ? "…" : ""}</span>
      </div>
      <div className="ml-2">
        <span className="text-diff-add-foreground">+ {newStr.substring(0, 120)}{newStr.length > 120 ? "…" : ""}</span>
      </div>
    </div>
  );
}

export function DashboardTab() {
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ["app-listing-dashboard"],
    queryFn: fetchAppListingDashboard,
  });

  if (isLoading) return <p>Loading dashboard...</p>;

  if (timeline.length === 0) {
    return (
      <p className="text-muted-foreground">
        No scrape data yet. Run &quot;Scrape All&quot; to start collecting data.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {timeline.map((session, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {new Date(session.createdAt).toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 w-40">App</th>
                  <th className="text-left p-2">Changes</th>
                </tr>
              </thead>
              <tbody>
                {session.rows.map((row) => (
                  <tr key={row.competitorId} className="border-b hover:bg-muted/50 align-top">
                    <td className="p-2 font-medium w-32">{row.name}</td>
                    <td className="p-2">
                      {row.changes === null ? (
                        <span className="text-muted-foreground italic text-xs">Not scraped</span>
                      ) : row.changes.length === 0 ? (
                        <span className="text-muted-foreground italic text-xs">No changes</span>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">{buildSummary(row.changes)}</p>
                          <div className="space-y-1">
                            {row.changes.map((change, i) => (
                              <ChangeItem key={i} change={change} />
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
