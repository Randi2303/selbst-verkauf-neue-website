"use client";

import { useEffect, useState } from "react";

/**
 * Reduzierte Bewegung, HYDRATIONSSICHER.
 *
 * =====================================================================
 * WARUM NICHT useReducedMotion VON framer-motion (Runde 31, 26.08.2026)
 * =====================================================================
 * Der framer-Haken kennt die Einstellung schon im ERSTEN Client-Render,
 * der Server kennt sie nie. Jede Stelle, die damit ihren BAUM oder ihre
 * SERVER-STILE verzweigt (anderer Ast, initial={reduced ? ...}),
 * liefert Nutzern mit reduzierter Bewegung anderes Markup als der
 * Server: React meldet einen Hydration-Fehler und baut die Seite neu
 * auf. Genau das war der Inhaber-Befund "Turbopack zeigt 1 issue" auf
 * einem MacBook mit reduzierter Bewegung; als Erst-Brecher gemessen an
 * der Sektions-Ueberschrift von Problem und Loesung.
 *
 * DIESER Haken gibt auf dem Server UND im ersten Client-Render immer
 * false zurueck und meldet die echte Einstellung erst nach dem Mount.
 * Der erste Aufbau ist damit IMMER deckungsgleich mit dem Server; wer
 * reduzierte Bewegung wuenscht, bekommt eine Umschaltung unmittelbar
 * nach dem Aufwachen (ein Wimpernschlag, in dem nichts animiert, weil
 * Animationen ohnehin erst nach dem Mount starten).
 *
 * REGEL: Ueberall dort, wo die Einstellung das RENDER-ERGEBNIS
 * beeinflusst (Baum, initial-Werte, Inhalte), MUSS dieser Haken
 * verwendet werden. Wo sie nur Uebergangs-DAUERN steuert, darf der
 * framer-Haken bleiben (Dauern stehen nicht im Server-HTML).
 */
export function nutztReduzierteBewegung(): boolean {
  const [reduziert, setReduziert] = useState(false);

  useEffect(() => {
    const abfrage = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduziert(abfrage.matches);
    const horcher = (ereignis: MediaQueryListEvent) => setReduziert(ereignis.matches);
    abfrage.addEventListener("change", horcher);
    return () => abfrage.removeEventListener("change", horcher);
  }, []);

  return reduziert;
}
