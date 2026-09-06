import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in · Ledger" };

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
  const params = await searchParams;
  const next = safeNext(params.next);
  const hasError = params.error != null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to send receipts and see your reports.
        </p>
      </div>
      {hasError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          That sign-in link didn&apos;t work. Request a new one below.
        </p>
      ) : null}
      <LoginForm next={next} />
    </div>
  );
}
