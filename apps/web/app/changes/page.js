"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRecentChanges } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

export default function ChangesPage() {
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["changes"],
    queryFn: fetchRecentChanges,
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Change History</h1>

      {changes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-semibold">No changes detected yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Changes will appear here after you run scrapes on your tracked items.
          </p>
        </div>
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
