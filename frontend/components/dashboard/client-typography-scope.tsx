"use client";

import { useEffect } from "react";

// Pose .client-typography (cf. app/globals.css) sur <body> tant que l'espace client est
// affiché : les dialogues, menus et sélecteurs (Base UI) sont rendus dans un portail,
// donc HORS du conteneur du layout du dashboard — sans ça ils retomberaient sur Geist et
// détonneraient avec le reste de l'interface. Retirée au démontage pour que la vitrine
// publique et le back-office gardent leur propre police.
export function ClientTypographyScope() {
  useEffect(() => {
    // .theme-fintech (palette "fintech clair", cf. app/globals.css) suit la même logique
    // de portée que la police : posée avec elle sur <body> pour couvrir les portails.
    const classes = ["client-typography", "theme-fintech"];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, []);
  return null;
}
