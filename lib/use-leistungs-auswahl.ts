"use client";

import { useEffect, useRef, useState } from "react";
import {
  abgedeckteAuswahl,
  abgedecktDurch,
  abhaengigeAuswahl,
  dativName,
  fehlendeVoraussetzungen,
  getService,
  namenListe,
} from "@/lib/cart-rules";
import {
  addCartItem,
  removeCartItemsById,
  setCartQuantity,
  useCart,
} from "@/lib/cart-store";
import { servicePrice, siteConfig, type SitePackage, type SiteService } from "@/site.config";

/**
 * Gemeinsame Auswahllogik für Konfigurator UND Leistungsseite.
 *
 * Eine Quelle für covers, requires, Paket-Basis und die Begründungen:
 * Beide Seiten schreiben in denselben Warenkorb, deshalb muss sich die
 * Auswahl überall identisch verhalten. Die Regeln stehen in site.config.ts,
 * die Auswertung in lib/cart-rules.ts, dieser Hook verbindet beides mit
 * dem Warenkorb und den Einblendungen.
 */
export function useLeistungsAuswahl(basisPaket: SitePackage | null = null) {
  const cart = useCart();

  /**
   * Freundlicher Hinweis, wenn die Auswahl automatisch angepasst wurde
   * (Abdeckung oder Voraussetzung). Blendet sich nach einigen Sekunden
   * selbst aus, kann aber auch weggeklickt werden.
   */
  const [hinweis, setHinweis] = useState<string | null>(null);
  const hinweisTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zeigeHinweis = (text: string) => {
    if (hinweisTimer.current) clearTimeout(hinweisTimer.current);
    setHinweis(text);
    hinweisTimer.current = setTimeout(() => setHinweis(null), 8000);
  };
  useEffect(
    () => () => {
      if (hinweisTimer.current) clearTimeout(hinweisTimer.current);
    },
    []
  );

  const serviceItems = cart.filter((item) => item.type === "leistung");
  const isSelected = (id: string) => serviceItems.some((item) => item.id === id);
  const cartEntry = (id: string) => serviceItems.find((item) => item.id === id);
  /** IDs aller aktuell gewählten Leistungen, Basis der Regeln aus cart-rules */
  const gewaehlteIds = new Set(serviceItems.map((item) => item.id));

  /**
   * Paket-Basis: Die Wahrheit ist der EINE Paket-Posten im Warenkorb
   * (mit Paketpreis und Zahlungsart). Der URL-Parameter (basisPaket)
   * dient nur dem Erst-Seeding im Konfigurator. Die enthaltenen
   * Leistungen sperren ihre Karten auf beiden Seiten, auch auf
   * /leistungen ohne URL-Kontext.
   */
  const paketPosten = cart.find((item) => item.type === "paket") ?? null;
  const paketConfig = paketPosten
    ? (siteConfig.packages.find((p) => p.id === paketPosten.id) ?? null)
    : basisPaket;
  const imPaketIds = new Set(paketConfig?.includedServiceIds.map((e) => e.id) ?? []);

  /**
   * Einmalige Aufräum-Runde nach dem Laden des Warenkorbs: Es kann eine
   * Einzel-Leistung im Korb liegen, die eine ebenfalls gewählte
   * Komplett-Leistung schon abdeckt (z. B. nacheinander auf verschiedenen
   * Seiten gewählt). Solche Doppelungen werden hier entfernt, damit keine
   * Beträge doppelt zählen.
   */
  const bereinigtRef = useRef(false);
  useEffect(() => {
    if (bereinigtRef.current || serviceItems.length === 0) return;
    bereinigtRef.current = true;
    const ids = new Set(serviceItems.map((item) => item.id));
    for (const id of ids) {
      const service = getService(id);
      if (!service?.covers) continue;
      const doppelt = abgedeckteAuswahl(id, ids);
      if (doppelt.length === 0) continue;
      for (const d of doppelt) removeCartItemsById("leistung", d.id);
      const text = `${namenListe(doppelt.map((d) => d.name))} entfernt: ${service.covers.reason}`;
      requestAnimationFrame(() => zeigeHinweis(text));
    }
    // Paket-Doppelungen: Einzel-Leistungen, die die Paket-Basis schon
    // enthält, fliegen aus dem Korb (kein doppelter Betrag)
    if (paketPosten && paketConfig) {
      const enthalten = new Set(paketConfig.includedServiceIds.map((e) => e.id));
      const doppelt = serviceItems.filter((item) => enthalten.has(item.id));
      if (doppelt.length) {
        for (const d of doppelt) removeCartItemsById("leistung", d.id);
        const text = `${namenListe(doppelt.map((d) => d.name))} entfernt: Bereits in Ihrem Paket ${paketConfig.name} enthalten.`;
        requestAnimationFrame(() => zeigeHinweis(text));
      }
    }
  }, [serviceItems, paketPosten, paketConfig]);

  /** Leistung in den Warenkorb legen, wahlweise mit Variante und Anzahl */
  const fuegeLeistungHinzu = (
    service: SiteService,
    autoReason: string | null = null,
    opts?: { variant?: string | null; quantity?: number }
  ) => {
    const variant =
      opts?.variant !== undefined ? opts.variant : (service.variants?.[0] ?? null);
    addCartItem({
      type: "leistung",
      id: service.id,
      name: service.name,
      variant,
      quantity: opts?.quantity ?? 1,
      price: servicePrice(service, variant),
      stripePriceId: service.stripePriceId,
      autoReason,
    });
  };

  /**
   * Leistung entfernen und alles mitnehmen, was auf ihr aufbaut
   * (requires-Ketten). Wird von den Karten und vom X in der
   * Zusammenfassung gleichermaßen genutzt. Die Einblendung nennt je
   * mit entferntem Eintrag die Begründung seiner requires-Regel.
   */
  const entferneMitAbhaengigen = (service: SiteService) => {
    const abhaengig = abhaengigeAuswahl(service.id, gewaehlteIds);
    removeCartItemsById("leistung", service.id);
    for (const a of abhaengig) removeCartItemsById("leistung", a.id);
    if (abhaengig.length) {
      const gruppen = new Map<string, string[]>();
      for (const a of abhaengig) {
        const grund = a.requires?.reason ?? `Diese Leistung setzt ${dativName(service)} voraus.`;
        gruppen.set(grund, [...(gruppen.get(grund) ?? []), a.name]);
      }
      zeigeHinweis(
        [...gruppen.entries()]
          .map(([grund, namen]) => `${namenListe(namen)} ebenfalls entfernt: ${grund}`)
          .join(" ")
      );
    }
  };

  /**
   * Auswahl umschalten. Beim Anwählen greifen die Regeln: Abgedeckte
   * Einzel-Leistungen fliegen raus, fehlende Voraussetzungen werden mit
   * Begründung automatisch mitgebucht. opts erlaubt der Leistungsseite,
   * die in der Karte gewählte Variante und Anzahl mitzugeben.
   */
  const toggleService = (
    id: string,
    opts?: { variant?: string | null; quantity?: number }
  ) => {
    const service = getService(id);
    if (!service) return;
    if (isSelected(id)) {
      entferneMitAbhaengigen(service);
      return;
    }
    const abgedeckt = abgedeckteAuswahl(id, gewaehlteIds);
    for (const a of abgedeckt) removeCartItemsById("leistung", a.id);
    const fehlend = fehlendeVoraussetzungen(id, gewaehlteIds);
    for (const f of fehlend) fuegeLeistungHinzu(f.service, f.reason);
    fuegeLeistungHinzu(service, null, opts);
    // Einblendung: erst was passiert ist, dann das Warum aus der Regel
    const meldungen: string[] = [];
    if (abgedeckt.length && service.covers) {
      meldungen.push(
        `${namenListe(abgedeckt.map((a) => a.name))} entfernt: ${service.covers.reason}`
      );
    }
    if (fehlend.length) {
      const gruppen = new Map<string, string[]>();
      for (const f of fehlend) {
        gruppen.set(f.reason, [...(gruppen.get(f.reason) ?? []), f.service.name]);
      }
      for (const [grund, namen] of gruppen) {
        meldungen.push(`${namenListe(namen)} hinzugefügt: ${grund}`);
      }
    }
    if (meldungen.length) zeigeHinweis(meldungen.join(" "));
  };

  /** Variante im Korb ersetzen, Anzahl und Begründung bleiben erhalten */
  const changeVariant = (id: string, variant: string) => {
    const service = getService(id);
    const existing = cartEntry(id);
    if (!service) return;
    removeCartItemsById("leistung", id);
    addCartItem({
      type: "leistung",
      id: service.id,
      name: service.name,
      variant,
      quantity: existing?.quantity ?? 1,
      price: servicePrice(service, variant),
      stripePriceId: service.stripePriceId,
      autoReason: existing?.autoReason ?? null,
    });
  };

  const changeQuantity = (id: string, quantity: number) => {
    const existing = cartEntry(id);
    if (existing) setCartQuantity(existing.key, quantity);
  };

  /**
   * Sperr-Zustand einer Karte: nicht einzeln wählbar, wenn eine gewählte
   * Komplett-Leistung sie schon abdeckt oder sie als Paket-Bestandteil
   * bereits im Korb liegt. Liefert beiden Seiten dieselben Texte.
   */
  const sperrInfo = (id: string) => {
    const gewaehlt = isSelected(id);
    const abdecker = !gewaehlt ? abgedecktDurch(id, gewaehlteIds) : null;
    // Gesperrt, solange die Paket-Basis im Korb liegt (bzw. beim
    // Erst-Seeding über den URL-Parameter bekannt ist)
    const paketGesperrt = imPaketIds.has(id) && Boolean(paketPosten ?? basisPaket);
    return {
      gesperrt: Boolean(abdecker) || paketGesperrt,
      // Kurzform für Badge bzw. inaktiven Button, die volle Begründung
      // (grund) erscheint im Tooltip am Info-Icon
      hinweis: abdecker
        ? `Im ${abdecker.name} enthalten`
        : paketGesperrt
          ? "Bereits in Ihrem Paket enthalten"
          : null,
      grund: abdecker?.covers?.reason ?? null,
    };
  };

  return {
    cart,
    serviceItems,
    isSelected,
    cartEntry,
    gewaehlteIds,
    hinweis,
    zeigeHinweis,
    schliesseHinweis: () => setHinweis(null),
    toggleService,
    entferneMitAbhaengigen,
    changeVariant,
    changeQuantity,
    sperrInfo,
    imPaketIds,
    paketPosten,
    paketConfig,
  };
}
