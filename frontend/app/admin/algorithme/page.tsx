import {
  AlertTriangle,
  Calculator,
  Lightbulb,
  Lock,
  Percent,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminDivider, AdminField, AdminMetric } from "@/components/admin/admin-ui";
import { TreasuryBotPanel } from "@/components/admin/treasury-bot-panel";

// Valeurs réellement appliquées par le moteur de crédit — miroir de
// backend/src/credit/rate.constants.ts, ledger.constants.ts et
// market-data.constants.ts (mêmes sources de vérité que la page publique /tarifs).
// Cette page est le pendant back-office : la même réalité, présentée composant par
// composant pour la revue interne, avec des pistes d'amélioration en bas de page.
const YIELD_ELIGIBLE = ["XAUT", "PAXG", "KAG", "ETH", "XPT", "XPD", "XCU", "WTI"];
const PRECIOUS_METALS = ["PAXG", "XAUT", "KAG"];
const INDUSTRIAL_RWA = ["XPT", "XPD", "XCU", "WTI"];
const PEGGED = ["USDS", "DAI", "USDE", "PYUSD", "USDT", "USDC"];

const PILLARS = [
  { name: "Arbitrage Cash & Carry", range: "4 à 7%" },
  { name: "Collatéralisation & prêt triangulaire", range: "6,5 à 10%" },
  { name: "Apport de liquidité sélectionné", range: "9 à 15%" },
];

const IMPROVEMENTS = [
  {
    title: "Taux de référence figés (SOFR ≈ 5%, EURIBOR ≈ 3,5%)",
    detail:
      "Constantes codées en dur (cf. BASE_RATE_PCT), jamais mises à jour automatiquement. Brancher un flux live (ex : FRED pour le SOFR) éviterait un taux silencieusement obsolète si les taux de marché bougent.",
  },
  {
    title: "Ratio de crédit uniforme (350%) quel que soit l'actif",
    detail:
      "Le même ratio s'applique à un stablecoin et à SHIB, pourtant à la volatilité radicalement différente. Un ratio pondéré par la volatilité historique de chaque actif (plus prudent sur les actifs volatils) réduirait le risque de sous-collatéralisation.",
  },
  {
    title: "Frais de garde \"affichés\" mais jamais réellement facturés",
    detail:
      "CUSTODY_FEE_PCT existe et s'affiche au client, mais aucune tâche planifiée ne prélève réellement ce frais au fil du temps (accrual quotidien non implémenté) : un écart entre ce qui est promis et ce qui est appliqué.",
  },
  {
    title: "Plafond de rendement automatique (60%) fixe pour tous les actifs",
    detail:
      "Le même plafond s'applique à l'or (peu volatil) et à l'ETH (plus volatil) : un plafond modulé par la volatilité de l'actif limiterait l'exposition sur les positions les plus risquées, tout en laissant plus de marge sur les plus stables.",
  },
  {
    title: "Pas de suivi de risque agrégé au niveau du portefeuille",
    detail:
      "Chaque position est évaluée isolément ; aucune vue consolidée du risque total du portefeuille de crédit (VaR, stress-test) n'existe, contrairement à la pratique décrite dans la feuille de route RWA pour la stratégie de trésorerie.",
  },
] as const;

function CurrencyPill({ code }: { code: string }) {
  return (
    <span className="rounded-full border border-foreground/[0.08] bg-foreground/[0.05] px-2.5 py-1 text-[11px] font-medium text-foreground">
      {code}
    </span>
  );
}

