// Bandeja "Guardados del mapa": entidades enviadas desde los popups del mapa
// OSINT al workspace. Vive en localStorage, desacoplada del seed de conocimiento.

export interface MapInboxItem {
  id: string;
  title: string;
  kind: string; // país | suceso | instalación | alerta | …
  source: string; // capa/origen
  lat?: number;
  lng?: number;
  detail?: string;
  savedAt: string;
}

const KEY = "politeia:ws:inbox";
const isBrowser = typeof window !== "undefined";

export function readInbox(): MapInboxItem[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToInbox(item: Omit<MapInboxItem, "id" | "savedAt">): MapInboxItem {
  const full: MapInboxItem = {
    ...item,
    id: `mi_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`,
    savedAt: new Date().toISOString(),
  };
  if (isBrowser) {
    try {
      const arr = readInbox();
      // dedup por título+capa para no acumular duplicados
      const dedup = arr.filter((i) => !(i.title === full.title && i.source === full.source));
      dedup.unshift(full);
      localStorage.setItem(KEY, JSON.stringify(dedup.slice(0, 200)));
      window.dispatchEvent(new CustomEvent("politeia:inbox:changed"));
    } catch {}
  }
  return full;
}

export function removeFromInbox(id: string) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(readInbox().filter((i) => i.id !== id)));
    window.dispatchEvent(new CustomEvent("politeia:inbox:changed"));
  } catch {}
}
