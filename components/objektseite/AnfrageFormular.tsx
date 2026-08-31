"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Das Anfrage-Formular der oeffentlichen Objektseite. Es schreibt
 * direkt in unsere Datenbank (Route /api/objektseite/...): Daraus
 * entsteht sofort ein Eintrag unter Anfragen und ueber den Trigger
 * eine Interessenten-Akte. Das versteckte Firma-Feld ist eine
 * Honigfalle fuer Bots; Menschen sehen es nie.
 */
export default function AnfrageFormular({ kennung }: { kennung: string }) {
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [nachricht, setNachricht] = useState("");
  const [falle, setFalle] = useState("");
  const [sendet, setSendet] = useState(false);
  const [fertig, setFertig] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const absenden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendet) return;
    setSendet(true);
    setFehler(null);
    try {
      const antwort = await fetch(`/api/objektseite/${encodeURIComponent(kennung)}/anfrage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vorname, nachname, email, telefon, nachricht, firma: falle }),
      });
      const daten = await antwort.json().catch(() => null);
      if (!antwort.ok) {
        setFehler(daten?.meldung ?? "Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal.");
        return;
      }
      setFertig(true);
    } catch {
      setFehler("Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal.");
    } finally {
      setSendet(false);
    }
  };

  if (fertig) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-2xl border border-success/40 bg-success/5 p-5">
        <CheckCircle2 size={22} strokeWidth={1.8} className="text-success" />
        <p className="text-[0.95rem] font-medium text-ink">
          Ihre Anfrage ist beim Eigentümer.
        </p>
        <p className="max-w-md text-[0.88rem] leading-relaxed text-ink-muted">
          Sie erhalten in Kürze eine E-Mail mit Ihrem persönlichen Link zum
          vollständigen Exposé.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="anfrage-vorname">Vorname</Label>
          <Input
            id="anfrage-vorname"
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
            autoComplete="given-name"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="anfrage-nachname">Nachname</Label>
          <Input
            id="anfrage-nachname"
            value={nachname}
            onChange={(e) => setNachname(e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="anfrage-email">E-Mail-Adresse</Label>
          <Input
            id="anfrage-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="anfrage-telefon">Telefon, optional</Label>
          <Input
            id="anfrage-telefon"
            type="tel"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="anfrage-nachricht">Ihre Nachricht, optional</Label>
        <Textarea
          id="anfrage-nachricht"
          value={nachricht}
          onChange={(e) => setNachricht(e.target.value)}
          rows={4}
          placeholder="z. B. Wir suchen ein Zuhause für unsere Familie und würden gern besichtigen."
        />
      </div>
      {/* Honigfalle: fuer Menschen unsichtbar, Bots fuellen sie aus */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Firma
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={falle}
            onChange={(e) => setFalle(e.target.value)}
          />
        </label>
      </div>
      {fehler ? (
        <p className="text-[0.88rem] leading-relaxed text-danger">{fehler}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={sendet}>
          {sendet ? "Wird gesendet" : "Anfrage senden"}
        </Button>
        <p className="text-[0.78rem] leading-relaxed text-ink-muted">
          Ihre Angaben gehen nur an den Eigentümer und an selbst-verkauf.de.
        </p>
      </div>
    </form>
  );
}
