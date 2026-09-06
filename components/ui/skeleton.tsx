import { cn } from "@/lib/cn";

/** A pulsing placeholder block. Compose with width/height utility classes. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border/70", className)}
      {...props}
    />
  );
}
