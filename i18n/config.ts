export const locales = ["pt-BR", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-BR";

/** Names shown in the language switcher. */
export const localeNames: Record<Locale, string> = {
  "pt-BR": "Português",
  en: "English",
};

/** Cookie that holds the chosen locale (no URL-based routing). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}
