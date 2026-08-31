"use client";

import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { telHref } from "@/lib/utils";
import { siteConfig } from "@/site.config";

/**
 * Ruhiger Abschluss der Team-Seite: anrufen oder schreiben.
 *
 * Der zweite Knopf hiess bis zum 21.08.2026 "Chat öffnen" und
 * oeffnete eine Absage. Siehe components/leistungen/ServicesCta.tsx.
 */
export default function TeamCta() {
  return (
    <Reveal>
      <div className="rounded-4xl border border-line/60 bg-gradient-to-br from-surface via-background to-surface-tint px-6 py-12 text-center shadow-card sm:px-12 md:py-16">
        <h2 className="font-heading text-h3 text-ink">
          Lernen Sie uns kennen, bevor Sie starten.
        </h2>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink-muted">
          Rufen Sie an oder schreiben Sie uns. Wir nehmen uns Zeit,
          bevor Sie sich für irgendetwas entscheiden.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a href={telHref(siteConfig.contact.phone)} className="btn-primary">
            <Phone size={16} strokeWidth={1.8} />
            <span className="tabular-nums">{siteConfig.contact.phone}</span>
          </a>
          <a href={`mailto:${siteConfig.contact.email}`} className="btn-secondary">
            <Mail size={16} strokeWidth={1.8} />
            Schreiben Sie uns
          </a>
        </div>
        <p className="mx-auto mt-6 max-w-xl text-[0.9rem] leading-relaxed text-ink-muted">
          Oder sehen Sie sich in Ruhe{" "}
          <Link href="/leistungen" className="font-medium text-primary transition-colors hover:text-primary-dark">
            unsere Leistungen
          </Link>{" "}
          an und stellen Sie daraus{" "}
          <Link href="/wunsch-paket" className="font-medium text-primary transition-colors hover:text-primary-dark">
            Ihr Wunsch-Paket
          </Link>{" "}
          zusammen.
        </p>
      </div>
    </Reveal>
  );
}
