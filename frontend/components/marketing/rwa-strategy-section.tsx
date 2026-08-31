import { Layers, Link2, ShieldAlert, ShieldCheck, TrendingUp, Waypoints } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AssetLogoRow } from "@/components/marketing/asset-logo-row";

// Section de transparence "Stratégie d'investissement RWA" — adapte pour le client la
// feuille de route interne de trésorerie sur les métaux industriels/matières premières
// tokenisés (Platine XPT, Palladium XPD, Cuivre XCU, Pétrole synthétique WTI). Distincte
// de YieldMechanismStrip/YieldAssetGrid (mécanisme RÉEL de remboursement automatique par
// plus-value du gage, plafonné à 60%, cf. YIELD_REPAYMENT_CAP_PCT) : ici, les fourchettes
// affichées sont l'objectif indicatif de la stratégie de trésorerie PROPRE À LA BANQUE
// (arbitrage, prêt collatéralisé DeFi, market making) sur ces actifs — jamais une
// garantie, jamais un taux appliqué au calcul du crédit du client (cf. décision produit :
// "Taux indicatif affiché au client"). D'où l'insistance du texte sur "objectif" /
// "indicatif" à chaque occurrence du chiffre, plutôt qu'un simple badge isolé.
//
// Toujours en thème sombre fixe (bg-slate-900, text-white…), quel que soit le thème
// choisi par le visiteur — identité visuelle "terminal" volontairement invariante. Server
// Component traduit via getTranslations() (pas de useTranslations() : ce composant ne
// fait aucune interaction client).
const NEW_RWA_ASSETS = ["XPT", "XPD", "XCU", "WTI"] as const;

export async function RwaStrategySection() {
  const t = await getTranslations("RwaStrategy");

  const PILLARS = [
    { icon: Link2, title: t("pillars.cashCarry.title"), range: t("pillars.cashCarry.range"), description: t("pillars.cashCarry.description") },
    { icon: Waypoints, title: t("pillars.triangular.title"), range: t("pillars.triangular.range"), description: t("pillars.triangular.description") },
    { icon: TrendingUp, title: t("pillars.liquidity.title"), range: t("pillars.liquidity.range"), description: t("pillars.liquidity.description") },
  ] as const;

  const ROADMAP_PHASES = [
    { window: t("roadmap.phase1.window"), title: t("roadmap.phase1.title"), detail: t("roadmap.phase1.detail") },
    { window: t("roadmap.phase2.window"), title: t("roadmap.phase2.title"), detail: t("roadmap.phase2.detail") },
    { window: t("roadmap.phase3.window"), title: t("roadmap.phase3.title"), detail: t("roadmap.phase3.detail") },
    { window: t("roadmap.phase4.window"), title: t("roadmap.phase4.title"), detail: t("roadmap.phase4.detail") },
  ] as const;

  const CASE_STUDY_ROWS = [
    { key: "native", label: t("caseStudy.rows.native.label"), basis: t("caseStudy.rows.native.basis"), amount: "+150 000 $", impact: "+1,50%" },
    { key: "basis", label: t("caseStudy.rows.basis.label"), basis: t("caseStudy.rows.basis.basis"), amount: "+350 000 $", impact: "+3,50%" },
    { key: "stablecoinYield", label: t("caseStudy.rows.stablecoinYield.label"), basis: t("caseStudy.rows.stablecoinYield.basis"), amount: "+250 000 $", impact: "+2,50%" },
    { key: "borrowCost", label: t("caseStudy.rows.borrowCost.label"), basis: t("caseStudy.rows.borrowCost.basis"), amount: "-160 000 $", impact: "-1,60%" },
    { key: "operational", label: t("caseStudy.rows.operational.label"), basis: t("caseStudy.rows.operational.basis"), amount: "-40 000 $", impact: "-0,40%" },
  ] as const;

  const RISKS = [
    { icon: ShieldAlert, risk: t("risks.counterparty.risk"), mitigation: t("risks.counterparty.mitigation") },
    { icon: ShieldAlert, risk: t("risks.smartContract.risk"), mitigation: t("risks.smartContract.mitigation") },
    { icon: ShieldAlert, risk: t("risks.liquidity.risk"), mitigation: t("risks.liquidity.mitigation") },
    { icon: ShieldAlert, risk: t("risks.liquidation.risk"), mitigation: t("risks.liquidation.mitigation") },
  ] as const;

  return (
    <section id="strategie-rwa" className="bg-slate-900 py-16 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <Layers className="size-3.5" />
            {t("eyebrow")}
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{t("title")}</h2>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">{t("intro")}</p>
        </div>

        <div className="mx-auto mt-6 flex w-fit flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-white">8 à 14%</span>
            <span className="text-sm font-medium text-slate-300">{t("apyTargetLabel")}</span>
          </div>
          <AssetLogoRow currencies={NEW_RWA_ASSETS} className="justify-center" />
          <p className="max-w-md text-center text-xs leading-relaxed text-slate-400">{t("apyTargetNote")}</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                <pillar.icon className="size-4.5" />
              </div>
              <div className="mt-3 text-lg font-semibold tabular-nums text-white">
                {pillar.range} <span className="text-xs font-normal text-slate-400">{t("apyObjective")}</span>
              </div>
              <h3 className="mt-1 text-sm font-semibold text-white">{pillar.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{pillar.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h3 className="mb-1 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t("caseStudy.title")}
          </h3>
          <p className="mx-auto mb-4 max-w-2xl text-center text-xs text-slate-500">{t("caseStudy.intro")}</p>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400">
                  <th className="px-4 py-2.5 font-medium">{t("caseStudy.flow")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("caseStudy.basis")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("caseStudy.annualAmount")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("caseStudy.impact")}</th>
                </tr>
              </thead>
              <tbody>
                {CASE_STUDY_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-white/5 text-slate-300 last:border-0">
                    <td className="px-4 py-2.5">{row.label}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400">{row.basis}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.amount}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.impact}</td>
                  </tr>
                ))}
                <tr className="bg-white/[0.04] font-semibold text-white">
                  <td className="px-4 py-2.5">{t("caseStudy.netTotal")}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-300">{t("caseStudy.capital")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">+550 000 $</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-cyan-300">+5,50%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-xs leading-relaxed text-slate-500">{t("caseStudy.reallocationNote")}</p>
        </div>

        <div className="mt-10">
          <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t("roadmapTitle")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-4">
            {ROADMAP_PHASES.map((step, i) => (
              <div key={step.window} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
                  <span className="flex size-5 items-center justify-center rounded-full bg-cyan-300/15 text-[10px]">
                    {i + 1}
                  </span>
                  {step.window}
                </div>
                <h4 className="mt-2 text-sm font-semibold text-white">{step.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h3 className="mb-4 flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <ShieldCheck className="size-4" />
            {t("risksTitle")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {RISKS.map((item) => (
              <div key={item.risk} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <item.icon className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <div>
                  <div className="text-sm font-semibold text-white">{item.risk}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t("governanceTitle")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-white">{t("governance.capital.title")}</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{t("governance.capital.body")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-white">{t("governance.supervision.title")}</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{t("governance.supervision.body")}</p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t("faqTitle")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["usedForStrategy", "loss", "targetReached", "whyIndustrialOnly"] as const).map((key) => (
              <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h4 className="text-sm font-semibold text-white">{t(`faq.${key}.question`)}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{t(`faq.${key}.answer`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
