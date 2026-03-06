import { fetchJSON, postJSON } from "./client";

export function fetchCompetitors() {
  return fetchJSON("/api/competitors");
}

export function fetchCompetitor(id) {
  return fetchJSON(`/api/competitors/${id}`);
}

export function createCompetitor(data) {
  return postJSON("/api/competitors", data);
}

export function triggerScrape(competitorId) {
  return postJSON(`/api/jobs/scrape/${competitorId}`);
}

export function triggerScrapeAll() {
  return postJSON("/api/jobs/scrape-all");
}
