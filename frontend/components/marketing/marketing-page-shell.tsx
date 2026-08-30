import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

// Mise en page commune aux pages de la vitrine publique qui détaillent une section
// autrefois affichée en pleine longueur sur "/" (Comment ça marche, Rendement, Stratégie
// RWA, Marché, Demande de compte) — même chrome (SiteNav/SiteFooter) que la page
// d'accueil, avec un fil d'Ariane de retour et un en-tête cohérent. Le contenu propre à
// chaque page (souvent déjà un <section> autonome, ex. RwaStrategySection) est passé en
// children, généralement en pleine largeur sous l'en-tête.
export function MarketingPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-12 text-center sm:px-6">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Retour à l&apos;accueil
          </Link>
          <span className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            {eyebrow}
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{description}</p>
        </div>

        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
