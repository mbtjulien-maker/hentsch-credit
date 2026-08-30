import type { ReactNode } from "react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

// Mise en page commune aux 3 pages légales (mentions-legales, conditions-generales,
// confidentialite) — même chrome que la vitrine (SiteNav/SiteFooter), largeur de lecture
// réduite pour du texte long, style glass cohérent avec le reste du site (fond blanc,
// bordure slate, ombre légère).
export function LegalPageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground/80">
          Dernière mise à jour : {ENTITY_IDENTITY.lastUpdated}
        </p>
        {intro && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{intro}</p>}

        <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// Bloc de section réutilisé par les 3 pages — titre + contenu, espacement cohérent.
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border/60 py-6 first:border-t-0 first:pt-0">
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
