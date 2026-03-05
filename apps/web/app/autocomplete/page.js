"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchAutocompleteTrackings,
  createAutocompleteTracking,
  deleteAutocompleteTracking,
  fetchAutocompleteSnapshots,
  triggerAutocompleteScrape,
  triggerAutocompleteScrapeAll,
  fetchAutocompleteDashboard,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_TAB = "__dashboard__";

export default function AutocompletePage() {
  const queryClient = useQueryClient();
  const { getBadge, markSeen } = useChangesBadge();
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ query: "" });

  const { data: trackings = [], isLoading } = useQuery({
    queryKey: ["autocomplete-trackings"],
    queryFn: fetchAutocompleteTrackings,
  });

  const createMutation = useMutation({
    mutationFn: createAutocompleteTracking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autocomplete-trackings"] });
      setShowForm(false);
      setFormData({ query: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAutocompleteTracking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autocomplete-trackings"] });
      setActiveTab(DASHBOARD_TAB);
    },
  });

  const scrapeAllMutation = useMutation({
    mutationFn: triggerAutocompleteScrapeAll,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["autocomplete-snapshots"] });
        queryClient.invalidateQueries({ queryKey: ["autocomplete-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Autocomplete Tracker</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => scrapeAllMutation.mutate()}
            disabled={scrapeAllMutation.isPending}
          >
            {scrapeAllMutation.isPending ? "Scraping..." : "Scrape All"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Query"}
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
                placeholder="Search query (e.g. subs)"
                value={formData.query}
                onChange={(e) => setFormData({ query: e.target.value })}
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
            onClick={() => { setActiveTab(t.id); markSeen("autocomplete", t.id); }}
            badge={getBadge("autocomplete", t.id)}
            onDelete={() => {
              if (confirm(`Delete query "${t.query}"?`)) {
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
        <QueryDetail
          key={activeTab}
          trackingId={activeTab}
          queryText={trackings.find((t) => t.id === activeTab)?.query}
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
      &quot;{tracking.query}&quot;
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
    queryKey: ["autocomplete-dashboard"],
    queryFn: fetchAutocompleteDashboard,
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
                  <th className="text-left p-2 w-40">Query</th>
                  <th className="text-left p-2">Changes</th>
                </tr>
              </thead>
              <tbody>
                {session.rows.map((row) => (
                  <tr key={row.trackingId} className="border-b hover:bg-muted/50 align-top">
                    <td className="p-2 font-medium w-40">&quot;{row.query}&quot;</td>
                    <td className="p-2">
                      {row.changes === null ? (
                        <span className="text-muted-foreground italic text-xs">Not scraped</span>
                      ) : Array.isArray(row.changes) && row.changes.length === 0 ? (
                        <span className="text-muted-foreground italic text-xs">No changes</span>
                      ) : (
                        <AutocompleteDiffSummary diff={row.changes} />
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

function AutocompleteDiffSummary({ diff }) {
  const added = diff.added || [];
  const removed = diff.removed || [];
  const reordered = diff.reordered || [];

  const parts = [];
  if (added.length) parts.push(`+${added.length} suggestion mới`);
  if (removed.length) parts.push(`-${removed.length} suggestion bị xóa`);
  if (reordered.length) parts.push(`${reordered.length} thay đổi vị trí`);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
      <div className="space-y-0.5 text-xs">
        {added.map((s, i) => (
          <div key={`a-${i}`}><span className="text-green-600">+ {s}</span></div>
        ))}
        {removed.map((s, i) => (
          <div key={`r-${i}`}><span className="text-red-500">- {s}</span></div>
        ))}
        {reordered.map((r, i) => (
          <div key={`o-${i}`}>
            <span className="text-yellow-600">↕ {r.suggestion} (#{r.oldPosition} → #{r.newPosition})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QueryDetail({ trackingId, queryText }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["autocomplete-snapshots", trackingId],
    queryFn: () => fetchAutocompleteSnapshots(trackingId),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerAutocompleteScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["autocomplete-snapshots", trackingId] });
        queryClient.invalidateQueries({ queryKey: ["autocomplete-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const latest = snapshots[0] || null;
  const suggestions = latest?.suggestions || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Search: &quot;{queryText}&quot;</CardTitle>
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
            Last scraped: {new Date(latest.createdAt).toLocaleString()} · {suggestions.length} suggestions
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : snapshots.length === 0 ? (
          <p className="text-muted-foreground">
            No snapshots yet. Click &quot;Scrape Now&quot; to fetch.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {/* Column 1: Suggestions timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Suggestions
              </h3>
              <div className="space-y-3">
                {snapshots.map((snap) => (
                  <SnapshotEntry key={snap.id} snapshot={snap} />
                ))}
              </div>
            </div>

            {/* Column 2: Changes timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Changes
              </h3>
              <div className="space-y-3">
                {snapshots.map((snap, idx) => (
                  <ChangeEntry
                    key={snap.id}
                    snapshot={snap}
                    isFirst={idx === snapshots.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SnapshotEntry({ snapshot }) {
  const suggestions = snapshot.suggestions || [];

  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground mb-2">
        {new Date(snapshot.createdAt).toLocaleString()}
      </p>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono"
            >
              <span className="text-muted-foreground mr-1">{i + 1}.</span>
              {s}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No suggestions</p>
      )}
    </div>
  );
}

function ChangeEntry({ snapshot, isFirst }) {
  const diff = snapshot.diff;

  if (isFirst) {
    return (
      <div className="rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground mb-2">
          {new Date(snapshot.createdAt).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground italic">Initial scrape</p>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground mb-2">
          {new Date(snapshot.createdAt).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground italic">No changes</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground mb-2">
        {new Date(snapshot.createdAt).toLocaleString()}
      </p>
      <div className="space-y-1">
        {diff.added && diff.added.map((s, i) => (
          <div key={`a-${i}`} className="flex items-center gap-1.5">
            <span className="text-green-600 font-bold text-xs">+</span>
            <span className="text-xs text-green-700">{s}</span>
          </div>
        ))}
        {diff.removed && diff.removed.map((s, i) => (
          <div key={`r-${i}`} className="flex items-center gap-1.5">
            <span className="text-red-600 font-bold text-xs">−</span>
            <span className="text-xs text-red-700">{s}</span>
          </div>
        ))}
        {diff.reordered && diff.reordered.map((r, i) => (
          <div key={`o-${i}`} className="flex items-center gap-1.5">
            <span className="text-yellow-600 font-bold text-xs">↕</span>
            <span className="text-xs text-yellow-700">
              {r.suggestion} (#{r.oldPosition} → #{r.newPosition})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
