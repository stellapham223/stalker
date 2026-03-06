"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchKeywordDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardTab() {
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ["keyword-dashboard"],
    queryFn: fetchKeywordDashboard,
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
                  <th className="text-left p-2 w-40">Keyword</th>
                  <th className="text-left p-2">Changes</th>
                </tr>
              </thead>
              <tbody>
                {session.rows.map((row) => (
                  <tr key={row.keywordId} className="border-b hover:bg-muted/50 align-top">
                    <td className="p-2 font-medium w-40">&quot;{row.keyword}&quot;</td>
                    <td className="p-2">
                      {row.changes === null ? (
                        <span className="text-muted-foreground italic text-xs">Not scraped</span>
                      ) : Array.isArray(row.changes) && row.changes.length === 0 ? (
                        <span className="text-muted-foreground italic text-xs">No changes</span>
                      ) : (
                        <KeywordChangeSummary changes={row.changes} />
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

function KeywordChangeSummary({ changes }) {
  const { newEntries = [], droppedEntries = [], positionChanges = [] } = changes;

  const parts = [];
  if (newEntries.length) parts.push(`+${newEntries.length} entered top`);
  if (droppedEntries.length) parts.push(`-${droppedEntries.length} dropped out`);
  if (positionChanges.length) parts.push(`${positionChanges.length} position changes`);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
      <div className="space-y-0.5 text-xs">
        {newEntries.map((entry, i) => (
          <div key={`new-${i}`}>
            <span className="text-green-600">+ #{entry.position} {entry.appName}</span>
          </div>
        ))}
        {droppedEntries.map((entry, i) => (
          <div key={`drop-${i}`}>
            <span className="text-red-500">- {entry.appName} (was #{entry.position})</span>
          </div>
        ))}
        {positionChanges.map((entry, i) => {
          const diff = entry.oldPosition - entry.newPosition;
          return (
            <div key={`pos-${i}`}>
              <span className={diff > 0 ? "text-green-600" : "text-red-500"}>
                {diff > 0 ? "↑" : "↓"} {entry.appName}: #{entry.oldPosition} → #{entry.newPosition}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
