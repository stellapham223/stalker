import { fetchJSON } from "./client";

export function fetchSnapshots({ competitorId, fieldName } = {}) {
  const params = new URLSearchParams();
  if (competitorId) params.set("competitorId", competitorId);
  if (fieldName) params.set("fieldName", fieldName);
  return fetchJSON(`/api/snapshots?${params.toString()}`);
}
