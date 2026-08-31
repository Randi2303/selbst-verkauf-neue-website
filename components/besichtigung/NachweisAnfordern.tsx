"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Der Weg aus der Nachweis-Sackgasse auf der Terminseite (Bau-Runde 5):
 * stellt den Upload-Link neu aus und schickt ihn an die hinterlegte
 * Adresse. Vorher stand hier nur, DASS ein Nachweis noetig ist, und
 * wer die Mail mit dem Link nicht mehr hatte, kam nicht weiter.
 */
export default function NachweisAnfordern({ token }: { token: string }) {
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);

  const anfordern = async () => {
    if (laeuft || fertig) return;
    setLaeuft(true);
    setMeldung(null);
    try {
      const antwort = await fetch(`/api/termin/${token}/nachweis-link`, {
        method: "POST",
      });
      const daten = (await antwort.json().catch(() => null)) as {
        ok?: boolean;
        meldung?: string;
      } | null;
      if (antwort.ok && daten?.ok) {
        setFertig(true);
        setMeldung(daten.meldung ?? "Der Link ist unterwegs.");
        return;
      }
      setMeldung(
        daten?.meldung ?? "Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal."
      );
    } catch {
      setMeldung("Keine Verbindung. Bitte versuchen Sie es noch einmal.");
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {!fertig ? (
        <Button onClick={anfordern} disabled={laeuft} className="self-start">
          <MailCheck size={15} strokeWidth={1.9} />
          {laeuft ? "Wird gesendet" : "Upload-Link erneut zusenden"}
        </Button>
      ) : null}
      {meldung ? (
        <p
          role="status"
          className="max-w-[58ch] text-[0.9rem] leading-relaxed text-ink-muted"
        >
          {meldung}
        </p>
      ) : null}
    </div>
  );
}
