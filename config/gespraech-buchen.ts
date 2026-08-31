/**
 * DAS KURZE GESPRÄCH VOR DER ENTSCHEIDUNG, an EINER Stelle.
 *
 * =====================================================================
 * WOZU ES DIESEN ABSCHNITT GIBT (Auftrag des Inhabers, 26.08.2026)
 * =====================================================================
 * Wir sind eine neue Firma mit einem neuen Produkt. Irgendwo zwischen
 * den Paketen und dem Vergleich denkt jeder Besucher denselben Satz:
 * Da soll ich Geld ausgeben und weiß gar nicht, was mich erwartet.
 * Genau diese Stelle fängt der Abschnitt auf.
 *
 * DER TON IST DIE GANZE SACHE. Es darf an keiner Stelle nach einem
 * kostenlosen Erstgespräch klingen, das in Wahrheit ein
 * Verkaufsgespräch ist. Jeder kennt dieses Muster und misstraut ihm
 * sofort. Deshalb steht hier weder "kostenlos" noch eine Dringlichkeit
 * noch ein begrenzter Platz, und die Fragen unten sind die Sätze, die
 * Leute wirklich denken, keine Nutzenversprechen.
 *
 * DAS WORT "BERATUNG" KOMMT NICHT VOR, und zwar nicht aus
 * Sprachpflege: Wir sind keine Makler und beraten nicht zum
 * Immobilienverkauf. Es geht um Fragen zur Plattform.
 *
 * =====================================================================
 * SO SCHALTEN SIE DEN ABSCHNITT SCHARF
 * =====================================================================
 * Tragen Sie unten bei `buchungslink` zwischen die Anführungszeichen
 * die Adresse Ihres Google-Terminplans ein und speichern Sie; mit dem
 * nächsten Ausrollen steht der Abschnitt öffentlich.
 *
 * SOLANGE DA NICHTS STEHT, ERSCHEINT ER ÖFFENTLICH GAR NICHT. Kein
 * toter Knopf, keine Seite, die ins Leere führt. In der Entwicklung
 * ist er trotzdem vollständig zu sehen, damit er sich beurteilen
 * lässt, bevor der Link da ist; der Knopf sagt dort beim Draufklicken,
 * dass noch kein Terminplan hinterlegt ist, und ändert dabei nichts an
 * der Gestaltung.
 *
 * KEIN EINGEBETTETES FENSTER. Der Link öffnet in einem neuen Tab. Ein
 * eingebetteter Google-Rahmen holt einen fremden Dienst auf unsere
 * Seite; was dafür in die Datenschutzerklärung gehört, steht als
 * Notiz in uebergabe/34-notiz-datenschutz-terminplan.md.
 */

/** Ob wir gerade auf dem Entwicklungs-Server laufen */
export const istEntwicklung = process.env.NODE_ENV !== "production";

