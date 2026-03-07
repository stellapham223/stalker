"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchWebsiteMenus,
  createWebsiteMenu,
  deleteWebsiteMenu,
  triggerWebsiteMenuScrapeAll,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TabButton } from "./_components/tab-button";
import { DashboardTab } from "./_components/dashboard-tab";
import { MenuDetail } from "./_components/menu-detail";

const DASHBOARD_TAB = "__dashboard__";

export default function WebsiteMenusPage() {
  const queryClient = useQueryClient();
  const { getBadge, markSeen } = useChangesBadge();
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "", interactionType: "hover" });
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  if (isLoading) return <PageSkeleton />;

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

      <div className="flex gap-1 border-b overflow-x-auto">
        <button
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === DASHBOARD_TAB
              ? "border-primary text-primary bg-primary/15"
              : "border-transparent text-muted-foreground hover:text-primary hover:border-primary/50"
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
            onDelete={() => setDeleteTarget(t)}
          />
        ))}
      </div>

      {activeTab === DASHBOARD_TAB ? (
        <DashboardTab />
      ) : (
        <MenuDetail
          key={activeTab}
          trackingId={activeTab}
          tracking={trackings.find((t) => t.id === activeTab)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently remove this website and all its snapshots."
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
