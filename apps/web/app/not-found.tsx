import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="premium-card text-center p-10 max-w-md">
        <MapPin className="w-10 h-10 text-cyan1 mx-auto mb-3"/>
        <h1 className="text-2xl font-bold text-text1 mb-2">404 — Página no encontrada</h1>
        <p className="text-text2 text-sm mb-5">La ruta solicitada no existe en la plataforma.</p>
        <Link
          href="/"
          className="px-4 py-2 bg-cyan1 text-bg rounded-md text-sm font-semibold hover:bg-cyan1/90 transition inline-block"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
