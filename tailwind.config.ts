import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";
import { siteConfig } from "./site.config";

// Alle Farben kommen aus site.config.ts, damit das spätere CI nur an einer
// Stelle eingepflegt werden muss.
const c = siteConfig.colors;

/**
 * Die Token liegen NICHT mehr als feste Hex-Werte im erzeugten CSS,
 * sondern als CSS-Variablen. Nur so lässt sich später eine zweite
 * Farbfassung (Dunkelmodus im Konto und im Admin) einhängen, ohne
 * jede Klasse zu verdoppeln.
 *
 * site.config.ts bleibt die einzige Quelle. Die Hex-Werte werden dort
 * gebraucht, wo zur Laufzeit kein CSS greift: themeColor im Kopf der
 * Seite, SVG-Striche der Illustrationen, Farben im Exposé-PDF.
 */

/** "#17615B" wird zu "23 97 91". */
function kanaele(hex: string): string {
  const roh = hex.replace("#", "");
  const voll =
    roh.length === 3
      ? roh
          .split("")
          .map((z) => z + z)
          .join("")
      : roh;
  const n = Number.parseInt(voll, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/**
 * Getrennte Kanalwerte statt fertiger Farbe: Nur so bleiben die
 * Deckkraft-Zusätze erhalten. bg-primary/10 wird von Tailwind zu
 * rgb(var(--farbe-primary) / 0.1). Mit einem fertigen rgb(...) in der
 * Variablen wäre der Zusatz wirkungslos.
 */
/** Beide Fassungen haben dieselben Namen, nur andere Werte. */
type Palette = Record<keyof typeof c, string>;
const token = (p: Palette): Record<string, string> => ({
  background: p.background,
  paper: p.paper,
  surface: p.surface,
  "surface-tint": p.surfaceTint,
  primary: p.primary,
  "primary-dark": p.primaryDark,
  accent: p.accent,
  "accent-deep": p.accentDeep,
  ink: p.ink,
  "ink-muted": p.inkMuted,
  line: p.line,
  success: p.success,
});

const TOKEN = token(c);
const TOKEN_DUNKEL = token(siteConfig.colorsDunkel);

/** Verweis auf ein Token, mit Platzhalter für die Deckkraft. */
const t = (name: keyof typeof TOKEN) =>
  `rgb(var(--farbe-${name}) / <alpha-value>)`;

/**
 * Die drei Schatten bekommen eigene Variablen, nicht nur eine eigene
 * Farbe. Auf dunklem Grund trennt man Flächen über Helligkeitsstufen
 * und Linien, nicht über einen anthrazitfarbenen Schleier, der dort
 * ohnehin unsichtbar wäre. Der Dunkelmodus tauscht deshalb den ganzen
 * Wert aus, nicht bloß den Farbanteil.
 */
const SCHATTEN = {
  soft: "0 1px 2px rgb(var(--farbe-schatten) / 0.05), 0 6px 20px rgb(var(--farbe-schatten) / 0.06)",
  card: "0 1px 2px rgb(var(--farbe-schatten) / 0.04), 0 10px 30px rgb(var(--farbe-schatten) / 0.07), 0 28px 64px rgb(var(--farbe-schatten) / 0.05)",
  lift: "0 2px 4px rgb(var(--farbe-schatten) / 0.05), 0 18px 44px rgb(var(--farbe-schatten) / 0.12)",
};

/**
 * Im Dunkeln tragen die Schatten die Trennung NICHT mehr allein, das
 * übernimmt die hellere Kartenfläche. Sie bleiben trotzdem, sonst
 * verlieren aufliegende Ebenen wie Menüs und Dialoge ihre Tiefe. Dafür
 * brauchen sie deutlich mehr Deckkraft: Ein Schleier mit fünf Prozent
 * ist auf dunklem Grund schlicht nicht vorhanden.
 */
const SCHATTEN_DUNKEL = {
  soft: "0 1px 2px rgb(var(--farbe-schatten) / 0.45), 0 6px 20px rgb(var(--farbe-schatten) / 0.4)",
  card: "0 1px 2px rgb(var(--farbe-schatten) / 0.4), 0 10px 30px rgb(var(--farbe-schatten) / 0.45), 0 28px 64px rgb(var(--farbe-schatten) / 0.4)",
  lift: "0 2px 4px rgb(var(--farbe-schatten) / 0.45), 0 18px 44px rgb(var(--farbe-schatten) / 0.55)",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  /**
   * Der Dunkelmodus hängt an der Klasse .dunkel, und zwar bewusst
   * NICHT zwingend an <html>: Die Klasse sitzt später an der Hülle von
   * Konto und Admin. Dann erben genau deren Bausteine die zweite
   * Farbfassung, während dieselben Bausteine auf der öffentlichen
   * Website hell bleiben.
   */
  darkMode: [
    "variant",
    ["&:is(.dunkel *)", "@media (prefers-color-scheme: dark) { &:is(.auto *) }"],
  ],
  theme: {
    extend: {
      colors: {
        background: t("background"),
        paper: t("paper"),
        surface: { DEFAULT: t("surface"), tint: t("surface-tint") },
        primary: { DEFAULT: t("primary"), dark: t("primary-dark") },
        accent: { DEFAULT: t("accent"), deep: t("accent-deep") },
        ink: { DEFAULT: t("ink"), muted: t("ink-muted") },
        line: t("line"),
        success: t("success"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
        /**
         * DIE ÜBERSCHRIFTEN-SCHRIFT IST EINE VARIABLE MIT RÜCKFALL.
         *
         * Ist `--schrift-ueberschrift` nirgends gesetzt, greift der
         * Rückfall und es steht dasselbe da wie vorher: Fraunces,
         * Georgia, serif. Der Schrift-Entwurf setzt die Variable
         * ausschließlich im Anwendungsbereich (app/globals.css,
         * Abschnitt "EINE SCHRIFT IN DER ANWENDUNG"). Wird dieser
         * Abschnitt gelöscht, ist die Zeile hier wieder wirkungslos
         * und niemand muss sie zurückbauen.
         */
        heading: ["var(--schrift-ueberschrift, var(--font-fraunces), Georgia, serif)"],
        /**
         * DIE WORTMARKE IST KEINE TEXTSCHRIFT, sondern unser Zeichen
         * (Auflage des Inhabers, 29.08.2026). Sie hat deshalb eine
         * eigene Familie, die von keiner Bereichs-Regel erreicht wird,
         * und bleibt Fraunces, wo immer sie steht.
         */
        marke: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      // Fluide Größen für die Überschriften-Hierarchie
      fontSize: {
        display: [
          "clamp(2.5rem, 6vw, 4.5rem)",
          { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        h2: [
          "clamp(1.9rem, 4vw, 2.8rem)",
          { lineHeight: "1.12", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        h3: [
          "clamp(1.3rem, 2.2vw, 1.6rem)",
          { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
      },
      maxWidth: { content: "1200px" },
      // Weiche, mehrstufige Schatten statt harter Drop-Shadows
      boxShadow: {
        soft: "var(--schatten-soft)",
        card: "var(--schatten-card)",
        lift: "var(--schatten-lift)",
      },
      borderRadius: { "4xl": "2rem" },
      transitionTimingFunction: {
        swift: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [
    /**
     * Die Variablen werden hier aus site.config.ts erzeugt, statt sie in
     * globals.css ein zweites Mal von Hand zu pflegen. So gibt es
     * weiterhin genau eine Quelle für die Farben, und die Variablen
     * können nie auseinanderlaufen.
     */
    plugin(({ addBase }) => {
      const satz = (
        werte: Record<string, string>,
        schattenFarbe: string,
        schatten: typeof SCHATTEN
      ) => {
        const r: Record<string, string> = {};
        for (const [name, hex] of Object.entries(werte)) {
          r[`--farbe-${name}`] = kanaele(hex);
        }
        r["--farbe-schatten"] = schattenFarbe;
        r["--schatten-soft"] = schatten.soft;
        r["--schatten-card"] = schatten.card;
        r["--schatten-lift"] = schatten.lift;
        return r;
      };

      const hell = satz(TOKEN, kanaele(c.ink), SCHATTEN);
      // Im Dunkeln ist der Schatten schwarz, nicht anthrazit: Ein
      // aufgehellter Schatten würde die Fläche darunter anheben statt
      // sie zu vertiefen.
      const dunkel = satz(TOKEN_DUNKEL, "0 0 0", SCHATTEN_DUNKEL);

      /**
       * Drei Zustände, ohne eine Zeile JavaScript beim ersten Aufbau:
       *
       * .hell  gar nicht nötig, das ist die Vorgabe aus :root
       * .dunkel  feste Wahl des Nutzers
       * .auto  folgt dem System, rein über die Medienabfrage
       *
       * Weil die Klasse serverseitig ins HTML geschrieben wird und der
       * Automatik-Fall reines CSS ist, gibt es beim Laden nichts
       * nachzuholen und damit auch kein Aufblitzen der falschen
       * Fassung.
       */
      addBase({
        ":root": hell,
        ".dunkel": dunkel,
        "@media (prefers-color-scheme: dark)": { ".auto": dunkel },
      });
    }),
    // Hover-Effekte nur auf Geräten mit Maus (media hover: hover)
    plugin(({ addVariant }) => {
      addVariant("hoverable", "@media (hover: hover) { &:hover }");
      addVariant("group-hoverable", "@media (hover: hover) { .group:hover & }");
    }),
    // Ein-/Ausblend-Utilities (animate-in usw.) für die shadcn-Bausteine
    // des Konto-Bereichs (Menüs, Sheets); rein additiv
    require("tailwindcss-animate"),
  ],
};

export default config;
