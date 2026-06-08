// Cliente AIS de aisstream.io — corre EN EL NAVEGADOR.
// Las IP de datacenter de Vercel no reciben el stream; las residenciales sí,
// así que la cobertura global de barcos se hace desde el navegador del usuario.

export function shipCategory(code: number | null | undefined): string {
  if (code == null || code <= 0) return 'other';
  if (code === 30) return 'fishing';
  if (code === 31 || code === 32 || code === 52) return 'tug';
  if (code === 35 || code === 55) return 'military';
  if ((code >= 20 && code <= 29) || (code >= 40 && code <= 49)) return 'highspeed';
  if (code >= 60 && code <= 69) return 'passenger';
  if (code >= 70 && code <= 79) return 'cargo';
  if (code >= 80 && code <= 89) return 'tanker';
  return 'other';
}

const MID_TO_FLAG: Record<string, string> = {
  '201': 'AL', '202': 'AD', '203': 'AT', '204': 'AZ', '205': 'BE', '206': 'BY', '207': 'BG',
  '208': 'VA', '209': 'CY', '210': 'CY', '211': 'DE', '212': 'CY', '213': 'GE', '214': 'MD',
  '215': 'MT', '218': 'DE', '219': 'DK', '220': 'DK', '224': 'ES', '225': 'ES', '226': 'FR',
  '227': 'FR', '228': 'FR', '229': 'MT', '230': 'FI', '231': 'FO', '232': 'GB', '233': 'GB',
  '234': 'GB', '235': 'GB', '236': 'GI', '237': 'GR', '238': 'HR', '239': 'GR', '240': 'GR',
  '241': 'GR', '242': 'MA', '243': 'HU', '244': 'NL', '245': 'NL', '246': 'NL', '247': 'IT',
  '248': 'MT', '249': 'MT', '250': 'IE', '251': 'IS', '252': 'LI', '253': 'LU', '254': 'MC',
  '255': 'PT', '256': 'MT', '257': 'NO', '258': 'NO', '259': 'NO', '261': 'PL', '262': 'ME',
  '263': 'PT', '264': 'RO', '265': 'SE', '266': 'SE', '267': 'SK', '268': 'SM', '269': 'CH',
  '270': 'CZ', '271': 'TR', '272': 'UA', '273': 'RU', '274': 'MK', '275': 'LV', '276': 'EE',
  '277': 'LT', '278': 'SI', '279': 'RS', '303': 'US', '308': 'BS', '309': 'BS', '311': 'BS',
  '316': 'CA', '338': 'US', '351': 'PA', '352': 'PA', '353': 'PA', '354': 'PA', '355': 'PA',
  '356': 'PA', '357': 'PA', '366': 'US', '367': 'US', '368': 'US', '369': 'US', '370': 'PA',
  '371': 'PA', '372': 'PA', '373': 'PA', '374': 'PA', '412': 'CN', '413': 'CN', '414': 'CN',
  '416': 'TW', '419': 'IN', '422': 'IR', '431': 'JP', '432': 'JP', '440': 'KR', '441': 'KR',
  '445': 'KP', '470': 'AE', '477': 'HK', '525': 'ID', '533': 'MY', '538': 'MH', '563': 'SG',
  '564': 'SG', '565': 'SG', '566': 'SG', '574': 'VN', '636': 'LR', '637': 'LR', '710': 'BR',
};

export function flagFromMmsi(mmsi: number | undefined): string {
  if (!mmsi) return '';
  return MID_TO_FLAG[String(mmsi).slice(0, 3)] || '';
}

export interface AisStreamOptions {
  apiKey: string;
  onShips: (ships: any[], counts: Record<string, number>) => void;
  onStatus?: (status: 'connecting' | 'streaming' | 'error') => void;
  cap?: number;
  flushMs?: number;
}

/**
 * Abre el WebSocket de aisstream, acumula barcos y los entrega periódicamente.
 * Devuelve una función stop() para cerrarlo.
 */
