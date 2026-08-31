"use client";

import { m, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { verbleibend } from "@/lib/bieterverfahren";
import { cn } from "@/lib/shadcn-utils";

/**
 * Der Countdown bis zum Ende der Frist.
 *
 * Bewusst RUHIG: Er zeigt Tage, Stunden und Minuten, die Sekunden nur
 * in der letzten Stunde. Eine sekundengenau tickende Zahl über Tage
 * hinweg erzeugt Druck, und Druck ist beim Immobilienkauf genau das
 * falsche Gefühl. Der Countdown soll orientieren, nicht hetzen.
 *
 * Er wird auf dem Server NICHT gerendert (erst nach der Hydration),
 * sonst zeigte er beim ersten Bild eine Zeit, die schon vorbei ist.
 */
export default function Countdown({
  frist,
  variante = "gross",
  className,
  vorbei = false,
  nochNicht = false,
}: {
  frist: string;
  /** "gross" für die Bieterseite, "klein" für Listen */
  variante?: "gross" | "klein";
  className?: string;
  /**
   * Das Verfahren nimmt keine Gebote mehr an, obwohl der Zeitpunkt
   * vielleicht noch in der Zukunft liegt. Genau so ist es nach dem
   * vorzeitigen Beenden oder einem Abbruch, und dann darf hier keine
   * Restzeit mehr stehen: Sie wäre schlicht falsch.
   */
  vorbei?: boolean;
  /**
   * Das Verfahren hat noch nicht begonnen (Stand vorbereitet). Dann
   * gibt es weder eine Restzeit noch eine abgelaufene Frist, und der
   * Satz sagt "noch keine" statt "keine mehr" (Bau-Runde 8).
   */
  nochNicht?: boolean;
}) {
  const [rest, setRest] = useState<ReturnType<typeof verbleibend> | null>(null);
  const ruhig = useReducedMotion();

  useEffect(() => {
    const messen = () => setRest(verbleibend(frist));
    messen();
    // In der letzten Stunde jede Sekunde, davor einmal pro Minute:
    // Das spart Arbeit und wirkt vor allem ruhiger.
    const takt = new Date(frist).getTime() - Date.now() < 3_600_000 ? 1000 : 30_000;
    const uhr = setInterval(messen, takt);
    return () => clearInterval(uhr);
  }, [frist]);

  if (!rest) {
    // Platzhalter in derselben Höhe, damit beim Erscheinen nichts springt
    return (
      <div
        aria-hidden="true"
        className={cn(variante === "gross" ? "h-[4.5rem]" : "h-5", className)}
      />
    );
  }

  if (rest.abgelaufen || vorbei) {
    return (
      <p
        className={cn(
          "font-medium text-ink-muted",
          variante === "gross" ? "text-[1.05rem]" : "text-[0.85rem]",
          className
        )}
      >
        {/* Zwei Zustaende, zwei Saetze (Bau-Runde 8): Ein Verfahren im
            Stand vorbereitet hat noch keine Frist, die ablaufen
            koennte, und hat auch nie Gebote angenommen. */}
        {nochNicht
          ? "Das Verfahren nimmt noch keine Gebote an."
          : rest.abgelaufen
            ? "Die Frist ist abgelaufen."
            : "Das Verfahren nimmt keine Gebote mehr an."}
      </p>
    );
  }

  const letzteStunde = rest.tage === 0 && rest.stunden === 0;
  const teile: { wert: number; label: string }[] = [
    { wert: rest.tage, label: rest.tage === 1 ? "Tag" : "Tage" },
    { wert: rest.stunden, label: rest.stunden === 1 ? "Stunde" : "Stunden" },
    { wert: rest.minuten, label: rest.minuten === 1 ? "Minute" : "Minuten" },
  ];
  if (letzteStunde) {
    teile.push({ wert: rest.sekunden, label: rest.sekunden === 1 ? "Sekunde" : "Sekunden" });
  }
  const sichtbar = teile.filter((t, i) => t.wert > 0 || i >= teile.length - 2);

  if (variante === "klein") {
    return (
      <span className={cn("text-[0.85rem] tabular-nums text-ink-muted", className)}>
        noch {sichtbar.map((t) => `${t.wert} ${t.label}`).join(", ")}
      </span>
    );
  }

  /**
   * In den letzten Stunden dezent draengender, ohne Panikmache.
   *
   * Die Schwelle liegt bei sechs Stunden. Bis dahin ist die Zahl
   * anthrazit wie jede andere Zahl auf der Seite; darunter wechselt sie
   * auf Terrakotta und die Beschriftung wird eine Spur kraeftiger. Kein
   * Rot, kein Blinken, kein "nur noch". Wer ein Haus kauft, soll das in
   * Ruhe entscheiden; die Farbe erinnert daran, dass die Zeit knapp
   * wird, mehr nicht.
   */
  const knapp = rest.tage === 0 && rest.stunden < 6;

  return (
    <div className={cn("flex flex-wrap items-end gap-x-6 gap-y-3", className)}>
      {sichtbar.map((t) => {
        const Zahl = ruhig ? "span" : m.span;
        return (
          <div key={t.label}>
            {/* Feste Breite je Stelle: Sonst huepft die Reihe, sobald
                aus einer zweistelligen Zahl eine einstellige wird. */}
            <p
              className={cn(
                "overflow-hidden font-heading text-[2.6rem] font-semibold leading-none tracking-[-0.02em] tabular-nums opsz-display sm:text-[3rem]",
                knapp ? "text-accent-deep" : "text-ink"
              )}
            >
              {/* Der Wechsel selbst ist der gestaltete Moment: Die neue
                  Zahl steigt weich von unten nach, die alte gibt es
                  nicht mehr. Bei reduzierter Bewegung springt sie. */}
              <Zahl
                key={t.wert}
                className="inline-block"
                {...(ruhig
                  ? {}
                  : {
                      initial: { y: "0.5em", opacity: 0 },
                      animate: { y: 0, opacity: 1 },
                      transition: { duration: 0.42, ease: [0.22, 0.61, 0.36, 1] },
                    })}
              >
                {t.wert}
              </Zahl>
            </p>
            <p
              className={cn(
                "mt-1.5 text-[0.78rem] uppercase tracking-[0.08em]",
                knapp ? "font-medium text-accent-deep/80" : "text-ink-muted"
              )}
            >
              {t.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
