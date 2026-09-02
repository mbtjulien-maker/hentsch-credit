import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

// Mise en page commune aux pages légales/contractuelles (mentions-legales,
// conditions-generales, confidentialite, reglementation, cookies, accessibilite,
// gestion-des-risques) — même chrome que la vitrine (SiteNav/SiteFooter), largeur de
// lecture réduite pour du texte long. Traduites dans les 7 langues de la vitrine, mais le
// français reste la version qui fait foi en cas de divergence sur un point contractuel
// (cf. bandeau ci-dessous, affiché uniquement pour les 6 autres langues) — pratique
// standard pour du contenu juridique multilingue, cf. décision produit confirmée.
export async function LegalPageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Common");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground/80">
          {t("lastUpdated")} {ENTITY_IDENTITY.lastUpdated}
        </p>
        {intro && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{intro}</p>}

        {locale !== "fr" && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 text-sm text-muted-foreground dark:border-amber-900/40 dark:bg-amber-950/20">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-primary" />
            <p>{t("legalTranslationDisclaimer")}</p>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// Bloc de section réutilisé par les 3 pages — titre + contenu, espacement cohérent.
// `id` optionnel : permet un lien d'ancrage direct (ex. /conditions-generales#s4) depuis
// un résumé de conditions affiché ailleurs dans le produit (cf. TermsAcceptance,
// components/dashboard/terms-acceptance.tsx) — sans id, la section reste identique à
// avant (repli implicite sur la position dans le flux de la page).
export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border/60 py-6 first:border-t-0 first:pt-0">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

// Ligne clé/valeur pour les blocs d'identité (mentions légales) — évite de répéter la
// mise en forme à chaque champ.
export function LegalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 font-medium text-foreground/80 sm:w-56">{label}</dt>
      <dd className="text-muted-foreground">{value}</dd>
    </div>
  );
}
