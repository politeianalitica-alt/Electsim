import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'operational',
    platform: 'Politeia',
    version: '1.0.0',
    uptime: process.uptime ? Math.round(process.uptime()) : 0,
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/osiris/flights',
      '/api/osiris/satellites',
      '/api/osiris/earthquakes',
      '/api/osiris/news',
      '/api/osiris/gdelt',
      '/api/osiris/markets',
      '/api/osiris/frontlines',
      '/api/osiris/region-dossier',
    ],
  });
}
