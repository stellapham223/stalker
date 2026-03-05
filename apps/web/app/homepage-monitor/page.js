"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchHomepageTrackings,
  createHomepageTracking,
  deleteHomepageTracking,
  fetchHomepageSnapshots,
  triggerHomepageScrape,
  triggerHomepageScrapeAll,
  fetchHomepageDashboard,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_TAB = "__dashboard__";

export default function HomepageMonitorPage() {
  const queryClient = useQueryClient();
  const { getBadge, markSeen } = useChangesBadge();
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "" });

  const { data: trackings = [], isLoading } = useQuery({
    queryKey: ["homepage-trackings"],
    queryFn: fetchHomepageTrackings,
  });

  const createMutation = useMutation({
    mutationFn: createHomepageTracking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-trackings"] });
      setShowForm(false);
      setFormData({ name: "", url: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHomepageTracking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-trackings"] });
      setActiveTab(DASHBOARD_TAB);
    },
  });

  const scrapeAllMutation = useMutation({
    mutationFn: triggerHomepageScrapeAll,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["homepage-snapshots"] });
        queryClient.invalidateQueries({ queryKey: ["homepage-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Homepage Monitor</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => scrapeAllMutation.mutate()}
            disabled={scrapeAllMutation.isPending}
          >
            {scrapeAllMutation.isPending ? "Scraping..." : "Scrape All"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Website"}
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
                placeholder="Website name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-md border border-input px-3 py-2 w-40"
                required
              />
              <input
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
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
            onClick={() => { setActiveTab(t.id); markSeen("homepage", t.id); }}
            badge={getBadge("homepage", t.id)}
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
        <HomepageDetail
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
    queryKey: ["homepage-dashboard"],
    queryFn: fetchHomepageDashboard,
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
                  <th className="text-left p-2 w-40">Website</th>
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
                        <HomepageDiffSummary diff={row.changes} />
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

function HomepageDiffSummary({ diff }) {
  const added = diff.added || [];
  const removed = diff.removed || [];

  const parts = [];
  if (diff.addedCount) parts.push(`+${diff.addedCount} dòng mới`);
  if (diff.removedCount) parts.push(`-${diff.removedCount} dòng bị xóa`);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
      <div className="space-y-0.5 text-xs">
        {added.slice(0, 3).map((line, i) => (
          <div key={`a-${i}`}>
            <span className="text-green-600 truncate block max-w-sm">+ {line}</span>
          </div>
        ))}
        {removed.slice(0, 3).map((line, i) => (
          <div key={`r-${i}`}>
            <span className="text-red-500 truncate block max-w-sm">- {line}</span>
          </div>
        ))}
        {(added.length > 3 || removed.length > 3) && (
          <span className="text-muted-foreground">...and more</span>
        )}
      </div>
    </div>
  );
}

function HomepageDetail({ trackingId, tracking }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["homepage-snapshots", trackingId],
    queryFn: () => fetchHomepageSnapshots(trackingId, 2),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerHomepageScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["homepage-snapshots", trackingId] });
        queryClient.invalidateQueries({ queryKey: ["homepage-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const latest = snapshots[0] || null;
  const sections = latest?.sections || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{tracking?.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{tracking?.url}</p>
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
            Last scraped: {new Date(latest.createdAt).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section, idx) => (
              <div key={idx} className="border-l-2 border-muted pl-4">
                {section.heading && (
                  <h3 className="font-semibold text-sm">{section.heading}</h3>
                )}
                {section.content && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">
                    {section.content}
                  </p>
                )}
                {section.ctaText && (
                  <div className="flex gap-2 mt-1">
                    {section.ctaText.map((cta, i) => (
                      <span
                        key={i}
                        className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                      >
                        {cta}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {latest?.stats && (
              <div className="mt-3 rounded-md bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Key Metrics:</p>
                <div className="flex flex-wrap gap-2">
                  {latest.stats.map((stat, i) => (
                    <span key={i} className="inline-block rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No homepage data yet. Click &quot;Scrape Now&quot; to fetch.
          </p>
        )}

        {latest?.diff && (
          <div className="mt-4 rounded-md bg-yellow-50 p-3">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              Changes detected: +{latest.diff.addedCount || 0} / -{latest.diff.removedCount || 0} lines
            </p>
            {latest.diff.added?.slice(0, 5).map((line, i) => (
              <p key={`a${i}`} className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mb-1 truncate">
                + {line}
              </p>
            ))}
            {latest.diff.removed?.slice(0, 5).map((line, i) => (
              <p key={`r${i}`} className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded mb-1 truncate">
                - {line}
              </p>
            ))}
            {((latest.diff.added?.length || 0) > 5 || (latest.diff.removed?.length || 0) > 5) && (
              <p className="text-xs text-muted-foreground mt-1">...and more changes</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
