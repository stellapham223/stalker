import { getSession } from "next-auth/react";

const API_URL = "";

export async function getAuthHeaders() {
  const session = await getSession();
  const email = session?.user?.email;
  const authToken = session?.user?.authToken;
  if (!email || !authToken) return {};
  return { "x-user-email": email, "x-auth-token": authToken };
}

export async function fetchJSON(path) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function deleteJSON(path) {
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

export async function postJSON(path, body) {
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

export { API_URL };
