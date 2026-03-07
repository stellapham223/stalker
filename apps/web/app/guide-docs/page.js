"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchGuideDocsTrackings,
  createGuideDocsTracking,
  deleteGuideDocsTracking,
  triggerGuideDocsScrapeAll,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TabButton } from "./_components/tab-button";
import { DashboardTab } from "./_components/dashboard-tab";
import { GuideDocsDetail } from "./_components/guide-docs-detail";

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
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  if (isLoading) return <PageSkeleton />;

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
            {showForm ? "Cancel" : "Add Guide"}
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
            onClick={() => { setActiveTab(t.id); markSeen("guideDocs", t.id); }}
            badge={getBadge("guideDocs", t.id)}
            onDelete={() => setDeleteTarget(t)}
          />
        ))}
      </div>

      {activeTab === DASHBOARD_TAB ? (
        <DashboardTab />
      ) : (
        <GuideDocsDetail
          key={activeTab}
          trackingId={activeTab}
          tracking={trackings.find((t) => t.id === activeTab)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently remove this guide and all its snapshots."
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
