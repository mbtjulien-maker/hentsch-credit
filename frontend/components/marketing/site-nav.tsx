"use client";

import Image from "next/image";
import { ChevronDown, CircleUserRound, Menu } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isGroupActive, SITE_NAV } from "@/lib/site-navigation";
import { cn } from "@/lib/utils";

// Barre de navigation de la vitrine publique ("/") — distincte de la sidebar/header de
// l'espace client connecté (cf. app/dashboard/layout.tsx). Quatre entrées regroupées par
// intention (cf. lib/site-navigation.ts) : Crédit et Marché et Entreprise ouvrent un menu
// déroulant, Investissement est un lien direct. Sous lg, un vrai menu (bouton hamburger)
// remplace l'ancien repli sur le pied de page : toutes les pages y sont, par groupe.
//
// Composant client : le fond coulissant a besoin de usePathname() (page active) et de
// mesurer les entrées au survol/à chaque changement de page — deux choses que seul le
// client sait faire. Il est repositionné en manipulant directement le style du DOM
// (pillRef) plutôt que via un useState : ce n'est qu'un décor (aria-hidden), jamais une
// donnée dont le reste du rendu dépend (règle react-hooks/set-state-in-effect).
export function SiteNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  // Une entrée par GROUPE (lien direct ou déclencheur de menu), clé = id du groupe.
  const itemRefs = useRef(new Map<string, HTMLElement>());

  const activeGroupId = SITE_NAV.find((group) => isGroupActive(group, pathname))?.id ?? null;

  // Le fond déborde légèrement de chaque côté du texte (PILL_PADDING_PX) pour ne pas le
  // toucher pile — un padding sur le lien lui-même ferait le même effet mais élargirait
  // chaque lien dans le flux normal (6 liens × 2 × padding), ce qui suffit à faire
  // retomber "Hentsch Vault" dans la troncature à 1280px (largeur d'écran courante déjà
  // tendue, cf. langBtn compacté). Un débordement purement visuel n'a pas ce coût : gap-4
  // entre les liens laisse largement la place.
  const PILL_PADDING_PX = 6;

  function positionPill(groupId: string | null) {
    const container = navRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return;
    const el = groupId ? itemRefs.current.get(groupId) : undefined;
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
    positionPill(activeGroupId);
  }, [activeGroupId]);

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-card/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:gap-6">
        <Link href="/" className="flex min-w-0 shrink items-center gap-3">
          <Image src="/brand/hentsch-mark.png" alt="" width={500} height={500} className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <span className="block truncate text-base font-semibold leading-none text-foreground">
              Hentsch Vault
            </span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">{t("tagline")}</span>
          </div>
        </Link>
        <nav
          ref={navRef}
          aria-label={t("mainNavAria")}
          onMouseLeave={() => positionPill(activeGroupId)}
          className="relative hidden items-center gap-6 lg:flex"
        >
          {/* Fond coulissant — un seul élément partagé, jamais un par entrée : c'est ce qui
              produit l'effet de glissement (transition sur left/width) plutôt qu'un
              fondu discontinu d'un highlight à l'autre. Invisible tant qu'aucune entrée
              n'est active ni survolée (ex. page d'accueil). */}
          <span
            ref={pillRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 top-1/2 h-8 w-0 -translate-y-1/2 rounded-full bg-primary/10 opacity-0 transition-[left,width,opacity] duration-300 ease-out"
          />
          {SITE_NAV.map((group) => {
            const active = group.id === activeGroupId;
            const triggerClass = cn(
              "relative inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors hover:text-foreground",
              active ? "text-foreground" : "text-muted-foreground",
            );
            const register = (el: HTMLElement | null) => {
              if (el) itemRefs.current.set(group.id, el);
              else itemRefs.current.delete(group.id);
            };
            if (!group.items) {
              return (
                <Link
                  key={group.id}
                  ref={register}
                  href={group.href!}
                  onMouseEnter={() => positionPill(group.id)}
                  aria-current={active ? "page" : undefined}
                  className={triggerClass}
                >
                  {t(`groups.${group.labelKey}`)}
                </Link>
              );
            }
            return (
              <DropdownMenu key={group.id}>
                <DropdownMenuTrigger
                  openOnHover
                  delay={60}
                  closeDelay={140}
                  onMouseEnter={() => positionPill(group.id)}
                  render={
                    <button ref={register} type="button" className={triggerClass}>
                      {t(`groups.${group.labelKey}`)}
                      <ChevronDown className="size-3.5 opacity-70" />
                    </button>
                  }
                />
                <DropdownMenuContent align="start" className="w-56">
                  {group.items.map((item) => (
                    <DropdownMenuItem
                      key={item.href}
                      render={<Link href={item.href} />}
                      className={cn("px-2.5 py-2 text-sm", pathname === item.href && "font-semibold text-foreground")}
                    >
                      {t(`links.${item.itemKey}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Menu mobile/tablette (< lg) — remplace l'ancien repli sur le seul pied de page :
              toutes les pages y sont, regroupées comme dans l'en-tête desktop. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label={t("menu")}
                  title={t("menu")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-card text-foreground transition-colors hover:border-border hover:bg-muted lg:hidden"
                >
                  <Menu className="size-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-64">
              {SITE_NAV.map((group, index) => (
                <DropdownMenuGroup key={group.id}>
                  {index > 0 && <DropdownMenuSeparator />}
                  {group.items ? (
                    <>
                      <DropdownMenuLabel>{t(`groups.${group.labelKey}`)}</DropdownMenuLabel>
                      {group.items.map((item) => (
                        <DropdownMenuItem
                          key={item.href}
                          render={<Link href={item.href} />}
                          className={cn("px-2.5 py-2", pathname === item.href && "font-semibold text-foreground")}
                        >
                          {t(`links.${item.itemKey}`)}
                        </DropdownMenuItem>
                      ))}
                    </>
                  ) : (
                    <DropdownMenuItem
                      render={<Link href={group.href!} />}
                      className={cn("px-2.5 py-2 font-medium", pathname === group.href && "font-semibold text-foreground")}
                    >
                      {t(`groups.${group.labelKey}`)}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="/login"
            aria-label={t("connexionLong")}
            title={t("connexionLong")}
            className="flex shrink-0 items-center justify-center rounded-full bg-primary p-2 text-primary-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CircleUserRound className="size-5" />
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
