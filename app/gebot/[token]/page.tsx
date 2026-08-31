import type { Metadata } from "next";
import { CalendarClock, EyeOff, FileText, ShieldCheck } from "lucide-react";
import Wordmark from "@/components/layout/Wordmark";
import Ablauf, { type AblaufSchritt } from "@/components/bieterverfahren/Ablauf";
import Countdown from "@/components/bieterverfahren/Countdown";
import Eckdaten from "@/components/bieterverfahren/Eckdaten";
import GebotFormular from "@/components/bieterverfahren/GebotFormular";
import ObjektGalerie from "@/components/bieterverfahren/ObjektGalerie";
import LinkFehler from "@/components/nachweis/LinkFehler";
import Reveal from "@/components/ui/Reveal";
import {
  HINWEIS_KEINE_BINDUNG,
  HINWEIS_KEINE_EINSICHT,
  HINWEIS_NACHWEIS_PFLICHT,
} from "@/config/bieterverfahren";
import { euro, nimmtGeboteAn, type Bieterverfahren, type Gebot } from "@/lib/bieterverfahren";
import Zwischenseite from "@/components/einmal-link/Zwischenseite";
import { linkPruefen } from "@/lib/einmal-link";
import { istFreigegeben } from "@/lib/link-freigabe";
import { OBJEKTART_LABELS, type Objektart } from "@/lib/objekt-felder";
import {
  BILD_BREITEN,
  gespeicherteBreite,
  kleineAdressen,
  volleAdressen,
} from "@/lib/bild-adressen";
import { supabaseService, UNTERLAGEN_BUCKET } from "@/lib/supabase/service";
import {
  aktiverPfad,
  oeffentlichZeigbar,
  sortierteFotos,
  type Unterlage,
} from "@/lib/unterlagen";
import { formatMenge } from "@/lib/utils";

/**
 * Die Seite, auf der ein Interessent sein Gebot abgibt.
 *
 * Fuer viele ist das der ERSTE Eindruck von selbst-verkauf.de, und es
 * geht um viel Geld. Deshalb ist sie ruhig, klar und ohne jeden
 * Verkaufsdruck: kein "nur noch", kein Hoechststand, keine Anzahl.
 *
 * GESTALTUNG, die Entscheidungen im Einzelnen:
 *  * Das Objekt steht ganz oben und gross im Bild, nicht als Textzeile.
 *    Wer bietet, will sehen, worueber er entscheidet.
 *  * Die Eckdaten sind eine Kennzahlen-Reihe, keine graue Zeile mit
 *    Trennpunkten. Es sind die ersten drei Fragen, also bekommen sie
 *    eigene Zahlen.
 *  * Der Countdown ist der emotionale Kern und deshalb das groesste
 *    Element der Seite. Jeder Wechsel faehrt weich nach, in den letzten
 *    Stunden wechselt die Farbe auf Terrakotta. Kein Rot, kein Blinken.
 *  * Drei Schritte machen sichtbar, wo man steht und was danach kommt.
 *  * Alles blendet gestaffelt ein, in derselben Handschrift wie die
 *    Website (Reveal), und respektiert reduzierte Bewegung.
 *
 * Was hier nie steht, und zwar mit Absicht:
 *   * die Gebote anderer, auch nicht als Anzahl oder Rang
 *   * irgendeine Formulierung, die nach Versteigerung klingt
 *   * die genaue Adresse des Objekts
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ihr Gebot",
  robots: { index: false, follow: false },
};

/**
 * Die signierten Bildadressen kommen seit der Ladezeiten-Runde
 * (18.08.2026) aus lib/bild-adressen.ts: hoechstens eine Stunde
 * gueltig (Halbstunden-Raster, ausgeliefert mit 30 bis 60 Minuten
 * Rest), also nie laenger als vorher, und innerhalb des Fensters
 * wiederverwendet, damit Browser und CDN warm werden. Der Bucket
 * bleibt privat, es gibt keinen anderen Weg an die Bilder. Das
 * Expose-PDF behaelt seine eigene Stunde weiter unten.
 */

