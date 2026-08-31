import type { Metadata } from "next";
import { CalendarCheck2, MapPin, ShieldCheck } from "lucide-react";
import BesichtigungAntwort, {
  type Vorschlag,
} from "@/components/besichtigung/BesichtigungAntwort";
import LinkFehler from "@/components/nachweis/LinkFehler";
import Wordmark from "@/components/layout/Wordmark";
import Reveal from "@/components/ui/Reveal";
import {
  freiePlaetze,
  istSammel,
  nimmtZusagenAn,
  ortFuerInteressent,
  zeitraumText,
  type Besichtigung,
} from "@/lib/besichtigungen";
import Zwischenseite from "@/components/einmal-link/Zwischenseite";
import { linkPruefen } from "@/lib/einmal-link";
import { istFreigegeben } from "@/lib/link-freigabe";
import { objektBezeichnung } from "@/lib/objekt-felder";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Die Seite, auf der ein Interessent seinen Besichtigungstermin
 * bestätigt oder absagt.
 *
 * ÖFFENTLICH und ohne Konto. Der Zugang ist allein das Token, das an
 * die PERSON gebunden ist, nicht an einen einzelnen Termin. Deshalb
 * führt auch die Mail von letzter Woche auf den aktuellen Stand: Wer
 * einen verschobenen Termin hat, sieht hier den neuen Zeitpunkt und
 * nicht den alten Vorschlag.
 *
 * WAS HIER NIE STEHT: der Name des Verkäufers, die Namen anderer
 * Interessenten, irgendetwas aus deren Akten. Und die genaue Adresse
 * erst, wenn der Termin bestätigt ist oder der Verkäufer sie
 * ausdrücklich früher freigegeben hat (ortFuerInteressent).
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ihr Besichtigungstermin",
  robots: { index: false, follow: false },
};

