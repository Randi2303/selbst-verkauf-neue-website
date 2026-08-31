import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Haengt die Mess-Sonde ein, AUSSCHLIESSLICH im Entwicklungs-Server.
 *
 * Der Sondentext selbst steht in scripts/messsonde.js und wird hier
 * zur LAUFZEIT gelesen, nicht importiert. Das ist der Kern der Sache:
 * Ein Import zoege den Text in den Bau-Graphen, und damit stuende er
 * wieder in der Quelltext-Karte des Server-Buendels, genau wie zuvor
 * in app/layout.tsx. Ein Dateiname als Zeichenkette ist alles, was
 * vom Werkzeug im Bau uebrig bleibt.
 *
 * Der Aufrufer prueft NODE_ENV; im Betriebs-Bau wird diese Komponente
 * nie gerendert und die Datei nie geoeffnet. Fehlt sie (etwa in einem
 * Deployment, das scripts/ nicht mitnimmt), bleibt es still: dann
 * erscheint einfach keine Sonde.
 *
 * Aufruf im Browser: beliebige Seite mit angehaengtem #messsonde.
 */
export default function MessSonde() {
  let quelltext = "";
  try {
    quelltext = readFileSync(join(process.cwd(), "scripts", "messsonde.js"), "utf8");
  } catch {
    // wirkung: gewollt still, die Sonde ist ein Entwicklungs-Werkzeug und kein Waechter; fehlt scripts/messsonde.js, erscheint einfach keine Sonde und die Seite laeuft unveraendert weiter.
    return null;
  }
  return <script dangerouslySetInnerHTML={{ __html: quelltext }} />;
}
