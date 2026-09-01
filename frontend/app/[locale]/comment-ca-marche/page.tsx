import { ArrowRight, CreditCard, HandCoins, ShieldCheck, UserCheck, Wallet } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { AssetLogoRow } from "@/components/marketing/asset-logo-row";
import { JsonLd, buildPageMetadata, faqPageJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HowItWorks.meta" });
  return buildPageMetadata({ locale, path: "/comment-ca-marche", title: t("title"), description: t("description") });
}

const DEPOSIT_ASSETS = [
  "DAI",
  "USDT",
  "USDC",
  "DEURO",
  "XAUT",
  "KAG",
  "ETH",
  "SHIB",
  "XPT",
  "XPD",
  "XCU",
  "WTI",
] as const;

// Page dédiée au parcours client — contenu déplacé depuis la section #comment-ca-marche
// de la page d'accueil (cf. app/page.tsx, désormais une simple carte de renvoi). Enrichi
// d'une étape KYC explicite (garde-fou réel du backend, cf. CLAUDE.md §5) et des vrais
// chiffres de frais/remboursement (cf. /tarifs, /rendement) plutôt que de rester
// approximatif sur ce qui se passe entre chaque étape.
export default async function CommentCaMarchePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HowItWorks");

  const STEPS = [
    { icon: UserCheck, title: t("steps.kyc.title"), description: t("steps.kyc.description") },
    { icon: Wallet, title: t("steps.deposit.title"), description: t("steps.deposit.description"), assets: DEPOSIT_ASSETS },
    { icon: HandCoins, title: t("steps.credit.title"), description: t("steps.credit.description") },
    { icon: CreditCard, title: t("steps.spend.title"), description: t("steps.spend.description") },
    { icon: ShieldCheck, title: t("steps.repay.title"), description: t("steps.repay.description") },
  ] as const;

  const FAQ_ITEMS = (["kycRejected", "approvalDelay", "earlyWithdrawal"] as const).map((key) => ({
    key,
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }));

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      {/* Balisage FAQPage — construit à partir des MÊMES questions/réponses affichées
          plus bas (cf. FAQ_ITEMS), jamais un contenu parallèle (cf. lib/seo.ts). */}
      <JsonLd id="faq-jsonld" data={faqPageJsonLd(FAQ_ITEMS)} />
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-blue-300/40 hover:shadow-xl"
            >
              <div className="mb-2.5 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-white">
                <step.icon className="size-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              {"assets" in step && <AssetLogoRow currencies={step.assets} className="mt-2.5" />}
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground/80">
          {t.rich("feesNote", {
            pricing: (chunks) => (
              <Link href="/tarifs" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
            yield: (chunks) => (
              <Link href="/rendement" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>

        <h2 className="mt-14 text-xl font-semibold text-foreground">{t("detailTitle")}</h2>
        <div className="mt-4 space-y-4">
          {(["kyc", "deposit", "credit", "usage", "repayment"] as const).map((key) => (
            <div key={key} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">{t(`detail.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`detail.${key}.body`)}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-14 text-xl font-semibold text-foreground">{t("faqTitle")}</h2>
        <div className="mt-4 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div key={item.key} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            {t("ctaLogin")}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/demande-de-compte"
            className="rounded-lg border border-border/80 bg-card px-5 py-3 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:border-border hover:text-foreground"
          >
            {t("ctaNoAccount")}
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
