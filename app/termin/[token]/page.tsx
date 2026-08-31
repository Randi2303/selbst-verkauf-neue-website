import type { Metadata } from "next";
import { CalendarCheck2 } from "lucide-react";
import NachweisAnfordern from "@/components/besichtigung/NachweisAnfordern";
import ZeitWaehlen from "@/components/besichtigung/ZeitWaehlen";
import Zwischenseite from "@/components/einmal-link/Zwischenseite";
import LinkFehler from "@/components/nachweis/LinkFehler";
import Wordmark from "@/components/layout/Wordmark";
import Reveal from "@/components/ui/Reveal";
import { linkPruefen } from "@/lib/einmal-link";
import { istFreigegeben } from "@/lib/link-freigabe";
import { objektBezeichnung } from "@/lib/objekt-felder";
import { freieZeitenFuerPerson } from "@/lib/verfuegbarkeit-server";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Die Seite, auf der sich ein Interessent selbst eine Zeit aussucht.
 *
 * ÖFFENTLICH UND OHNE KONTO, wie alles, was ein Interessent bei uns
 * tut. Der Zugang ist allein das Token, gebunden an die PERSON.
 *
 * WAS HIER NIE STEHT: der Name des Verkäufers, die Namen anderer
 * Interessenten, wie viele sich schon eingetragen haben. Eine belegte
 * Zeit ist einfach nicht in der Liste, und zwar schon auf dem Server;
 * es gibt nichts Ausgegrautes, aus dem sich etwas ableiten ließe.
 *
 * DIE GENAUE ADRESSE ERST MIT DER BESTÄTIGUNG. Sie steht in der Mail,
 * die nach dem Buchen hinausgeht, nicht schon hier: Vorher weiß
 * niemand, ob überhaupt jemand kommt.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Termin aussuchen",
  robots: { index: false, follow: false },
};

