"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRecentChanges, fetchCompetitors } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data: competitors = [] } = useQuery({
    queryKey: ["competitors"],
    queryFn: fetchCompetitors,
  });

  const { data: changes = [] } = useQuery({
    queryKey: ["changes"],
    queryFn: fetchRecentChanges,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tracked Competitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Monitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competitors.filter((c) => c.active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{changes.length}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Changes</h2>
        <div className="space-y-3">
          {changes.map((change) => (
            <Card key={change.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{change.competitor?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {change.fieldName} - {change.diffSummary}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(change.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {changes.length === 0 && (
            <p className="text-muted-foreground">No changes detected yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
