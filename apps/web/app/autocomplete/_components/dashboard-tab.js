"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchAutocompleteDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

export function DashboardTab() {
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ["autocomplete-dashboard"],
    queryFn: fetchAutocompleteDashboard,
  });

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="text-sm font-semibold">No scrape data yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Click &quot;Scrape All&quot; above to start collecting autocomplete data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {timeline.map((session, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {new Date(session.createdAt).toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 w-40">Query</th>
                  <th className="text-left p-2">Changes</th>
                </tr>
              </thead>
              <tbody>
                {session.rows.map((row) => (
                  <tr key={row.trackingId} className="border-b hover:bg-muted/50 align-top">
                    <td className="p-2 font-medium w-40">&quot;{row.query}&quot;</td>
                    <td className="p-2">
                      {row.changes === null ? (
                        <span className="text-muted-foreground italic text-xs">Not scraped</span>
                      ) : Array.isArray(row.changes) && row.changes.length === 0 ? (
                        <span className="text-muted-foreground italic text-xs">No changes</span>
                      ) : (
                        <AutocompleteDiffSummary diff={row.changes} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AutocompleteDiffSummary({ diff }) {
  const added = diff.added || [];
  const removed = diff.removed || [];
  const reordered = diff.reordered || [];

  const parts = [];
  if (added.length) parts.push(`+${added.length} suggestions added`);
  if (removed.length) parts.push(`-${removed.length} suggestions removed`);
  if (reordered.length) parts.push(`${reordered.length} reordered`);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
      <div className="space-y-0.5 text-xs">
        {added.map((s, i) => (
          <div key={`a-${i}`}><span className="text-diff-add-foreground">+ {s}</span></div>
        ))}
        {removed.map((s, i) => (
          <div key={`r-${i}`}><span className="text-diff-remove-foreground">- {s}</span></div>
        ))}
        {reordered.map((r, i) => (
          <div key={`o-${i}`}>
            <span className="text-warning">↕ {r.suggestion} (#{r.oldPosition} → #{r.newPosition})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
