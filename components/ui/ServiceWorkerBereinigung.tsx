"use client";

import { useEffect } from "react";

/**
 * Solange der Passwortschutz aktiv ist, darf kein Service Worker Seiten
 * lokal ausliefern (das würde den Schutz komplett umgehen). Diese
 * Komponente wird nur bei PASSWORD_PROTECT=true ins Layout gerendert:
 * Sie registriert selbst nichts, deregistriert aber aktiv jeden früher
 * registrierten Service Worker und leert dessen Caches. Bei
 * PASSWORD_PROTECT=false wird sie gar nicht erst eingebunden, es gilt
 * das normale Verhalten.
 */
/**
 * WARUM HIER VIERMAL NICHTS PASSIERT, WENN ETWAS SCHIEFGEHT
 * (begruendet am 31.08.2026, Punkt C12 der Liste).
 *
 * Diese Komponente raeumt AUF EINEM FREMDEN GERAET auf, und zwar
 * Dinge, die dieses Haus nie selbst angelegt hat: Service Worker und
 * Zwischenspeicher, die von einer frueheren Fassung oder von einer
 * ganz anderen Seite unter derselben Adresse stammen koennen.
 *
 * DREI GRUENDE, WARUM DAS SCHWEIGEN HIER RICHTIG IST:
 *
 * 1. Es gibt nichts zu melden, das dem Besucher hilft. Er hat nichts
 *    getan, kann nichts tun, und die Sache betrifft nicht die Seite,
 *    die er gerade lesen will.
 * 2. Die Browser werfen hier auch dann, wenn gar nichts da ist: In
 *    einem privaten Fenster ist `caches` gesperrt, und `unregister`
 *    scheitert an einer Registrierung, die eine andere Seite haelt.
 *    Eine Meldung waere in diesen Faellen schlicht falsch.
 * 3. Der Schutz haengt NICHT hieran. Das Passwort sitzt im Proxy
 *    (proxy.ts); diese Bereinigung ist die zweite Schicht darunter,
 *    fuer den Fall, dass ein alter Service Worker Seiten aus seinem
 *    eigenen Speicher ausliefert.
 *
 * WAS BLEIBT, WENN ES SCHEITERT: ein alter Service Worker auf genau
 * diesem Geraet. Er koennte alte Seiten zeigen. Gemessen ist das nie
 * worden, und dieses Haus liefert selbst keinen aus.
 */
export default function ServiceWorkerBereinigung() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // wirkung: gewollt still, der Grund steht im Kommentar darueber
      navigator.serviceWorker
        .getRegistrations()
        .then((registrierungen) => {
          for (const registrierung of registrierungen) {
            // wirkung: gewollt still, siehe der Block ueber der Komponente: fremdes Geraet, nichts zu melden, Schutz haengt nicht daran
            registrierung.unregister().catch(() => {});
          }
        })
        // wirkung: gewollt still, dasselbe; getRegistrations wirft auch dort, wo es gar keine gibt
        .catch(() => {});
    }
    if ("caches" in window) {
      caches
        .keys()
        .then((namen) => {
          for (const name of namen) {
            // wirkung: gewollt still, dasselbe; ein Zwischenspeicher, den eine andere Seite haelt, laesst sich nicht loeschen
            caches.delete(name).catch(() => {});
          }
        })
        // wirkung: gewollt still, dasselbe; im privaten Fenster ist caches.keys gesperrt
        .catch(() => {});
    }
  }, []);
  return null;
}
