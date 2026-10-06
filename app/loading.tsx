import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level fallback shown while a page's server render is in flight. The nav
 * (from the layout) stays visible; this fills the content area with a skeleton
 * that mirrors the dashboard shape — no blocking splash, no waiting on client
 * fetches.
 */
export default function Loading() {
  return (
    <div
      className="flex flex-col gap-10"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Reports */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-28" />
        <Card className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-24" />
        </Card>
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-40 w-40 shrink-0 rounded-full" />
          <div className="flex w-full flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </Card>
        <Card>
          <Skeleton className="h-36 w-full" />
        </Card>
      </section>

      {/* Transactions */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-36" />
        <Card className="flex flex-col gap-4 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </Card>
      </section>

      {/* Settings */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32" />
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-8 w-20" />
        </Card>
      </section>
    </div>
  );
}
