const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchJSON(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJSON(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
