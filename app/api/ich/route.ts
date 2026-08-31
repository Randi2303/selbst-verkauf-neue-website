import { NextResponse } from "next/server";
import { supabaseBereit } from "@/lib/supabase/bereit";
import { supabaseServer } from "@/lib/supabase/server";
import { initialenAus } from "@/lib/anzeige-name";

/**
 * Wer ist gerade angemeldet? Eine Quelle für die Identitäts-Anzeige
 * auf der öffentlichen Website.
 *
 * WICHTIG, force-dynamic ist hier nicht optional: Die Antwort ist
 * nutzerbezogen und darf niemals zwischengespeichert oder geteilt
 * ausgeliefert werden, sonst bekäme ein Besucher den Namen eines
 * anderen zu sehen. Dieselbe Regel gilt für jede Ansicht mit
 * Nutzerbezug (siehe README, Abschnitt Bewusste Entscheidungen).
 *
 * Warum überhaupt eine Route: Die öffentlichen Seiten sind statisch
 * vorgerendert, der Server kann den Nutzer also nicht ins HTML
 * schreiben. Der Header fragt hier nach, sobald das Auth-Cookie eine
 * Anmeldung anzeigt. Der Name kommt aus dem PROFIL, damit Website und
 * Konto dieselbe Person gleich benennen; die E-Mail-Adresse taugt
 * dafür nicht, sie kann einem ganz anderen Namen gehören.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const leer = { angemeldet: false, name: null, initialen: "", admin: false };
  if (!supabaseBereit) return NextResponse.json(leer);
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(leer);

  const { data: profil } = await supabase
    .from("profiles")
    .select("name, rolle")
    .eq("id", user.id)
    .maybeSingle<{ name: string | null; rolle: string }>();

  const name = profil?.name?.trim() || null;
  return NextResponse.json({
    angemeldet: true,
    name,
    // Ohne Profilnamen bleibt die E-Mail die Rückfallebene
    initialen: initialenAus(name, user.email ?? null),
    admin: profil?.rolle === "admin",
  });
}
