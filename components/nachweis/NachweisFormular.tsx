"use client";

import { CheckCircle2, FileUp, Loader2, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AKTUELLE_FASSUNG, einwilligung, WIDERRUF_ADRESSE } from "@/config/einwilligungen";
import { NACHWEIS_ARTEN, type NachweisArt } from "@/lib/bonitaet";
import { cn } from "@/lib/shadcn-utils";
import { ohneUmbruch } from "@/lib/utils";
import { siteConfig } from "@/site.config";

/**
 * Upload-Formular fuer den Interessenten.
 *
 * Vier Dinge sind hier bewusst so und nicht anders:
 *
 * 1) Die beiden Nachweis-Arten stehen GLEICHWERTIG nebeneinander, die
 *    Finanzierungsbestaetigung sogar zuerst. Sie ist beim Kauf die
 *    aussagekraeftigere Unterlage, weil sie sich auf einen konkreten
 *    Betrag bezieht. EINE genuegt, beide sind moeglich.
 * 2) Was schon hochgeladen wurde, steht sichtbar da und laesst sich
 *    ersetzen. Wer versehentlich das Falsche geschickt hat, soll das
 *    ohne Nachfrage korrigieren koennen.
 * 3) Die beiden Einwilligungen sind GETRENNT, und ihr Wortlaut kommt
 *    aus config/einwilligungen.ts. Beim Absenden geht die Fassungs-
 *    nummer mit, damit spaeter belegbar ist, WAS jemand gesehen hat.
 *    Ein Bundeln der beiden waere unzulaessig.
 * 4) Der Knopf bleibt anklickbar und sagt beim Klick, was fehlt.
 *    Ein ausgegrauter Knopf ohne Begruendung ist die schlechtere
 *    Rueckmeldung.
 */

const MAX_MB = 10;

export type VorhandenerNachweis = {
  art: NachweisArt;
  hochgeladen_am: string;
};

function datum(iso: string): string {
  return ohneUmbruch(
    new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  );
}

