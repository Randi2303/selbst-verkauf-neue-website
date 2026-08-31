import { siteConfig } from "@/site.config";
import { cn } from "@/lib/utils";

/**
 * Wortmarke "selbst-verkauf.de": klein geschrieben, ".de" in Terrakotta.
 * Bis das finale Logo steht, ist das die zentrale Markendarstellung.
 *
 * SIE TRÄGT `font-marke` UND NICHT `font-heading` (Auflage des
 * Inhabers, 29.08.2026): Die Wortmarke ist unser Zeichen und keine
 * Textschrift. Sie bleibt Fraunces, auch dort, wo die Anwendung ihre
 * Überschriften auf Inter umstellt. `font-marke` ist eine eigene
 * Familie in tailwind.config.ts und wird von der Bereichs-Regel in
 * app/globals.css nicht erreicht.
 */
export default function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-marke font-semibold tracking-[-0.01em] text-ink", className)}>
      {siteConfig.wordmark.base}
      <span className="text-accent">{siteConfig.wordmark.accent}</span>
    </span>
  );
}
