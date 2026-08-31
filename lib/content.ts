/**
 * Gemeinsame Inhalte, die an mehreren Stellen gebraucht werden
 * (z. B. FAQ auf der Seite und als JSON-LD, Portalnamen in mehreren Sektionen).
 */
import { siteConfig } from "@/site.config";

/**
 * Hauptnavigation. Anker beginnen mit "/#" und werden auf der Startseite
 * sanft gescrollt, von Unterseiten aus führen sie zurück zur Startseite.
 */
export const NAV_ITEMS = [
  { label: "So funktioniert’s", href: "/#so-funktionierts" },
  { label: "Leistungen", href: "/leistungen" },
  { label: "Pakete", href: "/#pakete" },
  /* HIESS "Ersparnis" UND ZEIGTE AUF "/#ersparnis". Der Abschnitt
     dahinter gibt es nicht mehr: Aus zwei Rechnern wurde einer, und
     der steht im Vergleich. Der Name ist bewusst mitgewandert. Wer
     im Menue sucht, sucht nicht nach unserer Ersparnis, sondern
     danach, was ihn der Verkauf kostet; und "Ersparnis" verspricht
     nur die eine Haelfte dessen, was dort jetzt steht. Der Punkt
     steht auch hinter "Pakete", weil der Abschnitt auf der Seite
     dorthin gerueckt ist. */
  { label: "Kosten", href: "/#vergleich" },
  { label: "FAQ", href: "/#faq" },
] as const;

/** Weitere Seiten, verlinkt im Footer und in der mobilen Navigation */
export const SECONDARY_NAV_ITEMS = [
  { label: "Wunsch-Paket", href: "/wunsch-paket" },
  { label: "Team", href: "/team" },
  { label: "Immobilien-Lexikon", href: "/lexikon" },
] as const;

export type FaqItem = { question: string; answer: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Ist es legal, ohne Makler zu verkaufen?",
    answer:
      "Ja. In Deutschland dürfen Sie Ihre Immobilie jederzeit selbst verkaufen, ein Makler ist gesetzlich nicht vorgeschrieben. Wichtig sind vollständige Unterlagen und ein sauberer Ablauf bis zum Notartermin. Genau dabei begleitet Sie die Plattform Schritt für Schritt.",
  },
  {
    question: "Was kostet es wirklich?",
    answer:
      "Sie zahlen einen Festpreis ab 39 € im Monat, je nach Paket auch einmalig, und alle genannten Preise enthalten die Mehrwertsteuer bereits. Eine Verkäuferprovision fällt bei uns nie an, versteckte Kosten gibt es nicht. Zum Vergleich: Bei 485.000 € Verkaufspreis liegt der Verkäuferanteil der Maklerprovision oft bei über 17.000 €.",
  },
  {
    question: "Wie bestelle ich und wie bezahle ich?",
    answer:
      "Sie wählen ein Paket oder stellen Ihr Wunsch-Paket zusammen und bestellen direkt an der Kasse. Die Zahlungsinformationen erhalten Sie mit Ihrer Auftragsbestätigung per E-Mail, die Online-Zahlung wird in Kürze freigeschaltet. Ihr Zugang und die gebuchten Leistungen starten direkt nach Zahlungseingang.",
  },
  {
    question: "Was, wenn ich nicht weiterkomme?",
    answer:
      "Dann sind Sie nicht allein. Echte Makler beantworten Ihre Fragen per Video oder Telefon, prüfen Ihre Preisstrategie und übernehmen auf Wunsch den kompletten Verkauf. Sie entscheiden, wie viel Unterstützung Sie möchten.",
  },
  {
    question: "Wer sind die Makler hinter selbst-verkauf.de?",
    answer: `Unser begleitender Makler-Partner ist die ${siteConfig.brokerPartner.company} aus ${siteConfig.brokerPartner.location}. Die begleitenden Makler Hansjörg Niermann und Andreas Hanneken erreichen Sie per Video und Telefon, im Pilotgebiet auch persönlich vor Ort.`,
  },
  {
    question: "Wie sicher sind meine Daten?",
    answer:
      "Ihre Daten werden verschlüsselt übertragen und nach DSGVO verarbeitet. Sie bestimmen, was im Exposé steht und wann es veröffentlicht wird. Ihre Telefonnummer erscheint nicht im Inserat, Anfragen laufen gebündelt über die Plattform.",
  },
  {
    question: "Wie kommt die Bewertung zustande?",
    answer: siteConfig.valuationPartner.show
      ? `Über eine direkte Schnittstelle zu unserem Bewertungspartner ${siteConfig.valuationPartner.name}. Dessen Datenbasis umfasst Millionen von Angebotspreisen und Mieten aus ganz Deutschland und wird monatlich aktualisiert. Sie erhalten eine Preisspanne mit Vergleichsobjekten, keine grobe Schätzung.`
      : `Über eine direkte Schnittstelle zu unserem Bewertungspartner, ${siteConfig.valuationPartner.neutralLabel}. Dessen Datenbasis umfasst Millionen von Angebotspreisen und Mieten aus ganz Deutschland und wird monatlich aktualisiert. Sie erhalten eine Preisspanne mit Vergleichsobjekten, keine grobe Schätzung.`,
  },
  {
    question: "Brauche ich einen Energieausweis?",
    answer:
      "Ja, spätestens zur Besichtigung ist er gesetzlich vorgeschrieben. Die Checkliste erinnert Sie rechtzeitig daran und zeigt Ihnen, wie Sie den Ausweis bestellen. Viele Eigentümer erledigen das in wenigen Tagen.",
  },
  {
    /* DIE WEITE FASSUNG WAR DIE RICHTIGE. Am 12.08.2026 wurde dieser
       Satz auf "die Monate Ihrer Makler-Begleitung" verengt, weil das
       Banner unter den Paketen es so sagte. Am 16.08.2026 hat der
       Inhaber das zurueckgenommen: Angerechnet wird alles Gezahlte.
       Beide Stellen sagen jetzt dasselbe, und hier steht zusaetzlich
       der Fall, nach dem hier gefragt wird, naemlich was gilt, wenn
       eben NICHT ueber den Partner verkauft wird.
       Gerechnet wird es in lib/anrechnung.ts. */
    question: "Kann der Makler übernehmen?",
    answer:
      "Ja, jederzeit. Ihr Makler führt den Verkauf mit allen Daten und Unterlagen aus Ihrem Konto weiter, nichts geht verloren. Alles, was Sie bis dahin bei uns bezahlt haben, wird auf die Maklerprovision angerechnet. Voraussetzung ist, dass Ihre Immobilie über die WerteImmobilien GmbH verkauft wird. Verkaufen Sie selbst oder über einen anderen Makler, entsteht keine Provision, auf die etwas anzurechnen wäre. Angerechnet wird höchstens die Provision selbst, ausgezahlt wird nichts.",
  },
];

/**
 * Ist der Live-Chat wirklich eingerichtet?
 *
 * WOZU: Bis zum 08.08.2026 stand im Fuss "Sie erreichen uns im Chat
 * unten rechts", obwohl in site.config.ts noch die Platzhalter-Kennung
 * steht. Der Knopf ist zwar da, dahinter liegt aber kein Chat, sondern
 * ein Hinweis auf die E-Mail-Adresse. Wer den Satz liest, sucht ein
 * Gespraech und findet ein Formular.
 *
 * Selbstaktivierend wie die uebrigen Anbindungen: Sobald die echte
 * Kennung eingetragen ist, stimmt der Satz von allein.
 */
export function chatEingerichtet(): boolean {
  return !siteConfig.crisp.websiteId.includes("HIER");
}