export default function NachweisFormular({
  token,
  empfaengerName,
  vorhanden,
}: {
  token: string;
  empfaengerName: string | null;
  /** Was zu dieser Anfrage bereits vorliegt, je Art hoechstens eines */
  vorhanden: VorhandenerNachweis[];
}) {
  const [art, setArt] = useState<NachweisArt | null>(null);
  const [datei, setDatei] = useState<File | null>(null);
  const [verarbeitung, setVerarbeitung] = useState(false);
  const [auskunftei, setAuskunftei] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gesendet, setGesendet] = useState<NachweisArt[]>([]);
  /** Ausgang der Bestaetigungs-Mails: true angenommen, false gescheitert, null keine Aussage */
  const [mailStand, setMailStand] = useState<boolean | null>(null);
  const dateiFeld = useRef<HTMLInputElement>(null);

  const liegtVor = (a: NachweisArt) =>
    gesendet.includes(a) || vorhanden.some((v) => v.art === a);

  const senden = async () => {
    setFehler(null);
    if (!art) return setFehler("Bitte wählen Sie aus, welche Unterlage Sie hochladen.");
    if (!datei) return setFehler("Bitte wählen Sie die Datei aus.");
    if (datei.size > MAX_MB * 1024 * 1024) {
      return setFehler(
        `Die Datei ist größer als ${MAX_MB} MB. Bitte laden Sie eine kleinere Fassung hoch.`
      );
    }
    if (!verarbeitung) {
      return setFehler(
        "Ohne Ihre Einwilligung in die Verarbeitung dürfen wir die Unterlage nicht annehmen."
      );
    }

    setLaeuft(true);
    try {
      const daten = new FormData();
      daten.append("datei", datei);
      daten.append("art", art);
      daten.append("einwilligung_verarbeitung", String(verarbeitung));
      daten.append("einwilligung_auskunftei", String(auskunftei));
      // Der Server holt sich den Wortlaut zu dieser Fassung selbst
      daten.append("einwilligung_fassung", AKTUELLE_FASSUNG);
      const antwort = await fetch(`/api/nachweis/${token}`, { method: "POST", body: daten });
      const ergebnis = (await antwort.json().catch(() => null)) as {
        meldung?: string;
        bestaetigungVerschickt?: boolean | null;
      } | null;
      if (!antwort.ok) {
        setFehler(
          ergebnis?.meldung ?? "Der Upload hat nicht geklappt. Bitte versuchen Sie es erneut."
        );
        return;
      }
      /* Der schwaechste Ausgang gewinnt: Sobald EINE Bestaetigung
         wirklich scheiterte, sagt die Erfolgsansicht das; ohne
         Aussage (gewollter Vermerk) behauptet sie schlicht nichts. */
      setMailStand((alt) => {
        const jetzt = ergebnis?.bestaetigungVerschickt ?? null;
        if (alt === false || jetzt === false) return false;
        if (jetzt === true) return true;
        return alt;
      });
      setGesendet((alt) => (alt.includes(art) ? alt : [...alt, art]));
      setDatei(null);
      setArt(null);
      if (dateiFeld.current) dateiFeld.current.value = "";
    } catch {
      setFehler(
        "Keine Verbindung. Bitte prüfen Sie Ihre Internet-Verbindung und versuchen Sie es erneut."
      );
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {gesendet.length > 0 ? (
        <div className="rounded-3xl border border-primary/30 bg-surface-tint p-6 sm:p-7">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-paper text-primary">
            <CheckCircle2 size={21} strokeWidth={1.7} />
          </span>
          <h2 className="mt-4 font-heading text-[1.3rem] font-semibold tracking-[-0.015em] text-ink">
            {gesendet.length === 1
              ? "Vielen Dank, Ihre Unterlage ist angekommen."
              : "Vielen Dank, beide Unterlagen sind angekommen."}
          </h2>
          {/* Nur gemessener Versand wird behauptet (24.08.2026): Der
              Bestaetigungs-Satz stand hier fest, egal was geschah. */}
          <p className="mt-2.5 text-pretty leading-relaxed text-ink-muted">
            Der Eigentümer sieht sie sich an und meldet sich bei Ihnen.
            {mailStand === true
              ? " Eine Bestätigung haben wir Ihnen zusätzlich per E-Mail geschickt."
              : mailStand === false
                ? " Die Bestätigungs-Mail ließ sich gerade nicht zustellen; diese Anzeige ist Ihr Beleg, die Unterlage ist angekommen."
                : ""}
          </p>
          <p className="mt-3 text-[0.88rem] leading-relaxed text-ink-muted">
            Ihre Unterlagen werden ausschließlich für diesen Verkauf verwendet
            und spätestens nach 90 Tagen automatisch gelöscht. Wenn Sie sie
            vorher entfernt haben möchten, schreiben Sie an{" "}
            <a
              href={`mailto:${siteConfig.mailAbsender.antwort}`}
              className="text-primary underline underline-offset-2"
            >
              {siteConfig.mailAbsender.antwort}
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-6 rounded-3xl border border-line bg-paper p-6 sm:p-8">
        {empfaengerName && gesendet.length === 0 ? (
          <p className="text-[0.95rem] text-ink">Guten Tag {empfaengerName},</p>
        ) : null}

        {/* 1) Art der Unterlage */}
        <fieldset className="flex flex-col gap-3">
          <legend className="text-[0.95rem] font-semibold text-ink">
            {gesendet.length > 0 ? "Noch etwas hochladen?" : "Welche Unterlage laden Sie hoch?"}
          </legend>
          <p className="text-[0.88rem] leading-relaxed text-ink-muted">
            Eine der beiden genügt. Wenn Sie beide haben, können Sie beide
            hochladen, das ist aber freiwillig.
          </p>
          {NACHWEIS_ARTEN.map((a) => {
            const schonDa = liegtVor(a.id);
            const bestand = vorhanden.find((v) => v.art === a.id);
            return (
              <label
                key={a.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors",
                  art === a.id
                    ? "border-primary bg-surface-tint/60"
                    : "border-line/70 hover:border-primary/40"
                )}
              >
                <input
                  type="radio"
                  name="art"
                  value={a.id}
                  checked={art === a.id}
                  onChange={() => setArt(a.id)}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.95rem] font-medium text-ink">{a.label}</span>
                    {schonDa ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-tint px-2 py-0.5 text-[0.75rem] font-medium text-primary">
                        <CheckCircle2 size={12} strokeWidth={2} />
                        liegt vor
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[0.85rem] leading-relaxed text-ink-muted">
                    {schonDa
                      ? bestand
                        ? `Eingegangen am ${datum(bestand.hochgeladen_am)}. Sie können die Datei hier ersetzen.`
                        : "Gerade hochgeladen. Sie können die Datei hier ersetzen."
                      : a.hinweis}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {/* 2) Datei */}
        <div className="flex flex-col gap-2">
          <label htmlFor="nachweis-datei" className="text-[0.95rem] font-semibold text-ink">
            Ihre Datei
          </label>
          <input
            ref={dateiFeld}
            id="nachweis-datei"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setDatei(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => dateiFeld.current?.click()}
            >
              <FileUp size={15} strokeWidth={1.8} />
              {datei ? "Andere Datei wählen" : "Datei auswählen"}
            </Button>
            <p className="min-w-0 flex-1 truncate text-[0.88rem] text-ink-muted">
              {datei ? datei.name : `PDF, JPG oder PNG, höchstens ${MAX_MB} MB`}
            </p>
          </div>
        </div>

        {/* 3) Zwei getrennte Einwilligungen, Wortlaut aus der Fassung */}
        <div className="flex flex-col gap-3 rounded-2xl bg-background p-4">
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={verarbeitung}
              onChange={(e) => setVerarbeitung(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="text-[0.85rem] leading-relaxed text-ink">
              {einwilligung("verarbeitung").wortlaut}{" "}
              <a
                href="/datenschutz"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Datenschutzhinweise
              </a>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 border-t border-line/60 pt-3">
            <input
              type="checkbox"
              checked={auskunftei}
              onChange={(e) => setAuskunftei(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="text-[0.85rem] leading-relaxed text-ink-muted">
              {einwilligung("auskunftei").wortlaut}
            </span>
          </label>
          <p className="text-[0.75rem] leading-relaxed text-ink-muted">
            Fassung {AKTUELLE_FASSUNG}. Widerruf jederzeit an{" "}
            <a
              href={`mailto:${WIDERRUF_ADRESSE}`}
              className="underline underline-offset-2"
            >
              {WIDERRUF_ADRESSE}
            </a>
            .
          </p>
        </div>

        {fehler ? (
          <p
            role="alert"
            className="rounded-xl bg-accent/10 px-4 py-3 text-[0.88rem] leading-relaxed text-accent-deep"
          >
            {fehler}
          </p>
        ) : null}

        <div>
          <Button type="button" onClick={senden} disabled={laeuft}>
            {laeuft ? (
              <Loader2 size={15} strokeWidth={2} className="animate-spin" />
            ) : art && liegtVor(art) ? (
              <RefreshCw size={15} strokeWidth={1.8} />
            ) : (
              <FileUp size={15} strokeWidth={1.8} />
            )}
            {laeuft
              ? "Wird hochgeladen"
              : art && liegtVor(art)
                ? "Datei ersetzen"
                : "Nachweis senden"}
          </Button>
        </div>
      </div>
    </div>
  );
}
