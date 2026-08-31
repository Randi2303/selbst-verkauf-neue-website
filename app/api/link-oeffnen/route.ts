import { NextResponse } from "next/server";
import { basisAdresse } from "@/lib/basis-adresse";
import { LINK_PFAD, linkPruefen, type LinkZweck } from "@/lib/einmal-link";
import { freigabeCookie } from "@/lib/link-freigabe";
import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";

/**
 * Der Knopf der Zwischenseite fuer die Einmal-Links von Menschen ohne
 * Konto (Nachweis, Gebot, Besichtigung).
 *
 * NUR POST. Das ist der ganze Trick: Ein Pruefdienst wie Outlook Safe
 * Links ruft Adressen auf, er sendet keine Formulare. Siehe
 * lib/link-freigabe.ts.
 *
 * Die Route loest den Link NICHT ein, sie merkt sich nur, dass ein
 * Mensch geklickt hat, und schickt ihn auf seine eigentliche Seite.
 * Das Einloesen selbst passiert dort, wo es hingehoert.
 */

/* Die Zuordnung kommt aus lib/einmal-link.ts. Sie stand hier ein
   zweites Mal, und zwei Listen, die gleich sein sollen, sind
   irgendwann verschieden. */

/* Aus der Zuordnung abgeleitet statt danebengeschrieben: So kann ein
   neuer Zweck nicht mehr vergessen werden. Auch das faellt sonst
   erst auf, wenn ein Link ins Leere fuehrt. */
function istZweck(wert: string): wert is LinkZweck {
  return Object.prototype.hasOwnProperty.call(LINK_PFAD, wert);
}

export async function POST(request: Request) {
  /* wirkung: gewollt still, dies ist ein Formular OHNE Datei: ein
     Token und ein Zweck, zusammen wenige hundert Zeichen. Ein am Proxy
     abgeschnittener Rumpf ist damit praktisch ausgeschlossen. Bleibt
     das Feld leer, landet der Mensch auf einer Seite, die den Grund
     nennt, statt vor einer Fehlermeldung. */
  // wirkung: gewollt still, der Grund steht im Kommentar darueber
  const daten = await request.formData().catch(() => null);
  const zweck = String(daten?.get("zweck") ?? "");
  const token = String(daten?.get("token") ?? "");
  const basis = basisAdresse() ?? siteConfig.domain;

  if (!istZweck(zweck) || !token) {
    return NextResponse.redirect(new URL("/", basis), 303);
  }

  const ziel = new URL(`/${LINK_PFAD[zweck]}/${encodeURIComponent(token)}`, basis);
  /* 303: Nach einem POST muss die Weiterleitung als GET fortgesetzt
     werden, sonst wiederholt der Browser beim Aktualisieren das
     Formular. */
  const antwort = NextResponse.redirect(ziel, 303);

  /* Nur bei gueltigem Link freigeben. Bei einem toten Link geht es
     trotzdem weiter: Die Zielseite zeigt dann ihre Fehleransicht mit
     dem Weg zu einem neuen Link, und das ist die hilfreichere Antwort
     als eine Sackgasse hier. */
  const pruefung = await linkPruefen(token, zweck);
  if (pruefung.gueltig) {
    antwort.cookies.set(freigabeCookie(token));
  }
  return antwort;
}
