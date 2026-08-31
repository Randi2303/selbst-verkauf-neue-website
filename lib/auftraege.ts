import "server-only";
import {
  handLeistung,
  handLeistungenZu,
  type HandLeistung,
} from "@/config/auftraege";
import { werteFehlen, werteNachtrag } from "@/config/unterlagen-werte";
import { sendeHinweis } from "@/lib/benachrichtigung";
import { meldeDemKunden } from "@/lib/kunden-meldung";
import { melde } from "@/lib/ereignis";
import { auftragBestaetigungMail, auftragFertigMail } from "@/lib/mail-vorlagen";
import { supabaseService, UNTERLAGEN_BUCKET } from "@/lib/supabase/service";
import { ERLAUBTE_MIME } from "@/lib/unterlagen";
import { ausgeblieben, gewirkt, offenerText, zusammen, type Wirkung } from "@/lib/wirkung";
import { siteConfig } from "@/site.config";

/**
 * Der EINE Entstehungsweg fuer Auftraege der Hand-Leistungen
 * (config/auftraege.ts): Wird eine Buchung freigeschaltet, entsteht je
 * enthaltener Hand-Leistung ein Auftrag, das Team bekommt eine
 * Meldung, der Kunde eine kurze Bestaetigung.
 *
 * Heute ruft das die Admin-Freischaltung (/api/admin/buchungen);
 * der kuenftige Stripe-Webhook nutzt DENSELBEN Helfer, damit es nie
 * zwei Wege mit zwei Verhalten gibt.
 */

/** Zeile der Tabelle auftraege */
export type Auftrag = {
  id: string;
  user_id: string;
  buchung_id: string | null;
  leistung_id: string;
  status: "gebucht" | "in_arbeit" | "fertig";
  gebucht_am: string;
  gestartet_am: string | null;
  fertig_am: string | null;
  bearbeiter_id: string | null;
  ergebnis_art: "link" | "dateien" | "bericht" | "zuweisung";
  ergebnis_link: string | null;
  ergebnis_text: string | null;
  /**
   * Warum die letzte Fertig-Meldung NICHT durchging, im Klartext
   * (Migration 0083). Leer, solange nie etwas ausblieb; geleert beim
   * gelungenen Abschluss. Siehe auftragErgebnisUebernehmen.
   */
  fertig_offen: string | null;
};

export type AuftragDatei = {
  id: string;
  auftrag_id: string;
  datei_name: string;
  datei_pfad: string;
  mime: string;
  groesse: number | null;
  erstellt_am: string;
};

export function leistungsName(leistungId: string): string {
  return (
    siteConfig.services.find((s) => s.id === leistungId)?.name ?? leistungId
  );
}

/**
 * Der Name einer BUCHUNG, egal ob Paket oder Einzelleistung.
 *
 * WARUM ES DIESE ZWEITE FUNKTION GIBT: `leistungsName` sucht nur in
 * siteConfig.services. Ein Paket steht in siteConfig.packages und
 * fiel deshalb auf seine Kennung zurueck. Gefunden am 30.08.2026 in
 * der Ende-Probe, an einer Glocken-Zeile, die woertlich lautete:
 * "rundum ist zum 29. August 2026 beendet". Der Kunde hat sein Paket
 * nie "rundum" genannt.
 *
 * Die Kennung bleibt der letzte Rueckfall: Ein fehlender Name ist
 * haesslich, ein leerer Satz waere schlimmer.
 */
export function buchungsName(leistungId: string, art?: string | null): string {
  if (art === "paket") {
    const paket = siteConfig.packages.find((p) => p.id === leistungId);
    if (paket) return `Paket ${paket.name}`;
  }
  const dienst = siteConfig.services.find((s) => s.id === leistungId);
  if (dienst) return dienst.name;
  const paket = siteConfig.packages.find((p) => p.id === leistungId);
  return paket ? `Paket ${paket.name}` : leistungId;
}

/**
 * Hand-Leistungen, die diese Buchung abdeckt.
 *
 * ZWEI AUFLOESUNGEN, hintereinander: ein PAKET in seine enthaltenen
 * Leistungen, und danach jede Leistung ueber handLeistungenZu, das
 * BUENDEL wie den Unterlagen-Komplett-Service noch einmal aufloest.
 * Ohne die zweite Stufe erzeugte der Komplett-Service gar keinen
 * Auftrag, weil er selbst keine Hand-Leistung ist, sondern vier.
 *
 * DOPPELUNGEN FALLEN WEG: Wer den Komplett-Service und daneben eine
 * einzelne Unterlage in derselben Buchung haette, bekaeme sonst zwei
 * Auftraege fuer dasselbe Dokument.
 */
function handLeistungenDerBuchung(buchung: {
  leistung_id: string;
  art: string;
}): HandLeistung[] {
  const ids =
    buchung.art === "paket"
      ? (siteConfig.packages
          .find((p) => p.id === buchung.leistung_id)
          ?.includedServiceIds.map((e) => e.id) ?? [])
      : [buchung.leistung_id];
  const gefunden = new Map<string, HandLeistung>();
  for (const id of ids) {
    for (const hand of handLeistungenZu(id)) gefunden.set(hand.leistungId, hand);
  }
  return [...gefunden.values()];
}

/**
 * Auftraege fuer eine frisch freigeschaltete Buchung anlegen.
 * Wiederholbar: Was fuer diese Buchung schon existiert, entsteht nicht
 * noch einmal. Wirft nie.
 *
 * DIESELBE REGEL WIE BEI DER FREISCHALTUNG (16.08.2026, siehe
 * lib/wirkung.ts): Ohne Auftrag erbringt niemand die Leistung, und der
 * Kunde hat sie bezahlt. Bis heute stand der Fehlschlag nur im
 * Server-Log, und der Kommentar behauptete, er falle "ueber die
 * Team-Meldung auf" -- die aber genau dann NICHT abgesetzt wurde, weil
 * die Funktion vorher aussteigt. Jetzt bekommt der Aufrufer die
 * Antwort, und das Team eine Meldung.
 */
export async function erstelleAuftraegeFuerBuchung(buchung: {
  id: string;
  user_id: string;
  leistung_id: string;
  art: string;
}): Promise<Wirkung> {
  try {
    const service = supabaseService();
    if (!service) {
      return ausgeblieben(
        "Die Auftraege zu dieser Buchung wurden nicht angelegt: Der Dienst-Zugang zur Datenbank fehlt."
      );
    }
    const hand = handLeistungenDerBuchung(buchung);
    // Keine Hand-Leistung im Umfang: Es gibt nichts anzulegen.
    if (hand.length === 0) return gewirkt();

    const { data: vorhandene } = await service
      .from("auftraege")
      .select("leistung_id")
      .eq("buchung_id", buchung.id);
    const schon = new Set((vorhandene ?? []).map((v) => v.leistung_id as string));
    const neu = hand.filter((h) => !schon.has(h.leistungId));
    // Alles schon da: der wiederholte Aufruf, und der ist in Ordnung.
    if (neu.length === 0) return gewirkt("Die Auftraege zu dieser Buchung bestehen bereits.");

    const { data: angelegt, error } = await service
      .from("auftraege")
      .insert(
        neu.map((h) => ({
          user_id: buchung.user_id,
          buchung_id: buchung.id,
          leistung_id: h.leistungId,
          ergebnis_art: h.ergebnisArt,
        }))
      )
      .select("id");
    if (error || !angelegt || angelegt.length === 0) {
      console.error("[auftraege] Anlegen fehlgeschlagen:", error);
      const namenOffen = neu.map((h) => leistungsName(h.leistungId)).join(", ");
      await melde({
        ereignis: "auftrag.fehler",
        empfaenger: { art: "admin" },
        kurztext:
          "Eine bezahlte Hand-Leistung hat keinen Auftrag bekommen. Niemand erbringt sie, solange das so bleibt.",
        kennungen: { kunde: buchung.user_id, vorgang: buchung.id },
        adminPfad: "/admin/auftraege",
      });
      return ausgeblieben(
        `Fuer diese bezahlte Buchung ist kein Auftrag entstanden (${namenOffen}). Bitte im internen Bereich von Hand anlegen, sonst erbringt die Leistung niemand.`
      );
    }

    /* Ein Auftrag, den niemand sieht, ist keiner: Meldung an das Team */
    const namen = neu.map((h) => leistungsName(h.leistungId));
    await melde({
      ereignis: "auftrag.eingegangen",
      empfaenger: { art: "admin" },
      kurztext:
        neu.length === 1
          ? `Neuer Auftrag: ${namen[0]}`
          : `${neu.length} neue Aufträge: ${namen.join(", ")}`,
      kennungen: { kunde: buchung.user_id, vorgang: buchung.id },
      adminPfad: "/admin/auftraege",
    });

    await sendeHinweis(service, buchung.user_id, "auftrag-bestaetigung", (e) =>
      auftragBestaetigungMail({ name: e.name, leistungen: namen })
    );
    return gewirkt(
      neu.length === 1
        ? `Auftrag angelegt: ${namen[0]}.`
        : `${neu.length} Auftraege angelegt: ${namen.join(", ")}.`
    );
  } catch (fehler) {
    console.error("[auftraege] erstelleAuftraegeFuerBuchung:", fehler);
    return ausgeblieben(
      `Die Auftraege zu dieser Buchung sind nicht angelegt worden: ${(fehler as Error).message}`
    );
  }
}

/**
 * Die Zuweisung eines Maklers erledigt die Auftraege, die genau darauf
 * warten (ergebnis_art "zuweisung").
 *
 * WARUM DAS HIER UND NICHT AUF EINEM KNOPF LIEGT: Ein Schritt, der nur
 * zusammen mit einem zweiten funktioniert, gehoert in einen Vorgang und
 * nicht in eine Anleitung. Wer den Makler zuweist, hat den Auftrag
 * erfuellt; ihn danach noch von Hand fertig zu melden waere eine
 * zweite Handlung, die irgendwann jemand vergisst, und dann steht ein
 * erledigter Auftrag ewig in der Liste dessen, was liegt.
 *
 * WIEDERHOLBAR und ohne Wirkung, wenn nichts offen ist: Ein
 * Makler-WECHSEL findet keinen offenen Zuweisungs-Auftrag mehr und
 * meldet ehrlich, dass es nichts zu tun gab.
 */
export async function zuweisungsAuftraegeAbschliessen(
  userId: string,
  maklerName: string | null
): Promise<Wirkung> {
  try {
    const service = supabaseService();
    if (!service) {
      return ausgeblieben(
        "Die Auftraege zur Makler-Zuweisung wurden nicht abgeschlossen: Der Dienst-Zugang zur Datenbank fehlt."
      );
    }
    const { data: offene, error } = await service
      .from("auftraege")
      .select("*")
      .eq("user_id", userId)
      .eq("ergebnis_art", "zuweisung")
      .neq("status", "fertig")
      .returns<Auftrag[]>();
    if (error) {
      return ausgeblieben(
        `Die Auftraege zur Makler-Zuweisung liessen sich nicht laden (${error.message}). Bitte im internen Bereich von Hand fertig melden.`
      );
    }
    if (!offene || offene.length === 0) {
      return gewirkt("Es war kein Auftrag zur Makler-Zuweisung offen.");
    }

    const jetzt = new Date().toISOString();
    /* OHNE FUERWORT. "Sie erreichen ihn" waere bei einer Kollegin
       falsch, und welches Geschlecht ein Name hat, wissen wir nicht. */
    const vermerk = maklerName
      ? `Ihr Ansprechpartner ist ${maklerName}. Rückruf, Termin und Nachricht erreichen ihn ab sofort über Ihre Übersicht im Konto.`
      : "Ihr Ansprechpartner ist zugewiesen. Rückruf, Termin und Nachricht erreichen ihn ab sofort über Ihre Übersicht im Konto.";

    const erledigt: Auftrag[] = [];
    const offenGeblieben: string[] = [];
    for (const auftrag of offene) {
      const { data, error: schreibFehler } = await service
        .from("auftraege")
        .update({
          status: "fertig",
          fertig_am: jetzt,
          ergebnis_text: auftrag.ergebnis_text ?? vermerk,
        })
        .eq("id", auftrag.id)
        .neq("status", "fertig")
        .select("*")
        .returns<Auftrag[]>();
      if (schreibFehler || !data || data.length === 0) {
        offenGeblieben.push(leistungsName(auftrag.leistung_id));
        continue;
      }
      erledigt.push(data[0]);
    }

    /* Die WIRKUNG dieser Auftraege (ein zugewiesener Mensch) ist beim
       Aufrufer bereits belegt, bevor irgendein Merker stand; die
       Uebernahme ist fuer Zuweisungs-Auftraege leer und der Hinweis
       darf nach dem Merker gehen. Bleibt trotzdem etwas aus, steht es
       in der Antwort statt im Stillen. */
    for (const auftrag of erledigt) {
      const uebernahme = await auftragErgebnisUebernehmen(auftrag);
      const offen = offenerText(uebernahme);
      if (offen) offenGeblieben.push(`${leistungsName(auftrag.leistung_id)}: ${offen}`);
      await auftragFertigHinweis(auftrag);
    }

    if (offenGeblieben.length > 0) {
      return {
        ok: false,
        gewirkt: erledigt.map((a) => `${leistungsName(a.leistung_id)} fertig gemeldet.`),
        offen: [
          `Diese Auftraege sind trotz der Zuweisung offen geblieben und muessen von Hand fertig gemeldet werden: ${offenGeblieben.join(", ")}.`,
        ],
      };
    }
    return gewirkt(
      erledigt.length === 1
        ? `Der Auftrag ${leistungsName(erledigt[0].leistung_id)} ist mit der Zuweisung fertig.`
        : `${erledigt.length} Auftraege sind mit der Zuweisung fertig.`
    );
  } catch (fehler) {
    console.error("[auftraege] zuweisungsAuftraegeAbschliessen:", fehler);
    return ausgeblieben(
      `Die Auftraege zur Makler-Zuweisung sind nicht abgeschlossen worden: ${(fehler as Error).message}`
    );
  }
}

