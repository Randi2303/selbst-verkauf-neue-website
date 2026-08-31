/**
 * Zentraler Lesezugriff auf den Passwortschutz-Schalter (PASSWORD_PROTECT),
 * das Gegenstück zu lib/prelaunch.ts für den zweiten, unabhängigen
 * Schalter. Wird zur Build-Zeit gelesen (Hostinger baut mit den in den
 * App-Einstellungen gepflegten Variablen, nach einer Umstellung ist ein
 * Redeploy nötig). Die Anfrage-Prüfung selbst passiert zur Laufzeit in
 * proxy.ts, dieser Wert steuert die Client-Seite (Service-Worker-
 * Bereinigung im Layout).
 *
 * SEIT DER UNTERDOMAIN-RUNDE FAIL-CLOSED, in derselben Lesart wie
 * proxy.ts (Auflage des Inhabers, 24.08.2026): Der Schutz gilt als
 * aktiv, solange nicht ausdrücklich "false" dasteht. Eine fehlende
 * Variable darf nie das Falsche tun, und das Falsche wäre hier eine
 * offene Seite samt Prefetching. Lokal gehört PASSWORD_PROTECT=false
 * in die .env.local (siehe .env.local.example).
 */
export const istPasswortschutz = process.env.PASSWORD_PROTECT !== "false";

/**
 * Prefetch-Einstellung für Navigations-Links: Solange der Passwortschutz
 * aktiv ist, lädt der Router keine Seiten auf Vorrat (undefined heißt
 * Standardverhalten nach dem Launch).
 */
export const navPrefetch = istPasswortschutz ? false : undefined;
