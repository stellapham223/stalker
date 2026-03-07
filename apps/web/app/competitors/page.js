"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCompetitors, createCompetitor, triggerScrape } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

export default function CompetitorsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "", type: "website" });

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ["competitors"],
    queryFn: fetchCompetitors,
  });

  const createMutation = useMutation({
    mutationFn: createCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
      setShowForm(false);
      setFormData({ name: "", url: "", type: "website" });
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerScrape,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Competitors</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Competitor"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Competitor name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-md border border-input px-3 py-2"
                required
              />
              <input
                type="url"
                placeholder="URL to track"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full rounded-md border border-input px-3 py-2"
                required
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-md border border-input px-3 py-2"
              >
                <option value="website">Website</option>
                <option value="shopify_app">Shopify App Store</option>
              </select>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {competitors.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-semibold">No competitors yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Add your first competitor to start tracking their changes.
          </p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            Add Competitor
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {competitors.map((competitor) => (
          <Card key={competitor.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{competitor.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      competitor.active ? "bg-success" : "bg-muted-foreground"
                    }`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => scrapeMutation.mutate(competitor.id)}
                    disabled={scrapeMutation.isPending}
                  >
                    Scrape Now
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{competitor.url}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Type: {competitor.type} | Fields: {competitor.trackedFields?.length || 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
