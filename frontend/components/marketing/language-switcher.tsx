"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Noms affichés dans leur propre langue (convention standard d'un sélecteur de langue :
// "Deutsch" plutôt que "German" pour un visiteur germanophone) — pas besoin de traduction,
// ce sont des noms propres. Drapeaux associés à la LANGUE (convention standard des
// sélecteurs multilingues, cf. Wikipedia/Booking), pas au pays d'origine de la société
// (suisse) : mélanger les deux prêterait à confusion dès qu'on ajoute allemand/italien.
const LOCALE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  nl: "Nederlands",
  sv: "Svenska",
};

const LOCALE_FLAGS: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  pt: "🇵🇹",
  nl: "🇳🇱",
  sv: "🇸🇪",
};

// Change de langue en gardant la même page (cf. usePathname/useRouter de
// i18n/navigation.ts, conscients de la locale) — jamais de retour forcé à l'accueil.
// Rendu partout où la locale s'applique : vitrine publique (app/[locale]/**) et espace
// client (app/[locale]/dashboard/**, cf. décision produit de traduire aussi le dashboard).
// /admin reste hors de ce périmètre et n'affiche jamais ce composant.
//
// Bâti sur DropdownMenu (Base UI, cf. components/ui/dropdown-menu.tsx) plutôt qu'un
// overlay fait main (state + backdrop cliquable) — c'était le cas avant : focus trap,
// fermeture au clavier (Échap) et positionnement géraient chacun leur propre logique,
// dupliquée avec account-menu.tsx. Un seul composant partagé, une seule fois cette
// logique d'accessibilité à maintenir.
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectLocale(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={isPending}
            aria-label="Changer de langue"
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              className,
            )}
          >
            <span aria-hidden className="text-sm leading-none">{LOCALE_FLAGS[locale]}</span>
            <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        {routing.locales.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => selectLocale(code)}
            className={cn(code === locale ? "font-semibold text-foreground" : "text-muted-foreground")}
          >
            <span aria-hidden className="text-sm leading-none">{LOCALE_FLAGS[code]}</span>
            {LOCALE_LABELS[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
