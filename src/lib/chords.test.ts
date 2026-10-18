import { describe, it, expect } from "vitest";
import { transposeChord, isChordLine, transposeText, transposeKey, keyTransposeSteps } from "./chords";

describe("chords", () => {
  it("selects a key and transposes the chords by the same interval", () => {
    const steps = keyTransposeSteps("E", "G");
    expect(steps).toBe(3);
    expect(transposeKey("E", steps)).toBe("G");
    expect(transposeText("E  B  C#m", steps)).toBe("G  D  Em");
    expect(keyTransposeSteps("E", "E")).toBe(0);
  });
  it("preserves minor quality and combines selected key with capo", () => {
    const steps = keyTransposeSteps("F#m", "A");
    expect(transposeKey("F#m", steps)).toBe("Am");
    expect(transposeKey("F#m", steps - 2)).toBe("Gm");
    expect(keyTransposeSteps("Bb", "A")).toBe(-1);
  });
  it("transposes up a semitone", () => {
    expect(transposeChord("C", 1)).toBe("C#");
    expect(transposeChord("Am7", 2)).toBe("Bm7");
    expect(transposeChord("G/B", 2)).toBe("A/C#");
  });
  it("transposes down keeping flats", () => {
    expect(transposeChord("Bb", -1)).toBe("A");
    expect(transposeChord("Eb", 1)).toBe("E");
  });
  it("detects chord lines but not lyrics", () => {
    expect(isChordLine("C    G   Am  F")).toBe(true);
    expect(isChordLine("Amor que vem")).toBe(false);
  });
  it("only transposes chord lines", () => {
    expect(transposeText("C  G\nCanto a Deus", 2)).toBe("D  A\nCanto a Deus");
  });
  it("shifts a key name for capo shapes", () => {
    expect(transposeKey("E", -2)).toBe("D");
    expect(transposeKey("Bb", -1)).toBe("A");
    expect(transposeKey("F#m", -2)).toBe("Em");
    expect(transposeKey("C", 0)).toBe("C");
    expect(transposeKey("", 3)).toBe("");
  });
});

import { detectKey, detectKeySequence } from "./chords";
describe("key detection", () => {
  it("detects major keys", () => {
    expect(detectKey("G  D  Em  C\nletra\nG D C G")).toBe("G");
    expect(detectKey("C  G  Am  F\nletra")).toBe("C");
  });
  it("detects minor keys", () => {
    expect(detectKey("Am  F  C  G\nletra\nAm E Am")).toBe("Am");
  });
  it("detects a key change between sections", () => {
    expect(detectKeySequence("[Verso]\nC G Am F\n[Refrão final]\nD A Bm G")).toEqual(["C", "D"]);
  });
  it("returns empty when there are no chords", () => {
    expect(detectKey("só letra aqui")).toBe("");
  });
});

import { segmentLine as seg, extractChords as ex } from "./chords";
describe("brackets and parentheses", () => {
  it("[ ] is never a chord", () => {
    expect(seg("[Intro] C G", 2)).toEqual([{ text: "[Intro]", kind: "section" }, { text: " D A", kind: "chord" }]);
    expect(seg("[A]", 2)).toEqual([{ text: "[A]", kind: "section" }]);
  });
  it("( ) is always a chord, transposed", () => {
    expect(seg("Eu te amo (C G)", 2)).toEqual([{ text: "Eu te amo ", kind: "text" }, { text: "(D A)", kind: "chord" }]);
    expect(ex("Letra (Am) aqui")).toEqual(["Am"]);
  });
});

import { relativeKey, convertToRelative } from "./chords";
describe("relative key", () => {
  it("maps C to Am and back", () => {
    expect(relativeKey("C")).toBe("Am");
    expect(relativeKey("Am")).toBe("C");
    expect(relativeKey("G")).toBe("Em");
  });
  it("converts major progression to relative minor by degree", () => {
    expect(convertToRelative("C G Am F", "C")).toBe("Am E F Dm");
  });
  it("converts minor back to major", () => {
    expect(convertToRelative("Am E F Dm", "Am")).toBe("C G Am F");
  });
});
