"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLatestChanges } from "@/lib/api";

const STORAGE_PREFIX = "stalker_seen_";

function getSeenKey(featureKey, itemId) {
  return `${STORAGE_PREFIX}${featureKey}_${itemId}`;
}

function getSeenAt(featureKey, itemId) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getSeenKey(featureKey, itemId));
}

export function useChangesBadge() {
  const { data } = useQuery({
    queryKey: ["changes-latest"],
    queryFn: fetchLatestChanges,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  /**
   * Returns change count for a specific item if not yet seen.
   * featureKey: "keywords" | "autocomplete" | "appListing" | "websiteMenus" | "homepage" | "guideDocs"
   */
  function getBadge(featureKey, itemId) {
    if (!data?.features) return 0;
    const items = data.features[featureKey];
    if (!items) return 0;
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.hasChanges || item.changeCount === 0) return 0;

    const seenAt = getSeenAt(featureKey, itemId);
    if (seenAt && data.sessionAt && seenAt >= data.sessionAt) return 0;

    return item.changeCount;
  }

  /**
   * Returns total unseen change count for a whole feature (for sidebar badge).
   */
  function getFeatureBadge(featureKey) {
    if (!data?.features) return 0;
    const items = data.features[featureKey];
    if (!items) return 0;
    return items.reduce((sum, item) => {
      if (!item.hasChanges || item.changeCount === 0) return sum;
      const seenAt = getSeenAt(featureKey, item.id);
      if (seenAt && data.sessionAt && seenAt >= data.sessionAt) return sum;
      return sum + item.changeCount;
    }, 0);
  }

  /**
   * Mark an item as seen — hides its badge.
   */
  function markSeen(featureKey, itemId) {
    if (typeof window === "undefined") return;
    const sessionAt = data?.sessionAt || new Date().toISOString();
    localStorage.setItem(getSeenKey(featureKey, itemId), sessionAt);
  }

  return { getBadge, getFeatureBadge, markSeen, data };
}
