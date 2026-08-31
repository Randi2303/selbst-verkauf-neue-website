import type { Metadata } from "next";
import Image from "next/image";
import { HeartHandshake, MapPin, PhoneCall, Scale, Video } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TeamCta from "@/components/team/TeamCta";
import WarumWirDasMachen from "@/components/team/WarumWirDasMachen";
import { mitBetonung } from "@/components/ui/Betont";
import BrandName from "@/components/ui/BrandName";
import { textMitMarken } from "@/components/ui/PartnerName";
import PlatzhalterMuster from "@/components/ui/PlatzhalterMuster";
import Reveal from "@/components/ui/Reveal";
import { ABGRENZUNG, GRUPPEN_TITEL, HALTUNG, MENSCHEN, type Mensch } from "@/config/menschen";
import { portraetFokus, type Bildmasse } from "@/lib/bildausschnitt";
import { ermittleMenschenBilder } from "@/lib/menschen-bilder";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/site.config";

const PAGE_TITLE = "Das Team hinter selbst-verkauf.de";
const PAGE_DESCRIPTION =
  "Wer hinter selbst-verkauf.de steht: das Team aus dem Münsterland, das die Plattform baut, und die begleitenden Makler mit rund 30 Jahren Immobilienerfahrung.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/team" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/team",
    siteName: siteConfig.name,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/**
 * Die Seite liest, wie die Startseiten-Sektion "Die Menschen dahinter",
 * alle Personen aus config/menschen.ts: dieselben Namen, Bezeichnungen,
 * Zahlen und dieselbe Reihenfolge. Hier stehen zusätzlich die
 * ausführlichen Sätze (mensch.mehr); die Startseite führt hierher.
 *
 * Seit Runde 31 mit den echten Menschen: Vorher standen hier vier
 * [VORNAME NACHNAME]-Platzhalter, eine "drei Welten"-Erzählung mit
 * einem Marketing-Feld ohne Person dahinter und ein allgemeines
 * Team-Zitat. Die Kompetenz-Karten sind bewusst gefallen: Wer die
 * Menschen mit Namen und Aufgabe zeigt, braucht daneben keine
 * abstrakten Fähigkeits-Kacheln.
 */

/** Merkmale beider Makler, bewusst identisch und ohne Superlative */
const MAKLER_MERKMALE = [
  { icon: Video, text: "Per Video und Telefon erreichbar" },
  { icon: MapPin, text: "Im Pilotgebiet vor Ort" },
] as const;

const VALUES = [
  {
    icon: HeartHandshake,
    title: "Ehrlich beraten",
    text: "Wir sagen auch, wenn sich eine Leistung für Ihr Objekt nicht lohnt.",
  },
  {
    icon: Scale,
    title: "Kein Druck",
    text: "Sie entscheiden über Tempo und Umfang. Wir drängen nicht, wir erklären.",
  },
  {
    icon: PhoneCall,
    title: "Erreichbar, wenn es zählt",
    text: "Vor der Besichtigung, im Preisgespräch, am Tag des Notartermins.",
  },
];

/**
 * Personen-Karte der Team-Seite. Zwei Formen:
 *
 * - stehend (Team): Porträt im 3:4-Ausschnitt, darunter Name,
 *   Bezeichnung und die Sätze zur Person.
 * - liegend (begleitende Makler): kompaktes Porträt neben dem Text,
 *   im Maß der früheren Makler-Karten. Die stehende Form war hier zu
 *   groß: Zwei Porträts nahmen fast den ganzen Bildschirm ein
 *   (Inhaber, Runde 31); liegend passen beide samt Einleitung in
 *   einen Blick.
 *
 * Liegt das Foto nicht in public/, greift der Initialen-Kreis mit dem
 * Linienmuster.
 */
