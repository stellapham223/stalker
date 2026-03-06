"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAppListingSnapshots, triggerAppListingScrape } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeScreenshots, diffScreenshots } from "./dashboard-tab";

export function CompetitorDetail({ competitorId, competitorName }) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["app-listing-snapshots", competitorId],
    queryFn: () => fetchAppListingSnapshots(competitorId, 2),
  });

  const scrapeMutation = useMutation({
    mutationFn: triggerAppListingScrape,
    onSuccess: () => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["app-listing-snapshots", competitorId] });
        queryClient.invalidateQueries({ queryKey: ["app-listing-dashboard"] });
        if (attempts >= 10) clearInterval(poll);
      }, 3000);
    },
  });

  const latest = snapshots[0] || null;
  const previous = snapshots[1] || null;
  const data = latest?.data || {};
  const prevData = previous?.data || {};

  const FIELDS = [
    { key: "title", label: "App Title" },
    { key: "subtitle", label: "Subtitle" },
    { key: "screenshots", label: "Feature Screenshots" },
    { key: "videos", label: "Videos" },
    { key: "appDetails", label: "App Details" },
    { key: "languages", label: "Languages" },
    { key: "worksWith", label: "Works With" },
    { key: "categories", label: "Categories" },
    { key: "pricing", label: "Pricing" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{competitorName}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrapeMutation.mutate(competitorId)}
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
          <p>Loading snapshots...</p>
        ) : !latest ? (
          <p className="text-muted-foreground">
            No data yet. Click &quot;Scrape Now&quot; to fetch the app listing.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 w-40">App Info</th>
                  <th className="text-left p-2">Detail</th>
                  <th className="text-left p-2 w-72">Changes</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((field) => (
                  <FieldRow
                    key={field.key}
                    label={field.label}
                    current={data[field.key]}
                    prev={prevData[field.key]}
                    hasPrevious={!!previous}
                    fieldKey={field.key}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, current, prev, hasPrevious, fieldKey }) {
  const isArray = Array.isArray(current);
  const isPricing = fieldKey === "pricing";
  const isScreenshots = fieldKey === "screenshots";

  const formatValue = (val) => {
    if (val === null || val === undefined) return "-";
    if (isPricing && Array.isArray(val)) {
      return val.map((p, i) => (
        <div key={i} className="mb-1">
          <span className="font-medium">{p.heading}</span>
          {p.cardText && <span className="ml-1 text-muted-foreground text-xs">- {p.cardText.substring(0, 120)}</span>}
        </div>
      ));
    }
    if (isScreenshots && Array.isArray(val)) {
      return val.length > 0
        ? val.map((s, i) => (
            <div key={i} className="text-xs">
              {i + 1}. {typeof s === "string" ? s : (s.alt || <span className="text-muted-foreground italic">no caption</span>)}
            </div>
          ))
        : "-";
    }
    if (isArray) {
      return val.length > 0 ? val.join(", ") : "-";
    }
    if (typeof val === "string") return val || "-";
    return JSON.stringify(val);
  };

  const computeChanges = () => {
    if (!hasPrevious) return <span className="text-muted-foreground">-</span>;
    if (prev === null || prev === undefined) {
      return <span className="text-muted-foreground">Initial scrape</span>;
    }

    const currStr = JSON.stringify(current);
    const prevStr = JSON.stringify(prev);

    if (currStr === prevStr) {
      return <span className="text-muted-foreground italic">No changes</span>;
    }

    if (Array.isArray(current) && Array.isArray(prev)) {
      if (isPricing) {
        return <PricingDiff current={current} prev={prev} />;
      }
      if (isScreenshots) {
        return <ScreenshotsDiff current={current} prev={prev} />;
      }
      const currSet = new Set(current);
      const prevSet = new Set(prev);
      const added = current.filter((x) => !prevSet.has(x));
      const removed = prev.filter((x) => !currSet.has(x));
      return (
        <div className="space-y-0.5">
          {added.map((x, i) => (
            <div key={`a-${i}`} className="text-green-600 text-xs">+ {x}</div>
          ))}
          {removed.map((x, i) => (
            <div key={`r-${i}`} className="text-red-600 text-xs">- {x}</div>
          ))}
          {added.length === 0 && removed.length === 0 && (
            <span className="text-yellow-600 text-xs">Order changed</span>
          )}
        </div>
      );
    }

    return (
      <div className="text-xs">
        <span className="text-red-600">Was: {typeof prev === "string" ? prev : JSON.stringify(prev)}</span>
      </div>
    );
  };

  return (
    <tr className="border-b hover:bg-muted/50 align-top">
      <td className="p-2 font-medium text-muted-foreground">{label}</td>
      <td className="p-2">{formatValue(current)}</td>
      <td className="p-2">{computeChanges()}</td>
    </tr>
  );
}

function ScreenshotsDiff({ current, prev }) {
  const { added, removed, captionChanged, unchanged } = diffScreenshots(prev, current);
  if (added.length === 0 && removed.length === 0 && captionChanged.length === 0) {
    return <span className="text-muted-foreground italic">No changes</span>;
  }
  return (
    <div className="space-y-0.5 text-xs">
      {removed.map((s, i) => <div key={`rm-${i}`}><span className="text-red-500">- {s.alt || s.url}</span></div>)}
      {added.map((s, i) => <div key={`add-${i}`}><span className="text-green-600">+ {s.alt || s.url}</span></div>)}
      {captionChanged.map((s, i) => {
        const oldCap = normalizeScreenshots(prev).find((o) => o.url === s.url)?.alt;
        return <div key={`cap-${i}`}><span className="text-red-500 line-through">{oldCap}</span>{" "}<span className="text-green-600">→ {s.alt}</span></div>;
      })}
      {unchanged.length > 0 && <div className="text-muted-foreground">{unchanged.length} unchanged</div>}
    </div>
  );
}

function PricingDiff({ current, prev }) {
  const changes = [];

  const currMap = new Map(current.map((p) => [p.heading, p]));
  const prevMap = new Map(prev.map((p) => [p.heading, p]));

  for (const [name, plan] of currMap) {
    const old = prevMap.get(name);
    if (!old) {
      changes.push(
        <div key={`new-${name}`} className="text-green-600 text-xs">
          + New plan: {name}
        </div>
      );
    } else if (JSON.stringify(plan) !== JSON.stringify(old)) {
      changes.push(
        <div key={`chg-${name}`} className="text-yellow-600 text-xs">
          ~ {name}: content changed
        </div>
      );
    }
  }

  for (const [name] of prevMap) {
    if (!currMap.has(name)) {
      changes.push(
        <div key={`rm-${name}`} className="text-red-600 text-xs">
          - Removed plan: {name}
        </div>
      );
    }
  }

  if (changes.length === 0) {
    return <span className="text-muted-foreground italic">No changes</span>;
  }

  return <div className="space-y-0.5">{changes}</div>;
}
