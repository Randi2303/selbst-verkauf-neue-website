/**
 * Bereitschafts-Schalter für Supabase, gleiches Prinzip wie bei Stripe:
 * Der Bereich hinter dem Login ist fertig verdrahtet und schaltet sich
 * selbst frei, sobald in den Umgebungsvariablen (lokal .env.local,
 * live Hostinger-App-Einstellungen, danach neu deployen) die beiden
 * Werte des Supabase-Projekts stehen:
 *   NEXT_PUBLIC_SUPABASE_URL       (Projekt-URL, https://xxxx.supabase.co)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (öffentlicher anon-Schlüssel)
 * Beide sind für den Browser bestimmt und keine Geheimnisse; der
 * Datenschutz kommt aus den Row-Level-Security-Regeln der Datenbank
 * (siehe supabase/schema.sql). Solange die Werte fehlen, zeigt /login
 * die freundliche Einblendung und /konto leitet zur Anmeldung um.
 */
export const supabaseBereit = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