// Vue interne "Algorithme de crédit" — décompose le moteur de crédit (CreditEngineService
// + CollateralYieldService) composant par composant pour la revue technique/produit,
// avec une section de pistes d'amélioration concrètes en bas de page. Volontairement en
// lecture seule (même principe que /admin/parametres) : ceci documente l'algorithme, ce
// n'est pas une console de configuration en direct.
export default function AdminAlgorithmPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Algorithme de crédit</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Le moteur de calcul du crédit et du rendement, composant par composant.
        </p>
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Formule du pouvoir d'achat"
          description="Recalculée à chaque mutation du ledger (LedgerService), jamais stockée directement."
        />
        <p className="rounded-lg border border-foreground/[0.07] bg-foreground/[0.03] px-4 py-3 font-mono text-[13px] text-foreground">
          Pouvoir d&apos;achat total = Solde disponible + Gage verrouillé + Crédit accordé − Crédit utilisé
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          « Crédit accordé » est la somme des crédits réellement émis à date, jamais recalculé rétroactivement si le
          ratio change : chaque position conserve la structure de taux qui lui a été appliquée à son ouverture.
        </p>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Émission du crédit"
          description="CreditEngineService.lockCollateralAndIssueCredit, appliqué à chaque nouveau verrouillage de gage."
          action={<Calculator className="size-4 text-muted-foreground" />}
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <AdminMetric label="Ratio de crédit" value="350%" sub="Du montant mis en gage" />
          <AdminMetric label="Frais d'origination" value="2,0%" sub="Prélevés une fois, à l'émission" />
          <AdminMetric label="Frais de garde" value="0,5% / an" sub="Sur le gage verrouillé" />
          <AdminField label="Taux d'intérêt USD" value="13,5% / an" mono />
          <AdminField label="Taux d'intérêt EUR" value="12,0% / an" mono />
          <AdminField label="Durée de position" value="12 mois" mono />
        </div>
        <AdminDivider className="my-4" />
        <AdminField
          label="Décomposition du taux d'intérêt"
          value="Taux de référence monétaire (SOFR 5,0% USD / EURIBOR 3,5% EUR) + prime de risque fixe de 8,5 points, justifiée par le ratio de crédit élevé (350%, contre 50-80% pour un prêt crypto classique)."
        />
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Rendement automatique du gage"
          description="CollateralYieldService.runDailyAccrual, tourne quotidiennement (cron 1h du matin)."
          action={<Sparkles className="size-4 text-muted-foreground" />}
        />
        <div className="flex flex-wrap items-center gap-2">
          {YIELD_ELIGIBLE.map((c) => (
            <CurrencyPill key={c} code={c} />
          ))}
        </div>
        <AdminDivider className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField
            label="Plafond de remboursement automatique"
            value="60% du crédit émis à l'ouverture de la position (jamais recalculé si le ratio change ensuite). Les 40% restants exigent un apport personnel explicite du client."
          />
          <AdminField
            label="Cliquet (high-water mark)"
            value="Le prix appliqué (collateralYieldAppliedPriceUsd) n'avance que lorsque le remboursement réussit, et ne recule jamais si le cours baisse ensuite : une plus-value déjà encaissée n'est jamais reprise."
          />
        </div>
        <AdminDivider className="my-4" />
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <RefreshCw className="mt-0.5 size-3.5 shrink-0" />
          Actifs pegged (stablecoins) exclus par construction : {PEGGED.join(", ")}. Aucune plus-value possible sur
          un actif indexé 1:1 sur le dollar.
        </p>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Moteur de liquidation"
          description="LiquidationService.runDailyLiquidationCheck, tourne quotidiennement (cron 2h du matin, décalé du rendement)."
          action={<ShieldAlert className="size-4 text-muted-foreground" />}
        />
        <p className="text-xs text-muted-foreground">
          Couvre le sens inverse du rendement automatique : si la valeur d&apos;un gage volatil s&apos;effondre après
          verrouillage, la position est retirée du bilan avant que la banque ne porte un risque non maîtrisé.
          Dépréciation mesurée par rapport à la valeur d&apos;entrée du gage, jamais par rapport au crédit utilisé.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <AdminMetric label="Seuil d'alerte" value="30%" sub="Dépréciation depuis l'entrée" accent="text-primary" />
          <AdminMetric label="Seuil de liquidation" value="50%" sub="Déclenche l'action automatique" accent="text-destructive" />
        </div>
        <AdminDivider className="my-4" />
        <AdminField
          label="Effet d'une liquidation"
          value="Le gage (à sa valeur d'entrée) est retiré du bilan (gage verrouillé + crédit accordé), mais le crédit déjà utilisé n'est PAS effacé : il reste dû par le client, devenu une exposition non garantie pour la banque. Position marquée LIQUIDATED, journalisée (type LIQUIDATION), état terminal comme CLOSED."
        />
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Objectif indicatif RWA (métaux industriels)"
          description="Stratégie de trésorerie propre à la banque sur les actifs industriels tokenisés, jamais un taux appliqué au crédit du client."
          action={<TrendingUp className="size-4 text-muted-foreground" />}
        />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {INDUSTRIAL_RWA.map((c) => (
            <CurrencyPill key={c} code={c} />
          ))}
          <span className="text-xs text-muted-foreground">Objectif indicatif : 8 à 14% APY</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.name} className="rounded-lg border border-foreground/[0.07] p-3">
              <div className="text-[15px] font-semibold tabular-nums text-foreground">{p.range}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">{p.name}</div>
            </div>
          ))}
        </div>
      </AdminCard>

      <TreasuryBotPanel />

      <AdminCard>
        <AdminCardHeader
          title="Garde-fous & non-rétroactivité"
          action={<Lock className="size-4 text-muted-foreground" />}
        />
        <ul className="flex flex-col gap-2 text-sm text-foreground">
          <li>• Génération de wallet, dépôt et octroi de crédit bloqués tant que le KYC n&apos;est pas VERIFIED.</li>
          <li>• Métaux précieux éligibles au rendement : {PRECIOUS_METALS.join(", ")}.</li>
          <li>
            • Un changement de ratio, de taux ou de plafond ne s&apos;applique qu&apos;aux nouveaux verrouillages :
            une position déjà ouverte conserve les conditions de son époque.
          </li>
        </ul>
      </AdminCard>

      <AdminCard className="border-amber-500/20">
        <AdminCardHeader
          title="Pistes d'amélioration"
          description="Constats techniques sur l'algorithme actuel, à arbitrer avec les équipes risque et produit avant toute implémentation."
          action={<Lightbulb className="size-4 text-primary" />}
        />
        <div className="flex flex-col gap-3">
          {IMPROVEMENTS.map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-lg border border-foreground/[0.07] p-3.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <AdminDivider className="my-4" />
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Percent className="mt-0.5 size-3.5 shrink-0" />
          Constats de conception, pas des bugs : l&apos;algorithme actuel fonctionne comme documenté. Ces pistes
          visent à réduire le risque résiduel à mesure que la plateforme monte en charge.
        </p>
      </AdminCard>
    </div>
  );
}
