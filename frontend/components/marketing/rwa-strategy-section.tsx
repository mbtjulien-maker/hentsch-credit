import { Layers, Link2, ShieldAlert, ShieldCheck, TrendingUp, Waypoints } from "lucide-react";
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
const NEW_RWA_ASSETS = ["XPT", "XPD", "XCU", "WTI"] as const;

const PILLARS = [
  {
    icon: Link2,
    title: "Arbitrage Cash & Carry",
    range: "4 à 7%",
    description:
      "Achat du métal tokenisé sur le marché spot, vente simultanée d'un contrat à terme équivalent : la position est neutre au risque de prix et capture l'écart de financement (contango).",
  },
  {
    icon: Waypoints,
    title: "Collatéralisation & prêt triangulaire",
    range: "6,5 à 10%",
    description:
      "Le métal tokenisé est déposé en collatéral (LTV prudent, 50% maximum) auprès d'un protocole institutionnel, pour emprunter des stablecoins réinvestis dans des fonds de trésorerie à faible risque.",
  },
  {
    icon: TrendingUp,
    title: "Apport de liquidité sélectionné",
    range: "9 à 15%",
    description:
      "Une part minoritaire du capital alimente des pools de liquidité ciblés, rémunérée par une fraction des frais de transaction des intervenants du marché.",
  },
] as const;

const ROADMAP_PHASES = [
  {
    phase: "Phase 1",
    window: "Mois 1 à 3",
    title: "Structuration & conformité",
    detail: "Cadre juridique, sélection des dépositaires agréés, audit des émetteurs.",
  },
  {
    phase: "Phase 2",
    window: "Mois 4 à 6",
    title: "Projet pilote",
    detail: "Enveloppe pilote de 5 M$ sur le Platine, premiers circuits d'arbitrage.",
  },
  {
    phase: "Phase 3",
    window: "Mois 7 à 9",
    title: "Montée en charge",
    detail: "Capital étendu à 25 M$, extension au Palladium et au Cuivre.",
  },
  {
    phase: "Phase 4",
    window: "Mois 10 à 12",
    title: "Industrialisation",
    detail: "Reporting temps réel et intégration comptable de bout en bout.",
  },
] as const;

// Étude de cas illustrative (feuille de route, section 5) — un exemple de calcul sur un
// déploiement de trésorerie de 10 M$ sur le Platine, PAS un exemple applicable au gage
// individuel d'un client (échelle et mécanique institutionnelles : couverture par
// futures, emprunt de stablecoins, placement en fonds de trésorerie tokenisé). Objectif :
// montrer concrètement comment la fourchette "8 à 14%" est obtenue, en toute transparence.
const CASE_STUDY_ROWS = [
  { label: "Rendement natif du Platine (plus-value physique)", basis: "1,5% sur 10 M$", amount: "+150 000 $", impact: "+1,50%" },
  { label: "Basis trade / contango sur futures", basis: "3,5% sur 10 M$", amount: "+350 000 $", impact: "+3,50%" },
  { label: "Rendement des stablecoins empruntés placés (BUIDL)", basis: "5,0% sur 5 M$", amount: "+250 000 $", impact: "+2,50%" },
  { label: "Coût de l'emprunt de stablecoins", basis: "-3,2% sur 5 M$", amount: "-160 000 $", impact: "-1,60%" },
  { label: "Coûts opérationnels, garde & assurance", basis: "0,4% sur 10 M$", amount: "-40 000 $", impact: "-0,40%" },
] as const;

const RISKS = [
  {
    icon: ShieldAlert,
    risk: "Contrepartie & audit",
    mitigation: "Audits bimensuels de la réserve (Proof of Reserve) par des cabinets indépendants.",
  },
  {
    icon: ShieldAlert,
    risk: "Smart contract",
    mitigation: "Protocoles exclusivement audités à multiples reprises, couverts par une assurance institutionnelle.",
  },
  {
    icon: ShieldAlert,
    risk: "Liquidité",
    mitigation: "Convention de rachat direct avec les émetteurs physiques, préavis maximum de 48h.",
  },
  {
    icon: ShieldAlert,
    risk: "Liquidation du collatéral",
    mitigation: "Ratio de sur-collatéralisation strict (LTV ≤ 50%) avec rééquilibrage automatisé.",
  },
] as const;

