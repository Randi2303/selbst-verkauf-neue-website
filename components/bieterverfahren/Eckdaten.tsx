/**
 * Die Eckdaten als ruhige Kennzahlen-Reihe.
 *
 * Vorher standen Wohnfläche, Zimmer und Baujahr als eine graue
 * Textzeile mit Trennpunkten da, also als Beiwerk. Für jemanden, der
 * über den Kauf nachdenkt, sind das aber die ersten drei Fragen.
 * Deshalb bekommen sie eigene Zahlen in der Anzeigeschrift, mit
 * tabellarischen Ziffern, damit die Reihe ruhig steht.
 *
 * Was nicht bekannt ist, erscheint gar nicht. Ein Feld mit einem
 * Gedankenstrich wäre eine Auskunft über nichts.
 */
export default function Eckdaten({
  werte,
}: {
  werte: { wert: string; label: string }[];
}) {
  if (werte.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      {werte.map((w) => (
        <div key={w.label}>
          <dd className="font-heading text-[1.6rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink opsz-display">
            {w.wert}
          </dd>
          <dt className="mt-1.5 text-[0.8rem] uppercase tracking-[0.08em] text-ink-muted">
            {w.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
