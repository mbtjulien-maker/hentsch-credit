import Link from "next/link";
import {
  BookText,
  Compass,
  FileText,
  LifeBuoy,
  LockKeyhole,
  UserPlus,
} from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

export const metadata = {
  title: "Plan du site · Hentsch Credit",
};

// Plan du site PUBLIC — distinct de l'artefact interne "Plan du Site Hentsch Credit" (qui
// couvre aussi l'espace client connecté et le back-office admin, à usage interne/audit).
// Celui-ci ne liste que les pages réellement accessibles sans authentification, dans le
// même esprit que le principe déjà appliqué à la sidebar cliente (isAdmin && ...) : ne
// montrer que ce qui est réellement disponible au visiteur.
const GROUPS = [
  {
    icon: Compass,
    title: "Découvrir la plateforme",
    links: [
      { href: "/", label: "Accueil" },
      { href: "/comment-ca-marche", label: "Comment ça marche" },
      { href: "/rendement", label: "Rendement" },
      { href: "/strategie-rwa", label: "Stratégie RWA" },
      { href: "/marche", label: "Marché" },
      { href: "/tarifs", label: "Tarifs" },
    ],
  },
  {
    icon: UserPlus,
    title: "Accès au compte",
    links: [
      { href: "/demande-de-compte", label: "Demander un compte" },
      { href: "/login", label: "Connexion" },
    ],
  },
  {
    icon: LifeBuoy,
    title: "Aide & contact",
    links: [
      { href: "/contact", label: "Contactez-nous" },
      { href: "/faq", label: "Foire aux questions" },
      { href: "/accessibilite", label: "Accessibilité numérique" },
      { href: "/archives", label: "Archives" },
      { href: "/plan-du-site", label: "Plan du site" },
    ],
  },
  {
    icon: FileText,
    title: "Documentation contractuelle",
    links: [
      { href: "/conditions-generales", label: "Conditions générales" },
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/reglementation", label: "Réglementation" },
      { href: "/gestion-des-risques", label: "Gestion des risques et garde des avoirs" },
    ],
  },
  {
    icon: LockKeyhole,
    title: "Données personnelles",
    links: [
      { href: "/confidentialite", label: "Politique de confidentialité" },
      { href: "/cookies", label: "Politique de cookies" },
    ],
  },
] as const;

export default function PlanDuSitePage() {
  return (
    <MarketingPageShell
      eyebrow="Navigation"
      title="Plan du site"
      description="L'ensemble des pages accessibles publiquement, sans connexion à un compte."
    >
      <div className="mx-auto w-full max-w-4xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <div key={group.title} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-white">
                  <group.icon className="size-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              </div>
              <ul className="mt-3 space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/80 bg-muted p-5">
          <BookText className="mt-0.5 size-4.5 shrink-0 text-muted-foreground/80" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            L&apos;espace client connecté et l&apos;espace de gestion interne ne figurent pas
            ci-dessus : leur contenu dépend de votre statut de vérification d&apos;identité et de
            votre rôle sur le compte, et n&apos;est accessible qu&apos;après connexion.
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
