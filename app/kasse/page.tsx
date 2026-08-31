import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Kasse from "@/components/kasse/Kasse";

export const metadata: Metadata = {
  title: "Kasse | selbst-verkauf.de",
  description:
    "Prüfen Sie Ihre Zusammenstellung und schließen Sie Ihre Bestellung ab. Die Auftragsbestätigung mit den Zahlungsinformationen erhalten Sie per E-Mail.",
  // Kassen-Schritt gehört nicht in den Suchindex
  robots: { index: false, follow: false },
};

export default function KassePage() {
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
        <section className="container-page pb-24 md:pb-32">
          <p className="anim-rise eyebrow">Kasse</p>
          <h1
            className="anim-rise mt-4 max-w-2xl font-heading text-h2 opsz-display text-ink"
            style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
          >
            Fast geschafft: Ihre Bestellung.
          </h1>
          <div
            className="anim-rise mt-10"
            style={{ "--rise-delay": "0.16s" } as React.CSSProperties}
          >
            <Kasse />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
