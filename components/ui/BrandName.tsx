import { Fragment } from "react";
import { siteConfig } from "@/site.config";

/**
 * Markenname im Fließtext und in Überschriften: "selbst-verkauf" erbt
 * Schrift, Größe, Gewicht und Farbe der Umgebung, ".de" steht in
 * Terrakotta. Damit wirkt die Marke überall wie im Header, ohne eigene
 * Schriftzuweisung. Für die große Markendarstellung in Header und
 * Footer bleibt components/layout/Wordmark.tsx zuständig.
 *
 * Nicht verwenden in Meta-Texten, Alt-Texten, JSON-LD, E-Mail-Adressen
 * und URLs, dort bleibt der Name reiner Text.
 */
export default function BrandName() {
  return (
    <span className="whitespace-nowrap">
      {siteConfig.wordmark.base}
      <span className="text-accent">{siteConfig.wordmark.accent}</span>
    </span>
  );
}

/**
 * Hebt den Markennamen in Texten aus Daten-Dateien hervor (FAQ,
 * Team-Steckbriefe): zerlegt den String an "selbst-verkauf.de" und setzt
 * dort die BrandName-Komponente ein. Die Rohtexte bleiben unverändert
 * für JSON-LD und Meta-Angaben nutzbar.
 */
export function markeImText(text: string): React.ReactNode {
  const marke = `${siteConfig.wordmark.base}${siteConfig.wordmark.accent}`;
  const teile = text.split(marke);
  if (teile.length === 1) return text;
  return teile.map((teil, i) => (
    <Fragment key={i}>
      {teil}
      {i < teile.length - 1 ? <BrandName /> : null}
    </Fragment>
  ));
}
