import { tick } from "svelte";

const EDITOR_SUBTASK_LINE_RE = /^[-*]\s+(?:\[[ xX]\]\s+)?/;
const EDITOR_SUBTASK_BODY_RE = /^(?: {2}|\t)(?![-*]\s).*$/;

export interface TextSelectionRange {
  start: number;
  end: number;
}

export interface SelectionResolution {
  start: number;
  end: number;
  usedFallback: boolean;
  active: boolean;
  selectedText: string;
}

export interface SelectionOperationResult {
  applied: boolean;
  reason?: "no-textarea" | "invalid-selection";
  usedFallback: boolean;
  start: number | null;
  end: number | null;
  finalStart: number | null;
  finalEnd: number | null;
  selectedText: string;
}

export function isValidSelectionRange(
  range: TextSelectionRange | null | undefined,
  valueLength: number
): range is TextSelectionRange {
  if (!range) return false;
  const { start, end } = range;
  return (
    typeof start === "number" &&
    typeof end === "number" &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start >= 0 &&
    end >= start &&
    end <= valueLength
  );
}

export function resolveSelectionRange(
  textarea: HTMLTextAreaElement,
  value: string,
  fallbackSelection?: TextSelectionRange | null
): SelectionResolution | null {
  const isFocused = document.activeElement === textarea;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const valueLength = value.length;

  if (isFocused) {
    if (
      typeof start === "number" &&
      typeof end === "number" &&
      isValidSelectionRange({ start, end }, valueLength)
    ) {
      return {
        start,
        end,
        usedFallback: false,
        active: true,
        selectedText: value.slice(start, end),
      };
    }
    return null;
  }

  if (isValidSelectionRange(fallbackSelection, valueLength)) {
    return {
      start: fallbackSelection.start,
      end: fallbackSelection.end,
      usedFallback: true,
      active: false,
      selectedText: value.slice(fallbackSelection.start, fallbackSelection.end),
    };
  }
  return null;
}

export async function insertAtSelection(
  textarea: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
  insertText: string,
  fallbackSelection?: TextSelectionRange | null
) {
  if (!textarea) {
    return {
      applied: false,
      reason: "no-textarea",
      usedFallback: false,
      start: null,
      end: null,
      finalStart: null,
      finalEnd: null,
      selectedText: "",
    } satisfies SelectionOperationResult;
  }

  const selection = resolveSelectionRange(textarea, value, fallbackSelection);
  if (!selection) {
    return {
      applied: false,
      reason: "invalid-selection",
      usedFallback: false,
      start: null,
      end: null,
      finalStart: null,
      finalEnd: null,
      selectedText: "",
    } satisfies SelectionOperationResult;
  }

  const { start, end, usedFallback, selectedText } = selection;
  const nextValue = value.slice(0, start) + insertText + value.slice(end);
  setValue(nextValue);
  await tick();
  const cursor = start + insertText.length;
  textarea.focus();
  textarea.setSelectionRange(cursor, cursor);

  return {
    applied: true,
    usedFallback,
    start,
    end,
    finalStart: cursor,
    finalEnd: cursor,
    selectedText,
  } satisfies SelectionOperationResult;
}

export async function wrapSelection(
  textarea: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
  prefix: string,
  suffix = prefix,
  fallbackSelection?: TextSelectionRange | null
) {
  if (!textarea) {
    return {
      applied: false,
      reason: "no-textarea",
      usedFallback: false,
      start: null,
      end: null,
      finalStart: null,
      finalEnd: null,
      selectedText: "",
    } satisfies SelectionOperationResult;
  }

  const selection = resolveSelectionRange(textarea, value, fallbackSelection);
  if (!selection) {
    return {
      applied: false,
      reason: "invalid-selection",
      usedFallback: false,
      start: null,
      end: null,
      finalStart: null,
      finalEnd: null,
      selectedText: "",
    } satisfies SelectionOperationResult;
  }

  const { start, end, usedFallback, selectedText } = selection;
  const selected = value.slice(start, end);
  const insertion = `${prefix}${selected}${suffix}`;
  const nextValue = value.slice(0, start) + insertion + value.slice(end);
  setValue(nextValue);
  await tick();
  const cursorStart = start + prefix.length;
  const cursorEnd = cursorStart + selected.length;
  textarea.focus();
  if (selected.length > 0) {
    textarea.setSelectionRange(cursorStart, cursorEnd);
  } else {
    textarea.setSelectionRange(cursorStart, cursorStart);
  }

  return {
    applied: true,
    usedFallback,
    start,
    end,
    finalStart: selected.length > 0 ? cursorStart : cursorStart,
    finalEnd: selected.length > 0 ? cursorEnd : cursorStart,
    selectedText,
  } satisfies SelectionOperationResult;
}

export async function applyMarkdownFormat(
  textarea: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
  format: "bold" | "italic",
  fallbackSelection?: TextSelectionRange | null
) {
  if (format === "bold") {
    return wrapSelection(textarea, value, setValue, "**", "**", fallbackSelection);
  }

  return wrapSelection(textarea, value, setValue, "*", "*", fallbackSelection);
}

export function shouldContinueSubtaskBodyOnEnter(
  textarea: HTMLTextAreaElement | null,
  value: string
): boolean {
  if (!textarea) return false;

  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  if (start !== end) return false;

  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEnd = value.indexOf("\n", start);
  const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);

  if (
    !EDITOR_SUBTASK_LINE_RE.test(currentLine) &&
    !EDITOR_SUBTASK_BODY_RE.test(currentLine)
  ) {
    return false;
  }

  return true;
}

export async function continueSubtaskBodyOnEnter(
  textarea: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void
) {
  await insertAtSelection(textarea, value, setValue, "\n  ");
}
