"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchAppListingCompetitors,
  createAppListingCompetitor,
  deleteAppListingCompetitor,
  triggerAppListingScrapeAll,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TabButton } from "./_components/tab-button";
import { DashboardTab } from "./_components/dashboard-tab";
import { CompetitorDetail } from "./_components/competitor-detail";

const DASHBOARD_TAB = "__dashboard__";

export default function AppListingPage() {
  const queryClient = useQueryClient();
  const { getBadge, markSeen } = useChangesBadge();
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", appUrl: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [scrapeAllStatus, setScrapeAllStatus] = useState(null);

  useEffect(() => {
    if (!scrapeAllStatus) return;
    const timer = setTimeout(() => setScrapeAllStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [scrapeAllStatus]);

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
      queryClient.invalidateQueries({ queryKey: ["app-listing-snapshots"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["app-listing-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["changes-latest"] });
      setScrapeAllStatus("success");
    },
    onError: (error) => {
      console.error("[ScrapeAll] Error:", error);
      setScrapeAllStatus("error");
    },
  });

  if (isLoading) return <PageSkeleton />;

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
            {scrapeAllMutation.isPending ? (
              "Scraping..."
            ) : scrapeAllStatus === "success" ? (
              <><Check className="h-4 w-4 mr-1" /> Done</>
            ) : scrapeAllStatus === "error" ? (
              <><AlertCircle className="h-4 w-4 mr-1" /> Failed</>
            ) : (
              "Scrape All"
            )}
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

        {competitors.map((c) => (
          <TabButton
            key={c.id}
            competitor={c}
            isActive={activeTab === c.id}
            onClick={() => { setActiveTab(c.id); markSeen("appListing", c.id); }}
            badge={getBadge("appListing", c.id)}
            onDelete={() => setDeleteTarget(c)}
          />
        ))}
      </div>

      {activeTab === DASHBOARD_TAB ? (
        <DashboardTab />
      ) : (
        <CompetitorDetail
          key={activeTab}
          competitorId={activeTab}
          competitorName={competitors.find((c) => c.id === activeTab)?.name}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently remove this competitor and all its snapshots."
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
