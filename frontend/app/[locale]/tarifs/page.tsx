import { Coins, Landmark, Lock, Percent, ShieldAlert, ShieldCheck, Timer } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing.meta" });
  return { title: t("title"), description: t("description") };
}

// Grille tarifaire réelle — miroir des valeurs effectivement appliquées par le moteur de
// crédit (cf. backend/src/credit/rate.constants.ts et ledger.constants.ts, sources de
// vérité). Duplication assumée côté marketing (même principe que CURRENCY_LABELS dans
// lib/format.ts) : ce sont des constantes de tarification, pas des données de marché à
// synchroniser en direct. Objectif de transparence explicite (cf. CGU §9, qui renvoyait
// jusqu'ici à "aux taux communiqués au client" sans donner les chiffres) : donner les
// vrais chiffres plutôt qu'un renvoi vague à des conditions particulières.
export default async function TarifsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pricing");

  const PRICING = [
    { key: "ratio", icon: Percent, label: t("items.ratio.label"), value: "350%", detail: t("items.ratio.detail") },
    { key: "interestRate", icon: Landmark, label: t("items.interestRate.label"), value: "13,5% USD · 12,0% EUR", detail: t("items.interestRate.detail") },
    { key: "originationFees", icon: Coins, label: t("items.originationFees.label"), value: "2,0%", detail: t("items.originationFees.detail") },
    { key: "custodyFees", icon: Lock, label: t("items.custodyFees.label"), value: "0,5% / an", detail: t("items.custodyFees.detail") },
    { key: "positionDuration", icon: Timer, label: t("items.positionDuration.label"), value: "12 mois", detail: t("items.positionDuration.detail") },
    { key: "automaticRepayment", icon: ShieldCheck, label: t("items.automaticRepayment.label"), value: t("items.automaticRepayment.value"), detail: t("items.automaticRepayment.detail") },
    { key: "liquidationThresholds", icon: ShieldAlert, label: t("items.liquidationThresholds.label"), value: "30% · 50%", detail: t("items.liquidationThresholds.detail") },
  ];

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <div className="mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING.map((item) => (
            <div key={item.key} className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-white">
                <item.icon className="size-4.5" />
              </div>
              <div className="mt-3 text-xl font-semibold tabular-nums text-foreground">{item.value}</div>
              <h3 className="mt-0.5 text-sm font-semibold text-foreground/80">{item.label}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/80">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-muted p-5 text-sm leading-relaxed text-muted-foreground">
          <p>{t("nonRetroactivityNote")}</p>
          <p className="mt-3">
            {t.rich("contractualDetail", {
              link: (chunks) => (
                <Link href="/conditions-generales" className="font-medium text-foreground underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>

        <h2 className="mt-10 text-xl font-semibold text-foreground">{t("exampleTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("exampleIntro")}</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/80 text-xs uppercase tracking-wide text-muted-foreground/80">
                <th className="px-4 py-2.5 font-medium">{t("exampleTable.item")}</th>
                <th className="px-4 py-2.5 font-medium">{t("exampleTable.calculation")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("exampleTable.amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 tabular-nums">
              <tr>
                <td className="px-4 py-2.5">{t("exampleTable.origination")}</td>
                <td className="px-4 py-2.5 text-muted-foreground/80">{t("exampleTable.originationCalc")}</td>
                <td className="px-4 py-2.5 text-right">140 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">{t("exampleTable.interest")}</td>
                <td className="px-4 py-2.5 text-muted-foreground/80">{t("exampleTable.interestCalc")}</td>
                <td className="px-4 py-2.5 text-right">945 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-semibold text-foreground">{t("exampleTable.totalBeforeYield")}</td>
                <td className="px-4 py-2.5 text-muted-foreground/80">{t("exampleTable.totalBeforeYieldNote")}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-foreground">1 085 $</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground/80">
          {t.rich("exampleFooter", {
            link: (chunks) => (
              <Link href="/rendement" className="font-medium text-foreground/80 underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </p>

        <h2 className="mt-10 text-xl font-semibold text-foreground">{t("faqTitle")}</h2>
        <div className="mt-4 space-y-4">
          {(["earlyRepayment", "negotiable", "currencyDifference"] as const).map((key) => (
            <div key={key} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">{t(`faq.${key}.question`)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(`faq.${key}.answer`)}</p>
            </div>
          ))}
        </div>
      </div>
    </MarketingPageShell>
  );
}
