"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { useFarbHuelle } from "@/lib/farb-huelle";
import { cn } from "@/lib/shadcn-utils";

/**
 * shadcn-Sheet auf Radix-Dialog-Basis, für das "Mehr"-Menü der mobilen
 * Navigation (von unten) und künftige Seitenpanels.
 */
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      "motion-reduce:animate-none",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

/**
 * DIE HOEHENGRENZE IST DER KERN DIESER KOMPONENTE, nicht Kosmetik.
 *
 * Vorher hatte das Panel keine Grenze und wuchs mit seinem Inhalt. Bei
 * 390 auf 844 Pixeln war das Menue 894 Pixel hoch, hing am unteren Rand
 * und stand damit 50 Pixel ueber den Bildschirm hinaus. Genau dort
 * sassen Titel und Schliessen-Kreuz. Beide waren vorhanden und
 * unerreichbar, und weil der Inhalt nicht scrollte, kam man auch nicht
 * an sie heran. Wer nichts auswaehlen wollte, sass fest.
 *
 * Deshalb: 85 Prozent der SICHTBAREN Hoehe (dvh, nicht vh, sonst rechnet
 * ein Handy die eingeklappte Adressleiste mit), Kopfzeile ausserhalb des
 * scrollenden Bereichs, und der Rest scrollt.
 */
const sheetVariants = cva(
  "fixed z-50 flex flex-col bg-paper shadow-lift outline-none motion-reduce:animate-none",
  {
    variants: {
      side: {
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl border-t border-line/70 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
        right:
          "inset-y-0 right-0 w-[min(22rem,90vw)] rounded-l-3xl border-l border-line/70 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
      },
    },
    defaultVariants: { side: "bottom" },
  }
);

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> &
    VariantProps<typeof sheetVariants> & {
      /**
       * Der Titel. Bewusst eine Eigenschaft und kein Kind: So kann die
       * Komponente garantieren, dass er zusammen mit dem Kreuz AUSSERHALB
       * des scrollenden Bereichs liegt. Als Kind uebergeben liesse sich
       * genau das wieder aushebeln.
       */
      titel: React.ReactNode;
      /**
       * Vorlesetext des Kreuzes. Die Flaeche traegt inzwischen mehr als
       * das Menue (auch Erklaerungen), und "Menue schliessen" waere
       * dort schlicht falsch.
       */
       schliessenText?: string;
    }
>(({ className, children, side, titel, schliessenText = "Schließen", ...props }, ref) => {
  // Anker in der Huelle wegen der Farbfassung; der Hook loest sie erst
  // NACH dem Einhaengen auf, siehe lib/farb-huelle.ts.
  const huelle = useFarbHuelle();
  return (
  <SheetPrimitive.Portal container={huelle}>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {/* Kopfzeile: bleibt stehen, egal wie lang der Inhalt wird */}
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 pb-3 pt-5">
        <SheetTitle>{titel}</SheetTitle>
        <SheetPrimitive.Close
          aria-label={schliessenText}
          className="-mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <X size={20} strokeWidth={1.9} />
        </SheetPrimitive.Close>
      </div>

      {/* Der scrollende Teil. overscroll-contain verhindert, dass die
          Seite dahinter mitscrollt, wenn man am Ende der Liste
          weiterwischt. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
  );
});
SheetContent.displayName = "SheetContent";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(
      "font-heading text-[1.12rem] font-semibold tracking-[-0.01em] text-ink",
      className
    )}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle };
