import "server-only";
import { supabaseService } from "@/lib/supabase/service";

/**
 * DER EINE PUNKT, an dem jede Meldung an den KUNDEN vorbeikommt.
 *
 * =====================================================================
 * WARUM ES DIESE DATEI GIBT, UND WARUM SIE NEBEN lib/ereignis.ts STEHT
 * =====================================================================
 * Der Inhaber hat ausdruecklich gefragt, ob lib/ereignis.ts oder
 * lib/benachrichtigung.ts das schon tragen. Gemessen am 28.08.2026:
 * beide nicht, und zwar aus je einem guten Grund.
 *
 *   lib/ereignis.ts       Der Kanal an das TEAM. Sein Empfaenger-Typ
 *                         kennt genau zwei Werte, `makler` und
 *                         `admin`; einen Kunden gibt es dort nicht.
 *                         Die Meldungen laufen nach n8n und weiter
 *                         nach Telegram, und genau deshalb steht im
 *                         Kopf jener Datei, dass sie keine Namen,
 *                         keine Adressen und keine Betraege enthalten
 *                         duerfen. Das ist ein anderer Vertrag als der
 *                         einer Meldung im eigenen Konto.
 *   lib/benachrichtigung  Der MAIL-Weg an den Kunden. 85 Zeilen, zwei
 *                         Funktionen. Er speichert nichts, zeigt
 *                         nichts und zaehlt nichts.
 *
 * Es gibt also keinen Ort. Diese Datei stellt nichts daneben, weil
 * daneben nichts steht; sie ist der dritte Kanal und uebernimmt die
 * BAUART des ersten, denn die ist gut:
 *
 *   - ein Katalog ueber ALLE Arten als `Record`. Wer eine Art
 *     hinzufuegt und ihre Regeln nicht erklaert, bekommt einen
 *     Uebersetzungsfehler statt eines stillen Ausfalls.
 *   - ein einziger Durchgangspunkt (`meldeDemKunden`), damit niemand
 *     eine Stelle vergisst, die man vergessen kann.
 *   - jede Art nennt, WOHIN sie fuehrt. Eine Meldung, die nirgendwohin
 *     fuehrt, ist keine Meldung (Auflage des Inhabers).
 *
 * =====================================================================
 * EIN EREIGNIS, KEIN ZUSTAND
 * =====================================================================
 * Regel des Hauses vom 21.08.2026: Ein Zustand wird gerechnet und nie
 * gespeichert, ein Ereignis wird gespeichert und nie gerechnet. Eine
 * Meldung ist ein Ereignis. Sie entsteht in dem Moment, in dem etwas
 * geschieht, und wird nie aus dem heutigen Stand hergeleitet.
 *
 * Die Gegenprobe dazu: "Ihr Exposé ist unvollstaendig" ist ein
 * Dauerzustand und gehoert deshalb NICHT hierher, sondern in das
 * Aufgaben-Band. Die Glocke sagt, was GESCHEHEN ist.
 *
 * =====================================================================
 * WAS HIER NIEMALS HINEINGEHOERT
 * =====================================================================
 * Keine vollstaendigen Kontaktdaten, keine Betraege aus fremden
 * Vorgaengen, nichts aus einem anderen Konto. Ein Kunde sieht nur, was
 * zu seinem eigenen Verkauf gehoert.
 *
 * "Ein neues Gebot ist eingegangen", nicht "Herr Meier bietet 340.000
 * Euro". Der Betrag steht im Bieterverfahren, wo er hingehoert und wo
 * der Rahmen ihn erklaert; in einer Zeile, die auch auf einem
 * Sperrbildschirm auftauchen kann, hat er nichts zu suchen.
 *
 * scripts/meldungen-pruefen.mts haelt die Texte dieses Katalogs gegen
 * Muster fuer Betraege, Mail-Adressen und Telefonnummern und bricht den
 * Bau. Was es NICHT sehen kann, steht dort im Kopf.
 */

/**
 * Die Arten. Zweiteilig ("bereich.was") wie bei den Team-Ereignissen,
 * damit sich in Auswertungen mit einem Praefix filtern laesst.
 *
 * DIE AUSWAHL FOLGT EINER FRAGE: Kommt das von AUSSEN oder von UNS?
 * Was der Kunde selbst gerade getan hat, gehoert nicht hierher; er
 * steht auf der Seite, die es ihm sagt. Diese eine Regel streicht die
 * Haelfte aller Kandidaten: Bestellbestaetigung, Auftragsbestaetigung,
 * Kuendigungseingang, angenommenes Gebot, jeder selbst gesetzte
 * Interessenten-Stand.
 */
export type MeldungsArt =
  /* Jemand will etwas von ihm */
  | "anfrage.eingegangen"
  | "nachricht.vom_team"
  | "nachricht.vom_makler"
  | "problem.beantwortet"
  | "nachweis.eingegangen"
  | "gebot.eingegangen"
  | "gebot.frist_abgelaufen"
  /* Wir haben etwas geliefert */
  | "bewertung.liegt_vor"
  | "auftrag.fertig"
  | "unterlage.geliefert"
  | "unterlage.werte_fehlen"
  | "foto.ki_fertig"
  | "makler.zugewiesen"
  /* Ein Termin hat sich bewegt */
  | "termin.zugesagt"
  | "termin.verschoben"
  | "termin.abgesagt"
  | "besichtigung.zugesagt"
  | "besichtigung.abgesagt"
  /* Etwas laeuft ab oder ist schiefgegangen */
  | "zahlung.fehlgeschlagen"
  | "schaltung.laeuft_ab"
  | "schaltung.abgelaufen"
  | "schaltung.start_frist"
  | "schaltung.start_verfallen"
  | "vertrag.beendet"
  | "verkauf.gemeldet";

/**
 * Welches Symbol eine Zeile traegt. Bewusst eine kurze Liste statt
 * eines Symbols je Art: Zwanzig verschiedene Bilder sind kein System
 * mehr, sondern Rauschen. Die Gruppe soll auf einen Blick erkennbar
 * sein, nicht die Einzelheit.
 */
export type MeldungsSymbol =
  | "brief"
  | "haus"
  | "kalender"
  | "geld"
  | "bild"
  | "person";

export type MeldungsArtEintrag = {
  /** Die Ueberschrift der Zeile. Kurz, ohne Punkt am Ende. */
  titel: string;
  symbol: MeldungsSymbol;
  /**
   * WOHIN DER KLICK FUEHRT. Pflichtfeld, kein optionales: Eine Meldung,
   * die nirgendwohin fuehrt, ist keine Meldung.
   *
   * Ein Pfad im Konto, mit fuehrendem Schraegstrich und ohne Basis.
   * Wo eine Kennung hineingehoert, ist es eine Funktion ueber den
   * Kennungen der Meldung.
   */
  ziel: string | ((kennungen: Record<string, string>) => string);
  /**
   * WARUM DIESE ART UEBERHAUPT MELDET. Ein Eintrag ohne Begruendung
   * ist eine Falle fuer den, der nach uns kommt: Er sieht nicht, ob
   * jemand nachgedacht hat oder ob die Zeile nur abgeschrieben wurde.
   * Dieselbe Ordnung wie in config/auftraege.ts.
   */
  grund: string;
  /**
   * FASST SICH ZUSAMMEN: Kommen mehrere Meldungen derselben Art in
   * kurzer Folge, entsteht nur EINE. Fuenf Gebote in zehn Minuten sind
   * eine Meldung, nicht fuenf. Die Zahl ist in Minuten; null heisst,
   * dass jedes Ereignis seine eigene Zeile bekommt.
   *
   * Das Vorbild ist die Sammel-Mail neues-gebot-sammel, die es fuer
   * genau diesen Fall schon gibt.
   */
  sammelnMinuten: number;
};

export const MELDUNGS_ARTEN: Record<MeldungsArt, MeldungsArtEintrag> = {
  /* ---------------------------------------------------------------- */
  /* Jemand will etwas von ihm                                         */
  /* ---------------------------------------------------------------- */
  "anfrage.eingegangen": {
    titel: "Neue Anfrage",
    symbol: "brief",
    ziel: "/konto/anfragen",
    grund:
      "Ein Mensch wartet auf Antwort, und zwar auf die des Verkaeufers, nicht auf unsere. Von allen Ereignissen im Haus ist das dasjenige, bei dem Warten am meisten kostet.",
    sammelnMinuten: 30,
  },
  "nachricht.vom_team": {
    titel: "Nachricht von uns",
    symbol: "brief",
    ziel: "/konto/nachrichten",
    grund:
      "Wir haben ihm geschrieben. Wenn er es nicht sieht, war das Schreiben umsonst.",
    sammelnMinuten: 0,
  },
  "nachricht.vom_makler": {
    titel: "Nachricht von Ihrem Ansprechpartner",
    symbol: "person",
    ziel: "/konto/nachrichten",
    grund:
      "Der Mensch, den er bezahlt, hat sich gemeldet. Eigene Art und nicht nachricht.vom_team, weil der Absender fuer ihn ein anderer ist.",
    sammelnMinuten: 0,
  },
  "problem.beantwortet": {
    titel: "Antwort auf Ihre Fehlermeldung",
    symbol: "brief",
    ziel: "/konto/nachrichten",
    grund:
      "Er hat uns auf etwas hingewiesen und wartet. Wer meldet und nie hoert, meldet kein zweites Mal.",
    sammelnMinuten: 0,
  },
  "nachweis.eingegangen": {
    titel: "Bonitätsnachweis eingereicht",
    symbol: "person",
    ziel: "/konto/interessenten",
    grund:
      "Ein Interessent hat geliefert, was der Verkaeufer angefordert hat. Erst damit kann er entscheiden, wen er zur Besichtigung laesst.",
    sammelnMinuten: 30,
  },
  "gebot.eingegangen": {
    titel: "Neues Gebot",
    symbol: "haus",
    ziel: "/konto/bieterverfahren",
    grund:
      "Der Kern des Bieterverfahrens. Er darf sich freuen, und er muss den Stand kennen, bevor die Frist laeuft.",
    /* Das laengste Sammelfenster im Katalog. In den letzten Stunden
       einer Frist kommen Gebote in Schueben; eine Zeile je Gebot
       machte die Glocke genau dann unlesbar, wenn sie am wichtigsten
       ist. Vorbild ist neues-gebot-sammel. */
    sammelnMinuten: 60,
  },
  "gebot.frist_abgelaufen": {
    titel: "Die Frist ist abgelaufen",
    symbol: "haus",
    ziel: "/konto/bieterverfahren",
    grund:
      "Jetzt muss er entscheiden, und niemand kann es fuer ihn tun. Die Bieter warten ab diesem Moment auf eine Antwort.",
    sammelnMinuten: 0,
  },

  /* ---------------------------------------------------------------- */
  /* Wir haben etwas geliefert                                         */
  /* ---------------------------------------------------------------- */
  "bewertung.liegt_vor": {
    titel: "Ihre Markteinschätzung liegt vor",
    symbol: "haus",
    ziel: "/konto/bewertung",
    grund:
      "Sie ist die Grundlage fuer alles, was danach ueber den Preis entschieden wird. Er hat darauf gewartet.",
    sammelnMinuten: 0,
  },
  "auftrag.fertig": {
    titel: "Eine Leistung ist fertig",
    symbol: "haus",
    ziel: "/konto/leistungen",
    grund:
      "Er hat bezahlt und wartet. Fuer Auftraege, deren Ergebnis KEINE Unterlage wird; sonst meldet unterlage.geliefert, weil die den genaueren Weg kennt.",
    sammelnMinuten: 0,
  },
  "unterlage.geliefert": {
    titel: "Ihre bestellte Unterlage ist da",
    symbol: "haus",
    ziel: "/konto/unterlagen",
    grund:
      "Der Anlass der Runde 35. Ohne diese Zeile liegt eine Datei im Konto, die der Kunde nicht selbst hochgeladen hat und deren Herkunft er nicht kennt. Der Text nennt AUSDRUECKLICH die fehlende Freigabe: Sonst wundert er sich in drei Wochen, warum Interessenten sie nicht sehen.",
    sammelnMinuten: 0,
  },
  "unterlage.werte_fehlen": {
    titel: "Noch eine Angabe für Ihre Anzeige",
    symbol: "haus",
    /* MITTEN IN DIE MASKE, nicht auf die Uebersicht. Der Inhaber:
       "Er soll nicht suchen muessen." Der Schritt kommt aus den
       Kennungen, damit dieselbe Art fuer Energieausweis und
       Wohnflaechenberechnung taugt. */
    ziel: (k) => `/konto/objekt?schritt=${k.schritt ?? "5"}`,
    grund:
      "Er hat das Dokument und haelt die Sache fuer erledigt. Sein Inserat bleibt trotzdem unvollstaendig, weil die Pflichtangaben daraus von Hand kommen muessen. Wir lesen aus keiner Datei etwas aus (Vorgabe des Inhabers); umso wichtiger ist, dass er weiss, dass er dran ist.",
    sammelnMinuten: 0,
  },
  "foto.ki_fertig": {
    titel: "Ihre Fotos sind fertig bearbeitet",
    symbol: "bild",
    ziel: "/konto/fotos",
    grund:
      "Gemessen am 28.08.2026: Die Foto-KI meldet an vier Stellen, alle vier an das TEAM. Der Kunde erfuhr es nur, wenn er zufaellig hinsah.",
    /* Wer zwanzig Bilder auf einmal schickt, bekommt eine Zeile und
       nicht zwanzig. Das Fenster ist laenger als die uebliche
       Bearbeitungsdauer eines Stapels. */
    sammelnMinuten: 60,
  },
  "makler.zugewiesen": {
    titel: "Ihr Ansprechpartner steht fest",
    symbol: "person",
    ziel: "/konto",
    grund:
      "Gemessen am 28.08.2026: Die Zuweisung startet Laufzeit UND Abrechnung, und der Kunde erfuhr davon gar nichts. Der einzige Vorgang im Haus, bei dem ohne sein Zutun eine wiederkehrende Abbuchung beginnt. Deshalb geht hier zusaetzlich eine Mail hinaus (lib/mail-vorlagen.ts, maklerZugewiesenMail); eine Glocke allein waere zu leise.",
    sammelnMinuten: 0,
  },

  /* ---------------------------------------------------------------- */
  /* Ein Termin hat sich bewegt                                        */
  /* ---------------------------------------------------------------- */
  "termin.zugesagt": {
    titel: "Ihr Termin steht",
    symbol: "kalender",
    ziel: "/konto/termine",
    grund: "Er muss ihn sich eintragen, und dafuer muss er ihn kennen.",
    sammelnMinuten: 0,
  },
  "termin.verschoben": {
    titel: "Ihr Termin wurde verschoben",
    symbol: "kalender",
    ziel: "/konto/termine",
    grund:
      "Ein verschobener Termin, von dem er nichts weiss, ist ein verpasster Termin.",
    sammelnMinuten: 0,
  },
  "termin.abgesagt": {
    titel: "Ihr Termin wurde abgesagt",
    symbol: "kalender",
    ziel: "/konto/termine",
    grund: "Sonst nimmt er sich einen Vormittag frei, den er nicht braucht.",
    sammelnMinuten: 0,
  },
  "besichtigung.zugesagt": {
    titel: "Eine Besichtigung ist bestätigt",
    symbol: "kalender",
    ziel: "/konto/termine",
    grund:
      "Bei einer Besichtigung muss er zu Hause sein oder jemanden schicken. Eigene Art und nicht termin.zugesagt, weil ein Interessent dabei ist und das etwas anderes von ihm verlangt.",
    sammelnMinuten: 30,
  },
  "besichtigung.abgesagt": {
    titel: "Eine Besichtigung wurde abgesagt",
    symbol: "kalender",
    ziel: "/konto/termine",
    grund: "Siehe besichtigung.zugesagt, in die andere Richtung.",
    sammelnMinuten: 30,
  },

  /* ---------------------------------------------------------------- */
  /* Etwas laeuft ab oder ist schiefgegangen                           */
  /* ---------------------------------------------------------------- */
  "zahlung.fehlgeschlagen": {
    titel: "Eine Zahlung ist nicht durchgegangen",
    symbol: "geld",
    ziel: "/konto/zahlung",
    grund:
      "Er muss handeln, sonst endet seine Leistung. KEIN BETRAG im Text: Was offen ist, steht auf der Zahlungsseite, wo der Rahmen es erklaert.",
    sammelnMinuten: 0,
  },
  "verkauf.gemeldet": {
    titel: "Ihr Verkauf ist eingetragen",
    symbol: "haus",
    ziel: "/konto/leistungen",
    grund:
      "Der Vorgang beendet das Inserat sofort und startet eine Sechs-Monats-Frist auf die Interessenten-Akten. Die Glocke steht neben der Mail, weil sie im Konto BLEIBT: Die Frist laeuft ein halbes Jahr, und wer in Monat fuenf noch etwas herunterladen will, findet die Mail nicht mehr. KEIN PREIS in der Zeile, der steht in der Mail.",
    sammelnMinuten: 0,
  },
  "vertrag.beendet": {
    titel: "Eine Leistung ist beendet",
    symbol: "geld",
    ziel: "/konto/leistungen",
    grund:
      "Der Anlass der Runde 44: Bis dahin verschwand die gekuendigte Leistung am Stichtag einfach aus der Liste, weil sie auf status = aktiv filtert. Die Mail dazu ist Pflicht; die Glocke steht daneben, weil sie im Konto BLEIBT, waehrend die Zeile in den Leistungen weg ist. KEIN BETRAG: Der steht in der Mail und auf der Rechnung.",
    sammelnMinuten: 0,
  },
  "schaltung.laeuft_ab": {
    titel: "Ihre Schaltung läuft bald ab",
    symbol: "geld",
    ziel: "/konto/objektseite",
    grund:
      "Ein Inserat, das ohne Vorwarnung verschwindet, kostet ihn Anfragen. Der Portal-EXPORT selbst meldet bewusst nie: Er laeuft bei jeder Aenderung, und eine Glocke, die zwanzigmal die Woche blinkt, sieht bald niemand mehr an.",
    sammelnMinuten: 0,
  },
  /* ---------------------------------------------------------------- */
  /* Die drei Fristen-Meldungen (Runde 45, 30.08.2026)                 */
  /* ---------------------------------------------------------------- */
  "schaltung.abgelaufen": {
    titel: "Ihre Portalschaltung ist abgelaufen",
    symbol: "geld",
    ziel: "/konto/leistungen",
    grund:
      "Der Ablauf tritt von SELBST ein, und er nimmt zwei Dinge mit: das Inserat, das man sieht, und die Antwortvorschlaege, deren Fehlen man ERST AN DER NAECHSTEN ANFRAGE merkt. Auflage des Inhabers: Die Zeile muss sagen, was jetzt anders ist, nicht nur dass etwas ablief. Eine zweite Mail gibt es an diesem Tag nicht; gewarnt wurde vierzehn Tage vorher.",
    sammelnMinuten: 0,
  },
  "schaltung.start_frist": {
    titel: "Ihre Portalschaltung wartet auf den Start",
    symbol: "geld",
    ziel: "/konto/objekt",
    grund:
      "Zwei Monate vor Ablauf der Start-Frist, neben der Mail. Anders als beim Ende der Schaltung steht hier kein Knopf daneben, der die Sache erledigt: Er muss Fotos, Unterlagen und Energieausweis zusammenbekommen, und ein Teil davon haengt an Aemtern.",
    sammelnMinuten: 0,
  },
  "schaltung.start_verfallen": {
    titel: "Die Frist für den Start ist abgelaufen",
    symbol: "geld",
    ziel: "/konto/leistungen",
    grund:
      "Der Anspruch auf die enthaltene Schaltung endet, ohne dass jemand etwas getan hat. OHNE URSACHENSATZ, auf Einwand des Inhabers: 'weil Ihr Inserat nicht veroeffentlicht wurde' klingt nach Vorwurf und nach Behoerde. Wer die Meldung bekommt, weiss ohnehin, dass er nicht veroeffentlicht hat, und wurde zwei Monate vorher erinnert.",
    sammelnMinuten: 0,
  },
};

/** Wohin diese Meldung fuehrt, aufgeloest */
export function meldungsZiel(
  art: MeldungsArt,
  kennungen: Record<string, string> = {}
): string {
  const ziel = MELDUNGS_ARTEN[art].ziel;
  return typeof ziel === "function" ? ziel(kennungen) : ziel;
}

export type KundenMeldung = {
  id: string;
  user_id: string;
  art: MeldungsArt;
  titel: string;
  zeile: string;
  ziel: string;
  symbol: MeldungsSymbol;
  kennungen: Record<string, string>;
  erledigt_am: string | null;
  erstellt_am: string;
};

export type MeldungsEingabe = {
  kundeId: string;
  art: MeldungsArt;
  /** Eine Zeile Inhalt. Ohne Namen, ohne Betraege, ohne Adressen. */
  zeile: string;
  /** Nur Kennungen, damit sich der Vorgang wiederfinden laesst */
  kennungen?: Record<string, string>;
  /**
   * Ueberschreibt den Titel des Katalogs. Sparsam verwenden: Der
   * Katalog ist der Ort, an dem die Woerter stehen sollen.
   */
  titel?: string;
};

/** Was aus einer Meldung wurde. Vorbild: MeldeBefund in lib/ereignis.ts */
export type MeldungsBefund = {
  /** Die Zeile steht. Die Glocke zeigt sie. */
  gespeichert: boolean;
  /** Es gab schon eine gleichartige im Sammelfenster, es blieb bei der */
  zusammengefasst: boolean;
  /** Warum nicht, im Klartext */
  grund: string | null;
};

