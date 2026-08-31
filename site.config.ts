/**
 * Zentrale Marken- und Produktkonfiguration für selbst-verkauf.de
 *
 * Alles, was sich bis zum Start voraussichtlich noch ändert (Name, Farben,
 * Preise, Kontakt, Chat-ID), liegt hier an einer Stelle. Die Tailwind-Config
 * importiert die Farben direkt aus dieser Datei, es gibt also keine zweite
 * Farbquelle im Projekt.
 *
 * Laufzeiten und Fristen liegen in lib/laufzeit.ts, ebenfalls eine
 * Stelle, nie zwanzig.
 */
// Relativer Pfad statt "@/": tailwind.config.ts liest diese Datei
// ausserhalb des Next-Alias-Kontexts.
import {
  SCHALTUNG_MONATE,
  SCHALTUNG_START_FRIST_MONATE,
  VERLAENGERUNG_PREIS_VORLAEUFIG,
} from "./lib/laufzeit";
import { FOTO_AUFBEREITUNG } from "./config/kontingente";
import { PORTAL_NAME, PORTALE_AUFZAEHLUNG } from "./config/portale";

/* Die beiden Varianten-Namen der Portalschaltung, aus der EINEN
   Portal-Quelle gebaut. Sie sind zugleich die Schlüssel der
   variantPrices und der Anzeigename in Warenkorb und Buchung. */
const PORTAL_EINZELN_VARIANTE = `${PORTAL_NAME.immoscout24} einzeln`;
const MULTI_PORTAL_VARIANTE = `Multi-Portal: ${PORTALE_AUFZAEHLUNG}`;

