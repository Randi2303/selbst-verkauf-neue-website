import { Fragment } from "react";
import { markeImText } from "@/components/ui/BrandName";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/site.config";

/**
 * Der Makler-Partner als dezenter Link zur Partner-Website: Der
 * Firmenname bleibt in der Textfarbe und Schrift der Umgebung (bewusst
 * KEINE Fremd-CI-Färbung im Fließtext, das Partner-CI transportiert
 * allein das Logo), wird aber klickbar. Ziel-URL zentral aus
 * site.config.ts (brokerPartner.website).
 *
 * aufDunkel: fuer Flaechen in der Hausfarbe, also das Takeover-Banner
 * im Preisteil. Dort ist der Untergrund selbst "primary"; die normale
 * Zeiger-Farbe waere dann dieselbe Farbe wie die Flaeche.
 *
 * WARUM EINE ANGABE UND KEINE KLASSE (Beanstandung des Inhabers,
 * 20.08.2026: "Der Name verschwindet beim Darueberfahren"): Bis hierher
 * reichte das Banner die Klasse "hover:text-background" herein. Das
 * cn() dieses Projekts fuegt Klassen aber nur aneinander, es ersetzt
 * keine (siehe lib/utils.ts); beide hover:text-Klassen landeten im
 * Stylesheet, und dort entscheidet die Reihenfolge der erzeugten
 * Datei, nicht die im Attribut. Gewonnen hat hover:text-primary.
 * Gemessen ergab das einen Kontrast von 1.00, der Name war unter dem
 * Zeiger buchstaeblich unsichtbar. Eine benannte Angabe kann sich
 * nicht selbst ueberschreiben.
 */
export default function PartnerName({
  aufDunkel = false,
  className,
}: {
  aufDunkel?: boolean;
  className?: string;
}) {
  return (
    <a
      href={siteConfig.brokerPartner.website}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "rounded-sm underline underline-offset-4 transition-colors",
        aufDunkel
          ? "decoration-background/50 hover:decoration-background hover:text-background"
          : "decoration-line hover:text-primary",
        className
      )}
    >
      {siteConfig.brokerPartner.company}
      <span className="sr-only"> (öffnet eine externe Seite in neuem Fenster)</span>
    </a>
  );
}

/**
 * Texte aus Daten-Dateien auszeichnen: verlinkt den Firmennamen des
 * Makler-Partners und stylt zugleich den Markennamen (markeImText).
 * Die Rohtexte bleiben unverändert für JSON-LD nutzbar. Nicht in
 * Buttons verwenden, ein Link gehört nicht in einen Button.
 */
export function textMitMarken(text: string, aufDunkel = false): React.ReactNode {
  const firma = siteConfig.brokerPartner.company;
  const teile = text.split(firma);
  if (teile.length === 1) return markeImText(text);
  return teile.map((teil, i) => (
    <Fragment key={i}>
      {markeImText(teil)}
      {i < teile.length - 1 ? <PartnerName aufDunkel={aufDunkel} /> : null}
    </Fragment>
  ));
}
