/** Uses the browser's normal persistent storage outside the editor preview. */
export function authStorage() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}
