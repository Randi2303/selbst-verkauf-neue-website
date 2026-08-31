"use client";

import { CalendarCheck2, Check, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shadcn-utils";
import { formatMenge, formatUhrzeit } from "@/lib/utils";

export type FreierTagRoh = { datum: string; zeiten: string[] };

const TAG = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "long",
  day: "2-digit",
  month: "long",
});
const UHR = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Der Interessent sucht sich eine Zeit aus.
 *
 * KEIN KALENDER ZUM BLÄTTERN, sondern eine Liste: Tage untereinander,
 * darin die freien Zeiten als Schaltflächen. Wer einen Termin sucht,
 * will nicht navigieren, sondern etwas antippen. Auf dem Handy liegen
 * die Zeiten in einem Raster, das sich der Breite anpasst.
 *
 * NIEMAND ERFÄHRT, WER SONST KOMMT. Eine belegte Zeit ist einfach
 * nicht in der Liste; es gibt keine ausgegraute Zeit, keine Anzahl,
 * keinen Namen. Auch aus dem Quelltext dieser Seite lässt sich nichts
 * ablesen, denn was hier ankommt, sind ausschließlich FREIE Zeiten.
 *
 * WER ZU SPÄT KLICKT, bekommt eine freundliche Absage und die übrigen
 * Zeiten, keinen Fehler. Die Liste erneuert sich dabei von selbst, die
 * vergebene Zeit verschwindet.
 */
