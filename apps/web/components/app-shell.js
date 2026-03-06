"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Chưa hydrate — giữ layout tránh flash
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 border-r bg-card shrink-0" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    );
  }

  if (!session) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar session={session} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
