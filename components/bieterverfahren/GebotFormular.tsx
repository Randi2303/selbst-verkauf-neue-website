"use client";

import { m, useReducedMotion } from "framer-motion";
import { CheckCircle2, FileWarning, Loader2, Send, Undo2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FINANZIERUNGSARTEN, PFLICHT_BESTAETIGUNGEN } from "@/config/bieterverfahren";
import { euro } from "@/lib/bieterverfahren";
import { cn } from "@/lib/shadcn-utils";
import { siteConfig } from "@/site.config";

/**
 * Das Gebotsformular.
 *
 * Drei Dinge sind hier bewusst so:
 *
 * 1) Ohne Nachweis kein Formular. Das wird VORHER freundlich erklärt,
 *    nicht erst beim Absenden. Wer erst nach dem Ausfüllen erfährt,
 *    dass etwas fehlt, ärgert sich zu Recht.
 * 2) Alle drei Bestätigungen sind einzeln und keine ist vorbelegt.
 *    Die mittlere ist die wichtigste: dass ein Gebot noch kein
 *    Kaufvertrag ist.
 * 3) Zurückziehen steht gleichberechtigt da, nicht versteckt. Wer
 *    weiß, dass er jederzeit zurück kann, bietet ehrlicher.
 */
export default function GebotFormular({
  token,
  offen,
  nochNicht = false,
  startpreis,
  eigenes,
  hatNachweis,
  nachweisHinweis,
  empfaengerName,
  empfaengerEmail,
}: {
  token: string;
  offen: boolean;
  /** Verfahren im Stand vorbereitet: noch nicht begonnen (Bau-Runde 8) */
  nochNicht?: boolean;
  startpreis: number;
  eigenes: {
    betrag: number;
    name: string;
    email: string;
    telefon: string | null;
    finanzierungsart: string | null;
  } | null;
  hatNachweis: boolean;
  nachweisHinweis: string;
  empfaengerName: string | null;
  empfaengerEmail: string | null;
}) {
  const [betrag, setBetrag] = useState(eigenes ? String(Math.round(eigenes.betrag)) : "");
  const [name, setName] = useState(eigenes?.name ?? empfaengerName ?? "");
  const [email, setEmail] = useState(eigenes?.email ?? empfaengerEmail ?? "");
  const [telefon, setTelefon] = useState(eigenes?.telefon ?? "");
  const [finanzierung, setFinanzierung] = useState(eigenes?.finanzierungsart ?? "");
  const [haken, setHaken] = useState<Record<string, boolean>>({});
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState<{
    betrag: number;
    erhoeht: boolean;
    /** true: Mail angenommen; false: echter Fehlschlag; null: keine Aussage */
    bestaetigungVerschickt: boolean | null;
  } | null>(null);
  const ruhig = useReducedMotion();
  const [zurueckgezogen, setZurueckgezogen] = useState(false);

  const betragZahl = Number(betrag.replace(/\./g, "").replace(",", "."));

  if (!offen) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
        {/* Zwei Zustaende, zwei Saetze (Bau-Runde 8): Vor dem Start
            gibt es keine beendete Frist. */}
        <h2 className="font-heading text-[1.3rem] font-semibold tracking-[-0.015em] text-ink">
          {nochNicht ? "Das Verfahren hat noch nicht begonnen." : "Die Frist ist beendet."}
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-ink-muted">
          {nochNicht
            ? "Sobald der Eigentümer das Verfahren startet, können Sie hier bieten. Ihr Link bleibt gültig."
            : eigenes
              ? `Ihr Gebot über ${euro(eigenes.betrag)} liegt vor. Der Eigentümer sieht sich jetzt alle Gebote an und meldet sich bei Ihnen.`
              : "Es sind keine Gebote mehr möglich. Wenn Sie weiterhin Interesse haben, schreiben Sie uns gern."}
        </p>
        <p className="mt-4 text-[0.88rem] text-ink-muted">
          <a
            href={`mailto:${siteConfig.mailAbsender.antwort}`}
            className="text-primary underline underline-offset-2"
          >
            {siteConfig.mailAbsender.antwort}
          </a>
        </p>
      </div>
    );
  }

  if (!hatNachweis) {
    return (
      <div className="rounded-3xl border border-accent/30 bg-paper p-6 sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent-deep">
          <FileWarning size={20} strokeWidth={1.7} />
        </span>
        <h2 className="mt-5 font-heading text-[1.3rem] font-semibold tracking-[-0.015em] text-ink">
          Ein Schritt fehlt noch
        </h2>
        <p className="mt-3 max-w-[60ch] text-pretty leading-relaxed text-ink-muted">
          {nachweisHinweis}
        </p>
        <p className="mt-4 max-w-[60ch] text-pretty leading-relaxed text-ink-muted">
          Sie haben dafür eine eigene E-Mail von uns bekommen. Sobald Ihr
          Nachweis da ist, können Sie hier Ihr Gebot abgeben.
        </p>
        <p className="mt-5 text-[0.88rem] text-ink-muted">
          Die Mail nicht mehr gefunden? Schreiben Sie an{" "}
          <a
            href={`mailto:${siteConfig.mailAbsender.antwort}`}
            className="text-primary underline underline-offset-2"
          >
            {siteConfig.mailAbsender.antwort}
          </a>
          .
        </p>
      </div>
    );
  }

  if (zurueckgezogen) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
        <h2 className="font-heading text-[1.3rem] font-semibold tracking-[-0.015em] text-ink">
          Ihr Gebot ist zurückgezogen.
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-ink-muted">
          Sie können jederzeit ein neues abgeben, solange die Frist läuft. Laden
          Sie die Seite dafür einfach neu.
        </p>
      </div>
    );
  }

  if (fertig) {
    const Marke = ruhig ? "span" : m.span;
    const Betrag = ruhig ? "span" : m.span;
    return (
      /* Der Moment nach dem Absenden.
         Jemand hat gerade eine sehr grosse Zahl abgeschickt und will
         schwarz auf weiss sehen, DASS und WOMIT. Deshalb steht der
         Betrag hier gross und allein, nicht als Nebensatz in einer
         Meldung. Der Haken faehrt einmal weich ein, mehr Bewegung
         waere hier fehl am Platz. */
      <div className="overflow-hidden rounded-3xl border border-primary/30 bg-surface-tint p-6 sm:p-8">
        <Marke
          {...(ruhig
            ? {}
            : {
                initial: { scale: 0.85, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] },
              })}
          className="flex size-12 items-center justify-center rounded-2xl bg-paper text-primary"
        >
          <CheckCircle2 size={23} strokeWidth={1.7} />
        </Marke>
        <p className="mt-6 text-[0.8rem] uppercase tracking-[0.08em] text-ink-muted">
          {fertig.erhoeht ? "Ihr Gebot steht jetzt bei" : "Ihr Gebot"}
        </p>
        <Betrag
          {...(ruhig
            ? {}
            : {
                initial: { y: 10, opacity: 0 },
                animate: { y: 0, opacity: 1 },
                transition: { duration: 0.45, delay: 0.12, ease: [0.22, 0.61, 0.36, 1] },
              })}
          className="mt-1.5 block font-heading text-[2.6rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink opsz-display sm:text-[3rem]"
        >
          {euro(fertig.betrag)}
        </Betrag>
        <h2 className="mt-6 font-heading text-[1.25rem] font-semibold tracking-[-0.015em] text-ink">
          {fertig.erhoeht ? "Ihr Gebot ist aktualisiert." : "Ihr Gebot ist eingegangen."}
        </h2>
        {/* DIE SEITE BEHAUPTET NUR GEMESSENEN VERSAND (24.08.2026):
            Vorher stand hier fest "Eine Bestätigung ist unterwegs",
            egal was passiert war. Bei einem gewollten Vermerk
            (Pruefbetrieb) entfaellt der Satz einfach; bei einem echten
            Fehlschlag steht ehrlich da, dass das Gebot trotzdem
            zaehlt und diese Seite der Beleg ist. */}
        <p className="mt-4 max-w-[60ch] text-pretty leading-relaxed text-ink-muted">
          {fertig.bestaetigungVerschickt === true
            ? "Eine Bestätigung ist per E-Mail unterwegs. "
            : fertig.bestaetigungVerschickt === false
              ? "Die Bestätigungs-Mail ließ sich gerade nicht zustellen; Ihr Gebot zählt trotzdem, diese Anzeige ist Ihr Beleg und Ihr Link bleibt gültig. "
              : ""}
          Nach Ablauf der Frist sieht sich der Eigentümer alle Gebote an und
          meldet sich bei Ihnen.
        </p>
        <p className="mt-4 max-w-[60ch] text-[0.88rem] leading-relaxed text-ink-muted">
          Sie können Ihr Gebot über denselben Link jederzeit erhöhen oder
          zurückziehen, solange die Frist läuft.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={() => setFertig(null)}
        >
          Gebot ändern
        </Button>
      </div>
    );
  }

  const senden = async () => {
    setFehler(null);
    if (!(betragZahl > 0)) return setFehler("Bitte geben Sie Ihr Gebot in Euro an.");
    if (name.trim().length < 3) return setFehler("Bitte geben Sie Ihren vollständigen Namen an.");
    if (!email.includes("@")) return setFehler("Bitte geben Sie eine gültige E-Mail-Adresse an.");
    if (!finanzierung) return setFehler("Bitte wählen Sie aus, wie Sie finanzieren.");
    if (!PFLICHT_BESTAETIGUNGEN.every((b) => haken[b.id])) {
      return setFehler("Bitte bestätigen Sie alle drei Punkte.");
    }

    setLaeuft(true);
    try {
      const antwort = await fetch(`/api/gebot/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betrag: betragZahl,
          name: name.trim(),
          email: email.trim(),
          telefon: telefon.trim(),
          finanzierungsart: finanzierung,
          bestaetigungen: {
            regeln: haken.regeln,
            keine_bindung: haken.keine_bindung,
            datenschutz: haken.datenschutz,
          },
        }),
      });
      const daten = (await antwort.json().catch(() => null)) as {
        meldung?: string;
        betrag?: number;
        erhoeht?: boolean;
        bestaetigungVerschickt?: boolean | null;
      } | null;
      if (!antwort.ok) {
        setFehler(daten?.meldung ?? "Ihr Gebot konnte nicht gespeichert werden.");
        return;
      }
      setFertig({
        betrag: daten?.betrag ?? betragZahl,
        erhoeht: Boolean(daten?.erhoeht),
        bestaetigungVerschickt: daten?.bestaetigungVerschickt ?? null,
      });
    } catch {
      setFehler("Keine Verbindung. Bitte prüfen Sie Ihre Internet-Verbindung.");
    } finally {
      setLaeuft(false);
    }
  };

  const zurueckziehen = async () => {
    if (laeuft) return;
    setLaeuft(true);
    try {
      const antwort = await fetch(`/api/gebot/${token}`, { method: "DELETE" });
      if (!antwort.ok) {
        /* Wie beim Abgeben weiter oben: Der Server nennt den Grund,
           etwa die abgelaufene Frist, und der gehoert in die Meldung. */
        const daten = (await antwort.json().catch(() => null)) as { meldung?: string } | null;
        setFehler(daten?.meldung ?? "Der Rückzug hat nicht geklappt.");
        return;
      }
      setZurueckgezogen(true);
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-line bg-paper p-6 sm:p-8">
      <div>
        <h2 className="font-heading text-[1.3rem] font-semibold tracking-[-0.015em] text-ink">
          {eigenes ? "Ihr Gebot ändern" : "Ihr Gebot abgeben"}
        </h2>
        {eigenes ? (
          <p className="mt-2 text-[0.9rem] text-ink-muted">
            Ihr aktuelles Gebot liegt bei {euro(eigenes.betrag)}.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gebot-betrag">Ihr Gebot in Euro</Label>
        <Input
          id="gebot-betrag"
          inputMode="numeric"
          value={betrag}
          onChange={(e) => setBetrag(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder={String(Math.round(startpreis))}
        />
        <p className="text-[0.82rem] text-ink-muted">
          {betragZahl > 0
            ? `Wird als ${euro(betragZahl)} übermittelt.`
            : `Der Startpreis liegt bei ${euro(startpreis)}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gebot-name">Ihr vollständiger Name</Label>
          <Input
            id="gebot-name"
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gebot-email">E-Mail-Adresse</Label>
          <Input
            id="gebot-email"
            type="email"
            value={email}
            autoComplete="email"
            spellCheck={false}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gebot-telefon">Telefon (freiwillig)</Label>
          <Input
            id="gebot-telefon"
            type="tel"
            value={telefon}
            autoComplete="tel"
            onChange={(e) => setTelefon(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[0.95rem] font-medium text-ink">
          Wie finanzieren Sie den Kauf?
        </legend>
        {FINANZIERUNGSARTEN.map((f) => (
          <label
            key={f.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-[0.92rem] transition-colors",
              finanzierung === f.id
                ? "border-primary bg-surface-tint/60 text-ink"
                : "border-line/70 text-ink-muted hover:border-primary/40"
            )}
          >
            <input
              type="radio"
              name="finanzierung"
              value={f.id}
              checked={finanzierung === f.id}
              onChange={() => setFinanzierung(f.id)}
              className="size-4 shrink-0 accent-primary"
            />
            {f.label}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-3 rounded-2xl bg-background p-4">
        {PFLICHT_BESTAETIGUNGEN.map((b) => (
          <label key={b.id} className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={Boolean(haken[b.id])}
              onChange={(e) => setHaken((alt) => ({ ...alt, [b.id]: e.target.checked }))}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="text-[0.86rem] leading-relaxed text-ink">{b.text}</span>
          </label>
        ))}
      </div>

      {fehler ? (
        <p
          role="alert"
          className="rounded-xl bg-accent/10 px-4 py-3 text-[0.88rem] leading-relaxed text-accent-deep"
        >
          {fehler}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={senden} disabled={laeuft}>
          {laeuft ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          ) : (
            <Send size={15} strokeWidth={1.8} />
          )}
          {eigenes ? "Gebot aktualisieren" : "Gebot abgeben"}
        </Button>
        {eigenes ? (
          <Button type="button" variant="ghost" onClick={zurueckziehen} disabled={laeuft}>
            <Undo2 size={15} strokeWidth={1.8} />
            Gebot zurückziehen
          </Button>
        ) : null}
      </div>
    </div>
  );
}
