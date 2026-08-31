import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";

// Barre de navigation de la vitrine publique ("/") — distincte de la sidebar/header de
// l'espace client connecté (cf. app/dashboard/layout.tsx). Menu masqué en dessous de lg
// (repris dans le pied de page, cf. SiteFooter) : pas de menu mobile dédié pour l'instant,
// périmètre volontairement restreint. Server Component asynchrone (getTranslations) —
// aucun state ici, seuls ThemeToggle et LanguageSwitcher sont des îlots client.
export async function SiteNav() {
  const t = await getTranslations("Nav");

  const NAV_LINKS = [
    { href: "/comment-ca-marche", label: t("links.commentCaMarche") },
    { href: "/rendement", label: t("links.rendement") },
    { href: "/strategie-rwa", label: t("links.strategieRwa") },
    { href: "/marche", label: t("links.marche") },
    { href: "/tarifs", label: t("links.tarifs") },
  ] as const;

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-card/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink items-center gap-3">
          <Image src="/brand/hentsch-mark.png" alt="" width={500} height={500} className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <span className="block truncate text-base font-semibold leading-none text-foreground">
              Hentsch Credit
            </span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">{t("tagline")}</span>
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
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href="/login"
            className="shrink-0 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:px-4"
          >
            <span className="sm:hidden">{t("connexionShort")}</span>
            <span className="hidden sm:inline">{t("connexionLong")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
