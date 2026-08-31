import { Check } from "lucide-react";
import { cn } from "@/lib/shadcn-utils";

/**
 * Der Ablauf in drei Schritten.
 *
 * WOZU: Wer zum ersten Mal ein Gebot abgibt, weiß nicht, was danach
 * passiert. Diese Unsicherheit ist der Hauptgrund, warum Menschen an
 * dieser Stelle abspringen. Drei Schritte, mehr braucht es nicht:
 * Nachweis, Gebot, Entscheidung des Eigentümers.
 *
 * Bewusst KEIN Fortschrittsbalken in Prozent. Ein Prozentwert suggeriert
 * eine Strecke, die man abarbeitet; hier geht es um drei klar benannte
 * Zustände. Der dritte Schritt liegt außerdem gar nicht in der Hand des
 * Bieters, und das steht auch so da.
 */
export type AblaufSchritt = "nachweis" | "gebot" | "entscheidung";

const SCHRITTE: { id: AblaufSchritt; titel: string; text: string }[] = [
  {
    id: "nachweis",
    titel: "Nachweis",
    text: "Ihre Finanzierung ist belegt.",
  },
  {
    id: "gebot",
    titel: "Ihr Gebot",
    text: "Sie nennen Ihren Betrag.",
  },
  {
    id: "entscheidung",
    titel: "Entscheidung",
    text: "Der Eigentümer meldet sich bei Ihnen.",
  },
];

export default function Ablauf({
  erledigt,
  aktuell,
}: {
  /** Was der Bieter schon hinter sich hat */
  erledigt: AblaufSchritt[];
  /** Woran er gerade ist */
  aktuell: AblaufSchritt;
}) {
  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {SCHRITTE.map((s, i) => {
        const fertig = erledigt.includes(s.id);
        const jetzt = s.id === aktuell;
        return (
          <li
            key={s.id}
            className={cn(
              "flex gap-3 rounded-2xl border px-4 py-3.5",
              jetzt
                ? "border-primary/40 bg-surface-tint/60"
                : "border-line/70 bg-paper"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-semibold tabular-nums",
                fertig
                  ? "bg-primary text-paper"
                  : jetzt
                    ? "border border-primary text-primary"
                    : "border border-line text-ink-muted"
              )}
            >
              {fertig ? <Check size={14} strokeWidth={2.4} /> : i + 1}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[0.9rem] font-medium",
                  jetzt || fertig ? "text-ink" : "text-ink-muted"
                )}
              >
                {s.titel}
              </span>
              <span className="mt-0.5 block text-pretty text-[0.82rem] leading-relaxed text-ink-muted">
                {s.text}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
