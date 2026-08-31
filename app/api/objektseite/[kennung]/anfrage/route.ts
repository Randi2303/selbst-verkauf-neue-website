import { NextResponse } from "next/server";
import { anfrageAnlegen } from "@/lib/anfragen";
import {
  BREMS_SAETZE,
  bremsSchluessel,
  bremseVoll,
  bremseZaehlen,
  bremseZuruecknehmen,
  GRENZEN,
  klientAdresse,
} from "@/lib/bremse";
import { melde } from "@/lib/ereignis";
import { sendeMail } from "@/lib/mail";
import { notbremseMail } from "@/lib/mail-vorlagen";
import { supabaseService } from "@/lib/supabase/service";
import { pflichtMail } from "@/config/pflicht-mails";

/**
 * Nimmt eine Anfrage von der oeffentlichen Objektseite entgegen.
 *
 * OEFFENTLICH und bewusst schmal: Geprueft wird hier, ob die Seite
 * ueberhaupt Anfragen annimmt, ob die Eingaben taugen und ob eine der
 * Grenzen aus lib/bremse.ts greift. Alles Weitere, also Zeile, Akte,
 * Expose-Link, Kunden-Benachrichtigung und Team-Meldung, macht
 * anfrageAnlegen() in lib/anfragen.ts, damit jede Quelle denselben
 * Weg nimmt. Die Honigfalle (Feld "firma") antwortet Bots freundlich
 * mit ok, ohne etwas zu speichern.
 *
 * DIE GRENZEN, seit Bau-Runde 6 (17.08.2026). Gemessen waren elf
 * Absendungen in sieben Sekunden, jede mit Mail an den Verkaeufer und
 * bei veroeffentlichtem Objekt einem weiteren gueltigen Expose-Zugang.
 * Vier Schichten, von innen nach aussen:
 *
 * 1. Dieselbe Absendung noch einmal (Doppelklick): still ok, nichts
 *    entsteht doppelt. Der Mensch merkt nichts, und so soll es sein.
 * 2. Dieselbe E-Mail zum selben Objekt, ein Tag: nach der dritten
 *    Absendung ein freundlicher Satz, dass die Anfrage schon da ist.
 * 3. Derselbe Anschluss: zwei Fenster (zehn Minuten, eine Stunde)
 *    ueber alle Objekte. Bewusst weit, weil hinter EINER Adresse
 *    viele Menschen sitzen koennen (Buerohaus, Mobilfunk-NAT); die
 *    engen Grenzen haengen deshalb an E-Mail und Objekt, nicht hier.
 * 4. Die Notbremse je Objekt und Tag: Anfragen werden WEITER
 *    angenommen und gespeichert, aber die Mails je Anfrage setzen
 *    aus, damit das Postfach des Verkaeufers brauchbar bleibt. Das
 *    Team bekommt beim Kippen genau eine Meldung.
 *
 * Kein Satz nach aussen nennt Zahlen, Fenster oder Zeitpunkte.
 */

