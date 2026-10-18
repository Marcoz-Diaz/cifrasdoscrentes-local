import { expect, it } from "vitest";
import { adjustBpm } from "./sheet-controls";

it("increments and decrements BPM by one", () => {
  expect(adjustBpm(80, 1)).toBe(81);
  expect(adjustBpm(80, -1)).toBe(79);
});

it("allows BPM to reach zero", () => {
  expect(adjustBpm(1, -1)).toBe(0);
  expect(adjustBpm(0, -1)).toBe(0);
});

it("keeps BPM within the maximum limit", () => {
  expect(adjustBpm(300, 1)).toBe(300);
});
