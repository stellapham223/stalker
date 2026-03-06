import { fetchJSON, postJSON, deleteJSON } from "./client";

export function fetchAutocompleteTrackings() {
  return fetchJSON("/api/autocomplete");
}

export function createAutocompleteTracking(data) {
  return postJSON("/api/autocomplete", data);
}

export function fetchAutocompleteLatest(trackingId) {
  return fetchJSON(`/api/autocomplete/${trackingId}/snapshots/latest`);
}

export function fetchAutocompleteSnapshots(trackingId) {
  return fetchJSON(`/api/autocomplete/${trackingId}/snapshots`);
}

export function fetchAutocompleteChanges(trackingId) {
  return fetchJSON(`/api/autocomplete/${trackingId}/changes`);
}

export function triggerAutocompleteScrape(trackingId) {
  return postJSON(`/api/autocomplete/${trackingId}/scrape`);
}

export function triggerAutocompleteScrapeAll() {
  return postJSON("/api/autocomplete/scrape-all");
}

export function deleteAutocompleteTracking(id) {
  return deleteJSON(`/api/autocomplete/${id}`);
}

export function fetchAutocompleteDashboard() {
  return fetchJSON("/api/autocomplete/dashboard");
}
