/**
 * DIE PFLICHT-MAILS: jede Mail, die die Abmeldung uebergeht, an einer
 * Stelle und je mit dem einen Satz, warum sie das darf.
 *
 * ---------------------------------------------------------------------
 * WARUM ES DIESE DATEI GIBT (Befund der Runde 7, gebaut in Bau-Runde 8)
 * ---------------------------------------------------------------------
 * Neun Mails gingen an der Abmeldung (profiles.mail_benachrichtigungen)
 * vorbei. Drei davon waren im Kode begruendet, sechs trugen keinen
 * Satz. Eine Sammlung, die still waechst, ist genau die Falle aus der
 * Generalprobe: Ein Eintrag ohne Grund laesst den Naechsten raten, ob
 * jemand nachgedacht hat oder ob die Zeile nur abgeschrieben wurde.
 *
 * ---------------------------------------------------------------------
 * WIE DIE AUFSTELLUNG HAELT, statt erinnert zu werden
 * ---------------------------------------------------------------------
 * Nach dem Vorbild von config/auftraege.ts haengt die Liste am Typ:
 * Jede Sende-Stelle, die die Abmeldung uebergeht, deklariert ihre
 * Vorlage mit `pflichtMail("...")`. Diese Funktion nimmt NUR Kennungen
 * an, die hier mit Begruendung stehen. Wer kuenftig eine Mail an der
 * Abmeldung vorbeischicken will, schreibt die Begruendung hierher,
 * sonst scheitert der Bau. Und wer eine Kennung hier loescht, waehrend
 * eine Stelle sie noch nutzt, scheitert ebenso.
 *
 * Der Admin sieht die Aufstellung unter /admin/mail-vorlagen an jeder
 * betroffenen Vorlage; die Quelle bleibt allein diese Datei.
 *
 * ---------------------------------------------------------------------
 * DER MASSSTAB
 * ---------------------------------------------------------------------
 * Eine Pflicht-Mail ist eine geschuldete Auskunft ueber den Vertrag
 * oder den Zugang, keine Annehmlichkeit: Ohne sie fehlt ein Beleg,
 * verfaellt Bezahltes unbemerkt, oder es gibt den Zugang gar nicht
 * erst. Hinweise auf Vorgaenge, die auch im Konto sichtbar sind
 * (Termine, Anfragen, Gebote im Lauf), sind KEINE Pflicht-Mails; sie
 * laufen ueber sendeHinweis und achten die Abmeldung.
 *
 * ZWEITER MASSSTAB, dazugekommen am 30.08.2026 auf Auflage des
 * Inhabers: Pflicht ist auch jede Mail, an der etwas haengt, das ueber
 * ihren TEXT hinausgeht.
 *
 *   - ein ANHANG (Rechnung als PDF, Kalenderdatei),
 *   - ein LINK, den es nur in dieser Mail gibt (Einmal-Link, Zugang),
 *   - eine FRIST, die mit ihr beginnt (Widerruf, Verzug, Laufzeit).
 *
 * Der Satz dazu: "Das ist kein Hinweis, das ist ein Arbeitsmittel."
 * Wer eine solche Mail abschaltet, verliert nicht die Nachricht,
 * sondern die Sache. Der Anlass war `besichtigung-zusage`; die
 * Durchsicht aller 48 Sende-Stellen am selben Tag fand genau drei
 * Mails mit Anhang, davon zwei an den Kunden (Rechnung, Besichtigungs-
 * Rueckmeldung) und eine an den Interessenten.
 *
 * scripts/pflicht-am-schalter-pruefen.mts setzt den ANHANG-Teil dieser
 * Regel durch: Jede Sende-Stelle mit `anhaenge:` an einen Kunden muss
 * hier stehen. Link und Frist sieht die Pruefung NICHT; sie stehen in
 * der Vorlage und nicht an der Sende-Stelle.
 *
 * AUSDRUECKLICH KEINE PFLICHT-MAIL MEHR: `frist-abgelaufen`. Die Route
 * des von Hand beendeten Bieterverfahrens ueberging die Abmeldung,
 * waehrend der Zeitplan-Zwilling derselben Mail sie achtete; zwei
 * Verhalten fuer denselben Inhalt, ohne einen Satz dazu. Entschieden
 * in Bau-Runde 8: Der Zwilling ist das Vorbild. Wer beim Beenden
 * selbst auf den Knopf drueckt, sieht das Ergebnis vor sich; die
 * offenen Gebote mahnt seither ohnehin das Erinnerungsverfahren an
 * (Sorte gebot.entscheidung), und das achtet die Abmeldung.
 */

