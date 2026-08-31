/**
 * Die Antwort einer Funktion, deren HAUPTWIRKUNG ausbleiben kann.
 *
 * ---------------------------------------------------------------------
 * WARUM ES DIESE DATEI GIBT
 * ---------------------------------------------------------------------
 * Am 15.08.2026 wurden 21 Funktionen gefunden, die `Promise<void>`
 * zurueckgeben und unterwegs still aussteigen. Drei davon wurden
 * gemessen, und sie unterschieden sich nur in einem Punkt, naemlich
 * darin, was sie beim Scheitern hinterlassen:
 *
 *   stripeAboBeendenZum  meldet es dem Team.        Die beste Bauweise.
 *   linkWiderrufen       merkt gar nichts.
 *   buchungFreischalten  vermerkt sich als erledigt und verhindert
 *                        damit die Wiederholung.    Die schlechteste.
 *
 * Der dritte Fall hat einen Kunden 178 Euro gekostet, ohne dass er
 * etwas dafuer bekam, und der Knopf "Erneut verarbeiten" meldete
 * zweimal Erfolg, ohne etwas zu tun.
 *
 * ---------------------------------------------------------------------
 * DIE REGEL
 * ---------------------------------------------------------------------
 * Eine Funktion, deren Hauptwirkung ausbleiben kann, MELDET das
 * Scheitern entweder dem Aufrufer oder dem Team. Sie darf sich niemals
 * als erledigt vermerken, ohne die Wirkung geprueft zu haben.
 *
 * Drei Punkte, die dabei leicht untergehen:
 *
 * - GEPRUEFT heisst gemessen, nicht versucht. Ein `await` ohne Blick
 *   auf das Ergebnis ist kein Nachweis. Bei einem Schreibvorgang ist
 *   der Nachweis die Zeilenzahl (lib/schreiben.ts), bei einer
 *   Datenbank-Funktion ihr Rueckgabewert, bei Stripe die Antwort.
 * - DER MERKER KOMMT ZULETZT. Erst wirken, dann messen, dann
 *   vermerken. Wer zuerst vermerkt, sperrt die Wiederholung fuer den
 *   Fall, in dem sie gebraucht wird.
 * - KLARTEXT IN `offen`. Diese Saetze landen im internen Bereich und
 *   in der Meldung an das Team. Sie werden von einem Menschen gelesen,
 *   der den Kode nicht kennt, und sollen sagen, WAS ausblieb und was
 *   jetzt zu tun ist.
 *
 * WANN MAN SIE NICHT BRAUCHT: Wenn der stille Ausstieg gewollt ist.
 * `melde()` und `protokolliere()` verschlucken ihren Fehler mit
 * Absicht, weil eine Meldung die Handlung nicht umwerfen darf, um die
 * es geht. Solche Funktionen bleiben `Promise<void>`, und das ist eine
 * Aussage und kein Versehen.
 */

export type Wirkung = {
  /** false heisst: mindestens eine Hauptwirkung ist ausgeblieben */
  ok: boolean;
  /** Was gewirkt hat, in Klartext. Fuer Protokoll und Rueckmeldung. */
  gewirkt: string[];
  /** Was ausblieb, in Klartext. Leer genau dann, wenn ok. */
  offen: string[];
  /**
   * Nur bei ok = false, und nur wo die Frage sich stellt: Hilft ein
   * zweiter Lauf?
   *
   * WOZU (Bau-Runde 17): Nicht jeder offene Punkt ist ein
   * ausgebliebener Schritt. Ein AUSGEBLIEBENER SCHRITT (Freischaltung,
   * Auftrag, Bestaetigung) laesst sich nachholen, und wer das Ergebnis
   * bekommt, soll es wieder versuchen. Eine FESTSTELLUNG (etwa ein
   * Betrag, der von der Bestellung abweicht) aendert sich durch keinen
   * zweiten Lauf; wer sie als wiederholbar behandelt, laesst Stripe
   * drei Tage lang gegen eine Zahl anrennen, die feststeht.
   *
   * Undefiniert heisst "nicht beantwortet". Aufrufer, die die
   * Unterscheidung brauchen, behandeln undefined wie true: lieber
   * einmal zu oft wiederholen als eine Wirkung verlieren.
   */
  wiederholenHilft?: boolean;
};

export function gewirkt(...saetze: string[]): Wirkung {
  return { ok: true, gewirkt: saetze, offen: [] };
}

export function ausgeblieben(...saetze: string[]): Wirkung {
  return { ok: false, gewirkt: [], offen: saetze };
}

/**
 * Mehrere Teilwirkungen zu einer Antwort zusammenfassen. Eine einzige
 * ausgebliebene Teilwirkung macht das Ganze zu einem Fehlschlag: Der
 * Kunde hat die Buchung als Ganzes bezahlt.
 */
export function zusammen(teile: Wirkung[]): Wirkung {
  return {
    ok: teile.every((t) => t.ok),
    gewirkt: teile.flatMap((t) => t.gewirkt),
    offen: teile.flatMap((t) => t.offen),
  };
}

/** Ein Satz aus allem, was ausblieb. null, wenn nichts ausblieb. */
export function offenerText(wirkung: Wirkung): string | null {
  return wirkung.offen.length > 0 ? wirkung.offen.join(" ") : null;
}
