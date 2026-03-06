import { fetchJSON, postJSON, deleteJSON } from "./client";

export function fetchWebsiteMenus() {
  return fetchJSON("/api/website-menus");
}

export function createWebsiteMenu(data) {
  return postJSON("/api/website-menus", data);
}

export function deleteWebsiteMenu(id) {
  return deleteJSON(`/api/website-menus/${id}`);
}

export function fetchWebsiteMenuSnapshots(trackingId, limit = 2) {
  return fetchJSON(`/api/website-menus/${trackingId}/snapshots?limit=${limit}`);
}

export function fetchWebsiteMenuLatest(trackingId) {
  return fetchJSON(`/api/website-menus/${trackingId}/snapshots/latest`);
}

export function fetchWebsiteMenuChanges(trackingId) {
  return fetchJSON(`/api/website-menus/${trackingId}/changes`);
}

export function triggerWebsiteMenuScrape(trackingId) {
  return postJSON(`/api/website-menus/${trackingId}/scrape`);
}

export function triggerWebsiteMenuScrapeAll() {
  return postJSON("/api/website-menus/scrape-all");
}

export function fetchWebsiteMenuDashboard() {
  return fetchJSON("/api/website-menus/dashboard");
}
