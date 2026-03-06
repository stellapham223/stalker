import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const API_URL = process.env.NEXTAUTH_API_URL || "http://localhost:4000";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase()?.trim();
      if (!email) return false;

      try {
        const res = await fetch(`${API_URL}/auth/check-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Auth": process.env.NEXTAUTH_SECRET || "",
          },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.allowed === true;
      } catch {
        return false;
      }
    },

    async jwt({ token, user, trigger }) {
      console.log("[jwt] trigger:", trigger, "user:", user?.email, "token.isAdmin:", token.isAdmin);
      if (user?.email) {
        token.email = user.email.toLowerCase().trim();
      }
      // Fetch permissions on first sign-in or when session is updated
      if (user?.email || trigger === "update") {
        const email = token.email;
        try {
          const res = await fetch(`${API_URL}/auth/session-info`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Auth": process.env.NEXTAUTH_SECRET || "",
            },
            body: JSON.stringify({ email }),
          });
          if (res.ok) {
            const info = await res.json();
            token.isAdmin = info.isAdmin ?? false;
            token.permissions = info.permissions ?? {};
          }
        } catch (e) {
          console.error("[auth] session-info fetch failed:", e.message);
          token.isAdmin = false;
          token.permissions = {};
        }
      }
      return token;
    },

    async session({ session, token }) {
      console.log("[session] token.isAdmin:", token.isAdmin, "token.email:", token.email);
      if (token.email) {
        session.user.email = token.email;
        session.user.isAdmin = token.isAdmin ?? false;
        session.user.permissions = token.permissions ?? {};
      }
      return session;
    },
  },
});
