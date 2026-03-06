import { getSession } from "next-auth/react";

const API_URL = "";

async function getAuthHeaders() {
  const session = await getSession();
  const email = session?.user?.email;
  return email ? { "x-user-email": email } : {};
}

async function fetchJSON(path) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function deleteJSON(path) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

async function postJSON(path, body) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function fetchCompetitors() {
  return fetchJSON("/api/competitors");
}

export function fetchCompetitor(id) {
  return fetchJSON(`/api/competitors/${id}`);
}

export function createCompetitor(data) {
  return postJSON("/api/competitors", data);
}

export function fetchRecentChanges() {
  return fetchJSON("/api/snapshots/changes/recent");
}

export function fetchSnapshots({ competitorId, fieldName } = {}) {
  const params = new URLSearchParams();
  if (competitorId) params.set("competitorId", competitorId);
  if (fieldName) params.set("fieldName", fieldName);
  return fetchJSON(`/api/snapshots?${params.toString()}`);
}

export function triggerScrape(competitorId) {
  return postJSON(`/api/jobs/scrape/${competitorId}`);
}

export function triggerScrapeAll() {
  return postJSON("/api/jobs/scrape-all");
}

// ============ Keywords ============
export function fetchKeywords() {
  return fetchJSON("/api/keywords");
}

export function createKeyword(data) {
  return postJSON("/api/keywords", data);
}

export function fetchKeywordLatest(keywordId) {
  return fetchJSON(`/api/keywords/${keywordId}/snapshots/latest`);
}

export function fetchKeywordSnapshots(keywordId, limit = 2) {
  return fetchJSON(`/api/keywords/${keywordId}/snapshots?limit=${limit}`);
}

export function fetchKeywordChanges(keywordId) {
  return fetchJSON(`/api/keywords/${keywordId}/changes`);
}

export function triggerKeywordScrape(keywordId) {
  return postJSON(`/api/keywords/${keywordId}/scrape`);
}

export function triggerKeywordScrapeAll() {
  return postJSON("/api/keywords/scrape-all");
}

export function deleteKeyword(id) {
  return deleteJSON(`/api/keywords/${id}`);
}

export function fetchKeywordDashboard() {
  return fetchJSON("/api/keywords/dashboard");
}

// ============ Autocomplete ============
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

// ============ App Listing ============
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

// ============ Website Menus ============
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

// ============ Homepage ============
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

// ============ Guide Docs ============
export function fetchGuideDocsTrackings() {
  return fetchJSON("/api/guide-docs");
}

export function createGuideDocsTracking(data) {
  return postJSON("/api/guide-docs", data);
}

export function updateGuideDocsTracking(id, data) {
  return fetch(`${API_URL}/api/guide-docs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then((r) => r.json());
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

export function fetchLatestChanges() {
  return fetchJSON("/api/changes/latest");
}
