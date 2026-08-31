import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import ObjektseiteInhalt from "@/components/objektseite/ObjektseiteInhalt";
import { ladeObjektseiteDaten } from "@/lib/objektseite-daten";
import { navPrefetch } from "@/lib/passwortschutz";
import type { Objekt } from "@/lib/objekt-felder";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Die Vorschau der eigenen Objektseite, BEWUSST ausserhalb des
 * Konto-Layouts: Der Verkaeufer sieht exakt die Seite, die Besucher
 * sehen, ohne Seitenleiste und Konto-Kopf. Darueber liegt nur ein
 * schmaler Vorschau-Streifen mit dem Rueckweg.
 */
export default async function ObjektseiteVorschau() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: objekt } = await supabase
    .from("objekte")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Objekt>();
  if (!objekt) redirect("/konto/objekt");

  const daten = await ladeObjektseiteDaten(objekt);
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="sticky top-0 z-50 border-b border-primary/30 bg-surface-tint/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2">
          <p className="text-[0.85rem] leading-snug text-ink">
            <span className="font-semibold">Vorschau:</span> So sehen Besucher
            Ihr Exposé.
            {objekt.seite_kennung
              ? " Das Anfrage-Formular unten ist echt."
              : " Das Anfrage-Formular erscheint, sobald Ihre Seite eine Adresse hat."}
          </p>
          <Link
            prefetch={navPrefetch}
            href="/konto/objekt"
            className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-primary hover:text-primary-dark"
          >
            <ArrowLeft size={14} strokeWidth={1.9} />
            Zurück zum Objekt
          </Link>
        </div>
      </div>
      <ObjektseiteInhalt
        objekt={objekt}
        daten={daten}
        formularKennung={objekt.seite_kennung}
        pdfPfad={null}
      />
    </div>
  );
}
