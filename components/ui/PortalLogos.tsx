/**
 * Die Logos der Portale, auf denen veroeffentlicht wird.
 *
 * EIN VIERTES PORTAL ergaenzen: SVG mit durchsichtigem Hintergrund
 * unter public/portale/ ablegen (kleingeschrieben, ohne Leerzeichen)
 * und hier einen Eintrag anfuegen; die optische Hoehe so waehlen, dass
 * das Logo neben den dreien gleich gewichtet wirkt. Mehr ist nicht
 * noetig, alle Stellen rendern ueber diese eine Komponente.
 *
 * OPTISCHE GROESSE STATT PIXELHOEHE: Die drei Logos haben sehr
 * verschiedene Formate (ImmoScout24 kompakt, Kleinanzeigen sehr breit
 * und flach). Eine gleiche Pixelhoehe liesse sie ungleich wirken,
 * deshalb traegt jedes Logo seine eigene Darstellungshoehe. Unter der
 * MINDESTHOEHE (20 px optische Basis) wird KEIN Logo gezeigt: Ein
 * unlesbares Logo belegt nichts und macht die Seite unruhig; wo der
 * Platz fehlt, steht der Name als Text (so im Dashboard-Mockup).
 *
 * DUNKELMODUS: Kleinanzeigen ist komplett dunkelgruen, ImmoScout24
 * traegt dunkelgraue Schrift, die dunkle Immowelt-Haelfte verliert
 * ihre Kontur. Ein heller Kasten dahinter waere die falsche Antwort
 * (er zerstoert die Karte), deshalb steht im Dunkelmodus der
 * Portalname als ruhiger Text; sobald helle Logo-Fassungen der
 * Portale vorliegen, ersetzen sie den Text. Wo der Name ohnehin
 * daneben steht, blendet `dunkelAusblenden` das Logo einfach aus.
 *
 * NIE VERZERREN: Breite ergibt sich immer aus dem Seitenverhaeltnis.
 *
 * RECHTLICH: Fremde Marken, nur als Tatsachenangabe ("dort
 * veroeffentlichen wir"), nie als Partnerschaft oder Empfehlung.
 */
import { portalName, type PortalKennung } from "@/config/portale";
import { cn } from "@/lib/utils";

/* Die Kennungen kommen aus der EINEN Quelle config/portale.ts; die
   Logo-Dateien liegen unter public/portale/<kennung>.svg */
export type PortalLogoId = PortalKennung;

/** Unter dieser optischen Basis wird kein Logo dargestellt */
export const LOGO_MINDESTHOEHE = 20;

const PORTAL_LOGOS: {
  id: PortalLogoId;
  src: string;
  alt: string;
  /** Natuerliche Masse der Datei, gegen Springen beim Laden */
  breite: number;
  hoehe: number;
  /** Darstellungshoehe in px, je Logo fuer gleiches optisches Gewicht */
  anzeigeHoehe: number;
}[] = [
  {
    id: "immoscout24",
    src: "/portale/immoscout24.svg",
    alt: portalName("immoscout24")!,
    breite: 567,
    hoehe: 341,
    anzeigeHoehe: 30,
  },
  {
    id: "kleinanzeigen",
    src: "/portale/kleinanzeigen.svg",
    alt: portalName("kleinanzeigen")!,
    breite: 786,
    hoehe: 131,
    anzeigeHoehe: 20,
  },
  {
    id: "immowelt",
    src: "/portale/immowelt.svg",
    alt: portalName("immowelt")!,
    breite: 1104,
    hoehe: 254,
    anzeigeHoehe: 22,
  },
];

export default function PortalLogos({
  nur,
  dunkelAusblenden = false,
  einzeilig = false,
  className,
}: {
  /** Nur bestimmte Portale zeigen; ohne Angabe alle drei */
  nur?: PortalLogoId[];
  /**
   * Im Dunkelmodus das Logo ausblenden statt den Namen zu zeigen.
   * Fuer Stellen, an denen der Portalname ohnehin als Text daneben
   * steht und sonst doppelt stuende.
   */
  dunkelAusblenden?: boolean;
  /**
   * Alle Logos in EINER Zeile, gleichmaessig ueber die volle Breite
   * verteilt. Fuer Karten, auf denen ein Umbruch (zwei oben, eins
   * unten) wie ein Versehen aussaehe. Die Aufrufstelle muss genug
   * Breite geben, die Mindestgroesse gilt unveraendert.
   */
  einzeilig?: boolean;
  className?: string;
}) {
  const liste = nur
    ? PORTAL_LOGOS.filter((p) => nur.includes(p.id))
    : PORTAL_LOGOS;
  if (liste.length === 0) return null;
  return (
    <span
      className={cn(
        // Genug Freiraum um jede Marke, sauberer Umbruch auf dem Handy
        einzeilig
          ? // Volle Breite bis zu einer ruhigen Obergrenze: Auf schmalen
            // Karten verteilen sich die drei Logos gleichmaessig, auf
            // breiten reissen sie nicht auseinander
            "flex w-full max-w-md flex-nowrap items-center justify-between gap-x-4"
          : /* AUF DEM HANDY EIN SAUBERER DREIER, mittig. Vorher brach
               die Reihe linksbuendig zwei zu eins um, und das sah
               unaufgeraeumt aus (gemeldet am 13.08.2026). Die drei
               passen bei 390 px nebeneinander, wenn der Abstand
               kleiner wird; VERKLEINERT werden sie dafuer NICHT, denn
               Kleinanzeigen liegt mit 20 px schon genau auf der
               Mindesthoehe, und darunter ist ein Logo unlesbar. */
            "flex flex-nowrap items-center justify-center gap-x-3 sm:inline-flex sm:flex-wrap sm:justify-start sm:gap-x-6 sm:gap-y-2.5",
        className
      )}
    >
      {liste.map((p) => (
        <span key={p.id} className="inline-flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.src}
            alt={p.alt}
            width={p.breite}
            height={p.hoehe}
            style={{ height: `${p.anzeigeHoehe}px` }}
            className="w-auto max-w-full dark:hidden"
            loading="lazy"
          />
          {!dunkelAusblenden ? (
            <span className="hidden text-[0.88rem] font-medium text-ink dark:inline">
              {p.alt}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}
