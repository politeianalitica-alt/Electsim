import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Devuelve la clave de aisstream al cliente autenticado.
 * El stream AIS global se hace EN EL NAVEGADOR (las IP de datacenter de Vercel
 * no reciben el stream de aisstream; las residenciales sí). La ruta está tras el
 * middleware de auth, así que solo usuarios con sesión obtienen la clave.
 */
export async function GET() {
  const key = process.env.AISSTREAM_API_KEY || '';
  return NextResponse.json(
    { key, enabled: key.length > 0 },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
