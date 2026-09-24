"use client";

import { useEffect } from "react";

// Thème "fintech clair" (palette + police, cf. .theme-fintech / .client-typography dans
// app/globals.css) posé sur <body> pour TOUT l'arbre localisé — vitrine publique, connexion
// et espace client (retour client : "même thème pour la vitrine publique"). Sur <body> et
// pas seulement sur un conteneur : les dialogues, menus déroulants et sélecteurs (Base UI)
// sont rendus dans un portail, donc HORS de tout conteneur de page. /admin n'est pas sous
// [locale] et garde son identité. Le conteneur du layout (cf. app/[locale]/layout.tsx) porte
// les mêmes classes pour le premier rendu serveur, avant l'hydratation.
export function LocaleThemeScope() {
  useEffect(() => {
    const classes = ["client-typography", "theme-fintech"];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, []);
  return null;
}
