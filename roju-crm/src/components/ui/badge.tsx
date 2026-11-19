import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        ok: "border-status-ok/30 bg-status-ok/10 text-status-ok",
        warn: "border-status-warn/30 bg-status-warn/10 text-status-warn",
        urgent: "border-status-urgent/40 bg-status-urgent/15 text-status-urgent",
        late: "border-status-late/40 bg-status-late/15 text-status-late",
        none: "border-status-none/25 bg-transparent text-status-none",
        done: "border-primary-soft/25 bg-primary/20 text-primary-soft",
        service: "border-border bg-secondary text-secondary-foreground font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
