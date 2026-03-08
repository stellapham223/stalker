import { fetchJSON, postJSON, deleteJSON, getAuthHeaders, API_URL } from "./client";

export function fetchGuideDocsTrackings() {
  return fetchJSON("/api/guide-docs");
}

export function createGuideDocsTracking(data) {
  return postJSON("/api/guide-docs", data);
}

export async function updateGuideDocsTracking(id, data) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/guide-docs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function deleteGuideDocsTracking(id) {
  return deleteJSON(`/api/guide-docs/${id}`);
}

export function fetchGuideDocsSnapshots(trackingId, limit = 2) {
  return fetchJSON(`/api/guide-docs/${trackingId}/snapshots?limit=${limit}`);
}

export function triggerGuideDocsScrape(trackingId) {
  return postJSON(`/api/guide-docs/${trackingId}/scrape`);
}

export function triggerGuideDocsScrapeAll() {
  return postJSON("/api/guide-docs/scrape-all");
}

export function fetchGuideDocsDashboard() {
  return fetchJSON("/api/guide-docs/dashboard");
}
