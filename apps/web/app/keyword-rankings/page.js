"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchKeywords,
  createKeyword,
  deleteKeyword,
  fetchKeywordSnapshots,
  triggerKeywordScrape,
  triggerKeywordScrapeAll,
  fetchKeywordDashboard,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_TAB = "__dashboard__";

export default function KeywordRankingsPage() {
  const queryClient = useQueryClient();
  const { getBadge, markSeen } = useChangesBadge();
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ keyword: "" });

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ["keywords"],
    queryFn: fetchKeywords,
  });

  const createMutation = useMutation({
    mutationFn: createKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
      setShowForm(false);
      setFormData({ keyword: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
      setActiveTab(DASHBOARD_TAB);
    },
  });

  const scrapeAllMutation = useMutation({
    mutationFn: triggerKeywordScrapeAll,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["keyword-snapshots"] });
        queryClient.invalidateQueries({ queryKey: ["keyword-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Keyword Rankings</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => scrapeAllMutation.mutate()}
            disabled={scrapeAllMutation.isPending}
          >
            {scrapeAllMutation.isPending ? "Scraping..." : "Scrape All"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Keyword"}
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
                placeholder="Keyword (e.g. subscription)"
                value={formData.keyword}
                onChange={(e) => setFormData({ keyword: e.target.value })}
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

        {keywords.map((kw) => (
          <TabButton
            key={kw.id}
            keyword={kw}
            isActive={activeTab === kw.id}
            onClick={() => { setActiveTab(kw.id); markSeen("keywords", kw.id); }}
            badge={getBadge("keywords", kw.id)}
            onDelete={() => {
              if (confirm(`Delete keyword "${kw.keyword}"?`)) {
                deleteMutation.mutate(kw.id);
              }
            }}
          />
        ))}
      </div>

      {/* Tab content */}
      {activeTab === DASHBOARD_TAB ? (
        <DashboardTab />
      ) : (
        <KeywordDetail
          key={activeTab}
          keywordId={activeTab}
          keywordText={keywords.find((k) => k.id === activeTab)?.keyword}
        />
      )}
    </div>
  );
}

function TabButton({ keyword, isActive, onClick, onDelete, badge }) {
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
      &quot;{keyword.keyword}&quot;
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
    queryKey: ["keyword-dashboard"],
    queryFn: fetchKeywordDashboard,
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
                  <th className="text-left p-2 w-40">Keyword</th>
                  <th className="text-left p-2">Changes</th>
                </tr>
              </thead>
              <tbody>
                {session.rows.map((row) => (
                  <tr key={row.keywordId} className="border-b hover:bg-muted/50 align-top">
                    <td className="p-2 font-medium w-40">&quot;{row.keyword}&quot;</td>
                    <td className="p-2">
                      {row.changes === null ? (
                        <span className="text-muted-foreground italic text-xs">Not scraped</span>
                      ) : Array.isArray(row.changes) && row.changes.length === 0 ? (
                        <span className="text-muted-foreground italic text-xs">No changes</span>
                      ) : (
                        <KeywordChangeSummary changes={row.changes} />
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

function KeywordChangeSummary({ changes }) {
  const { newEntries = [], droppedEntries = [], positionChanges = [] } = changes;

  const parts = [];
  if (newEntries.length) parts.push(`+${newEntries.length} app mới vào top`);
  if (droppedEntries.length) parts.push(`-${droppedEntries.length} app rời top`);
  if (positionChanges.length) parts.push(`${positionChanges.length} app thay đổi vị trí`);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
      <div className="space-y-0.5 text-xs">
        {newEntries.map((entry, i) => (
          <div key={`new-${i}`}>
            <span className="text-green-600">+ #{entry.position} {entry.appName}</span>
          </div>
        ))}
        {droppedEntries.map((entry, i) => (
          <div key={`drop-${i}`}>
            <span className="text-red-500">- {entry.appName} (was #{entry.position})</span>
          </div>
        ))}
        {positionChanges.map((entry, i) => {
          const diff = entry.oldPosition - entry.newPosition;
          return (
            <div key={`pos-${i}`}>
              <span className={diff > 0 ? "text-green-600" : "text-red-500"}>
                {diff > 0 ? "↑" : "↓"} {entry.appName}: #{entry.oldPosition} → #{entry.newPosition}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeywordDetail({ keywordId, keywordText }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["keyword-snapshots", keywordId],
    queryFn: () => fetchKeywordSnapshots(keywordId, 2),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerKeywordScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["keyword-snapshots", keywordId] });
        queryClient.invalidateQueries({ queryKey: ["keyword-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const latest = snapshots[0] || null;
  const previous = snapshots[1] || null;
  const rankings = latest?.rankings || [];

  const prevMap = useMemo(() => {
    if (!previous?.rankings) return new Map();
    return new Map(previous.rankings.map((r) => [r.appSlug, r]));
  }, [previous]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>&quot;{keywordText}&quot;</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrapeMutation.mutate(keywordId)}
            disabled={scrapeMutation.isPending}
          >
            {scrapeMutation.isPending ? "Scraping..." : "Scrape Now"}
          </Button>
        </div>
        {latest?.createdAt && (
          <p className="text-sm text-muted-foreground">
            Last scraped: {new Date(latest.createdAt).toLocaleString()} · {rankings.length} results
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : !latest ? (
          <p className="text-muted-foreground">
            No data yet. Click &quot;Scrape Now&quot; to fetch.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 w-12">#</th>
                  <th className="text-left p-2">App Name</th>
                  <th className="text-left p-2 w-28">Ranking</th>
                  <th className="text-left p-2">Subtitle</th>
                  <th className="text-left p-2">Subtitle Changes</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((app, idx) => {
                  const prev = prevMap.get(app.appSlug);
                  return (
                    <RankingRow
                      key={app.appSlug || idx}
                      app={app}
                      prev={prev}
                      hasPrevious={!!previous}
                    />
                  );
                })}
              </tbody>
            </table>

            {previous && (() => {
              const currSlugs = new Set(rankings.map((r) => r.appSlug));
              const dropped = (previous.rankings || []).filter((r) => !currSlugs.has(r.appSlug));
              if (dropped.length === 0) return null;
              return (
                <div className="mt-3 rounded-md bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-700 mb-1">Dropped from Top 12:</p>
                  {dropped.map((app) => (
                    <span
                      key={app.appSlug}
                      className="inline-block mr-2 mb-1 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700"
                    >
                      {app.appName} (was #{app.position})
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RankingRow({ app, prev, hasPrevious }) {
  let rankingChangeEl;
  if (!hasPrevious) {
    rankingChangeEl = <span className="text-muted-foreground">-</span>;
  } else if (!prev) {
    rankingChangeEl = (
      <span className="inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
        NEW
      </span>
    );
  } else if (prev.position === app.position) {
    rankingChangeEl = <span className="text-muted-foreground">-</span>;
  } else {
    const diff = prev.position - app.position;
    rankingChangeEl = diff > 0 ? (
      <span className="text-green-600 font-semibold">+{diff}</span>
    ) : (
      <span className="text-red-600 font-semibold">{diff}</span>
    );
  }

  const currentSubtitle = app.description || "";
  const prevSubtitle = prev?.description || "";
  const subtitleChanged = hasPrevious && prev && prevSubtitle && prevSubtitle !== currentSubtitle;

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-2 font-mono text-muted-foreground">{app.position}</td>
      <td className="p-2 font-medium">{app.appName}</td>
      <td className="p-2">{rankingChangeEl}</td>
      <td className="p-2 text-muted-foreground">{currentSubtitle || "-"}</td>
      <td className="p-2">
        {!hasPrevious || !prev ? (
          <span className="text-muted-foreground">-</span>
        ) : !prevSubtitle ? (
          <span className="text-muted-foreground">-</span>
        ) : subtitleChanged ? (
          <span className="text-red-600">{prevSubtitle}</span>
        ) : (
          <span className="text-muted-foreground italic">No changes</span>
        )}
      </td>
    </tr>
  );
}
