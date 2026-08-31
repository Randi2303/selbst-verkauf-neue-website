"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  KUENDIGUNG_BESTAETIGUNG_TEXT,
  KUENDIGUNG_BESTAETIGUNG_TITEL,
  KUENDIGUNG_KNOPF_TEXT,
} from "@/config/vertragstexte";
import { formatUhrzeit, ohneUmbruch } from "@/lib/utils";
import { getService } from "@/lib/cart-rules";

/**
 * Das oeffentliche Kuendigungs-Formular (§ 312k BGB sinngemaess):
 * Felder zur Zuordnung, eine eindeutige Bestaetigungsschaltflaeche
 * ("Jetzt kündigen"), danach die Bestaetigungsseite mit Datum und
 * Uhrzeit des Eingangs. Die Empfangsbestaetigung in Textform
 * verschickt die Route.
 */

/* DIE NAMEN KOMMEN AUS DEM KATALOG (24.08.2026): Diese Liste war eine
   eigene zweite Quelle und fuehrte den alten Doppelnamen "Makler-
   Begleitung (Persoenlicher Ansprechpartner)". Der Freitext landet in
   kuendigungs_eingaenge.leistung; damit dort dieselben Woerter stehen
   wie ueberall, liest die Liste jetzt site.config.ts. "Monatliches
   Paket" und der Auffang-Eintrag sind keine Katalog-Leistungen und
   bleiben eigene Woerter. */
const LEISTUNGEN = [
  getService("ansprechpartner")?.name ?? "Makler-Begleitung",
  "Monatliches Paket",
  getService("laufzeit-verlaengerung")?.name ?? "Verlängerung der Portallaufzeit",
  "Andere laufende Leistung",
];

export default function KuendigungsFormular() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [leistung, setLeistung] = useState(LEISTUNGEN[0]);
  const [zum, setZum] = useState<"fruehestmoeglich" | "datum">("fruehestmoeglich");
  const [zumDatum, setZumDatum] = useState("");
  const [nachricht, setNachricht] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [eingegangen, setEingegangen] = useState<string | null>(null);

  const absenden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (laeuft) return;
    setFehler(null);
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFehler("Bitte geben Sie Ihren Namen und die E-Mail-Adresse Ihres Kontos an.");
      return;
    }
    setLaeuft(true);
    try {
      const antwort = await fetch("/api/kuendigung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          leistung,
          zum_wunsch: zum === "datum" && zumDatum ? `zum ${zumDatum}` : "frühestmöglich",
          nachricht: nachricht.trim() || null,
        }),
      });
      const daten = (await antwort.json().catch(() => null)) as {
        ok?: boolean;
        eingegangen_am?: string;
        meldung?: string;
      } | null;
      if (!antwort.ok || !daten?.ok) {
        setFehler(
          daten?.meldung ??
            "Das hat gerade nicht geklappt. Bitte versuchen Sie es erneut oder schreiben Sie uns."
        );
        return;
      }
      setEingegangen(daten.eingegangen_am ?? new Date().toISOString());
    } catch {
      setFehler("Keine Verbindung. Bitte versuchen Sie es erneut oder schreiben Sie uns.");
    } finally {
      setLaeuft(false);
    }
  };

  /* Die Bestaetigungsseite: Eingang mit Datum und Uhrzeit */
  if (eingegangen) {
    const zeit = new Date(eingegangen);
    return (
      <div className="rounded-3xl border border-line/60 bg-paper p-6 sm:p-8">
        <p className="flex items-start gap-2.5 font-heading text-[1.2rem] font-semibold tracking-[-0.01em] text-ink">
          <CircleCheck size={22} strokeWidth={1.9} className="mt-0.5 shrink-0 text-success" />
          {KUENDIGUNG_BESTAETIGUNG_TITEL}
        </p>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">
          Eingegangen am{" "}
          <span className="font-medium text-ink">
            {ohneUmbruch(
              zeit.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            )}{" "}
            um {formatUhrzeit(zeit)}
          </span>
          . {KUENDIGUNG_BESTAETIGUNG_TEXT}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kuendigung-name">Ihr Name</Label>
          <Input
            id="kuendigung-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kuendigung-email">E-Mail-Adresse Ihres Kontos</Label>
          <Input
            id="kuendigung-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kuendigung-leistung">Was möchten Sie kündigen?</Label>
        <select
          id="kuendigung-leistung"
          value={leistung}
          onChange={(e) => setLeistung(e.target.value)}
          className="rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[0.92rem] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {LEISTUNGEN.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[0.85rem] font-medium text-ink">Kündigen zum</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-[0.9rem]">
          <input
            type="radio"
            name="zum"
            checked={zum === "fruehestmoeglich"}
            onChange={() => setZum("fruehestmoeglich")}
            className="size-4 accent-primary"
          />
          frühestmöglichen Zeitpunkt
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-[0.9rem]">
          <input
            type="radio"
            name="zum"
            checked={zum === "datum"}
            onChange={() => setZum("datum")}
            className="size-4 accent-primary"
          />
          einem bestimmten Datum
          {zum === "datum" ? (
            <Input
              type="date"
              value={zumDatum}
              onChange={(e) => setZumDatum(e.target.value)}
              aria-label="Gewünschtes Datum"
              className="w-fit"
            />
          ) : null}
        </label>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kuendigung-nachricht">Anmerkung, freiwillig</Label>
        <Textarea
          id="kuendigung-nachricht"
          value={nachricht}
          onChange={(e) => setNachricht(e.target.value)}
          placeholder="Zum Beispiel: Das Haus ist verkauft."
        />
      </div>

      {fehler ? (
        <p className="text-[0.88rem] leading-relaxed text-accent-deep">{fehler}</p>
      ) : null}

      <div>
        <Button type="submit" disabled={laeuft}>
          {laeuft ? "Wird übermittelt" : KUENDIGUNG_KNOPF_TEXT}
        </Button>
      </div>
    </form>
  );
}
