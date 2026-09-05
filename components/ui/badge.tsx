import * as React from "react";

import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "warning" | "success" | "muted";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "border-border bg-surface text-foreground",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  success: "border-primary/40 bg-primary/15 text-primary",
  muted: "border-border bg-background text-muted",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, variant = "default", ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
          variants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
