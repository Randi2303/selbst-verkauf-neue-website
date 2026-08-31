/**
 * Die reine Pruef-Logik fuer Basis-Adressen, ohne Umgebungs-Zugriff
 * und ohne server-only.
 *
 * WARUM EIGENE DATEI (Unterdomain-Runde, 24.08.2026): lib/basis-adresse.ts
 * traegt server-only, und das ist dort richtig. Seit es zwei Basen gibt
 * (oeffentliche Basis und App-Basis), braucht auch lib/app-basis.ts diese
 * Pruefung, und die wird von lib/mail-vorlagen.ts importiert, die wiederum
 * das Erzeuger-Skript scripts/mail-vorlagen-erzeugen.mjs unter purem Node
 * laedt. Das Paket server-only wirft ausserhalb des React-Server-Kontexts
 * beim Import. Die Pruefung selbst ist reines Rechnen und darf ueberall
 * laufen; was NICHT ueberall laufen darf, bleibt in den beiden
 * Basis-Dateien.
 */

/** Adressen, die niemals in einer Mail stehen duerfen */
const UNBRAUCHBARE_HOSTS = [
  "0.0.0.0",
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
];

/**
 * Hosts, die in der ENTWICKLUNG als bewusst gesetzte Basis durchgehen.
 * 0.0.0.0 steht absichtlich NICHT dabei: Genau dieser Wert kam aus dem
 * Versehen, das lib/basis-adresse.ts ausgeloest hat.
 */
const ENTWICKLUNGS_HOSTS = ["localhost", "127.0.0.1"];

export type BasisPruefung =
  | { ok: true; basis: string }
  | { ok: false; grund: string };

/**
 * Prueft einen Kandidaten. Getrennt von den Basis-Funktionen, damit die
 * Regel ohne Umgebung testbar bleibt.
 */
export function basisPruefen(kandidat: string | undefined): BasisPruefung {
  const wert = (kandidat ?? "").trim().replace(/\/+$/, "");
  if (!wert) {
    return { ok: false, grund: "Es ist keine Basis-Adresse konfiguriert." };
  }
  let url: URL;
  try {
    url = new URL(wert);
  } catch {
    return {
      ok: false,
      grund: `Die konfigurierte Basis-Adresse ist keine gültige Adresse: ${wert}`,
    };
  }
  /* AUSNAHME FUER DIE ENTWICKLUNG, und nur dort. Wer lokal arbeitet,
     setzt SITE_URL bewusst auf http://localhost:3000 und will genau
     dorthin zurueckgeleitet werden. Der Fehler, um den es hier geht,
     war ein GERATENER Wert aus der Anfrage, kein bewusst gesetzter.
     In der Produktion bleibt es bei https und ohne eigenen Rechner,
     dort waere so ein Wert ein Versehen mit Folgen. */
  const entwicklung = process.env.NODE_ENV !== "production";
  const eigenerRechner = UNBRAUCHBARE_HOSTS.includes(url.hostname);
  const localhostErlaubt = entwicklung && ENTWICKLUNGS_HOSTS.includes(url.hostname);

  if (url.protocol !== "https:" && !localhostErlaubt) {
    return {
      ok: false,
      grund: `Die Basis-Adresse muss mit https beginnen, konfiguriert ist: ${wert}`,
    };
  }
  if (eigenerRechner && !localhostErlaubt) {
    return {
      ok: false,
      grund: `Die Basis-Adresse zeigt auf den eigenen Rechner (${url.hostname}) und ist von außen nicht erreichbar.`,
    };
  }
  return { ok: true, basis: url.origin };
}
