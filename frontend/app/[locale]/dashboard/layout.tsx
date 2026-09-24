import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthGate } from "@/components/dashboard/auth-gate";
import { AuthLoadError } from "@/components/dashboard/auth-load-error";
import { ClientTypographyScope } from "@/components/dashboard/client-typography-scope";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardProvider } from "@/components/dashboard/dashboard-context";
import { Sidebar } from "@/components/dashboard/sidebar";

// Rappel légal minimal, requis sur l'espace client au même titre que sur la vitrine
// (cf. SiteFooter) — volontairement discret, une seule ligne en bas du contenu.
async function DashboardLegalFooter() {
  const t = await getTranslations("DashboardShell.legalFooter");
  const LEGAL_LINKS = [
    { href: "/mentions-legales", label: t("legalNotice") },
    { href: "/conditions-generales", label: t("terms") },
    { href: "/confidentialite", label: t("privacy") },
    { href: "/reglementation", label: t("regulation") },
  ] as const;

  return (
    <footer
      aria-label={t("ariaLabel")}
      className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border pt-4 text-xs text-muted-foreground"
    >
      {LEGAL_LINKS.map((link, i) => (
        <span key={link.href} className="flex items-center gap-x-4">
          {i > 0 && <span aria-hidden>·</span>}
          <Link href={link.href} className="hover:text-foreground">
            {link.label}
          </Link>
        </span>
      ))}
    </footer>
  );
}

// Chrome de l'espace client connecté (sidebar + header, fond uni — plus de photo depuis le
// thème "fintech clair", cf. .theme-fintech dans app/globals.css) — propre à
// "/[locale]/dashboard/*", pas à la vitrine publique ("/", cf. app/[locale]/page.tsx) qui a
// sa propre mise en page. Direction artistique "Luxury Fintech" (Obsidian/Ivoire →
// Champagne Gold), déclinée en clair ET en sombre : la classe .dark globale (posée sur
// <html>, cf. lib/theme-provider.tsx) pilote désormais laquelle des deux s'applique ici,
// plutôt qu'un forçage local — même mécanisme que la vitrine publique et l'espace admin.
// Nested sous app/[locale]/layout.tsx (NextIntlClientProvider déjà fourni) : /dashboard
// est désormais traduit dans les 7 langues, comme la vitrine (décision produit) — /admin
// reste seul hors de ce périmètre (cf. proxy.ts, app/admin/layout.tsx inchangé).
export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="client-typography theme-fintech relative min-h-screen bg-background text-foreground">
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col">
        <DashboardProvider>
          <ClientTypographyScope />
          <AuthLoadError />
          <div className="flex w-full flex-1">
            <AuthGate>
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
                <DashboardHeader />
                {children}
                <DashboardLegalFooter />
              </div>
            </AuthGate>
          </div>
        </DashboardProvider>
      </div>
    </div>
  );
}