/**
 * Die Uebernahme des Ergebnisses: dorthin bringen, wo der Kunde es
 * sucht, und JEDE Wirkung einzeln messen.
 *
 * - Alles mit `objektLink` im Katalog: Der Verweis wandert an das
 *   Objekt (rundgang_link beim 360-Grad-Rundgang, film_link beim Video
 *   der Fotografie); Objektseite, Exposé und Portal-Export lesen ihn
 *   dort. WELCHE Spalte, stand bis Runde 20 als `if (leistung_id ===
 *   "rundgang")` hier im Kode; es steht jetzt im Katalog, aus demselben
 *   Grund, aus dem der Unterlagen-Typ dort steht.
 * - Alles mit `ergebnisAblage.art === "unterlage"` im Katalog: Die
 *   Ergebnis-Dateien erscheinen zusaetzlich im Unterlagen-Bereich des
 *   Kunden, unter genau diesem Typ. Bis zum 16.08.2026 galt das nur
 *   fuer Fotografie und Homestaging, und es stand als Sonderfall im
 *   Kode. Seitdem steht es im Katalog, und deshalb landet auch ein
 *   Grundbuchauszug dort, wo der Kunde ihn sucht.
 * - Videos bleiben am Auftrag: Der Unterlagen-Bereich nimmt nur PDF und
 *   Bilder an (ERLAUBTE_MIME).
 *
 * ---------------------------------------------------------------------
 * EINE DATEI, ZWEI SICHTEN (Entscheidung des Inhabers, 28.08.2026)
 * ---------------------------------------------------------------------
 * Bis heute legte diese Funktion eine KOPIE an: `storage.copy()` in ein
 * zweites Fach, und die Unterlage zeigte darauf. Zwei Dateien, zweimal
 * Speicher, und beim Austausch der einen blieb die andere stehen, ohne
 * dass es jemand erfahren haette.
 *
 * Jetzt zeigt die Unterlage auf DENSELBEN Pfad wie das
 * Auftrags-Ergebnis. Das geht, weil beide im selben Fach liegen und die
 * Speicher-Regel nur das erste Ordner-Element prueft (Migration 0005):
 * Der Kunde darf alles unter seiner eigenen Kennung lesen, gleich in
 * welchem Unterordner.
 *
 * DREI RIEGEL HAENGEN DARAN, und ohne sie waere die eine Datei
 * schlimmer als zwei:
 *   1. `unterlagen.herkunft = 'auftrag'` markiert die Zeile. Der Kunde
 *      kann sie nicht mehr loeschen, weder ueber die Oberflaeche noch
 *      ueber die Datenbank (Migration 0115, beide Schichten).
 *   2. lib/unterlagen-loeschen.ts prueft dasselbe noch einmal, denn es
 *      laeuft mit der Dienst-Rolle und umgeht damit RLS.
 *   3. Faellt der Auftrag, faellt die Datei; die Unterlagen-Zeile darf
 *      dann nicht ins Leere zeigen. Die Kaskade an `auftrag_dateien`
 *      und der Aufraeumer nehmen beide Sichten mit.
 *
 * DIE FREIGABE BLEIBT AUS, ausnahmslos (`im_expose: false`). Bis heute
 * uebernahm die Zeile die Vorbelegung des Typs, und `grundrisse` hat
 * `exposeStandard: true`: Ein gekaufter Grundriss stand damit ungefragt
 * auf der oeffentlichen Objektseite. Was ein Interessent sieht,
 * entscheidet der Verkaeufer, nicht wir. Die Vorbelegung gilt weiter
 * fuer das, was er SELBST hochlaedt; dort hat er die Datei in der Hand.
 *
 * ---------------------------------------------------------------------
 * DER MERKER STEHT ERST, WENN DIE WIRKUNG BELEGT IST (Bau-Runde 8)
 * ---------------------------------------------------------------------
 * Bis zum 17.08.2026 setzte die Route den Auftrag ZUERST auf fertig
 * und rief dann diese Nacharbeiten, die jeden Fehler verschluckten
 * (`continue` nach console.error). Ein zweiter Versuch war mit 409
 * gesperrt. Das ist woertlich die Bauart von `buchungFreischalten`
 * aus Bau-Runde 1, an einer Funktion, die schon damals auf der Liste
 * stand: Der Kunde bekommt sein bezahltes Ergebnis nicht dort, wo er
 * es sucht, und der Weg, es zu heilen, ist zu.
 *
 * Seitdem gilt dieselbe Loesung wie in lib/freischaltung.ts:
 *
 *   1. Diese Funktion misst jede Wirkung einzeln (Zeilenzahl,
 *      Speicher-Antwort) und liefert das Ergebnis als Wirkung.
 *   2. Die Route setzt `status = fertig` erst DANACH, und nur wenn
 *      alles gewirkt hat.
 *   3. Bleibt etwas aus, bleibt der Auftrag ohne Merker stehen, der
 *      Grund landet im Klartext in `auftraege.fertig_offen`
 *      (Migration 0083), und das Team bekommt eine Meldung.
 *   4. Die Wiederholung heilt wirklich: Kopien und Zeilen sind
 *      wiederholbar (vorhandene gelten als erledigt), und der zweite
 *      Druck auf "Fertig melden" laeuft denselben Weg noch einmal.
 *
 * WIRFT NIE; das Ergebnis steht im Rueckgabewert.
 */
