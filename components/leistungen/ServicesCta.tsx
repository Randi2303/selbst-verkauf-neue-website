"use client";

import { Mail, Phone } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { telHref } from "@/lib/utils";
import { siteConfig } from "@/site.config";

/**
 * Abschluss der Leistungsseite: anrufen oder schreiben.
 *
 * HIER STAND "CHAT ÖFFNEN" (bis 21.08.2026). Der Knopf löste den
 * schwebenden Chat aus, und der sagte, er sei noch nicht
 * eingerichtet. Ein Knopf, der eine Absage öffnet, ist ein Knopf ohne
 * Funktion, und die gibt es hier nicht.
 *
 * JETZT NENNT ER, WAS ES WIRKLICH GIBT: die E-Mail-Adresse aus dem
 * Katalog, dieselbe wie im Fuß jeder Seite. Kein neuer Weg, nur ein
 * ehrlicher.
 */
export default function ServicesCta() {
  return (
    <Reveal>
      <div className="rounded-4xl border border-line/60 bg-gradient-to-br from-surface via-background to-surface-tint px-6 py-12 text-center shadow-card sm:px-12 md:py-16">
        <h2 className="font-heading text-h3 text-ink">
          Nicht sicher, was Ihr Objekt braucht?
        </h2>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink-muted">
          Rufen Sie an oder schreiben Sie uns. Wir sagen Ihnen ehrlich,
          welche Leistungen sich für Ihr Objekt lohnen und welche nicht.
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
      </div>
    </Reveal>
  );
}
