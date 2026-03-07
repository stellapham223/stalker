"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["changes-latest"],
    queryFn: fetchLatestChanges,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  /**
   * Returns change count for a specific item if not yet seen.
   * Compares per-item snapshotAt with user's seenAt timestamp.
   */
  function getBadge(featureKey, itemId) {
    if (!data?.features) return 0;
    const items = data.features[featureKey];
    if (!items) return 0;
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.hasChanges || item.changeCount === 0) return 0;

    const seenAt = getSeenAt(featureKey, itemId);
    if (seenAt && item.snapshotAt && seenAt >= item.snapshotAt) return 0;

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
      if (seenAt && item.snapshotAt && seenAt >= item.snapshotAt) return sum;
      return sum + item.changeCount;
    }, 0);
  }

  /**
   * Mark an item as seen — hides its badge.
   * Stores current time so badge reappears only for newer changes.
   */
  function markSeen(featureKey, itemId) {
    if (typeof window === "undefined") return;
    localStorage.setItem(getSeenKey(featureKey, itemId), new Date().toISOString());
    // Touch the cache to force re-render in all consumers (e.g. sidebar badge)
    queryClient.setQueryData(["changes-latest"], (old) => (old ? { ...old } : old));
  }

  return { getBadge, getFeatureBadge, markSeen, data };
}
