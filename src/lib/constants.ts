export const SUPPORTED_CONFESSION_CATEGORIES = [
  "relationships",
  "work",
  "family",
  "health",
  "money",
  "other",
] as const;

type CategoryTuple = typeof SUPPORTED_CONFESSION_CATEGORIES;
export type ConfessionCategory = CategoryTuple[number];

export const isSupportedConfessionCategory = (value: unknown): value is ConfessionCategory =>
  typeof value === "string" && SUPPORTED_CONFESSION_CATEGORIES.includes(value as ConfessionCategory);
