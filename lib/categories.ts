import { z } from "zod";

/**
 * The nine fixed expense categories — the single source of truth. Feeds the
 * Drizzle `pgEnum`, the Zod schemas (API + LLM output), the LLM prompt, and the
 * UI `<select>`. The LLM must always pick exactly one — never null; unsure => "other".
 */
export const CATEGORIES = [
  "groceries",
  "food",
  "transport",
  "health",
  "home",
  "leisure",
  "clothing",
  "services",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const categorySchema = z.enum(CATEGORIES);

/** Slug -> display label for the UI. */
export const categoryLabels: Record<Category, string> = {
  groceries: "Groceries",
  food: "Food & drink",
  transport: "Transport",
  health: "Health",
  home: "Home",
  leisure: "Leisure",
  clothing: "Clothing",
  services: "Services",
  other: "Other",
};
