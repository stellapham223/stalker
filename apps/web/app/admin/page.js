"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

  const authHeaders = session?.user?.email
    ? { "x-user-email": session.user.email }
    : {};

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () =>
      fetch(`${API_URL}/api/admin/users`, {
        credentials: "include",
        headers: authHeaders,
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch users");
        return r.json();
      }),
    enabled: !!session?.user?.email,
  });

  const addUser = useMutation({
    mutationFn: (email) =>
      fetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ email }),
      }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || "Failed");
        }
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEmailInput("");
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, updates }) =>
      fetch(`${API_URL}/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify(updates),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id) =>
      fetch(`${API_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const importUsers = useMutation({
    mutationFn: (emails) =>
      fetch(`${API_URL}/api/admin/users/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ emails }),
      }).then((r) => r.json()),
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

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-destructive">Error: {error.message}</p>;

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-3xl font-bold">User Management</h1>

      {/* Add single email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thêm người dùng</CardTitle>
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
              {addUser.isPending ? "Đang thêm..." : "Thêm"}
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
              {showCsv ? "Ẩn" : "Import nhiều email (CSV)"}
            </button>

            {showCsv && (
              <div className="mt-3 space-y-2">
                <textarea
                  className="w-full rounded-md border border-input px-3 py-2 text-sm font-mono h-28 resize-none"
                  placeholder={"email1@example.com\nemail2@example.com\nhoặc phân cách bằng dấu phẩy/chấm phẩy"}
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
                    Chọn file CSV
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
                    {importUsers.isPending ? "Đang import..." : "Import"}
                  </Button>
                </div>
                {importResult && (
                  <p className="text-sm text-muted-foreground">
                    Đã thêm {importResult.created}/{importResult.total} email
                    {importResult.failed > 0 && ` (${importResult.failed} lỗi/trùng)`}
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
          <CardTitle className="text-base">{users.length} người dùng</CardTitle>
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
                        <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
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
                        onClick={() => {
                          if (confirm(`Xóa "${user.email}"?`)) deleteUser.mutate(user.id);
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Chưa có user nào. Thêm email ở trên.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
