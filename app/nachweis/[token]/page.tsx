import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import NachweisFormular, {
  type VorhandenerNachweis,
} from "@/components/nachweis/NachweisFormular";
import LinkFehler from "@/components/nachweis/LinkFehler";
import Wordmark from "@/components/layout/Wordmark";
import Zwischenseite from "@/components/einmal-link/Zwischenseite";
import { linkPruefen } from "@/lib/einmal-link";
import { istFreigegeben } from "@/lib/link-freigabe";
import { OBJEKTART_DATIV, OBJEKTART_LABELS, type Objektart } from "@/lib/objekt-felder";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Die Seite, auf der ein Kaufinteressent seinen Nachweis hochlaedt.
 *
 * Sie ist OEFFENTLICH und braucht kein Konto. Der Zugang ist allein
 * das Token in der Adresse, das genau diesen einen Upload freigibt und
 * sonst nichts. Deshalb steht hier auch nichts, was den Interessenten
 * nicht angeht: kein Name des Verkaeufers, keine genaue Adresse, keine
 * anderen Anfragen.
 *
 * Kein Kopf- und Fussmenue der Website: Die Seite hat genau eine
 * Aufgabe, jeder zusaetzliche Weg lenkt nur ab.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nachweis hochladen",
  // Diese Seite gehoert niemals in einen Suchindex
  robots: { index: false, follow: false },
};

export default async function NachweisSeite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "bonitaetsnachweis");

  if (!pruefung.gueltig) {
    return <LinkFehler grund={pruefung.grund} />;
  }

  /* ZWISCHENSEITE VOR DEM INHALT. Erst der Klick eines Menschen gibt
     die Seite frei, ein Pruefdienst im Hintergrund bekommt nur den
     Zweck zu sehen. Siehe lib/link-freigabe.ts.

     Die Pruefung des Links steht BEWUSST davor: Ein toter Link bekommt
     sofort die Fehleransicht mit dem Weg zu einem neuen. Ein Knopf,
     der ins Leere fuehrt, waere die schlechtere Antwort. */
  if (!(await istFreigegeben(token))) {
    return (
      <Zwischenseite
        titel="Sie möchten Ihren Nachweis hochladen."
        text="Über diesen Link laden Sie Ihre SCHUFA-Auskunft oder Ihre Finanzierungsbestätigung hoch. Ein Klick, dann sind Sie auf der Upload-Seite."
        knopf="Zum Nachweis"
        ziel="/api/link-oeffnen"
        felder={{ zweck: "bonitaetsnachweis", token }}
      />
    );
  }

  const link = pruefung.link;
  const service = supabaseService();

  // Objekt nur so weit, wie der Interessent es ohnehin aus dem Inserat
  // kennt: Art und Ort. Die Hausnummer bleibt draussen. Die Wahl des
  // Verkaeufers steuert, ob die Seite von einer Bitte oder von einer
  // Bedingung spricht.
  const { data: objekt } = link.objekt_id
    ? await (service
        ?.from("objekte")
        .select("objektart, stadt, plz, nachweis_vor_besichtigung")
        .eq("id", link.objekt_id)
        .maybeSingle() ?? Promise.resolve({ data: null }))
    : { data: null };

  // Objektart ueber das Verzeichnis, sonst stuende hier die
  // kleingeschriebene Datenbank-Kennung ("haus in Papenburg"). Der
  // Dativ mit Artikel kommt ebenfalls von dort, damit nicht irgendwo
  // "an der Haus" entsteht.
  const o = objekt as {
    objektart?: Objektart | null;
    stadt?: string | null;
    nachweis_vor_besichtigung?: boolean;
  } | null;
  const pflicht = o?.nachweis_vor_besichtigung ?? false;
  const mitArtikel =
    [o?.objektart ? OBJEKTART_DATIV[o.objektart] : null, o?.stadt]
      .filter(Boolean)
      .join(" in ") || "Ihrer Immobilie";
  const bezeichnung =
    [o?.objektart ? OBJEKTART_LABELS[o.objektart] : null, o?.stadt]
      .filter(Boolean)
      .join(" in ") || "die Immobilie";

  // Was liegt schon vor? Je Art hoechstens eines, beides ist moeglich.
  const { data: vorhandene } = link.anfrage_id
    ? await (service
        ?.from("bonitaetsnachweise")
        .select("art, hochgeladen_am")
        .eq("anfrage_id", link.anfrage_id)
        .order("hochgeladen_am", { ascending: false }) ??
      Promise.resolve({ data: null }))
    : { data: null };

  const bereitsDa = ((vorhandene ?? []) as VorhandenerNachweis[]).filter(
    (v) => v.art === "schufa" || v.art === "finanzierungsbestaetigung"
  );

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-7 px-5 py-10 sm:px-8 sm:py-14"
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

      <div>
        <h1 className="text-balance font-heading text-h2 opsz-display text-ink">
          Ihr Interesse an {mitArtikel}
        </h1>
        <p className="mt-2.5 max-w-[58ch] text-pretty text-[1.05rem] leading-relaxed text-ink-muted">
          Ein kurzer Nachweis zur Finanzierung, dann kann es weitergehen.
        </p>
        {/* ZWEI FASSUNGEN, gesteuert von der Wahl des Verkaeufers am
            Objekt. Der alte Einheitstext behauptete pauschal, vor jeder
            Besichtigung werde der Nachweis erbeten; im Regelfall war das
            eine falsche Aussage gegenueber dem Interessenten. */}
        {pflicht ? (
          <>
            <p className="mt-5 max-w-[58ch] text-pretty leading-relaxed text-ink-muted">
              Vielen Dank, dass Sie sich {bezeichnung} ansehen möchten. Für
              dieses Objekt vergibt der Eigentümer Besichtigungstermine erst,
              wenn dieser eine Nachweis vorliegt. Er ist in wenigen Minuten
              erledigt.
            </p>
            <p className="mt-3 max-w-[58ch] text-pretty leading-relaxed text-ink-muted">
              Das ist keine Bewertung Ihrer Person. Es sorgt dafür, dass
              Besichtigungstermine an Menschen gehen, die das Objekt auch
              wirklich kaufen können, und es schützt Sie davor, gegen
              unrealistische Mitbewerber anzutreten.
            </p>
          </>
        ) : (
          <>
            <p className="mt-5 max-w-[58ch] text-pretty leading-relaxed text-ink-muted">
              Vielen Dank, dass Sie sich {bezeichnung} ansehen möchten. Der
              Eigentümer bittet Sie um diesen einen Nachweis. Das ist eine
              Bitte und keine Bedingung: Eine Besichtigung ist auch ohne ihn
              möglich. Er ist in wenigen Minuten erledigt.
            </p>
            <p className="mt-3 max-w-[58ch] text-pretty leading-relaxed text-ink-muted">
              Das ist keine Bewertung Ihrer Person. Der Nachweis hilft dem
              Eigentümer, Ihre Anfrage einzuordnen, und es entsteht Ihnen kein
              Nachteil, wenn Sie ihn erst später nachreichen.
            </p>
          </>
        )}
      </div>

      <NachweisFormular
        token={token}
        empfaengerName={link.empfaenger_name}
        vorhanden={bereitsDa}
      />
    </main>
  );
}
