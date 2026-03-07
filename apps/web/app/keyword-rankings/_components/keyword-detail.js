"use client";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchKeywordSnapshots, triggerKeywordScrape } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSearch } from "lucide-react";

export function KeywordDetail({ keywordId, keywordText }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["keyword-snapshots", keywordId],
    queryFn: () => fetchKeywordSnapshots(keywordId, 2),
    staleTime: 0,
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerKeywordScrape,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keyword-snapshots", keywordId] });
      queryClient.invalidateQueries({ queryKey: ["keyword-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["changes-latest"] });
    },
    onError: (error) => {
      console.error("[KeywordScrapeNow] Error:", error);
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
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : !latest ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileSearch className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-semibold">No data yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Scrape Now&quot; to fetch keyword rankings.
            </p>
          </div>
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
                <div className="mt-3 rounded-md bg-diff-remove p-3">
                  <p className="text-sm font-medium text-diff-remove-foreground mb-1">Dropped from Top 12:</p>
                  {dropped.map((app) => (
                    <span
                      key={app.appSlug}
                      className="inline-block mr-2 mb-1 rounded bg-diff-remove px-2 py-0.5 text-xs text-diff-remove-foreground"
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
      <span className="inline-block rounded bg-diff-add px-1.5 py-0.5 text-xs font-semibold text-diff-add-foreground">
        NEW
      </span>
    );
  } else if (prev.position === app.position) {
    rankingChangeEl = <span className="text-muted-foreground">-</span>;
  } else {
    const diff = prev.position - app.position;
    rankingChangeEl = diff > 0 ? (
      <span className="text-diff-add-foreground font-semibold">+{diff}</span>
    ) : (
      <span className="text-diff-remove-foreground font-semibold">{diff}</span>
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
          <span className="text-diff-remove-foreground">{prevSubtitle}</span>
        ) : (
          <span className="text-muted-foreground italic">No changes</span>
        )}
      </td>
    </tr>
  );
}
