"use client";

import Link from "next/link";
import StartseitenLink from "@/components/layout/StartseitenLink";
import { usePathname } from "next/navigation";
import Wordmark from "@/components/layout/Wordmark";
import BrandName from "@/components/ui/BrandName";
import { chatEingerichtet, NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/lib/content";
import { KUENDIGUNG_LINK_TEXT } from "@/config/vertragstexte";
import { siteConfig } from "@/site.config";
import { zusageKurz } from "@/lib/zusage";
import { scrollToId } from "@/lib/scroll";
import { telHref } from "@/lib/utils";
import { istPasswortschutz } from "@/lib/passwortschutz";
/*
 * Solange der Passwortschutz aktiv ist, lädt die Navigation nichts auf
 * Vorrat (kein Prefetch), damit vor der Anmeldung keine Inhalte im
 * Client landen. Bei PASSWORD_PROTECT=false gilt das normale Verhalten.
 */
const navPrefetch = istPasswortschutz ? false : undefined;


/**
 * Social-Icons als Inline-SVGs im Lucide-Stil (Strichstärke 1.6),
 * da neuere lucide-react-Versionen keine Markenlogos mehr enthalten.
 */
type IconProps = { size?: number };

function InstagramIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function YoutubeIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

/**
 * Footer mit Wortmarke, Anker-Links, Kontakt-Platzhalter und Rechtlichem.
 * Die E-Mail-Adresse ist zugleich der Offline-Fallback zum Live-Chat.
 */
export default function Footer() {
  const pathname = usePathname();
  return (
    <footer className="border-t border-line/80 bg-surface">
      <div className="container-page pb-10 pt-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.4fr,1fr,1fr,1.2fr]">
          <div>
            {/* Wortmarke mit demselben Klickverhalten wie im Header */}
            <StartseitenLink className="inline-block cursor-pointer rounded-md text-[1.25rem]">
              <Wordmark />
            </StartseitenLink>
            <p className="mt-4 max-w-xs text-[0.95rem] leading-relaxed text-ink-muted">
              Die Plattform, mit der private Eigentümer ihre Immobilie selbst
              verkaufen. Mit echten Maklern im Hintergrund, zum Festpreis statt
              Provision.
            </p>
            {/* Social-Profile, Ziele als Platzhalter in site.config.ts */}
            <ul className="mt-6 flex gap-3">
              {(
                [
                  { label: "Instagram", href: siteConfig.social.instagram, Icon: InstagramIcon },
                  { label: "LinkedIn", href: siteConfig.social.linkedin, Icon: LinkedinIcon },
                  { label: "YouTube", href: siteConfig.social.youtube, Icon: YoutubeIcon },
                ] as const
              ).map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={`${label}-Profil von ${siteConfig.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-primary shadow-soft transition-all duration-200 ease-swift hoverable:-translate-y-0.5 hoverable:bg-surface-tint"
                  >
                    <Icon size={17} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Bereiche dieser Seite">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Übersicht
            </p>
            <ul className="mt-4 space-y-2.5 text-[0.95rem]">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link prefetch={navPrefetch}
                    href={item.href}
                    onClick={(e) => {
                      if (item.href.startsWith("/#") && pathname === "/") {
                        e.preventDefault();
                        scrollToId(item.href.slice(2));
                      }
                    }}
                    className="rounded-md text-ink-muted transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {SECONDARY_NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link prefetch={navPrefetch} href={item.href} className="rounded-md text-ink-muted transition-colors hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link prefetch={navPrefetch}
                  href={siteConfig.loginUrl}
                  className="rounded-md text-ink-muted transition-colors hover:text-ink"
                >
                  Anmelden
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Rechtliches">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Rechtliches
            </p>
            <ul className="mt-4 space-y-2.5 text-[0.95rem]">
              <li>
                <Link prefetch={navPrefetch} href="/impressum" className="rounded-md text-ink-muted transition-colors hover:text-ink">
                  Impressum
                </Link>
              </li>
              <li>
                <Link prefetch={navPrefetch} href="/datenschutz" className="rounded-md text-ink-muted transition-colors hover:text-ink">
                  Datenschutz
                </Link>
              </li>
              {/* Gesetzlich geforderter, staendig verfuegbarer und
                  unmittelbar auffindbarer Kuendigungsweg (§ 312k BGB
                  sinngemaess). Er steht im Fuss JEDER Seite und darf
                  nie hinter einer Anmeldung liegen. */}
              <li>
                <Link prefetch={navPrefetch} href="/kuendigen" className="rounded-md text-ink-muted transition-colors hover:text-ink">
                  {KUENDIGUNG_LINK_TEXT}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Kontakt
            </p>
            {/* Der Satz haengt daran, ob der Chat WIRKLICH eingerichtet
                ist. Mit der Platzhalter-Kennung ist der Knopf zwar da,
                dahinter liegt aber nur ein Hinweis auf die
                E-Mail-Adresse. Ein Versprechen auf ein Gespraech waere
                dann nicht eingeloest. */}
            <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">
              {chatEingerichtet()
                ? "Sie erreichen uns im Chat unten rechts. Wenn gerade niemand online ist, können Sie dort eine Nachricht hinterlassen oder uns schreiben:"
                : `Schreiben Sie uns. ${zusageKurz()}:`}
            </p>
            {/* TODO: Platzhalter-Adresse und -Nummer, vor Veröffentlichung ersetzen */}
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="mt-2 inline-block rounded-md font-medium text-primary transition-colors hover:text-primary-dark"
            >
              {siteConfig.contact.email}
            </a>
            <a
              href={telHref(siteConfig.contact.phone)}
              className="mt-1.5 block w-fit rounded-md font-medium tabular-nums text-primary transition-colors hover:text-primary-dark"
            >
              {siteConfig.contact.phone}
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-line/80 pt-6 text-[0.85rem] text-ink-muted sm:flex-row sm:items-center">
          <p>
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> <BrandName />. Alle
            Rechte vorbehalten.
          </p>
          <p>Festpreis statt Provision. Wir drängen nicht, wir erklären.</p>
        </div>
      </div>
    </footer>
  );
}
