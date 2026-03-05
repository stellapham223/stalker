import "@/app/globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

export const metadata = {
  title: "Competitor Stalker",
  description: "Monitor competitor changes over time",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProvider session={session} refetchOnWindowFocus={false}>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
