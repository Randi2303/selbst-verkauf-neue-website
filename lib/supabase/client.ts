import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-Client für den Browser (Login-Formular, Konto-Bereich).
 * Nur aufrufen, wenn supabaseBereit wahr ist, sonst fehlen die
 * Umgebungswerte (siehe lib/supabase/bereit.ts).
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );
}
