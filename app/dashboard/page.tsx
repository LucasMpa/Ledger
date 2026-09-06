import { Reports } from "@/components/dashboard/reports";
import { Settings } from "@/components/dashboard/settings";
import { TransactionList } from "@/components/dashboard/transaction-list";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <Reports />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-foreground">Transactions</h2>
        <TransactionList />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        <Settings email={user?.email ?? null} />
      </section>
    </div>
  );
}
