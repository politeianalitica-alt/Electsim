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
    <html lang="es" className="dark">
      <body className="antialiased min-h-screen">
        <ReactQueryProvider>
          <AppShell>{children}</AppShell>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
