import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PERMISSION_MAP = {
  "/app-listing": "appListing",
  "/keyword-rankings": "keywordRankings",
  "/autocomplete": "autocomplete",
  "/website-menus": "websiteMenus",
  "/homepage-monitor": "homepageMonitor",
  "/guide-docs": "guideDocs",
};

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session;
  const path = nextUrl.pathname;

  // Always allow API routes (proxied to backend) and NextAuth routes
  if (path.startsWith("/api/")) return NextResponse.next();

  // Redirect logged-in users away from login page
  if (path === "/login") {
    if (isLoggedIn) return NextResponse.redirect(new URL("/", nextUrl));
    return NextResponse.next();
  }

  // Unauthorized page is always accessible (to show the message)
  if (path === "/unauthorized") return NextResponse.next();

  // All other pages require login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // User was deleted from allowed list — force sign out
  if (session.user?.revoked) {
    const res = NextResponse.redirect(new URL("/login", nextUrl));
    // Clear the session cookie so NextAuth doesn't restore it
    res.cookies.delete("__Secure-authjs.session-token");
    res.cookies.delete("authjs.session-token");
    return res;
  }

  // Admin page: require isAdmin
  if (path.startsWith("/admin")) {
    if (!session.user?.isAdmin) {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }
    return NextResponse.next();
  }

  // Per-page permission check
  const permKey = Object.keys(PERMISSION_MAP).find(
    (k) => path === k || path.startsWith(k + "/")
  );

  if (permKey) {
    const allowed = session.user?.permissions?.[PERMISSION_MAP[permKey]];
    if (allowed === false) {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg).*)",
  ],
};
