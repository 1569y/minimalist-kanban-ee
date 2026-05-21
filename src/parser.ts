import { Board, Lane, Item, Subtask, generateId } from "./types";
import {
  isValidCardColorKey,
  isValidLaneColorKey,
  normalizeCardColorKey,
} from "./colors";

const LIST_ITEM_RE = /^[-*]\s+(?:\[([ xX])\]\s+)?(.+)/;
const SUBTASK_RE = /^(?: {2}|\t)[-*]\s+(?:\[([ xX])\]\s+)?(.+)/;
const ITEM_BODY_RE = /^(?: {2}|\t)(?![-*]\s)(.*)$/;
const SUBTASK_BODY_RE = /^(?: {4}|\t{2,})(.*)$/;
const EDITOR_SUBTASK_BODY_RE = /^(?: {2}|\t)(.*)$/;
const LIST_COLOR_COMMENT_RE = /^<!--\s*mk-list-color:\s*([a-z-]+)\s*-->$/;
const CARD_COLOR_COMMENT_RE = /^<!--\s*mk-card-color:\s*([a-z-]+)\s*-->$/;

function createListItem(match: RegExpMatchArray): Pick<Item, "title" | "checked" | "hasCheckbox"> {
  const hasCheckbox = match[1] !== undefined;
  const checked = match[1] === "x" || match[1] === "X";
  return {
    title: match[2],
    checked,
    hasCheckbox,
  };
}

function createSubtaskFromMatch(
  match: RegExpMatchArray,
  existingSubtask?: Subtask
): Subtask {
  const subtaskData = createListItem(match);
  return {
    id: existingSubtask?.id ?? generateId(),
    ...subtaskData,
  };
}

function appendBodyLine(target: { body?: string }, line: string) {
  target.body = target.body ? `${target.body}\n${line}` : line;
}

export function formatItemForEditing(item: Item): string {
  const lines = [item.title];
  if (item.body) {
    lines.push(...item.body.split("\n"));
  }
  for (const subtask of item.subtasks ?? []) {
    lines.push(`- [${subtask.checked ? "x" : " "}] ${subtask.title}`);
    if (subtask.body) {
      lines.push(...subtask.body.split("\n").map((line) => `  ${line}`));
    }
  }
  return lines.join("\n");
}

export function parseItemFromEditor(
  draft: string,
  existingSubtasks: Subtask[] = []
): Pick<Item, "title" | "body" | "subtasks"> {
  const lines = draft.replace(/\r\n?/g, "\n").split("\n");
  const itemTextLines: string[] = [];
  const subtasks: Subtask[] = [];
  let currentSubtask: Subtask | null = null;

  lines.forEach((line, index) => {
    const match = line.match(LIST_ITEM_RE);
    if (index > 0 && match) {
      const subtask = createSubtaskFromMatch(match, existingSubtasks[subtasks.length]);
      subtasks.push(subtask);
      currentSubtask = subtask;
      return;
    }

    const subtaskBodyMatch = currentSubtask ? line.match(EDITOR_SUBTASK_BODY_RE) : null;
    if (currentSubtask && subtaskBodyMatch) {
      appendBodyLine(currentSubtask, subtaskBodyMatch[1]);
      return;
    }

    if (currentSubtask) {
      appendBodyLine(currentSubtask, line);
      return;
    }

    itemTextLines.push(line);
  });

  const title = itemTextLines[0]?.trim() ?? "";
  const body = itemTextLines.slice(1).join("\n").trim() || undefined;

  return {
    title,
    body,
    subtasks: subtasks.length > 0 ? subtasks : undefined,
  };
}

