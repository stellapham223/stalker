"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchGuideDocsDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardTab() {
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ["guide-docs-dashboard"],
    queryFn: fetchGuideDocsDashboard,
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
                  <th className="text-left p-2 w-40">Competitor</th>
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
                        <NavDiffSummary diff={row.changes} />
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

function NavDiffSummary({ diff }) {
  const added = diff.added || [];
  const removed = diff.removed || [];
  const renamed = diff.renamed || [];
  const childrenChanged = diff.childrenChanged || [];

  const parts = [];
  if (added.length) parts.push(`+${added.length} sections added`);
  if (removed.length) parts.push(`-${removed.length} sections removed`);
  if (renamed.length) parts.push(`${renamed.length} sections renamed`);
  if (childrenChanged.length) parts.push(`${childrenChanged.length} sections updated`);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
      <div className="space-y-0.5 text-xs">
        {added.map((a, i) => (
          <div key={`a-${i}`}><span className="text-green-600">+ {a.label}</span></div>
        ))}
        {removed.map((r, i) => (
          <div key={`r-${i}`}><span className="text-red-500">- {r.label}</span></div>
        ))}
        {renamed.map((r, i) => (
          <div key={`rn-${i}`}>
            <span className="text-yellow-600">~ {r.oldLabel} → {r.newLabel}</span>
          </div>
        ))}
        {childrenChanged.map((c, i) => (
          <div key={`c-${i}`}>
            <span className="text-yellow-600">~ {c.parentLabel}:</span>
            {c.addedChildren?.map((a, j) => (
              <span key={`ca-${j}`} className="text-green-600 ml-1">+{a}</span>
            ))}
            {c.removedChildren?.map((r, j) => (
              <span key={`cr-${j}`} className="text-red-500 ml-1">-{r}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
