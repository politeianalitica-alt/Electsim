import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import BottomAgenteBar from './_components/BottomAgenteBar';
import { AlertsProvider } from '@/context/AlertsContext';
import { QueryProvider } from '@/lib/api/query-provider';
import { DomoProvider } from '@/context/DomoContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import CuadernoTracker from '@/components/CuadernoTracker';
// Sprint Quality-1 · next/font centralizada · cross-platform consistente
import { sans, serif, mono } from './fonts';

export const metadata: Metadata = {
  title: 'Politeia Analítica',
  description: 'Inteligencia electoral · Análisis y estimación de comicios en España',
  icons: { icon: '/politeia-logo.svg' },
};

// Forzar modo claro a nivel de navegador · ignora prefers-color-scheme del SO
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#fbfbfd',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="light" en SSR → evita el flash de modo oscuro antes de que
    // el ThemeProvider hidrate. Combinado con tokens.css :root,[data-theme=light]
    // garantiza que las variables --color-* sean siempre las claras.
 <html
      lang="es"
      data-theme="light"
      style={{ colorScheme: 'light' }}
      className={`${sans.variable} ${serif.variable} ${mono.variable}`}
    >
 <body>
        {/* Sprint Quality-1 · skip to content (WCAG 2.4.1 Bypass Blocks) ·
            visible solo al recibir foco · usuarios screen-reader y teclado
            saltan la nav y aterrizan directos en <main id="main">. */}
        <a href="#main" className="skip-to-content">
          Saltar al contenido principal
        </a>
 <QueryProvider>
 <ThemeProvider>
 <AlertsProvider>
 <DomoProvider>
 <NotificationsProvider>
                {/* Sprint Quality-2 · destino del skip-link · tabindex=-1 permite
                    que el foco aterrice aquí cuando el usuario activa el link. */}
                <div id="main" tabIndex={-1} style={{ outline: 'none' }}>
                  {children}
                </div>
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
