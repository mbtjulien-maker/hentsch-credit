import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountRequest.meta" });
  return buildPageMetadata({ locale, path: "/demande-de-compte", title: t("title"), description: t("description") });
}

// Ancien formulaire public de demande d'ouverture de compte — remplacé par les codes
// d'invitation (cf. §6 CLAUDE.md entrée #41) : créer un compte nécessite désormais un
// code transmis par un conseiller. Cette page reste à la même URL (liens existants,
// plan du site) mais renvoie simplement vers le nouveau parcours plutôt que d'afficher
// l'ancien formulaire — le back-office garde la file historique consultable
// (/dashboard/demandes-comptes) pour les dossiers déjà soumis avant ce changement.
export default async function DemandeDeComptePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AccountRequest");

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("replaced.title")} description={t("replaced.description")}>
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 pb-16 text-center sm:px-6">
        <Button size="lg" render={<Link href="/inscription" />}>
          {t("replaced.cta")}
          <ArrowRight className="size-4" />
        </Button>
        <p className="text-sm text-muted-foreground/80">
          {t.rich("alreadyHaveAccount", {
            link: (chunks) => (
              <Link href="/login" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </MarketingPageShell>
  );
}
