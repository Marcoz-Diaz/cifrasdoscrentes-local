// Pure helpers for the viewer's musical tools: simplify chords, chord diagrams, tap tempo.
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };

/** Reduces a chord to its basic triad: "D9(#11)/F#" -> "D", "F#m7" -> "F#m". */
export function simplifyChord(chord: string): string {
  const m = chord.match(/^([A-G][#b]?)(m(?!aj))?/);
  return m ? m[1] + (m[2] ?? "") : chord;
}

/** Applies simplifyChord to every chord token inside a rendered chord segment. */
export function simplifyText(text: string): string {
  return text.replace(/[A-G][#b]?[^\s()[\]]*/g, (t) => simplifyChord(t));
}

export interface ChordShape {
  frets: (number | null)[];
  base: number;
  name: string;
  barres?: { fret: number; from: number; to: number }[];
}

// Múltiplas variações por acorde comum
const MULTI_VARIATIONS: Record<string, (number | null)[][]> = {
  C: [
    [null, 3, 2, 0, 1, 0], // Aberto
    [null, 3, 5, 5, 5, 3], // Pestana casa 3 (forma de A)
    [8, 10, 10, 9, 8, 8], // Pestana casa 8 (forma de E)
  ],
  D: [
    [null, null, 0, 2, 3, 2], // Aberto
    [null, 5, 7, 7, 7, 5], // Pestana casa 5 (forma de A)
    [10, 12, 12, 11, 10, 10], // Pestana casa 10 (forma de E)
  ],
  E: [
    [0, 2, 2, 1, 0, 0], // Aberto
    [null, 7, 9, 9, 9, 7], // Pestana casa 7 (forma de A)
    [null, null, 2, 1, 0, 0], // Variação 3 cordas agudas
  ],
  G: [
    [3, 2, 0, 0, 0, 3], // Aberto clássico
    [3, 2, 0, 0, 3, 3], // Aberto com 5ª
    [null, 10, 12, 12, 12, 10], // Pestana casa 10 (forma de A)
    [3, 5, 5, 4, 3, 3], // Pestana casa 3 (forma de E)
  ],
  A: [
    [null, 0, 2, 2, 2, 0], // Aberto
    [5, 7, 7, 6, 5, 5], // Pestana casa 5 (forma de E)
    [null, 12, 14, 14, 14, 12], // Oitava
  ],
  Am: [
    [null, 0, 2, 2, 1, 0], // Aberto
    [5, 7, 7, 5, 5, 5], // Pestana casa 5 (forma de Em)
    [null, 12, 14, 14, 13, 12],
  ],
  Em: [
    [0, 2, 2, 0, 0, 0], // Aberto
    [null, 7, 9, 9, 8, 7], // Pestana casa 7 (forma de Am)
    [12, 14, 14, 12, 12, 12], // Casa 12
  ],
  Dm: [
    [null, null, 0, 2, 3, 1], // Aberto
    [null, 5, 7, 7, 6, 5], // Pestana casa 5 (forma de Am)
    [10, 12, 12, 10, 10, 10], // Pestana casa 10 (forma de Em)
  ],
  F: [
    [1, 3, 3, 2, 1, 1], // Pestana casa 1 (forma de E)
    [null, 8, 10, 10, 10, 8], // Pestana casa 8 (forma de A)
    [null, null, 3, 2, 1, 1], // Sem baixo
  ],
  B: [
    [null, 2, 4, 4, 4, 2], // Pestana casa 2 (forma de A)
    [7, 9, 9, 8, 7, 7], // Pestana casa 7 (forma de E)
  ],
  Bm: [
    [null, 2, 4, 4, 3, 2], // Pestana casa 2 (forma de Am)
    [7, 9, 9, 7, 7, 7], // Pestana casa 7 (forma de Em)
  ],
};

const E_FORM: Record<string, (number | null)[]> = {
  "": [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  "7": [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
};
const A_FORM: Record<string, (number | null)[]> = {
  "": [null, 0, 2, 2, 2, 0],
  m: [null, 0, 2, 2, 1, 0],
  "7": [null, 0, 2, 0, 2, 0],
  m7: [null, 0, 2, 0, 1, 0],
};

function buildShapeFromFrets(frets: (number | null)[], name: string): ChordShape {
  const active = frets.filter((f): f is number => f !== null && f > 0);
  const minFret = active.length > 0 ? Math.min(...active) : 1;
  const hasOpenString = frets.includes(0);
  const base = hasOpenString ? 1 : minFret > 1 ? minFret : 1;
  const barres: { fret: number; from: number; to: number }[] = [];
  // Standard CAGED E-shape barre: same movable root fret on both outer strings.
  if (frets.length === 6 && frets[0] !== null && frets[0] > 0 && frets[0] === frets[5] && frets[0] === minFret) {
    barres.push({ fret: frets[0], from: 0, to: 5 });
  // Standard CAGED A-shape barre: low E is muted; A through high E share the root fret.
  } else if (frets.length === 6 && frets[0] === null && frets[1] !== null && frets[1] > 0 && frets[1] === frets[5] && frets[1] === minFret) {
    barres.push({ fret: frets[1], from: 1, to: 5 });
  }
  return { frets, base, name, barres };
}

/** Retorna todas as posições conhecidas para o acorde */
export function chordShapes(chord: string): ChordShape[] {
  const m = chord.match(/^([A-G][#b]?)(m(?!aj))?(7)?/);
  if (!m || !m[1]) return [];
  const root = FLAT[m[1]] ?? m[1];
  const quality = (m[2] ?? "") + (m[3] ?? "");
  const normalizedKey = root + quality;
  const name = m[1] + quality;

  const results: ChordShape[] = [];

  // 1. Variações manuais cadastradas
  const variations = MULTI_VARIATIONS[normalizedKey] ?? MULTI_VARIATIONS[root + (m[2] ?? "")];
  if (variations && variations.length > 0) {
    for (const frets of variations) {
      results.push(buildShapeFromFrets(frets, name));
    }
  }

  // 2. Formas CAGED (E-form e A-form)
  const idx = NOTES.indexOf(root);
  if (idx >= 0) {
    const eFret = (idx - 4 + 12) % 12 || 12;
    const aFret = (idx - 9 + 12) % 12 || 12;
    const qKey = quality in E_FORM ? quality : (m[2] ?? "");
    const eShape = E_FORM[qKey] ?? E_FORM[""]!;
    const aShape = A_FORM[qKey] ?? A_FORM[""]!;

    const eFrets = eShape.map((f) => (f === null ? null : f + eFret));
    const aFrets = aShape.map((f) => (f === null ? null : f + aFret));

    const eBuilt = buildShapeFromFrets(eFrets, name);
    const aBuilt = buildShapeFromFrets(aFrets, name);

    // Evita duplicatas idênticas
    const exists = (s: ChordShape) => results.some((r) => r.frets.join(",") === s.frets.join(","));
    if (!exists(eBuilt)) results.push(eBuilt);
    if (!exists(aBuilt)) results.push(aBuilt);
  }

  return results.length > 0 ? results : [];
}

/** Mantém compatibilidade com chamada simples */
export function chordShape(chord: string): ChordShape | null {
  const list = chordShapes(chord);
  return list[0] ?? null;
}

/** BPM from tap timestamps (ms); averages the last intervals, ignores pauses over 2s. */
export function tapTempo(taps: number[]): number | null {
  const recent: number[] = [];
  for (let i = taps.length - 1; i > 0 && recent.length < 6; i--) {
    const d = taps[i]! - taps[i - 1]!;
    if (d > 2000 || d <= 0) break;
    recent.push(d);
  }
  if (recent.length === 0) return null;
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return Math.min(300, Math.max(20, Math.round(60000 / avg)));
}

/** Previous/next playlist item ids around the current one. */
export function neighbors<T extends { id: string }>(items: T[], current: string): { prev: T | null; next: T | null } {
  const i = items.findIndex((x) => x.id === current);
  if (i < 0) return { prev: null, next: null };
  return { prev: items[i - 1] ?? null, next: items[i + 1] ?? null };
}

export const NOTES12 = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES12_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const nIdx = (n: string) => {
  const i = NOTES12.indexOf(n);
  return i >= 0 ? i : NOTES12_FLAT.indexOf(n);
};
const STD_TUNING = [4, 9, 2, 7, 11, 4]; // E A D G B E

/** Common chord qualities and semitone formulas, shared by the dictionary and chord finder. */
export const CHORD_TYPES: [string, number[]][] = [
  ["", [0, 4, 7]],
  ["m", [0, 3, 7]],
  ["5", [0, 7]],
  ["sus2", [0, 2, 7]],
  ["sus4", [0, 5, 7]],
  ["dim", [0, 3, 6]],
  ["aug", [0, 4, 8]],
  ["maj7", [0, 4, 7, 11]],
  ["maj9", [0, 4, 7, 11, 2]],
  ["maj11", [0, 4, 7, 11, 2, 5]],
  ["maj13", [0, 4, 7, 11, 2, 9]],
  ["6", [0, 4, 7, 9]],
  ["m6", [0, 3, 7, 9]],
  ["7", [0, 4, 7, 10]],
  ["7M", [0, 4, 7, 11]],
  ["m7", [0, 3, 7, 10]],
  ["m7M", [0, 3, 7, 11]],
  ["dim7", [0, 3, 6, 9]],
  ["m7b5", [0, 3, 6, 10]],
  ["7sus2", [0, 2, 7, 10]],
  ["7sus4", [0, 5, 7, 10]],
  ["add9", [0, 4, 7, 2]],
  ["m(add9)", [0, 3, 7, 2]],
  ["6/9", [0, 4, 7, 9, 2]],
  ["9", [0, 4, 7, 10, 2]],
  ["m9", [0, 3, 7, 10, 2]],
  ["7M(9)", [0, 4, 7, 11, 2]],
  ["11", [0, 4, 7, 10, 2, 5]],
  ["m11", [0, 3, 7, 10, 2, 5]],
  ["m13", [0, 3, 7, 10, 2, 5, 9]],
  ["13", [0, 4, 7, 10, 2, 9]],
  ["7(13)", [0, 4, 7, 10, 9]],
  ["7(b5)", [0, 4, 6, 10]],
  ["7(#5)", [0, 4, 8, 10]],
  ["7(b9)", [0, 4, 7, 10, 1]],
  ["7(#9)", [0, 4, 7, 10, 3]],
  ["7(#11)", [0, 4, 7, 10, 6]],
  ["7(b13)", [0, 4, 7, 10, 8]],
];

/** Interval spellings for the chord dictionary. Semitone numbers alone cannot
 * distinguish enharmonic functions such as b3/#9 or b5/#11. */
export const CHORD_INTERVALS: Record<string, string[]> = {
  "": ["1", "3", "5"],
  m: ["1", "b3", "5"],
  "5": ["1", "5"],
  sus2: ["1", "2", "5"],
  sus4: ["1", "4", "5"],
  dim: ["1", "b3", "b5"],
  aug: ["1", "3", "#5"],
  maj7: ["1", "3", "5", "7"],
  maj9: ["1", "3", "5", "7", "9"],
  maj11: ["1", "3", "5", "7", "9", "11"],
  maj13: ["1", "3", "5", "7", "9", "13"],
  "6": ["1", "3", "5", "6"],
  m6: ["1", "b3", "5", "6"],
  "7": ["1", "3", "5", "b7"],
  "7M": ["1", "3", "5", "7"],
  m7: ["1", "b3", "5", "b7"],
  m7M: ["1", "b3", "5", "7"],
  dim7: ["1", "b3", "b5", "bb7"],
  m7b5: ["1", "b3", "b5", "b7"],
  "7sus2": ["1", "2", "5", "b7"],
  "7sus4": ["1", "4", "5", "b7"],
  add9: ["1", "3", "5", "9"],
  "m(add9)": ["1", "b3", "5", "9"],
  "6/9": ["1", "3", "5", "6", "9"],
  "9": ["1", "3", "5", "b7", "9"],
  m9: ["1", "b3", "5", "b7", "9"],
  "7M(9)": ["1", "3", "5", "7", "9"],
  "11": ["1", "3", "5", "b7", "9", "11"],
  m11: ["1", "b3", "5", "b7", "9", "11"],
  m13: ["1", "b3", "5", "b7", "9", "11", "13"],
  "13": ["1", "3", "5", "b7", "9", "13"],
  "7(13)": ["1", "3", "5", "b7", "13"],
  "7(b5)": ["1", "3", "b5", "b7"],
  "7(#5)": ["1", "3", "#5", "b7"],
  "7(b9)": ["1", "3", "5", "b7", "b9"],
  "7(#9)": ["1", "3", "5", "b7", "#9"],
  "7(#11)": ["1", "3", "5", "b7", "#11"],
  "7(b13)": ["1", "3", "5", "b7", "b13"],
};

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NATURAL_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

function intervalSemitones(interval: string): number | null {
  const match = interval.match(/^(bb|b|##|#)?(1[0-3]|[1-9])$/);
  if (!match) return null;
  const degree = Number(match[2]);
  const alteration = match[1] === "bb" ? -2 : match[1] === "b" ? -1 : match[1] === "#" ? 1 : match[1] === "##" ? 2 : 0;
  return NATURAL_INTERVALS[(degree - 1) % 7]! + Math.floor((degree - 1) / 7) * 12 + alteration;
}

/** Spell the notes of a chord by diatonic interval (C7(b9) -> C · E · G · Bb · Db). */
export function spellChordNotes(root: string, quality: string): string[] {
  const intervals = CHORD_INTERVALS[quality];
  const rootMatch = root.match(/^([A-G])([#b]?)$/);
  const rootPitch = nIdx(root);
  if (!intervals || !rootMatch || rootPitch < 0) return [];

  const rootLetter = LETTERS.indexOf(rootMatch[1]!);
  return intervals.map((interval) => {
    const match = interval.match(/^(bb|b|##|#)?(1[0-3]|[1-9])$/)!;
    const degree = Number(match[2]);
    const semitones = intervalSemitones(interval)!;
    const targetLetter = LETTERS[(rootLetter + degree - 1) % 7]!;
    const targetPitch = (rootPitch + semitones) % 12;
    const naturalPitch = NATURAL_PITCH[targetLetter]!;
    const difference = ((targetPitch - naturalPitch + 6) % 12) - 6;
    const accidental = difference === -2 ? "bb" : difference === -1 ? "b" : difference === 1 ? "#" : difference === 2 ? "##" : "";
    return `${targetLetter}${accidental}`;
  });
}

/** Names a chord from fret numbers (low E to high E; -1 = muted). Returns "" when unknown. */
export function identifyChord(frets: number[], tuning: number[] = STD_TUNING): string {
  const played = frets.map((f, i) => (f < 0 ? -1 : ((tuning[i] ?? 0) + f) % 12)).filter((n) => n >= 0);
  if (played.length < 2) return "";
  const bass = played[0]!;
  const set = new Set(played);
  let best = "";
  let bestScore = -1;
  for (const root of set) {
    for (const [name, ints] of CHORD_TYPES) {
      const want = new Set(ints.map((i) => (root + i) % 12));
      if ([...set].some((n) => !want.has(n))) continue;
      const score = set.size / want.size + (root === bass ? 1 : 0) - (name.length ? 0.01 * name.length : 0);
      if (score > bestScore) {
        bestScore = score;
        best = NOTES12[root] + name + (root !== bass ? "/" + NOTES12[bass] : "");
      }
    }
  }
  return best;
}

/** Diatonic chords of a key, e.g. "C" -> C Dm Em F G Am B°. */
export function harmonicField(key: string): { degree: string; chord: string }[] {
  const m = key.match(/^([A-G][#b]?)(m?)/);
  if (!m) return [];
  const root = nIdx(m[1]!);
  if (root < 0) return [];
  const minor = m[2] === "m";
  const flats = /b/.test(m[1]!) || ["F", "Dm", "Gm", "Cm", "Fm"].includes(key);
  const names = flats ? NOTES12_FLAT : NOTES12;
  const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const quals = minor ? ["m", "°", "", "m", "m", "", ""] : ["", "m", "m", "", "", "m", "°"];
  const degs = minor ? ["i", "ii°", "III", "iv", "v", "VI", "VII"] : ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
  return steps.map((s, i) => ({ degree: degs[i]!, chord: names[(root + s) % 12]! + quals[i] }));
}

export const CIRCLE_OF_FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];

const ROMAN = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"];
/** Converts a chord to its degree in the key, e.g. ("Am","C") -> "vi". */
export function chordToDegree(chord: string, key: string): string {
  const k = key.match(/^([A-G][#b]?)/)?.[1];
  const m = chord.match(/^(\(*)([A-G][#b]?)([^/)\s]*)(?:\/([A-G][#b]?))?(\)*)$/);
  if (!k || !m) return chord;
  const tonic = nIdx(k);
  const r = nIdx(m[2]!);
  if (tonic < 0 || r < 0) return chord;
  let suffix = m[3] ?? "";
  let roman = ROMAN[(r - tonic + 12) % 12]!;
  if (/^m(?!aj)/.test(suffix)) {
    roman = roman.toLowerCase();
    suffix = suffix.slice(1);
  }
  const bass = m[4] && nIdx(m[4]) >= 0 ? "/" + ROMAN[(nIdx(m[4]) - tonic + 12) % 12] : "";
  return (m[1] ?? "") + roman + suffix + bass + (m[5] ?? "");
}

/** Rough song length in minutes: each chord/lyric line ≈ 2 bars of 4 beats. */
export function estimateMinutes(content: string, bpm: number): number {
  const lines = content.split("\n").filter((l) => l.trim() && !/^\s*-{3}/.test(l)).length;
  const beats = lines * 4;
  return Math.max(1, Math.round(beats / Math.max(20, bpm || 80)));
}

/** Pitch detection via autocorrelation. Returns Hz or null. */
export function detectPitch(buf: Float32Array, rate: number): number | null {
  let rms = 0;
  for (const v of buf) rms += v * v;
  if (Math.sqrt(rms / buf.length) < 0.01) return null;
  let best = -1,
    bestCorr = 0;
  for (let lag = Math.floor(rate / 1000); lag < Math.floor(rate / 60); lag++) {
    let c = 0;
    for (let i = 0; i + lag < buf.length; i++) c += buf[i]! * buf[i + lag]!;
    if (c > bestCorr) {
      bestCorr = c;
      best = lag;
    }
  }
  return best > 0 ? rate / best : null;
}

/** Nearest note for a frequency, with cents offset. */
export function noteFromFreq(freq: number): { note: string; cents: number } {
  const n = 12 * Math.log2(freq / 440) + 69;
  const r = Math.round(n);
  return { note: NOTES12[((r % 12) + 12) % 12]! + (Math.floor(r / 12) - 1), cents: Math.round((n - r) * 100) };
}
