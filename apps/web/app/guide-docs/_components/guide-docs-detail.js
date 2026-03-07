"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchGuideDocsSnapshots, triggerGuideDocsScrape, updateGuideDocsTracking } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSearch } from "lucide-react";

export function GuideDocsDetail({ trackingId, tracking }) {
  const queryClient = useQueryClient();
  const [urlInput, setUrlInput] = useState(tracking?.url || "");
  const [urlEditing, setUrlEditing] = useState(false);

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["guide-docs-snapshots", trackingId],
    queryFn: () => fetchGuideDocsSnapshots(trackingId, 2),
    staleTime: 0,
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerGuideDocsScrape,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guide-docs-snapshots", trackingId] });
      queryClient.invalidateQueries({ queryKey: ["guide-docs-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["changes-latest"] });
    },
    onError: (error) => {
      console.error("[GuideDocsScrapeNow] Error:", error);
    },
  });

  const updateUrlMutation = useMutation({
    mutationFn: ({ id, url }) => updateGuideDocsTracking(id, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guide-docs-trackings"] });
      setUrlEditing(false);
    },
  });

  const latest = snapshots[0] || null;
  const navData = latest?.navData || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{tracking?.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-sm">
              {tracking?.url}
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
            Last scraped: {new Date(latest.createdAt).toLocaleString()} · {navData.length} sections
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
        ) : navData.length > 0 ? (
          <div className="space-y-1">
            {navData.map((item, idx) => (
              <NavTreeItem key={idx} item={item} level={0} diff={latest?.diff} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileSearch className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-semibold">No nav data yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Scrape Now&quot; to fetch guide docs navigation.
            </p>
          </div>
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

        <div className="mt-6 border-t pt-4">
          <p className="text-sm font-medium mb-2">Update guide URL</p>
          {urlEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUrlMutation.mutate({ id: trackingId, url: urlInput });
              }}
              className="flex gap-2"
            >
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 rounded-md border border-input px-3 py-1.5 text-sm"
                required
              />
              <Button type="submit" size="sm" disabled={updateUrlMutation.isPending}>
                {updateUrlMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setUrlInput(tracking?.url || ""); setUrlEditing(false); }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground truncate max-w-sm">{tracking?.url}</span>
              <Button size="sm" variant="outline" onClick={() => setUrlEditing(true)}>
                Edit
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NavTreeItem({ item, level, diff }) {
  const indent = level * 16;

  const isAdded = diff?.added?.some((a) => a.label === item.label);
  const isRemoved = diff?.removed?.some((r) => r.label === item.label);

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 text-sm rounded px-2 ${
          isAdded ? "bg-diff-add text-diff-add-foreground" : isRemoved ? "bg-diff-remove text-diff-remove-foreground line-through" : "hover:bg-muted/50"
        }`}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {item.children?.length > 0 && (
          <span className="text-muted-foreground text-xs">▸</span>
        )}
        <span className="font-medium">{item.label}</span>
        {item.url && (
          <span className="text-xs text-muted-foreground truncate max-w-xs">{item.url}</span>
        )}
        {item.children?.length > 0 && (
          <span className="text-xs text-muted-foreground">({item.children.length})</span>
        )}
      </div>
      {item.children?.map((child, idx) => (
        <NavTreeItem key={idx} item={child} level={level + 1} diff={diff} />
      ))}
    </div>
  );
}
