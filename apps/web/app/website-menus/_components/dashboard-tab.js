"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchWebsiteMenuDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

export function DashboardTab() {
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ["menu-dashboard"],
    queryFn: fetchWebsiteMenuDashboard,
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
          Click &quot;Scrape All&quot; above to start collecting website menu data.
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
                  <th className="text-left p-2 w-40">Website</th>
                  <th className="text-left p-2">Changes</th>
                </tr>
              </thead>
              <tbody>
                {session.rows.map((row) => (
                  <tr key={row.trackingId} className="border-b hover:bg-muted/50 align-top">
                    <td className="p-2 font-medium w-40">{row.name}</td>
                    <td className="p-2">
                      {row.changes === null ? (
                        <span className="text-muted-foreground italic text-xs">Not scraped</span>
                      ) : Array.isArray(row.changes) && row.changes.length === 0 ? (
                        <span className="text-muted-foreground italic text-xs">No changes</span>
                      ) : (
                        <MenuDiffSummary diff={row.changes} />
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

function MenuDiffSummary({ diff }) {
  const added = diff.added || [];
  const removed = diff.removed || [];
  const renamed = diff.renamed || [];
  const childrenChanged = diff.childrenChanged || [];

  const parts = [];
  if (added.length) parts.push(`+${added.length} menus added`);
  if (removed.length) parts.push(`-${removed.length} menus removed`);
  if (renamed.length) parts.push(`${renamed.length} menus renamed`);
  if (childrenChanged.length) parts.push(`${childrenChanged.length} menus updated`);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
      <div className="space-y-0.5 text-xs">
        {added.map((a, i) => (
          <div key={`a-${i}`}><span className="text-diff-add-foreground">+ {a.label}</span></div>
        ))}
        {removed.map((r, i) => (
          <div key={`r-${i}`}><span className="text-diff-remove-foreground">- {r.label}</span></div>
        ))}
        {renamed.map((r, i) => (
          <div key={`rn-${i}`}>
            <span className="text-warning">~ {r.oldLabel} → {r.newLabel}</span>
          </div>
        ))}
        {childrenChanged.map((c, i) => (
          <div key={`c-${i}`}>
            <span className="text-warning">~ {c.parentLabel}:</span>
            {c.addedChildren?.map((a, j) => (
              <span key={`ca-${j}`} className="text-diff-add-foreground ml-1">+{a}</span>
            ))}
            {c.removedChildren?.map((r, j) => (
              <span key={`cr-${j}`} className="text-diff-remove-foreground ml-1">-{r}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
