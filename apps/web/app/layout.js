import "@/app/globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";

export const metadata = {
  title: "Competitor Stalker",
  description: "Monitor competitor changes over time",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
