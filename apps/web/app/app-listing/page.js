"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchAppListingCompetitors,
  createAppListingCompetitor,
  deleteAppListingCompetitor,
  fetchAppListingSnapshots,
  triggerAppListingScrape,
  triggerAppListingScrapeAll,
  fetchAppListingDashboard,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_TAB = "__dashboard__";

export default function AppListingPage() {
  const queryClient = useQueryClient();
  const { getBadge, markSeen } = useChangesBadge();
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", appUrl: "" });

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ["app-listing-competitors"],
    queryFn: fetchAppListingCompetitors,
  });

  const createMutation = useMutation({
    mutationFn: createAppListingCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-listing-competitors"] });
      setShowForm(false);
      setFormData({ name: "", appUrl: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppListingCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-listing-competitors"] });
      setActiveTab(DASHBOARD_TAB);
    },
  });

  const scrapeAllMutation = useMutation({
    mutationFn: triggerAppListingScrapeAll,
    onSuccess: () => {
      // Jobs run async — poll until new snapshots appear (check every 3s, up to 30s)
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["app-listing-snapshots"] });
        queryClient.invalidateQueries({ queryKey: ["app-listing-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">App Listing</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => scrapeAllMutation.mutate()}
            disabled={scrapeAllMutation.isPending}
          >
            {scrapeAllMutation.isPending ? "Scraping..." : "Scrape All"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Competitor"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="flex gap-4"
            >
              <input
                type="text"
                placeholder="App name (e.g. Appstle)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-md border border-input px-3 py-2 w-48"
                required
              />
              <input
                type="url"
                placeholder="https://apps.shopify.com/..."
                value={formData.appUrl}
                onChange={(e) => setFormData({ ...formData, appUrl: e.target.value })}
                className="flex-1 rounded-md border border-input px-3 py-2"
                required
              />
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {/* Dashboard tab always first */}
        <button
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === DASHBOARD_TAB
              ? "border-amber-500 text-amber-700 bg-amber-50"
              : "border-transparent text-muted-foreground hover:text-amber-600 hover:border-amber-300"
          }`}
          onClick={() => setActiveTab(DASHBOARD_TAB)}
        >
          Dashboard
        </button>

        {competitors.map((c) => (
          <TabButton
            key={c.id}
            competitor={c}
            isActive={activeTab === c.id}
            onClick={() => { setActiveTab(c.id); markSeen("appListing", c.id); }}
            badge={getBadge("appListing", c.id)}
            onDelete={() => {
              if (confirm(`Delete "${c.name}"?`)) {
                deleteMutation.mutate(c.id);
              }
            }}
          />
        ))}
      </div>

      {/* Tab content */}
      {activeTab === DASHBOARD_TAB ? (
        <DashboardTab />
      ) : (
        <CompetitorDetail
          key={activeTab}
          competitorId={activeTab}
          competitorName={competitors.find((c) => c.id === activeTab)?.name}
        />
      )}
    </div>
  );
}

function TabButton({ competitor, isActive, onClick, onDelete, badge }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className={`relative px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
        isActive
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {competitor.name}
      {badge > 0 && (
        <span className="ml-1 rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white leading-none">
          {badge}
        </span>
      )}
      {hovered && (
        <span
          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          x
        </span>
      )}
    </button>
  );
}

function DashboardTab() {
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
              {new Date(session.createdAt).toLocaleString("vi-VN", {
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

const FIELD_LABELS = {
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

// Normalize screenshots to { url, alt } — strips query params, dedup by alt (non-empty) then url
function normalizeScreenshots(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const result = [];
  for (const s of arr) {
    const url = typeof s === "string" ? s.split("?")[0] : (s.url || "").split("?")[0];
    const alt = typeof s === "string" ? "" : (s.alt || "");
    // Dedup key: prefer alt text if non-empty, otherwise url
    const key = alt || url;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ url, alt });
  }
  return result;
}

// Compute screenshot diff: added, removed, caption changed
function diffScreenshots(oldArr, newArr) {
  const old = normalizeScreenshots(oldArr);
  const nw = normalizeScreenshots(newArr);
  // Match by alt text (non-empty) first, then fall back to url
  const getKey = (s) => s.alt || s.url;
  const oldMap = new Map(old.map((s) => [getKey(s), s]));
  const newMap = new Map(nw.map((s) => [getKey(s), s]));
  const added = nw.filter((s) => !oldMap.has(getKey(s)));
  const removed = old.filter((s) => !newMap.has(getKey(s)));
  const captionChanged = nw.filter((s) => oldMap.has(getKey(s)) && oldMap.get(getKey(s)).alt !== s.alt);
  return { added, removed, captionChanged, unchanged: nw.filter((s) => oldMap.has(getKey(s)) && oldMap.get(getKey(s)).alt === s.alt) };
}

// Build a one-line summary of all changes for an app
function buildSummary(changes) {
  const parts = [];
  for (const c of changes) {
    const label = FIELD_LABELS[c.field] || c.field;
    if (c.field === "screenshots") {
      const { added, removed, captionChanged } = diffScreenshots(c.old, c.new);
      const sub = [];
      if (added.length) sub.push(`+${added.length} ảnh mới`);
      if (removed.length) sub.push(`-${removed.length} ảnh cũ`);
      if (captionChanged.length) sub.push(`${captionChanged.length} caption đổi`);
      if (sub.length) parts.push(`${label}: ${sub.join(", ")}`);
    } else if (c.field === "pricing") {
      const currMap = new Map((c.new || []).map((p) => [p.heading, p]));
      const prevMap = new Map((c.old || []).map((p) => [p.heading, p]));
      const added = [...currMap.keys()].filter((k) => !prevMap.has(k));
      const removed = [...prevMap.keys()].filter((k) => !currMap.has(k));
      const changed = [...currMap.keys()].filter((k) => prevMap.has(k) && JSON.stringify(currMap.get(k)) !== JSON.stringify(prevMap.get(k)));
      const sub = [];
      if (added.length) sub.push(`thêm plan "${added[0]}"`);
      if (removed.length) sub.push(`xóa plan "${removed[0]}"`);
      if (changed.length) sub.push(`${changed.length} plan thay đổi nội dung`);
      if (sub.length) parts.push(`${label}: ${sub.join(", ")}`);
    } else if (c.field === "title") {
      parts.push(`${label}: đổi tên`);
    } else if (c.field === "appDetails") {
      parts.push(`${label}: nội dung thay đổi`);
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
            <div key={`rm-${i}`}><span className="text-red-500">- {s.alt || s.url}</span></div>
          ))}
          {added.map((s, i) => (
            <div key={`add-${i}`}><span className="text-green-600">+ {s.alt || s.url}</span></div>
          ))}
          {captionChanged.map((s, i) => {
            const oldCap = normalizeScreenshots(change.old).find((o) => o.url === s.url)?.alt;
            return (
              <div key={`cap-${i}`}>
                <span className="text-red-500 line-through">{oldCap}</span>{" "}
                <span className="text-green-600">→ {s.alt}</span>
              </div>
            );
          })}
          {unchanged.length > 0 && (
            <div className="text-muted-foreground">{unchanged.length} ảnh không đổi</div>
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
            <div key={k}><span className="text-red-500">- {k}</span></div>
          ))}
          {[...currMap.keys()].filter((k) => !prevMap.has(k)).map((k) => (
            <div key={k}><span className="text-green-600">+ {k}</span></div>
          ))}
          {[...currMap.keys()].filter((k) => prevMap.has(k) && JSON.stringify(currMap.get(k)) !== JSON.stringify(prevMap.get(k))).map((k) => (
            <div key={k}><span className="text-yellow-600">~ {k}</span><span className="text-muted-foreground"> nội dung thay đổi</span></div>
          ))}
        </div>
      </div>
    );
  }

  // Text fields (title, appDetails, languages, etc.)
  const oldStr = typeof change.old === "string" ? change.old : JSON.stringify(change.old);
  const newStr = typeof change.new === "string" ? change.new : JSON.stringify(change.new);

  // Find changed words for inline highlight
  if (change.field === "title") {
    return (
      <div className="text-xs">
        <span className="font-medium">[{label}]</span>
        <span className="ml-2 text-red-500 line-through">{oldStr}</span>
        <span className="ml-1 text-green-600">→ {newStr}</span>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <span className="font-medium">[{label}]</span>
      <div className="ml-2 mt-0.5">
        <span className="text-red-500">- {oldStr.substring(0, 120)}{oldStr.length > 120 ? "…" : ""}</span>
      </div>
      <div className="ml-2">
        <span className="text-green-600">+ {newStr.substring(0, 120)}{newStr.length > 120 ? "…" : ""}</span>
      </div>
    </div>
  );
}

function CompetitorDetail({ competitorId, competitorName }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["app-listing-snapshots", competitorId],
    queryFn: () => fetchAppListingSnapshots(competitorId, 2),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerAppListingScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["app-listing-snapshots", competitorId] });
        queryClient.invalidateQueries({ queryKey: ["app-listing-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const latest = snapshots[0] || null;
  const previous = snapshots[1] || null;
  const data = latest?.data || {};
  const prevData = previous?.data || {};

  const FIELDS = [
    { key: "title", label: "App Title" },
    { key: "subtitle", label: "Subtitle" },
    { key: "screenshots", label: "Feature Screenshots" },
    { key: "videos", label: "Videos" },
    { key: "appDetails", label: "App Details" },
    { key: "languages", label: "Languages" },
    { key: "worksWith", label: "Works With" },
    { key: "categories", label: "Categories" },
    { key: "pricing", label: "Pricing" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{competitorName}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrapeMutation.mutate(competitorId)}
            disabled={scrapeMutation.isPending}
          >
            {scrapeMutation.isPending ? "Scraping..." : "Scrape Now"}
          </Button>
        </div>
        {latest?.createdAt && (
          <p className="text-sm text-muted-foreground">
            Last scraped: {new Date(latest.createdAt).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading snapshots...</p>
        ) : !latest ? (
          <p className="text-muted-foreground">
            No data yet. Click &quot;Scrape Now&quot; to fetch the app listing.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 w-40">App Info</th>
                  <th className="text-left p-2">Detail</th>
                  <th className="text-left p-2 w-72">Changes</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((field) => (
                  <FieldRow
                    key={field.key}
                    label={field.label}
                    current={data[field.key]}
                    prev={prevData[field.key]}
                    hasPrevious={!!previous}
                    fieldKey={field.key}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, current, prev, hasPrevious, fieldKey }) {
  const isArray = Array.isArray(current);
  const isPricing = fieldKey === "pricing";
  const isScreenshots = fieldKey === "screenshots";

  const formatValue = (val) => {
    if (val === null || val === undefined) return "-";
    if (isPricing && Array.isArray(val)) {
      return val.map((p, i) => (
        <div key={i} className="mb-1">
          <span className="font-medium">{p.heading}</span>
          {p.cardText && <span className="ml-1 text-muted-foreground text-xs">- {p.cardText.substring(0, 120)}</span>}
        </div>
      ));
    }
    if (isScreenshots && Array.isArray(val)) {
      return val.length > 0
        ? val.map((s, i) => (
            <div key={i} className="text-xs">
              {i + 1}. {typeof s === "string" ? s : (s.alt || <span className="text-muted-foreground italic">no caption</span>)}
            </div>
          ))
        : "-";
    }
    if (isArray) {
      return val.length > 0 ? val.join(", ") : "-";
    }
    if (typeof val === "string") return val || "-";
    return JSON.stringify(val);
  };

  const computeChanges = () => {
    if (!hasPrevious) return <span className="text-muted-foreground">-</span>;
    if (prev === null || prev === undefined) {
      return <span className="text-muted-foreground">Initial scrape</span>;
    }

    const currStr = JSON.stringify(current);
    const prevStr = JSON.stringify(prev);

    if (currStr === prevStr) {
      return <span className="text-muted-foreground italic">No changes</span>;
    }

    if (Array.isArray(current) && Array.isArray(prev)) {
      if (isPricing) {
        return <PricingDiff current={current} prev={prev} />;
      }
      if (isScreenshots) {
        return <ScreenshotsDiff current={current} prev={prev} />;
      }
      const currSet = new Set(current);
      const prevSet = new Set(prev);
      const added = current.filter((x) => !prevSet.has(x));
      const removed = prev.filter((x) => !currSet.has(x));
      return (
        <div className="space-y-0.5">
          {added.map((x, i) => (
            <div key={`a-${i}`} className="text-green-600 text-xs">+ {x}</div>
          ))}
          {removed.map((x, i) => (
            <div key={`r-${i}`} className="text-red-600 text-xs">- {x}</div>
          ))}
          {added.length === 0 && removed.length === 0 && (
            <span className="text-yellow-600 text-xs">Order changed</span>
          )}
        </div>
      );
    }

    return (
      <div className="text-xs">
        <span className="text-red-600">Was: {typeof prev === "string" ? prev : JSON.stringify(prev)}</span>
      </div>
    );
  };

  return (
    <tr className="border-b hover:bg-muted/50 align-top">
      <td className="p-2 font-medium text-muted-foreground">{label}</td>
      <td className="p-2">{formatValue(current)}</td>
      <td className="p-2">{computeChanges()}</td>
    </tr>
  );
}

function ScreenshotsDiff({ current, prev }) {
  const { added, removed, captionChanged, unchanged } = diffScreenshots(prev, current);
  if (added.length === 0 && removed.length === 0 && captionChanged.length === 0) {
    return <span className="text-muted-foreground italic">No changes</span>;
  }
  return (
    <div className="space-y-0.5 text-xs">
      {removed.map((s, i) => <div key={`rm-${i}`}><span className="text-red-500">- {s.alt || s.url}</span></div>)}
      {added.map((s, i) => <div key={`add-${i}`}><span className="text-green-600">+ {s.alt || s.url}</span></div>)}
      {captionChanged.map((s, i) => {
        const oldCap = normalizeScreenshots(prev).find((o) => o.url === s.url)?.alt;
        return <div key={`cap-${i}`}><span className="text-red-500 line-through">{oldCap}</span>{" "}<span className="text-green-600">→ {s.alt}</span></div>;
      })}
      {unchanged.length > 0 && <div className="text-muted-foreground">{unchanged.length} ảnh không đổi</div>}
    </div>
  );
}

function PricingDiff({ current, prev }) {
  const changes = [];

  const currMap = new Map(current.map((p) => [p.heading, p]));
  const prevMap = new Map(prev.map((p) => [p.heading, p]));

  for (const [name, plan] of currMap) {
    const old = prevMap.get(name);
    if (!old) {
      changes.push(
        <div key={`new-${name}`} className="text-green-600 text-xs">
          + New plan: {name}
        </div>
      );
    } else if (JSON.stringify(plan) !== JSON.stringify(old)) {
      changes.push(
        <div key={`chg-${name}`} className="text-yellow-600 text-xs">
          ~ {name}: content changed
        </div>
      );
    }
  }

  for (const [name] of prevMap) {
    if (!currMap.has(name)) {
      changes.push(
        <div key={`rm-${name}`} className="text-red-600 text-xs">
          - Removed plan: {name}
        </div>
      );
    }
  }

  if (changes.length === 0) {
    return <span className="text-muted-foreground italic">No changes</span>;
  }

  return <div className="space-y-0.5">{changes}</div>;
}
