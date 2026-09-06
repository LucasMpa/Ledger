import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("metaTitle") };
}

function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  // Only allow same-site absolute paths.
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("login");
  const params = await searchParams;
  const next = safeNext(params.next);
  const hasError = params.error != null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("heading")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>
      {hasError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t("linkError")}
        </p>
      ) : null}
      <LoginForm next={next} />
    </div>
  );
}
