/**
 * Wie eine Person angezeigt wird, an EINER Stelle festgelegt.
 *
 * Hintergrund: Der Header der öffentlichen Website hatte die Initialen
 * aus der E-Mail-Adresse gebildet, das Konto aus dem Profilnamen.
 * Dieselbe Person erschien dadurch je nach Seite unterschiedlich
 * (E-Mail max@..., Profilname "Erika Beispiel" ergaben MA statt EB).
 * Das sah aus wie ein hängengebliebener Vor-Nutzer, war aber schlicht
 * eine zweite Quelle. Seitdem benutzen Website, Konto und Admin diese
 * beiden Funktionen.
 *
 * Grundsatz: Der PROFILNAME entscheidet. Die E-Mail-Adresse ist nur
 * die Rückfallebene, solange kein Name gepflegt ist; sie kann einer
 * ganz anderen Person gehören als der Name.
 */

/** Anzeigename: Profilname, sonst die E-Mail-Adresse */
export function anzeigeName(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  return name?.trim() || email?.trim() || "";
}

/**
 * Initialen für den runden Kopf-Knopf, höchstens zwei Buchstaben.
 * Aus dem Namen die Anfangsbuchstaben der Wörter ("Erika Beispiel"
 * ergibt EB), aus einer E-Mail-Adresse die Anfangsbuchstaben der
 * durch Punkt, Strich oder Unterstrich getrennten Teile vor dem @
 * ("erika.beispiel@..." ergibt ebenfalls EB).
 */
export function initialenAus(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  const gepflegt = name?.trim();
  const teile = gepflegt
    ? gepflegt.split(/\s+/)
    : (email ?? "").split("@")[0].split(/[._-]/);
  return teile
    .map((teil) => teil[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
    /* "ß".toUpperCase() ergibt "SS", also ZWEI Zeichen aus einem, und
       die Zusicherung "hoechstens zwei Buchstaben" waere gebrochen.
       Nach dem Grossschreiben deshalb noch einmal kappen. */
    .slice(0, 2);
}
