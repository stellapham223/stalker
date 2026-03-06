"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, AppWindow, Search, Type, Menu, FileText, BookOpen, Settings, LogOut } from "lucide-react";
import { useChangesBadge } from "@/hooks/useChangesBadge";

const navItems = [
  { href: "/",                 label: "Dashboard",        icon: LayoutDashboard, featureKey: null,           permKey: null },
  { href: "/app-listing",      label: "App Listing",      icon: AppWindow,       featureKey: "appListing",   permKey: "appListing" },
  { href: "/keyword-rankings", label: "Keyword Rankings", icon: Search,          featureKey: "keywords",     permKey: "keywordRankings" },
  { href: "/autocomplete",     label: "Autocomplete",     icon: Type,            featureKey: "autocomplete", permKey: "autocomplete" },
  { href: "/website-menus",    label: "Website Menus",    icon: Menu,            featureKey: "websiteMenus", permKey: "websiteMenus" },
  { href: "/homepage-monitor", label: "Homepage Monitor", icon: FileText,        featureKey: "homepage",     permKey: "homepageMonitor" },
  { href: "/guide-docs",       label: "Guide Docs",       icon: BookOpen,        featureKey: "guideDocs",    permKey: "guideDocs" },
];

export function Sidebar({ session }) {
  const pathname = usePathname();
  const { getFeatureBadge } = useChangesBadge();

  const { data: freshInfo } = useQuery({
    queryKey: ["me-permissions"],
    queryFn: () => fetch("/api/me/permissions", { cache: "no-store" }).then((r) => r.json()),
    enabled: !!session?.user?.email,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    initialData: session?.user
      ? { isAdmin: session.user.isAdmin, permissions: session.user.permissions ?? {} }
      : undefined,
    initialDataUpdatedAt: 0, // treat as stale so it always fetches fresh immediately
  });

  const permissions = freshInfo?.permissions ?? {};
  const isAdmin = freshInfo?.isAdmin ?? false;

  const hasAnyPermission = Object.keys(permissions).length > 0;
  const visibleItems = navItems.filter((item) => {
    if (item.permKey === null) return true;
    if (!hasAnyPermission) return true; // new user: show all until permissions load
    return permissions[item.permKey] !== false;
  });

  return (
    <aside className="w-64 border-r bg-card p-4 flex flex-col h-screen sticky top-0">
      <div className="mb-8">
        <h2 className="text-lg font-bold">Competitor Stalker</h2>
        <p className="text-sm text-muted-foreground">Monitor competitor changes</p>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const badgeCount = item.featureKey ? getFeatureBadge(item.featureKey) : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {isAdmin && (
        <Link
          href="/admin"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mt-2 ${
            pathname === "/admin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Admin</span>
        </Link>
      )}

      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-muted-foreground truncate mb-2 px-1">
          {session?.user?.email}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
