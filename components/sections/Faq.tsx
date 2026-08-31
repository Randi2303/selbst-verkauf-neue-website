"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { markeImText } from "@/components/ui/BrandName";
import { textMitMarken } from "@/components/ui/PartnerName";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { FAQ_ITEMS } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * FAQ als Accordion mit weicher Höhen-Animation. Die Inhalte stehen in
 * lib/content.ts und werden zusätzlich als FAQPage-JSON-LD ausgegeben.
 */
export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion();

  return (
    <section id="faq" className="section-pad scroll-mt-24">
      <div className="container-page">
        <SectionHeading
          align="center"
          eyebrow="Häufige Fragen"
          lines={["Kurz und ehrlich", "beantwortet"]}
          sub="Die Fragen, die uns beim Verkauf ohne Makler am häufigsten erreichen. Alles Weitere klären wir gern im Chat."
        />

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-4xl border border-line/70 bg-paper px-6 shadow-card sm:px-10">
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.question} className={cn(i > 0 && "border-t border-line/70")}>
                  <h3>
                    <button
                      type="button"
                      id={`faq-frage-${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-antwort-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-6 rounded-xl py-6 text-left"
                    >
                      <span className="text-[1.05rem] font-medium leading-snug">
                        {markeImText(item.question)}
                      </span>
                      <m.span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-background text-ink-muted"
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                      >
                        <ChevronDown size={17} strokeWidth={1.8} />
                      </m.span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <m.div
                        id={`faq-antwort-${i}`}
                        role="region"
                        aria-labelledby={`faq-frage-${i}`}
                        className="overflow-hidden"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 0.61, 0.36, 1] }}
                      >
                        {/* Antworten verlinken auch den Makler-Partner;
                            die Fragen bleiben bei markeImText, denn sie
                            liegen in einem Button und dahin gehört kein Link */}
                        <p className="max-w-[64ch] pb-7 pr-2 leading-relaxed text-ink-muted sm:pr-14">
                          {textMitMarken(item.answer)}
                        </p>
                      </m.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
