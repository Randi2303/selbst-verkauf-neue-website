import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import MotionProvider from "@/components/providers/MotionProvider";
import SektionsSnap from "@/components/providers/SektionsSnap";
import SmoothScroll from "@/components/providers/SmoothScroll";
import MessSonde from "@/components/dev/MessSonde";
import ServiceWorkerBereinigung from "@/components/ui/ServiceWorkerBereinigung";
import { istPasswortschutz } from "@/lib/passwortschutz";
import { istVorlaunch } from "@/lib/prelaunch";
import { siteConfig } from "@/site.config";

/**
 * Genau zwei Schriften über next/font:
 * Fraunces für Überschriften (mit optischer Größe), Inter für alles andere.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.domain),
  title: siteConfig.title,
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  // Vorlaunch-Schutz: vor dem Start zentral noindex fuer alle Seiten,
  // gesteuert ueber SITE_PRELAUNCH (siehe lib/prelaunch.ts und README)
  robots: istVorlaunch ? { index: false, follow: false } : { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: siteConfig.colors.background,
  // Die Marke ist bewusst hell: native Controls (Selects, Scrollbars)
  // bleiben damit auch unter System-Dark-Mode im hellen Schema
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-background font-sans text-ink antialiased">
        {/* Sprunglink für Tastatur und Screenreader */}
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-background"
        >
          Zum Inhalt springen
        </a>
        <SmoothScroll />
        {/* Sanftes Einrasten an Abschnittsanfängen, auf allen Seiten */}
        <SektionsSnap />
        {/* Solange der Passwortschutz aktiv ist: Service Worker und deren
            Caches aktiv entfernen, damit nichts am Schutz vorbei aus dem
            lokalen Speicher ausgeliefert wird */}
        {istPasswortschutz ? <ServiceWorkerBereinigung /> : null}
        {/* Ein LazyMotion-Kontext für alle m.-Animationen der Seite */}
        <MotionProvider>
          {children}
          {/* HIER STAND DER SCHWEBENDE CHAT-KNOPF (bis 21.08.2026).

              WARUM ER WEG IST: Er versprach mit einer Sprechblase ein
              Gespräch und lieferte den Hinweis "Der Chat wird zum
              Start freigeschaltet". Damit bot die Seite etwas an, das
              es nicht gibt, und das ist dieselbe Bauart wie ein Satz,
              der eine Antwort ankündigt, statt eine zu sein.

              WAS AN SEINE STELLE TRITT: nichts Neues. Die Wege, die es
              wirklich gibt, standen schon da und stehen weiter da: die
              Telefonnummer und die E-Mail-Adresse im Fuß jeder Seite,
              dazu die beiden Abschlüsse auf der Leistungs- und der
              Team-Seite.

              WIEDER EINHÄNGEN: eine Zeile, sobald über den
              ÖFFENTLICHEN Assistenten entschieden ist. Der im Konto
              (components/assistent/AssistentKnopf.tsx) ist davon nicht
              berührt, er hängt in der KontoShell. */}
        </MotionProvider>
        {/* MESS-SONDE, NUR IM ENTWICKLUNGS-SERVER (Runde 31,
            ausgelagert in Runde 32): Sie laeuft IM jeweiligen Browser
            selbst und findet das Element, das die Seite zu breit
            macht. Aufruf unveraendert: eine beliebige Seite mit
            angehaengtem #messsonde oeffnen.

            DER TEXT STEHT BEWUSST NICHT MEHR HIER, sondern in
            scripts/messsonde.js: Als Zeichenkette in dieser Datei
            wanderte er in die QUELLTEXT-KARTE des Server-Buendels mit,
            auch wenn der tote Zweig selbst entfernt wurde. Eingelesen
            wird nur im Entwicklungs-Server; im Betriebs-Bau ist der
            Zweig tot, die Datei wird nie geoeffnet und ihr Inhalt
            kommt in keiner Bau-Datei vor. */}
        {process.env.NODE_ENV === "development" ? <MessSonde /> : null}
      </body>
    </html>
  );
}
