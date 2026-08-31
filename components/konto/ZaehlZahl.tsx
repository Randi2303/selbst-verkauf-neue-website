/**
 * Zeigt eine Konto-Zahl. OHNE Zähl-Bewegung, und das ist die ganze
 * Pointe (Inhaber, Feinschliff 24.08.2026): Eine Zahl, die man ablesen
 * soll, wird nicht animiert. Die frühere Fassung startete bei 0 und
 * zählte erst, wenn ein IntersectionObserver 40 Prozent Sichtbarkeit
 * meldete. Am gefüllten Vorführkonto stand das höchste Gebot dadurch
 * minutenlang falsch da, und falsch ist schlimmer als unbewegt.
 *
 * Der Baustein bleibt bestehen, damit die neun Aufrufer (Bieter-Kopf,
 * Statistiken, Markteinschätzung, Team-Seite) unverändert weiterlaufen
 * und eine künftige Bewegung, falls je gewollt, wieder EINE Stelle hat.
 */
export default function ZaehlZahl({
  wert,
  format,
}: {
  wert: number;
  format: (n: number) => string;
}) {
  return <span className="tabular-nums">{format(wert)}</span>;
}