export async function auftragErgebnisUebernehmen(
  auftrag: Auftrag
): Promise<Wirkung> {
  const service = supabaseService();
  if (!service) {
    return ausgeblieben(
      "Das Ergebnis wurde nicht uebernommen: Der Dienst-Zugang zur Datenbank fehlt."
    );
  }

  const eintrag = handLeistung(auftrag.leistung_id);
  const teile: Wirkung[] = [];

  try {
    const objektLink = eintrag?.objektLink;
    if (objektLink && auftrag.ergebnis_link) {
      /* GEMESSEN an der Zeilenzahl: Ein Konto ohne Objekt traefe null
         Zeilen, und der Link stuende nirgends. Genau dieser stille
         Ausgang hat bei der Verlaengerung 178 Euro gekostet. */
      const { data: getroffen, error } = await service
        .from("objekte")
        .update({ [objektLink.feld]: auftrag.ergebnis_link })
        .eq("user_id", auftrag.user_id)
        .select("id");
      if (error || !getroffen || getroffen.length === 0) {
        teile.push(
          ausgeblieben(
            error
              ? `Der Verweis (${objektLink.label}) liess sich nicht am Objekt speichern (${error.message}).`
              : `Der Verweis (${objektLink.label}) wurde nicht gespeichert: Der Kunde hat noch kein Objekt. Sobald eines angelegt ist, holt die erneute Fertig-Meldung das nach.`
          )
        );
      } else {
        teile.push(gewirkt(`Der Verweis steht am Objekt (${objektLink.feld}).`));
      }
    }

    const zielTyp =
      eintrag?.ergebnisAblage.art === "unterlage" ? eintrag.ergebnisAblage.typ : null;
    if (zielTyp && auftrag.ergebnis_art === "dateien") {
      const { data: objekt, error: objektFehler } = await service
        .from("objekte")
        .select("id")
        .eq("user_id", auftrag.user_id)
        .maybeSingle<{ id: string }>();
      const { data: dateien, error: dateienFehler } = await service
        .from("auftrag_dateien")
        .select("*")
        .eq("auftrag_id", auftrag.id)
        .returns<AuftragDatei[]>();
      if (objektFehler || dateienFehler) {
        teile.push(
          ausgeblieben(
            `Die Ergebnis-Dateien liessen sich nicht laden (${(objektFehler ?? dateienFehler)?.message}).`
          )
        );
      } else if (!objekt) {
        /* KEIN STILLER AUSGANG: Ohne Objekt gibt es keinen
           Unterlagen-Bereich. Der Auftrag bleibt offen und die
           Wiederholung uebernimmt die Dateien, sobald ein Objekt da
           ist; genau so heilt sich der Fall von selbst. */
        teile.push(
          ausgeblieben(
            "Die Ergebnis-Dateien wurden nicht in die Unterlagen uebernommen: Der Kunde hat noch kein Objekt. Sobald eines angelegt ist, holt die erneute Fertig-Meldung das nach."
          )
        );
      } else {
        /* Der Foto-Bereich nimmt nur Bilder, die uebrigen Typen auch
           PDF. Was der Unterlagen-Bereich gar nicht annimmt (Video),
           faellt hier heraus und bleibt am Auftrag herunterladbar. */
        const uebernehmen = (dateien ?? []).filter((d) =>
          zielTyp === "fotos"
            ? ["image/jpeg", "image/png"].includes(d.mime)
            : ERLAUBTE_MIME.includes(d.mime)
        );
        // Hinten anhaengen, nichts verdraengen
        const { count } = await service
          .from(UNTERLAGEN_BUCKET)
          .select("id", { count: "exact", head: true })
          .eq("user_id", auftrag.user_id)
          .eq("typ", zielTyp);
        let sortierung = count ?? 0;
        const uebernommen: string[] = [];
        const offenGeblieben: string[] = [];
        /* WIEDERHOLBAR OHNE DOPPELUNG: Der zweite Druck auf "Fertig
           melden" darf keine zweite Zeile auf denselben Pfad legen.
           Bis zur Kopie hing das an der Zufaelligkeit, dass der
           Zielpfad gleich blieb; jetzt wird es gefragt. */
        const { data: schonDa } = await service
          .from(UNTERLAGEN_BUCKET)
          .select("datei_pfad")
          .eq("user_id", auftrag.user_id)
          .in(
            "datei_pfad",
            uebernehmen.map((d) => d.datei_pfad)
          )
          .returns<{ datei_pfad: string }[]>();
        const bereits = new Set((schonDa ?? []).map((z) => z.datei_pfad));
        for (const datei of uebernehmen) {
          if (bereits.has(datei.datei_pfad)) {
            uebernommen.push(datei.datei_name);
            continue;
          }
          /* KEINE KOPIE MEHR (Entscheidung des Inhabers, 28.08.2026).
             Die Unterlage zeigt auf DENSELBEN Pfad wie das
             Auftrags-Ergebnis; die Begruendung samt der drei Riegel
             steht im Kopf dieser Funktion. */
          const { error: zeileFehler } = await service.from("unterlagen").insert({
            user_id: auftrag.user_id,
            objekt_id: objekt.id,
            typ: zielTyp,
            datei_name: datei.datei_name,
            datei_pfad: datei.datei_pfad,
            mime: datei.mime,
            groesse: datei.groesse,
            sortierung: sortierung++,
            /* NIEMALS VORBELEGT (Entscheidung des Inhabers,
               28.08.2026). Bis heute stand hier die Vorbelegung des
               Typs, und `grundrisse` hat exposeStandard = true: Ein
               gekaufter Grundriss stand damit ungefragt auf der
               oeffentlichen Objektseite. Gemessen mit
               scripts/ergebnis-uebernahme-probe.mts, im_expose = true.
               Was ein Interessent sieht, entscheidet der Verkaeufer.
               Die Vorbelegung gilt weiter fuer das, was er SELBST
               hochlaedt (app/api/unterlagen/route.ts). */
            im_expose: false,
            /* DIE HERKUNFT (Migration 0115). Sie traegt drei Dinge: den
               Satz am Eintrag im Konto, den Loesch-Riegel und die
               Antwort auf die Frage, warum diese Datei da ist. */
            herkunft: "auftrag",
            herkunft_auftrag_id: auftrag.id,
          });
          if (zeileFehler && !/duplicate/i.test(zeileFehler.message)) {
            /* KEIN `continue` ins Stille: Der Fehlschlag gehoert in die
               Antwort, sonst fehlt dem Kunden eine bezahlte Datei und
               niemand erfaehrt es. */
            offenGeblieben.push(`${datei.datei_name} (${zeileFehler.message})`);
            continue;
          }
          uebernommen.push(datei.datei_name);
        }
        if (offenGeblieben.length > 0) {
          teile.push({
            ok: false,
            gewirkt:
              uebernommen.length > 0
                ? [`In die Unterlagen uebernommen: ${uebernommen.join(", ")}.`]
                : [],
            offen: [
              `Diese Ergebnis-Dateien sind NICHT in den Unterlagen-Bereich gekommen: ${offenGeblieben.join("; ")}.`,
            ],
          });
        } else if (uebernommen.length > 0) {
          teile.push(
            gewirkt(
              `${uebernommen.length === 1 ? "Eine Datei" : `${uebernommen.length} Dateien`} in die Unterlagen uebernommen.`
            )
          );
        }
      }
    }
  } catch (fehler) {
    console.error("[auftraege] Uebernahme fehlgeschlagen:", fehler);
    teile.push(
      ausgeblieben(
        `Die Uebernahme des Ergebnisses ist abgebrochen: ${(fehler as Error).message}`
      )
    );
  }

  if (teile.length === 0) {
    // Nichts zu uebernehmen (Bericht, Zuweisung, Link ohne Rundgang)
    return gewirkt();
  }
  return zusammen(teile);
}