export function startAisStream(opts: AisStreamOptions): () => void {
  const cap = opts.cap ?? 30000;
  const flushMs = opts.flushMs ?? 4000;
  const positions = new Map<number, any>();
  const statics = new Map<number, any>();
  let ws: WebSocket | null = null;
  let stopped = false;
  let flushTimer: any = null;
  let reconnectTimer: any = null;
  let gotData = false;

  const build = () => {
    const ships: any[] = [];
    const counts: Record<string, number> = { cargo: 0, tanker: 0, passenger: 0, fishing: 0, tug: 0, highspeed: 0, military: 0, other: 0 };
    for (const [mmsi, p] of positions) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      const s = statics.get(mmsi);
      const cat = shipCategory(s?.type);
      counts[cat] = (counts[cat] || 0) + 1;
      const cog = typeof p.cog === 'number' && p.cog >= 0 && p.cog < 360 ? p.cog : null;
      const hdg = typeof p.hdg === 'number' && p.hdg >= 0 && p.hdg < 360 ? p.hdg : (cog != null ? Math.round(cog) : 0);
      const ship: any = {
        id: mmsi, mmsi,
        lat: Math.round(p.lat * 100000) / 100000,
        lng: Math.round(p.lng * 100000) / 100000,
        speed: typeof p.sog === 'number' ? Math.round(p.sog * 10) / 10 : 0,
        course: cog, heading: hdg, type: cat,
        name: s?.name || p.name || `MMSI ${mmsi}`,
        flag: flagFromMmsi(mmsi),
        moored: p.nav === 1 || p.nav === 5,
      };
      if (s?.dest) ship.destination = s.dest;
      if (typeof s?.draught === 'number' && s.draught > 0) ship.draught = Math.round(s.draught * 10) / 10;
      if (s?.cs) ship.callsign = s.cs;
      if (typeof s?.imo === 'number' && s.imo > 0) ship.imo = s.imo;
      if (s?.dim) {
        const L = (s.dim.A || 0) + (s.dim.B || 0);
        const B = (s.dim.C || 0) + (s.dim.D || 0);
        if (L > 0) ship.length = L;
        if (B > 0) ship.beam = B;
      }
      ships.push(ship);
    }
    return { ships, counts };
  };

  const flush = () => {
    if (stopped || !gotData) return;
    const { ships, counts } = build();
    if (ships.length) opts.onShips(ships, counts);
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 5000);
  };

  function connect() {
    if (stopped) return;
    opts.onStatus?.('connecting');
    try {
      ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    } catch {
      scheduleReconnect();
      return;
    }
    ws.onopen = () => {
      try {
        ws!.send(JSON.stringify({
          APIKey: opts.apiKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        }));
      } catch { /* noop */ }
    };
    ws.onmessage = async (ev: MessageEvent) => {
      let txt: string;
      try { txt = typeof ev.data === 'string' ? ev.data : await (ev.data as Blob).text(); } catch { return; }
      let m: any;
      try { m = JSON.parse(txt); } catch { return; }
      const md = m.MetaData || {};
      const mmsi = md.MMSI;
      if (!mmsi) return;
      gotData = true;
      opts.onStatus?.('streaming');
      if (m.MessageType === 'PositionReport') {
        const pr = (m.Message && m.Message.PositionReport) || {};
        positions.set(mmsi, { lat: md.latitude, lng: md.longitude, sog: pr.Sog, cog: pr.Cog, hdg: pr.TrueHeading, nav: pr.NavigationalStatus, name: (md.ShipName || '').trim() });
        if (positions.size > cap) { const k = positions.keys().next().value; if (k !== undefined) positions.delete(k); }
      } else if (m.MessageType === 'ShipStaticData') {
        const sd = (m.Message && m.Message.ShipStaticData) || {};
        statics.set(mmsi, { name: (sd.Name || '').trim(), type: sd.Type, dest: (sd.Destination || '').trim(), draught: sd.MaximumStaticDraught, dim: sd.Dimension, imo: sd.ImoNumber, cs: (sd.CallSign || '').trim() });
        if (statics.size > cap * 2) { const k = statics.keys().next().value; if (k !== undefined) statics.delete(k); }
      }
    };
    ws.onerror = () => { opts.onStatus?.('error'); };
    ws.onclose = () => { if (!stopped) scheduleReconnect(); };
  }

  connect();
  flushTimer = setInterval(flush, flushMs);

  return () => {
    stopped = true;
    clearInterval(flushTimer);
    clearTimeout(reconnectTimer);
    try { ws?.close(); } catch { /* noop */ }
  };
}