export const PFLICHT_MAILS = {
  /* Die drei Zugangs-Mails: ohne sie gibt es das Konto nicht. */
  einladung:
    "Zugangs-Mail: Ohne die Einladung kommt ein neuer Kunde nie an sein Konto; eine Abmeldung kann es zu diesem Zeitpunkt noch gar nicht geben.",
  passwort:
    "Zugangs-Mail: Wer sein Passwort anfordert, will genau diese Mail; ohne sie ist das Konto verloren.",
  "einladung-oder-passwort":
    "Zugangs-Mail: Der Einmal-Link entscheidet selbst, ob er einlaedt oder das Passwort setzt; in beiden Faellen haengt der Zugang daran.",
  "email-wechsel":
    "Zugangs-Mail: Ohne die Bestaetigung an die NEUE Adresse gibt es keinen Wechsel; die Adresse hat zu diesem Zeitpunkt noch kein Konto und damit keine Abmeldung.",
  "email-wechsel-hinweis":
    "Sicherheits-Hinweis an die ALTE Adresse: Ein Wechsel, den der Inhaber nicht veranlasst hat, muss ihn erreichen, gerade dann, wenn er Benachrichtigungen abbestellt hat.",

  /* Die Kasse: gesetzlich oder vertraglich geschuldete Belege. */
  bestellbestaetigung:
    "Vertragsbestaetigung nach Paragraf 312f BGB: Der Kunde hat Anspruch auf die Bestaetigung seines Vertragsschlusses samt Inhalt, unabhaengig von jeder Benachrichtigungs-Einstellung.",
  rechnung:
    "Rechnungszustellung: Der Kunde hat Anspruch auf seine Rechnung; sie ist Beleg, nicht Benachrichtigung.",
  "zahlung-fehlgeschlagen":
    "Einmalige Zahlungsstoerung am laufenden Vertrag: Wer davon nichts erfaehrt, rutscht ohne sein Wissen in den Verzug; das ist eine geschuldete Auskunft, keine Werbung.",

  /* Der Vertrag im Lauf. */
  "kuendigung-eingang":
    "Gesetzlich geschuldete Empfangsbestaetigung nach Paragraf 312k BGB: Sie muss den Kuendigenden erreichen, ob er Benachrichtigungen mag oder nicht.",
  "schaltung-erinnerung":
    "Auskunft ueber den laufenden Vertrag (entschieden am 17.08.2026): Eine bezahlte Portalschaltung endet zu einem Datum; wer das verpasst, verliert Sichtbarkeit, die er bezahlt hat, und das Inserat verschwindet unbemerkt. Der Verlaengerungs-Hinweis darin ist Nebensache.",
  "schaltung-start-erinnerung":
    "Eine Frist, an deren Ende ein bezahlter Anspruch endet (entschieden am 30.08.2026): Wer nicht rechtzeitig veroeffentlicht, verliert die enthaltene Portalschaltung und muss sie zum dann gueltigen Preis neu buchen. Anders als beim Ende der Schaltung kann er hier noch handeln, und genau dafuer ist die Mail da. Zweiter Maszstab dieser Datei: Eine Frist, die mit ihr beginnt oder endet, macht eine Mail zur Pflicht.",
  "gebot-angenommen-verkaeufer":
    "Beleg ueber einen rechtserheblichen Schritt: Die Annahme eines Gebots bindet den Verkaeufer gegenueber dem Bieter; die Bestaetigung mit Betrag gehoert zu seinen Unterlagen wie eine Bestellbestaetigung.",

  /* Der Betriebshinweis am eigenen Objekt. */
  "anfragen-gebremst":
    "Betriebshinweis, hoechstens einmal je Kalendertag: Die Notbremse haelt Mails zu SEINEM Objekt an; wer das nicht erfaehrt, wartet auf Anfragen, die bei uns liegen.",

  /* Was ueber den Text hinausgeht (Auflage des Inhabers, 30.08.2026).
     An diesen beiden Mails haengt die Kalenderdatei; sie sind das
     einzige Arbeitsmittel im Haus, das an einer Kunden-Mail haengt und
     bis zum 30.08.2026 abbestellbar war. Die Rechnung mit ihrer PDF
     stand schon vorher hier. */
  "besichtigung-zusage":
    "Arbeitsmittel, nicht Hinweis: An dieser Mail haengt der Kalendereintrag zur Besichtigung, und den gibt es sonst nur ueber einen Knopf im Konto. Der Inhaber am 30.08.2026: Wer sie abschaltet, verliert nicht nur einen Text, sondern den Termineintrag fuer seinen eigenen Termin. Am Samstagmorgen schaut niemand ins Konto, sondern in seinen Kalender.",
  "besichtigung-absage":
    "Arbeitsmittel, nicht Hinweis, und der wichtigere der beiden Faelle: Der Anhang traegt STATUS:CANCELLED und NIMMT den vorhandenen Eintrag aus dem Kalender. Ohne diese Mail bleibt ein abgesagter Termin dort fuer immer als bestaetigt stehen, und der Verkaeufer haelt sich einen Vormittag frei, den er nicht braucht.",

  "verkauf-gemeldet":
    "Beleg ueber einen Vorgang, der drei Dinge auf einmal beendet: das Inserat SOFORT und ohne Erstattung der bezahlten Restlaufzeit, die laufenden monatlichen Buchungen zum Monatsende, und er startet eine Sechs-Monats-Frist auf saemtliche Interessenten-Akten. Der Dialog warnt vorher, aber ein Dialog ist nach dem Klick weg. Wer spaeter fragt, was er verloren hat und bis wann er seine Akten noch herunterladen kann, muss es schriftlich haben.",

  /* Das ENDE eines Vertrags und einer Abbuchung (30.08.2026, Runde 44). */
  "kuendigung-wirksam":
    "Ende eines Vertrags und einer wiederkehrenden Abbuchung: Bis heute erfuhr der Kunde NICHTS, wenn seine Kuendigung wirksam wurde; die Zeile im Konto verschwand am Stichtag einfach, weil die Leistungs-Seite auf status = aktiv filtert. Schwerer wiegt, dass die Empfangsbestaetigung nach Paragraf 312k woertlich eine zweite Mail verspricht (\"bestaetigen Ihnen anschliessend den Zeitpunkt, zu dem die Leistung endet\"). Diese Mail loest die Zusage ein. Sie nennt den Betrag der letzten Abbuchung, damit der Kunde ihn auf dem Kontoauszug zuordnen kann, und sagt, was von seinen Daten bleibt.",

  /* Der Beginn einer wiederkehrenden Abbuchung (28.08.2026). */
  "makler-zugewiesen":
    "Beginn einer wiederkehrenden Abbuchung ohne Zutun des Kunden: Die Zuweisung startet Laufzeit UND Abrechnung der Makler-Begleitung. Bis dahin hat er nichts gezahlt; ab diesem Moment monatlich. Wer davon nichts erfaehrt, findet die erste Abbuchung auf dem Kontoauszug, und das ist keine Benachrichtigung, die man abbestellen kann. Die Mail nennt deshalb auch den Kuendigungsweg.",
} as const;

export type PflichtMailId = keyof typeof PFLICHT_MAILS;

/**
 * Deklariert an der Sende-Stelle, dass diese Mail eine Pflicht-Mail
 * ist. Gibt die Kennung unveraendert zurueck; ihr einziger Zweck ist
 * der Typ: Eine Kennung ohne Begruendung in PFLICHT_MAILS kommt hier
 * nicht durch.
 */
export function pflichtMail(id: PflichtMailId): PflichtMailId {
  return id;
}

export function istPflichtMail(kennung: string): kennung is PflichtMailId {
  return Object.prototype.hasOwnProperty.call(PFLICHT_MAILS, kennung);
}

export function pflichtBegruendung(kennung: string): string | null {
  return istPflichtMail(kennung) ? PFLICHT_MAILS[kennung] : null;
}
