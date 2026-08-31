import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";

/**
 * DIE ZWISCHENSEITE FUER EINMAL-LINKS, technische Seite.
 *
 * DAS PROBLEM: Firmen und Mailanbieter setzen Prüfdienste ein, allen
 * voran Outlook Safe Links und Microsoft Defender. Die öffnen jeden
 * Link in einer eingehenden Mail automatisch im Hintergrund, um ihn auf
 * Gefahren abzuklopfen, lange bevor ein Mensch ihn anklickt. Fuer eine
 * gewoehnliche Seite ist das harmlos. Bei einem Link, der etwas
 * AUSLOEST, ist es fatal: Der Einladungs-Token ist verbraucht, und der
 * Kunde liest beim eigenen Klick "Link abgelaufen", obwohl er nichts
 * falsch gemacht hat.
 *
 * Solange der Vorlaunch-Passwortschutz laeuft, bekommen diese Dienste
 * eine 401 und kommen gar nicht erst durch. Genau der faellt beim Start
 * weg, deshalb steht das hier jetzt und nicht spaeter.
 *
 * DIE LOESUNG: Der Link fuehrt auf eine Zwischenseite, die NICHTS tut
 * ausser fragen. Erst ein Klick auf ihren Knopf loest aus, und dieser
 * Klick ist ein POST. Ein Pruefdienst ruft Adressen auf, er fuellt
 * keine Formulare aus. Damit trennt sich die Maschine sauber vom
 * Menschen, ohne dass jemand ein Raetsel loesen muss.
 *
 * DER ZWEITE GRUND, der auch dort gilt, wo gar kein Token verbrannt
 * wird: Ohne Zwischenseite liefert die Anwendung dem Pruefdienst die
 * fertige Seite aus, mitsamt Adresse, Gebotshöhe oder Terminangaben.
 * Diese Daten laufen dann durch fremde Rechenzentren, ohne dass ein
 * Mensch je etwas angeklickt haette. Die Zwischenseite zeigt nur den
 * Zweck, den der Empfaenger ohnehin schon aus der Mail kennt.
 *
 * Diese Datei haelt nur den Merker fest, dass ein Mensch geklickt hat.
 * Der Merker ist bewusst an das TOKEN gebunden und nicht an die
 * Sitzung: Wer zwei Links bekommt, soll nicht mit dem einen den
 * anderen freischalten.
 */

/** Wie lange ein einmal bestaetigter Link ohne erneute Frage aufgeht */
const FREIGABE_STUNDEN = 12;

/**
 * Der Cookie-Name zu einem Token.
 *
 * Es steht NIE das Token selbst im Cookie, nur ein gekuerzter Abdruck.
 * Wer die Cookies eines Rechners liest, haelt damit keinen gueltigen
 * Link in der Hand.
 */
export function freigabeSchluessel(token: string): string {
  const abdruck = createHash("sha256").update(token).digest("hex");
  return `sv-link-${abdruck.slice(0, 24)}`;
}

/** Hat an diesem Gerät schon ein Mensch auf den Knopf gedrückt? */
export async function istFreigegeben(token: string): Promise<boolean> {
  const laden = await cookies();
  return laden.get(freigabeSchluessel(token))?.value === "1";
}

/** Die Einstellungen des Freigabe-Cookies, an einer Stelle */
export function freigabeCookie(token: string) {
  return {
    name: freigabeSchluessel(token),
    value: "1",
    httpOnly: true,
    // In der Entwicklung laeuft http, dort wuerde secure das Cookie
    // verwerfen und die Zwischenseite endlos wiederkommen
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: FREIGABE_STUNDEN * 60 * 60,
  };
}
