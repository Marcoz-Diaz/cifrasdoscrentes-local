import { describe, it, expect } from "vitest";
import { identifyChord, harmonicField, chordToDegree, estimateMinutes, noteFromFreq } from "./music-tools";

describe("smart tools", () => {
  it("names open chords from frets", () => {
    expect(identifyChord([-1, 3, 2, 0, 1, 0])).toBe("C");
    expect(identifyChord([0, 2, 2, 0, 0, 0])).toBe("Em");
    expect(identifyChord([3, 2, 0, 0, 0, 3])).toBe("G");
  });
  it("lists the harmonic field", () => {
    expect(harmonicField("C").map((x) => x.chord)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "B°"]);
  });
  it("converts chords to degrees", () => {
    expect(chordToDegree("Am", "C")).toBe("vi");
    expect(chordToDegree("G7", "C")).toBe("V7");
  });
  it("estimates duration", () => {
    expect(estimateMinutes(Array(40).fill("x").join("\n"), 80)).toBe(2);
  });
  it("detects A4", () => {
    expect(noteFromFreq(440)).toEqual({ note: "A4", cents: 0 });
  });
});
