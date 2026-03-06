"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchHomepageSnapshots, triggerHomepageScrape } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HomepageDetail({ trackingId, tracking }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["homepage-snapshots", trackingId],
    queryFn: () => fetchHomepageSnapshots(trackingId, 2),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerHomepageScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["homepage-snapshots", trackingId] });
        queryClient.invalidateQueries({ queryKey: ["homepage-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const latest = snapshots[0] || null;
  const sections = latest?.sections || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{tracking?.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{tracking?.url}</p>
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
        ) : sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section, idx) => (
              <div key={idx} className="border-l-2 border-muted pl-4">
                {section.heading && (
                  <h3 className="font-semibold text-sm">{section.heading}</h3>
                )}
                {section.content && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">
                    {section.content}
                  </p>
                )}
                {section.ctaText && (
                  <div className="flex gap-2 mt-1">
                    {section.ctaText.map((cta, i) => (
                      <span
                        key={i}
                        className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                      >
                        {cta}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {latest?.stats && (
              <div className="mt-3 rounded-md bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Key Metrics:</p>
                <div className="flex flex-wrap gap-2">
                  {latest.stats.map((stat, i) => (
                    <span key={i} className="inline-block rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No homepage data yet. Click &quot;Scrape Now&quot; to fetch.
          </p>
        )}

        {latest?.diff && (
          <div className="mt-4 rounded-md bg-yellow-50 p-3">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              Changes detected: +{latest.diff.addedCount || 0} / -{latest.diff.removedCount || 0} lines
            </p>
            {latest.diff.added?.slice(0, 5).map((line, i) => (
              <p key={`a${i}`} className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mb-1 truncate">
                + {line}
              </p>
            ))}
            {latest.diff.removed?.slice(0, 5).map((line, i) => (
              <p key={`r${i}`} className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded mb-1 truncate">
                - {line}
              </p>
            ))}
            {((latest.diff.added?.length || 0) > 5 || (latest.diff.removed?.length || 0) > 5) && (
              <p className="text-xs text-muted-foreground mt-1">...and more changes</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