export default async function TerminSeite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "buchung");
  if (!pruefung.gueltig) return <LinkFehler grund={pruefung.grund} />;
  const link = pruefung.link;

  /* ZWISCHENSEITE VOR DEM INHALT, wie bei jedem Einmal-Link: Erst der
     Klick eines Menschen gibt den Inhalt frei. Mailprogramme und
     Sicherheits-Scanner rufen Links im Hintergrund auf, und ein
     Vorschau-Abruf soll keinen Termin sehen. */
  /* Der Merker haengt am TOKEN, nicht an der Kennung des Links: Wer
     zwei Links bekommt, soll mit dem einen nicht den anderen
     freischalten (lib/link-freigabe.ts). */
  if (!(await istFreigegeben(token))) {
    return (
      <Zwischenseite
        titel="Sie möchten einen Besichtigungstermin aussuchen."
        text="Über diesen Link sehen Sie die freien Zeiten. Festgelegt ist damit noch nichts, das entscheiden Sie auf der nächsten Seite."
        knopf="Zu den freien Zeiten"
        ziel="/api/link-oeffnen"
        felder={{ zweck: "buchung", token }}
      />
    );
  }

  const service = supabaseService();
  const { data: objekt } = service && link.objekt_id
    ? await service
        .from("objekte")
        .select("objektart, objekttyp, strasse, plz, stadt")
        .eq("id", link.objekt_id)
        .maybeSingle<{
          objektart: string;
          objekttyp: string | null;
          strasse: string | null;
          plz: string | null;
          stadt: string | null;
        }>()
    : { data: null };

  if (!service || !objekt || !link.objekt_id || !link.ziel_id) {
    return <LinkFehler grund="unbekannt" />;
  }

  /* DIE ZEITEN FÜR DIESE PERSON, nicht für das Objekt: Wer wegen der
     Nachweis-Pflicht nicht buchen darf, sieht keine Liste, sondern den
     Grund. Eine Zeit, die sich nicht buchen lässt, gehört nicht auf
     die Seite. Geprüft wird das an derselben Stelle wie beim Buchen
     (zugangPruefen in lib/verfuegbarkeit-server.ts). */
  const zeiten = await freieZeitenFuerPerson(link.objekt_id, link.ziel_id);

  if (!zeiten.erlaubt) {
    return (
      <main
      className="min-h-dvh bg-background px-5 py-10 sm:px-8 sm:py-16"
      /* SCHRIFT DER ANWENDUNG (Runde 37, 29.08.2026): Diese Seite
         steht unter oeffentlicher Adresse, ist aber eine Ausgabe der
         Anwendung fuer einen Interessenten und entsteht aus den Daten
         des Kunden. Erklaerung der Regel in app/globals.css. */
      data-bereich="anwendung"
    >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Wordmark />
          <Reveal>
            <div className="rounded-3xl border border-line/60 bg-paper p-6">
              <h1 className="font-heading text-[1.2rem] font-semibold text-ink">
                {zeiten.grund === "nachweis"
                  ? "Noch ein Schritt davor"
                  : "Gerade keine Terminbuchung"}
              </h1>
              <p className="mt-2 max-w-[58ch] text-[0.95rem] leading-relaxed text-ink-muted">
                {zeiten.meldung}
              </p>
              {/* KEINE SACKGASSE (Bau-Runde 5): Wer den Nachweis noch
                  hochladen muss, erfaehrt, WO das geht, und bekommt den
                  Weg dorthin, auch wenn die Mail mit dem Upload-Link
                  laengst geloescht ist. */}
              {zeiten.grund === "nachweis" ? (
                <>
                  <p className="mt-3 max-w-[58ch] text-[0.95rem] leading-relaxed text-ink-muted">
                    Hochladen können Sie den Nachweis über den persönlichen
                    Link aus der E-Mail „Bonitäts- oder Finanzierungsnachweis“.
                    Falls Sie diese E-Mail nicht mehr haben, schicken wir
                    Ihnen den Link gern neu:
                  </p>
                  <NachweisAnfordern token={token} />
                </>
              ) : null}
            </div>
          </Reveal>
        </div>
      </main>
    );
  }

  const tage = zeiten.tage.map((t) => ({
    datum: t.datum,
    zeiten: t.zeiten.map((z) => z.beginn.toISOString()),
  }));

  return (
    <main
      className="min-h-dvh bg-background px-5 py-10 sm:px-8 sm:py-16"
      /* SCHRIFT DER ANWENDUNG (Runde 37, 29.08.2026): Diese Seite
         steht unter oeffentlicher Adresse, ist aber eine Ausgabe der
         Anwendung fuer einen Interessenten und entsteht aus den Daten
         des Kunden. Erklaerung der Regel in app/globals.css. */
      data-bereich="anwendung"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Wordmark />

        <Reveal>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[1.45rem] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[1.7rem]">
              <CalendarCheck2
                size={22}
                strokeWidth={1.8}
                aria-hidden="true"
                className="mr-2 inline-block shrink-0 align-[-0.15em] text-primary"
              />
              Suchen Sie sich eine Zeit aus
            </h1>
            <p className="max-w-[58ch] text-[0.95rem] leading-relaxed text-ink-muted">
              Für die Besichtigung von{" "}
              <strong className="font-medium text-ink">
                {objektBezeichnung(objekt)}
              </strong>{" "}
              stehen die folgenden Zeiten frei. Sie wählen eine aus, mehr
              ist nicht zu tun. Die genaue Adresse steht in Ihrer
              Bestätigung.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <ZeitWaehlen
            token={token}
            tage={tage}
            dauerMinuten={zeiten.dauerMinuten}
            bestehend={
              zeiten.bestehend
                ? {
                    beginn: zeiten.bestehend.beginn,
                    verschiebbar: zeiten.bestehend.verschiebbar,
                  }
                : null
            }
          />
        </Reveal>
      </div>
    </main>
  );
}
