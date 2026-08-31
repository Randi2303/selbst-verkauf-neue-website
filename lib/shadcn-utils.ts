import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn NUR für die shadcn-Bausteine unter components/ui: Die brauchen
 * twMerge, damit ihre Varianten-Klassen sauber überschrieben werden
 * können. Der Rest der Website nutzt bewusst das twMerge-freie cn aus
 * lib/utils.ts (dort gewinnen hart kodierte Klassen, worauf sich
 * mehrere Bauteile verlassen). Beide nicht vermischen.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
