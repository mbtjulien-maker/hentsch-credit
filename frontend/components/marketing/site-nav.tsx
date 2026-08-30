import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// Sections autrefois affichées en pleine longueur sur "/" et devenues des pages dédiées
// (cf. app/page.tsx — désormais de simples cartes de renvoi) : reprises ici comme menu
// de navigation, pour que chacune reste accessible depuis n'importe quelle page publique.
const NAV_LINKS = [
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/rendement", label: "Rendement" },
  { href: "/strategie-rwa", label: "Stratégie RWA" },
  { href: "/marche", label: "Marché" },
  { href: "/tarifs", label: "Tarifs" },
] as const;

// Barre de navigation de la vitrine publique ("/") — distincte de la sidebar/header de
// l'espace client connecté (cf. app/dashboard/layout.tsx). Menu masqué en dessous de lg
// (repris dans le pied de page, cf. SiteFooter) : pas de menu mobile dédié pour l'instant,
// périmètre volontairement restreint.
export function SiteNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-card/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink items-center gap-3">
          <Image src="/brand/hentsch-mark.png" alt="" width={500} height={500} className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <span className="block truncate text-base font-semibold leading-none text-foreground">
              Hentsch Credit
            </span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">Crédit crypto-collatéralisé</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="shrink-0 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:px-4"
          >
            <span className="sm:hidden">Connexion</span>
            <span className="hidden sm:inline">Accéder à mon compte</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
