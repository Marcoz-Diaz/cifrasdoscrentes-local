export interface History { past: string[]; present: string; future: string[]; lastAt: number }

export const MAX_HISTORY = 200;
export const GROUP_MS = 800;

export function createHistory(present: string): History {
  return { past: [], present, future: [], lastAt: 0 };
}

/** Records a new value; quick consecutive typing (within GROUP_MS) is merged into one undo step. */
export function record(h: History, value: string, now: number, group = true): History {
  if (value === h.present) return h;
  if (group && h.past.length > 0 && now - h.lastAt < GROUP_MS) return { ...h, present: value, future: [], lastAt: now };
  return { past: [...h.past, h.present].slice(-MAX_HISTORY), present: value, future: [], lastAt: now };
}

export function undo(h: History): History {
  const prev = h.past[h.past.length - 1];
  if (prev === undefined) return h;
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], lastAt: 0 };
}

export function redo(h: History): History {
  const next = h.future[0];
  if (next === undefined) return h;
  return { past: [...h.past, h.present], present: next, future: h.future.slice(1), lastAt: 0 };
}
