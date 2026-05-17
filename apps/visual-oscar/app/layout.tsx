import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import BottomAgenteBar from './_components/BottomAgenteBar';
import { AlertsProvider } from '@/context/AlertsContext';
import { QueryProvider } from '@/lib/api/query-provider';
import { DomoProvider } from '@/context/DomoContext';
import { NotificationsProvider } from '@/context/NotificationsContext';

export const metadata: Metadata = {
  title: 'Politeia Analítica',
  description: 'Inteligencia electoral · Análisis y estimación de comicios en España',
  icons: { icon: '/politeia-logo.svg' },
};

// Forzar modo claro a nivel de navegador · ignora prefers-color-scheme del SO
export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbfbfd',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="light" en SSR → evita el flash de modo oscuro antes de que
    // el ThemeProvider hidrate. Combinado con tokens.css :root,[data-theme=light]
    // garantiza que las variables --color-* sean siempre las claras.
    <html lang="es" data-theme="light" style={{ colorScheme: 'light' }}>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <AlertsProvider>
              <DomoProvider>
                <NotificationsProvider>
                  {children}
                  <BottomAgenteBar />
                </NotificationsProvider>
              </DomoProvider>
            </AlertsProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
