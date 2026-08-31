import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Hero from "@/components/sections/Hero";
import ProblemSolution from "@/components/sections/ProblemSolution";
import StartseitenSektionen from "@/components/sections/StartseitenSektionen";
import { FAQ_ITEMS } from "@/lib/content";
import { ermittleMenschenBilder } from "@/lib/menschen-bilder";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Strukturierte Daten: Organization, WebSite, FAQPage, Product und Makler-Partner */
function buildJsonLd() {
  const orgId = `${siteConfig.domain}/#organization`;
  const partnerId = `${siteConfig.domain}/#makler-partner-organisation`;
  const partner = siteConfig.brokerPartner;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: siteConfig.name,
        url: siteConfig.domain,
        logo: `${siteConfig.domain}${siteConfig.logo.src}`,
        email: siteConfig.contact.email,
        description:
          "Plattform, mit der private Eigentümer ihre Immobilie selbst verkaufen. Mit echten Maklern im Hintergrund, zum Festpreis statt Provision.",
      },
      /*
       * Der begleitende Makler-Partner als eigene Organisation mit den
       * beiden Maklern. schema.org kennt keine eigene Partner-Property,
       * die Beziehung steht deshalb bewusst nur im description-Text;
       * alles andere wäre semantisch falsch. Nur wirklich kommunizierte
       * Daten, keine Rollen bei selbst-verkauf.de.
       */
      {
        "@type": "Organization",
        "@id": partnerId,
        name: partner.company,
        url: partner.website,
        description: `Begleitender Makler-Partner von ${siteConfig.name}. ${partner.description}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Ennigerloh",
          addressRegion: "Nordrhein-Westfalen",
          addressCountry: "DE",
        },
        employee: partner.brokers.map((makler) => ({
          "@type": "Person",
          name: makler.name,
          jobTitle: "Geschäftsführer",
          worksFor: { "@id": partnerId },
        })),
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.domain}/#website`,
        url: siteConfig.domain,
        name: siteConfig.name,
        inLanguage: "de",
        publisher: { "@id": orgId },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "Product",
        name: "selbst-verkauf.de Pakete",
        description:
          "Drei Pakete für den privaten Immobilienverkauf: Basis, Selbst & Sicher und Rundum Begleitet. Festpreis statt Maklerprovision.",
        brand: { "@id": orgId },
        offers: siteConfig.packages.map((pkg) => ({
          "@type": "Offer",
          name: pkg.name,
          price: String(pkg.monthly),
          priceCurrency: "EUR",
          url: `${siteConfig.domain}/#pakete`,
          description: `${pkg.name}: ${pkg.monthly} € pro Monat oder ${pkg.once} € einmalig.`,
        })),
      },
    ],
  };
}

export default async function Home() {
  /* await, weil die Bild-Ermittlung seit Runde 34 auch die echten Maße
     der Porträts liest (lib/menschen-bilder.ts). Die Seite bleibt
     statisch: Warten allein macht sie nicht dynamisch. */
  const menschenBilder = await ermittleMenschenBilder();
  return (
    <>
      <Header />
      <main id="inhalt">
        <Hero />
        <ProblemSolution />
        {/* Restliche Sektionen als eigene Chunks, siehe StartseitenSektionen.
            Die Bild-Existenz der Menschen-Porträts wird hier serverseitig
            zur Build-Zeit ermittelt (lib/menschen-bilder.ts) */}
        <StartseitenSektionen menschenBilder={menschenBilder} />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()) }}
      />
    </>
  );
}
