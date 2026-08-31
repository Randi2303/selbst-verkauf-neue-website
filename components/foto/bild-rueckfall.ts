import type { SyntheticEvent } from "react";

/**
 * Rueckfall auf die volle Datei, wenn eine kleine Fassung nicht laedt.
 *
 * Die kleinen Fassungen kommen von der Supabase-Umrechnung, einem
 * EIGENEN Endpunkt: Faellt er aus, kommt ein Fehler statt eines
 * Bildes, von selbst faellt nichts zurueck. Entscheidung des Inhabers
 * vom 18.08.2026: Der Rueckfall ist Pflicht an jedem Bild, das eine
 * kleine Fassung zeigt; ein Dienst, der ausfaellt und dabei alle
 * Bilder mitnimmt, waere schlimmer als der alte Zustand.
 *
 * Der Merker am Element verhindert eine Schleife, wenn auch die volle
 * Adresse nicht laedt (etwa nach Ablauf der Signatur in einem lange
 * offenen Fenster): Dann bleibt das Bild leer, wie bisher auch.
 */
export function aufVolleDateiZurueckfallen(
  ereignis: SyntheticEvent<HTMLImageElement>,
  volleUrl: string | null | undefined
): void {
  const bild = ereignis.currentTarget;
  if (!volleUrl || bild.dataset.rueckfall === "1") return;
  bild.dataset.rueckfall = "1";
  if (bild.src !== volleUrl) bild.src = volleUrl;
}
