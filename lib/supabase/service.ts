import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase-Client mit Service-Rolle. NUR SERVER-SEITIG VERWENDEN
 * (API-Routen und Server-Komponenten), der Schlüssel umgeht Row Level
 * Security und darf den Browser niemals erreichen. Er liegt als
 * SUPABASE_SERVICE_ROLE_KEY ohne NEXT_PUBLIC-Präfix in der Umgebung.
 *
 * Eingesetzt für die Dinge, die Browser-Clients bewusst nicht dürfen:
 * Bewertungen schreiben, Report-PDFs im privaten Storage ablegen und
 * signierte Download-URLs erzeugen.
 */
export function supabaseService(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* Der Name steht seit dem 22.08.2026 in config/speicher-faecher.mjs,
   damit auch die Werkzeuge mit blossem node ihn holen koennen statt
   ihn hinzuschreiben. Hier bleibt die Ausfuhr, damit kein Aufrufer
   etwas aendern muss. */
export { UNTERLAGEN_BUCKET } from "@/config/speicher-faecher.mjs";
