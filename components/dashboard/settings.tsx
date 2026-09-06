import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export async function Settings({ email }: { email: string | null }) {
  const t = await getTranslations("settings");

  return (
    <Card className="flex flex-col gap-3 text-sm">
      {email ? (
        <p className="text-muted">
          {t("signedInAs", { email })}
        </p>
      ) : (
        <p className="text-muted">{t("notSignedIn")}</p>
      )}

      {email ? (
        <form action="/auth/signout" method="post" className="self-start">
          <Button type="submit" variant="secondary" size="sm">
            {t("signOut")}
          </Button>
        </form>
      ) : (
        <a
          href="/login"
          className="self-start rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          {t("signIn")}
        </a>
      )}
    </Card>
  );
}
