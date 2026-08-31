import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import LexikonList from "@/components/lexikon/LexikonList";
import { LEXIKON_TERMS } from "@/lib/lexikon";
import { siteConfig } from "@/site.config";

const PAGE_TITLE = "Immobilien-Lexikon | selbst-verkauf.de";
const PAGE_DESCRIPTION =
  "Von Angebotspreis bis Wohnflächenberechnung: Das Lexikon erklärt die wichtigsten Begriffe rund um den privaten Immobilienverkauf, kurz und verständlich.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/lexikon" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/lexikon",
    siteName: siteConfig.name,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/** Strukturierte Daten: jeder Begriff als DefinedTerm */
function buildJsonLd() {
  const setId = `${siteConfig.domain}/lexikon#begriffe`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DefinedTermSet",
        "@id": setId,
        name: "Immobilien-Lexikon von selbst-verkauf.de",
        description: PAGE_DESCRIPTION,
        url: `${siteConfig.domain}/lexikon`,
      },
      ...LEXIKON_TERMS.map((term) => ({
        "@type": "DefinedTerm",
        name: term.begriff,
        description: term.text,
        inDefinedTermSet: { "@id": setId },
      })),
    ],
  };
}

export default function LexikonPage() {
  return (
    <>
      <Header />
      <main id="inhalt" className="pt-28 md:pt-36">
        <section className="container-page">
          <p className="anim-rise eyebrow">Immobilien-Lexikon</p>
          <h1
            className="anim-rise mt-4 max-w-3xl font-heading text-h2 opsz-display text-ink"
            style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
          >
            Immobilienbegriffe, einfach erklärt.
          </h1>
          <p
            className="anim-rise mt-5 max-w-2xl text-[1.13rem] leading-relaxed text-ink-muted"
            style={{ "--rise-delay": "0.16s" } as React.CSSProperties}
          >
            Beim Verkauf begegnen Ihnen viele Fachwörter. Hier stehen die
            wichtigsten, kurz und ohne Juristendeutsch.
          </p>
        </section>

        <section className="container-page mt-10 pb-16 md:mt-12">
          <LexikonList />
          <p className="mt-12 max-w-2xl text-[0.85rem] leading-relaxed text-ink-muted">
            Dieses Lexikon erklärt Begriffe allgemein und ersetzt keine Rechts-
            oder Steuerberatung.
          </p>
        </section>

        <div className="pb-24 md:pb-32" />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()) }}
      />
    </>
  );
}
