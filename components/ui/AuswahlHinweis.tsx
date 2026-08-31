"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Einblendung für automatisch angepasste Auswahl (covers/requires):
 * erst was passiert ist, dann das Warum. Gleiche Optik auf Konfigurator
 * und Leistungsseite; Position (sticky-Abstand) kommt per className.
 */
export default function AuswahlHinweis({
  hinweis,
  onClose,
  className,
}: {
  hinweis: string | null;
  onClose: () => void;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div aria-live="polite" className={className}>
      <AnimatePresence>
        {hinweis ? (
          <m.div
            key={hinweis}
            initial={reduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            className={cn(
              "flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-surface-tint px-4 py-3 shadow-soft"
            )}
          >
            <Info size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" />
            <span className="min-w-0 text-[0.88rem] leading-relaxed">{hinweis}</span>
            <button
              type="button"
              aria-label="Hinweis schließen"
              onClick={onClose}
              className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-background hover:text-ink"
            >
              <X size={13} strokeWidth={2} />
            </button>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
