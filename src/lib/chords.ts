const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const CHORD_RE = /^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/;

export function isChord(token: string) {
  const t = token.replace(/[()]/g, "");
  if (!t) return false;
  const m = t.match(CHORD_RE);
  if (!m) return false;
  return /^(m|maj|min|dim|aug|sus|add|M|º|°|ø|\+|-|\d|\(|\)|#|b)*$/.test(m[2] ?? "");
}

export function isChordLine(line: string) {
  const tokens = line.replace(/\[[^\]]*\]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => isChord(t) || /^[|\-x.:]+$/.test(t));
}

function noteIndex(n: string) {
  const i = SHARPS.indexOf(n);
  return i >= 0 ? i : FLATS.indexOf(n);
}

function shift(note: string, steps: number) {
  const i = noteIndex(note);
  if (i < 0) return note;
  const j = (((i + steps) % 12) + 12) % 12;
  return SHARPS[j] ?? "C";
}

export function transposeChord(chord: string, steps: number) {
  const pre = chord.match(/^\(*/)?.[0] ?? "";
  const post = chord.match(/\)*$/)?.[0] ?? "";
  const core = chord.slice(pre.length, chord.length - post.length);
  const m = core.match(CHORD_RE);
  if (!m) return chord;
  const r = m[1] ?? "";
  const root = shift(r, steps);
  const bass = m[3] ? "/" + shift(m[3], steps) : "";
  return pre + root + m[2] + bass + post;
}

/** Transposes a chord line keeping chord positions as close as possible. */
export function transposeLine(line: string, steps: number) {
  let out = "";
  let debt = 0;
  for (const part of line.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      const len = Math.max(1, part.length - debt);
      debt -= part.length - len;
      out += " ".repeat(len);
    } else {
      const t = isChord(part) ? transposeChord(part, steps) : part;
      debt += t.length - part.length;
      out += t;
    }
  }
  return out;
}

export function transposeText(text: string, steps: number) {
  return text
    .split("\n")
    .map((l) => (isChordLine(l) ? transposeLine(l, steps) : l))
    .join("\n");
}

/** Shifts a key name like "E", "F#m" or "Bb" by the given number of semitones. */
export function transposeKey(key: string, steps: number) {
  if (!key) return key;
  const m = key.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return key;
  const root = m[1] ?? "";
  const rest = m[2] ?? "";
  if (!root) return key;
  return shift(root, steps) + rest;
}

export const KEY_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Closest semitone offset to a selected root, preserving major/minor quality. */
export function keyTransposeSteps(key: string, target: string) {
  const root = key.match(/^([A-G][#b]?)/)?.[1];
  if (!root) return 0;
  const from = noteIndex(root);
  const to = noteIndex(target);
  if (from < 0 || to < 0) return 0;
  const delta = ((to - from) % 12 + 12) % 12;
  return delta > 6 ? delta - 12 : delta;
}

export const TUNINGS = [
  "E A D G B E",
  "D A D G B E",
  "Eb Ab Db Gb Bb Eb",
  "D G C F A D",
  "D A D G A D",
  "D G D G B D",
  "C G C F A D",
];

const MAJOR_DEGREES: [number, "M" | "m" | "d"][] = [[0, "M"], [2, "m"], [4, "m"], [5, "M"], [7, "M"], [9, "m"], [11, "d"]];

function chordInfo(chord: string): { root: number; q: "M" | "m" | "d" } | null {
  const m = chord.replace(/[()]/g, "").match(CHORD_RE);
  if (!m) return null;
  const root = noteIndex(m[1] ?? "");
  if (root < 0) return null;
  const s = m[2] ?? "";
  const q = /^(dim|º|°)/.test(s) || /m7b5|ø/.test(s) ? "d" : /^m(?!aj)/.test(s) || /^min/.test(s) ? "m" : "M";
  return { root, q };
}

/** Collects chord symbols from chord lines of a cifra, in order. */
export function extractChords(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    if (isChordLine(line)) {
      for (const t of line.trim().split(/\s+/)) if (isChord(t)) out.push(t);
    } else {
      for (const m of line.matchAll(/\(([^)]*)\)/g)) for (const t of (m[1] ?? "").split(/\s+/)) if (isChord(t)) out.push(t);
    }
  }
  return out;
}

/** Detects the most likely key (e.g. "G", "Em") from a list of chords. Returns "" when unknown. */
export function detectKeyFromChords(chords: string[]): string {
  const infos = chords.map(chordInfo).filter((c): c is NonNullable<typeof c> => !!c);
  if (!infos.length) return "";
  let best = { score: -Infinity, key: "" };
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const minor of [false, true]) {
      const majTonic = minor ? (tonic + 3) % 12 : tonic;
      let score = 0;
      for (const c of infos) {
        const hit = MAJOR_DEGREES.some(([d, q]) => (majTonic + d) % 12 === c.root && (q === c.q || (q === "M" && c.q === "M")));
        // Harmonic minor V (major dominant) counts in minor keys
        const dom = minor && c.root === (tonic + 7) % 12 && c.q === "M";
        score += hit || dom ? 1 : -1;
      }
      const isTonic = (c: { root: number; q: string } | undefined) => !!c && c.root === tonic && (minor ? c.q === "m" : c.q === "M");
      if (isTonic(infos[0])) score += 2;
      if (isTonic(infos[infos.length - 1])) score += 1.5;
      score += infos.filter(isTonic).length * 0.5;
      if (score > best.score) {
        const name0 = SHARPS[tonic] ?? "C";
        best = { score, key: name0 + (minor ? "m" : "") };
      }
    }
  }
  return best.key;
}

export function detectKey(text: string): string {
  return detectKeyFromChords(extractChords(text));
}

