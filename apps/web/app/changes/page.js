"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRecentChanges } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChangesPage() {
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["changes"],
    queryFn: fetchRecentChanges,
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Change History</h1>

      {changes.length === 0 && (
        <p className="text-muted-foreground">No changes detected yet.</p>
      )}

      {changes.map((change) => (
        <Card key={change.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {change.competitor?.name} - {change.fieldName}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {new Date(change.createdAt).toLocaleString()}
              </span>
            </div>
            {change.diffSummary && (
              <p className="text-sm text-muted-foreground">{change.diffSummary}</p>
            )}
          </CardHeader>
          <CardContent>
            {change.diff && (
              <pre className="rounded-md bg-muted p-4 text-sm overflow-x-auto whitespace-pre-wrap">
                {change.diff.split("\n").map((line, i) => (
                  <span
                    key={i}
                    className={
                      line.startsWith("+ ")
                        ? "text-diff-add-foreground"
                        : line.startsWith("- ")
                        ? "text-diff-remove-foreground"
                        : ""
                    }
                  >
                    {line}
                    {"\n"}
                  </span>
                ))}
              </pre>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
