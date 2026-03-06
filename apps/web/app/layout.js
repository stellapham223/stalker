import "@/app/globals.css";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Competitor Stalker",
  description: "Monitor competitor changes",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <SessionProvider session={session} refetchOnWindowFocus={false}>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