function MenschKarte({
  mensch,
  fotoVorhanden,
  masse,
  liegend = false,
}: {
  mensch: Mensch;
  fotoVorhanden: boolean;
  /** Echte Bildmaße, zur Bauzeit gelesen; null, wenn kein Foto da ist */
  masse: Bildmasse | null;
  liegend?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-3xl border border-line/70 bg-paper p-5 shadow-soft transition-all duration-300 ease-swift hoverable:-translate-y-1.5 hoverable:shadow-lift",
        liegend && "gap-4 sm:flex-row sm:gap-5"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl",
          liegend ? "h-32 w-32 shrink-0 sm:h-44 sm:w-[8.5rem]" : "aspect-[3/4] w-full"
        )}
      >
        {fotoVorhanden && masse ? (
          <Image
            src={mensch.bild}
            alt={`Porträt von ${mensch.name}`}
            fill
            sizes={liegend ? "136px" : "(min-width: 1024px) 260px, (min-width: 640px) 45vw, 90vw"}
            className="foto-warm object-cover"
            /* Nur verschoben, nie herangeholt (lib/bildausschnitt.ts).
               Die liegende Karte ist unter sm quadratisch und darüber
               136 auf 176; gerechnet wird mit dem ENGEREN der beiden
               Rahmen, damit das Gesicht in beiden drinbleibt. */
            style={{ objectPosition: portraetFokus(mensch.mittelpunkt, masse, liegend ? 1 : 3 / 4) }}
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center bg-surface" aria-hidden="true">
            <PlatzhalterMuster />
            <span className="relative font-heading text-5xl font-semibold text-primary">
              {mensch.initialen}
            </span>
          </div>
        )}
      </div>
      {/* min-w-0 und break-words: Die Textspalte darf schmaler werden
          als ihr längstes Wort ("WerteImmobilien" bei 320 px) */}
      <div className={cn("flex flex-col", liegend && "min-w-0 flex-1 break-words")}>
        <h3 className={cn("font-heading text-[1.2rem] font-semibold tracking-[-0.01em]", !liegend && "mt-5")}>
          {mensch.name}
        </h3>
        <p className="mt-0.5 text-[0.88rem] text-ink-muted">{mensch.bezeichnung}</p>
        {/* Absätze trennt \n\n (neuer Gedanke = eigener Absatz,
            STEHENDE REGEL des Inhabers, 26.08.2026) */}
        <div className="mt-3 flex-1 space-y-2">
          {[...mensch.beschreibung.split("\n\n"), ...(mensch.mehr ? [mensch.mehr] : [])].map(
            (absatz) => (
              <p key={absatz.slice(0, 24)} className="text-[0.9rem] leading-relaxed text-ink-muted">
                {mitBetonung(absatz)}
              </p>
            )
          )}
        </div>
        {mensch.gruppe === "makler" ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {MAKLER_MERKMALE.map((merkmal) => (
              <li
                key={merkmal.text}
                className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-background px-2.5 py-1 text-[0.72rem] font-medium text-primary"
              >
                <merkmal.icon size={11} strokeWidth={1.8} aria-hidden="true" />
                {merkmal.text}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

export default async function TeamPage() {
  const bilder = await ermittleMenschenBilder();
  const team = MENSCHEN.filter((mensch) => mensch.gruppe === "team");
  const makler = MENSCHEN.filter((mensch) => mensch.gruppe === "makler");

  return (
    <>
      <Header />
      <main id="inhalt" className="pt-28 md:pt-36">
        {/* Intro: zwei Welten, ein Werkzeug. Bis Runde 31 stand hier
            "drei Welten" mit Marketing als dritter; hinter der dritten
            stand kein Mensch, und eine Behauptung ohne Person dahinter
            gehört nicht auf die Team-Seite. */}
        <section className="container-page">
          <p className="anim-rise eyebrow">Team</p>
          <h1
            className="anim-rise mt-4 max-w-3xl font-heading text-h2 opsz-display text-ink"
            style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
          >
            Bei <BrandName /> treffen zwei Welten aufeinander.
          </h1>
          <p
            className="anim-rise mt-5 max-w-2xl text-[1.13rem] leading-relaxed text-ink-muted"
            style={{ "--rise-delay": "0.16s" } as React.CSSProperties}
          >
            Erfahrung aus der Immobilienvermittlung, mit echten Verkäufen,
            Besichtigungen und Notarterminen. Und Entwicklung, die daraus eine
            Plattform macht: Technik und KI, die Abläufe leichter machen statt
            komplizierter. Zusammen bauen wir das Werkzeug, das wir
            Eigentümern schon immer gewünscht haben.
          </p>
        </section>

        {/* Warum wir das machen: steht bewusst ganz vorn, denn mit
            dieser Frage öffnen die meisten die Team-Seite. Gestaltung
            und Begründung in der Komponente. */}
        <WarumWirDasMachen />

        {/* Das Team, aus config/menschen.ts, leicht versetzt wie die
            früheren Karten. Keine Entstehens-Animation: Die neuen
            Flächen dieser Runde bewegen sich nur, wo Bewegung etwas
            bedeutet (Inhaber, Runde 31). */}
        <section className="container-page mt-16 md:mt-20">
          <div className="max-w-2xl">
            <h2 className="font-heading text-h3 text-ink">{GRUPPEN_TITEL.team}</h2>
            <p className="mt-2.5 leading-relaxed text-ink-muted">
              Vier Menschen bauen <BrandName />: die Plattform, die Oberfläche
              und die Technik dahinter. Und einer von ihnen ist zugleich Ihr
              Ansprechpartner.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((mensch, i) => (
              <div key={mensch.name} className={cn("h-full", i % 2 === 1 && "lg:mt-8")}>
                <MenschKarte
                  mensch={mensch}
                  fotoVorhanden={bilder.fotos[mensch.name] ?? false}
                  masse={bilder.masse[mensch.name] ?? null}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Die begleitenden Makler: eigene Gruppe mit eigener
            Einleitung, damit der Unterschied zum Team erkennbar
            bleibt. Sie sind keine Angestellten von selbst-verkauf.de. */}
        <section className="container-page mt-16 md:mt-20">
          <div className="max-w-2xl">
            <h2 className="font-heading text-h3 text-ink">{GRUPPEN_TITEL.makler}</h2>
            <p className="mt-2.5 leading-relaxed text-ink-muted">{textMitMarken(ABGRENZUNG)}</p>
            <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-muted">
              {textMitMarken(
                `Die ${siteConfig.brokerPartner.company} sitzt in ${siteConfig.brokerPartner.location}. ${siteConfig.brokerPartner.description}`
              )}
            </p>
          </div>
          <div className="mt-8 grid max-w-4xl grid-cols-1 gap-5 lg:grid-cols-2">
            {makler.map((mensch) => (
              <MenschKarte
                key={mensch.name}
                mensch={mensch}
                fotoVorhanden={bilder.fotos[mensch.name] ?? false}
                masse={bilder.masse[mensch.name] ?? null}
                liegend
              />
            ))}
          </div>
        </section>

        {/* Die Haltung, aus derselben Quelle wie die Startseiten-
            Sektion (config/menschen.ts). Hier als ruhiger, mittiger
            Block anstelle des früheren allgemeinen Team-Zitats. */}
        <section className="container-page mt-16 md:mt-20">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              {/* Ohne Strich davor: Der Kernsatz ist die eine
                  hervorgehobene Stelle und braucht keine zweite Form
                  (Inhaber, Runde 31) */}
              <p className="font-heading text-h3 leading-snug text-ink opsz-display">
                {HALTUNG.kernsatz}
              </p>
              <p className="mx-auto mt-5 max-w-2xl text-pretty leading-relaxed text-ink-muted">
                {HALTUNG.absatz1} {HALTUNG.absatz2}
              </p>
            </div>
          </Reveal>
        </section>

        {/* Region */}
        <section className="container-page mt-16 md:mt-20">
          <Reveal>
            <div className="flex flex-col gap-6 rounded-4xl border border-primary/10 bg-surface-tint p-8 shadow-card md:flex-row md:items-start md:gap-8 md:p-10">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper text-primary">
                <MapPin size={22} strokeWidth={1.5} />
              </span>
              <div>
                <h2 className="font-heading text-h3 text-ink">Unsere Region</h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
                  Wir sind im Münsterland zu Hause. Das heißt ehrlich gesagt
                  auch: Nicht überall in Deutschland können wir persönlich
                  vorbeikommen. Die Plattform funktioniert bundesweit, Beratung
                  gibt es per Video und Telefon. Und wenn Ihr Objekt in unserer
                  Region liegt, sind wir auf Wunsch persönlich vor Ort.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Werte in derselben Karten-Optik wie der Rest der Seite */}
        <section className="container-page mt-16 md:mt-20">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {VALUES.map((value, i) => (
              <Reveal key={value.title} delay={i * 0.08} className="h-full">
                <article className="group h-full rounded-3xl border border-line/70 bg-paper p-7 shadow-soft transition-all duration-300 ease-swift hoverable:-translate-y-1.5 hoverable:shadow-lift">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-tint text-primary transition-transform duration-300 ease-swift group-hoverable:-rotate-3 group-hoverable:scale-110">
                    <value.icon size={22} strokeWidth={1.5} />
                  </div>
                  <h2 className="mt-5 font-heading text-[1.2rem] font-semibold tracking-[-0.01em]">
                    {value.title}
                  </h2>
                  <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-muted">{value.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Abschluss */}
        <section className="container-page mt-16 pb-24 md:mt-20 md:pb-32">
          <TeamCta />
        </section>
      </main>
      <Footer />
    </>
  );
}
