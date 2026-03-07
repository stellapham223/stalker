"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchAutocompleteTrackings,
  createAutocompleteTracking,
  deleteAutocompleteTracking,
  triggerAutocompleteScrapeAll,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TabButton } from "./_components/tab-button";
import { DashboardTab } from "./_components/dashboard-tab";
import { QueryDetail } from "./_components/query-detail";

const DASHBOARD_TAB = "__dashboard__";

export default function AutocompletePage() {
  const queryClient = useQueryClient();
  const { getBadge, markSeen } = useChangesBadge();
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ query: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  if (isLoading) return <PageSkeleton />;

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
            onClick={() => { setActiveTab(t.id); markSeen("autocomplete", t.id); }}
            badge={getBadge("autocomplete", t.id)}
            onDelete={() => setDeleteTarget(t)}
          />
        ))}
      </div>

      {activeTab === DASHBOARD_TAB ? (
        <DashboardTab />
      ) : (
        <QueryDetail
          key={activeTab}
          trackingId={activeTab}
          queryText={trackings.find((t) => t.id === activeTab)?.query}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete query "${deleteTarget?.query}"?`}
        description="This will permanently remove this query and all its snapshots."
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
