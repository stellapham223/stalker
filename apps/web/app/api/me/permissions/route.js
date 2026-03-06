import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXTAUTH_API_URL || "http://localhost:4000";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/auth/session-info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": process.env.NEXTAUTH_SECRET || "",
      },
      body: JSON.stringify({ email: session.user.email }),
    });
    if (!res.ok) return NextResponse.json({}, { status: res.status });
    const info = await res.json();
    return NextResponse.json(info);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
