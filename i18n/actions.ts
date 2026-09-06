"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

/** Persists the chosen locale in a cookie. The caller refreshes the router. */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
