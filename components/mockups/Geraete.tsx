"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";

/*
 * Die gemeinsamen Rahmen der Schaufenster-Ausschnitte: ein Browser-
 * Fenster und ein markenneutral wirkendes Telefon, dazu die zwei
 * Beschriftungsformen (Kennzeichen und Randnotiz).
 *
 * DIE ADRESSE IST EINE ZUSAGE, KEIN ZUSTAND: app.selbst-verkauf.de
 * existiert noch nicht. Der Inhaber hat am 24.08.2026 entschieden,
 * dass die Unterdomain VOR dem Fall des Passwortschutzes steht und
 * deshalb ueberall gezeigt wird. Wer sie hier aendert, aendert eine
 * Inhaber-Entscheidung.
 *
 * DAS TELEFON ist bewusst in vier Schichten gebaut wie das echte
 * Geraet (Metallrahmen, Fuge, Display-Einfassung, Glas), die Radien
 * nehmen je Schicht um die Schichtdicke ab. Licht kommt wie auf der
 * ganzen Seite von oben links, der Schatten faellt leicht nach rechts
 * unten. Kein Marken-Detail kopieren: keine 9:41, Statuszeit ist 10:12.
 */

/** Adresse aller Konto-Ausschnitte, an einer Stelle */
export const APP_ADRESSE = "app.selbst-verkauf.de";

export function BrowserFenster({ children }: { children: ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-line/70 bg-paper"
      style={{
        boxShadow:
          "0 2px 6px rgba(35, 39, 42, 0.08), 10px 36px 70px -26px rgba(35, 39, 42, 0.32)",
      }}
    >
      <div className="flex items-center gap-3 border-b border-line/60 bg-surface/60 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D9998E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#DDBC77]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#93BC9F]" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-full bg-background px-3.5 py-1 text-[0.72rem] font-medium text-ink-muted">
          <Lock size={10} strokeWidth={2} />
          {APP_ADRESSE}
        </div>
        <span className="w-10" />
      </div>
      {children}
    </div>
  );
}

/** Generische Statusleiste: Empfang, WLAN, Akku, ohne Markenzitate */
function TelefonStatus() {
  return (
    <div className="flex items-center justify-between px-6 pt-[17px] text-[11px] font-semibold text-ink">
      <span className="min-w-[62px]">10:12</span>
      <svg width="42" height="11" viewBox="0 0 42 11" fill="currentColor" aria-hidden="true">
        <rect x="0" y="5.5" width="2.4" height="4" rx="0.8" />
        <rect x="3.7" y="3.5" width="2.4" height="6" rx="0.8" />
        <rect x="7.4" y="1.5" width="2.4" height="8" rx="0.8" />
        <path d="M14.5 4.4a6 6 0 0 1 7.4 0l-1.3 1.5a4 4 0 0 0-4.8 0Z" />
        <circle cx="18.2" cy="7.8" r="1.3" />
        <rect x="26" y="1.8" width="12" height="7" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="27.5" y="3.3" width="7" height="4" rx="1.1" />
        <rect x="39" y="3.7" width="1.6" height="3.2" rx="0.8" />
      </svg>
    </div>
  );
}

