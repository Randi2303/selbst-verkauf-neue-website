import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { GRUENDUNG, MENSCHEN } from "@/config/menschen";
import type { Bildmasse } from "@/lib/bildausschnitt";
import { siteConfig } from "@/site.config";

/**
 * Prüft zur Build-Zeit, welche Porträts der Menschen-Flächen wirklich
 * in public/ liegen (Team in public/images/team/, Makler in
 * public/images/makler/). Nur aus Server-Komponenten aufrufen (nutzt
 * das Dateisystem); das Ergebnis wandert als Prop in die
 * Client-Sektionen. Fehlt ein Foto, zeigt die Fläche den
 * Initialen-Kreis; fehlt das Partner-Logo, bleibt die Text-Namenszeile.
 * Nach dem Ablegen der Dateien genügt ein neuer Build bzw. ein
 * Redeploy.
 *
 * Nachfolger von lib/makler-bilder.ts (bis Runde 31): dieselbe
 * Mechanik, jetzt für alle sechs Menschen aus config/menschen.ts.
 */
export type MenschenBilder = {
  /** Foto vorhanden, je Name */
  fotos: Record<string, boolean>;
  /**
   * Die echten Maße der Datei, je Name. Sie kommen aus dem Bild selbst
   * und stehen nirgends von Hand (Runde 34): lib/bildausschnitt.ts
   * braucht das Seitenverhältnis, um aus dem Bildmittelpunkt einer
   * Person den runden Ausschnitt zu rechnen. Eine abgeschriebene Zahl
   * könnte vom Bild abweichen; eine gelesene nicht.
   *
   * null, wenn die Datei fehlt oder sich nicht lesen lässt. Die
   * Flächen zeigen dann den Initialen-Kreis, wie schon bisher.
   */
  masse: Record<string, Bildmasse | null>;
  logoVorhanden: boolean;
  /** Unterschrift-Bild der Gründungsgeschichte liegt in public/ */
  unterschriftVorhanden: boolean;
};

function liegtInPublic(webPfad: string): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", webPfad.replace(/^\//, "")));
}

async function bildmasse(webPfad: string): Promise<Bildmasse | null> {
  try {
    const datei = path.join(process.cwd(), "public", webPfad.replace(/^\//, ""));
    const kopf = await sharp(datei).metadata();
    if (!kopf.width || !kopf.height) return null;
    return { breite: kopf.width, hoehe: kopf.height };
  } catch {
    /* wirkung: gewollt, ein fehlendes oder unlesbares Bild ist hier kein Fehler: null heisst "keine Masse bekannt", und die Anzeige faellt auf ihr Standard-Verhaeltnis zurueck. Ein Wurf brauchte an jeder Aufrufstelle einen Faenger fuer denselben Nichts-Fall. */
    return null;
  }
}

export async function ermittleMenschenBilder(): Promise<MenschenBilder> {
  const fotos: Record<string, boolean> = {};
  const masse: Record<string, Bildmasse | null> = {};
  for (const mensch of MENSCHEN) {
    const da = liegtInPublic(mensch.bild);
    fotos[mensch.name] = da;
    masse[mensch.name] = da ? await bildmasse(mensch.bild) : null;
  }
  return {
    fotos,
    masse,
    logoVorhanden: liegtInPublic(siteConfig.brokerPartner.logo),
    unterschriftVorhanden: liegtInPublic(GRUENDUNG.unterschriftBild),
  };
}
