"use client";

import { AnimatePresence, m, useInView, useSpring, useTransform } from "framer-motion";
import { nutztReduzierteBewegung } from "@/lib/reduzierte-bewegung";
import { Check, ChevronDown, Handshake, Newspaper, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import FederZahl from "@/components/ui/FederZahl";
import HandDrawnUnderline from "@/components/ui/HandDrawnUnderline";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import Wordmark from "@/components/layout/Wordmark";
import {
  ERFOLGSPROVISION,
  INSERATSWEG_KOSTEN,
  inseratswegSumme,
  RECHNER_MIN,
  VERGLEICH_STAND,
} from "@/config/vergleich";
import { SCHALTUNG_MONATE } from "@/lib/laufzeit";
import { formatEuroBetrag } from "@/lib/preise";
import { formatEuro, formatMenge, roundTo } from "@/lib/utils";
import PortalLogos from "@/components/ui/PortalLogos";
import { siteConfig } from "@/site.config";

/**
 * DER EINE RECHNER, an der Stelle der Entscheidung: direkt unter den
 * Paketen, wo der Einwand "woanders ist es billiger" entsteht.
 *
 * WARUM ES NUR NOCH EINEN GIBT: Auf der Seite standen zwei, die im
 * Kern dasselbe taten. Ein Ersparnis-Rechner weiter oben mit grosser
 * Zahl und drei Kacheln, und hier ein Kostenvergleich mit Balken. Wer
 * zwei Rechner sieht, fragt sich, welcher der richtige ist, und traut
 * am Ende beiden ein bisschen weniger.
 *
 * WAS VOM AELTEREN MITGEKOMMEN IST: die grosse Zahl, auf der das Auge
 * landet, der greifbare Vergleich darunter, die drei Kacheln fuer den
 * Zusammenhang und die ruhige Gestaltung. Diese Dinge waren gut und
 * sind der Grund, warum ueberhaupt jemand am Regler zieht.
 *
 * WAS VOM NEUEREN GEBLIEBEN IST, und warum dieser die Grundlage war:
 * Alle Wege kommen vor, unser eigener Preis wird nicht versteckt, die
 * Quellen und Stand-Daten stehen dabei, und der Satz, ab wann ein
 * anderer Weg guenstiger ist, erscheint von selbst. Der aeltere hatte
 * an drei Stellen behauptet, was wir nicht wissen; die sind hier
 * abgeraeumt, siehe die Kacheln weiter unten.
 *
 * VIER WEGE, NICHT DREI. Der Inserats-Weg fehlte im Balkenbild und
 * stand nur im Text. Ausgerechnet der guenstigste Weg nicht im
 * Rechner ist die stille Schoenfaerberei, die diese Seite sonst
 * ueberall herausgenommen hat.
 *
 * REGELN: Fremde Preise nur mit Stand-Datum (config/vergleich.ts),
 * keine Marken, kein Rot, kein durchgestrichenes Nein.
 */

/** Leeres Abo fuer useSyncExternalStore, der Wert aendert sich nie */
function subscribeNoop() {
  return () => {};
}

/**
 * Greifbare Vergleiche zur Ersparnis.
 *
 * TON: Diese Seite wird von Menschen gelesen, die nach einem Erbfall
 * oder einer Trennung verkaufen. Die Stufen ordnen die Summe ein, sie
 * machen keinen Witz auf ihre Kosten. Geprueft ueber die ganze
 * Spanne: bei 50.000 Euro Verkaufspreis sind es rund 1.800 Euro, bei
 * zwei Millionen rund 71.000.
 */
const VERGLEICHS_STUFEN = [
  { bis: 5_000, text: "Das ist der Umzug samt Handwerkern." },
  { bis: 10_000, text: "Das ist ein neues Bad." },
  { bis: 20_000, text: "Das ist ein Kleinwagen." },
  { bis: 35_000, text: "Das ist eine neue Küche und ein Jahr Nebenkosten." },
  { bis: 50_000, text: "Das ist mehr als ein durchschnittliches Jahresnettogehalt." },
  { bis: Infinity, text: "Das ist ein komplettes Studium für ein Kind." },
] as const;

/**
 * WAS DIE WEGE UNTERSCHEIDET, ist nicht die Farbe, sondern die Sache.
 * Genau das zeigt der Balken:
 *
 *   bedingt  waechst mit dem Preis, faellig NUR im Erfolgsfall
 *            -> schraffierter Balken; die Schraffur sagt "unter
 *               Vorbehalt", ohne ein Wort und ohne Wertung
 *   fest     eine Zahl, die nicht mitwaechst und in jedem Fall faellt
 *            -> voller Balken in unserem Petrol
 *   spanne   ein Von-bis
 *            -> heller Streifen mit zwei kraeftigen Endkappen
 *
 * ==================================================================
 * HIER STAND EINE VIERTE ART "immer" MIT DEM KENNZEICHEN "immer
 * faellig", UND SIE WAR SACHLICH FALSCH (Befund und Auftrag des
 * Inhabers, 26.08.2026)
 * ==================================================================
 * Sie hing am klassischen Makler. Ein klassischer Maklervertrag ist in
 * Deutschland aber erfolgsabhaengig: Ohne Verkauf entsteht kein
 * Provisionsanspruch. Der Unterschied zum Weg ueber die kleine
 * Erfolgsprovision liegt in der HOEHE und in der Kaeuferprovision,
 * nicht darin, ob ueberhaupt nur bei Verkauf gezahlt wird.
 *
 * Eine falsche Aussage ueber einen Dritten darf auf dieser Seite nicht
 * stehen, auch wenn eine abgenommene Darstellung daran haengt. Beide
 * Wege der linken Gruppe tragen deshalb jetzt "nur bei Verkauf" und
 * beide Balken sind schraffiert.
 *
 * DAS BILD WIRD DADURCH KLARER, NICHT UNSCHAERFER: Schraffur heisst
 * ab jetzt ausnahmslos "faellt nur, wenn verkauft wird", voller Balken
 * heisst "faellt in jedem Fall". Links steht damit alles Bedingte,
 * rechts alles Feste. Auseinanderzuhalten sind die beiden linken Wege
 * weiterhin ueber Betrag und Balkenlaenge; bei 770.000 Euro stehen
 * 27.489 Euro gegen 7.623 Euro, das ist der Unterschied, um den es
 * geht.
 *
 * KEINE FREMDEN FARBEN. Es waere leicht, die beiden Makler-Wege ueber
 * die Hausfarben bekannter Anbieter zu trennen. Das ist ausdruecklich
 * nicht gewollt: Wir nennen keinen Wettbewerber, und ihn ueber seine
 * Farbe erkennbar zu machen waere dasselbe, nur schlechter zu
 * verteidigen. Ausserdem hingen dann fremde Farben in unserer Seite.
 */
type WegArt = "bedingt" | "fest" | "spanne";

const ART_TEXT: Record<WegArt, string> = {
  bedingt: "nur bei Verkauf",
  fest: "Festpreis",
  spanne: "Von-bis",
};

function Weg({
  label,
  labelVor,
  sub,
  subKlasse,
  wert,
  spanne,
  maxWert,
  art,
  hervor,
}: {
  label: React.ReactNode;
  /**
   * Ein Vorsatz, der auf schmalen Bildschirmen eine EIGENE Zeile
   * bekommt. "Bei uns: Paket Selbst & Sicher" brach dort mitten im
   * Namen um, und das Kennzeichen hing daneben in der Luft.
   */
  labelVor?: string;
  sub: string;
  /** Steuert, ob die Unterzeile auf schmalen Bildschirmen mitkommt */
  subKlasse?: string;
  wert: number;
  spanne?: { von: number; bis: number };
  maxWert: number;
  art: WegArt;
  hervor?: boolean;
}) {
  /* Hydrationssicherer Haken (Runde 31), siehe lib/reduzierte-bewegung.ts */
  const reduced = nutztReduzierteBewegung();
  const anteil = (v: number) => Math.max(0, Math.min(100, (v / Math.max(maxWert, 1)) * 100));
  const feder = reduced
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 140, damping: 26 } as const);

  return (
    <div className={hervor ? "-mx-3 rounded-2xl bg-primary/[0.06] px-3 py-2.5" : ""}>
      {/* SCHMAL UNTEREINANDER, BREIT NEBENEINANDER: Jede Zeile steht
          fuer sich, statt dass der Name umbricht und das Kennzeichen
          daneben haengt. Der Betrag bleibt oben rechts. */}
      <div className="flex items-start justify-between gap-3">
        <span className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-2">
          <span className="flex flex-col items-start sm:flex-row sm:items-baseline sm:gap-1.5">
            {labelVor ? (
              <span className="text-[0.8rem] text-ink-muted sm:text-[0.95rem] sm:font-medium sm:text-ink">
                {labelVor}
                <span className="hidden sm:inline">:</span>
              </span>
            ) : null}
            <span className={`text-[0.95rem] text-ink ${hervor ? "font-semibold" : "font-medium"}`}>
              {label}
            </span>
          </span>
          {/* Die Art des Wegs in zwei Woertern. Sie steht auch dann da,
              wenn die Unterzeile auf dem Handy eingeklappt ist. */}
          <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[0.7rem] leading-tight text-ink-muted">
            {ART_TEXT[art]}
          </span>
        </span>
        <span className="shrink-0 text-[1.05rem] font-semibold tabular-nums">
          {spanne ? (
            <>
              {formatEuroBetrag(spanne.von)} bis {formatEuroBetrag(spanne.bis)}
            </>
          ) : (
            <FederZahl value={wert} />
          )}
        </span>
      </div>

      <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-line/40">
        {spanne ? (
          <>
            {/* Der helle Streifen zwischen den Enden */}
            <m.div
              className="absolute inset-y-0 rounded-full bg-accent/25"
              initial={false}
              animate={{
                left: `${anteil(spanne.von)}%`,
                width: `${Math.max(2, anteil(spanne.bis) - anteil(spanne.von))}%`,
              }}
              transition={feder}
            />
            {/* Die beiden Enden als kraeftige Kappen. Sie sind der
                Grund, warum man ein Von-bis sieht und keinen
                Fuellstand. */}
            <m.div
              className="absolute inset-y-0 w-[3px] rounded-full bg-accent-deep"
              initial={false}
              animate={{ left: `${anteil(spanne.von)}%` }}
              transition={feder}
            />
            <m.div
              className="absolute inset-y-0 w-[3px] rounded-full bg-accent-deep"
              initial={false}
              animate={{ left: `calc(${anteil(spanne.bis)}% - 3px)` }}
              transition={feder}
            />
          </>
        ) : (
          <m.div
            className={`h-full rounded-full ${
              art === "fest" ? "bg-primary" : "bg-ink-muted/40"
            }`}
            style={
              art === "bedingt"
                ? {
                    backgroundImage:
                      "repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0 3px, transparent 3px 7px)",
                  }
                : undefined
            }
            initial={false}
            animate={{ width: `${Math.max(1.5, anteil(wert))}%` }}
            transition={feder}
          />
        )}
      </div>

      <p className={`mt-1 text-[0.78rem] leading-relaxed text-ink-muted ${subKlasse ?? ""}`}>
        {sub}
      </p>
    </div>
  );
}