/**
 * Der Hinweis an den Kunden, dass sein Ergebnis da ist. Getrennt von
 * der Uebernahme, weil er erst NACH dem gesetzten Merker gehoert:
 * Eine Mail "Ihr Ergebnis liegt bereit" vor dem Fertig-Stand waere
 * eine Behauptung, und bei einer Wiederholung kaeme sie doppelt.
 * Die Abmeldung gilt (sendeHinweis); ein Fehlschlag steht im
 * Versandprotokoll und blockiert nichts.
 */
export async function auftragFertigHinweis(auftrag: Auftrag): Promise<void> {
  const service = supabaseService();
  if (!service) return;
  const eintrag = handLeistung(auftrag.leistung_id);
  const ablage = eintrag?.ergebnisAblage;
  const zielTyp = ablage?.art === "unterlage" ? ablage.typ : null;
  const leistung = leistungsName(auftrag.leistung_id);

  /* IST DIE UNTERLAGE WIRKLICH ANGEKOMMEN? Gefragt und nicht
     angenommen: Ein Video am Fotografie-Auftrag faellt bei der
     Uebernahme heraus (ERLAUBTE_MIME), und dann waere "Ihre bestellte
     Unterlage ist da" eine Behauptung. Dieselbe Ordnung wie beim
     Merker hinter der Wirkung. */
  let unterlagenZahl = 0;
  if (zielTyp) {
    const { count } = await service
      .from(UNTERLAGEN_BUCKET)
      .select("id", { count: "exact", head: true })
      .eq("herkunft_auftrag_id", auftrag.id);
    unterlagenZahl = count ?? 0;
  }

  await sendeHinweis(service, auftrag.user_id, "auftrag-fertig", (e) =>
    auftragFertigMail({
      name: e.name,
      leistung,
      ergebnisText: eintrag?.ergebnisText ?? "Ihr Ergebnis",
      /* DER SATZ ZUR FREIGABE (Inhaber, 28.08.2026). Er steht NUR da,
         wo tatsaechlich eine Unterlage entstanden ist; sonst waere er
         ein Versprechen auf etwas, das der Kunde nicht findet. */
      unterlageAngekommen: unterlagenZahl > 0,
    })
  );

  /* ---------------------------------------------------------------- */
  /* DIE MELDUNGEN IN DER GLOCKE                                       */
  /*                                                                   */
  /* Sie stehen HIER und nicht in der Uebernahme, aus demselben Grund,  */
  /* aus dem die Mail hier steht: Erst nach dem gesetzten Merker ist    */
  /* das Ergebnis wirklich da. Eine Meldung "Ihre Unterlage ist da"     */
  /* vor dem Fertig-Stand waere eine Behauptung, und bei einer          */
  /* Wiederholung kaeme sie doppelt.                                   */
  /* ---------------------------------------------------------------- */
  if (unterlagenZahl > 0 && zielTyp) {
    await meldeDemKunden({
      kundeId: auftrag.user_id,
      art: "unterlage.geliefert",
      /* DIE FEHLENDE FREIGABE STEHT AUSDRUECKLICH DABEI. Ohne diesen
         Satz wundert er sich in drei Wochen, warum kein Interessent
         die Datei sieht (Auflage des Inhabers). */
      zeile: `${leistung}: ${unterlagenZahl === 1 ? "Die Datei liegt" : `${unterlagenZahl} Dateien liegen`} jetzt in Ihren Unterlagen. Noch nicht für Interessenten freigegeben; das entscheiden Sie.`,
      kennungen: { auftrag: auftrag.id },
    });

    /* MIT DER DATEI IST ES NICHT IMMER GETAN. Beim Energieausweis und
       bei der Wohnflaechenberechnung fehlen danach noch Pflichtangaben
       fuer das Inserat; wir lesen sie NICHT aus der Datei aus
       (Vorgabe des Inhabers), also muss er es erfahren. */
    const nachtrag = werteNachtrag(zielTyp);
    if (nachtrag) {
      const { data: objekt } = await service
        .from("objekte")
        .select("*")
        .eq("user_id", auftrag.user_id)
        .maybeSingle<Record<string, unknown>>();
      /* NUR WENN SIE WIRKLICH FEHLEN. Wer sie laengst eingetragen hat,
         bekommt keine Mahnung fuer etwas, das er getan hat. */
      if (objekt && werteFehlen(nachtrag, objekt).length > 0) {
        await meldeDemKunden({
          kundeId: auftrag.user_id,
          art: "unterlage.werte_fehlen",
          /* DER TON FOLGT DEM GEWICHT (29.08.2026). "Ihre Anzeige ist
             angreifbar" und "das koennte noch dazu" duerfen nicht
             gleich klingen; sonst sieht er die dringende Meldung nach
             zwei leisen nicht mehr an. */
          titel:
            nachtrag.gewicht === "pflicht"
              ? "Noch eine Angabe für Ihre Anzeige"
              : "Ein Wert, der Ihr Inserat besser macht",
          zeile: nachtrag.meldungsZeile,
          kennungen: { auftrag: auftrag.id, schritt: String(nachtrag.schritt) },
        });
      }
    }
  } else {
    /* Alles Uebrige: Rundgang, Bericht, Zuweisung, und der Fall, dass
       aus einer Datei-Leistung keine Unterlage wurde (Video). */
    await meldeDemKunden({
      kundeId: auftrag.user_id,
      art: "auftrag.fertig",
      zeile: `${leistung} ist fertig. ${eintrag?.ergebnisText ?? "Ihr Ergebnis"} liegt für Sie bereit.`,
      kennungen: { auftrag: auftrag.id },
    });
  }
}
