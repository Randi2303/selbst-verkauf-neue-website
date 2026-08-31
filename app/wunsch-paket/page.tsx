import type { Metadata } from "next";
import { Suspense } from "react";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Konfigurator from "@/components/wunsch-paket/Konfigurator";
import { siteConfig } from "@/site.config";

const PAGE_TITLE = "Wunsch-Paket zusammenstellen | selbst-verkauf.de";
const PAGE_DESCRIPTION =
  "Stellen Sie Ihr persönliches Wunsch-Paket aus über 20 Einzelleistungen zusammen, mit klaren Preisen. Bestellt ist Ihre Auswahl in wenigen Minuten.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/wunsch-paket" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/wunsch-paket",
    siteName: siteConfig.name,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function WunschPaketPage() {
  return (
    <>
      <Header />
      <main
      id="inhalt" className="pt-28 md:pt-36"
      /* SCHRIFT DER ANWENDUNG (Runde 37, Freigabe des Inhabers vom
         29.08.2026: die Zwischenseiten kommen mit). Diese Seite steht
         unter oeffentlicher Adresse, gehoert aber zur Anwendung.
         Erklaerung der Regel in app/globals.css. */
      data-bereich="anwendung"
    >
        <section className="container-page">
          <p className="anim-rise eyebrow">Wunsch-Paket</p>
          <h1
            className="anim-rise mt-4 max-w-3xl font-heading text-h2 opsz-display text-ink"
            style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
          >
            Stellen Sie zusammen, was Ihr Verkauf wirklich braucht.
          </h1>
          <p
            className="anim-rise mt-5 max-w-2xl text-[1.13rem] leading-relaxed text-ink-muted"
            style={{ "--rise-delay": "0.16s" } as React.CSSProperties}
          >
            Wählen Sie Leistungen in drei Phasen, mit klaren Preisen je
            Leistung. Was Sie zusammenstellen, bestellen Sie direkt an der
            Kasse.
          </p>
        </section>

        <section className="container-page mt-10 pb-24 md:mt-12 md:pb-32">
          {/* Suspense wegen useSearchParams (Paket-Vorauswahl per ?paket=) */}
          <Suspense fallback={null}>
            <Konfigurator />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  );
}
