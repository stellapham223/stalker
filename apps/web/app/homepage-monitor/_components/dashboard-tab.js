"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchHomepageDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardTab() {
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ["homepage-dashboard"],
    queryFn: fetchHomepageDashboard,
  });

  if (isLoading) return <p>Loading dashboard...</p>;

  if (timeline.length === 0) {
    return (
      <p className="text-muted-foreground">
        No scrape data yet. Run &quot;Scrape All&quot; to start collecting data.
      </p>
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
                        <HomepageDiffSummary diff={row.changes} />
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

function HomepageDiffSummary({ diff }) {
  const added = diff.added || [];
  const removed = diff.removed || [];

  const parts = [];
  if (diff.addedCount) parts.push(`+${diff.addedCount} lines added`);
  if (diff.removedCount) parts.push(`-${diff.removedCount} lines removed`);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
      <div className="space-y-0.5 text-xs">
        {added.slice(0, 3).map((line, i) => (
          <div key={`a-${i}`}>
            <span className="text-diff-add-foreground truncate block max-w-sm">+ {line}</span>
          </div>
        ))}
        {removed.slice(0, 3).map((line, i) => (
          <div key={`r-${i}`}>
            <span className="text-diff-remove-foreground truncate block max-w-sm">- {line}</span>
          </div>
        ))}
        {(added.length > 3 || removed.length > 3) && (
          <span className="text-muted-foreground">...and more</span>
        )}
      </div>
    </div>
  );
}
