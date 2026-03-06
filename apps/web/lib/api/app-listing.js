import { fetchJSON, postJSON, deleteJSON } from "./client";

export function fetchAppListingCompetitors() {
  return fetchJSON("/api/app-listing");
}

export function createAppListingCompetitor(data) {
  return postJSON("/api/app-listing", data);
}

export function deleteAppListingCompetitor(id) {
  return deleteJSON(`/api/app-listing/${id}`);
}

export function fetchAppListingSnapshots(competitorId, limit = 2) {
  return fetchJSON(`/api/app-listing/${competitorId}/snapshots?limit=${limit}`);
}

export function triggerAppListingScrape(competitorId) {
  return postJSON(`/api/app-listing/${competitorId}/scrape`);
}

export function triggerAppListingScrapeAll() {
  return postJSON("/api/app-listing/scrape-all");
}

export function fetchAppListingDashboard() {
  return fetchJSON("/api/app-listing/dashboard");
}
