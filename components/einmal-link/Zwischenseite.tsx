import { ArrowRight, ShieldCheck } from "lucide-react";
import Wordmark from "@/components/layout/Wordmark";

/**
 * DIE ZWISCHENSEITE, die jeder Einmal-Link zuerst zeigt.
 *
 * Warum es sie gibt, steht ausfuehrlich in lib/link-freigabe.ts. Kurz:
 * Ein Pruefdienst ruft Adressen auf, er drueckt keine Knoepfe. Der
 * Klick hier ist ein POST und trennt damit den Menschen von der
 * Maschine, ohne dass jemand ein Raetsel loesen muss.
 *
 * WAS SIE ZEIGT: den Zweck, sonst nichts. Keine Adresse, kein Betrag,
 * kein Name des Verkaeufers, kein Termin. Alles, was hier steht, stand
 * schon in der Mail; die Seite verraet also nichts, was der Empfaenger
 * nicht ohnehin wusste.
 *
 * WAS SIE NICHT SEIN DARF: eine Huerde. Ein Klick mehr ist vertretbar,
 * wenn er begruendet ist und der Knopf sagt, wohin er fuehrt. Deshalb
 * ein Satz zum Zweck, ein Satz zum Warum, ein Knopf. Keine Abfrage,
 * keine Einwilligung, kein zweiter Schritt.
 */
export default function Zwischenseite({
  titel,
  text,
  knopf,
  ziel,
  felder,
}: {
  /** Was der Empfaenger vorhat, als Aussage: "Sie moechten ..." */
  titel: string;
  /** Ein bis zwei Saetze, was nach dem Klick passiert */
  text: string;
  /** Beschriftung des Knopfes. Nennt das Ziel, nie "Weiter". */
  knopf: string;
  /** Die Adresse, an die das Formular sendet */
  ziel: string;
  /** Verborgene Felder, die mitgehen (Token, Zweck) */
  felder: Record<string, string>;
}) {
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-5 py-14 sm:px-8"
      /* SCHRIFT DER ANWENDUNG (Runde 37, 29.08.2026), siehe
         components/nachweis/LinkFehler.tsx.

         DAS ZIEHT ZWEI WEITERE SEITEN MIT, und das ist Absicht: Diese
         Zwischenseite steht auch vor /auth/bestaetigen und
         /auth/email-wechsel/[token]. Beide verwalten ein Konto,
         gehören also zur Anwendung, und eine Zwischenseite, die je
         nach Anlass anders aussieht, wäre der Fehler, den diese Runde
         vermeiden soll. */
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

      <div className="rounded-3xl border border-line bg-paper p-7 sm:p-9">
        <h1 className="text-balance font-heading text-[1.5rem] font-semibold tracking-[-0.015em] text-ink">
          {titel}
        </h1>
        <p className="mt-3 text-pretty leading-relaxed text-ink-muted">{text}</p>

        {/* POST und nicht Link: Genau darin liegt der Schutz. */}
        <form method="post" action={ziel} className="mt-7">
          {Object.entries(felder).map(([name, wert]) => (
            <input key={name} type="hidden" name={name} value={wert} />
          ))}
          <button
            type="submit"
            className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            {knopf}
            <ArrowRight size={16} strokeWidth={1.9} />
          </button>
        </form>

        <p className="mt-5 text-[0.85rem] leading-relaxed text-ink-muted">
          Dieser Zwischenschritt schützt Ihren Link. Manche Mail-Programme
          öffnen Links beim Prüfen automatisch im Hintergrund; ein Klick
          von Ihnen sorgt dafür, dass Ihr Link bis dahin unberührt bleibt.
        </p>
      </div>
    </main>
  );
}
