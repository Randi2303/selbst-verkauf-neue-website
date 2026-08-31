import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ServiceCatalog from "@/components/leistungen/ServiceCatalog";
import ServicesCta from "@/components/leistungen/ServicesCta";
import { SERVICES, siteConfig } from "@/site.config";

const PAGE_TITLE = "Leistungen für den Privatverkauf | selbst-verkauf.de";
const PAGE_DESCRIPTION =
  "Alle Leistungen für Ihren Immobilienverkauf in drei Phasen: Aufbereitung, Vermarktung und Verkauf. Einzeln wählbar, zusammengestellt als Ihr Wunsch-Paket.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/leistungen" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/leistungen",
    siteName: siteConfig.name,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/** Strukturierte Daten: Liste aller Leistungen als Service-Einträge */
function buildJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Leistungen von selbst-verkauf.de",
    description: PAGE_DESCRIPTION,
    itemListElement: SERVICES.map((service, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: service.name,
        description: service.description,
        provider: {
          "@type": "Organization",
          name: siteConfig.name,
          url: siteConfig.domain,
        },
        areaServed: "Deutschland",
        // Bruttopreis (PAngV); bei Varianten der Einstiegspreis
        ...(einstiegsPreis(service) !== null
          ? {
              offers: {
                "@type": "Offer",
                price: String(einstiegsPreis(service)),
                priceCurrency: "EUR",
                url: `${siteConfig.domain}/leistungen`,
              },
            }
          : {}),
      },
    })),
  };
}

/** Kleinster Preis einer Leistung über alle Varianten, für die Offers */
function einstiegsPreis(service: (typeof SERVICES)[number]): number | null {
  if (service.variants && service.variantPrices) {
    const preise = service.variants
      .map((v) => service.variantPrices?.[v])
      .filter((p): p is number => typeof p === "number");
    return preise.length ? Math.min(...preise) : service.price;
  }
  return service.price;
}

export default function LeistungenPage() {
  return (
    <>
      <Header />
      <main id="inhalt" className="pt-28 md:pt-36">
        {/* Kompakter Seiten-Hero */}
        <section className="container-page">
          <p className="anim-rise eyebrow">Leistungen</p>
          <h1
            className="anim-rise mt-4 max-w-3xl font-heading text-h2 opsz-display text-ink"
            style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
          >
            Leistungen, die Ihren Verkauf leichter machen.
          </h1>
          <p
            className="anim-rise mt-5 max-w-2xl text-[1.13rem] leading-relaxed text-ink-muted"
            style={{ "--rise-delay": "0.16s" } as React.CSSProperties}
          >
            Alles einzeln wählbar, alles aus einer Hand, gegliedert in die drei
            Phasen Ihres Verkaufs. Vieles davon steckt auch schon in{" "}
            <Link href="/#pakete" className="font-medium text-primary transition-colors hover:text-primary-dark">
              unseren drei Paketen
            </Link>
            .
          </p>
        </section>

        {/* Katalog in drei Phasen */}
        <section className="container-page pb-24 md:pb-32">
          <ServiceCatalog />
        </section>

        {/* Abschluss-CTA */}
        <section className="container-page pb-24 md:pb-32">
          <ServicesCta />
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()) }}
      />
    </>
  );
}
