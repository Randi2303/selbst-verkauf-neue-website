import Image from "next/image";
import { kopfAusschnitt } from "@/lib/bildausschnitt";
import type { MenschenBilder } from "@/lib/menschen-bilder";
import type { Mensch } from "@/config/menschen";
import { cn } from "@/lib/utils";

/**
 * EIN PORTRÄT IM KREIS, überall gleich ausgeschnitten.
 *
 * Der Kreis ist die eine Fläche, in der ein Porträt nicht als Abzug
 * wirkt, sondern als Kopf. Damit die Reihe ruhig aussieht, müssen zwei
 * Dinge stimmen (Auftrag des Inhabers, 26.08.2026): Die Augen liegen
 * bei allen auf derselben Höhe, und der Kopf nimmt bei allen denselben
 * Anteil des Kreises ein.
 *
 * Beides rechnet lib/bildausschnitt.ts aus dem Bildmittelpunkt der
 * Person (config/menschen.ts) und den echten Maßen der Datei. Hier
 * steht kein Sonderfall und keine Zahl.
 *
 * WARUM EIN KASTEN UND KEIN object-position: Ein runder Ausschnitt
 * braucht auch ein Heranholen, und das kann object-position nicht. Der
 * innere Kasten hat genau das Seitenverhältnis des Bildes, deshalb
 * beschneidet object-cover darin nichts mehr; der ganze Beschnitt
 * entsteht durch Maß und Lage des Kastens.
 *
 * OHNE FOTO oder ohne lesbare Maße: der Initialen-Kreis wie bisher.
 */
export default function PortraetKreis({
  mensch,
  bilder,
  sizes,
  className,
  initialenKlasse,
}: {
  mensch: Mensch;
  bilder: MenschenBilder;
  /** Wie breit der Kreis wirklich ist, für next/image */
  sizes: string;
  /** Maße und Rahmen des Kreises, von der aufrufenden Fläche */
  className?: string;
  /** Schriftgröße der Initialen, falls kein Foto da ist */
  initialenKlasse?: string;
}) {
  const masse = bilder.masse[mensch.name];
  const kasten = masse ? kopfAusschnitt(mensch.mittelpunkt, masse) : null;

  return (
    <span className={cn("relative block overflow-hidden rounded-full", className)}>
      {bilder.fotos[mensch.name] && kasten ? (
        <span
          className="absolute"
          style={{
            width: `${kasten.breite}%`,
            height: `${kasten.hoehe}%`,
            left: `${kasten.links}%`,
            top: `${kasten.oben}%`,
          }}
        >
          <Image src={mensch.bild} alt="" fill sizes={sizes} className="foto-warm object-cover" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "flex h-full w-full items-center justify-center bg-surface font-semibold text-primary",
            initialenKlasse ?? "text-[0.7rem]"
          )}
        >
          {mensch.initialen}
        </span>
      )}
    </span>
  );
}
