import { ImageResponse } from "next/og";
import { siteConfig } from "@/site.config";
import { PORTALE_AUFZAEHLUNG } from "@/config/portale";

/**
 * OG-Bild-Platzhalter, zur Bauzeit generiert (kein Binärbild im Repo).
 * TODO: Vor Veröffentlichung durch ein gestaltetes OG-Bild ersetzen,
 * z. B. mit Foto und finaler Typografie.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "selbst-verkauf.de: Immobilie selbst verkaufen mit echten Profis im Hintergrund";

export default function OpengraphImage() {
  const c = siteConfig.colors;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: c.background,
          color: c.ink,
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
          <span>{siteConfig.wordmark.base}</span>
          <span style={{ color: c.accent }}>{siteConfig.wordmark.accent}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 74, fontWeight: 700, lineHeight: 1.1 }}>
            <span>Immobilie&nbsp;</span>
            <span style={{ color: c.accent }}>selbst</span>
            <span>&nbsp;verkaufen.</span>
          </div>
          <div style={{ display: "flex", fontSize: 74, fontWeight: 700, lineHeight: 1.1 }}>
            Mit echten Profis im Rücken.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: c.primary,
              color: c.background,
              borderRadius: 999,
              padding: "16px 32px",
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            Festpreis statt Provision
          </div>
          <div
            style={{
              display: "flex",
              border: `2px solid ${c.line}`,
              backgroundColor: c.paper,
              borderRadius: 999,
              padding: "16px 32px",
              fontSize: 28,
              color: c.inkMuted,
            }}
          >
            {`${PORTALE_AUFZAEHLUNG} per Klick`}
          </div>
        </div>
      </div>
    ),
    size
  );
}
