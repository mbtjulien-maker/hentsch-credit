// Design system — Interface Admin (back-office). Palette "Premium Fintech" partagée avec
// l'espace client via les tokens sémantiques (cf. app/globals.css), déclinée en clair et
// en sombre selon la classe .dark globale (cf. lib/theme-provider.tsx) plutôt qu'un fond
// toujours sombre isolé. Centralisé ici pour que chaque écran admin (sidebar, topbar,
// dashboard, fiche client 360, listes) reste visuellement cohérent sans redéfinir les
// mêmes classes Tailwind à chaque fichier.
//
// Parti pris volontaire, suite au passage "perfectionnement UI/UX" : AUCUN dégradé
// décoratif (marque, boutons, avatars) — surface plate, une seule teinte d'accent (or),
// utilisée avec parcimonie. Les seuls dégradés tolérés sont ceux qui encodent une donnée
// réelle (barres de score par exemple), jamais la décoration pure.
//
// Couleurs exprimées en tokens (bg-card, text-foreground, bg-primary…) plutôt qu'en hex
// arbitraires : la bascule clair/sombre ne change qu'app/globals.css, jamais ce fichier.

// Carte standard — coin arrondi modéré (xl, pas 2xl : plus "logiciel bancaire" que
// "appli grand public"), bordure fine, fond panneau, sans ombre décorative.
export const ADMIN_CARD = "rounded-xl border border-foreground/[0.07] bg-card";

export const ADMIN_CARD_RAISED = "rounded-xl border border-foreground/[0.09] bg-card shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]";

// Libellé discret au-dessus d'un bloc de contenu (ex. "IDENTITÉ", "REVENUS").
export const ADMIN_LABEL = "text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

export const ADMIN_DIVIDER = "border-foreground/[0.07]";

export const ADMIN_INPUT =
  "w-full rounded-md border border-foreground/[0.09] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/50 " +
  "focus-visible:ring-2 focus-visible:ring-primary/25";

// Anneau de focus clavier — appliqué à tous les éléments interactifs personnalisés (les
// boutons/inputs shadcn/ui n'existent pas dans cette palette, cf. note dans
// admin-topbar.tsx). Toujours combiné à `outline-none` sur l'élément.
export const ADMIN_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Boutons — surfaces plates, jamais de dégradé. `sm` (défaut) pour les actions de table
// ou de barre d'outils ; les CTA de premier plan restent de taille modeste (cf. consigne
// "pas de gros boutons disproportionnés").
export const ADMIN_BTN_PRIMARY = `inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-chart-2 disabled:pointer-events-none disabled:opacity-50 ${ADMIN_FOCUS_RING}`;

export const ADMIN_BTN_SECONDARY = `inline-flex items-center justify-center gap-1.5 rounded-md border border-foreground/[0.1] bg-transparent px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.05] disabled:pointer-events-none disabled:opacity-50 ${ADMIN_FOCUS_RING}`;

export const ADMIN_BTN_GHOST = `inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground disabled:pointer-events-none disabled:opacity-50 ${ADMIN_FOCUS_RING}`;

export const ADMIN_BTN_DANGER = `inline-flex items-center justify-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-destructive/85 disabled:pointer-events-none disabled:opacity-50 ${ADMIN_FOCUS_RING}`;

export type AdminTone = "neutral" | "gold" | "green" | "orange" | "red";

// Badges — fond très légèrement teinté (6-10%), texte dans la même famille de teinte mais
// désaturé pour rester lisible sans "crier", en clair comme en sombre. Coin rounded-md
// (pas pill) : plus proche d'un statut de back-office logiciel que d'un tag d'appli
// consumer.
export const TONE_CLASSES: Record<AdminTone, string> = {
  neutral: "bg-foreground/[0.05] text-muted-foreground",
  gold: "bg-primary/10 text-primary",
  green: "bg-chart-3/10 text-chart-3",
  orange: "bg-warning/10 text-warning",
  red: "bg-destructive/10 text-destructive",
};

export const TONE_DOT_CLASSES: Record<AdminTone, string> = {
  neutral: "bg-muted-foreground",
  gold: "bg-primary",
  green: "bg-chart-3",
  orange: "bg-warning",
  red: "bg-destructive",
};

// Teinte "pleine" utilisée uniquement pour ce qui encode une vraie mesure (barres de
// score, cf. RiskDecisionTab/AdminRisquePage) — jamais pour la décoration. Valeurs en
// `var(--token)` plutôt qu'en classes Tailwind : consommées comme style inline
// (backgroundColor), pas comme className, donc pas de résolution possible via les
// utilitaires bg-*. Suit la bascule clair/sombre comme le reste, puisque ce sont les
// mêmes custom properties que app/globals.css.
export const TONE_SOLID: Record<AdminTone, string> = {
  neutral: "var(--muted-foreground)",
  gold: "var(--primary)",
  green: "var(--chart-3)",
  orange: "var(--warning)",
  red: "var(--destructive)",
};