export default function Vergleich() {
  const summe = inseratswegSumme();
  const paket = siteConfig.packages.find((p) => p.id === "selbst-sicher");
  const paketPreis = paket?.once ?? 699;
  const paketMonat = paket?.monthly ?? 169;
  const { max, step, start } = siteConfig.calculator;
  const { rate, label: commissionLabel } = siteConfig.commission;
  /* Hydrationssicherer Haken (Runde 31), siehe lib/reduzierte-bewegung.ts */
  const reduced = nutztReduzierteBewegung();

  const [preis, setPreis] = useState<number>(start);
  const [ziehen, setZiehen] = useState(false);
  const [detail, setDetail] = useState<"inserat" | "erfolgsprovision">("inserat");

  const klassisch = Math.round(preis * rate);
  const erfolg = Math.round(preis * ERFOLGSPROVISION.satz);
  const sliderPercent = ((preis - RECHNER_MIN) / (max - RECHNER_MIN)) * 100;

  /* Die Ersparnis ist die Provision MINUS unserem Preis. Der aeltere
     Rechner zeigte die volle Provision als "Ersparnis" und liess
     unseren eigenen Preis daneben weg; das faellt beim ersten
     Nachrechnen auf. */
  const ersparnis = Math.max(0, klassisch - paketPreis);

  /* Die Kacheln folgen erst nach dem Loslassen, damit beim Ziehen
     nicht drei Zahlen gleichzeitig flackern. */
  const [ruhigerPreis, setRuhigerPreis] = useState<number>(start);
  useEffect(() => {
    const timer = setTimeout(() => setRuhigerPreis(preis), 250);
    return () => clearTimeout(timer);
  }, [preis]);
  const marktVon = roundTo(ruhigerPreis * 0.94, 5_000);
  const marktBis = roundTo(ruhigerPreis * 1.06, 5_000);
  const stufenText =
    VERGLEICHS_STUFEN.find((s) => Math.max(0, Math.round(ruhigerPreis * rate) - paketPreis) < s.bis)
      ?.text ?? "";

  /* Ab hier sind wir wieder guenstiger als die Erfolgsprovision */
  const wendepunkt = Math.ceil(paketPreis / ERFOLGSPROVISION.satz / 1000) * 1000;
  /* Das Verhaeltnis der beiden Gruppen zueinander, als Zahl. Es
     ersetzt den Balkenvergleich ueber die Gruppengrenze hinweg. */
  const faktor = Math.max(1, Math.round(klassisch / paketPreis));

  /* DER MASSSTAB DER FESTEN GRUPPE BEKOMMT LUFT NACH OBEN. Endete er
     genau bei 1.400 Euro, also am oberen Ende der Inserats-Spanne,
     lief deren Balken bis an den rechten Rand und sah aus wie ein von
     rechts gefuellter Balken statt wie ein Von-bis. Gemeldet am
     13.08.2026. Aufgerundet auf volle 500 Euro, damit die Zahl im
     Massstab-Hinweis eine runde bleibt. */
  const festMax = roundTo(summe.bis * 1.35, 500);

  /* Auf schmalen Bildschirmen stehen zuerst nur Regler, grosse Zahl
     und die vier Zahlen. Alles Erklaerende liegt hinter einem
     Aufklappen; am Rechner ist es immer sichtbar. */
  const [erklaerungen, setErklaerungen] = useState(false);
  const nurBreit = erklaerungen ? "" : "hidden sm:block";

  const kartenRef = useRef<HTMLDivElement>(null);
  const inView = useInView(kartenRef, { once: true, margin: "-15% 0px" });

  /* Die grosse Zahl zaehlt weich mit. Das ist der einzige Ort, an dem
     diese Seite eine Zahl bewegt, und sie erklaert etwas: Der Regler
     hat sie geaendert. */
  const feder = useSpring(0, { stiffness: 78, damping: 24, mass: 1 });
  const federText = useTransform(feder, (v) => formatEuro(Math.max(0, Math.round(v))));
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      feder.jump(ersparnis);
      return;
    }
    feder.set(ersparnis);
  }, [inView, ersparnis, reduced, feder]);

  return (
    <section id="vergleich" className="section-pad scroll-mt-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Der ehrliche Vergleich"
          lines={[
            "Was kostet ein Verkauf",
            <>
              <HandDrawnUnderline>wirklich</HandDrawnUnderline>?
            </>,
          ]}
          sub="Bewegen Sie den Regler auf Ihren ungefähren Verkaufspreis. Sie sehen alle vier Wege nebeneinander, unseren eigenen Preis eingerechnet."
        />

        <Reveal className="mt-12">
          <div
            ref={kartenRef}
            className="rounded-4xl border border-line/70 bg-paper p-6 shadow-card sm:p-10 md:p-12"
          >
            {/* ---- Der Regler ---- */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <label htmlFor="vergleich-preis" className="text-[1.02rem] font-medium">
                Verkaufspreis Ihrer Immobilie
              </label>
              <output
                htmlFor="vergleich-preis"
                className="text-[1.35rem] font-semibold tabular-nums"
              >
                {formatEuro(preis)}
              </output>
            </div>
            <div className="relative mt-6">
              <AnimatePresence>
                {ziehen ? (
                  <m.div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-11 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[0.8rem] font-semibold tabular-nums text-background shadow-lift"
                    style={{
                      left: `calc(${sliderPercent}% + ${(0.5 - sliderPercent / 100) * 28}px)`,
                    }}
                    initial={reduced ? false : { opacity: 0, y: 6, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      reduced
                        ? { opacity: 0, transition: { duration: 0 } }
                        : { opacity: 0, y: 4, scale: 0.96 }
                    }
                    transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                  >
                    {formatEuro(preis)}
                  </m.div>
                ) : null}
              </AnimatePresence>
              <input
                id="vergleich-preis"
                type="range"
                min={RECHNER_MIN}
                max={max}
                step={step}
                value={preis}
                onChange={(e) => setPreis(Number(e.target.value))}
                onPointerDown={() => setZiehen(true)}
                onPointerUp={() => setZiehen(false)}
                onPointerCancel={() => setZiehen(false)}
                onBlur={() => setZiehen(false)}
                aria-valuetext={formatEuro(preis)}
                className="price-slider"
                style={{
                  background: `linear-gradient(90deg, ${siteConfig.colors.primary} ${sliderPercent}%, ${siteConfig.colors.line} ${sliderPercent}%)`,
                }}
              />
            </div>
            <div className="mt-2.5 flex justify-between text-[0.8rem] text-ink-muted">
              <span>{formatEuro(RECHNER_MIN)}</span>
              <span>{formatEuro(max)}</span>
            </div>

            {/* ---- Die grosse Zahl ---- */}
            <div className="mt-12 text-center">
              <p className="text-[0.95rem] text-ink-muted">
                Das bleibt bei Ihnen statt beim Makler, unser Preis schon abgezogen
              </p>
              {/* DIE ELLIPSE IST UNSERE HANDSCHRIFT, kein Schmuck: Sie
                  zieht das Auge auf die eine Zahl, um die es in diesem
                  Abschnitt geht. Sie zeichnet sich beim Sichtbarwerden
                  EINMAL und steht danach still; wer reduzierte Bewegung
                  eingestellt hat, sieht sie sofort fertig. */}
              <p className="mt-3 font-semibold leading-none tracking-[-0.02em]">
                <span className="relative inline-block">
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-x-7 -inset-y-4 h-[calc(100%+2rem)] w-[calc(100%+3.5rem)] overflow-visible"
                    viewBox="0 0 300 120"
                    preserveAspectRatio="none"
                    fill="none"
                  >
                    <m.path
                      d="M24,64 C20,32 96,10 158,12 C232,14 284,32 282,62 C280,94 208,110 144,108 C72,106 26,92 26,62 C26,52 34,45 46,41"
                      stroke={siteConfig.colors.accent}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      opacity={0.85}
                      initial={false}
                      animate={{ pathLength: inView || reduced ? 1 : 0.001 }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { duration: 0.8, delay: 0.6, ease: "easeInOut" }
                      }
                    />
                  </svg>
                  <span className="bg-gradient-to-r from-accent to-accent-deep bg-clip-text text-[clamp(2.7rem,7vw,4.6rem)] tabular-nums text-transparent">
                    {mounted ? <m.span>{federText}</m.span> : formatEuro(ersparnis)}
                  </span>
                </span>
              </p>
              <p className="mt-4 text-[1.05rem] text-ink-muted">
                gegenüber einem klassischen Makler mit{" "}
                <HandDrawnUnderline className="font-semibold text-ink">
                  ø {commissionLabel}
                </HandDrawnUnderline>{" "}
                Verkäuferanteil.
              </p>
              <div className="mt-3 min-h-[2rem]">
                <AnimatePresence mode="wait" initial={false}>
                  <m.p
                    key={stufenText}
                    className="inline-block rounded-full bg-surface px-3.5 py-1 text-[0.82rem] text-ink-muted"
                    initial={reduced ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }
                    }
                    transition={{ duration: reduced ? 0 : 0.25 }}
                  >
                    {stufenText}
                  </m.p>
                </AnimatePresence>
              </div>
            </div>

          </div>
        </Reveal>

        {/* ---- Die vier Wege, in ZWEI Gruppen ----

            WARUM ZWEI MASSSTAEBE UND NICHT EINER: Auf einer einzigen
            Achse ist dieser Vergleich nicht darstellbar. Bei 770.000
            Euro stehen 27.489 Euro Provision gegen 699 Euro Festpreis,
            das ist Faktor 39; bei zwei Millionen Faktor 102. Der
            laengste Balken fuellt die Breite, die drei anderen werden
            zu Stummeln, und beim Inserat sah die Spanne aus wie ein
            Strich. Ein Vergleich, in dem drei von vier Werten nicht
            mehr ablesbar sind, erklaert nichts mehr.

            EINE LOGARITHMISCHE ACHSE WAERE DER UEBLICHE AUSWEG UND
            WAERE HIER FALSCH: Sie liest niemand richtig, und sie
            schmeichelt ausgerechnet den teuren Wegen, weil sie grosse
            Unterschiede klein aussehen laesst.

            DIE TEILUNG IST KEINE DARSTELLUNGS-KRUECKE, sie ist die
            Sache selbst: Zwei Wege wachsen mit dem Verkaufspreis, zwei
            bleiben stehen. Jede Gruppe hat ihren eigenen Massstab, und
            er steht dabei. Was die beiden Gruppen zueinander stehen,
            sagt der Satz darunter als Zahl, denn das kann ein Balken
            hier nicht mehr leisten. */}
        <Reveal className="mt-8">
          <div className="rounded-4xl border border-line/60 bg-surface-tint p-6 sm:p-8 md:p-10">
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Was die vier Wege kosten
            </p>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-line/50 bg-paper p-5 sm:p-6">
                <p className="text-[0.9rem] font-semibold text-ink">
                  Wächst mit dem Verkaufspreis
                </p>
                <p className={`mt-0.5 text-[0.78rem] text-ink-muted ${nurBreit}`}>
                  Maßstab dieser Gruppe: bis {formatEuroBetrag(klassisch)}
                </p>
                <div className="mt-5 flex flex-col gap-5">
                  <Weg
                    label="Klassischer Makler"
                    sub={`Verkäuferanteil, ø ${commissionLabel} vom Kaufpreis inkl. MwSt.`}
                    subKlasse={nurBreit}
                    wert={klassisch}
                    maxWert={klassisch}
                    art="bedingt"
                  />
                  <Weg
                    labelVor="Makler"
                    label="mit Erfolgsprovision"
                    /* "fällig nur bei Verkauf" ist hier RAUS: Das
                       Kennzeichen daneben sagt es seit dem 26.08.2026
                       bei beiden Wegen, und zweimal dasselbe in einer
                       Zeile liest sich, als sei es beim anderen anders. */
                    sub={`${ERFOLGSPROVISION.satzLabel} inkl. MwSt., keine Käuferprovision`}
                    subKlasse={nurBreit}
                    wert={erfolg}
                    maxWert={klassisch}
                    art="bedingt"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-primary/25 bg-paper p-5 sm:p-6">
                <p className="text-[0.9rem] font-semibold text-ink">
                  Bleibt fest, egal wie teuer verkauft wird
                </p>
                <p className={`mt-0.5 text-[0.78rem] text-ink-muted ${nurBreit}`}>
                  Maßstab dieser Gruppe: bis {formatEuroBetrag(festMax)}
                </p>
                <div className="mt-5 flex flex-col gap-5">
                  <Weg
                    labelVor="Bei uns"
                    label={`Paket ${paket?.name ?? "Selbst & Sicher"}`}
                    sub="Festpreis, auch monatlich zahlbar, fällig unabhängig vom Verkauf"
                    subKlasse={nurBreit}
                    wert={paketPreis}
                    maxWert={festMax}
                    art="fest"
                    hervor
                  />
                  <Weg
                    label="Inserat selbst buchen"
                    sub={`Portale und Markteinschätzung auf ${formatMenge(SCHALTUNG_MONATE, "Monate")}, übliche Spanne, Stand ${VERGLEICH_STAND}`}
                    subKlasse={nurBreit}
                    wert={summe.bis}
                    spanne={summe}
                    maxWert={festMax}
                    art="spanne"
                  />
                </div>
              </div>
            </div>

            {/* Die Bruecke zwischen den Gruppen, als Zahl statt als
                Balken. Sie ist die eigentliche Aussage des Abschnitts
                und die einzige Stelle, an der die beiden Massstaebe
                zusammenkommen duerfen. */}
            <p className={`mt-6 text-[1.02rem] leading-relaxed text-ink ${nurBreit}`}>
              Bei {formatEuro(preis)} Verkaufspreis kostet der klassische Makler das{" "}
              <strong className="font-semibold">{faktor}-fache</strong> unseres Festpreises.
              Die beiden Gruppen haben bewusst verschiedene Maßstäbe, sonst wäre die rechte
              nicht mehr zu erkennen.
            </p>

            {/* DER SCHALTER, nur schmal. Kein Zauber: ein Knopf, der
                sagt was er tut, und der Zustand steht in aria-expanded.
                Bewusst OHNE Aufklapp-Bewegung: Wer ihn drueckt, will
                lesen, nicht zusehen. */}
            <button
              type="button"
              onClick={() => setErklaerungen((w) => !w)}
              aria-expanded={erklaerungen}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-2 text-[0.85rem] font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:hidden"
            >
              {erklaerungen ? "Erklärungen ausblenden" : "Was diese Zahlen bedeuten"}
              <ChevronDown
                size={15}
                strokeWidth={2}
                aria-hidden="true"
                className={erklaerungen ? "rotate-180" : ""}
              />
            </button>

            {/* ---- Die ehrlichen Zeilen, je nach Reglerstand ---- */}
            <div className="mt-5 flex flex-col gap-2" aria-live="polite">
              <AnimatePresence initial={false}>
                {erfolg < paketPreis ? (
                  <m.p
                    key="erfolg"
                    className="text-[0.9rem] leading-relaxed text-ink"
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.15 } }}
                    transition={{ duration: reduced ? 0 : 0.25 }}
                  >
                    Bei diesem Verkaufspreis ist die Erfolgsprovision günstiger als unser
                    Paket; erst ab etwa {formatEuro(wendepunkt)} sind wir es wieder. Auch
                    das gehört zur Ehrlichkeit.
                  </m.p>
                ) : null}
              </AnimatePresence>
              <p className={`text-[0.9rem] leading-relaxed text-ink-muted ${nurBreit}`}>
                Der Inserats-Weg wächst nicht mit dem Verkaufspreis. An seinem unteren Ende
                ist er bei jedem Preis günstiger als unser Paket. Der Unterschied liegt
                nicht im Preis, sondern darin, was Sie dafür bekommen, und das steht gleich
                darunter.
              </p>
            </div>
          </div>
        </Reveal>

        {/* ---- Die drei Kacheln ---- */}
        <Reveal className="mt-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line/60 bg-surface/70 p-5">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  Marktwert
                </p>
                <p className="mt-2 text-[1.02rem] font-semibold tabular-nums leading-snug">
                  <FederZahl value={marktVon} /> bis <FederZahl value={marktBis} />
                </p>
                {/* HIER STAND EINE ZUSCHREIBUNG, DIE NICHT STIMMTE: Der
                    Fusstext nannte diese Spanne eine Einschaetzung auf
                    Basis der Daten unseres Bewertungspartners. Sie ist
                    aber nichts als der Reglerwert plus und minus sechs
                    Prozent. Eine Zahl, die wir selbst erfinden, darf
                    nicht den Namen eines Partners tragen. */}
                <p className="mt-1.5 text-[0.8rem] text-ink-muted">
                  Beispielspanne aus Ihrem eingestellten Preis, sechs Prozent nach oben und
                  unten. Keine Bewertung.
                </p>
                <p className="mt-1 text-[0.75rem] text-ink-muted">
                  Ihre echte Spanne rechnen wir mit Marktdaten, sobald Sie starten.
                </p>
              </div>

              <div className="rounded-2xl border border-line/60 bg-surface/70 p-5">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  Was Sie bei uns zahlen
                </p>
                {/* HIER STAND EIN VERGLEICH, DER KEINER WAR: eine
                    Gesamtsumme (Provision) neben einer Monatsrate
                    (ab 169 € im Monat), samt Balken. Jetzt stehen
                    beide Wege zu zahlen als GESAMTSUMME nebeneinander,
                    und die Rate steht als das dabei, was sie ist. */}
                <p className="mt-2 text-[1.02rem] font-semibold tabular-nums leading-snug">
                  {formatEuroBetrag(paketPreis)} einmalig
                </p>
                <p className="mt-1.5 text-[0.8rem] text-ink-muted">
                  oder {formatEuroBetrag(paketMonat)} im Monat über {formatMenge(SCHALTUNG_MONATE, "Monate")}, zusammen{" "}
                  {formatEuroBetrag(paketMonat * SCHALTUNG_MONATE)}.
                </p>
                <p className="mt-1 text-[0.75rem] text-ink-muted">
                  Beides inkl. MwSt. Der Festpreis wächst nicht mit dem Kaufpreis.
                </p>
              </div>

              <div className="rounded-2xl border border-line/60 bg-surface/70 p-5">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  Sichtbarkeit
                </p>
                {/* HIER STAND "ca. 3 Monate" ALS GEPLANTER VERKAUF, ohne
                    jede Grundlage: eine feste Zeichenkette in der
                    Konfiguration, nirgends hergeleitet, nirgends
                    belegt. Wie lange ein Verkauf dauert, wissen wir
                    nicht; es haengt an Lage, Preis und Markt. Was wir
                    wissen, ist die Laufzeit, die wir selbst zusagen,
                    und die steht jetzt hier. */}
                <p className="mt-2 text-[1.02rem] font-semibold leading-snug">
                  {formatMenge(SCHALTUNG_MONATE, "Monate")}
                </p>
                <p className="mt-1.5 text-[0.8rem] text-ink-muted">
                  auf den großen Portalen, gerechnet ab dem Tag, an dem Ihr Inserat wirklich
                  online ist.
                </p>
                <p className="mt-1 text-[0.75rem] text-ink-muted">
                  Wie lange ein Verkauf dauert, hängt an Lage, Preis und Markt.
                </p>
              </div>
          </div>
          {/* Die Herkunft aller fremden Zahlen an EINER Stelle, am Fuss
              des Rechners statt mitten darin. Sie muss auffindbar sein,
              nicht auffallen. */}
          <p className="mt-5 text-[0.75rem] leading-relaxed text-ink-muted">
            ø {commissionLabel} entspricht dem üblichen Verkäuferanteil der Maklerprovision
            inklusive Mehrwertsteuer und variiert je nach Bundesland und Vereinbarung.{" "}
            {ERFOLGSPROVISION.satzLabel} ist der derzeitige Preis eines verbreiteten
            Anbieters dieses Wegs, Stand {ERFOLGSPROVISION.stand}. Die Spanne des
            Inserats-Wegs ist eine übliche Spanne, Stand {VERGLEICH_STAND}. Preise anderer
            Anbieter ändern sich; maßgeblich ist deren aktuelle Preisliste.
          </p>
        </Reveal>

        {/* ---- Die Details als Umschaltung ---- */}
        <Reveal className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col rounded-3xl border border-line/60 bg-paper p-6 sm:p-8">
              <div
                role="group"
                className="grid grid-cols-2 gap-1 rounded-2xl border border-line/60 bg-surface p-1"
                aria-label="Womit möchten Sie uns vergleichen?"
              >
                <button
                  type="button"
                  aria-pressed={detail === "inserat"}
                  onClick={() => setDetail("inserat")}
                  className={`rounded-xl px-3 py-2 text-center text-[0.85rem] leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    detail === "inserat"
                      ? "bg-paper font-medium text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Inserat selbst buchen
                </button>
                <button
                  type="button"
                  aria-pressed={detail === "erfolgsprovision"}
                  onClick={() => setDetail("erfolgsprovision")}
                  className={`rounded-xl px-3 py-2 text-center text-[0.85rem] leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    detail === "erfolgsprovision"
                      ? "bg-paper font-medium text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Makler mit Erfolgsprovision
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {detail === "inserat" ? (
                  <m.div
                    key="inserat"
                    className="flex grow flex-col"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      reduced
                        ? { opacity: 0, transition: { duration: 0 } }
                        : { opacity: 0, y: -4, transition: { duration: 0.15 } }
                    }
                    transition={{ duration: reduced ? 0 : 0.25 }}
                  >
                    <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">
                      Über Inserats-Portale stellen Sie Ihre Immobilie selbst auf
                      mehrere Plattformen. Der günstige Einstiegspreis gilt dort
                      für eine kurze Laufzeit; ein Hausverkauf dauert aber selten
                      dreißig Tage. Auf {formatMenge(SCHALTUNG_MONATE, "Monate")} gerechnet, mit
                      dem, was ein Verkauf wirklich braucht:
                    </p>
                    <ul className="mt-5 flex flex-col gap-2.5">
                      {INSERATSWEG_KOSTEN.map((posten) => (
                        <li
                          key={posten.label}
                          className="flex items-baseline justify-between gap-4 text-[0.92rem]"
                        >
                          <span className="text-ink">{posten.label}</span>
                          <span className="shrink-0 tabular-nums text-ink-muted">
                            {formatEuroBetrag(posten.von)} bis {formatEuroBetrag(posten.bis)}
                          </span>
                        </li>
                      ))}
                      <li className="flex items-baseline justify-between gap-4 border-t border-line/60 pt-2.5 text-[0.95rem] font-semibold">
                        <span>Üblicherweise zusammen</span>
                        <span className="shrink-0 tabular-nums">
                          {formatEuroBetrag(summe.von)} bis {formatEuroBetrag(summe.bis)}
                        </span>
                      </li>
                    </ul>
                    <p className="mt-4 text-[0.85rem] leading-relaxed text-ink-muted">
                      Anfragen sortieren, Interessenten prüfen, Besichtigungen
                      ordnen und der Weg bis zum Notar bleiben dabei Ihre Aufgabe,
                      mit den Werkzeugen, die das jeweilige Portal mitbringt.
                    </p>
                    <p className="mt-auto pt-4 text-[0.75rem] text-ink-muted">
                      Übliche Preisspannen, Stand {VERGLEICH_STAND}. Preise anderer
                      Anbieter ändern sich; maßgeblich ist deren aktuelle
                      Preisliste.
                    </p>
                  </m.div>
                ) : (
                  <m.div
                    key="erfolgsprovision"
                    className="flex grow flex-col"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      reduced
                        ? { opacity: 0, transition: { duration: 0 } }
                        : { opacity: 0, y: -4, transition: { duration: 0.15 } }
                    }
                    transition={{ duration: reduced ? 0 : 0.25 }}
                  >
                    <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">
                      Digitale Makler verkaufen gegen eine kleine Erfolgsprovision,
                      derzeit {ERFOLGSPROVISION.satzLabel} vom Kaufpreis inklusive
                      Mehrwertsteuer, ohne Käuferprovision. Vorher zahlen Sie
                      nichts; bezahlt wird nur, wenn wirklich verkauft wird. Dafür
                      übernimmt der Anbieter den Verkauf weitgehend:
                    </p>
                    <ul className="mt-5 flex flex-col gap-2.5">
                      {[
                        "Unterlagen werden beschafft und vorfinanziert, auch der Energieausweis",
                        "Exposé mit Bildbearbeitung und Grundrissdarstellung",
                        "Veröffentlichung auf den großen Portalen",
                        "Die Kommunikation mit Interessenten übernimmt der Anbieter, Sie sprechen mit niemandem",
                        "Besichtigungen werden koordiniert; Sie geben Zeiten vor und führen den Termin selbst",
                        "Finanzierungsnachweise und Vorbereitung des Notartermins",
                      ].map((punkt) => (
                        <li key={punkt} className="flex items-start gap-2.5 text-[0.92rem] text-ink">
                          <span
                            aria-hidden="true"
                            className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-ink-muted/50"
                          />
                          {punkt}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-[0.85rem] leading-relaxed text-ink-muted">
                      Bei {formatEuro(preis)} Verkaufspreis sind das{" "}
                      {formatEuroBetrag(erfolg)}, der Regler oben rechnet mit. Dafür
                      schließen Sie einen Maklervertrag; mit dem Verkauf entsteht
                      ein Provisionsanspruch.
                    </p>
                    <p className="mt-auto pt-4 text-[0.75rem] text-ink-muted">
                      Derzeitiger Preis eines verbreiteten Anbieters, Stand{" "}
                      {ERFOLGSPROVISION.stand}. Preise anderer Anbieter ändern sich;
                      maßgeblich ist deren aktuelle Preisliste.
                    </p>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col rounded-3xl border border-primary/30 bg-paper p-6 sm:p-8">
              <p className="eyebrow">Bei uns: Paket {paket?.name ?? "Selbst & Sicher"}</p>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">
                <span className="font-heading text-[1.6rem] font-semibold text-ink opsz-display">
                  {formatEuroBetrag(paketPreis)}
                </span>{" "}
                einmalig, oder monatlich zahlbar. Darin stecken die{" "}
                {formatMenge(SCHALTUNG_MONATE, "Monate")} Sichtbarkeit, und die Zeit beginnt
                erst, wenn Ihr Inserat wirklich online ist:
              </p>
              <ul className="mt-5 flex flex-col gap-2">
                {[
                  `Inserat auf den großen Portalen, ${formatMenge(SCHALTUNG_MONATE, "Monate")} ab Veröffentlichung`,
                  "Markteinschätzung mit echten Marktdaten, inklusive",
                  "Exposé aus Ihren Angaben, als PDF und online",
                  "Alle Anfragen an einem Ort, Ihre private E-Mail bleibt unsichtbar",
                  "Interessenten-Akte mit Verlauf, Finanzierungsnachweis digital",
                  "Besichtigungen mit Einladung, Bestätigung und Erinnerung",
                  "Geführter Ablauf mit Checklisten und Erklärvideos",
                ].map((punkt) => (
                  <li key={punkt} className="flex items-start gap-2.5 text-[0.92rem] text-ink">
                    <Check size={15} strokeWidth={2.2} className="mt-1 shrink-0 text-success" />
                    {punkt}
                  </li>
                ))}
              </ul>
              <PortalLogos className="mt-5" />
              <p className="mt-4 text-[0.85rem] leading-relaxed text-ink-muted">
                {detail === "inserat"
                  ? "Fotos, Grundrisse oder der Energieausweis kosten auf beiden Wegen extra; bei uns buchen Sie sie aus einer Hand dazu, bis hin zum echten Makler. Auch die Beschaffung der Unterlagen können Sie bei uns dazubuchen, beim Inserats-Weg fordern Sie Grundbuch, Flurkarte und Baulastenauskunft selbst bei den Ämtern an."
                  : "Fotos und Grundrisse kosten bei uns extra, Energieausweis und Unterlagen sind eine buchbare Leistung; beim Weg über die Erfolgsprovision sind sie enthalten. Dafür zahlen Sie bei uns nie einen Anteil vom Kaufpreis, egal wie hoch er ausfällt, und es entsteht kein Provisionsanspruch."}
              </p>
            </div>
          </div>
        </Reveal>

        {/* ---- Wann ein anderer Weg der bessere ist ----
            DREI EMPFEHLUNGEN, NICHT DREI ABSAETZE. Vorher standen hier
            zwei lange Texte in einem grauen Kasten, gleiche Schrift,
            gleiche Farbe. Inhaltlich ist das die mutigste Stelle der
            Seite, denn hier sagen wir, wann jemand uns nicht braucht.
            Genau das darf nicht aussehen wie Kleingedrucktes. Jetzt
            traegt jede Empfehlung ein Zeichen, eine Ueberschrift, die
            die Antwort schon enthaelt, und die Begruendung darunter.

            SEIT RUNDE 34 AUCH DER KLASSISCHE MAKLER. Er stand im
            Rechner darueber als teuerster Weg, aber in dieser Reihe
            fehlte er, und damit fehlte ausgerechnet der Weg, den die
            meisten Eigentuemer zuerst kennen. Eine Reihe, die zwei von
            drei Alternativen wuerdigt und die dritte auslaesst, ist
            kein ehrlicher Vergleich mehr, sondern eine Auswahl.

            ERST BEI lg DREISPALTIG, nicht schon bei md: Bei 768 px
            blieben je Karte rund 22 Zeichen Zeilenbreite, und
            dreispaltig unlesbar ist schlechter als einspaltig lesbar.

            ALLE TEXTE IN EINER FLUCHT (Auftrag des Inhabers,
            26.08.2026). Die drei Ueberschriften sind verschieden lang,
            zwei brauchen zwei Zeilen und eine drei; damit begann jeder
            Fliesstext auf einer anderen Hoehe, und drei Karten mit
            drei Anfaengen wirken unruhig. Geloest ueber ein
            UNTERRASTER: Das aeussere Raster hat drei Zeilen (Zeichen,
            Ueberschrift, Text), jede Karte spannt alle drei und
            uebernimmt sie mit grid-rows-subgrid. Die Zeilenhoehe
            bestimmt damit die laengste Ueberschrift, und alle drei
            Texte fangen auf derselben Linie an.

            gap-y-0 ab lg ist dabei kein Schoenheitswert, sondern
            noetig: Die Karten spannen alle Zeilen, also faellt der
            Zeilenabstand des aeusseren Rasters INNEN in die Karte.
            Unter lg stehen die Karten untereinander und brauchen ihn. */}
        <Reveal className="mt-10">
          <p className="text-center text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Wann Sie uns nicht brauchen
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto_1fr] lg:gap-y-0">
            <div className="flex flex-col rounded-3xl border border-line/60 bg-paper p-6 sm:p-7 lg:row-span-3 lg:grid lg:grid-rows-subgrid">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-tint text-primary">
                <Newspaper size={21} strokeWidth={1.7} />
              </span>
              <p className="mt-4 font-heading text-[1.15rem] font-semibold tracking-[-0.01em] text-ink">
                Nehmen Sie das Inserat, wenn Sie das schon einmal gemacht haben
              </p>
              <p className="mt-3 leading-relaxed text-ink-muted">
                Eine gefragte Wohnung in guter Lage, die Unterlagen beisammen, den Ablauf
                kennen Sie: Dann brauchen Sie uns nicht, und ein Inserat für ein paar
                hundert Euro ist die richtige Wahl. Wir sagen Ihnen das so deutlich, weil
                Sie uns auch beim Rest glauben sollen.
              </p>
            </div>
            <div className="flex flex-col rounded-3xl border border-line/60 bg-paper p-6 sm:p-7 lg:row-span-3 lg:grid lg:grid-rows-subgrid">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-tint text-primary">
                <ShieldCheck size={21} strokeWidth={1.7} />
              </span>
              <p className="mt-4 font-heading text-[1.15rem] font-semibold tracking-[-0.01em] text-ink">
                Nehmen Sie die Erfolgsprovision, wenn Sie noch unsicher sind
              </p>
              <p className="mt-3 leading-relaxed text-ink-muted">
                Sie wissen nicht sicher, ob Sie wirklich verkaufen, Ihre Immobilie ist
                schwer einzuschätzen, oder Sie möchten mit keinem Interessenten selbst
                sprechen: Dort zahlen Sie nichts, solange nicht verkauft ist. Unser
                Festpreis ist auch dann fällig, wenn kein Verkauf zustande kommt. Dafür
                wächst er nicht mit dem Kaufpreis, und es entsteht kein
                Provisionsanspruch.
              </p>
            </div>
            {/* DER KLASSISCHE MAKLER, ohne Namen und ohne Herabsetzung.
                Es geht hier um die LEISTUNG, nicht um den Preis: Den
                Preisvergleich hat der Rechner darueber schon gefuehrt,
                und ihn hier zu wiederholen waere ein zweiter Hieb auf
                dieselbe Stelle. Was er kann, kann bei uns niemand:
                alles uebernehmen. */}
            <div className="flex flex-col rounded-3xl border border-line/60 bg-paper p-6 sm:p-7 lg:row-span-3 lg:grid lg:grid-rows-subgrid">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-tint text-primary">
                <Handshake size={21} strokeWidth={1.7} />
              </span>
              <p className="mt-4 font-heading text-[1.15rem] font-semibold tracking-[-0.01em] text-ink">
                Nehmen Sie einen klassischen Makler, wenn Sie es ganz aus der Hand
                geben möchten
              </p>
              <p className="mt-3 leading-relaxed text-ink-muted">
                Sie wohnen weit weg, die Zeit fehlt, der Fall ist verzwickt (eine
                Erbengemeinschaft, ein vermietetes Objekt, fehlende Unterlagen), oder Sie
                möchten selbst gar nicht in Erscheinung treten: Dann ist ein Makler vor Ort
                die richtige Wahl. Er nimmt Ihnen den ganzen Verkauf ab, von den Unterlagen
                bis zur Übergabe. Bei uns können Sie einen Makler dazuholen, der Sie
                begleitet; die Fäden behalten dabei Sie in der Hand.
              </p>
            </div>
          </div>
          <p className="mt-6 text-center text-[0.95rem] leading-relaxed text-ink-muted">
            Für alle anderen ist der Verkauf ein Projekt mit vielen ersten Malen, und
            genau dafür gibt es <Wordmark className="text-[0.95rem]" />.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
