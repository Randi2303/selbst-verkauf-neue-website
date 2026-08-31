import * as React from "react";

import { cn } from "@/lib/shadcn-utils";

/**
 * Mehrzeiliges Textfeld im Stil der Eingabefelder. Waechst mit dem
 * Inhalt (field-sizing) bis zu einer sinnvollen Hoehe und scrollt
 * darueber hinaus, der Cursor bleibt so immer sichtbar. Browser ohne
 * field-sizing behalten die feste Hoehe mit Scrollleiste.
 *
 * Eigener Scrollbereich: overscroll-contain haelt das Rad im Feld,
 * erst am Inhalts-Ende uebernimmt die Seite. data-lenis-prevent gilt
 * fuer Seiten mit sanftem Scrollen (Website); in Konto und Admin
 * laeuft ohnehin natives Scrollen.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    data-lenis-prevent=""
    className={cn(
      "max-h-72 min-h-28 w-full overflow-y-auto overscroll-contain rounded-xl border border-line bg-paper px-4 py-2.5 text-[0.95rem] leading-relaxed text-ink [field-sizing:content] placeholder:text-ink-muted/60 transition-colors focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
