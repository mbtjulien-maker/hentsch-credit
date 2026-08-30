"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

// Bouton bascule clair/sombre, réutilisé dans les 3 zones du site (SiteNav, header de
// l'espace client, topbar admin) — chacune avec son propre habillage via `className`,
// mais la même logique (useTheme) partout. `aria-pressed` reflète l'état sombre plutôt
// qu'un simple aria-label statique, pour que les lecteurs d'écran annoncent le résultat
// du clic, pas seulement l'action possible.
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
