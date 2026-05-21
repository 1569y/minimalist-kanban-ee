const HASHTAG_PATTERN = /(^|[\s(])#([\p{L}\p{N}_-]+)/gu;

export function extractHashtags(markdown: string | undefined): string[] {
  if (!markdown) return [];

  const tags: string[] = [];
  for (const match of markdown.matchAll(HASHTAG_PATTERN)) {
    const body = match[2] ?? "";
    tags.push(`#${body}`);
  }
  return tags;
}

export function stripHashtags(markdown: string | undefined): string {
  if (!markdown) return "";

  return markdown
    .replace(HASHTAG_PATTERN, (match, prefix) => prefix || "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function collectItemHashtags(item: {
  title?: string;
  body?: string;
  subtasks?: Array<{ title?: string; body?: string }>;
}): string[] {
  const all = [
    ...extractHashtags(item.title),
    ...extractHashtags(item.body),
    ...(item.subtasks ?? []).flatMap((subtask) => [
      ...extractHashtags(subtask.title),
      ...extractHashtags(subtask.body),
    ]),
  ];

  return Array.from(new Set(all));
}
