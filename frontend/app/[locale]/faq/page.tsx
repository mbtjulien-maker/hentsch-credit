import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { JsonLd, buildPageMetadata, faqPageJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Faq.meta" });
  return buildPageMetadata({ locale, path: "/faq", title: t("title"), description: t("description") });
}

const FAQ_KEYS = [
  "openAccount",
  "forgotPassword",
  "assetsSafe",
  "networksAssets",
  "ratioFees",
  "yieldLiquidation",
  "kycDoubt",
  "complaint",
] as const;

// FAQ générale et transversale — les questions déjà traitées en détail restent sur leur
// page dédiée (comment-ca-marche, rendement, tarifs, strategie-rwa ont chacune leur propre
// FAQ contextuelle) : celle-ci couvre ce qui ne rentre dans aucune d'entre elles (accès,
// sécurité du compte, support) et sert de point d'entrée unique, avec des renvois vers les
// FAQ spécialisées plutôt que de dupliquer leur contenu.
export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Faq");

  const FAQ_ITEMS = FAQ_KEYS.map((key) => ({
    key,
    question: t(`items.${key}.question`),
    answer: t(`items.${key}.answer`),
  }));

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      {/* Balisage FAQPage — construit à partir des MÊMES questions/réponses affichées
          ci-dessous (cf. FAQ_ITEMS), jamais un contenu parallèle (cf. lib/seo.ts). */}
      <JsonLd id="faq-jsonld" data={faqPageJsonLd(FAQ_ITEMS)} />
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div key={item.key} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-muted p-5 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{t("moreQuestionsTitle")}</p>
          <p className="mt-1.5">
            {t.rich("moreQuestionsBody", {
              howItWorks: (chunks) => (
                <Link href="/comment-ca-marche" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
              yield: (chunks) => (
                <Link href="/rendement" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
              rwa: (chunks) => (
                <Link href="/strategie-rwa" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
              pricing: (chunks) => (
                <Link href="/tarifs" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
              contact: (chunks) => (
                <Link href="/contact" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
