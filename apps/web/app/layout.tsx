import type { Metadata } from "next";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/query/provider";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Politeia — Intelligence Platform",
  description: "Plataforma de inteligencia política para consultorías, partidos y organizaciones.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" style={{ background: "#080C14", colorScheme: "dark" }}>
      <body className="antialiased min-h-screen" style={{ background: "#080C14", color: "#E2E8F0", margin: 0 }}>
        <ReactQueryProvider>
          <AppShell>{children}</AppShell>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
