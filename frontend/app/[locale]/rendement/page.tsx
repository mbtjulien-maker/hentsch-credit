import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { YieldAssetGrid, YieldMechanismStrip } from "@/components/marketing/yield-assets-showcase";
import { YieldPerformanceHistory } from "@/components/marketing/yield-performance-history";
import { JsonLd, buildPageMetadata, faqPageJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Yield.meta" });
  return buildPageMetadata({ locale, path: "/rendement", title: t("title"), description: t("description") });
}

// Page dédiée au mécanisme de rendement, contenu déplacé depuis la colonne droite du
// hero (YieldAssetGrid) et le bandeau YieldMechanismStrip de la page d'accueil (cf.
// app/[locale]/page.tsx, désormais une simple carte de renvoi).
export default async function RendementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Yield");

  const FAQ_ITEMS = (["guaranteed", "stablecoins", "frequency", "ratchet", "multipleAssets", "history"] as const).map(
    (key) => ({ key, question: t(`faq.${key}.question`), answer: t(`faq.${key}.answer`) }),
  );

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      {/* Balisage FAQPage — construit à partir des MÊMES questions/réponses affichées
          plus bas (cf. FAQ_ITEMS), jamais un contenu parallèle (cf. lib/seo.ts). */}
      <JsonLd id="faq-jsonld" data={faqPageJsonLd(FAQ_ITEMS)} />
      <div className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-6">
        <YieldAssetGrid />
      </div>
      <YieldMechanismStrip />

      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">{t("eligibleAssetsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("eligibleAssetsIntro")}</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/80 text-xs uppercase tracking-wide text-muted-foreground/80">
                <th className="px-4 py-3 font-medium">{t("table.category")}</th>
                <th className="px-4 py-3 font-medium">{t("table.assets")}</th>
                <th className="px-4 py-3 font-medium">{t("table.indicativeTarget")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">{t("table.preciousMetals")}</td>
                <td className="px-4 py-3 text-muted-foreground">XAUT, PAXG (or), KAG (argent)</td>
                <td className="px-4 py-3 text-muted-foreground/80">{t("table.none")}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">{t("table.nativeCrypto")}</td>
                <td className="px-4 py-3 text-muted-foreground">ETH</td>
                <td className="px-4 py-3 text-muted-foreground/80">{t("table.none")}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">{t("table.industrialMetals")}</td>
                <td className="px-4 py-3 text-muted-foreground">XPT, XPD, XCU, WTI</td>
                <td className="px-4 py-3 text-muted-foreground/80">
                  {t.rich("table.rwaTarget", {
                    link: (chunks) => (
                      <Link href="/strategie-rwa" className="font-medium text-foreground/80 underline underline-offset-2">
                        {chunks}
                      </Link>
                    ),
                  })}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">{t("table.stablecoins")}</td>
                <td className="px-4 py-3 text-muted-foreground">DAI, USDT, USDC, dEURO, SHIB*</td>
                <td className="px-4 py-3 text-muted-foreground/80">{t("table.notEligible")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground/80">{t("shibNote")}</p>
        <p className="mt-4 text-sm text-muted-foreground">{t("dualMechanismNote")}</p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">{t("performanceTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("performanceIntro")}</p>
        <div className="mt-4">
          <YieldPerformanceHistory />
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">{t("exampleTitle")}</h2>
        <div className="mt-4 space-y-3 rounded-2xl border border-border/80 bg-card p-6 text-sm leading-relaxed text-muted-foreground shadow-sm">
          <p>{t.rich("example.p1", { b: bold })}</p>
          <p>{t.rich("example.p2", { b: bold })}</p>
          <p>{t.rich("example.p3", { b: bold })}</p>
          <p>{t.rich("example.p4", { b: bold })}</p>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-foreground">{t("timelineTitle")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("timelineIntro")}</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/80 text-xs uppercase tracking-wide text-muted-foreground/80">
                <th className="px-4 py-2.5 font-medium">{t("timelineTable.month")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("timelineTable.goldPrice")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("timelineTable.repaidThisMonth")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("timelineTable.cumulativeRepaid")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 tabular-nums">
              <tr>
                <td className="px-4 py-2.5">{t("timelineTable.row0")}</td>
                <td className="px-4 py-2.5 text-right">2 400 $</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground/60">—</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground/60">0 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">1</td>
                <td className="px-4 py-2.5 text-right">2 500 $</td>
                <td className="px-4 py-2.5 text-right">83 $</td>
                <td className="px-4 py-2.5 text-right">83 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">2</td>
                <td className="px-4 py-2.5 text-right">{t("timelineTable.row2Price")}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground/60">0 $</td>
                <td className="px-4 py-2.5 text-right">83 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">6</td>
                <td className="px-4 py-2.5 text-right">3 200 $</td>
                <td className="px-4 py-2.5 text-right">583 $</td>
                <td className="px-4 py-2.5 text-right">666 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">11</td>
                <td className="px-4 py-2.5 text-right">7 448 $</td>
                <td className="px-4 py-2.5 text-right">3 534 $</td>
                <td className="px-4 py-2.5 text-right font-semibold text-foreground">{t("timelineTable.row11Cumulative")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground/80">{t("timelineNote")}</p>

        <h2 className="mt-10 text-xl font-semibold text-foreground">{t("liquidationTitle")}</h2>
        <div className="mt-4 space-y-3 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-6 text-sm leading-relaxed text-muted-foreground shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p>{t.rich("liquidation.p1", { b: bold })}</p>
          <p>{t.rich("liquidation.p2", { b: bold })}</p>
          <p>
            {t.rich("liquidation.p3", {
              link: (chunks) => (
                <Link href="/conditions-generales" className="font-medium text-foreground underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-foreground">{t("liquidationExampleTitle")}</h3>
        <div className="mt-3 space-y-2 rounded-2xl border border-amber-200/70 bg-card p-5 text-sm leading-relaxed text-muted-foreground shadow-sm">
          <p>{t.rich("liquidationExample.intro", { b: bold })}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t("liquidationExample.item1")}</li>
            <li>{t.rich("liquidationExample.item2", { b: bold })}</li>
          </ul>
        </div>

        <h2 className="mt-10 text-xl font-semibold text-foreground">{t("faqTitle")}</h2>
        <div className="mt-4 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div key={item.key} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}

function bold(chunks: ReactNode) {
  return <strong className="font-semibold text-foreground">{chunks}</strong>;
}
