"use client";

import { useEffect } from "react";

// Corrige l'attribut lang de <html> après hydratation — le layout racine (app/layout.tsx,
// partagé avec /dashboard et /admin qui restent en français) le fixe à "fr" par défaut,
// puisqu'il n'a aucune connaissance de la langue de la vitrine publique en cours de
// rendu. Petit correctif côté client plutôt qu'une refonte de la hiérarchie de layouts
// (qui obligerait à dupliquer ThemeProvider/police/globals.css sur 3 racines distinctes
// pour donner à chaque zone son propre <html>) — impact SEO/accessibilité mineur, pas une
// fonctionnalité cassée : le contenu réellement affiché est déjà dans la bonne langue.
export function LocaleHtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
