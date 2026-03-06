import { fetchJSON, postJSON, deleteJSON } from "./client";

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
