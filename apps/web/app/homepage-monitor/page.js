"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchHomepageTrackings,
  createHomepageTracking,
  deleteHomepageTracking,
  triggerHomepageScrapeAll,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TabButton } from "./_components/tab-button";
import { DashboardTab } from "./_components/dashboard-tab";
import { HomepageDetail } from "./_components/homepage-detail";

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

      <div className="flex gap-1 border-b overflow-x-auto">
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
