// Recientes y favoritos del workspace (localStorage). Cliente.

export interface RecentItem {
  path: string;
  label: string;
  ts: number;
}

const R_KEY = "politeia:ws:recents";
const F_KEY = "politeia:ws:favorites";
const isBrowser = typeof window !== "undefined";

function read(key: string): RecentItem[] {
  if (!isBrowser) return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function write(key: string, v: RecentItem[]) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(v));
    window.dispatchEvent(new CustomEvent("politeia:recents:changed"));
  } catch {}
}

export function recordRecent(item: { path: string; label: string }) {
  if (!isBrowser) return;
  const arr = read(R_KEY).filter((r) => r.path !== item.path);
  arr.unshift({ ...item, ts: Date.now() });
  write(R_KEY, arr.slice(0, 12));
}
export function readRecents(): RecentItem[] {
  return read(R_KEY);
}
export function readFavorites(): RecentItem[] {
  return read(F_KEY);
}
export function isFavorite(path: string): boolean {
  return read(F_KEY).some((f) => f.path === path);
}
export function toggleFavorite(item: { path: string; label: string }) {
  const favs = read(F_KEY);
  const exists = favs.some((f) => f.path === item.path);
  const next = exists ? favs.filter((f) => f.path !== item.path) : [{ ...item, ts: Date.now() }, ...favs];
  write(F_KEY, next.slice(0, 20));
}