export default function ZeitWaehlen({
  token,
  tage: anfangs,
  dauerMinuten,
  bestehend,
}: {
  token: string;
  tage: FreierTagRoh[];
  dauerMinuten: number;
  /** Was diese Person an diesem Objekt schon hat (Migration 0065) */
  bestehend: { beginn: string; verschiebbar: boolean } | null;
}) {
  const [tage, setTage] = useState(anfangs);
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [fertig, setFertig] = useState<string | null>(null);
  const [gewechselt, setGewechselt] = useState(false);

  const buchen = async (beginn: string) => {
    setLaeuft(true);
    setHinweis(null);
    try {
      const antwort = await fetch(`/api/termin/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beginn }),
      });
      const daten = (await antwort.json().catch(() => null)) as {
        meldung?: string;
        grund?: string;
      } | null;

      if (antwort.ok) {
        setGewechselt(Boolean((daten as { verschoben?: boolean } | null)?.verschoben));
        setFertig(beginn);
        return;
      }

      setHinweis(daten?.meldung ?? "Das hat leider nicht geklappt.");
      setGewaehlt(null);
      /* BEI EINER VERALTETEN LISTE DIE ZEITEN ERNEUERN, damit die
         Absage nicht ins Leere zeigt: Wer gerade zu spaet kam, soll
         im selben Moment sehen, was noch da ist. Das gilt fuer die
         vergebene Zeit UND fuer die Gruende aus Bau-Runde 5, bei
         denen die Anzeige nicht mehr stimmt (vorbei, nicht mehr im
         Angebot). */
      if (daten?.grund === "belegt" || daten?.grund === "vorbei" || daten?.grund === "gesperrt") {
        const frisch = await fetch(`/api/termin/${token}/frei`).then((a) =>
          a.ok ? a.json() : null
        );
        if (frisch?.tage) setTage(frisch.tage as FreierTagRoh[]);
      }
    } catch {
      setHinweis("Die Verbindung war unterbrochen. Bitte versuchen Sie es noch einmal.");
    } finally {
      setLaeuft(false);
    }
  };

  if (fertig) {
    return (
      <div className="rounded-3xl border border-line/60 bg-paper p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <Check size={24} strokeWidth={2} />
        </span>
        <h2 className="mt-4 font-heading text-[1.2rem] font-semibold text-ink">
          {gewechselt ? "Ihr Termin ist verschoben" : "Ihr Termin steht"}
        </h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">
          {TAG.format(new Date(fertig))}, {formatUhrzeit(fertig)}.
          Die Bestätigung mit allen Angaben ist unterwegs zu Ihnen, mit
          einem Eintrag für Ihren Kalender.
        </p>
      </div>
    );
  }

  if (tage.length === 0) {
    return (
      <div className="rounded-3xl border border-line/60 bg-paper p-6">
        <p className="text-[0.95rem] leading-relaxed text-ink-muted">
          Derzeit sind keine Zeiten frei. Antworten Sie gern kurz auf die
          E-Mail, dann findet sich einer.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hinweis ? (
        <p
          role="status"
          className="rounded-2xl border border-accent-deep/30 bg-accent/10 px-4 py-3 text-[0.9rem] leading-relaxed text-ink"
        >
          {hinweis}
        </p>
      ) : null}

      {/* WAS SIE SCHON HABEN, ueber der Liste und nicht darunter:
          Der Link ist mehrfach nutzbar, und wer ihn ein zweites Mal
          oeffnet, soll nicht versehentlich zwei Termine bekommen. Ein
          Riegel waere hier falsch, wer wechseln will, muss wechseln
          koennen. */}
      {bestehend ? (
        <div className="rounded-2xl border border-primary/25 bg-surface-tint px-4 py-3">
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-[0.9rem] leading-relaxed text-ink">
            <CalendarCheck2
              size={15}
              strokeWidth={1.9}
              aria-hidden="true"
              className="translate-y-0.5 shrink-0 text-primary"
            />
            <span>
              Sie haben bereits einen Termin am{" "}
              <strong className="font-medium">
                {TAG.format(new Date(bestehend.beginn))} um{" "}
                {formatUhrzeit(bestehend.beginn)}
              </strong>
              .
            </span>
          </p>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-muted">
            {bestehend.verschiebbar
              ? "Wenn Sie unten eine andere Zeit wählen, verschieben wir diesen Termin. Zwei Termine bekommen Sie nicht."
              : "Diesen Termin hat die Verkäuferin oder der Verkäufer mit Ihnen vereinbart, deshalb lässt er sich hier nicht verschieben. Antworten Sie dazu bitte auf die E-Mail mit der Einladung."}
          </p>
        </div>
      ) : null}

      <p className="flex flex-wrap items-baseline gap-x-1.5 text-[0.88rem] leading-relaxed text-ink-muted">
        <Clock
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
          className="translate-y-0.5 shrink-0 text-primary"
        />
        <span>
          Ein Termin dauert etwa {formatMenge(dauerMinuten, "Minuten")}. Sie bekommen sofort
          eine Bestätigung.
        </span>
      </p>

      {tage.map((tag) => (
        <section
          key={tag.datum}
          className="rounded-3xl border border-line/60 bg-paper p-4 sm:p-5"
        >
          <h2 className="text-[0.95rem] font-semibold text-ink">
            {TAG.format(new Date(`${tag.datum}T12:00:00Z`))}
          </h2>
          {/* minmax(0,…) in der Spur: Ohne sie ist ein Rasterfeld
              mindestens so breit wie sein Inhalt, und bei 320 px
              schiebt die letzte Zeit die Seite auf. */}
          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(6.5rem,100%),1fr))] gap-2">
            {tag.zeiten.map((zeit) => (
              <Button
                key={zeit}
                type="button"
                variant={gewaehlt === zeit ? "default" : "secondary"}
                size="sm"
                disabled={laeuft}
                onClick={() => {
                  setGewaehlt(zeit);
                  void buchen(zeit);
                }}
                className={cn(
                  "tabular-nums",
                  gewaehlt === zeit && laeuft && "opacity-80"
                )}
              >
                {gewaehlt === zeit && laeuft ? (
                  "Moment"
                ) : (
                  <>
                    <CalendarCheck2 size={14} strokeWidth={1.9} />
                    {UHR.format(new Date(zeit))}
                  </>
                )}
              </Button>
            ))}
          </div>
        </section>
      ))}

      <p className="text-[0.83rem] leading-relaxed text-ink-muted">
        Mit dem Antippen einer Zeit ist der Termin verabredet. Absagen
        können Sie ihn jederzeit über den Link in Ihrer Bestätigung.
      </p>
    </div>
  );
}