export default async function GebotSeite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "gebot");
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
        titel="Sie möchten ein Gebot abgeben."
        text="Über diesen Link sehen Sie das Bieterverfahren und geben Ihr Gebot ab. Abgeschickt ist damit noch nichts, das entscheiden Sie auf der nächsten Seite."
        knopf="Zum Bieterverfahren"
        ziel="/api/link-oeffnen"
        felder={{ zweck: "gebot", token }}
      />
    );
  }

  const link = pruefung.link;
  const service = supabaseService();
  if (!service) return <LinkFehler grund="unbekannt" />;

  const { data: verfahrenDaten } = await service
    .from("bieterverfahren")
    .select("*")
    .eq("id", link.ziel_id ?? "")
    .maybeSingle();
  const verfahren = verfahrenDaten as Bieterverfahren | null;
  if (!verfahren) return <LinkFehler grund="unbekannt" />;

  const { data: objekt } = await service
    .from("objekte")
    .select("objektart, stadt, wohnflaeche_qm, grundstuecksflaeche_qm, zimmer, baujahr, expose_pfad")
    .eq("id", verfahren.objekt_id)
    .maybeSingle();
  const o = objekt as {
    objektart?: Objektart | null;
    stadt?: string | null;
    wohnflaeche_qm?: number | null;
    grundstuecksflaeche_qm?: number | null;
    zimmer?: number | null;
    baujahr?: number | null;
    expose_pfad?: string | null;
  } | null;
  const bezeichnung =
    [o?.objektart ? OBJEKTART_LABELS[o.objektart] : null, o?.stadt]
      .filter(Boolean)
      .join(" in ") || "die Immobilie";

  // Fotos: nur die, die auch im Exposé stehen. Was der Eigentümer dort
  // ausgeschlossen hat, hat er bewusst ausgeschlossen.
  const { data: unterlagenDaten } = await service
    .from("unterlagen")
    .select("*")
    .eq("objekt_id", verfahren.objekt_id);
  const fotos = sortierteFotos(
    ((unterlagenDaten ?? []) as Unterlage[]).filter(oeffentlichZeigbar)
  );

  /* Die Galerie-Bilder in Anzeige-Groessen, parallel statt
     nacheinander: Bis zur Ladezeiten-Runde liefen hier zwoelf
     Einzel-Signaturen in einer Schleife (ein Wasserfall im Server),
     und die Leiste lud zwoelf VOLLE Dateien, gemessen 19,9 MB je
     Aufruf. Die volle Adresse bleibt je Bild der Rueckfall. */
  const galerieFotos = fotos.slice(0, 12);
  const galeriePfade = galerieFotos.map((f) => aktiverPfad(f));
  const galerieBreiten = galerieFotos.map((f) => gespeicherteBreite(f));
  const [volle, grosse, kleine] = await Promise.all([
    volleAdressen(galeriePfade),
    kleineAdressen(galeriePfade, BILD_BREITEN.titel, galerieBreiten),
    kleineAdressen(galeriePfade, BILD_BREITEN.leiste, galerieBreiten),
  ]);
  const bilder = galeriePfade
    .map((pfad, i) => {
      const voll = volle.get(pfad);
      if (!voll) return null;
      return { gross: grosse[i] ?? voll, klein: kleine[i] ?? voll, voll };
    })
    .filter((b): b is { gross: string; klein: string; voll: string } => b !== null);

  let exposeUrl: string | null = null;
  if (o?.expose_pfad) {
    // Das Expose ist ein PDF, keine Bild-Umrechnung: eine Stunde wie bisher
    const { data } = await service.storage
      .from(UNTERLAGEN_BUCKET)
      .createSignedUrl(o.expose_pfad, 3600);
    exposeUrl = data?.signedUrl ?? null;
  }

  // NUR das eigene Gebot dieses Bieters, nie die der anderen
  const { data: eigenesDaten } = await service
    .from("gebote")
    .select("*")
    .eq("verfahren_id", verfahren.id)
    .eq("anfrage_id", link.anfrage_id ?? "")
    .eq("runde", verfahren.aktuelle_runde)
    .maybeSingle();
  const eigenes = eigenesDaten as Gebot | null;

  const { data: nachweis } = await service
    .from("bonitaetsnachweise")
    .select("id")
    .eq("anfrage_id", link.anfrage_id ?? "")
    .limit(1)
    .maybeSingle();

  const offen = nimmtGeboteAn(verfahren);
  const hatNachweis = Boolean(nachweis);
  const hatGeboten = Boolean(eigenes && eigenes.status !== "zurueckgezogen");

  const erledigt: AblaufSchritt[] = [
    ...(hatNachweis ? (["nachweis"] as const) : []),
    ...(hatGeboten ? (["gebot"] as const) : []),
  ];
  const aktuell: AblaufSchritt = !hatNachweis
    ? "nachweis"
    : !hatGeboten
      ? "gebot"
      : "entscheidung";

  const eckdaten = [
    o?.wohnflaeche_qm
      ? { wert: formatMenge(o.wohnflaeche_qm, "m²"), label: "Wohnfläche" }
      : null,
    o?.zimmer ? { wert: o.zimmer.toLocaleString("de-DE"), label: "Zimmer" } : null,
    o?.baujahr ? { wert: String(o.baujahr), label: "Baujahr" } : null,
    o?.grundstuecksflaeche_qm
      ? {
          wert: formatMenge(o.grundstuecksflaeche_qm, "m²"),
          label: "Grundstück",
        }
      : null,
  ].filter(Boolean) as { wert: string; label: string }[];

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

      {/* Das Objekt, groß. Ohne Fotos trägt die Fläche darunter. */}
      <Reveal y={20}>
        <ObjektGalerie bilder={bilder} bezeichnung={bezeichnung} />
      </Reveal>

      <Reveal delay={0.08} y={20}>
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <h1 className="text-balance font-heading text-h2 opsz-display text-ink">
            {bezeichnung}
          </h1>

          {eckdaten.length > 0 ? (
            <div className="mt-6 border-t border-line/70 pt-6">
              <Eckdaten werte={eckdaten} />
            </div>
          ) : null}

          <div className="mt-7 border-t border-line/70 pt-6">
            <p className="text-[0.8rem] uppercase tracking-[0.08em] text-ink-muted">
              Startpreis
            </p>
            <p className="mt-1.5 font-heading text-[2.2rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink opsz-display">
              {euro(verfahren.startpreis)}
            </p>
          </div>

          <div className="mt-7 border-t border-line/70 pt-6">
            <div className="flex items-center gap-2 text-[0.85rem] text-ink-muted">
              <CalendarClock size={15} strokeWidth={1.8} className="text-primary" />
              {/* Zwei Zustaende, zwei Saetze, wie an der Route: Ein
                  noch nicht gestartetes Verfahren hat keine beendete
                  Frist. */}
              {offen
                ? "Noch Zeit für Ihr Gebot"
                : verfahren.status === "vorbereitet"
                  ? "Das Verfahren hat noch nicht begonnen"
                  : "Die Frist ist beendet"}
            </div>
            <Countdown
              frist={verfahren.frist}
              vorbei={!offen}
              nochNicht={verfahren.status === "vorbereitet"}
              className="mt-4"
            />
          </div>

          {exposeUrl ? (
            <a
              href={exposeUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-[0.88rem] font-medium text-ink transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <FileText size={15} strokeWidth={1.8} className="text-primary" />
              Exposé öffnen
            </a>
          ) : null}

          {verfahren.aktuelle_runde > 1 ? (
            <p className="mt-6 rounded-2xl bg-paper px-4 py-3 text-[0.88rem] leading-relaxed text-ink">
              Dies ist die {verfahren.aktuelle_runde}. Runde. Sie sind erneut
              eingeladen, ein Gebot abzugeben.
            </p>
          ) : null}
        </div>
      </Reveal>

      {/* Wo stehe ich, was kommt danach */}
      <Reveal delay={0.14} y={20}>
        <Ablauf erledigt={erledigt} aktuell={aktuell} />
      </Reveal>

      {/* Die Regeln, so wie der Eigentümer sie formuliert hat */}
      <Reveal delay={0.2} y={20}>
        <section>
          <h2 className="font-heading text-[1.25rem] font-semibold tracking-[-0.01em] text-ink">
            So läuft es ab
          </h2>
          <p className="mt-3 max-w-[64ch] whitespace-pre-wrap text-pretty leading-relaxed text-ink-muted">
            {verfahren.regeln_text}
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <p className="flex gap-2.5 rounded-2xl bg-surface-tint px-4 py-3 text-[0.88rem] leading-relaxed text-ink">
              <ShieldCheck size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-primary" />
              {HINWEIS_KEINE_BINDUNG}
            </p>
            <p className="flex gap-2.5 rounded-2xl bg-background px-4 py-3 text-[0.88rem] leading-relaxed text-ink-muted">
              <EyeOff size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-primary" />
              {HINWEIS_KEINE_EINSICHT}
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.26} y={20}>
        <GebotFormular
          token={token}
          offen={offen}
          nochNicht={verfahren.status === "vorbereitet"}
          startpreis={verfahren.startpreis}
          eigenes={
            eigenes && eigenes.status !== "zurueckgezogen"
              ? {
                  betrag: eigenes.betrag,
                  name: eigenes.name,
                  email: eigenes.email,
                  telefon: eigenes.telefon,
                  finanzierungsart: eigenes.finanzierungsart,
                }
              : null
          }
          hatNachweis={hatNachweis}
          nachweisHinweis={HINWEIS_NACHWEIS_PFLICHT}
          empfaengerName={link.empfaenger_name}
          empfaengerEmail={link.empfaenger_email}
        />
      </Reveal>
    </main>
  );
}
