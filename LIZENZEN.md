# Lizenzen und Nachweise

Vollständiges Inventar aller Fremd-Assets und Bibliotheken im Projekt.
Bei jeder Erweiterung hier nachtragen. Die kompakte, öffentliche Fassung
steht auf der Impressum-Seite unter "Bild-, Icon- und Schriftnachweise".

Stand: 01.08.2026, Versionen entsprechen dem installierten Stand
(package-lock.json ist maßgeblich).

## Icons

| Asset | Version | Quelle | Lizenz | Verwendung im Projekt |
| --- | --- | --- | --- | --- |
| Lucide (lucide-react) | 1.28.0 | https://lucide.dev | ISC, https://lucide.dev/license | Icons auf allen Seiten und in allen Komponenten. Hinweis: Die früher in Lucide enthaltenen Markenlogos (Instagram, LinkedIn, YouTube) sind in dieser Version nicht mehr enthalten, die Social-Icons im Footer sind deshalb eigene Nachbauten im Linien-Stil (siehe "Eigene Darstellungen"). |

## Schriften

| Asset | Quelle | Lizenz | Verwendung im Projekt |
| --- | --- | --- | --- |
| Fraunces | https://fonts.google.com/specimen/Fraunces | SIL Open Font License 1.1, https://openfontlicense.org | Überschriften der ÖFFENTLICHEN Website und die Wortmarke ÜBERALL, auch in der Anwendung, im Exposé und auf der Objektseite. Über next/font/google zur Bauzeit heruntergeladen und lokal gebündelt (self-hosted), zur Laufzeit keine Verbindung zu Google-Servern. Eingebunden in app/layout.tsx. Auch Grundlage der Marken-Dateien in public/marke (siehe Prüfvermerk zur Wortmarke unten). |
| Inter | https://fonts.google.com/specimen/Inter | SIL Open Font License 1.1, https://openfontlicense.org | Fließtext, UI und Zahlen überall, dazu seit dem 29.08.2026 die ÜBERSCHRIFTEN DER ANWENDUNG (Konto, interner Bereich, Objektseite). Gleiche Einbindung wie Fraunces (self-hosted über next/font). |
| Lora | https://fonts.google.com/specimen/Lora | SIL Open Font License 1.1, https://openfontlicense.org | NUR im Exposé-PDF: Überschriften, Preis und der Vorschau-Stempel. Kommt auf keiner Bildschirmseite vor und wird von keinem Browser geladen. Als Datei im Projekt (assets/fonts/lora-600.woff), von pdf-lib eingebettet; zur Laufzeit keine Verbindung nach außen. Bezogen am 29.08.2026 aus @fontsource/lora 5.2.8, derselben Quelle wie Inter und Fraunces. |

**ACHTUNG, LORA HAT EINEN GESCHÜTZTEN NAMEN.** Die OFL-Kopfzeile von
Lora lautet: Copyright 2011 The Lora Project Authors, *with Reserved
Font Name "Lora"*. Fraunces und Inter haben keinen. Praktisch heißt
das: Eine VERÄNDERTE Fassung dürfte nicht mehr "Lora" heißen. Wir
verändern nichts; pdf-lib bettet beim Erzeugen einen Ausschnitt ein und
versieht ihn dabei mit dem üblichen Ausschnitt-Präfix, das ist gängige
Praxis und keine Weitergabe einer veränderten Schrift unter ihrem
Namen. Der Punkt steht hier, weil bei der Schriftwahl im August 2026
ausdrücklich nach "OFL ohne geschützten Namen" ausgewählt wurde; Lora
erfüllt dieses damalige Kriterium NICHT.

Nachweis der Datei (29.08.2026):
`assets/fonts/lora-600.woff`, 26.812 Bytes,
SHA-256 `e395f87029ff87a7850f15959c4e64dc941c90df34efb3aea1ac8624aa3327b7`,
bezogen von
`https://cdn.jsdelivr.net/npm/@fontsource/lora@5.2.8/files/lora-latin-600-normal.woff`.

**Zum Nachweis auf der Impressum-Seite (geprüft 29.08.2026):** Er
nennt beide Schriften, ihre Herkunft, die Lizenz und dass sie lokal
ausgeliefert werden. Das stimmt unverändert. Die Schrift-Umstellung im
Anmeldebereich ändert daran nichts: Fraunces wird weiterhin auf jeder
Seite geladen, weil die Wortmarke sie trägt. Am öffentlichen Nachweis
ist deshalb NICHTS zu ändern.

## Fotos

