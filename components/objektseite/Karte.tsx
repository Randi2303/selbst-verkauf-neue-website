"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Die Lage-Karte der Objektseite: OpenStreetMap ueber Leaflet, aus
 * dem eigenen Bundle (kein CDN). ZWEI-KLICK-WEG aus Datenschutz-
 * Gruenden: Erst nach "Karte anzeigen" laedt der Browser die
 * Kartenkacheln, vorher geht keine Anfrage des Besuchers an den
 * Kartenanbieter. Genau das steht auch am Knopf.
 *
 * Freigegebene Adresse = Markierung; sonst nur ein Umkreis um die
 * Ortsmitte, damit die Lage grob erkennbar ist, ohne das Haus zu
 * verraten.
 */
export default function Karte({
  lat,
  lng,
  genau,
  adresse,
}: {
  lat: number;
  lng: number;
  /** true, wenn die volle Adresse freigegeben und kodiert ist */
  genau: boolean;
  adresse: string;
}) {
  const [aktiv, setAktiv] = useState(false);
  const behaelter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aktiv || !behaelter.current) return;
    let beendet = false;
    let karte: import("leaflet").Map | null = null;
    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (beendet || !behaelter.current) return;
      karte = L.map(behaelter.current, {
        center: [lat, lng],
        zoom: genau ? 16 : 13,
        scrollWheelZoom: false,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
      }).addTo(karte);
      if (genau) {
        // Eigener ruhiger Marker statt der Standard-Bilddateien
        L.circleMarker([lat, lng], {
          radius: 9,
          color: "#17615B",
          weight: 3,
          fillColor: "#17615B",
          fillOpacity: 0.6,
        }).addTo(karte);
      } else {
        L.circle([lat, lng], {
          radius: 900,
          color: "#17615B",
          weight: 2,
          fillColor: "#17615B",
          fillOpacity: 0.12,
        }).addTo(karte);
      }
    })();
    return () => {
      beendet = true;
      karte?.remove();
    };
  }, [aktiv, lat, lng, genau]);

  if (!aktiv) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line/70 bg-surface/60 px-6 py-12 text-center">
        <MapPin size={22} strokeWidth={1.7} className="text-primary" />
        <p className="text-[0.92rem] font-medium text-ink">{adresse}</p>
        <button
          type="button"
          onClick={() => setAktiv(true)}
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-[0.9rem] font-medium text-background transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Karte anzeigen
        </button>
        <p className="max-w-sm text-[0.78rem] leading-relaxed text-ink-muted">
          Beim Anzeigen wird die Karte von OpenStreetMap geladen; dabei
          erhält der Kartenanbieter Ihre IP-Adresse.
          {genau ? "" : " Ohne freigegebene Adresse zeigt die Karte nur die Umgebung."}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={behaelter}
      className="h-[320px] w-full overflow-hidden rounded-3xl border border-line/70 sm:h-[380px]"
      aria-label={`Karte: ${adresse}`}
    />
  );
}
