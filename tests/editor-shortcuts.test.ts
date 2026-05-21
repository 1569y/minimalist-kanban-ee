import { describe, expect, test, vi } from "vitest";
import {
  applyMarkdownFormat,
  isValidSelectionRange,
  resolveSelectionRange,
} from "../src/editor-shortcuts";

function makeTextarea(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  document.body.appendChild(textarea);
  return textarea;
}

describe("editor-shortcuts", () => {
  test("when textarea is not active, toolbar uses last valid selection", async () => {
    const textarea = makeTextarea("Parent\n- [ ] Subtask");
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    textarea.focus();
    textarea.setSelectionRange(13, 20);
    outside.focus();

    let nextValue = textarea.value;
    const result = await applyMarkdownFormat(
      textarea,
      textarea.value,
      (next) => {
        nextValue = next;
        textarea.value = next;
      },
      "bold",
      { start: 13, end: 20 }
    );

    expect(result?.applied).toBe(true);
    expect(result?.usedFallback).toBe(true);
    expect(nextValue).toBe("Parent\n- [ ] **Subtask**");
  });

  test("when lastSelection is invalid, toolbar aborts instead of inserting at 0", async () => {
    const textarea = makeTextarea("Parent\n- [ ] Subtask");
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    outside.focus();

    let nextValue = textarea.value;
    const result = await applyMarkdownFormat(
      textarea,
      textarea.value,
      (next) => {
        nextValue = next;
        textarea.value = next;
      },
      "italic",
      { start: -1, end: 999 }
    );

    expect(result?.applied).toBe(false);
    expect(result?.reason).toBe("invalid-selection");
    expect(nextValue).toBe("Parent\n- [ ] Subtask");
  });

  test("validates selection bounds", () => {
    expect(isValidSelectionRange({ start: 0, end: 0 }, 5)).toBe(true);
    expect(isValidSelectionRange({ start: 2, end: 4 }, 5)).toBe(true);
    expect(isValidSelectionRange({ start: -1, end: 4 }, 5)).toBe(false);
    expect(isValidSelectionRange({ start: 4, end: 2 }, 5)).toBe(false);
    expect(isValidSelectionRange({ start: 1, end: 6 }, 5)).toBe(false);
  });

  test("resolveSelectionRange uses active textarea selection when focused", () => {
    const textarea = makeTextarea("Hello world");
    textarea.focus();
    textarea.setSelectionRange(6, 11);

    const resolved = resolveSelectionRange(textarea, textarea.value, {
      start: 0,
      end: 5,
    });

    expect(resolved).toMatchObject({
      start: 6,
      end: 11,
      usedFallback: false,
      active: true,
      selectedText: "world",
    });
  });
});