const MAX = { name: 120, email: 200, telefon: 60, nachricht: 4000 };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kennung: string }> }
) {
  const { kennung } = await params;
  const service = supabaseService();
  if (!service) {
    return NextResponse.json({ meldung: "Gerade nicht verfügbar." }, { status: 503 });
  }
  const daten = (await request.json().catch(() => null)) as {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    nachricht?: string;
    firma?: string;
  } | null;
  if (!daten) {
    return NextResponse.json({ meldung: "Ungültige Anfrage." }, { status: 400 });
  }
  // Honigfalle: gefuellt heisst Bot. Freundlich ok sagen, nichts tun.
  if (daten.firma?.trim()) {
    return NextResponse.json({ ok: true });
  }

  const vorname = daten.vorname?.trim().slice(0, MAX.name) ?? "";
  const nachname = daten.nachname?.trim().slice(0, MAX.name) ?? "";
  const email = daten.email?.trim().slice(0, MAX.email) ?? "";
  const telefon = daten.telefon?.trim().slice(0, MAX.telefon) || null;
  const nachricht = daten.nachricht?.trim().slice(0, MAX.nachricht) || null;
  if (!vorname || !nachname || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { meldung: "Bitte Vorname, Nachname und eine gültige E-Mail-Adresse angeben." },
      { status: 400 }
    );
  }

  /* SCHICHT 1: Der Doppelklick. Dieselbe Absendung (Objekt, E-Mail,
     Nachricht) innerhalb des Fensters wird still als die eine
     Absendung behandelt, die gemeint war. VOR den anderen Schichten,
     damit ein Doppelklick nicht auf deren Zaehler geht. Synchron im
     Speicher, deshalb sieht der zweite Klick den ersten auch dann,
     wenn dessen Zeile noch nicht geschrieben ist. */
  const doppeltSchluessel = bremsSchluessel(
    "anfrage-doppelt",
    kennung,
    email.toLowerCase(),
    nachricht
  );
  const doppeltZaehler = bremseZaehlen(
    doppeltSchluessel,
    GRENZEN.anfrage.doppeltFensterSekunden
  );
  if (doppeltZaehler > 1) {
    return NextResponse.json({ ok: true });
  }

  /* SCHICHT 3 (vor der Objekt-Abfrage, damit auch das Abtasten
     erfundener Kennungen auf den Anschluss zaehlt): die zwei
     Anschluss-Fenster. Ohne bekannte Adresse setzen beide aus. */
  const adresse = klientAdresse(request);
  if (adresse) {
    const kurzVoll = bremseVoll(
      bremsSchluessel("anfrage-ip-kurz", adresse),
      GRENZEN.anfrage.jeAdresseKurz
    );
    const stundeVoll = bremseVoll(
      bremsSchluessel("anfrage-ip-stunde", adresse),
      GRENZEN.anfrage.jeAdresseStunde
    );
    if (kurzVoll || stundeVoll) {
      return NextResponse.json({ meldung: BREMS_SAETZE.anfrageSpaeter }, { status: 429 });
    }
  }

  const { data: objekt } = await service
    .from("objekte")
    .select("id, user_id, seite_freigegeben, verkauf_abgeschlossen_am")
    .eq("seite_kennung", kennung)
    .maybeSingle<{
      id: string;
      user_id: string;
      seite_freigegeben: boolean;
      verkauf_abgeschlossen_am: string | null;
    }>();
  if (!objekt || !objekt.seite_freigegeben || objekt.verkauf_abgeschlossen_am) {
    return NextResponse.json({ meldung: "Diese Seite nimmt keine Anfragen mehr an." }, { status: 404 });
  }

  /* SCHICHT 2 UND 4 zaehlen ZEILEN statt eines eigenen Zaehlers: Die
     Anfragen der letzten 24 Stunden stehen in der Datenbank, diese
     Zaehlung ueberlebt jeden Neustart und kann nicht abweichen.
     Gezaehlt wird nur portal='objektseite'; was ueber Portale kommt,
     hat eigene Doppel-Erkennung und geht diesen Weg nicht. */
  const seit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: vonDieserEmail }, { count: amObjekt }] = await Promise.all([
    service
      .from("anfragen")
      .select("id", { count: "exact", head: true })
      .eq("objekt_id", objekt.id)
      .eq("portal", "objektseite")
      .eq("email", email)
      .gte("eingegangen_am", seit),
    service
      .from("anfragen")
      .select("id", { count: "exact", head: true })
      .eq("objekt_id", objekt.id)
      .eq("portal", "objektseite")
      .gte("eingegangen_am", seit),
  ]);

  /* SCHICHT 2: Diese E-Mail hat den Verkaeufer heute schon erreicht.
     Der Satz sagt genau das; er nennt weder Zahl noch Fenster. */
  if ((vonDieserEmail ?? 0) >= GRENZEN.anfrage.jeEmailUndObjekt24h) {
    return NextResponse.json({ meldung: BREMS_SAETZE.anfrageBereitsDa }, { status: 429 });
  }

  /* SCHICHT 4: Die Notbremse je Objekt. Nicht abweisen, sondern
     stumm speichern: Die Zeile und die Akte entstehen weiter und
     stehen im Posteingang, nur Mails und Team-Meldung je Anfrage
     setzen aus, ebenso der automatische Expose-Versand. Beim Kippen
     bekommt das Team genau eine Meldung; laufen zwei Absendungen
     gleichzeitig ueber die Schwelle, im schlimmsten Fall zwei. */
  const gebremst = (amObjekt ?? 0) >= GRENZEN.anfrage.jeObjekt24h;
  if ((amObjekt ?? 0) === GRENZEN.anfrage.jeObjekt24h) {
    await melde({
      ereignis: "anfrage.gebremst",
      empfaenger: { art: "admin" },
      kurztext:
        "Ungewöhnlich viele Anfragen auf ein Objekt; die Mails je Anfrage setzen aus, die Anfragen selbst laufen weiter auf",
      kennungen: { kunde: objekt.user_id, objekt: objekt.id },
      adminPfad: "/admin/anfragen",
    });

    /* DER VERKAEUFER ERFAEHRT ES IM MOMENT DES KIPPENS (Bau-Runde 5).
       Vorher wusste nur das Team davon; der Verkaeufer merkte bis zur
       24-Stunden-Erinnerung nichts davon, dass weitere Anfragen ohne
       Mail eingehen.

       PFLICHT-MAIL ueber sendeMail(), BEWUSST NICHT sendeHinweis():
       Die Anfrage-Mails selbst sind Hinweise und respektieren die
       Abmeldung. Wer sie abgeschaltet hat, ist genau der, der viele
       Anfragen bekommt; diesen einen Betriebshinweis ueber seinen
       laufenden Vorgang darf die Abmeldung nicht unterdruecken.

       EINMAL JE KALENDERTAG, nicht einmal fuer immer und nicht je 24
       Stunden: Kippt die Bremse am Sonntag und am Montag wieder, soll
       er es beide Male erfahren, auch wenn dazwischen keine vollen 24
       Stunden liegen. Deshalb steckt das deutsche Datum im Schluessel.
       Der Zaehler ist der synchrone aus lib/bremse.ts; auch wenn zwei
       Absendungen gleichzeitig ueber die Schwelle laufen und die
       Team-Meldung doppelt kommt, geht diese Mail genau einmal. */
    const heute = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      dateStyle: "short",
    }).format(new Date());
    const notbremsSchluessel = bremsSchluessel("notbremse-mail", objekt.id, heute);
    const heuteSchonGemailt = bremseZaehlen(notbremsSchluessel, 24 * 60 * 60) > 1;
    if (!heuteSchonGemailt) {
      const { data: verkaeufer } = await service
        .from("profiles")
        .select("email, name")
        .eq("id", objekt.user_id)
        .maybeSingle<{ email: string | null; name: string | null }>();
      /* DER MERKER WIRD ZURUECKGENOMMEN, WENN NICHTS HINAUSGING
         (Bau-Runde 17). Der Zaehler steht oben und nicht hier unten,
         weil er der Wettlauf-Schutz ist: Er ist synchron, und nur
         deshalb geht die Mail auch bei zwei gleichzeitigen
         Absendungen genau einmal hinaus. Gezaehlt wurde dadurch aber
         auch der Versuch, der an einem fehlenden Empfaenger oder am
         Maildienst scheiterte, und der Verkaeufer erfuhr an diesem
         Tag nie, dass seine Anfragen gebremst werden. Genau derselbe
         Griff wie bei der Doppelklick-Bremse weiter unten. */
      let hinaus = false;
      if (verkaeufer?.email) {
        const inhalt = notbremseMail({ name: verkaeufer.name });
        hinaus = await sendeMail({
          an: verkaeufer.email,
          betreff: inhalt.betreff,
          html: inhalt.html,
          text: inhalt.text,
          art: "benachrichtigung",
          vorlage: pflichtMail("anfragen-gebremst"),
          userId: objekt.user_id,
        });
      }
      if (!hinaus) bremseZuruecknehmen(notbremsSchluessel);
    }
  }

  const ergebnis = await anfrageAnlegen(
    {
      objektId: objekt.id,
      userId: objekt.user_id,
      portal: "objektseite",
      vorname,
      nachname,
      email,
      telefon,
      nachricht,
    },
    { exposeAuto: !gebremst, stumm: gebremst, service }
  );
  if ("fehler" in ergebnis) {
    /* Den Doppelklick-Merker wieder streichen. Er wurde oben gesetzt,
       BEVOR feststand, ob etwas entsteht. Bliebe er stehen, wuerde der
       naechste Versuch mit denselben Angaben binnen 15 Minuten als
       Doppelung still mit "ok" beantwortet: Der Interessent saehe die
       Bestaetigung, der Verkaeufer bekaeme nie eine Anfrage. Die
       Meldung darunter bittet um genau diesen zweiten Versuch. */
    bremseZuruecknehmen(doppeltSchluessel);
    return NextResponse.json(
      { meldung: "Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
