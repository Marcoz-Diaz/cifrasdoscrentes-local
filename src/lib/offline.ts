// Memória local do aparelho para abrir playlists e cifras sem internet
const PREFIX = "cifras-offline:";

export function saveOffline(key: string, value: unknown) {
  if (typeof window === "undefined" || value === undefined || value === null) return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* armazenamento cheio */
  }
}

export function readOffline<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

/** Tenta buscar online e salva; se estiver sem rede ou der erro, puxa direto da memória local */
export async function withOffline<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Se o celular já avisar que está sem internet, lê direto da memória sem travar
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = readOffline<T>(key);
    if (cached !== undefined) return cached;
  }

  try {
    const value = await fn();
    saveOffline(key, value);
    return value;
  } catch (e) {
    const cached = readOffline<T>(key);
    if (cached !== undefined) return cached;
    throw e;
  }
}

export function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
