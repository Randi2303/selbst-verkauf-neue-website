import { Clock, LinkIcon, ShieldAlert } from "lucide-react";
import Wordmark from "@/components/layout/Wordmark";
import { siteConfig } from "@/site.config";

/**
 * Was ein Interessent sieht, wenn sein Link nicht (mehr) gilt.
 *
 * Bewusst KEINE 404-Seite und keine technische Meldung: Der Mensch
 * hier hat nichts falsch gemacht, er hat auf einen Link geklickt, den
 * wir ihm geschickt haben. Also steht da, was los ist und was er tun
 * kann, in einem Satz.
 */
export default function LinkFehler({
  grund,
}: {
  grund: "unbekannt" | "abgelaufen" | "widerrufen" | "falscher_zweck";
}) {
  const inhalt = {
    abgelaufen: {
      icon: Clock,
      titel: "Dieser Link ist abgelaufen.",
      text: "Aus Sicherheitsgründen gelten unsere Links nur eine begrenzte Zeit. Wenn Sie weiterhin Interesse haben, schreiben Sie uns kurz, dann schicken wir Ihnen einen neuen.",
    },
    widerrufen: {
      icon: ShieldAlert,
      titel: "Dieser Link gilt nicht mehr.",
      text: "Der Zugang wurde zurückgezogen. Falls das nicht so gedacht war, schreiben Sie uns kurz, wir klären das.",
    },
    unbekannt: {
      icon: LinkIcon,
      titel: "Diesen Link kennen wir nicht.",
      text: "Vermutlich ist beim Kopieren ein Zeichen verloren gegangen. Am sichersten ist es, den Link in der E-Mail noch einmal direkt anzuklicken.",
    },
    falscher_zweck: {
      icon: LinkIcon,
      titel: "Dieser Link führt woandershin.",
      text: "Er gehört zu einem anderen Vorgang. Bitte nutzen Sie den Link aus der E-Mail, in der es um den Nachweis geht.",
    },
  }[grund];

  const Icon = inhalt.icon;

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-5 py-14 sm:px-8"
      /* SCHRIFT DER ANWENDUNG (Runde 37, 29.08.2026). Diese Ansicht
         ist der Fehlerfall der Token-Seiten (Besichtigung, Gebot,
         Nachweis, Termin, Exposé-Link) und gehört zu ihnen. Ohne das
         Merkmal hier stünde ausgerechnet die Fehlermeldung als
         einzige Seite der Kette in der alten Schrift.

         GEFUNDEN, WEIL NACHGEMESSEN: Nach dem Auszeichnen der vier
         Token-Seiten war im ausgelieferten HTML eines UNGÜLTIGEN
         Links kein Merkmal zu finden. Der ungültige Link rendert
         nicht deren <main>, sondern dieses hier. */
      data-bereich="anwendung"
    >
      <Wordmark className="text-[1.1rem]" />
      <div className="rounded-3xl border border-line bg-paper p-7 sm:p-9">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-tint text-primary">
          <Icon size={21} strokeWidth={1.6} />
        </span>
        <h1 className="mt-5 text-balance font-heading text-[1.5rem] font-semibold tracking-[-0.015em] text-ink">
          {inhalt.titel}
        </h1>
        <p className="mt-3 text-pretty leading-relaxed text-ink-muted">
          {inhalt.text}
        </p>
        <p className="mt-6 text-[0.9rem] leading-relaxed text-ink-muted">
          Schreiben Sie uns an{" "}
          <a
            href={`mailto:${siteConfig.mailAbsender.antwort}`}
            className="text-primary underline underline-offset-2"
          >
            {siteConfig.mailAbsender.antwort}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
