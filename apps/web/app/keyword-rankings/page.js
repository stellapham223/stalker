"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChangesBadge } from "@/hooks/useChangesBadge";
import {
  fetchKeywords,
  createKeyword,
  deleteKeyword,
  triggerKeywordScrapeAll,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TabButton } from "./_components/tab-button";
import { DashboardTab } from "./_components/dashboard-tab";
import { KeywordDetail } from "./_components/keyword-detail";

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