export const GESPRAECH = {
  /**
   * DIE EINE STELLE FÜR DEN BUCHUNGSLINK.
   * Leer heißt: Der Abschnitt erscheint öffentlich nicht.
   * Beispiel: "https://calendar.app.google/…"
   */
  buchungslink: "",

  /**
   * DIE EINE STELLE FÜR DAS VIDEO.
   *
   * Erwartet wird eine EIGENE Datei unter public/, zum Beispiel
   * "/videos/randolph-niermann-kurz.mp4". Bewusst keine Einbett-Adresse
   * eines fremden Dienstes: Der Abschnitt soll niemanden von außen
   * nachladen, solange die Rechtstexte nicht geklärt sind.
   *
   * Leer heißt: In der Entwicklung steht dort der Platzhalter, im
   * Betrieb gar nichts.
   */
  video: "",

  /**
   * Standbild für das Video, optional. Ohne dieses Bild zeigen die
   * Browser vor dem ersten Abspielen eine schwarze Fläche.
   * Beispiel: "/images/video/randolph-standbild.webp"
   */
  videoStandbild: "",

  /**
   * UNTERTITEL zum Video, als WebVTT-Datei unter public/.
   * Beispiel: "/videos/randolph-niermann-kurz.de.vtt"
   *
   * Warum das hier steht, obwohl es das Video noch nicht gibt: Ein
   * Video, in dem jemand spricht, TRÄGT Inhalt. Ohne Untertitel ist
   * dieser Inhalt für Gehörlose und Schwerhörige nicht da, und im
   * Zug oder im Wartezimmer für alle anderen auch nicht. Es soll
   * beim Einsetzen des Videos nicht erst auffallen, dass die Stelle
   * dafür fehlt.
   */
  videoUntertitel: "",

  /**
   * WAS NICHT PASSIERT, in ZWEI Stufen.
   *
   * Der erste Satz ist der wichtigste des Abschnitts und steht deshalb
   * gross, direkt unter der Ueberschrift: Er ist die These, alles
   * andere ist Begruendung. Vorher standen beide Saetze in einer
   * Groesse in einem Absatz, und damit stand der wichtigste Satz
   * gleichberechtigt neben dem Kleingedruckten (Befund des Inhabers,
   * 26.08.2026: "zu brav, wirkt unruhig, weil alles gleich aussieht").
   *
   * Wir koennen den ersten Satz nur deshalb hinschreiben, weil bei uns
   * wirklich Makler buchbar sind: Wer das nicht anbietet, kann es auch
   * nicht versprechen.
   */
  versprechenGross: "Hier wird Ihnen nichts verkauft.",
  versprechen:
    "Wenn ein Makler für Ihren Fall der bessere Weg ist, sagen wir Ihnen das. Sie können bei uns einen dazubuchen.",

  /**
   * DIE GRENZE, dreimal dieselbe Aussage aus drei Richtungen: Es
   * kostet Sie eine Viertelstunde, Sie müssen nichts vorbereiten, und
   * niemand sammelt dabei Angaben über Ihre Immobilie.
   */
  grenzen: ["Fünfzehn Minuten", "Keine Vorbereitung", "Keine Angaben zur Immobilie nötig"],

  /**
   * DIE ZWEI WEGE, GLEICHWERTIG. Viele Eigentümer möchten kein Video;
   * das darf nicht wie die zweite Wahl aussehen, deshalb sind beide
   * Knöpfe gleich gestaltet und stehen nebeneinander, nicht
   * untereinander.
   *
   * Beide führen auf denselben Terminplan. Welche Art gewünscht ist,
   * wählt der Besucher dort; der Anhang landet als Parameter am Link,
   * sobald Google-Termine das hergeben. Bis dahin ist `anhang` leer,
   * und beide Knöpfe öffnen dieselbe Seite. Das ist ehrlicher als ein
   * zweiter Link, den es noch nicht gibt.
   */
  wege: [
    { id: "video", label: "Videogespräch", lang: "Videogespräch vereinbaren", anhang: "" },
    { id: "telefon", label: "Telefongespräch", lang: "Telefongespräch vereinbaren", anhang: "" },
  ],

  /**
   * Die Zeile über den beiden Knöpfen. Sie trägt das Verb, damit die
   * Knöpfe selbst nur noch die Art nennen und beide auf EINER Zeile
   * bleiben. Gemessen: "Telefongespräch vereinbaren" bricht in der
   * halben Spalte ab 1024 px um, "Videogespräch vereinbaren" nicht;
   * damit sahen die beiden gleichwertigen Wege verschieden groß aus,
   * und genau das soll hier nicht passieren.
   */
  terminZeile: "Termin vereinbaren",

  /**
   * DIE FRAGEN, im Wortlaut der Besucher und nicht in unserem.
   *
   * DIE ERSTE IST DIE HERVORGEHOBENE. Sie steht gross und allein in
   * der linken Spalte, die übrigen vier kleiner rechts daneben. Wer
   * die Reihenfolge ändert, ändert damit auch, welche Frage gross
   * dasteht; das ist Absicht und die einzige Stelle, an der das
   * entschieden wird.
   *
   * Die ersten drei hat der Inhaber vorgegeben (26.08.2026). Die
   * letzten beiden sind aus dem übrigen Inhalt der Seite hergeleitet;
   * die Herleitung steht in uebergabe/34-bericht-gespraech-2026-08-26.md.
   *
   * ========================================================
   * NIEMAND DARF SIE FÜR ZITATE HALTEN (Auflage des Inhabers)
   * ========================================================
   * Vier Dinge halten das auseinander, und keines davon ist ein
   * Kleingedrucktes:
   *
   *  1. KEINE ANFÜHRUNGSZEICHEN. Ein Zitat trägt sie, eine Frage
   *     nicht. Die Stimmen-Sektion nebenan benutzt sie, dieser
   *     Abschnitt bewusst nicht; damit sehen die beiden Flächen schon
   *     von weitem verschieden aus.
   *  2. KEINE ZUSCHREIBUNG. Kein Name, kein Ort, kein Foto, kein
   *     "Frau M. aus Osnabrück". Das ist das Erkennungszeichen jedes
   *     erfundenen Kundenzitats, und es fehlt hier vollständig.
   *  3. DIE ÜBERSCHRIFT SPRICHT DEN LESER AN, nicht über Dritte:
   *     "Fragen, die Sie stellen könnten". Damit gehören die Sätze dem
   *     Leser und niemandem sonst.
   *  4. EIN SATZ, DER ES SAGT, im Schlussabsatz, in unserer Stimme.
   *
   * Was hier bewusst NICHT steht: "Diese Fragen hören wir oft." Wir
   * sind eine neue Firma und haben sie noch nicht oft gehört. Das
   * wäre genau die erfundene Zahl, die diese Seite überall vermeidet.
   */
  fragen: [
    "Ich kenne mich mit Immobilien kaum aus. Reicht das trotzdem?",
    "Ich bin am Rechner nicht besonders sicher.",
    "Was ist, wenn ich nach ein paar Wochen merke, dass ich es doch nicht selbst machen möchte?",
    "Was passiert, wenn meine Immobilie am Ende nicht verkauft wird?",
    "Muss ich die Besichtigungen wirklich alle selbst führen?",
  ],

  /** Über den Fragen. Spricht den Leser an, nicht über Dritte. */
  fragenLabel: "Fragen, die Sie stellen könnten",

  /**
   * Unter den Fragen, in unserer Stimme. Der erste Satz ist die
   * Kennzeichnung (Hausregel seit 24.08.2026: kennzeichnen statt
   * neutralisieren), der zweite gibt die Wahl zurück, der dritte zieht
   * die Grenze nach oben.
   */
  fragenSchluss:
    "Das sind Beispiele, keine Zitate von Kunden. Was Sie fragen, entscheiden Sie. Wir beantworten Fragen zur Plattform und zum Ablauf; zum Wert Ihrer Immobilie sagen wir in einem solchen Gespräch nichts, denn dafür braucht es Unterlagen und einen Blick auf das Objekt.",
} as const;

/** Ist ein Buchungslink hinterlegt? Dann ist der Abschnitt öffentlich. */
export function gespraechScharf(): boolean {
  return GESPRAECH.buchungslink.trim().length > 0;
}

/**
 * Wird der Abschnitt überhaupt gezeigt? Öffentlich nur mit Link, in
 * der Entwicklung immer, damit er sich vorher beurteilen lässt.
 */
export function gespraechSichtbar(): boolean {
  return gespraechScharf() || istEntwicklung;
}

/** Ist ein eigenes Video hinterlegt? */
export function videoVorhanden(): boolean {
  return GESPRAECH.video.trim().length > 0;
}

/**
 * Wird rechts eine Fläche gezeigt? Entweder das Video oder, nur in der
 * Entwicklung, der Platzhalter an genau seinem Platz und in seiner
 * Größe. Im Betrieb ohne Video steht dort nichts, und der Abschnitt
 * rückt in eine Spalte zusammen statt ein Loch zu lassen.
 */
export function videoFlaeche(): "video" | "platzhalter" | "keine" {
  if (videoVorhanden()) return "video";
  return istEntwicklung ? "platzhalter" : "keine";
}
