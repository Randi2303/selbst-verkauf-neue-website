"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

/**
 * Warteliste auf der /register-Platzhalterseite.
 * TODO: Beim Anschluss des echten Backends das Submit-Handling ersetzen
 * (z. B. Route Handler oder Newsletter-Dienst). Aktuell wird nichts
 * gespeichert oder versendet.
 */
export default function WaitlistForm() {
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");

  if (done) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2.5 rounded-2xl bg-surface-tint px-5 py-4 text-[0.98rem] font-medium"
      >
        <CheckCircle2 size={20} strokeWidth={1.8} className="shrink-0 text-success" />
        Danke, Sie stehen auf der Liste. Wir melden uns zum Start.
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <label htmlFor="warteliste-email" className="sr-only">
        Ihre E-Mail-Adresse
      </label>
      <input
        id="warteliste-email"
        type="email"
        required
        autoComplete="email"
        placeholder="name@beispiel.de"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-w-0 flex-1 rounded-full border border-line bg-background px-5 py-3.5 text-[0.98rem] placeholder:text-ink-muted/70"
      />
      <button type="submit" className="btn-primary shrink-0">
        Auf die Warteliste
      </button>
    </form>
  );
}
