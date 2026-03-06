"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAutocompleteSnapshots, triggerAutocompleteScrape } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QueryDetail({ trackingId, queryText }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["autocomplete-snapshots", trackingId],
    queryFn: () => fetchAutocompleteSnapshots(trackingId),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerAutocompleteScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["autocomplete-snapshots", trackingId] });
        queryClient.invalidateQueries({ queryKey: ["autocomplete-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const latest = snapshots[0] || null;
  const suggestions = latest?.suggestions || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Search: &quot;{queryText}&quot;</CardTitle>
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
            Last scraped: {new Date(latest.createdAt).toLocaleString()} · {suggestions.length} suggestions
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : snapshots.length === 0 ? (
          <p className="text-muted-foreground">
            No snapshots yet. Click &quot;Scrape Now&quot; to fetch.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Suggestions
              </h3>
              <div className="space-y-3">
                {snapshots.map((snap) => (
                  <SnapshotEntry key={snap.id} snapshot={snap} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Changes
              </h3>
              <div className="space-y-3">
                {snapshots.map((snap, idx) => (
                  <ChangeEntry
                    key={snap.id}
                    snapshot={snap}
                    isFirst={idx === snapshots.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SnapshotEntry({ snapshot }) {
  const suggestions = snapshot.suggestions || [];

  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground mb-2">
        {new Date(snapshot.createdAt).toLocaleString()}
      </p>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono"
            >
              <span className="text-muted-foreground mr-1">{i + 1}.</span>
              {s}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No suggestions</p>
      )}
    </div>
  );
}

function ChangeEntry({ snapshot, isFirst }) {
  const diff = snapshot.diff;

  if (isFirst) {
    return (
      <div className="rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground mb-2">
          {new Date(snapshot.createdAt).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground italic">Initial scrape</p>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground mb-2">
          {new Date(snapshot.createdAt).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground italic">No changes</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground mb-2">
        {new Date(snapshot.createdAt).toLocaleString()}
      </p>
      <div className="space-y-1">
        {diff.added && diff.added.map((s, i) => (
          <div key={`a-${i}`} className="flex items-center gap-1.5">
            <span className="text-diff-add-foreground font-bold text-xs">+</span>
            <span className="text-xs text-diff-add-foreground">{s}</span>
          </div>
        ))}
        {diff.removed && diff.removed.map((s, i) => (
          <div key={`r-${i}`} className="flex items-center gap-1.5">
            <span className="text-diff-remove-foreground font-bold text-xs">−</span>
            <span className="text-xs text-diff-remove-foreground">{s}</span>
          </div>
        ))}
        {diff.reordered && diff.reordered.map((r, i) => (
          <div key={`o-${i}`} className="flex items-center gap-1.5">
            <span className="text-warning font-bold text-xs">↕</span>
            <span className="text-xs text-warning">
              {r.suggestion} (#{r.oldPosition} → #{r.newPosition})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
