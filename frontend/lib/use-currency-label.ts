"use client";

import { useTranslations } from "next-intl";

// Libellés d'affichage des actifs acceptés en garantie (cf. CURRENCY_LABELS dans
// lib/format.ts, qui reste la source de vérité pour les tickers purs — ETH, USDT, etc.,
// identiques dans toutes les langues). Seuls les libellés portant un qualificatif en
// français ("PAXG (or)", "KAG (argent)", "Platine tokenisé"...) ont besoin d'une vraie
// traduction ; les autres actifs (BTC, SOL...) affichés ailleurs via ce même composant
// retombent simplement sur leur ticker brut, jamais traduit (ce sont des noms propres).
// Partagé entre la vitrine (AssetLogoRow) et l'espace client (wallet-actions,
// profile-section, asset-picker) — d'où le namespace neutre "CurrencyLabels", hors de
// "Dashboard" ou d'une page vitrine spécifique.
export function useCurrencyLabel() {
  const t = useTranslations("CurrencyLabels");
  return (currency: string) => (t.has(currency) ? t(currency) : currency);
}
