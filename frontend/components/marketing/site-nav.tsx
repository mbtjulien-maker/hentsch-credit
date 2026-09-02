"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";

// href -> clé de traduction (Nav.links.*) — un objet plutôt qu'un tableau de tuples pour
// que l'ordre d'affichage (celui des clés ci-dessous) reste trivial à relire/réordonner.
const NAV_LINK_KEYS = {
  "/comment-ca-marche": "commentCaMarche",
  "/rendement": "rendement",
  "/strategie-rwa": "strategieRwa",
  "/investissement-direct": "investissementDirect",
  "/marche": "marche",
  "/tarifs": "tarifs",
} as const;

// Barre de navigation de la vitrine publique ("/") — distincte de la sidebar/header de
// l'espace client connecté (cf. app/dashboard/layout.tsx). Menu masqué en dessous de lg
// (repris dans le pied de page, cf. SiteFooter) : pas de menu mobile dédié pour l'instant,
// périmètre volontairement restreint.
//
// Composant client (pas un Server Component asynchrone comme avant) : le fond coulissant
// a besoin de usePathname() (page active) et de mesurer les liens au survol/à chaque
// changement de page — deux choses que seul le client sait faire. useTranslations
// (variante client de next-intl) remplace getTranslations, alimenté par le
// NextIntlClientProvider déjà posé plus haut dans l'arbre (cf. app/[locale]/layout.tsx).
//
// Le fond coulissant est repositionné en manipulant directement le style du DOM (pillRef)
// plutôt que via un useState : ce n'est qu'un décor (aria-hidden), jamais une donnée dont
// le reste du rendu dépend — passer par setState forcerait un re-render à chaque survol
// pour ne bouger qu'un seul <span>, que React lui-même déconseille désormais de faire
// depuis un effet (règle react-hooks/set-state-in-effect).
export function SiteNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());

  const NAV_LINKS = Object.entries(NAV_LINK_KEYS).map(([href, key]) => ({
    href,
    label: t(`links.${key}`),
  }));

  // Le fond déborde légèrement de chaque côté du texte (PILL_PADDING_PX) pour ne pas le
  // toucher pile — un padding sur le lien lui-même ferait le même effet mais élargirait
  // chaque lien dans le flux normal (6 liens × 2 × padding), ce qui suffit à faire
  // retomber "Hentsch Credit" dans la troncature à 1280px (largeur d'écran courante déjà
  // tendue, cf. langBtn compacté). Un débordement purement visuel n'a pas ce coût : gap-4
  // entre les liens laisse largement la place.
  const PILL_PADDING_PX = 6;

  function positionPill(href: string | null) {
    const container = navRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return;
    const el = href ? linkRefs.current.get(href) : undefined;
    if (!el) {
      pill.style.opacity = "0";
      pill.style.width = "0px";
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const linkRect = el.getBoundingClientRect();
    pill.style.left = `${linkRect.left - containerRect.left - PILL_PADDING_PX}px`;
    pill.style.width = `${linkRect.width + PILL_PADDING_PX * 2}px`;
    pill.style.opacity = "1";
  }

  // Une navigation entre deux pages de la vitrine démonte/remonte SiteNav (chaque page la
  // rend elle-même, pas de layout partagé) : le fond coulissant doit donc se repositionner
  // sur le lien de la page tout juste chargée à chaque montage, pas seulement une fois.
  // useLayoutEffect (pas useEffect) : positionne le fond avant la peinture du navigateur,
  // pour qu'il apparaisse jamais dans le coin puis "saute" à sa place.
  useLayoutEffect(() => {
    positionPill(pathname);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-card/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink items-center gap-3">
          <Image src="/brand/hentsch-mark.png" alt="" width={500} height={500} className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <span className="block truncate text-base font-semibold leading-none text-foreground">
              Hentsch Credit
            </span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">{t("tagline")}</span>
          </div>
        </Link>
        <nav
          ref={navRef}
          onMouseLeave={() => positionPill(pathname)}
          className="relative hidden items-center gap-4 xl:gap-5 lg:flex"
        >
          {/* Fond coulissant — un seul élément partagé, jamais un par lien : c'est ce qui
              produit l'effet de glissement (transition sur left/width) plutôt qu'un
              fondu discontinu d'un highlight à l'autre. Invisible tant qu'aucun lien n'est
              actif ni survolé (ex. page d'accueil, hors de NAV_LINK_KEYS). Position de
              départ (left/width à 0) neutralisée par la transition dès le premier
              positionnement réel dans useLayoutEffect. */}
          <span
            ref={pillRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 top-1/2 h-8 w-0 -translate-y-1/2 rounded-full bg-muted opacity-0 transition-[left,width,opacity] duration-300 ease-out"
          />
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              ref={(el) => {
                if (el) linkRefs.current.set(link.href, el);
                else linkRefs.current.delete(link.href);
              }}
              href={link.href}
              onMouseEnter={() => positionPill(link.href)}
              aria-current={pathname === link.href ? "page" : undefined}
              className="relative whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href="/login"
            className="shrink-0 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:px-4"
          >
            <span className="sm:hidden">{t("connexionShort")}</span>
            <span className="hidden sm:inline">{t("connexionLong")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