export default async function BesichtigungSeite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "besichtigung");
  if (!pruefung.gueltig) return <LinkFehler grund={pruefung.grund} />;

  /* ZWISCHENSEITE VOR DEM INHALT. Erst der Klick eines Menschen gibt
     die Seite frei, ein Pruefdienst im Hintergrund bekommt nur den
     Zweck zu sehen. Siehe lib/link-freigabe.ts.

     Die Pruefung des Links steht BEWUSST davor: Ein toter Link bekommt
     sofort die Fehleransicht mit dem Weg zu einem neuen. Ein Knopf,
     der ins Leere fuehrt, waere die schlechtere Antwort. */
  if (!(await istFreigegeben(token))) {
    return (
      <Zwischenseite
        titel="Sie möchten Ihren Besichtigungstermin ansehen."
        text="Über diesen Link sehen Sie Ihren Terminvorschlag und sagen zu oder ab. Festgelegt ist damit noch nichts, das entscheiden Sie auf der nächsten Seite."
        knopf="Zum Termin"
        ziel="/api/link-oeffnen"
        felder={{ zweck: "besichtigung", token }}
      />
    );
  }

  const link = pruefung.link;
  const service = supabaseService();
  if (!service) return <LinkFehler grund="unbekannt" />;

  const { data: einladungen } = await service
    .from("besichtigungs_einladungen")
    .select("id, besichtigung_id, status")
    .eq("interessent_id", link.ziel_id ?? "");

  if (!einladungen?.length) {
    return <LinkFehler grund="unbekannt" />;
  }

  const [{ data: termineDaten }, { data: objekt }] = await Promise.all([
    service
      .from("besichtigungen")
      .select("*")
      .in("id", einladungen.map((e) => e.besichtigung_id as string))
      .order("beginn", { ascending: true }),
    service
      .from("objekte")
      .select("objektart, stadt, strasse, plz")
      .eq("id", link.objekt_id ?? "")
      .maybeSingle<{
        objektart: string | null;
        stadt: string | null;
        strasse: string | null;
        plz: string | null;
      }>(),
  ]);
  const termine = (termineDaten ?? []) as Besichtigung[];
  const bezeichnung = objektBezeichnung(objekt ?? {});

  // Die Zusagen je Termin, ausschliesslich als ZAHL. Wer sonst noch
  // eingeladen ist, geht diesen Interessenten nichts an.
  const { data: alleZusagen } = await service
    .from("besichtigungs_einladungen")
    .select("besichtigung_id")
    .in("besichtigung_id", termine.map((t) => t.id))
    .eq("status", "zugesagt");
  const zusagenJe = new Map<string, number>();
  for (const z of alleZusagen ?? []) {
    const k = z.besichtigung_id as string;
    zusagenJe.set(k, (zusagenJe.get(k) ?? 0) + 1);
  }

  const vorschlaege: Vorschlag[] = termine.map((t) => {
    const einladung = einladungen.find((e) => e.besichtigung_id === t.id)!;
    const zusagen = zusagenJe.get(t.id) ?? 0;
    const offen = nimmtZusagenAn(t, zusagen);
    return {
      id: t.id,
      zeit: zeitraumText(t.beginn, t.dauer_minuten),
      ort: objekt ? ortFuerInteressent(objekt, t) : "Wird noch mitgeteilt",
      terminStatus: t.status,
      einladungStatus: einladung.status as string,
      sammel: istSammel(t),
      art: t.art ?? "einzeltermin",
      freiePlaetze: freiePlaetze(t, zusagen),
      annahmeMoeglich: offen.moeglich,
      grundDagegen: offen.grund ?? null,
    };
  });

  const bestaetigt = vorschlaege.find(
    (v) => v.einladungStatus === "zugesagt" && v.terminStatus === "bestaetigt"
  );

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14"
      /* SCHRIFT DER ANWENDUNG (Runde 37, 29.08.2026): Diese Seite
         steht unter oeffentlicher Adresse, ist aber eine Ausgabe der
         Anwendung fuer einen Interessenten und entsteht aus den Daten
         des Kunden. Erklaerung der Regel in app/globals.css. */
      data-bereich="anwendung"
    >
      <div className="flex items-center gap-3">
        <Wordmark className="text-[1.1rem]" />
        <span aria-hidden="true" className="h-5 w-px bg-line" />
        <span className="inline-flex items-center gap-1.5 text-[0.85rem] text-ink-muted">
          <ShieldCheck size={15} strokeWidth={1.8} className="text-primary" />
          Gesicherte Seite
        </span>
      </div>

      <Reveal y={20}>
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <p className="text-[0.8rem] uppercase tracking-[0.08em] text-ink-muted">
            Besichtigung
          </p>
          <h1 className="mt-1.5 text-balance font-heading text-h2 opsz-display text-ink">
            {bezeichnung}
          </h1>

          {bestaetigt ? (
            <div className="mt-6 border-t border-line/70 pt-6">
              <p className="flex items-center gap-2 text-[0.88rem] font-medium text-ink">
                <CalendarCheck2 size={16} strokeWidth={1.8} className="text-primary" />
                Ihr Termin steht
              </p>
              <p className="mt-2 font-heading text-[1.3rem] leading-snug text-ink">
                {bestaetigt.zeit}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-[0.9rem] text-ink-muted">
                <MapPin size={15} strokeWidth={1.8} className="text-primary" />
                {bestaetigt.ort}
              </p>
            </div>
          ) : (
            <p className="mt-5 max-w-[64ch] text-pretty leading-relaxed text-ink-muted">
              Der Eigentümer hat Ihnen einen Termin zur Besichtigung
              vorgeschlagen. Sie müssen sich dafür nirgends anmelden.
            </p>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.08} y={20}>
        <BesichtigungAntwort token={token} vorschlaege={vorschlaege} />
      </Reveal>

      <p className="max-w-[64ch] text-[0.85rem] leading-relaxed text-ink-muted">
        Wir sind selbst-verkauf.de und begleiten den Eigentümer beim Verkauf.
        Ihre Antwort geht direkt an ihn. Eine Besichtigung verpflichtet Sie zu
        nichts.
      </p>
    </main>
  );
}