| Asset | Quelle | Lizenz | Verwendung im Projekt |
| --- | --- | --- | --- |
| Helles Wohnzimmer mit Sofa (photo-1522708323590-d24dbb6b0267) | https://unsplash.com | Unsplash-Lizenz, https://unsplash.com/license | components/sections/FinalCta.tsx. TODO: durch eigenes Foto ersetzen. |

Das ist das **letzte fremde Foto im Projekt**. Es wird über den
Next-Image-Optimizer vom eigenen Server ausgeliefert (remotePatterns in
next.config.ts).

Sobald es durch ein eigenes ersetzt ist, gehören VIER Stellen mit
aufgeräumt, nicht nur diese Zeile: das Bild in
`components/sections/FinalCta.tsx`, die Freigabe des fremden Hosts in
`next.config.ts` (remotePatterns), die Bildquellen-Angabe in
`app/impressum/page.tsx` und dieser Abschnitt hier.

**Diese Datei führt nur, was wirklich im Projekt steckt.** Am 26.08.2026
ausgetragen: ein zweites Unsplash-Foto ("Wohnhaus mit Garten im
Abendlicht"), das als Verwendung noch
`components/sections/Testimonials.tsx` nannte. Diese Datei nutzt seit der
Menschen-Runde die eigenen Fotos; die Kennung des Fotos kam im gesamten
Projekt nur noch in dieser Tabelle vor.

## Eingebundene Dienste mit eigenen Assets

| Dienst | Quelle | Hinweis |
| --- | --- | --- |
| Crisp Live-Chat | https://crisp.chat | Script und Widget-Assets des Anbieters laden erst nach aktivem Klick auf den Chat-Button (components/chat/ChatLauncher.tsx), nie beim Seitenaufruf. Website-ID ist aktuell ein Platzhalter in site.config.ts. |

## Eigene Darstellungen

Alle übrigen Grafiken sind selbst erstellt und liegen als Code im Projekt:
© selbst-verkauf.de.

- Inline-SVG-Illustrationen (z. B. Haus-Linienmotive, PDF-Dokument im
  Funktions-Grid, Kompetenz-Icons und Platzhalter-Muster auf der Team-Seite,
  Social-Icons im Footer)
- Gecodete Produkt-Mockups (Dashboard, iPhone-Chat, Portal-Chips,
  Terminkarte, Preisspannen-Karte, Bewertungskarte)
- Wortmarke und Signet als Dateien (public/marke), Logo-Platzhalter
  (public/logo-platzhalter.svg), Favicon (app/icon.svg) und das zur
  Bauzeit generierte OG-Bild (app/opengraph-image.tsx)

## Prüfvermerk zur Wortmarke (Schriftlizenz)

Die Wortmarke in public/marke setzt den Schriftzug "selbst-verkauf.de"
in Fraunces und wandelt die Buchstaben in SVG-Pfade um. Beides ist von
der Lizenz gedeckt, geprüft am 06.08.2026 am Original-Lizenztext und
der offiziellen FAQ:

- Lizenz: SIL Open Font License 1.1 (OFL.txt im Projekt-Repository
  github.com/undercasetype/Fraunces und in der Google-Fonts-Auslieferung),
  Copyright 2020 The Fraunces Project Authors. Die Schrift führt KEINE
  Reserved Font Names, es gibt also nicht einmal die
  Umbenennungs-Pflicht bei veränderten Fassungen.
- Nutzung in einem Logo: Die offizielle OFL-FAQ (Frage 1.1 auf
  openfontlicense.org) erlaubt die Verwendung ausdrücklich, auch
  kommerziell; das gestaltete Ergebnis gehört dem Gestalter.
- Umwandlung in Pfade: FAQ 1.1.1 stellt klar, dass das Einbetten von
  Glyphen-Umrissen in ein Grafik-Dokument erlaubt ist und daraus keine
  Weitergabe der Schriftsoftware wird.
- Nicht erlaubt wäre nur, die Schriftdatei selbst zu verkaufen. Das
  passiert hier nicht: ausgeliefert werden Pfade, keine Font-Datei.
- Davon unberührt ist die markenrechtliche Seite (Eintragung der
  Wortmarke beim DPMA), die mit der Schriftlizenz nichts zu tun hat.

## JavaScript-Bibliotheken (Software-Lizenzen)

| Bibliothek | Version | Lizenz | Verwendung |
| --- | --- | --- | --- |
| Next.js | 16.2.12 | MIT | Framework |
| React / React DOM | 19.2.4 | MIT | UI-Bibliothek |
| Tailwind CSS | 3.4.19 | MIT | Styling |
| framer-motion | 12.43.0 | MIT | UI- und Scroll-Animationen |
| GSAP | 3.15.0 | GSAP Standard License (kostenlos, auch kommerziell), https://gsap.com/standard-license | Scrub-Animation des Zeitstrahls |
| Lenis | 1.3.25 | MIT | Sanftes Scrollen |
| Embla Carousel React | 8.6.0 | MIT | Vertrauens-Slider |
| Inter (WOFF 400 und 600, assets/fonts) | 5.2.8 via Fontsource | SIL OFL 1.1 | Eingebettet in Exposé-PDF, Arbeitsblatt- und Checklisten-PDF und QR-Druckblatt. Fließtext überall; im Arbeitsblatt- und Checklisten-PDF und im QR-Blatt seit 29.08.2026 auch die Überschriften. |
| Fraunces (WOFF 600, assets/fonts) | 5.2.8 via Fontsource | SIL OFL 1.1 | Eingebettet in denselben drei PDF-Erzeugern, seit 29.08.2026 aber NUR NOCH für die Wortmarke. |
| Lora (WOFF 600, assets/fonts) | 5.2.8 via Fontsource | SIL OFL 1.1, mit geschütztem Namen (siehe oben) | NUR im Exposé-PDF: Überschriften, Preis, Vorschau-Stempel. Kostet das fertige Exposé rund 1 kB gegenüber dem Stand mit Fraunces (gemessen am Vorführ-Exposé: 945.053 auf 946.086 Bytes). |
| sharp | 0.35 | Apache-2.0 | Server-Bildverarbeitung (HEIC, Wasserzeichen, Exposé) |
| heic-convert | 2.1 | ISC | HEIC zu JPG beim Upload |
| pdf-lib + fontkit | 1.17 / 1.1 | MIT | Exposé-PDF-Erzeugung |

## Abhängigkeiten mit Auflagen (Nachtrag 25.08.2026)

Vier Pakete kommen nicht über MIT, ISC, Apache oder BSD herein. Keines
löst bei uns eine Pflicht aus, aber jedes ist hier begründet, damit
niemand später neu nachdenken muss.

| Paket | Version | Lizenz | Warum keine Pflicht entsteht |
| --- | --- | --- | --- |
| `@img/sharp-libvips-*` | 1.3.2 | LGPL-3.0-or-later | Die native Bildbibliothek hinter `sharp`. LGPL greift beim **Weitergeben** von Software. Wir betreiben einen Dienst und geben nichts weiter, und wir verändern die Bibliothek nicht. Beides muss so bleiben: Wer sie je patcht oder in etwas bündelt, das ein Kunde installiert, löst die Offenlegungspflicht für die Bibliothek aus. |
| `libheif-js` | 1.19.8 | LGPL-3.0 | Wandelt HEIC-Fotos beim Upload. Dieselbe Begründung wie oben, unverändert eingebunden, nichts wird weitergegeben. |
| `axe-core` und ein weiteres | (Bau-Abhängigkeit) | MPL-2.0 | Dateiweises Copyleft: Es greift nur, wenn man diese Dateien selbst verändert. Wir verwenden sie unverändert, und sie laufen ohnehin nur in Prüfläufen, nicht im Betrieb. |
| `caniuse-lite` | (Bau-Abhängigkeit) | CC-BY-4.0 | Verlangt Namensnennung. Das Paket wird nur zur Bauzeit gelesen und landet nicht beim Kunden; die Nennung erfolgt trotzdem hier. Datenquelle: https://caniuse.com, Autoren siehe https://github.com/browserslist/caniuse-lite |

**Was ausdrücklich NICHT im Projekt steckt, geprüft am 25.08.2026 über
alle installierten Pakete:** keine AGPL, keine SSPL, keine BUSL und kein
einfaches GPL. Das sind die Lizenzen, die bei einem Dienst im Netz
gefährlich werden, weil bei ihnen bereits die Benutzung über das Netz
die Offenlegung auslösen kann.

**Wie geprüft wurde:** Gelesen wurde die Lizenzangabe in der
`package.json` jedes installierten Pakets, nicht jede Lizenzdatei im
Volltext. Die Zahlen sind damit ein Stand und keine ewige Wahrheit; nach
jeder größeren Paket-Änderung gehört der Lauf wiederholt. Die
vollständige Aufstellung des geprüften Standes liegt daneben als
`lizenzen-stand-2026-08-25.txt`.

## Prüfvermerk

- Es wurde kein Asset mit unklarer oder fehlender Lizenz gefunden.
- Schriften nachweislich self-hosted: Das ausgelieferte HTML enthält keine
  Verweise auf fonts.googleapis.com oder fonts.gstatic.com, die
  Font-Dateien liegen unter /_next/static/media/.
