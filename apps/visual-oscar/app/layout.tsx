import type { Metadata } from 'next';
import '../styles/globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import BottomAgenteBar from './_components/BottomAgenteBar';
import { AlertsProvider } from '@/context/AlertsContext';
import { QueryProvider } from '@/lib/api/query-provider';
import { DomoProvider } from '@/context/DomoContext';

export const metadata: Metadata = {
  title: 'Politeia Analítica',
  description: 'Inteligencia electoral · Análisis y estimación de comicios en España',
  icons: { icon: '/politeia-logo.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>
          <ThemeProvider>
            <AlertsProvider>
              <DomoProvider>
                {children}
                <BottomAgenteBar />
              </DomoProvider>
            </AlertsProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
