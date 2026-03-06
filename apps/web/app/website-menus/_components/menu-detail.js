"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWebsiteMenuSnapshots, triggerWebsiteMenuScrape } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MenuDetail({ trackingId, tracking }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["menu-snapshots", trackingId],
    queryFn: () => fetchWebsiteMenuSnapshots(trackingId, 2),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerWebsiteMenuScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["menu-snapshots", trackingId] });
        queryClient.invalidateQueries({ queryKey: ["menu-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const latest = snapshots[0] || null;
  const menuData = latest?.menuData || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{tracking?.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {tracking?.url} · {tracking?.interactionType}
            </p>
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
        ) : menuData.length > 0 ? (
          <div className="space-y-2">
            {menuData.map((item, idx) => (
              <MenuTreeItem key={idx} item={item} level={0} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No menu data yet. Click &quot;Scrape Now&quot; to fetch.
          </p>
        )}

        {latest?.diff && (
          <div className="mt-4 rounded-md bg-warning/15 p-3">
            <p className="text-sm font-medium text-warning mb-2">Changes detected:</p>
            {latest.diff.added?.map((a, i) => (
              <span key={`a${i}`} className="inline-block mr-2 mb-1 rounded bg-diff-add px-2 py-0.5 text-xs text-diff-add-foreground">
                + {a.label}
              </span>
            ))}
            {latest.diff.removed?.map((r, i) => (
              <span key={`r${i}`} className="inline-block mr-2 mb-1 rounded bg-diff-remove px-2 py-0.5 text-xs text-diff-remove-foreground">
                - {r.label}
              </span>
            ))}
            {latest.diff.renamed?.map((r, i) => (
              <span key={`rn${i}`} className="inline-block mr-2 mb-1 rounded bg-warning/15 px-2 py-0.5 text-xs text-warning">
                {r.oldLabel} → {r.newLabel}
              </span>
            ))}
            {latest.diff.childrenChanged?.map((c, i) => (
              <div key={`c${i}`} className="text-xs text-warning mt-1">
                <span className="font-medium">{c.parentLabel}:</span>
                {c.addedChildren?.map((a) => ` +${a}`).join("")}
                {c.removedChildren?.map((r) => ` -${r}`).join("")}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MenuTreeItem({ item, level }) {
  const indent = level * 16;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 text-sm hover:bg-muted/50 rounded px-2"
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {item.children?.length > 0 && (
          <span className="text-muted-foreground text-xs">▸</span>
        )}
        <span className="font-medium">{item.label}</span>
        {item.url && (
          <span className="text-xs text-muted-foreground truncate max-w-xs">
            {item.url}
          </span>
        )}
        {item.children?.length > 0 && (
          <span className="text-xs text-muted-foreground">
            ({item.children.length})
          </span>
        )}
      </div>
      {item.children?.map((child, idx) => (
        <MenuTreeItem key={idx} item={child} level={level + 1} />
      ))}
    </div>
  );
}
