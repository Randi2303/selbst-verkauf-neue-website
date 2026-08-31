/**
 * Immobilien-Lexikon: rund 30 Begriffe, verständlich erklärt.
 * Externe Links nur auf offizielle Quellen, sparsam eingesetzt.
 * Interne Links führen auf passende Anker der Startseite.
 */

export type LexikonLink = { label: string; href: string; extern?: boolean };

export type LexikonTerm = {
  begriff: string;
  text: string;
  link?: LexikonLink;
};

export const LEXIKON_TERMS: LexikonTerm[] = [
  {
    begriff: "Angebotspreis",
    text: "Der Preis, mit dem Ihre Immobilie im Inserat startet. Er ist ein strategischer Startpunkt und nicht automatisch der spätere Verkaufspreis. Eine realistische Preisspanne hilft, ihn klug zu wählen.",
  },
  {
    begriff: "Auflassungsvormerkung",
    text: "Ein Eintrag im Grundbuch, der den Käufer nach dem Notartermin absichert. Er verhindert, dass die Immobilie in der Zwischenzeit noch einmal verkauft oder belastet wird. Erst nach vollständiger Zahlung wird der Käufer als neuer Eigentümer eingetragen.",
  },
  {
    begriff: "Bestellerprinzip",
    text: "Gilt bei der Vermietung: Wer den Makler beauftragt, bezahlt ihn auch. Beim Verkauf gilt stattdessen seit 2020, dass sich Käufer und Verkäufer die Provision in der Regel teilen. Wer ohne Makler verkauft, spart sich diesen Anteil komplett.",
  },
  {
    begriff: "Bodenrichtwert",
    text: "Der durchschnittliche Lagewert für den reinen Grund und Boden, ermittelt von unabhängigen Gutachterausschüssen. Er wird aus echten Verkäufen der Umgebung abgeleitet und ist ein wichtiger Baustein jeder Wertermittlung.",
  },
  {
    begriff: "Bonitätsprüfung",
    text: "Der Beleg, dass ein Interessent den Kaufpreis aufbringen kann. Üblich sind eine Finanzierungsbestätigung der Bank oder ein SCHUFA-BonitätsCheck; die Aussagekraft liefert das Dokument selbst. Ob Sie den Nachweis zur Bedingung für Besichtigungen machen, entscheiden Sie selbst je Objekt.",
  },
  {
    begriff: "Courtage",
    text: "Ein anderes Wort für die Maklerprovision. Beim Verkauf über einen Makler liegt der Verkäuferanteil oft bei bis zu 3,57 Prozent des Kaufpreises. Wie viel das bei Ihrem Preis wäre, zeigt der Ersparnis-Rechner.",
    link: { label: "Zum Kostenvergleich", href: "/#vergleich" },
  },
  {
    begriff: "Energieausweis",
    text: "Ein Pflichtdokument beim Verkauf, spätestens zur Besichtigung. Der Verbrauchsausweis basiert auf dem tatsächlichen Energieverbrauch der letzten Jahre, der Bedarfsausweis auf einer technischen Berechnung des Gebäudes. Welcher zulässig ist, hängt unter anderem von Baujahr und Wohnungszahl ab.",
    link: {
      label: "Mehr bei der Verbraucherzentrale",
      href: "https://www.verbraucherzentrale.de/",
      extern: true,
    },
  },
  {
    begriff: "Erbbaurecht",
    text: "Hier gehört Ihnen das Gebäude, aber nicht das Grundstück darunter. Für die Nutzung des Bodens zahlen Sie einen Erbbauzins an den Grundstückseigentümer. Beim Verkauf muss der Erbbaurechtsvertrag mit betrachtet werden.",
  },
  {
    begriff: "Erschließungskosten",
    text: "Kosten für den Anschluss eines Grundstücks an Straße, Wasser, Abwasser und Strom. Bei älteren Grundstücken sind sie meist längst bezahlt. Ob noch Beiträge offen sind, erfahren Sie bei Ihrer Gemeinde.",
  },
  {
    begriff: "Exposé",
    text: "Die Visitenkarte Ihrer Immobilie: Fotos, Beschreibung, Grundriss und alle Pflichtangaben. Ein gutes Exposé beantwortet die wichtigsten Fragen, bevor sie gestellt werden. Wie Ihres entsteht, zeigt der Ablauf auf der Startseite.",
    link: { label: "So entsteht Ihr Exposé", href: "/#so-funktionierts" },
  },
  {
    begriff: "Flurstück",
    text: "Die kleinste amtlich vermessene Einheit im Liegenschaftskataster. Jedes Grundstück besteht aus einem oder mehreren Flurstücken mit eigener Nummer. Diese Angaben finden sich auch im Grundbuch wieder.",
  },
  {
    begriff: "GEG",
    text: "Das Gebäudeenergiegesetz regelt unter anderem, welche Energieangaben in Ihrer Anzeige stehen müssen und wann ein Energieausweis nötig ist. Fehlende Pflichtangaben können als Ordnungswidrigkeit geahndet werden.",
    link: {
      label: "GEG im Wortlaut",
      href: "https://www.gesetze-im-internet.de/geg/",
      extern: true,
    },
  },
  {
    begriff: "Grundbuch",
    text: "Das öffentliche Register, in dem Eigentum, Rechte und Belastungen eines Grundstücks stehen. Für den Verkauf brauchen Sie einen aktuellen Grundbuchauszug. Als Eigentümer erhalten Sie ihn beim Grundbuchamt, auf Wunsch übernehmen wir das.",
  },
  {
    begriff: "Grunderwerbsteuer",
    text: "Fällt beim Immobilienkauf an und wird in der Regel vom Käufer gezahlt. Je nach Bundesland liegt sie zwischen 3,5 und 6,5 Prozent des Kaufpreises. In der Verhandlung spielt sie eine Rolle, weil sie die Gesamtkosten des Käufers erhöht.",
  },
  {
    begriff: "Grundriss",
    text: "Die maßstäbliche Draufsicht auf Räume und Flächen. Neben den Fotos die meistgeklickte Ansicht in jedem Inserat. Aus alten Bauplänen lassen sich moderne, digitale Grundrisse erstellen.",
  },
  {
    begriff: "Grundschuld",
    text: "Eine Sicherheit für die Bank, eingetragen im Grundbuch, meist aus der Baufinanzierung. Beim Verkauf wird sie in der Regel gelöscht oder abgelöst, Stichwort Lastenfreistellung. Der Notar organisiert das im Hintergrund.",
  },
  {
    begriff: "Hausgeld",
    text: "Die monatliche Zahlung eines Wohnungseigentümers an die Eigentümergemeinschaft. Darin stecken Betriebskosten, Verwaltung und die Instandhaltungsrücklage. Kaufinteressenten fragen fast immer nach der Höhe.",
  },
  {
    begriff: "Instandhaltungsrücklage",
    text: "Das gemeinsame Sparpolster einer Eigentümergemeinschaft für Reparaturen am Gebäude. Beim Wohnungsverkauf geht der Anteil rechnerisch auf den Käufer über. Eine gut gefüllte Rücklage ist ein Verkaufsargument.",
  },
  {
    begriff: "Kaufnebenkosten",
    text: "Alles, was der Käufer zusätzlich zum Kaufpreis zahlt: Grunderwerbsteuer, Notar, Grundbuch und gegebenenfalls Maklerprovision. Zusammen meist rund 9 bis 12 Prozent. Ohne Maklerprovision sinken die Nebenkosten spürbar, auch das spricht beim Käufer für Ihren Privatverkauf.",
  },
  {
    begriff: "Kaufvertrag",
    text: "Der Immobilienkaufvertrag muss in Deutschland notariell beurkundet werden, sonst ist er unwirksam. Den Entwurf erhalten beide Seiten vorab in Ruhe zur Prüfung. Die gesetzliche Grundlage steht im Bürgerlichen Gesetzbuch.",
    link: {
      label: "BGB bei gesetze-im-internet.de",
      href: "https://www.gesetze-im-internet.de/bgb/",
      extern: true,
    },
  },
  {
    begriff: "Lastenfreistellung",
    text: "Bevor der Käufer Eigentümer wird, müssen eingetragene Belastungen wie Grundschulden gelöscht oder geregelt übernommen werden. Der Notar holt dafür die nötigen Erklärungen der Banken ein. Für Sie heißt das vor allem: die eigene Bank früh informieren.",
  },
  {
    begriff: "Makleralleinauftrag",
    text: "Ein Vertrag, mit dem ein einzelner Makler exklusiv verkaufen darf, oft über Monate bindend. Wer selbst verkauft, braucht ihn nicht. Und falls Sie später Unterstützung möchten, geht das bei uns jederzeit ohne lange Bindung.",
  },
  {
    begriff: "Notaranderkonto",
    text: "Ein Treuhandkonto des Notars für den Kaufpreis. Es wird heute nur noch in besonderen Fällen genutzt, meist fließt der Kaufpreis nach der Fälligkeitsmitteilung direkt an den Verkäufer. Der Notar sichert den Ablauf in beiden Varianten ab.",
  },
  {
    begriff: "Notartermin",
    text: "Der Termin, an dem der Kaufvertrag verlesen und von beiden Seiten unterschrieben wird. Der Notar erklärt den Inhalt, beantwortet Fragen und ist zur Neutralität verpflichtet. Danach laufen Zahlung und Eigentumsumschreibung nach festem Fahrplan.",
  },
  {
    begriff: "Reservierungsvereinbarung",
    text: "Damit sichert sich ein Interessent gegen Gebühr eine Immobilie für eine gewisse Zeit. Rechtlich bindet das nur begrenzt, hohe Reservierungsgebühren sind oft unwirksam. Eine geprüfte Finanzierung sagt mehr aus als jede Reservierung.",
  },
  {
    begriff: "Sanierungsstau",
    text: "Aufgeschobene Reparaturen und Modernisierungen, die sich über Jahre angesammelt haben. Käufer rechnen den Aufwand in ihr Angebot ein. Ehrlich benannte Mängel schaffen Vertrauen und ersparen Streit nach dem Verkauf.",
  },
  {
    begriff: "Spekulationsfrist",
    text: "Verkaufen Sie eine vermietete Immobilie innerhalb von zehn Jahren nach dem Kauf, kann der Gewinn einkommensteuerpflichtig sein. Für selbst genutzte Immobilien gelten Ausnahmen. Details gehören in eine Steuerberatung.",
  },
  {
    begriff: "Teilungserklärung",
    text: "Sie teilt ein Gebäude rechtlich in einzelne Wohnungen auf und regelt, was Sondereigentum und was Gemeinschaftseigentum ist. Beim Wohnungsverkauf gehört sie zu den wichtigsten Unterlagen. Käufer und deren Banken fragen früh danach.",
  },
  {
    begriff: "Übergabeprotokoll",
    text: "Bei der Schlüsselübergabe werden Zählerstände, übergebene Schlüssel und der Zustand der Immobilie schriftlich festgehalten. Beide Seiten unterschreiben. Das kleine Dokument verhindert große Diskussionen.",
  },
  {
    begriff: "Vorfälligkeitsentschädigung",
    text: "Lösen Sie Ihren Immobilienkredit vor Ende der Zinsbindung ab, verlangt die Bank dafür meist einen Ausgleich. Die Höhe hängt von Restlaufzeit und Zinsniveau ab. Fragen Sie Ihre Bank früh nach einer konkreten Berechnung.",
  },
  {
    begriff: "Wertermittlung",
    text: "Die Ermittlung eines realistischen Marktwerts, je nach Objekt über Vergleichswert, Ertragswert oder Sachwert. Daten aus echten Verkäufen zählen dabei mehr als Wunschdenken. Am Ende steht eine Spanne, aus der Sie Ihre Preisstrategie ableiten.",
    link: { label: "So entsteht unsere Bewertung", href: "/#bewertung" },
  },
  {
    begriff: "Wohnflächenberechnung",
    text: "Die Wohnfläche wird meist nach der Wohnflächenverordnung berechnet, Balkone und Terrassen zählen nur anteilig. Falsche Angaben können nach dem Verkauf teuer werden. Im Zweifel lohnt ein Nachmessen vor dem Inserat.",
  },
];

/** Umlaute für die alphabetische Gruppierung wie ihre Grundbuchstaben behandeln */
export function lexikonLetter(begriff: string): string {
  const first = begriff.charAt(0).toUpperCase();
  const map: Record<string, string> = { Ä: "A", Ö: "O", Ü: "U" };
  return map[first] ?? first;
}