export const siteConfig = {
  /** Wortmarke: "selbst-verkauf" in Anthrazit, ".de" in Terrakotta */
  name: "selbst-verkauf.de",
  wordmark: { base: "selbst-verkauf", accent: ".de" },

  /** Produktionsdomain, verwendet für Canonical, Sitemap, robots.txt und JSON-LD */
  domain: "https://selbst-verkauf.de",

  /** SEO: Title unter 60 Zeichen, Description unter 155 Zeichen */
  title: "Immobilie selbst verkaufen ohne Makler | selbst-verkauf.de",
  description: `Verkaufen Sie Ihre Immobilie selbst: Exposé, ${PORTALE_AUFZAEHLUNG} per Klick. Echte Makler im Hintergrund. Festpreis statt Provision.`,

  /** Logo-Platzhalter: liegt in /public, später gegen das finale Logo tauschen */
  logo: { src: "/logo-platzhalter.svg", alt: "Logo von selbst-verkauf.de" },

  /**
   * Ziel aller "Anmelden"-Links in Header und Footer.
   * TODO: Später auf app.selbst-verkauf.de umstellen, dann ist die
   * Umstellung nur diese eine Zeile.
   */
  loginUrl: "/login",

  /** TODO: Platzhalter, vor Veröffentlichung durch echte Kontaktdaten ersetzen */
  contact: {
    email: "hallo@selbst-verkauf.de",
    /** TODO: echte Nummer eintragen, wird in Header und Footer angezeigt */
    phone: "02524 123456",
    /**
     * DAS POSTFACH FÜR MELDUNGEN AN DAS TEAM (31.08.2026).
     *
     * Hierhin geht, was jemanden erreichen MUSS: Geld und Fristen. Die
     * Liste der Arten steht in `lib/ereignis.ts` unter
     * `MELDUNG_PER_MAIL`, und sie ist kurz gehalten; gemessen wären es
     * sieben Mails in dreizehn Tagen gewesen.
     *
     * BEWUSST NICHT `contact.email` (Auflage des Inhabers, 31.08.2026):
     * Dort laufen Kundenanfragen auf, und eine solche Meldung nennt
     * Vorgangsdaten fremder Kunden, also Kennungen, Beträge,
     * Kündigungen. Ein Postfach, das mehrere lesen und in dem nebenbei
     * Anfragen beantwortet werden, ist dafür der falsche Ort.
     *
     * EINGERICHTET AM 31.08.2026 als Alias, vom Inhaber gemeldet und
     * am selben Tag mit einem echten Versand nachgewiesen (siehe
     * uebergabe/75-…): eine Zeile im Versandprotokoll mit
     * `erfolg = true`.
     *
     * BIS DAHIN STAND HIER `meldungen@pruef.invalid`. Die Endung ist im
     * Haus für Unzustellbares reserviert (lib/mail.ts, istUnzustellbar)
     * und erreicht Resend nie; so ließ sich der Weg bauen und prüfen,
     * ohne an ein Postfach zu senden, das es noch nicht gab.
     */
    meldungenEmail: "meldungen@selbst-verkauf.de",
  },

  /**
   * Die zwei Absender-Adressen, eine Quelle für alle Mails.
   *
   * noreply: Anmelde- und Sicherheits-Mails (Einladung, Passwort,
   * E-Mail bestätigen, Sicherheits-Hinweise). Auf diese Mails soll
   * niemand antworten, sie kommen teils von Supabase und teils von
   * uns, und eine Antwort darauf würde niemand lesen.
   *
   * antwort: Benachrichtigungen aus dem Konto (Bewertung liegt vor,
   * Termin, Antwort vom Team, Fehlermeldung beantwortet). Diese Mails
   * sind bewusst ANTWORTBAR: Wer auf die Nachricht antwortet, landet
   * im Team-Postfach, das ist der natürliche Reflex und soll
   * funktionieren.
   *
   * Wichtig: Beide Adressen müssen bei Resend auf derselben
   * verifizierten Domain liegen (siehe docs/mail-vorlagen/README.md).
   */
  mailAbsender: {
    noreply: "noreply@selbst-verkauf.de",
    antwort: "hallo@selbst-verkauf.de",
    /** Anzeigename vor der Adresse */
    name: "selbst-verkauf.de",
  },

  /** TODO: echte Profile verlinken, bis dahin Platzhalter */
  social: {
    instagram: "#",
    linkedin: "#",
    youtube: "#",
  },

  /**
   * Farbpalette. Das finale CI entsteht noch, deshalb ist hier alles
   * austauschbar. Die Keys werden 1:1 in tailwind.config.ts eingebunden.
   */
  colors: {
    background: "#FAF7F2", // warmes Offwhite, Seitenhintergrund
    paper: "#FDFBF7", // helle Karten und Mockups, kein reines Weiß
    surface: "#F1EDE6", // helles Leinen für Flächen
    surfaceTint: "#E9F0EF", // zartes Petrol-Tint für Flächen
    primary: "#17615B", // tiefes Petrol für Buttons und Icons
    primaryDark: "#114B46", // Hover-Zustand der Primärfarbe
    accent: "#D77443", // warmes Terrakotta für Zahlen und Highlights (minimal abgedunkelt für 3:1 Großtext-Kontrast auf hellen Flächen)
    accentDeep: "#9E4B1E", // dunkleres Terrakotta für kleine Texte (AA-Kontrast)
    ink: "#23272A", // Anthrazit, Fließtext
    inkMuted: "#6E6A63", // Sekundärtext
    line: "#E5DFD3", // feine 1px-Linien in warmem Grau
    success: "#3E7A5C", // gedecktes Grün, nur als kleines Funktionssignal
  },

  /**
   * Zweite Farbfassung für den Dunkelmodus. Gilt NUR im Konto und im
   * Admin, die öffentliche Website bleibt hell.
   *
   * Die Werte sind nicht umgekehrt, sondern für dunklen Grund neu
   * gewählt. Zwei Regeln stecken darin:
   *
   * 1. Die Wärme bleibt. Im Hellen ist Rot größer als Blau, das gibt
   *    dem Offwhite seinen Papierton. Dieselbe Staffelung tragen die
   *    dunklen Flächen, sonst kippt die Marke ins kalte Blaugrau.
   * 2. Flächen trennen sich über Helligkeit, nicht über Schatten. Im
   *    Hellen liegt Papier ÜBER dem Grund und wirft einen Schatten; im
   *    Dunkeln ist Papier schlicht heller als der Grund.
   *
   * Petrol und Terrakotta müssen aufgehellt werden, weil sie im
   * Dunkeln als Text und Symbol lesbar sein müssen. primaryDark ist im
   * Hellen der dunklere Hover, im Dunkeln folgerichtig der HELLERE.
   */
  colorsDunkel: {
    background: "#171614", // tiefer, warmer Grund, bewusst kein Schwarz
    paper: "#201E1B", // Karten liegen heller als der Grund
    surface: "#2A2724", // ruhige Fläche, eine Stufe darüber
    surfaceTint: "#17302E", // dieselbe Rolle wie im Hellen, in Petrol getönt
    primary: "#58BFB2", // aufgehelltes Petrol, als Text und als Knopffläche
    primaryDark: "#7ED3C7", // Hover: im Dunkeln heller statt dunkler
    accent: "#E8916A", // Terrakotta, aufgehellt für große Zahlen
    accentDeep: "#F0A882", // für kleine Versal-Labels, noch eine Stufe heller
    ink: "#EDE9E3", // warmes Offwhite als Fließtext
    inkMuted: "#A8A29A", // Sekundärtext, erreicht auf allen Flächen AA
    line: "#524C43", // deutlich kräftiger als die Spiegelung des hellen
    // Werts. Auf dunklem Grund braucht eine Linie mehr
    // Substanz, sonst verschwindet der Feldrand.
    success: "#5FB489", // gedecktes Grün, aufgehellt
  },

  /** Verkäuferanteil der Maklerprovision, Basis des Ersparnis-Rechners */
  commission: { rate: 0.0357, label: "3,57 %" },

  /**
   * Rabatt bei Sofortzahlung im Wunsch-Paket, gilt nur auf Einmalkosten.
   * TODO: finalen Satz festlegen, 10 bis 15 % sind angedacht.
   */
  instantPaymentDiscount: 0.1,

  /**
   * Preishinweis: Alle Preise sind Bruttopreise für Verbraucher
   * (Endpreise inkl. Mehrwertsteuer, Pflicht nach PAngV im B2C).
   */
  vatNote: "Alle Preise inkl. MwSt.",

  /**
   * Bewertungspartner für die Marktwert-Einschätzung.
   * TODO: Erst auf true lassen bzw. live schalten, wenn der Partnervertrag
   * mit Sprengnetter steht und die Namensnennung freigegeben ist. Bis dahin
   * bei Bedarf auf false setzen, dann erscheint überall die neutrale
   * Formulierung.
   */
  valuationPartner: {
    name: "Sprengnetter",
    /* AUS, BIS DER VERTRAG STEHT (Inhaber, 23./24.08.2026): Der Name
       eines fremden Unternehmens stand neben einer Behauptung ueber
       unsere Leistung, waehrend die Attrappe lief. Mit dem Vertrag
       wieder auf true. */
    show: false,
    neutralLabel: "einem der führenden deutschen Bewertungshäuser",
  },

  /**
   * Begleitender Makler-Partner von selbst-verkauf.de.
   *
   * Inhaltliche Grenze: Kommuniziert wird ausschließlich die Rolle als
   * begleitender Makler-Partner und die beiden begleitenden Makler.
   * Keine Aussagen zu Gesellschaftern, Geschäftsführung oder
   * Beteiligungen von selbst-verkauf.de. Alle Angaben und Zahlen
   * stammen vom Auftraggeber (Steckbriefe, 02.08.2026).
   */
  brokerPartner: {
    company: "WerteImmobilien GmbH",
    location: "Ennigerloh im Münsterland",
    website: "https://www.werteimmobilien.de",
    description:
      "Von Familie und Freunden geführtes Maklerunternehmen aus dem Münsterland. Es berät ohne Druck und begleitet Verkäufe von der Bewertung bis zur Übergabe.",
    /** Kumulierte Branchenerfahrung beider Makler, vom Auftraggeber bestätigt */
    combinedExperience: "Zusammen rund 60 Jahre Immobilienerfahrung",
    /**
     * Logo und Fotos erscheinen nur, wenn die Dateien wirklich in
     * public/images/makler/ liegen (Prüfung zur Build-Zeit), bis dahin
     * greift der Initialen-Kreis im Stil der Team-Seite.
     */
    logo: "/images/makler/werteimmobilien-logo.png",
    brokers: [
      {
        name: "Hansjörg Niermann",
        initials: "HN",
        role: "Begleitender Makler, Geschäftsführer WerteImmobilien GmbH",
        description:
          "Seit rund 30 Jahren in der Immobilienbranche, davon über 20 Jahre selbstständig mit eigenen Unternehmen, versteht er sich als Brückenbauer zwischen Immobilien und Menschen. Sein Fokus liegt auf Vermarktung, sorgfältigen Einwertungen und der Betreuung seiner Kunden, auch in schwierigen Lebenslagen.",
        image: "/images/makler/hansjoerg-niermann.webp",
        // Erscheint im Exposé (Kontaktseite) bei gebuchter Begleitung.
        // Eigene Durchwahlen gibt es nicht, telefonisch läuft alles
        // über die zentrale Nummer (contact.phone), die im Exposé
        // EINMAL genannt wird.
        email: "h.niermann@werteimmobilien.de",
      },
      {
        name: "Andreas Hanneken",
        initials: "AH",
        role: "Begleitender Makler, Geschäftsführer WerteImmobilien GmbH",
        description:
          "Gelernter Bankkaufmann und Fachberater für Finanzdienstleistungen mit rund 30 Jahren Erfahrung in Finanzierung, Objektvermittlung und Hausverwaltung. Er steht für Struktur, Verlässlichkeit und einen klaren Blick auch in komplexen Finanz- und Immobilienfragen.",
        image: "/images/makler/andreas-hanneken.webp",
        email: "a.hanneken@werteimmobilien.de",
      },
    ],
  },

  /**
   * Regler des Kostenvergleichs: obere Grenze, Schrittweite, Startwert.
   *
   * DIE UNTERE GRENZE STEHT NICHT HIER, sondern als RECHNER_MIN in
   * config/vergleich.ts: Sie ist bewusst niedriger gewaehlt, damit der
   * Punkt erreichbar bleibt, ab dem ein anderer Weg guenstiger ist.
   *
   * HIER STANDEN ZWEI WERTE MEHR, beide am 13.08.2026 entfernt:
   * "min: 150_000" wurde nur vom alten Ersparnis-Rechner gelesen, den
   * es nicht mehr gibt. "monthsEstimate: ca. 3 Monate" war eine
   * Behauptung ohne jede Grundlage und ist mit der Kachel gegangen.
   * Ein Wert, den niemand liest, ist eine Falle fuer den Naechsten.
   */
  calculator: {
    max: 2_000_000,
    step: 5_000,
    start: 485_000,
  },

  /** Pakete und Preise in Euro, bewusst als leicht änderbare Konstanten */
  packages: [
    {
      id: "basis",
      name: "Basis",
      tagline: "Zum Vorbereiten und Ausprobieren",
      monthly: 39,
      once: 99,
      /** TODO Stripe: zentraler Preis, monthly und once bleiben die Anzeige-Preise */
      price: null,
      /** TODO Stripe: price-ID des Monats-Abos aus dem Stripe-Dashboard */
      stripePriceIdMonthly: null,
      /** TODO Stripe: price-ID der Einmalzahlung aus dem Stripe-Dashboard */
      stripePriceIdOnce: null,
      /**
       * Leistungen, die in diesem Paket bereits enthalten sind. Grundlage
       * für die Vorauswahl im Konfigurator ("oder individuell erweitern").
       * TODO: Zuordnung fachlich prüfen.
       */
      includedServiceIds: [] as Array<{ id: string; variant: string | null }>,
      badge: null,
      highlighted: false,
      features: [
        "Objekt anlegen und verwalten",
        "Verkaufs-Checkliste mit allen Unterlagen",
        // "Markteinschätzung" heisst es ueberall, auch im Konto (10.08.2026)
        "Markteinschätzung",
        "Exposé-Vorschau",
        "Erklärvideos zu jedem Schritt inklusive",
      ],
    },
    {
      id: "selbst-sicher",
      name: "Selbst & Sicher",
      tagline: "Der komplette Verkauf in Ihrer Hand",
      /* 12.08.2026: von 179 auf 169 gesenkt, Folge der KI-Preissenkung
         auf 49: Bei 179 lag der Monatsweg ueber 6 Monate (1074)
         erstmals UEBER dem Einzelkauf seiner Bestandteile (1041).
         Ein Paket darf nie teurer sein als seine nachrechenbaren
         Teile; bei 169 sind es 1014 gegen 1041. */
      monthly: 169,
      /* Entschieden am 10.08.2026 (Weg A): 699 statt 899, damit der
         Einmalpreis in JEDER Lesart unter der Summe der einmaligen
         Einzelteile liegt (Expose 249 + Multi-Portal 399 +
         Bonitaetscheck 99 = 747) und der Abstand zu Rundum (899)
         den Mehrwert dort sichtbar macht. Das enthaltene
         KI-Anfragenmanagement laeuft beim Einmalkauf fuer die Dauer
         der Portalschaltung mit (ANFRAGEN_EINMALKAUF_HINWEIS in
         config/vertragstexte.ts). */
      once: 699,
      /** TODO Stripe: zentraler Preis, monthly und once bleiben die Anzeige-Preise */
      price: null,
      /** TODO Stripe: price-ID des Monats-Abos aus dem Stripe-Dashboard */
      stripePriceIdMonthly: null,
      /** TODO Stripe: price-ID der Einmalzahlung aus dem Stripe-Dashboard */
      stripePriceIdOnce: null,
      /**
       * Leistungen, die in diesem Paket bereits enthalten sind. Grundlage
       * für die Vorauswahl im Konfigurator ("oder individuell erweitern").
       * TODO: Zuordnung fachlich prüfen.
       */
      includedServiceIds: [
        { id: "web-expose", variant: null },
        { id: "portal-schaltung", variant: MULTI_PORTAL_VARIANTE },
        { id: "ki-anfragenmanagement", variant: null },
        { id: "bonitaetscheck", variant: null },
      ],
      badge: "Beliebt",
      highlighted: true,
      features: [
        "Alles aus Basis",
        "Vollständiges Exposé als PDF und online",
        /* Gekuerzt am 12.08.2026: Welche drei Portale das sind, zeigen
           die Logos direkt unter der Liste; der Text nannte dieselben
           Namen noch einmal. */
        /* DIE DAUER STEHT HIER NICHT MEHR (30.08.2026). Die
           Merkmalsliste wird fuer BEIDE Zahlweisen identisch
           gezeichnet, der Umschalter aendert nichts daran. "Sechs
           Monate Laufzeit" las damit auch, wer monatlich zahlt und
           dessen Schaltung gar nicht endet. Die Dauer haengt an der
           Zahlweise, also steht sie in der Zeile unter dem Preis,
           die den Umschalter kennt (components/sections/Pricing.tsx),
           genau wie bei den Antwortvorschlaegen. */
        "Veröffentlichung auf den drei großen Portalen",
        "Anfragen-Management mit Bonitätsnachweis",
        "Terminplaner für Besichtigungen",
        "Dashboard mit Aufrufzahlen je Portal, ab Veröffentlichung Ihres Inserats",
        "Erklärvideos zu jedem Schritt inklusive",
      ],
    },
    {
      id: "rundum",
      name: "Rundum Begleitet",
      tagline: "Mit persönlichem Makler an Ihrer Seite",
      /* Entschieden am 10.08.2026: Die Makler-Begleitung ist IMMER
         monatlich, auch hier. Der Einmalpreis deckt deshalb nur die
         einmaligen Bestandteile; die Begleitung (ansprechpartner,
         eigenstaendigMonatlich) laeuft daneben als eigene monatliche
         Position zu ihrem Leistungspreis. Im Monatspreis 279 ist sie
         dagegen ENTHALTEN, das ist der Paketvorteil gegenueber
         179 + 149 einzeln. */
      monthly: 279,
      once: 899,
      /** TODO Stripe: zentraler Preis, monthly und once bleiben die Anzeige-Preise */
      price: null,
      /** TODO Stripe: price-ID des Monats-Abos aus dem Stripe-Dashboard */
      stripePriceIdMonthly: null,
      /** TODO Stripe: price-ID der Einmalzahlung aus dem Stripe-Dashboard */
      stripePriceIdOnce: null,
      /**
       * Leistungen, die in diesem Paket bereits enthalten sind. Grundlage
       * für die Vorauswahl im Konfigurator ("oder individuell erweitern").
       * TODO: Zuordnung fachlich prüfen.
       */
      includedServiceIds: [
        { id: "web-expose", variant: null },
        { id: "portal-schaltung", variant: MULTI_PORTAL_VARIANTE },
        { id: "ki-anfragenmanagement", variant: null },
        { id: "bonitaetscheck", variant: null },
        { id: "verhandlungs-begleitung", variant: null },
        { id: "ansprechpartner", variant: null },
      ],
      badge: null,
      highlighted: false,
      features: [
        "Alles aus Selbst & Sicher",
        "Persönlicher Makler per Video und Telefon",
        "Preisstrategie-Review",
        "Coaching für Besichtigung und Verhandlung",
        "Berater geht jeden Schritt auf Wunsch mit Ihnen durch",
      ],
    },
  ],

  /** Objektarten, filtern die Leistungsliste und den Konfigurator */
  serviceCategories: [
    { id: "haus", label: "Haus" },
    { id: "wohnung", label: "Wohnung" },
    { id: "mehrfamilienhaus", label: "Mehrfamilienhaus" },
  ],

  /** Die drei Phasen des Verkaufs, gliedern Leistungsseite und Konfigurator */
  servicePhases: [
    {
      id: "aufbereitung",
      nr: "1",
      label: "Aufbereitung",
      intro:
        "Bevor Ihre Immobilie online geht, müssen Unterlagen und Zahlen stimmen. Diese Leistungen nehmen Ihnen die Behördenwege und die Technik ab.",
    },
    {
      id: "vermarktung",
      nr: "2",
      label: "Vermarktung",
      intro:
        "Jetzt entscheidet der Auftritt. Exposé, Bilder und Reichweite sorgen dafür, dass die richtigen Menschen Ihre Immobilie sehen.",
    },
    {
      id: "verkauf",
      nr: "3",
      label: "Verkauf",
      intro:
        "Vom ersten Interessenten bis zur Übergabe. Diese Leistungen halten Ihnen den Rücken frei, wenn es konkret wird.",
    },
  ],

  /**
   * Leistungskatalog für /leistungen und den Konfigurator /wunsch-paket.
   * TODO: Beispielpreise, vor Launch durch finale Preise ersetzen.
   * price gilt je Einheit (bei zählbaren Leistungen je Stück, bei
   * monatlichen je Monat), variantPrices übersteuert je Variante.
   * TODO Stripe: stripePriceId je Leistung eintragen, sobald Stripe
   * angeschlossen wird, die Seiten lesen alles über lib/checkout.ts.
   */
  services: [
    // Phase 1: Aufbereitung
    {
      id: "unterlagen-komplett",
      phase: "aufbereitung",
      name: "Unterlagen-Komplett-Service",
      description:
        /* DER SATZ NENNT JETZT, WAS JE OBJEKTART WIRKLICH DRIN IST
           (23.08.2026). Vorher hieß es "Grundbuchauszug, Flurkarte,
           Baulastenauskunft und bei Wohnungen die Teilungserklärung",
           und das stimmte, solange die Baulastenauskunft für Wohnungen
           gar nicht buchbar war.

           Seit sie es ist, wäre der Satz bei einer Wohnung eine
           Zusage über etwas, das im Preis von 179 € nicht steckt: Er
           ist aus 49 + 59 + 99 gerechnet. Ein Beschreibungstext, der
           mehr verspricht als der Preis enthält, ist schlimmer als
           eine fehlende Leistung. */
        "Wir fordern die Verkaufsunterlagen für Sie an: Grundbuchauszug und Flurkarte immer, dazu bei Haus und Mehrfamilienhaus die Baulastenauskunft und bei Wohnungseigentum die Teilungserklärung. Alles liegt geordnet an einem Ort, und Sie sehen jederzeit, was da ist und was noch fehlt. Günstiger als die Einzel-Beschaffung.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      covers: {
        ids: ["grundbuchauszug", "flurkarte", "baulastenauskunft", "teilungserklaerung"],
        reason:
          "Der Komplett-Service beschafft diese Unterlagen bereits. Wir haben sie entfernt, damit Sie nicht doppelt bezahlen.",
        /* DIE BEIDEN OBJEKTART-ABHÄNGIGEN, und warum sie hier stehen
           müssen: Der Preis ist je Objektart aus den Einzelpreisen
           gerechnet (Haus 49+59+149 = 257 auf 229, Wohnung 49+59+99 =
           207 auf 179). Was in dieser Rechnung nicht drin ist, darf
           der Komplett-Service auch nicht abdecken, sonst nimmt er
           dem Kunden eine Leistung aus dem Korb, die er nicht
           bekommt.

           Die Baulastenauskunft ist seit dem 23.08.2026 auch für
           Wohnungen buchbar, im Wohnungs-Preis aber nicht enthalten.
           Wer sie dort will, bucht sie einzeln dazu.

           DAS BLEIBT SO, entschieden vom Inhaber am 23.08.2026: Bei
           einer Wohnung wird sie selten gebraucht, und sie in den
           Preis zu nehmen hieße, dass alle Wohnungsverkäufer sie
           mitbezahlen. Erreichbar ist sie ja.

           Wer das eines Tages ändert, rechnet den Wohnungs-Preis neu
           UND streicht den Eintrag hier UND zieht den
           Beschreibungstext oben mit. Ein Preis, der stimmt, und ein
           Satz darüber, der etwas anderes verspricht, ist derselbe
           Fehler wie gar kein Preis. */
        nurBei: {
          baulastenauskunft: ["haus", "mehrfamilienhaus"],
          teilungserklaerung: ["wohnung", "mehrfamilienhaus"],
        },
      },
      /* Entschieden am 10.08.2026: zwei Preise je Objektart, beide
         UNTER der Summe der Einzel-Unterlagen (Haus und
         Mehrfamilienhaus einzeln 257, Wohnung einzeln 207). Als
         Varianten, damit der Preis ohne Umbau der Preislogik je
         Objektart stimmt. TODO Preis: Vorschlagswerte, Freigabe des
         Auftraggebers steht aus. */
      variants: ["Haus oder Mehrfamilienhaus", "Wohnung"],
      countable: false,
      recommended: false,
      price: null,
      variantPrices: {
        "Haus oder Mehrfamilienhaus": 229,
        "Wohnung": 179,
      },
      stripePriceId: null,
    },
    {
      id: "grundbuchauszug",
      phase: "aufbereitung",
      name: "Grundbuchauszug",
      description:
        "Der aktuelle Auszug aus dem Grundbuch, angefordert beim zuständigen Amt. Käufer und Banken fragen ihn als eines der ersten Dokumente an.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 49,
      stripePriceId: null,
    },
    {
      id: "flurkarte",
      phase: "aufbereitung",
      name: "Flurkarte",
      description:
        "Der amtliche Kartenauszug mit Grundstücksgrenzen und Flurstücksnummer. Gehört in jedes vollständige Verkaufsdossier.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 59,
      stripePriceId: null,
    },
    {
      id: "baulastenauskunft",
      phase: "aufbereitung",
      name: "Baulastenauskunft",
      /* AUCH BEI DER WOHNUNG, seit dem 23.08.2026 (Entscheidung des
         Inhabers). Eine Baulast liegt auf dem GRUNDSTÜCK, und beim
         Wohnungseigentum gehört das Grundstück allen Eigentümern
         gemeinsam; ein Wegerecht betrifft die Wohnung also sehr wohl.
         Wer sie nicht braucht, bucht sie nicht. Wer sie braucht und
         nicht buchen kann, schreibt uns, und wir machen es von Hand,
         nur umständlicher.

         AUFLAGE DES INHABERS: nicht hervorheben, nicht vorschlagen.
         Sie soll ERREICHBAR sein, nicht angeboten. Deshalb bleibt
         `recommended` auf false (das ist das einzige Merkmal, das eine
         Leistung im Konfigurator nach oben sortiert und mit einer
         Empfehlung versieht, siehe empfehlungFor dort), und deshalb
         nimmt der Unterlagen-Komplett-Service sie bei der Wohnung
         NICHT mit: Sonst wäre sie jedem Wohnungsverkäufer
         mitverkauft, und das ist das Gegenteil von erreichbar.

         Der Satz "auf dem Grundstück" bleibt so stehen. Er ist bei
         einer Wohnung nicht weniger wahr, sondern genau der Grund. */
      description:
        "Die Auskunft aus dem Baulastenverzeichnis zeigt, ob öffentliche Verpflichtungen auf dem Grundstück liegen. Klärt eine der häufigsten Käuferfragen vorab.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 149,
      stripePriceId: null,
    },
    {
      id: "teilungserklaerung",
      phase: "aufbereitung",
      name: "Teilungserklärung",
      /* AUCH BEIM MEHRFAMILIENHAUS, seit dem 23.08.2026. Ein in
         Eigentumswohnungen aufgeteiltes Haus hat eine
         Teilungserklärung, und wer es als Ganzes verkauft, braucht sie
         beim Notar. Vorher war die Leistung für ihn nicht buchbar und
         das Dokument hatte im Konto keinen Platz.

         Der Beschreibungstext sagt deshalb nicht mehr "beim
         Wohnungsverkauf": Der Satz hätte einen Verkäufer, dem die
         Leistung jetzt offensteht, wieder weggeschickt. */
      description:
        "Das zentrale Dokument bei Wohnungseigentum: Es regelt Sondereigentum und Gemeinschaftseigentum. Wir besorgen die beglaubigte Abschrift für Sie, auch wenn Sie ein aufgeteiltes Haus als Ganzes verkaufen.",
      categories: ["wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 99,
      stripePriceId: null,
    },
    {
      id: "grundrisse",
      phase: "aufbereitung",
      name: "Digitale Grundrisse",
      description:
        "Aus alten Plänen oder Handskizzen entstehen klare, moderne Grundrisse. Neben den Fotos die meistgeklickte Ansicht in jedem Inserat.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: true,
      unit: "Grundrisse",
      unitSingular: "Grundriss",
      recommended: true,
      price: 39,
      stripePriceId: null,
    },
    {
      id: "energieausweis",
      phase: "aufbereitung",
      name: "Energieausweis",
      description:
        "Spätestens zur Besichtigung gesetzlich vorgeschrieben. Wir organisieren die passende Variante, ohne dass Sie Formulare wälzen müssen.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: [
        "Liegt bereits vor, nur prüfen",
        "Verbrauchsausweis online",
        "Bedarfsausweis online",
        "Bedarfsausweis vor Ort",
      ],
      countable: false,
      recommended: false,
      price: null,
      variantPrices: {
        "Liegt bereits vor, nur prüfen": 0,
        "Verbrauchsausweis online": 59,
        "Bedarfsausweis online": 99,
        "Bedarfsausweis vor Ort": 399,
      },
      stripePriceId: null,
    },
    {
      id: "wohnflaechenberechnung",
      phase: "aufbereitung",
      name: "Wohnflächenberechnung",
      description:
        "Die korrekt berechnete Wohnfläche schützt Sie vor teuren Streitigkeiten nach dem Verkauf. Je nach Bedarf mit Bemaßung oder inklusive Nutzflächen.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: [
        "Nach WoFlV",
        "Nach WoFlV mit Bemaßung",
        "Wohn- und Nutzfläche",
        "Wohn- und Nutzfläche mit Bemaßung",
      ],
      countable: false,
      recommended: false,
      price: null,
      variantPrices: {
        "Nach WoFlV": 499,
        "Nach WoFlV mit Bemaßung": 649,
        "Wohn- und Nutzfläche": 749,
        "Wohn- und Nutzfläche mit Bemaßung": 899,
      },
      stripePriceId: null,
    },
    {
      id: "verkehrswertgutachten",
      phase: "aufbereitung",
      name: "Verkehrswertgutachten",
      description:
        "Ein vollständiges Gutachten durch zertifizierte Sachverständige, etwa für Erbschaft, Scheidung oder besondere Objekte. Deutlich umfassender als die automatisierte Bewertung.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 1_299,
      stripePriceId: null,
    },
    {
      id: "renditeuebersicht",
      phase: "aufbereitung",
      name: "Renditeübersicht",
      description:
        "Kaufinteressenten von Mehrfamilienhäusern rechnen zuerst. Wir bereiten Mieten, Kosten und Rendite übersichtlich und nachvollziehbar auf. Vorläufiger Preis, wird noch endgültig festgelegt.",
      categories: ["mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      /* TODO Preis: VORSCHLAG vom 13.08.2026, Freigabe steht aus.
         Vorher stand hier null: Die Leistung war im Katalog sichtbar
         und nicht kaufbar. Hergeleitet aus der Arbeit dahinter, zwei
         bis drei Stunden am Schreibtisch ohne Ortstermin und ohne
         Zertifizierung, eingeordnet zwischen der reinen Beschaffung
         (Baulastenauskunft, 149) und der Arbeit vor Ort (Rundgang,
         349). Vom Auftraggeber am 13.08.2026 auf 299 gesetzt: kleine
         Zielgruppe, keine Menge, und wahrscheinliche Nacharbeit bei
         unvollstaendigen Mietaufstellungen. */
      price: 299,
      stripePriceId: null,
    },
    // Phase 2: Vermarktung
    /* Zusammengefuehrt am 12.08.2026: Es gibt EIN Exposé, das erzeugte
       Dokument in zwei Formen (PDF und eigene Objektseite). Das
       fruehere "premium-expose" (299, nur Katalogeintrag und Icon,
       kein eigener Code) ist entfernt; niemand gestaltet ein Exposé
       von Hand. Der interne Name web-expose bleibt, an ihm haengen
       Freischaltung (EXPOSE_LEISTUNG) und Pakete. */
    {
      id: "web-expose",
      phase: "vermarktung",
      name: "Ihr Exposé, als Seite und PDF",
      nameDativ: "Ihrem Exposé als Seite und PDF",
      description:
        "Aus Ihren Angaben entsteht Ihr vollständiges Exposé mit Titelbild, Grundrissen und allen Pflichtangaben nach GEG: als hochwertig gestaltetes PDF zum Teilen und Auslegen und als eigene Seite für Ihr Objekt. Die Grundlage für jede Portalschaltung.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      /* EINE Zahl fuer die eine Exposé-Leistung */
      price: 249,
      stripePriceId: null,
    },
    {
      id: "fotografie",
      phase: "vermarktung",
      name: "Immobilienfotografie, Video und Drohnenaufnahmen",
      description:
        "Ein Profi setzt Ihre Immobilie ins richtige Licht, auf Wunsch mit kurzem Video. Drohnenaufnahmen zeigen Grundstück und Lage, besonders bei Haus und Mehrfamilienhaus.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 799,
      stripePriceId: null,
    },
    {
      id: "rundgang",
      phase: "vermarktung",
      name: "360-Grad-Rundgang",
      description:
        "Interessenten besichtigen online, bevor sie anfragen. Das spart Ihnen Termine mit Menschen, für die es doch nicht passt.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 349,
      stripePriceId: null,
    },
    {
      id: "homestaging",
      phase: "vermarktung",
      name: "Digitales Homestaging",
      description:
        "Leere oder veraltete Räume werden am Bildschirm neu eingerichtet. Welche Räume das sind, stimmen wir nach der Buchung gemeinsam ab; gestagte Bilder sind als virtuell möbliert gekennzeichnet.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: true,
      unit: "Räume",
      unitSingular: "Raum",
      recommended: false,
      price: 99,
      stripePriceId: null,
    },
    {
      id: "foto-aufbereitung",
      phase: "vermarktung",
      /* DER NAME SAGT, DASS EINE MASCHINE ES MACHT. "Weitere Bilder
         aufbereiten" liess offen, ob jemand von uns sie von Hand
         bearbeitet, und dann wundert man sich ueber zwei Euro. Genau
         umgekehrt ist es das Verkaufsargument: in Sekunden statt in
         Tagen, und deshalb zwei Euro statt zwanzig. */
      name: "Bilder von der KI verbessern lassen",
      nameDativ: "der Bildverbesserung durch die KI",
      /* Die Zahlen kommen aus config/kontingente.ts, damit dieser Satz
         nie veraltet, wenn sich das enthaltene Kontingent aendert. */
      description: `Die KI verbessert Licht, Farben und Perspektive Ihrer vorhandenen Aufnahmen, in Sekunden statt in Tagen. Auf Wunsch kann sie je Bild mehr, vom Blick aus dem Fenster bis zum ersetzten Himmel. ${FOTO_AUFBEREITUNG.inklusive} Bilder sind in jedem Paket mit Exposé enthalten, hier kaufen Sie weitere dazu.`,
      /* SEIT RUNDE 10 EHRLICH STATT PAUSCHAL: Der alte Satz "keine
         Retusche von Maengeln" stimmte nicht mehr, sobald der Kunde
         Rasen gruenen oder den Himmel ersetzen lassen kann. Die Regel
         ist jetzt: Nichts davon geschieht ungefragt, jede Moeglichkeit
         sagt beim Auswaehlen, was sie wirklich tut, und Sie sehen erst
         eine Vorschau. */
      einschraenkung:
        "Veränderungen am Bildinhalt, etwa ein ersetzter Himmel, geschehen nur, wenn Sie sie je Bild ausdrücklich anschalten, und werden dabei ehrlich benannt. Ihr Original bleibt unverändert erhalten.",
      preisHinweis: "Vorläufig, wird noch endgültig festgelegt.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      requires: {
        ids: ["web-expose"],
        reason:
          "Die Bild-Aufbereitung gehört zum Exposé. Deshalb gehört das Exposé dazu.",
      },
      variants: null,
      countable: true,
      unit: "Bilder",
      unitSingular: "Bild",
      recommended: false,
      /* TODO Preis: VORSCHLAG vom 13.08.2026, Freigabe steht aus.
         Herleitung in config/kontingente.ts. */
      price: FOTO_AUFBEREITUNG.preisJeBild,
      stripePriceId: null,
    },
    {
      id: "social-media",
      phase: "vermarktung",
      name: "Social-Media-Kampagne",
      description:
        "Ihre Immobilie erreicht auch Menschen, die gerade nicht aktiv suchen. Zielgruppengenaue Anzeigen in den sozialen Netzwerken Ihrer Region.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 399,
      stripePriceId: null,
    },
    {
      id: "portal-schaltung",
      phase: "vermarktung",
      name: "Portalschaltung",
      nameDativ: "der Portalschaltung",
      description: `Ihr Inserat live auf den großen Portalen, wahlweise nur ${PORTAL_NAME.immoscout24} oder als Multi-Portal-Paket mit ${PORTAL_NAME.kleinanzeigen} und ${PORTAL_NAME.immowelt}. Beim Einmalkauf ${SCHALTUNG_MONATE} Monate Laufzeit ab Veröffentlichung, im monatlichen Paket läuft sie, solange das Paket läuft. Alle Anfragen laufen gebündelt bei Ihnen ein.`,
      /* DIE START-FRIST (Festlegung des Inhabers, 30.08.2026).
         Sie steht hier, WEIL sie hier stehen muss: Ohne Ansage kann
         man sie niemandem entgegenhalten. Deshalb geht der Text
         voraus und der Riegel folgt; scharf wird sie erst, wenn in
         SCHALTUNG_START_FRIST_AB (lib/laufzeit.ts) ein Tag steht.
         Der Ausgang gehoert in dieselbe Passage wie die Frist,
         sonst liest man nur die Frist. */
      einschraenkung: `Starten Sie die Schaltung innerhalb von ${SCHALTUNG_START_FRIST_MONATE} Monaten nach dem Kauf. Veröffentlichen Sie bis dahin nicht, endet Ihr Anspruch auf diese Schaltung. Sie können sie danach jederzeit neu buchen, zum dann gültigen Preis. Alles andere, was Sie gekauft haben, bleibt Ihnen erhalten.`,
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      requires: {
        ids: ["web-expose"],
        reason: "Die Portale übernehmen Texte und Bilder direkt aus Ihrem Exposé. Deshalb gehört es dazu.",
      },
      /*
       * Zur angedachten Regel "Multi-Portal deckt die ImmoScout24-Einzelschaltung ab"
       * ("ImmoScout24 ist in der Multi-Portal-Schaltung bereits enthalten."):
       * Beides sind Varianten DIESER einen Leistung. Ein Variantenwechsel ersetzt
       * den Warenkorb-Eintrag, eine Doppelbuchung ist damit technisch unmöglich,
       * eine covers-Regel hätte kein Ziel.
       */
      variants: [PORTAL_EINZELN_VARIANTE, MULTI_PORTAL_VARIANTE],
      countable: false,
      recommended: true,
      price: null,
      variantPrices: {
        [PORTAL_EINZELN_VARIANTE]: 299,
        [MULTI_PORTAL_VARIANTE]: 399,
      },
      stripePriceId: null,
    },
    {
      id: "laufzeit-verlaengerung",
      phase: "vermarktung",
      name: "Verlängerung der Portallaufzeit",
      /* Die Monatszahl kommt aus lib/laufzeit.ts (SCHALTUNG_MONATE),
         damit eine geaenderte Dauer diesen Satz nie veralten laesst.
         Die Laufzeit beginnt mit der Veroeffentlichung, nicht mit der
         Bestellung; der ausfuehrliche Satz steht an Kasse und Konto
         (config/vertragstexte.ts). */
      description: `Wenn Ihr Verkauf mehr Zeit braucht, kaufen Sie zusätzliche Monate Sichtbarkeit dazu und zahlen sie einmal im Voraus.`,
      einschraenkung: `Kein laufender Vertrag, keine Kündigung nötig. Sie verlängert die befristete Portalschaltung aus dem Einmalkauf, in der ${SCHALTUNG_MONATE} Monate ab Veröffentlichung bereits enthalten sind. Im monatlichen Paket läuft die Schaltung ohnehin weiter.`,
      preisHinweis: "Vorläufig, wird noch endgültig festgelegt.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      requires: {
        ids: ["portal-schaltung"],
        reason: "Eine Verlängerung braucht eine laufende Portalschaltung. Deshalb gehört sie dazu.",
      },
      variants: null,
      countable: true,
      unit: "Monate",
      unitSingular: "Monat",
      recommended: false,
      /* TODO Preis: VORLAEUFIG (Platzhalter bis zum Immowelt-Angebot),
         Wert aus lib/laufzeit.ts, dort aendern. */
      price: VERLAENGERUNG_PREIS_VORLAEUFIG,
      stripePriceId: null,
    },
    // Phase 3: Verkauf
    {
      id: "ki-anfragenmanagement",
      phase: "verkauf",
      name: "KI-Antwortvorschläge für Anfragen",
      nameDativ: "den KI-Antwortvorschlägen für Anfragen",
      description:
        "Zu jeder Anfrage schlägt die KI eine Antwort aus Ihren Objektangaben vor, im Ton Ihrer Wahl und ohne Zusagen. Sie lesen, passen an und senden selbst. So antworten Sie schnell und durchdacht, ohne jede Mail neu zu formulieren.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      /* 12.08.2026: von 129 auf 49 gesenkt. Die 129 waren fuer
         Antworten, Vorsortierung und Terminvorschlaege gerechnet;
         solange nur der Antwortvorschlag geliefert wird, sind sie
         nicht zu rechtfertigen. Steigt wieder, sobald die
         Vorsortierung dazukommt. */
      price: 49,
      monthly: true,
      stripePriceId: null,
    },
    {
      id: "bonitaetscheck",
      phase: "verkauf",
      name: "Bonitätsnachweis für Interessenten",
      description:
        "Wir fordern bei ernsthaften Interessenten einen Bonitätsnachweis an: die Finanzierungsbestätigung ihrer Bank oder einen SCHUFA-BonitätsCheck. Jede eingereichte Unterlage wird auf Lesbarkeit und Art geprüft, den Stand sehen Sie an jeder Anfrage. Ob Sie den Nachweis zur Bedingung für Besichtigungen machen, entscheiden Sie selbst.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      /* Bindung an ki-anfragenmanagement ENTFERNT am 12.08.2026
         (bestand seit 14e9f8c vom 01.08.2026): Das Anfragen-Postfach
         ist Grundfunktion, der Nachweis haengt nicht an einer KI.
         Die Bindung haette jedem 99-Euro-Kaeufer ungefragt 129 Euro
         im Monat zugelegt. */
      variants: null,
      countable: false,
      recommended: false,
      /* Entschieden am 10.08.2026: einmalig je Objekt, nicht mehr
         monatlich. Ein Konto fuehrt derzeit genau ein Objekt. */
      price: 99,
      stripePriceId: null,
    },
    {
      id: "bieterverfahren",
      phase: "verkauf",
      name: "Bieterverfahren",
      nameDativ: "dem Bieterverfahren",
      description:
        "Sie starten mit einem bewusst attraktiven Preis, Interessenten geben innerhalb einer Frist ihr Gebot ab, und Sie entscheiden danach in Ruhe. Die Plattform ordnet die Interessenten, hält die Nachweise nach und zeigt Ihnen jedes Gebot sofort. Sie sind an kein Gebot gebunden.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      requires: {
        ids: ["portal-schaltung", "bonitaetscheck"],
        reason:
          "Ein Bieterverfahren lebt davon, dass Ihre Immobilie auf den Portalen steht und dass jedes Gebot durch einen Finanzierungsnachweis gedeckt ist. Beides gehört deshalb dazu.",
      },
      variants: null,
      countable: false,
      recommended: false,
      /** TODO Preis: Beispielpreis, vor dem Launch festlegen. Einmalig
       *  je Verkauf, nicht monatlich: Das Verfahren läuft einmal. */
      price: 349,
      stripePriceId: null,
    },
    {
      id: "besichtigungs-service",
      phase: "verkauf",
      name: "Besichtigungs-Service",
      description:
        "Ein Makler führt die Besichtigung für Sie durch, professionell und mit Blick für ernsthafte Käufer. Sie müssen nicht einmal vor Ort sein.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      /* Entschieden am 10.08.2026: je Termin, nicht pauschal */
      countable: true,
      unit: "Termine",
      unitSingular: "Termin",
      recommended: false,
      price: 399,
      stripePriceId: null,
    },
    {
      id: "verhandlungs-begleitung",
      phase: "verkauf",
      name: "Verhandlungs-Begleitung",
      description:
        "Beim Preisgespräch ist ein erfahrener Makler an Ihrer Seite, per Video oder Telefon. Sie verhandeln selbst, aber nie allein.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 299,
      stripePriceId: null,
    },
    {
      id: "notar-koordination",
      phase: "verkauf",
      name: "Notar-Koordination",
      description:
        "Wir stimmen Vertragsentwurf, Unterlagen und Termin mit dem Notariat ab. Sie gehen vorbereitet in den Termin, ohne Behörden-Pingpong.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 299,
      stripePriceId: null,
    },
    {
      id: "ansprechpartner",
      phase: "verkauf",
      name: "Makler-Begleitung",
      description:
        "Ein fester Makler begleitet Sie per Video und Telefon durch den gesamten Verkauf. Eine Nummer, ein Gesicht, keine Warteschleife. Beginnt mit der Zuweisung Ihres Ansprechpartners und ist monatlich kündbar.",
      categories: ["haus", "wohnung", "mehrfamilienhaus"],
      variants: null,
      countable: false,
      recommended: false,
      price: 149,
      monthly: true,
      /* Entschieden am 10.08.2026: Diese Leistung ist IMMER monatlich
         und steckt nie im Einmalpreis eines Pakets. Beim Einmal-Kauf
         der Paket-Basis erscheint sie als eigene monatliche Position
         (lib/preise.ts, paketEigeneMonatsposten). */
      eigenstaendigMonatlich: true,
      stripePriceId: null,
    },
  ],

  /**
   * Banner unter den Paketen.
   *
   * DIE ANRECHNUNG IST WEIT GEFASST, und das ist die Entscheidung des
   * Inhabers vom 16.08.2026: Angerechnet wird ALLES, was der Kunde bei
   * uns bezahlt hat, nicht nur die Monate der Makler-Begleitung. Die
   * frühere Verengung war falsch; die Fragen-Liste (lib/content.ts)
   * hatte mit ihrer weiten Fassung recht, und beide Stellen sagen
   * jetzt dasselbe.
   *
   * DREI AUSSAGEN, und alle drei müssen stehen bleiben, wenn jemand
   * den Satz umschreibt: alles Gezahlte, nur beim Verkauf über die
   * WerteImmobilien GmbH, höchstens in Höhe der Provision. Die dritte
   * ist keine Kleinigkeit: Bei einem kleinen Objekt kann das Gezahlte
   * die Provision übersteigen, und eine Auszahlung ist nicht gemeint.
   *
   * Gerechnet wird das in lib/anrechnung.ts, gezeigt im Konto unter
   * Leistungen und im internen Bereich an der Kundenseite.
   * TODO Anwalt: Formulierung pruefen.
   *
   * DER FIRMENNAME STEHT HIER GENAU EINMAL, und das ist kein
   * Geschmack: textMitMarken macht aus JEDEM Vorkommen einen Verweis
   * auf die Partner-Website. Beim zweiten Mal standen zwei gleiche
   * Links in drei Saetzen, und ein Vorleseprogramm sagte zweimal
   * "oeffnet eine externe Seite in neuem Fenster". Der zweite Satz
   * sagt deshalb "unser Makler-Partner"; gemeint ist dieselbe Firma,
   * die im ersten Satz mit Namen steht.
   */
  takeover: {
    title: "Wird es Ihnen zu viel? Ihr Makler übernimmt jederzeit.",
    text: "Dann übernimmt die WerteImmobilien GmbH als unser Makler-Partner. Alle Daten bleiben erhalten, und alles, was Sie bis dahin bei uns bezahlt haben, wird auf die Maklerprovision angerechnet. Das gilt beim Verkauf über unseren Makler-Partner; angerechnet wird höchstens die Provision selbst, ausgezahlt wird nichts.",
  },

  /**
   * Live-Chat über Crisp (https://crisp.chat).
   * Die Website-ID finden Sie nach der kostenlosen Registrierung in der
   * Crisp-Oberfläche unter: Einstellungen, dann Website-Einstellungen, dann
   * Einrichtung ("Website ID", eine UUID).
   * Kostenlose Alternative: Tawk.to, gleiche Einbau-Logik in ChatLauncher.tsx.
   * DSGVO: Das Script lädt erst nach Klick auf den Chat-Button, nie beim
   * Seitenaufruf. Solange hier der Platzhalter steht, zeigt der Button einen
   * freundlichen Hinweis mit E-Mail-Adresse statt des Chats.
   */
  crisp: {
    websiteId: "HIER-ID-EINTRAGEN",
    themeColor: "#17615B",
  },
} as const;