export function RwaStrategySection() {
  return (
    <section id="strategie-rwa" className="bg-slate-900 py-16 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <Layers className="size-3.5" />
            Transparence · Stratégie de trésorerie
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Notre stratégie d&apos;investissement sur les métaux industriels
          </h2>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            Au-delà des métaux précieux, la banque accepte désormais en garantie des métaux industriels
            et matières premières tokenisés, et déploie sur ces actifs sa propre stratégie de trésorerie.
            Voici, en toute transparence, comment elle fonctionne et le plan d&apos;action suivi.
          </p>
        </div>

        <div className="mx-auto mt-6 flex w-fit flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-white">8 à 14%</span>
            <span className="text-sm font-medium text-slate-300">APY, objectif indicatif de la banque</span>
          </div>
          <AssetLogoRow currencies={NEW_RWA_ASSETS} className="justify-center" />
          <p className="max-w-md text-center text-xs leading-relaxed text-slate-400">
            Objectif de la stratégie de trésorerie propre de la banque sur ces actifs, pas une garantie, et sans
            aucun effet sur le calcul de votre crédit. Le remboursement automatique de votre crédit reste celui
            décrit plus haut : la plus-value réelle de votre gage, plafonnée à 60%.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                <pillar.icon className="size-4.5" />
              </div>
              <div className="mt-3 text-lg font-semibold tabular-nums text-white">
                {pillar.range} <span className="text-xs font-normal text-slate-400">APY objectif</span>
              </div>
              <h3 className="mt-1 text-sm font-semibold text-white">{pillar.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{pillar.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h3 className="mb-1 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            Comment ces chiffres sont obtenus
          </h3>
          <p className="mx-auto mb-4 max-w-2xl text-center text-xs text-slate-500">
            Exemple illustratif d&apos;un déploiement de trésorerie de 10 M$ sur le Platine, à
            l&apos;échelle de la banque, pas de votre gage individuel.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400">
                  <th className="px-4 py-2.5 font-medium">Flux</th>
                  <th className="px-4 py-2.5 font-medium">Base de calcul</th>
                  <th className="px-4 py-2.5 text-right font-medium">Montant annuel</th>
                  <th className="px-4 py-2.5 text-right font-medium">Impact</th>
                </tr>
              </thead>
              <tbody>
                {CASE_STUDY_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-white/5 text-slate-300 last:border-0">
                    <td className="px-4 py-2.5">{row.label}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400">{row.basis}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.amount}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.impact}</td>
                  </tr>
                ))}
                <tr className="bg-white/[0.04] font-semibold text-white">
                  <td className="px-4 py-2.5">Rendement net total</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-300">Capital de 10 M$</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">+550 000 $</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-cyan-300">+5,50%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-xs leading-relaxed text-slate-500">
            En réallouant une part de la trésorerie vers l&apos;apport de liquidité (Pilier C), ce
            rendement net peut monter jusqu&apos;à l&apos;objectif de 10,2%, dans le haut de la
            fourchette indicative de 8 à 14% affichée plus haut, sans effet de levier
            supplémentaire ni garantie de résultat.
          </p>
        </div>

        <div className="mt-10">
          <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            Feuille de route sur 12 mois
          </h3>
          <div className="grid gap-3 sm:grid-cols-4">
            {ROADMAP_PHASES.map((step, i) => (
              <div key={step.phase} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
            Risques identifiés & mesures de protection
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
            Gouvernance & séparation des fonds
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-white">Capital engagé</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Cette stratégie est pilotée sur la trésorerie propre de la banque, jamais sur les
                actifs déposés en garantie par les clients. Un gage client sert exclusivement à
                garantir son propre crédit (cf. Rendement) ; il n&apos;est ni prêté, ni engagé dans
                l&apos;arbitrage ou le market making décrits ci-dessus.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-white">Supervision</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Pilotée par la Direction des Marchés Financiers, rapportée au Comité
                d&apos;Investissement et à la Direction Générale à chaque changement de phase (cf.
                feuille de route ci-dessus), avec un suivi quotidien interne de la performance
                réalisée par rapport à l&apos;objectif indicatif affiché.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            Questions fréquentes
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-white">
                Mon gage est-il utilisé pour cette stratégie ?
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Non. Votre gage reste exclusivement affecté à votre propre crédit. Cette stratégie
                porte sur la trésorerie propre de la banque, un capital distinct.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-white">
                Que se passe-t-il si la stratégie perd de l&apos;argent ?
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                La perte est absorbée par la trésorerie de la banque, sans aucun effet sur les
                comptes clients ni sur le crédit déjà accordé : ce risque n&apos;est jamais
                transféré au client.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-white">
                L&apos;objectif de 8 à 14 % est-il déjà atteint ?
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                C&apos;est un objectif de moyen terme, pas un résultat garanti mois par mois : voir
                l&apos;étude de cas ci-dessus pour un exemple de calcul détaillé du rendement net.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-white">
                Pourquoi seuls les métaux industriels ont cet objectif ?
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                L&apos;or, l&apos;argent et l&apos;ETH bénéficient déjà du remboursement automatique
                réel décrit sur la page Rendement. Cet objectif indicatif est propre à la stratégie
                de trésorerie sur les actifs industriels, un mécanisme distinct et additionnel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
