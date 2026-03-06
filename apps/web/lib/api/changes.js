import { fetchJSON } from "./client";

export function fetchRecentChanges() {
  return fetchJSON("/api/snapshots/changes/recent");
}

export function fetchLatestChanges() {
  return fetchJSON("/api/changes/latest");
}