/**
 * Eine Meldung an den Kunden absetzen.
 *
 * WIRFT NIE. Der Aufrufer muss nichts abfangen und darf das Ergebnis
 * ignorieren; eine Handlung darf nie an ihrer Meldung scheitern. Das
 * ist dieselbe Ordnung wie bei sendeMail() und melde().
 */
export async function meldeDemKunden(
  eingabe: MeldungsEingabe
): Promise<MeldungsBefund> {
  try {
    const service = supabaseService();
    if (!service) {
      console.error("[kunden-meldung] Kein Service-Schluessel:", eingabe.art);
      return {
        gespeichert: false,
        zusammengefasst: false,
        grund: "Kein Service-Schluessel, die Meldung ist nirgends vermerkt.",
      };
    }
    const eintrag = MELDUNGS_ARTEN[eingabe.art];
    const kennungen = eingabe.kennungen ?? {};

    /* ZUSAMMENFASSEN STATT ZAEHLEN. Gibt es im Fenster schon eine
       OFFENE Meldung derselben Art, bleibt es bei ihr; nur ihr Text
       wird auf den neuesten Stand gebracht. Eine bereits ERLEDIGTE
       faengt nichts ab: Wer sie weggeklickt hat, soll die naechste
       wieder sehen. */
    if (eintrag.sammelnMinuten > 0) {
      const seit = new Date(
        Date.now() - eintrag.sammelnMinuten * 60_000
      ).toISOString();
      const { data: offen } = await service
        .from("kunden_meldungen")
        .select("id")
        .eq("user_id", eingabe.kundeId)
        .eq("art", eingabe.art)
        .is("erledigt_am", null)
        .gte("erstellt_am", seit)
        .limit(1)
        .maybeSingle<{ id: string }>();
      if (offen) {
        /* Der Text auf den neuesten Stand, mehr nicht. GEMESSEN, nicht
           angenommen: Trifft der Update keine Zeile, ist die Meldung
           inzwischen erledigt oder weg, und dann muss eine NEUE
           entstehen statt stillschweigend keine. */
        const { data: aktualisiert } = await service
          .from("kunden_meldungen")
          .update({ zeile: eingabe.zeile })
          .eq("id", offen.id)
          .select("id");
        if ((aktualisiert ?? []).length > 0) {
          return { gespeichert: true, zusammengefasst: true, grund: null };
        }
      }
    }

    const { error } = await service.from("kunden_meldungen").insert({
      user_id: eingabe.kundeId,
      art: eingabe.art,
      titel: eingabe.titel ?? eintrag.titel,
      zeile: eingabe.zeile,
      ziel: meldungsZiel(eingabe.art, kennungen),
      symbol: eintrag.symbol,
      kennungen,
    });
    if (error) {
      console.error("[kunden-meldung] Nicht gespeichert:", error.message);
      return {
        gespeichert: false,
        zusammengefasst: false,
        grund: `Nicht gespeichert: ${error.message}`,
      };
    }
    return { gespeichert: true, zusammengefasst: false, grund: null };
  } catch (fehler) {
    // wirkung: gewollt, eine Handlung darf nie an ihrer Meldung scheitern
    console.error("[kunden-meldung] Abgebrochen:", fehler);
    return {
      gespeichert: false,
      zusammengefasst: false,
      grund: (fehler as Error).message,
    };
  }
}
