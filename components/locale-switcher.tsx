"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

import { setLocale } from "@/i18n/actions";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const current = useLocale();
  const t = useTranslations("nav");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Locale;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <select
      aria-label={t("language")}
      value={current}
      onChange={onChange}
      disabled={pending}
      className="rounded-lg bg-transparent px-1.5 py-1 text-sm text-muted hover:text-foreground focus:outline-none disabled:opacity-50"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
