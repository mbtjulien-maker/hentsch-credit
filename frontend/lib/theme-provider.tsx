"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "hentsch-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Lit la source de vérité réelle : la classe .dark sur <html>, déjà posée par le script
// anti-flash (cf. app/layout.tsx) avant l'hydratation, ou par setTheme ci-dessous après un
// clic. useSyncExternalStore plutôt qu'un useEffect+setState : c'est l'API pensée pour
// exactement ce cas (lire un état externe au navigateur sans risque de désynchronisation
// avec le rendu serveur), et elle n'a pas besoin d'un effet pour se resynchroniser.
function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  // Rendu serveur : jamais de préférence connue, <html> ne porte pas encore de classe.
  return "light";
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

// Bascule clair/sombre pour l'ensemble du site (vitrine, espace client, back-office admin).
// Préférence persistée dans localStorage ; à défaut, celle du système
// (prefers-color-scheme) au premier chargement (cf. script anti-flash dans app/layout.tsx,
// seul endroit qui lit cette préférence initiale — ce provider ne fait ensuite que
// refléter et faire évoluer la classe .dark qu'il a posée).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => applyTheme(next), []);
  const toggleTheme = useCallback(() => applyTheme(readTheme() === "dark" ? "light" : "dark"), []);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé à l'intérieur de ThemeProvider");
  return ctx;
}
