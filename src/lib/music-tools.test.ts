import { expect, it } from "vitest";
import { simplifyChord, simplifyText, chordShape, tapTempo, neighbors, spellChordNotes } from "./music-tools";

it("simplifies chords to basic triads", () => {
  expect(simplifyChord("D9(#11)")).toBe("D");
  expect(simplifyChord("F#m7")).toBe("F#m");
  expect(simplifyChord("C7M")).toBe("C");
  expect(simplifyChord("Bbmaj7")).toBe("Bb");
  expect(simplifyText("(C7M  D/F#)")).toBe("(C  D)");
});
it("finds open and barre guitar shapes", () => {
  expect(chordShape("G")?.frets).toEqual([3, 2, 0, 0, 0, 3]);
  expect(chordShape("F")).toEqual({ frets: [1, 3, 3, 2, 1, 1], base: 1, name: "F" });
  expect(chordShape("Bm")?.base).toBe(2);
});
it("computes BPM from taps", () => {
  expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
  expect(tapTempo([0])).toBeNull();
  expect(tapTempo([0, 500, 5000])).toBeNull();
});
it("finds previous and next playlist songs", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  expect(neighbors(items, "b")).toEqual({ prev: { id: "a" }, next: { id: "c" } });
  expect(neighbors(items, "a").prev).toBeNull();
});

it("spells chord formulas with their correct diatonic intervals", () => {
  expect(spellChordNotes("C", "")).toEqual(["C", "E", "G"]);
  expect(spellChordNotes("C", "m")).toEqual(["C", "Eb", "G"]);
  expect(spellChordNotes("C", "7(b9)")).toEqual(["C", "E", "G", "Bb", "Db"]);
  expect(spellChordNotes("C", "7(#11)")).toEqual(["C", "E", "G", "Bb", "F#"]);
  expect(spellChordNotes("Bb", "m7")).toEqual(["Bb", "Db", "F", "Ab"]);
  expect(spellChordNotes("C", "dim7")).toEqual(["C", "Eb", "Gb", "Bbb"]);
});
