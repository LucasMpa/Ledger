import { getTranslations } from "next-intl/server";

import { Reports } from "@/components/dashboard/reports";
import { Settings } from "@/components/dashboard/settings";
import { TransactionList } from "@/components/dashboard/transaction-list";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold text-foreground">{t("reports")}</h1>
        <Reports />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-foreground">
          {t("transactions")}
        </h2>
        <TransactionList />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-foreground">{t("settings")}</h2>
        <Settings email={user?.email ?? null} />
      </section>
    </div>
  );
}
