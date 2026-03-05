"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchWebsiteMenus,
  createWebsiteMenu,
  deleteWebsiteMenu,
  fetchWebsiteMenuSnapshots,
  triggerWebsiteMenuScrape,
  triggerWebsiteMenuScrapeAll,
  fetchWebsiteMenuDashboard,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_TAB = "__dashboard__";

export default function WebsiteMenusPage() {
  const queryClient = useQueryClient();
  const { getBadge, markSeen } = useChangesBadge();
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "", interactionType: "hover" });

  const { data: trackings = [], isLoading } = useQuery({
    queryKey: ["website-menus"],
    queryFn: fetchWebsiteMenus,
  });

  const createMutation = useMutation({
    mutationFn: createWebsiteMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-menus"] });
      setShowForm(false);
      setFormData({ name: "", url: "", interactionType: "hover" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebsiteMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-menus"] });
      setActiveTab(DASHBOARD_TAB);
    },
  });

  const scrapeAllMutation = useMutation({
    mutationFn: triggerWebsiteMenuScrapeAll,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["menu-snapshots"] });
        queryClient.invalidateQueries({ queryKey: ["menu-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Website Menus</h1>
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
              <select
                value={formData.interactionType}
                onChange={(e) => setFormData({ ...formData, interactionType: e.target.value })}
                className="rounded-md border border-input px-3 py-2"
              >
                <option value="hover">Hover</option>
                <option value="click">Click</option>
              </select>
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
            onClick={() => { setActiveTab(t.id); markSeen("websiteMenus", t.id); }}
            badge={getBadge("websiteMenus", t.id)}
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
        <MenuDetail
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
    queryKey: ["menu-dashboard"],
    queryFn: fetchWebsiteMenuDashboard,
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
                        <MenuDiffSummary diff={row.changes} />
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

function MenuDiffSummary({ diff }) {
  const added = diff.added || [];
  const removed = diff.removed || [];
  const renamed = diff.renamed || [];
  const childrenChanged = diff.childrenChanged || [];

  const parts = [];
  if (added.length) parts.push(`+${added.length} menu mới`);
  if (removed.length) parts.push(`-${removed.length} menu bị xóa`);
  if (renamed.length) parts.push(`${renamed.length} menu đổi tên`);
  if (childrenChanged.length) parts.push(`${childrenChanged.length} menu thay đổi con`);

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

function MenuDetail({ trackingId, tracking }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["menu-snapshots", trackingId],
    queryFn: () => fetchWebsiteMenuSnapshots(trackingId, 2),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerWebsiteMenuScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["menu-snapshots", trackingId] });
        queryClient.invalidateQueries({ queryKey: ["menu-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const latest = snapshots[0] || null;
  const menuData = latest?.menuData || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{tracking?.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {tracking?.url} · {tracking?.interactionType}
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
            Last scraped: {new Date(latest.createdAt).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : menuData.length > 0 ? (
          <div className="space-y-2">
            {menuData.map((item, idx) => (
              <MenuTreeItem key={idx} item={item} level={0} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No menu data yet. Click &quot;Scrape Now&quot; to fetch.
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
      </CardContent>
    </Card>
  );
}

function MenuTreeItem({ item, level }) {
  const indent = level * 16;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 text-sm hover:bg-muted/50 rounded px-2"
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {item.children?.length > 0 && (
          <span className="text-muted-foreground text-xs">▸</span>
        )}
        <span className="font-medium">{item.label}</span>
        {item.url && (
          <span className="text-xs text-muted-foreground truncate max-w-xs">
            {item.url}
          </span>
        )}
        {item.children?.length > 0 && (
          <span className="text-xs text-muted-foreground">
            ({item.children.length})
          </span>
        )}
      </div>
      {item.children?.map((child, idx) => (
        <MenuTreeItem key={idx} item={child} level={level + 1} />
      ))}
    </div>
  );
}
