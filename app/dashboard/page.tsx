import { Reports } from "@/components/dashboard/reports";
import { Settings } from "@/components/dashboard/settings";
import { TransactionList } from "@/components/dashboard/transaction-list";

export default function DashboardPage() {
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
        <Settings />
      </section>
    </div>
  );
}
