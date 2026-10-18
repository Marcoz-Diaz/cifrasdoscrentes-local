import { expect, it } from "vitest";
import { createHistory, record, undo, redo } from "./edit-history";

it("undoes and redoes separate edits", () => {
  let h = createHistory("a");
  h = record(h, "ab", 1000);
  h = record(h, "abc", 5000);
  h = undo(h); expect(h.present).toBe("ab");
  h = undo(h); expect(h.present).toBe("a");
  h = undo(h); expect(h.present).toBe("a");
  h = redo(h); expect(h.present).toBe("ab");
  h = redo(h); expect(h.present).toBe("abc");
});

it("groups fast typing into one undo step", () => {
  let h = createHistory("");
  h = record(h, "o", 1000);
  h = record(h, "oi", 1200);
  h = record(h, "oi!", 1400);
  expect(undo(h).present).toBe("");
});

it("a new edit clears redo", () => {
  let h = record(createHistory("a"), "b", 1000);
  h = undo(h);
  h = record(h, "c", 9000);
  expect(redo(h).present).toBe("c");
});
