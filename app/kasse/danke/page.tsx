import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import DankeInhalt from "@/components/kasse/DankeInhalt";

export const metadata: Metadata = {
  title: "Vielen Dank | selbst-verkauf.de",
  description: "Ihre Bestellung bei selbst-verkauf.de.",
  // Bestell-Abschluss gehoert nicht in den Suchindex
  robots: { index: false, follow: false },
};

/**
 * Die Danke-Seite nach der Zahlung. Sie behauptet nichts: Der Stand
 * kommt aus /api/checkout/status (Stripe plus unsere Bestell-Zeile),
 * und solange die Rueckmeldung von Stripe noch unterwegs ist, sieht
 * der Kunde den ehrlichen Wartezustand statt einer geratenen
 * Erfolgsmeldung.
 */
export default function DankePage() {
  return (
    <>
      <Header />
      <main id="inhalt" className="pt-28 md:pt-36">
        <section className="container-page pb-24 md:pb-32">
          <DankeInhalt />
        </section>
      </main>
      <Footer />
    </>
  );
}
