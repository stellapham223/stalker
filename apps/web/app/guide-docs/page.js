"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchGuideDocsTrackings,
  createGuideDocsTracking,
  deleteGuideDocsTracking,
  updateGuideDocsTracking,
  fetchGuideDocsSnapshots,
  triggerGuideDocsScrape,
  triggerGuideDocsScrapeAll,
  fetchGuideDocsDashboard,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_TAB = "__dashboard__";

const DEFAULT_TRACKINGS = [
  { name: "Recharge", url: "https://docs.getrecharge.com/docs/understanding-recharge" },
  { name: "Appstle", url: "https://intercom.help/appstle/en/collections/2776373-subscriptions" },
  { name: "Loops", url: "https://help.loopwork.co/en/" },
  { name: "Subi", url: "https://help.subi.co/en/" },
  { name: "Seal", url: "https://www.sealsubscriptions.com/article" },
];

export default function GuideDocsPage() {
  const queryClient = useQueryClient();
  const { getBadge, markSeen } = useChangesBadge();
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "" });

  const { data: trackings = [], isLoading } = useQuery({
    queryKey: ["guide-docs-trackings"],
    queryFn: fetchGuideDocsTrackings,
  });

  const createMutation = useMutation({
    mutationFn: createGuideDocsTracking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guide-docs-trackings"] });
      setShowForm(false);
      setFormData({ name: "", url: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGuideDocsTracking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guide-docs-trackings"] });
      setActiveTab(DASHBOARD_TAB);
    },
  });

  const scrapeAllMutation = useMutation({
    mutationFn: triggerGuideDocsScrapeAll,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["guide-docs-snapshots"] });
        queryClient.invalidateQueries({ queryKey: ["guide-docs-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Guide Docs</h1>
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
                placeholder="Name (e.g. Recharge)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-md border border-input px-3 py-2 w-40"
                required
              />
              <input
                type="url"
                placeholder="https://docs.example.com/..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="flex-1 rounded-md border border-input px-3 py-2"
                required
              />
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </form>

            {/* Quick add defaults */}
            {DEFAULT_TRACKINGS.filter((d) => !trackings.some((t) => t.name === d.name)).length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TRACKINGS.filter((d) => !trackings.some((t) => t.name === d.name)).map((d) => (
                    <button
                      key={d.name}
                      type="button"
                      className="rounded border border-input px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => createMutation.mutate(d)}
                    >
                      + {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
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

        {trackings.map((t) => (
          <TabButton
            key={t.id}
            tracking={t}
            isActive={activeTab === t.id}
            onClick={() => { setActiveTab(t.id); markSeen("guideDocs", t.id); }}
            badge={getBadge("guideDocs", t.id)}
            onDelete={() => {
              if (confirm(`Delete "${t.name}"?`)) {
                deleteMutation.mutate(t.id);
              }
            }}
          />
        ))}
      </div>

      {/* Tab content */}
      {activeTab === DASHBOARD_TAB ? (
        <DashboardTab />
      ) : (
        <GuideDocsDetail
          key={activeTab}
          trackingId={activeTab}
          tracking={trackings.find((t) => t.id === activeTab)}
        />
      )}
    </div>
  );
}

function TabButton({ tracking, isActive, onClick, onDelete, badge }) {
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
      {tracking.name}
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
    queryKey: ["guide-docs-dashboard"],
    queryFn: fetchGuideDocsDashboard,
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
                  <th className="text-left p-2 w-40">Competitor</th>
                  <th className="text-left p-2">Changes</th>
                </tr>
              </thead>
              <tbody>
                {session.rows.map((row) => (
                  <tr key={row.trackingId} className="border-b hover:bg-muted/50 align-top">
                    <td className="p-2 font-medium w-40">{row.name}</td>
                    <td className="p-2">
                      {row.changes === null ? (
                        <span className="text-muted-foreground italic text-xs">Not scraped</span>
                      ) : Array.isArray(row.changes) && row.changes.length === 0 ? (
                        <span className="text-muted-foreground italic text-xs">No changes</span>
                      ) : (
                        <NavDiffSummary diff={row.changes} />
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

function NavDiffSummary({ diff }) {
  const added = diff.added || [];
  const removed = diff.removed || [];
  const renamed = diff.renamed || [];
  const childrenChanged = diff.childrenChanged || [];

  const parts = [];
  if (added.length) parts.push(`+${added.length} section mới`);
  if (removed.length) parts.push(`-${removed.length} section bị xóa`);
  if (renamed.length) parts.push(`${renamed.length} section đổi tên`);
  if (childrenChanged.length) parts.push(`${childrenChanged.length} section thay đổi bài viết`);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
      <div className="space-y-0.5 text-xs">
        {added.map((a, i) => (
          <div key={`a-${i}`}><span className="text-green-600">+ {a.label}</span></div>
        ))}
        {removed.map((r, i) => (
          <div key={`r-${i}`}><span className="text-red-500">- {r.label}</span></div>
        ))}
        {renamed.map((r, i) => (
          <div key={`rn-${i}`}>
            <span className="text-yellow-600">~ {r.oldLabel} → {r.newLabel}</span>
          </div>
        ))}
        {childrenChanged.map((c, i) => (
          <div key={`c-${i}`}>
            <span className="text-yellow-600">~ {c.parentLabel}:</span>
            {c.addedChildren?.map((a, j) => (
              <span key={`ca-${j}`} className="text-green-600 ml-1">+{a}</span>
            ))}
            {c.removedChildren?.map((r, j) => (
              <span key={`cr-${j}`} className="text-red-500 ml-1">-{r}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function GuideDocsDetail({ trackingId, tracking }) {
  const queryClient = useQueryClient();
  const [urlInput, setUrlInput] = useState(tracking?.url || "");
  const [urlEditing, setUrlEditing] = useState(false);

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["guide-docs-snapshots", trackingId],
    queryFn: () => fetchGuideDocsSnapshots(trackingId, 2),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerGuideDocsScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["guide-docs-snapshots", trackingId] });
        queryClient.invalidateQueries({ queryKey: ["guide-docs-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const updateUrlMutation = useMutation({
    mutationFn: ({ id, url }) => updateGuideDocsTracking(id, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guide-docs-trackings"] });
      setUrlEditing(false);
    },
  });

  const latest = snapshots[0] || null;
  const navData = latest?.navData || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{tracking?.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-sm">
              {tracking?.url}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrapeMutation.mutate(trackingId)}
            disabled={scrapeMutation.isPending}
          >
            {scrapeMutation.isPending ? "Scraping..." : "Scrape Now"}
          </Button>
        </div>
        {latest?.createdAt && (
          <p className="text-sm text-muted-foreground">
            Last scraped: {new Date(latest.createdAt).toLocaleString()} · {navData.length} sections
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : navData.length > 0 ? (
          <div className="space-y-1">
            {navData.map((item, idx) => (
              <NavTreeItem key={idx} item={item} level={0} diff={latest?.diff} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No nav data yet. Click &quot;Scrape Now&quot; to fetch.
          </p>
        )}

        {latest?.diff && (
          <div className="mt-4 rounded-md bg-yellow-50 p-3">
            <p className="text-sm font-medium text-yellow-800 mb-2">Changes detected:</p>
            {latest.diff.added?.map((a, i) => (
              <span key={`a${i}`} className="inline-block mr-2 mb-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                + {a.label}
              </span>
            ))}
            {latest.diff.removed?.map((r, i) => (
              <span key={`r${i}`} className="inline-block mr-2 mb-1 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                - {r.label}
              </span>
            ))}
            {latest.diff.renamed?.map((r, i) => (
              <span key={`rn${i}`} className="inline-block mr-2 mb-1 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                {r.oldLabel} → {r.newLabel}
              </span>
            ))}
            {latest.diff.childrenChanged?.map((c, i) => (
              <div key={`c${i}`} className="text-xs text-yellow-700 mt-1">
                <span className="font-medium">{c.parentLabel}:</span>
                {c.addedChildren?.map((a) => ` +${a}`).join("")}
                {c.removedChildren?.map((r) => ` -${r}`).join("")}
              </div>
            ))}
          </div>
        )}

        {/* URL update section */}
        <div className="mt-6 border-t pt-4">
          <p className="text-sm font-medium mb-2">Update guide URL</p>
          {urlEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUrlMutation.mutate({ id: trackingId, url: urlInput });
              }}
              className="flex gap-2"
            >
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 rounded-md border border-input px-3 py-1.5 text-sm"
                required
              />
              <Button type="submit" size="sm" disabled={updateUrlMutation.isPending}>
                {updateUrlMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setUrlInput(tracking?.url || ""); setUrlEditing(false); }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground truncate max-w-sm">{tracking?.url}</span>
              <Button size="sm" variant="outline" onClick={() => setUrlEditing(true)}>
                Edit
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NavTreeItem({ item, level, diff }) {
  const indent = level * 16;

  // Highlight if changed
  const isAdded = diff?.added?.some((a) => a.label === item.label);
  const isRemoved = diff?.removed?.some((r) => r.label === item.label);

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 text-sm rounded px-2 ${
          isAdded ? "bg-green-50 text-green-700" : isRemoved ? "bg-red-50 text-red-700 line-through" : "hover:bg-muted/50"
        }`}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {item.children?.length > 0 && (
          <span className="text-muted-foreground text-xs">▸</span>
        )}
        <span className="font-medium">{item.label}</span>
        {item.url && (
          <span className="text-xs text-muted-foreground truncate max-w-xs">{item.url}</span>
        )}
        {item.children?.length > 0 && (
          <span className="text-xs text-muted-foreground">({item.children.length})</span>
        )}
      </div>
      {item.children?.map((child, idx) => (
        <NavTreeItem key={idx} item={child} level={level + 1} diff={diff} />
      ))}
    </div>
  );
}