export function parseBoard(markdown: string): Board {
  const lines = markdown.split("\n");
  const lanes: Lane[] = [];
  const archive: Item[] = [];
  let currentLane: Lane | null = null;
  let currentItem: Item | null = null;
  let currentSubtask: Subtask | null = null;
  let inFrontmatter = false;
  let frontmatterSeen = false;
  let inArchive = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const laneColorMatch = trimmed.match(LIST_COLOR_COMMENT_RE);
    const cardColorMatch = trimmed.match(CARD_COLOR_COMMENT_RE);

    if (trimmed === "---") {
      if (!frontmatterSeen) {
        inFrontmatter = !inFrontmatter;
        if (!inFrontmatter) frontmatterSeen = true;
        continue;
      }
      if (!inArchive) {
        inArchive = true;
        currentLane = null;
        currentItem = null;
        currentSubtask = null;
        continue;
      }
    }
    if (inFrontmatter) continue;

    if (trimmed.startsWith("## ")) {
      currentItem = null;
      currentSubtask = null;
      const title = trimmed.substring(3).trim();

      if (inArchive) {
        continue;
      }

      currentLane = { id: generateId(), title, items: [] };
      lanes.push(currentLane);
      continue;
    }

    if (currentLane && !currentItem && laneColorMatch) {
      if (isValidLaneColorKey(laneColorMatch[1])) {
        currentLane.color = laneColorMatch[1];
      }
      continue;
    }

    if (currentItem && cardColorMatch) {
      const normalizedColor = normalizeCardColorKey(cardColorMatch[1]);
      if (normalizedColor) {
        currentItem.color = normalizedColor;
      }
      continue;
    }

    const subtaskMatch = currentItem ? line.match(SUBTASK_RE) : null;
    if (currentItem && subtaskMatch) {
      const subtask = createSubtaskFromMatch(subtaskMatch);
      currentItem.subtasks = currentItem.subtasks ?? [];
      currentItem.subtasks.push(subtask);
      currentSubtask = subtask;
      continue;
    }

    const subtaskBodyMatch = currentSubtask ? line.match(SUBTASK_BODY_RE) : null;
    if (currentSubtask && subtaskBodyMatch && trimmed) {
      appendBodyLine(currentSubtask, subtaskBodyMatch[1]);
      continue;
    }

    const itemBodyMatch = currentItem ? line.match(ITEM_BODY_RE) : null;
    if (currentItem && itemBodyMatch && trimmed) {
      currentSubtask = null;
      appendBodyLine(currentItem, itemBodyMatch[1]);
      continue;
    }

    const match = trimmed.match(LIST_ITEM_RE);
    if (match) {
      const newItem: Item = {
        id: generateId(),
        ...createListItem(match),
      };

      if (inArchive) {
        archive.push(newItem);
        currentItem = newItem;
        currentSubtask = null;
      } else if (currentLane) {
        currentLane.items.push(newItem);
        currentItem = newItem;
        currentSubtask = null;
      }
      continue;
    }

    if (trimmed === "") {
      currentItem = null;
      currentSubtask = null;
    }
  }

  return { lanes, archive };
}

function serializeItem(lines: string[], item: Item) {
  lines.push(`- [${item.checked ? "x" : " "}] ${item.title}`);
  const normalizedColor = normalizeCardColorKey(item.color);
  if (normalizedColor && isValidCardColorKey(normalizedColor)) {
    lines.push(`  <!-- mk-card-color: ${normalizedColor} -->`);
  }
  for (const bodyLine of item.body?.split("\n") ?? []) {
    lines.push(`  ${bodyLine}`);
  }
  for (const subtask of item.subtasks ?? []) {
    lines.push(`  - [${subtask.checked ? "x" : " "}] ${subtask.title}`);
    for (const bodyLine of subtask.body?.split("\n") ?? []) {
      lines.push(`    ${bodyLine}`);
    }
  }
}

export function serializeBoard(board: Board): string {
  const lines: string[] = ["---", "kanban-plugin: board", "---", ""];

  for (const lane of board.lanes) {
    lines.push(`## ${lane.title}`);
    if (lane.color && isValidLaneColorKey(lane.color)) {
      lines.push(`<!-- mk-list-color: ${lane.color} -->`);
    }
    for (const item of lane.items) {
      serializeItem(lines, item);
    }
    lines.push("");
  }

  if (board.archive.length > 0) {
    lines.push("---", "", "## Archive");
    for (const item of board.archive) {
      serializeItem(lines, item);
    }
    lines.push("");
  }

  return lines.join("\n");
}
