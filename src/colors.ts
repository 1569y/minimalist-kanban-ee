export const LANE_COLOR_OPTIONS = [
  { key: "happy", label: "Muted ochre", rgb: "199, 176, 122" },
  { key: "sad", label: "Dusty blue", rgb: "123, 146, 173" },
  { key: "angry", label: "Terracotta", rgb: "184, 108, 93" },
  { key: "fear", label: "Muted mauve", rgb: "162, 124, 180" },
  { key: "envy", label: "Muted teal", rgb: "112, 156, 146" },
  { key: "ennui", label: "Blue gray", rgb: "105, 112, 156" },
  { key: "disgust", label: "Muted sage green", rgb: "141, 162, 126" },
] as const;

export const CARD_COLOR_OPTIONS = [
  { key: "soft-color", label: "Soft color", rgb: "240, 144, 114" },
  ...LANE_COLOR_OPTIONS,
] as const;

export type LaneColorKey = (typeof LANE_COLOR_OPTIONS)[number]["key"];
export type CardColorKey = (typeof CARD_COLOR_OPTIONS)[number]["key"];

const laneColorKeys = new Set<string>(LANE_COLOR_OPTIONS.map((option) => option.key));
const cardColorKeys = new Set<string>(CARD_COLOR_OPTIONS.map((option) => option.key));

const LEGACY_CARD_COLOR_ALIASES: Record<string, CardColorKey> = {
  "soft-yellow": "soft-color",
};

export function isValidLaneColorKey(
  value: string | null | undefined
): value is LaneColorKey {
  return !!value && laneColorKeys.has(value);
}

export function isValidCardColorKey(
  value: string | null | undefined
): value is CardColorKey {
  return !!normalizeCardColorKey(value);
}

export function normalizeCardColorKey(
  value: string | null | undefined
): CardColorKey | undefined {
  if (!value) return undefined;
  if (cardColorKeys.has(value)) return value as CardColorKey;
  return LEGACY_CARD_COLOR_ALIASES[value];
}
