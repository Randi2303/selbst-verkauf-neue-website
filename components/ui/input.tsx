import * as React from "react";

import { cn } from "@/lib/shadcn-utils";

/** shadcn-Eingabefeld im Feld-Stil der Kasse */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[0.95rem] text-ink transition-colors placeholder:text-ink-muted/70 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-accent-deep/70",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
