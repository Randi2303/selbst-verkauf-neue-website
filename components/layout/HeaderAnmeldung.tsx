"use client";

import { ChevronDown, LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { navPrefetch } from "@/lib/passwortschutz";
import { supabaseBereit } from "@/lib/supabase/bereit";
import { supabaseBrowser } from "@/lib/supabase/client";
import { siteConfig } from "@/site.config";

/**
 * Anmelde-Zustand im Header der öffentlichen Website.
 *
 * Die öffentlichen Seiten bleiben bewusst statisch vorgerendert
 * (Performance), deshalb kann der Server den Nutzer-Zustand nicht ins
 * HTML schreiben. Stattdessen liest diese Insel SYNCHRON im ersten
 * Client-Render aus dem Supabase-Auth-Cookie, OB jemand angemeldet
 * ist (kein Umspringen, kein Warten auf eine Netzwerk-Antwort).
 *
 * WER angemeldet ist, kommt danach aus /api/ich. Grund: Der Name muss
 * aus dem Profil stammen, damit Website und Konto dieselbe Person
 * gleich benennen. Vorher bildete der Header die Initialen aus der
 * E-Mail-Adresse, das Konto aus dem Profilnamen; bei abweichenden
 * Angaben sah das aus, als hinge ein früherer Nutzer fest.
 *
 * Sicherheit: Das Cookie gehört immer dem Besucher selbst, und
 * /api/ich ist force-dynamic. Es gibt keine zwischengespeicherte,
 * geteilte Antwort und damit auch keinen Weg, den Namen eines anderen
 * zu sehen.
 */

type Anmeldung = { angemeldet: boolean; email: string | null };

/** Was /api/ich liefert, sobald jemand angemeldet ist */
type Identitaet = { name: string | null; initialen: string; admin: boolean };

/** Supabase-Auth-Cookie synchron lesen (auch in Teile zerlegt) */
function leseAnmeldung(): Anmeldung {
  if (typeof document === "undefined" || !supabaseBereit) {
    return { angemeldet: false, email: null };
  }
  const teile: { name: string; wert: string }[] = document.cookie
    .split("; ")
    .map((eintrag) => {
      const trenner = eintrag.indexOf("=");
      return {
        name: eintrag.slice(0, trenner),
        wert: eintrag.slice(trenner + 1),
      };
    })
    .filter((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (teile.length === 0) return { angemeldet: false, email: null };

  // E-Mail für die Initialen aus dem Token ziehen, defensiv: schlägt
  // das Dekodieren fehl, bleibt es beim schlichten Angemeldet-Zustand
  try {
    const zusammen = teile
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => decodeURIComponent(c.wert))
      .join("");
    const roh = zusammen.startsWith("base64-")
      ? atob(zusammen.slice("base64-".length))
      : zusammen;
    const daten = JSON.parse(roh) as { user?: { email?: string } };
    return { angemeldet: true, email: daten.user?.email ?? null };
  } catch {
    return { angemeldet: true, email: null };
  }
}

/*
 * Anmelde-Zustand als kleiner externer Store: Der Schnappschuss kommt
 * synchron aus dem Cookie, Änderungen meldet Supabase (Anmelden oder
 * Abmelden, auch aus anderen Tabs). Der Server rendert immer den
 * abgemeldeten Zustand, die Hydration bleibt deshalb stabil.
 */
const ABGEMELDET: Anmeldung = { angemeldet: false, email: null };
let anmeldungCache: Anmeldung = ABGEMELDET;

function anmeldungSchnappschuss(): Anmeldung {
  const neu = leseAnmeldung();
  if (
    neu.angemeldet !== anmeldungCache.angemeldet ||
    neu.email !== anmeldungCache.email
  ) {
    anmeldungCache = neu;
  }
  return anmeldungCache;
}

function anmeldungAbonnieren(melden: () => void): () => void {
  if (!supabaseBereit) return () => {};
  const {
    data: { subscription },
  } = supabaseBrowser().auth.onAuthStateChange(() => melden());
  return () => subscription.unsubscribe();
}

export default function HeaderAnmeldung({
  variante,
  aufNavigation,
}: {
  variante: "desktop" | "mobil";
  /** Schließt zum Beispiel das mobile Menü nach einem Klick */
  aufNavigation?: () => void;
}) {
  // Cookie-Stand synchron über den kleinen Store oben; das Server-HTML
  // rendert immer abgemeldet, deshalb bricht die Hydration nicht.
  const anmeldung = useSyncExternalStore(
    anmeldungAbonnieren,
    anmeldungSchnappschuss,
    () => ABGEMELDET
  );
  // Name, Initialen und Admin-Rolle serverseitig aus der aktuellen
  // Sitzung: Der Admin-Punkt existiert im DOM erst nach einem Ja des
  // Servers, für Kunden nie (auch nicht versteckt). Kein Flackern: Er
  // steht im zugeklappten Menü.
  const [geholt, setGeholt] = useState<Identitaet | null>(null);
  /** Zwei Versuche vergeblich: dann sagt das Menue es, statt still zu bleiben */
  const [nichtGeladen, setNichtGeladen] = useState(false);
  // Abgemeldet zählt keine alte Identität mehr: Das wird hier beim
  // Rendern entschieden statt im Effekt zurückgesetzt, dadurch kann
  // nach einem Kontowechsel nie kurz der vorige Name stehen bleiben.
  const identitaet = anmeldung.angemeldet ? geholt : null;
  const istAdmin = anmeldung.angemeldet && identitaet?.admin === true;
  const [offen, setOffen] = useState(false);
  const halter = useRef<HTMLDivElement>(null);

  // Die E-Mail aus dem Cookie hängt mit drin: Wechselt das Konto,
  // wird die Identität neu geholt statt die alte weiterzuzeigen
  useEffect(() => {
    if (!anmeldung.angemeldet) return;
    let beendet = false;
    /* ZWEITER VERSUCH, UND DANACH EINE AUSKUNFT (Befund vom
       31.08.2026).

       Hier stand `.catch(() => undefined)`. Was dann ausfiel, sieht
       harmlos aus und ist es nicht: Ohne diese Antwort bleibt der Name
       leer, und der Admin-Punkt entsteht gar nicht erst. Ein Admin,
       dessen Abruf einmal daneben geht, findet seinen Zugang nicht
       mehr und erfaehrt nicht, warum.

       Ein Netzaussetzer dauert meist Sekunden, deshalb zuerst ein
       zweiter Versuch. Bleibt es dabei, steht die Auskunft im
       geoeffneten Menue, mit einem Ausweg, der wirklich etwas tut. */
    const holen = async (): Promise<boolean> => {
      const antwort = await fetch("/api/ich");
      if (!antwort.ok) return false;
      const d = (await antwort.json()) as Identitaet & { angemeldet?: boolean };
      if (beendet) return true;
      setGeholt(
        d.angemeldet ? { name: d.name, initialen: d.initialen, admin: d.admin } : null
      );
      return true;
    };
    void (async () => {
      for (const wartenMs of [0, 1500]) {
        if (beendet) return;
        if (wartenMs > 0) await new Promise((r) => setTimeout(r, wartenMs));
        try {
          if (await holen()) {
            if (!beendet) setNichtGeladen(false);
            return;
          }
        } catch {
          // wirkung: gewollt still im ersten Anlauf, der zweite Versuch folgt gleich und danach spricht setNichtGeladen
        }
      }
      if (!beendet) setNichtGeladen(true);
    })();
    return () => {
      beendet = true;
    };
  }, [anmeldung.angemeldet, anmeldung.email]);

  useEffect(() => {
    if (!offen) return;
    const schliessen = (e: MouseEvent) => {
      if (!halter.current?.contains(e.target as Node)) setOffen(false);
    };
    document.addEventListener("mousedown", schliessen);
    return () => document.removeEventListener("mousedown", schliessen);
  }, [offen]);

  const abmelden = async () => {
    await supabaseBrowser().auth.signOut();
    // Von jeder öffentlichen Seite zurück auf die Startseite
    window.location.assign("/");
  };

  if (!anmeldung.angemeldet) {
    if (variante === "mobil") {
      return (
        <Link
          prefetch={navPrefetch}
          href={siteConfig.loginUrl}
          onClick={aufNavigation}
          className="flex items-center gap-2 rounded-xl px-3 py-3 text-[1.05rem] font-medium text-ink transition-colors hover:bg-surface"
        >
          <User size={18} strokeWidth={1.8} className="text-primary" />
          Anmelden
        </Link>
      );
    }
    return (
      <Link
        prefetch={navPrefetch}
        href={siteConfig.loginUrl}
        className="flex items-center gap-1.5 rounded-md text-[0.95rem] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <User size={16} strokeWidth={1.8} />
        Anmelden
      </Link>
    );
  }

  // Bis die Antwort da ist, lieber gar keine Initialen als falsche:
  // Der Personen-Umriss steht dann kurz an ihrer Stelle
  const initialen = identitaet?.initialen ?? "";

  if (variante === "mobil") {
    return (
      <>
        <Link
          prefetch={navPrefetch}
          href="/konto"
          onClick={aufNavigation}
          className="flex items-center gap-2 rounded-xl px-3 py-3 text-[1.05rem] font-medium text-ink transition-colors hover:bg-surface"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-surface-tint text-[0.72rem] font-semibold text-primary">
            {initialen || <User size={14} strokeWidth={1.8} />}
          </span>
          Mein Bereich
        </Link>
        {istAdmin ? (
          <Link
            prefetch={navPrefetch}
            href="/admin"
            onClick={aufNavigation}
            className="flex items-center gap-2 rounded-xl px-3 py-3 text-[1.05rem] font-medium text-ink transition-colors hover:bg-surface"
          >
            <Shield size={18} strokeWidth={1.8} className="text-primary" />
            Admin
          </Link>
        ) : null}
        <button
          type="button"
          onClick={abmelden}
          className="flex items-center gap-2 rounded-xl px-3 py-3 text-left text-[1.05rem] font-medium text-ink transition-colors hover:bg-surface"
        >
          <LogOut size={18} strokeWidth={1.8} className="text-ink-muted" />
          Abmelden
        </button>
      </>
    );
  }

  return (
    <div ref={halter} className="relative">
      <button
        type="button"
        aria-expanded={offen}
        aria-haspopup="menu"
        onClick={() => setOffen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-[0.95rem] font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-surface-tint text-[0.72rem] font-semibold text-primary">
          {initialen || <User size={15} strokeWidth={1.8} />}
        </span>
        Mein Bereich
        <ChevronDown size={14} strokeWidth={2} className="text-ink-muted" />
      </button>
      {offen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-line/70 bg-paper p-1.5 shadow-lift"
        >
          <Link
            prefetch={navPrefetch}
            href="/konto"
            role="menuitem"
            onClick={() => setOffen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium text-ink transition-colors hover:bg-surface"
          >
            <User size={15} strokeWidth={1.8} className="text-primary" />
            Mein Bereich
          </Link>
          {istAdmin ? (
            <Link
              prefetch={navPrefetch}
              href="/admin"
              role="menuitem"
              onClick={() => setOffen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium text-ink transition-colors hover:bg-surface"
            >
              <Shield size={15} strokeWidth={1.8} className="text-primary" />
              Admin
            </Link>
          ) : null}
          {/* WAS AUSGEFALLEN IST, UND EIN AUSWEG, DER ETWAS TUT
              (31.08.2026). Ohne die Antwort von /api/ich fehlen Name
              und Admin-Punkt. Das sah bis heute aus wie ein Konto ohne
              Namen; jetzt steht hier, dass etwas nicht geladen wurde. */}
          {nichtGeladen ? (
            <div className="rounded-xl bg-surface-tint/70 px-3 py-2.5 text-[0.82rem] leading-relaxed text-ink-muted">
              Ihre Kontoangaben konnten nicht geladen werden. Sie sind angemeldet;
              es fehlen nur Name und, falls vorhanden, der Admin-Zugang.{" "}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              >
                Seite neu laden
              </button>
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={abmelden}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[0.9rem] font-medium text-ink transition-colors hover:bg-surface"
          >
            <LogOut size={15} strokeWidth={1.8} className="text-ink-muted" />
            Abmelden
          </button>
        </div>
      ) : null}
    </div>
  );
}
