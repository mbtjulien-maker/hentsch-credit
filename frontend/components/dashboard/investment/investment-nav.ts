import { ArrowDownToLine, Layers, LayoutDashboard, PieChart, ScrollText } from "lucide-react";

// Sous-pages de l'espace Investissement — source unique partagée par la barre de
// navigation de la section (InvestmentSectionNav) et les sous-liens de la sidebar
// (cf. sidebar.tsx). Chaque `key` correspond à Dashboard.investmentSpace.nav.<key>.
export const INVESTMENT_NAV = [
  { key: "overview", href: "/dashboard/investissement", icon: LayoutDashboard },
  { key: "fund", href: "/dashboard/investissement/approvisionner", icon: ArrowDownToLine },
  { key: "products", href: "/dashboard/investissement/produits", icon: Layers },
  { key: "placements", href: "/dashboard/investissement/placements", icon: PieChart },
  { key: "journal", href: "/dashboard/investissement/journal", icon: ScrollText },
] as const;

export type InvestmentNavKey = (typeof INVESTMENT_NAV)[number]["key"];