/** Detects key changes by section ([Refrão] etc.). Returns the distinct key sequence, e.g. ["C", "D"]. */
export function detectKeySequence(text: string): string[] {
  const sections: string[][] = [[]];
  for (const line of text.split("\n")) {
    if (/^\s*\[.*\]\s*$/.test(line)) { sections.push([]); continue; }
    if (isChordLine(line)) for (const t of line.trim().split(/\s+/)) if (isChord(t)) sections[sections.length - 1]!.push(t);
  }
  const seq: string[] = [];
  for (const s of sections) {
    if (s.length < 3) continue;
    const k = detectKeyFromChords(s);
    if (k && seq[seq.length - 1] !== k) seq.push(k);
  }
  return seq;
}

export type Segment = { text: string; kind: "chord" | "section" | "text" };

/** Splits a line for display: [..] is a label (never a chord), (..) is always chords, transposed. */
export function segmentLine(line: string, steps: number): Segment[] {
  const chordLine = isChordLine(line);
  const out: Segment[] = [];

  // On chord-only lines, keep parenthesized extensions such as C(9) attached
  // to the chord token so the parser can transpose its root and bass together.
  if (chordLine) {
    for (const part of line.split(/(\[[^\]]*\])/)) {
      if (!part) continue;
      if (part.startsWith("[") && part.endsWith("]")) out.push({ text: part, kind: "section" });
      else out.push({ text: transposeLine(part, steps), kind: "chord" });
    }
    return out;
  }

  // In lyric lines, only transpose chord symbols explicitly enclosed in parentheses.
  for (const part of line.split(/(\[[^\]]*\]|\([^)]*\))/)) {
    if (!part) continue;
    if (part.startsWith("[") && part.endsWith("]")) out.push({ text: part, kind: "section" });
    else if (part.startsWith("(") && part.endsWith(")")) {
      const inner = part.slice(1, -1).split(/(\s+)/).map((t) => (isChord(t) ? transposeChord(t, steps) : t)).join("");
      out.push({ text: "(" + inner + ")", kind: "chord" });
    } else out.push({ text: part, kind: "text" });
  }
  return out;
}

/** Relative key: "C" -> "Am", "Am" -> "C". */
export function relativeKey(key: string) {
  const m = key.match(/^([A-G][#b]?)(m?)(?!aj)/);
  if (!m || !m[1]) return key;
  const minor = m[2] === "m";
  const root = noteIndex(m[1]);
  if (root < 0) return key;
  const j = (root + (minor ? 3 : 9)) % 12;
  const name = SHARPS[j] ?? "C";
  return minor ? name : name + "m";
}

// degree (semitones from source tonic) -> [semitones from target tonic, quality]
// Major scale degrees mapped into its relative minor key (C major → A minor).
const MAJ_TO_MIN: Record<number, [number, "M" | "m" | "d"]> = { 0: [0, "m"], 2: [2, "d"], 4: [3, "M"], 5: [5, "m"], 7: [7, "M"], 9: [8, "M"], 11: [10, "M"] };
// Minor scale degrees mapped into its relative major key (A minor → C major).
const MIN_TO_MAJ: Record<number, [number, "M" | "m" | "d"]> = { 0: [0, "M"], 2: [2, "m"], 3: [4, "m"], 5: [5, "M"], 7: [7, "M"], 8: [9, "m"], 10: [11, "d"] };

function convertChordMode(chord: string, tonic: number, target: number, minor: boolean) {
  const pre = chord.match(/^\(*/)?.[0] ?? "";
  const post = chord.match(/\)*$/)?.[0] ?? "";
  const core = chord.slice(pre.length, chord.length - post.length);
  const m = core.match(CHORD_RE);
  if (!m) return chord;
  const root = noteIndex(m[1] ?? "");
  if (root < 0) return chord;
  const d = (root - tonic + 12) % 12;
  const map = (minor ? MIN_TO_MAJ : MAJ_TO_MIN)[d];
  const names = SHARPS;
  const newRoot = map ? (target + map[0]) % 12 : root;
  const delta = newRoot - root;
  let suffix = m[2] ?? "";
  if (map) {
    suffix = suffix.replace(/^(m7b5|ø)/, "7").replace(/^(dim|º|°)/, "").replace(/^(min|m(?!aj))/, "");
    suffix = (map[1] === "m" ? "m" : map[1] === "d" ? "°" : "") + suffix;
  }
  const bassIdx = m[3] ? noteIndex(m[3]) : -1;
  const bass = bassIdx >= 0 ? "/" + (names[(((bassIdx + delta) % 12) + 12) % 12] ?? "") : "";
  return pre + (names[newRoot] ?? "C") + suffix + bass + post;
}

/** Rewrites a cifra from its key into the relative key (major <-> minor), mapping each chord by scale degree. */
export function convertToRelative(text: string, key: string) {
  const m = key.match(/^([A-G][#b]?)(m?)(?!aj)/);
  if (!m || !m[1]) return text;
  const minor = m[2] === "m";
  const tonic = noteIndex(m[1]);
  if (tonic < 0) return text;
  const rel = relativeKey(key);
  const target = noteIndex(rel.replace(/m$/, ""));
  const conv = (t: string) => (isChord(t) ? transposeChord(convertChordMode(t, tonic, target, minor), 0) : t);
  return text
    .split("\n")
    .map((line) => {
      if (isChordLine(line)) return line.split(/(\s+|\[[^\]]*\])/).map((p) => (p.startsWith("[") ? p : conv(p))).join("");
      return line.replace(/\(([^)]*)\)/g, (_, inner: string) => "(" + inner.split(/(\s+)/).map(conv).join("") + ")");
    })
    .join("\n");
}