export type SitePackage = (typeof siteConfig.packages)[number];
export type SiteBroker = (typeof siteConfig.brokerPartner.brokers)[number];

/**
 * Die Kennungen ALLER Leistungen, als Aufzählung aus dem Katalog selbst.
 *
 * WOFUER DAS DA IST (16.08.2026): `config/auftraege.ts` sagt je Leistung,
 * ob ein MENSCH sie erbringt. Das war bis heute eine von Hand gepflegte
 * Liste NEBEN diesem Katalog, und genau so ist sie auseinandergelaufen:
 * elf verkaufte Leistungen brauchten einen Menschen und standen nicht
 * darin. Mit diesem Typ ist die Antwort dort ein `Record<ServiceId, …>`,
 * und eine neue Leistung hier lässt den Bau scheitern, bis jemand
 * gesagt hat, wer sie erbringt.
 */
export type ServiceId = (typeof siteConfig.services)[number]["id"];

/**
 * Abdeckungs- oder Voraussetzungs-Regel einer Leistung. Die Begründung ist
 * Pflicht: Der Satz erscheint überall dort, wo die Logik sichtbar wird
 * (Einblendung, gesperrte Karten, Warenkorb), damit automatische
 * Änderungen nie unbegründet wirken.
 */
export type ServiceRule = {
  readonly ids: readonly string[];
  /** Ehrlicher Warum-Satz in Sie-Form, ruhiger Ton */
  readonly reason: string;
  /**
   * IDs, die NUR BEI BESTIMMTEN OBJEKTARTEN abgedeckt sind.
   *
   * ================================================================
   * WOZU ES DIESES FELD GIBT (23.08.2026)
   * ================================================================
   * `covers` entfernt eine einzeln gewählte Leistung aus dem Korb, mit
   * dem Satz "Wir haben sie entfernt, damit Sie nicht doppelt
   * bezahlen". Das ist richtig, solange der Abdecker sie wirklich
   * enthält.
   *
   * Als die Baulastenauskunft auch für Wohnungen buchbar wurde, war
   * das nicht mehr der Fall: Der Unterlagen-Komplett-Service kostet
   * bei einer Wohnung 179 €, und dieser Preis ist aus 49 + 59 + 99
   * gerechnet, OHNE die 149 € der Baulastenauskunft. Ohne dieses Feld
   * hätte der Konfigurator sie dem Wohnungsverkäufer aus dem Korb
   * genommen und ihm gesagt, sie sei enthalten. Er hätte bezahlt und
   * sie nicht bekommen.
   *
   * Fehlt der Eintrag, gilt eine ID für ALLE Objektarten. Das ist der
   * Normalfall und bleibt es.
   */
  readonly nurBei?: Readonly<Record<string, readonly string[]>>;
};
export type ServiceCategoryId = (typeof siteConfig.serviceCategories)[number]["id"];
export type ServicePhaseId = (typeof siteConfig.servicePhases)[number]["id"];

