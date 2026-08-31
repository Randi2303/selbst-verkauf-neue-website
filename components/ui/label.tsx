import * as React from "react";

import { cn } from "@/lib/shadcn-utils";

/** Feld-Beschriftung im Stil der Kasse */
const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block text-[0.85rem] font-medium text-ink", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
