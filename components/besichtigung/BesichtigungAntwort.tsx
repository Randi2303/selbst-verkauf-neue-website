"use client";

import { CalendarX2, Check, Download, MapPin, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type Vorschlag = {
  id: string;
  zeit: string;
  ort: string;
  terminStatus: string;
  einladungStatus: string;
  sammel: boolean;
  /** Terminart (Migration 0042); steuert die Saetze je Vorschlag */
  art: "einzeltermin" | "zeitfenster" | "gruppentermin";
  freiePlaetze: number;
  annahmeMoeglich: boolean;
  grundDagegen: "abgesagt" | "vorbei" | "voll" | null;
};

/**
 * Zusagen und Absagen für den Interessenten.
 *
 * DIE SEITE DRÄNGT NICHT. Kein Countdown, kein "nur noch ein Platz",
 * keine Anzahl anderer Interessenten. Bei einer Sammelbesichtigung
 * steht, wie viele Plätze frei sind, weil das eine echte Auskunft ist
 * und keine Druckmittel.
 *
 * Eine Absage braucht keine Begründung. Das Feld ist da, weil viele
 * Menschen von sich aus etwas dazuschreiben wollen, aber es ist nie
 * Pflicht.
 */
export default function BesichtigungAntwort({
  token,
  vorschlaege,
}: {
  token: string;
  vorschlaege: Vorschlag[];
}) {
  const router = useRouter();
  const [laeuft, starte] = useTransition();
  const [absageFuer, setAbsageFuer] = useState<string | null>(null);
  const [rueckmeldung, setRueckmeldung] = useState("");
  // Rückmeldung im Text und nicht als eingeblendete Meldung: Diese Seite
  // hat keine Hülle mit Toaster, und eine Meldung, die von selbst wieder
  // verschwindet, ist bei einer verbindlichen Antwort ohnehin falsch.
  const [fehler, setFehler] = useState<string | null>(null);

  const antworten = (
    besichtigungId: string,
    antwort: "zusagen" | "absagen",
    text: string | null
  ) =>
    starte(async () => {
      setFehler(null);
      const res = await fetch(`/api/besichtigung/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          besichtigung_id: besichtigungId,
          antwort,
          rueckmeldung: text,
        }),
      });
      const daten = (await res.json().catch(() => null)) as {
        meldung?: string;
      } | null;
      if (!res.ok) {
        setFehler(daten?.meldung ?? "Das hat gerade nicht geklappt.");
        router.refresh();
        return;
      }
      setAbsageFuer(null);
      setRueckmeldung("");
      // Der neue Stand kommt vom Server. Ein selbst gesetzter Zustand
      // würde hier auseinanderlaufen, sobald zwei Menschen gleichzeitig
      // auf denselben Platz zusagen.
      router.refresh();
    });

  const offene = vorschlaege.filter(
    (v) => v.einladungStatus === "offen" && v.annahmeMoeglich
  );
  const zugesagt = vorschlaege.filter((v) => v.einladungStatus === "zugesagt");
  const erledigt = vorschlaege.filter(
    (v) =>
      !["offen", "zugesagt"].includes(v.einladungStatus) ||
      (v.einladungStatus === "offen" && !v.annahmeMoeglich)
  );

  return (
    <div className="flex flex-col gap-6">
      {fehler ? (
        <p
          role="alert"
          className="rounded-2xl bg-accent/10 px-4 py-3 text-[0.88rem] leading-relaxed text-accent-deep"
        >
          {fehler}
        </p>
      ) : null}

      {zugesagt.map((v) => (
        <section
          key={v.id}
          className="rounded-3xl border border-line bg-paper p-6 sm:p-7"
        >
          <h2 className="font-heading text-[1.2rem] font-semibold tracking-[-0.01em] text-ink">
            Sie haben zugesagt
          </h2>
          <p className="mt-2 text-[0.95rem] text-ink">{v.zeit}</p>
          <p className="mt-1 flex items-center gap-2 text-[0.9rem] text-ink-muted">
            <MapPin size={15} strokeWidth={1.8} className="text-primary" />
            {v.ort}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="subtle" size="sm">
              <a href={`/api/besichtigung/${token}/kalender?termin=${v.id}`}>
                <Download size={15} strokeWidth={1.9} />
                In meinen Kalender eintragen
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={laeuft}
              onClick={() => setAbsageFuer(absageFuer === v.id ? null : v.id)}
            >
              <CalendarX2 size={15} strokeWidth={1.9} />
              Doch absagen
            </Button>
          </div>
          {absageFuer === v.id ? (
            <AbsageFeld
              id={v.id}
              wert={rueckmeldung}
              setzeWert={setRueckmeldung}
              laeuft={laeuft}
              absenden={() => antworten(v.id, "absagen", rueckmeldung.trim() || null)}
              abbrechen={() => setAbsageFuer(null)}
            />
          ) : null}
        </section>
      ))}

      {offene.length > 0 ? (
        <section className="rounded-3xl border border-line bg-paper p-6 sm:p-7">
          <h2 className="font-heading text-[1.2rem] font-semibold tracking-[-0.01em] text-ink">
            {offene.length > 1 ? "Welcher Termin passt Ihnen?" : "Passt Ihnen der Termin?"}
          </h2>
          {offene.length > 1 ? (
            <p className="mt-2 max-w-[62ch] text-[0.9rem] leading-relaxed text-ink-muted">
              Wählen Sie einen aus. Die übrigen Vorschläge werden damit
              automatisch hinfällig, Sie müssen dafür nichts weiter tun.
            </p>
          ) : null}

          <ul className="mt-5 flex flex-col gap-3">
            {offene.map((v) => (
              <li
                key={v.id}
                className="rounded-2xl border border-line/70 bg-background px-4 py-4"
              >
                <p className="text-[0.95rem] font-medium text-ink">{v.zeit}</p>
                <p className="mt-1 flex items-center gap-2 text-[0.88rem] text-ink-muted">
                  <MapPin size={15} strokeWidth={1.8} className="text-primary" />
                  {v.ort}
                </p>
                {v.art === "gruppentermin" ? (
                  <p className="mt-1 flex items-center gap-2 text-[0.85rem] text-ink-muted">
                    <Users size={15} strokeWidth={1.8} className="text-primary" />
                    Gemeinsame Besichtigung mit mehreren Interessenten,{" "}
                    {v.freiePlaetze} {v.freiePlaetze === 1 ? "Platz" : "Plätze"} frei
                  </p>
                ) : null}
                {v.art === "zeitfenster" ? (
                  <p className="mt-1 text-[0.85rem] text-ink-muted">
                    Ihr eigenes Zeitfenster, die Zeit gehört Ihnen allein.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={laeuft}
                    onClick={() => antworten(v.id, "zusagen", null)}
                  >
                    <Check size={15} strokeWidth={2} />
                    Diesen Termin bestätigen
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={laeuft}
                    onClick={() => setAbsageFuer(absageFuer === v.id ? null : v.id)}
                  >
                    Passt nicht
                  </Button>
                </div>
                {absageFuer === v.id ? (
                  <AbsageFeld
                    id={v.id}
                    wert={rueckmeldung}
                    setzeWert={setRueckmeldung}
                    laeuft={laeuft}
                    absenden={() =>
                      antworten(v.id, "absagen", rueckmeldung.trim() || null)
                    }
                    abbrechen={() => setAbsageFuer(null)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : zugesagt.length === 0 ? (
        <section className="rounded-3xl border border-line bg-paper p-6 sm:p-7">
          <h2 className="font-heading text-[1.2rem] font-semibold tracking-[-0.01em] text-ink">
            Hier steht gerade kein offener Vorschlag
          </h2>
          <p className="mt-2 max-w-[62ch] text-[0.9rem] leading-relaxed text-ink-muted">
            Entweder haben Sie bereits geantwortet, oder der Eigentümer hat den
            Termin zurückgezogen. Sobald es einen neuen Vorschlag gibt,
            bekommen Sie eine E-Mail. Dieser Link bleibt gültig.
          </p>
        </section>
      ) : null}

      {erledigt.length > 0 ? (
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-1.5 text-[0.85rem] text-ink transition-colors hover:border-primary/40 hover:text-primary">
            Frühere Vorschläge ({erledigt.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {erledigt.map((v) => (
              <li
                key={v.id}
                className="rounded-2xl border border-line/60 bg-background px-4 py-3 text-[0.88rem]"
              >
                <span className="text-ink">{v.zeit}</span>
                <span className="ml-2 text-ink-muted">
                  {v.einladungStatus === "abgesagt"
                    ? "von Ihnen abgesagt"
                    : v.einladungStatus === "belegt"
                      ? "die Plätze waren vergeben"
                      : v.grundDagegen === "abgesagt"
                        ? "vom Eigentümer abgesagt"
                        : v.grundDagegen === "vorbei"
                          ? "liegt in der Vergangenheit"
                          : v.grundDagegen === "voll"
                            ? "alle Plätze vergeben"
                            : "hinfällig"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/** Das freiwillige Feld für eine kurze Rückmeldung bei einer Absage */
function AbsageFeld({
  id,
  wert,
  setzeWert,
  laeuft,
  absenden,
  abbrechen,
}: {
  id: string;
  wert: string;
  setzeWert: (w: string) => void;
  laeuft: boolean;
  absenden: () => void;
  abbrechen: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-surface px-4 py-3.5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`absage-${id}`}>
          Möchten Sie etwas dazuschreiben? Freiwillig.
        </Label>
        <Textarea
          id={`absage-${id}`}
          value={wert}
          onChange={(e) => setzeWert(e.target.value)}
          placeholder="Zum Beispiel: An dem Tag bin ich unterwegs, ab nächster Woche gern."
          rows={3}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" disabled={laeuft} onClick={absenden}>
          Absage senden
        </Button>
        <Button variant="ghost" size="sm" onClick={abbrechen}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