/** Einheitliche Sicht auf eine Leistung, unabhängig von optionalen Feldern */
export type SiteService = {
  id: string;
  phase: ServicePhaseId;
  name: string;
  /**
   * WAS MAN BEKOMMT. Der erste Satz entscheidet, ob jemand
   * weiterliest; eine Karte wird in zwei Sekunden ueberflogen. Was
   * einschraenkt und was zum Preis gehoert, hat eigene Felder.
   */
  description: string;
  /**
   * Die ehrliche Grenze der Leistung, etwa "nur die Aufnahme, nie das
   * Objekt". Sie ist wichtig und soll bleiben, gehoert aber nicht in
   * denselben Absatz wie das Versprechen: Wer beides mischt, wird von
   * keinem der beiden gelesen.
   */
  einschraenkung?: string;
  /**
   * Hinweis, der zum PREIS gehoert und nicht zur Beschreibung, etwa
   * "vorlaeufig, wird noch festgelegt". Er steht deshalb beim Preis.
   */
  preisHinweis?: string;
  categories: readonly string[];
  variants: readonly string[] | null;
  countable: boolean;
  /** Einheit für zählbare Leistungen, z. B. "Grundrisse" oder "Monate" */
  unit?: string;
  /** Einzahl der Einheit für Preisangaben, z. B. "Grundriss" */
  unitSingular?: string;
  /** Laufende Leistung, Preis gilt je Monat */
  monthly?: boolean;
  /**
   * IMMER monatlich, nie im Einmalpreis eines Pakets enthalten: Beim
   * Einmal-Kauf einer Paket-Basis laeuft diese Leistung als eigene
   * monatliche Position weiter (lib/preise.ts).
   */
  eigenstaendigMonatlich?: boolean;
  /** Service-IDs, die diese Leistung bereits mit abdeckt (keine Doppelbuchung) */
  covers?: ServiceRule;
  /** Service-IDs, die Voraussetzung sind und automatisch mitgebucht werden */
  requires?: ServiceRule;
  /** Name mit Artikel im Dativ für Hinweistexte, z. B. "dem Web-Exposé" */
  nameDativ?: string;
  recommended: boolean;
  /** Preis in Euro je Einheit. TODO: Beispielpreis, vor Launch ersetzen */
  price: number | null;
  /** Preis je Variante, übersteuert price. TODO: Beispielpreise */
  variantPrices?: Readonly<Record<string, number>>;
  /** TODO Stripe: price-ID aus dem Stripe-Dashboard */
  stripePriceId: string | null;
};

