"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Zentraler Warenkorb für das Wunsch-Paket.
 *
 * Ein schlanker externer Store (useSyncExternalStore) mit Persistenz in
 * localStorage: Die Auswahl übersteht Seitenwechsel und Neuladen. Der
 * Server rendert immer einen leeren Korb, die gespeicherten Einträge
 * werden erst nach der Hydration geladen (kein Hydration-Mismatch).
 *
 * Preise werden bewusst nicht angezeigt. Jeder Eintrag trägt aber schon
 * price und stripePriceId aus der Konfiguration (vorerst null), damit
 * später nur noch Stripe angeschlossen werden muss (siehe lib/checkout.ts).
 */

export type CartItemType = "paket" | "leistung";

export type CartItem = {
  /** Eindeutiger Schlüssel aus Typ, id und Variante */
  key: string;
  id: string;
  type: CartItemType;
  name: string;
  variant: string | null;
  quantity: number;
  /** TODO Stripe: aus site.config.ts, vorerst null */
  price: number | null;
  /** TODO Stripe: aus site.config.ts, vorerst null */
  stripePriceId: string | null;
  /**
   * Begründung, wenn der Eintrag automatisch mitgebucht wurde
   * (requires-Regel). Wird im Warenkorb hinter einem Info-Icon gezeigt.
   */
  autoReason?: string | null;
  /**
   * Nur für Paket-Posten: gewählte Zahlungsart der Basis. Der Preis wird
   * live aus monthly bzw. once des Pakets in site.config.ts gerechnet.
   */
  paymentMode?: "monthly" | "once";
  /**
   * Nur für Paket-Posten: bewusst abgewählte enthaltene Leistungen
   * (Service-IDs). Ändert den Paketpreis nicht.
   */
  abgewaehlt?: string[];
};

const STORAGE_KEY = "sv-wunsch-paket";
const INSTANT_KEY = "sv-sofortzahlung";
const EMPTY: readonly CartItem[] = [];

let items: readonly CartItem[] = EMPTY;
let instantPayment = false;
let initialized = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // wirkung: gewollt, Browser-Speicher voll oder blockiert: die Auswahl gilt dann nur für diese Sitzung
  }
}

function emit() {
  for (const listener of listeners) listener();
}

/** Gespeicherte Auswahl nach der Hydration laden (einmalig) */
function initFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed.filter(
          (entry): entry is CartItem =>
            Boolean(entry) && typeof entry === "object" && typeof (entry as CartItem).key === "string"
        );
      }
    }
    instantPayment = localStorage.getItem(INSTANT_KEY) === "1";
    emit();
  } catch {
    // wirkung: gewollt, defekte gespeicherte Daten sind kein Fehlerfall: der Korb startet dann leer
  }
}

export function cartKey(type: CartItemType, id: string, variant: string | null): string {
  return `${type}:${id}:${variant ?? ""}`;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return items;
}

function getServerSnapshot() {
  return EMPTY;
}

/** Aktueller Warenkorb als React-Hook, initialisiert sich selbst */
export function useCart(): readonly CartItem[] {
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (!initialized) {
      initialized = true;
      initFromStorage();
    }
  }, []);
  return cart;
}

/** Eintrag hinzufügen. Existiert der Schlüssel schon, wird die Anzahl übernommen */
export function addCartItem(input: {
  type: CartItemType;
  id: string;
  name: string;
  variant?: string | null;
  quantity?: number;
  price?: number | null;
  stripePriceId?: string | null;
  autoReason?: string | null;
  paymentMode?: "monthly" | "once";
}) {
  const variant = input.variant ?? null;
  const key = cartKey(input.type, input.id, variant);
  const quantity = Math.max(1, input.quantity ?? 1);
  const existing = items.find((item) => item.key === key);
  if (existing) {
    items = items.map((item) => (item.key === key ? { ...item, quantity } : item));
  } else {
    items = [
      ...items,
      {
        key,
        id: input.id,
        type: input.type,
        name: input.name,
        variant,
        quantity,
        price: input.price ?? null,
        stripePriceId: input.stripePriceId ?? null,
        autoReason: input.autoReason ?? null,
        ...(input.paymentMode ? { paymentMode: input.paymentMode } : {}),
      },
    ];
  }
  persist();
  emit();
}

/** Einzelne Felder eines Eintrags ändern (Zahlungsart, Abwahl-Liste) */
export function updateCartItem(
  key: string,
  patch: Partial<Pick<CartItem, "paymentMode" | "abgewaehlt" | "quantity">>
) {
  items = items.map((item) => (item.key === key ? { ...item, ...patch } : item));
  persist();
  emit();
}

export function removeCartItem(key: string) {
  items = items.filter((item) => item.key !== key);
  persist();
  emit();
}

export function setCartQuantity(key: string, quantity: number) {
  items = items.map((item) =>
    item.key === key ? { ...item, quantity: Math.max(1, quantity) } : item
  );
  persist();
  emit();
}

/**
 * Paket als Basis setzen: ersetzt eine eventuell vorhandene Paket-Basis
 * durch das gewählte Paket samt Zahlungsart. Für den direkten Weg
 * "Paket wählen" von den Paketkarten zur Kasse; enthaltene
 * Einzelleistungen räumt die zentrale Bereinigung im Auswahl-Hook auf.
 */
export function setPackageBase(input: {
  id: string;
  name: string;
  paymentMode: "monthly" | "once";
}) {
  items = [
    ...items.filter((item) => item.type !== "paket"),
    {
      key: cartKey("paket", input.id, null),
      id: input.id,
      type: "paket",
      name: input.name,
      variant: null,
      quantity: 1,
      price: null,
      stripePriceId: null,
      autoReason: null,
      paymentMode: input.paymentMode,
    },
  ];
  persist();
  emit();
}

/** Entfernt alle Einträge einer Leistung, unabhängig von der Variante */
export function removeCartItemsById(type: CartItemType, id: string) {
  items = items.filter((item) => !(item.type === type && item.id === id));
  persist();
  emit();
}

export function clearCart() {
  items = EMPTY;
  persist();
  emit();
}

/* ------------------------------------------------------------------ */
/* Sofortzahlungs-Rabatt: gleiche Persistenz wie der Warenkorb        */
/* ------------------------------------------------------------------ */

function getInstantPayment() {
  return instantPayment;
}

function getServerInstantPayment() {
  return false;
}

/** Gewählte Sofortzahlung als React-Hook, übersteht Neuladen */
export function useInstantPayment(): boolean {
  const value = useSyncExternalStore(subscribe, getInstantPayment, getServerInstantPayment);
  useEffect(() => {
    if (!initialized) {
      initialized = true;
      initFromStorage();
    }
  }, []);
  return value;
}

export function setInstantPayment(value: boolean) {
  instantPayment = value;
  try {
    localStorage.setItem(INSTANT_KEY, value ? "1" : "0");
  } catch {
    // wirkung: gewollt, ohne Browser-Speicher gilt die Wahl nur für diese Sitzung
  }
  emit();
}
