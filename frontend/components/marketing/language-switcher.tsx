"use client";

import { useState, useTransition } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Noms affichés dans leur propre langue (convention standard d'un sélecteur de langue :
// "Deutsch" plutôt que "German" pour un visiteur germanophone) — pas besoin de traduction,
// ce sont des noms propres.
const LOCALE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  nl: "Nederlands",
  sv: "Svenska",
};

// Change de langue en gardant la même page (cf. usePathname/useRouter de
// i18n/navigation.ts, conscients de la locale) — jamais de retour forcé à l'accueil.
// Uniquement dans la vitrine publique (app/[locale]/**) : /dashboard et /admin restent en
// français, ce composant n'y apparaît jamais.
export function LanguageSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectLocale(nextLocale: string) {
    setOpen(false);
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-label="Changer de langue"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Globe className="size-4" />
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-lg border border-border/80 bg-card py-1 shadow-lg">
            {routing.locales.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => selectLocale(code)}
                className={cn(
                  "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                  code === locale ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
