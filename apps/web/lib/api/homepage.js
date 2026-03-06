import { fetchJSON, postJSON, deleteJSON } from "./client";

export function fetchHomepageTrackings() {
  return fetchJSON("/api/homepage");
}

export function createHomepageTracking(data) {
  return postJSON("/api/homepage", data);
}

export function deleteHomepageTracking(id) {
  return deleteJSON(`/api/homepage/${id}`);
}

export function fetchHomepageSnapshots(trackingId, limit = 2) {
  return fetchJSON(`/api/homepage/${trackingId}/snapshots?limit=${limit}`);
}

export function fetchHomepageLatest(trackingId) {
  return fetchJSON(`/api/homepage/${trackingId}/snapshots/latest`);
}

export function fetchHomepageChanges(trackingId) {
  return fetchJSON(`/api/homepage/${trackingId}/changes`);
}

export function triggerHomepageScrape(trackingId) {
  return postJSON(`/api/homepage/${trackingId}/scrape`);
}

export function triggerHomepageScrapeAll() {
  return postJSON("/api/homepage/scrape-all");
}

export function fetchHomepageDashboard() {
  return fetchJSON("/api/homepage/dashboard");
}
