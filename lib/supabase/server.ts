import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase-Client für Server-Komponenten und Routen: liest die
 * Sitzung aus den Cookies der Anfrage. Nur aufrufen, wenn
 * supabaseBereit wahr ist (siehe lib/supabase/bereit.ts).
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(zuSetzen) {
          try {
            for (const { name, value, options } of zuSetzen) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // wirkung: gewollt, das dokumentierte Next-Muster: Server-Komponenten dürfen
            // keine Cookies schreiben, das Sitzungs-Auffrischen übernimmt der Browser-Client
          }
        },
      },
    }
  );
}
