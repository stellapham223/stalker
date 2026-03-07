"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getAuthHeaders, fetchJSON, postJSON, deleteJSON } from "@/lib/api/client";

const PAGE_KEYS = [
  { key: "appListing", label: "App Listing" },
  { key: "keywordRankings", label: "Keywords" },
  { key: "autocomplete", label: "Autocomplete" },
  { key: "websiteMenus", label: "Menus" },
  { key: "homepageMonitor", label: "Homepage" },
  { key: "guideDocs", label: "Guide Docs" },
];

export default function AdminPage() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [emailInput, setEmailInput] = useState("");
  const [csvText, setCsvText] = useState("");
  const [showCsv, setShowCsv] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchJSON("/api/admin/users"),
    enabled: !!session?.user?.email,
  });

  const addUser = useMutation({
    mutationFn: async (email) => {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders["x-auth-token"]) throw new Error("Session expired — please refresh the page");
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Server error (${res.status}) — backend may not be running`);
      }
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEmailInput("");
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, updates }) => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id) => deleteJSON(`/api/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const importUsers = useMutation({
    mutationFn: (emails) => postJSON("/api/admin/users/import", { emails }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setImportResult(data);
      setCsvText("");
    },
  });

  const handleAddEmail = (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;
    addUser.mutate(email);
  };

  const handleCsvImport = () => {
    const emails = csvText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    if (emails.length === 0) return;
    importUsers.mutate(emails);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  if (isLoading) return (
    <div className="space-y-6 max-w-6xl">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
  if (error) return <p className="p-6 text-destructive">Error: {error.message}</p>;

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-3xl font-bold">User Management</h1>

      {/* Add single email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddEmail} className="flex gap-3">
            <input
              type="email"
              placeholder="user@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
              required
            />
            <Button type="submit" disabled={addUser.isPending}>
              {addUser.isPending ? "Adding..." : "Add"}
            </Button>
          </form>
          {addUser.isError && (
            <p className="mt-2 text-sm text-destructive">{addUser.error.message}</p>
          )}

          {/* CSV Import */}
          <div className="mt-4 border-t pt-4">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setShowCsv(!showCsv)}
            >
              {showCsv ? "Hide" : "Bulk import (CSV)"}
            </button>

            {showCsv && (
              <div className="mt-3 space-y-2">
                <textarea
                  className="w-full rounded-md border border-input px-3 py-2 text-sm font-mono h-28 resize-none"
                  placeholder={"email1@example.com\nemail2@example.com\nSeparate with newlines, commas, or semicolons"}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose CSV File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCsvImport}
                    disabled={importUsers.isPending || !csvText.trim()}
                  >
                    {importUsers.isPending ? "Importing..." : "Import"}
                  </Button>
                </div>
                {importResult && (
                  <p className="text-sm text-muted-foreground">
                    Added {importResult.created}/{importResult.total} emails
                    {importResult.failed > 0 && ` (${importResult.failed} failed/duplicate)`}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{users.length} Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-3 py-3 text-center font-medium text-xs">Admin</th>
                  {PAGE_KEYS.map((p) => (
                    <th key={p.key} className="px-2 py-3 text-center font-medium text-xs whitespace-nowrap">
                      {p.label}
                    </th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium">{user.email}</span>
                      {user.isAdmin && (
                        <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          admin
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={user.isAdmin}
                        onChange={(e) =>
                          updateUser.mutate({ id: user.id, updates: { isAdmin: e.target.checked } })
                        }
                        className="h-4 w-4 cursor-pointer"
                      />
                    </td>
                    {PAGE_KEYS.map((p) => (
                      <td key={p.key} className="px-2 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={user[p.key]}
                          onChange={(e) =>
                            updateUser.mutate({ id: user.id, updates: { [p.key]: e.target.checked } })
                          }
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-xs text-destructive hover:underline"
                        onClick={() => setDeleteTarget(user)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No users yet. Add an email above to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.email}"?`}
        description="This will permanently remove this user and revoke their access."
        onConfirm={() => {
          deleteUser.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