/** Preis einer Leistung für die gewählte Variante */
export function servicePrice(service: SiteService, variant: string | null): number | null {
  if (service.variantPrices && variant !== null) {
    return service.variantPrices[variant] ?? service.price;
  }
  return service.price;
}

/**
 * Anzeigetext zum Preis, z. B. "399 €", "39 € je Grundriss",
 * "129 € je Monat". null, wenn (noch) kein Preis hinterlegt ist.
 */
export function servicePriceLabel(service: SiteService, variant: string | null): string | null {
  const price = servicePrice(service, variant);
  if (price === null) return null;
  const euro = `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(price)} €`;
  if (service.monthly) return `${euro} je Monat`;
  /* Zaehlbar mit Einheit "Monat" (Verlaengerung der Portallaufzeit):
     "89 € je Monat" las sich wie ein Abo, abgerechnet wird aber einmal
     im Voraus. Der Zusatz macht den Unterschied an der Kachel klar. */
  if (service.countable && service.unitSingular === "Monat") {
    return `${euro} je zusätzlichem Monat, einmalig im Voraus`;
  }
  if (service.countable && service.unitSingular) return `${euro} je ${service.unitSingular}`;
  return euro;
}

/** Typgeprüfte Liste aller Leistungen */
export const SERVICES: readonly SiteService[] = siteConfig.services;
