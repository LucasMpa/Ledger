"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("login");
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <Card className="text-sm">
        <p className="font-medium text-foreground">{t("checkEmail")}</p>
        <p className="mt-1 text-muted">{t("checkEmailHint", { email })}</p>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending" ? t("sending") : t("sendLink")}
        </Button>
        {status === "error" && message ? (
          <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
        ) : null}
        <p className="text-xs text-muted">{t("noPassword")}</p>
      </form>
    </Card>
  );
}
