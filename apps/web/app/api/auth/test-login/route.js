import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";

export async function GET(request) {
  if (process.env.PLAYWRIGHT_TEST !== "true") {
    return Response.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "test@example.com";

  const token = await encode({
    token: {
      email,
      name: "Test User",
      picture: "",
      sub: "test-user-id",
      isAdmin: true,
      permissions: {
        appListing: true,
        keywordRankings: true,
        autocomplete: true,
        websiteMenus: true,
        homepageMonitor: true,
        guideDocs: true,
      },
      revoked: false,
    },
    secret: process.env.NEXTAUTH_SECRET || "test-secret",
    salt: "authjs.session-token",
  });

  const cookieStore = await cookies();
  cookieStore.set("authjs.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return Response.json({ success: true, email });
}