export function TelefonRahmen({ children }: { children: ReactNode }) {
  /* EIN Schatten fuer alle Geraete (Inhaber, 26.08.2026,
     Vereinheitlichung): Das Telefon traegt dieselbe Klasse
     geraete-schatten wie MacBook und iPad, als Filter folgt sie der
     Silhouette samt Tasten. Sie sitzt auf einem WRAPPER, nicht am
     Rahmen selbst: Ein Filter macht den Rahmen zum Stapel-Kontext,
     und die Tasten mit negativem z-Index laegen dann VOR dem
     Metallverlauf statt dahinter. */
  return (
    <div className="geraete-schatten">
    <div
      className="relative mx-auto w-[262px] rounded-[46px] p-[4px] sm:w-[302px] sm:rounded-[52px]"
      style={{
        background:
          "linear-gradient(148deg, #e8e6e1 0%, #b9b7b2 8%, #8d8b87 18%, #6f6d69 30%, #55534f 50%, #6b6965 70%, #97948f 86%, #cfccc7 100%)",
      }}
    >
      {/* Tasten am Metallrahmen, links Lautstaerke, rechts die Seitentaste */}
      <span
        className="absolute -left-[3px] top-[120px] h-[30px] w-[3.5px] rounded-[3px] sm:top-[138px] sm:h-[34px]"
        style={{ zIndex: -1, background: "linear-gradient(90deg, #4a4844, #7c7a75 50%, #3f3d3a)" }}
      />
      <span
        className="absolute -left-[3px] top-[158px] h-[48px] w-[3.5px] rounded-[3px] sm:top-[182px] sm:h-[56px]"
        style={{ zIndex: -1, background: "linear-gradient(90deg, #4a4844, #7c7a75 50%, #3f3d3a)" }}
      />
      <span
        className="absolute -right-[3px] top-[146px] h-[64px] w-[3.5px] rounded-[3px] sm:top-[168px] sm:h-[74px]"
        style={{ zIndex: -1, background: "linear-gradient(90deg, #3f3d3a, #7c7a75 50%, #4a4844)" }}
      />
      <div className="rounded-[42px] bg-[#1a1d20] p-[2px] sm:rounded-[48px]">
        <div
          className="rounded-[40px] p-[8px] sm:rounded-[46px]"
          style={{ background: "linear-gradient(155deg, #0c0e10, #050607 45%, #0b0d0f)" }}
        >
          {/* DAS SEITENVERHAELTNIS IST FEST und liegt HIER, nicht beim
              Aufrufer (Inhaber, 24.08.2026: ein Telefon, das sich der
              Umgebung anpasst, ist keines). Bezugsgroesse ist der
              SCHIRM: Bei 302 px Gehaeuse ist er 274 breit und war in
              der abgenommenen Form 508 hoch, also 137 zu 254. Der
              erste Wurf bezog die GEHAEUSE-Masse auf den Schirm und
              stauchte das Geraet um 47 px. Wer den Inhalt aendert,
              aendert damit nie die Gestalt des Geraets. */}
          <div className="relative flex aspect-[137/254] flex-col overflow-hidden rounded-[32px] bg-background sm:rounded-[38px]">
            {/* Glasglanz von oben links, kaum sichtbar */}
            <div
              className="pointer-events-none absolute inset-0 z-40 rounded-[32px] sm:rounded-[38px]"
              style={{
                background:
                  "linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0) 34%), linear-gradient(295deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 12%)",
              }}
            />
            {/* Insel mit Kamera-Detail */}
            <div className="absolute left-1/2 top-[14px] z-30 flex h-[25px] w-[86px] -translate-x-1/2 items-center justify-end rounded-full bg-[#0a0c0d] pr-2">
              <span
                className="h-[9px] w-[9px] rounded-full bg-[#16191c]"
                style={{
                  boxShadow:
                    "inset 0 0 2px 1px #2c3237, inset 1px 1px 1.5px rgba(80, 120, 150, 0.4)",
                }}
              />
            </div>
            <TelefonStatus />
            {children}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

/**
 * Kennzeichnung unter einem Ausschnitt: ruhige Kleinkapitälchen an der
 * Kante des Objekts, nie Kleingedrucktes irgendwo. Am Telefon stehen
 * Ausschnitt und Zeile mittig (Inhaber, 24.08.2026: mittig wirkt
 * platziert, links wirkt gerutscht).
 */
export function Kennzeichen({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mt-4 text-center text-[0.66rem] font-semibold uppercase tracking-[0.09em] text-ink-muted [text-wrap:balance] ${className}`}
    >
      {children}
    </p>
  );
}
