"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FIXED_TERM_PLAN_IDS,
  INVESTMENT_BASKETS,
  type FixedTermPlan,
  type InvestmentBasket,
  type InvestmentRates,
} from "@/lib/api";
import { formatUsd } from "@/lib/format";

const HORIZONS_MONTHS = [3, 6, 12, 60] as const;

// Sélection du simulateur — soit l'un des 6 paniers perpétuels (dépôt/retrait réels),
// soit l'un des 6 plans à échéance fixe ajoutés à l'entrée #29 du journal (purement
// illustratifs, aucun dépôt réel). Encodée en une seule chaîne ("basket:X"/"plan:Y") pour
// tenir dans un unique <Select>, plutôt que deux sélecteurs séparés.
type SimSelection =
  | { kind: "basket"; id: InvestmentBasket }
  | { kind: "plan"; id: FixedTermPlan["id"] };

function encodeSelection(sel: SimSelection): string {
  return `${sel.kind}:${sel.id}`;
}

function decodeSelection(value: string): SimSelection {
  const [kind, id] = value.split(":");
  return kind === "plan"
    ? { kind: "plan", id: id as FixedTermPlan["id"] }
    : { kind: "basket", id: id as InvestmentBasket };
}

// Simulateur de projection — même principe que les simulateurs de crédit existants
// (§2F CLAUDE.md, useEstimatedYield/RepaymentProjection) : un objectif ANNUEL indicatif
// déjà affiché ailleurs (GET /investment/rates ou /investment/fixed-term-plans), converti
// en taux mensuel équivalent puis composé sur l'horizon choisi. Jamais un chiffre garanti
// — même disclaimer que partout ailleurs sur ce produit (cf. simulator.disclaimer).
function SimulatorTab({
  rates,
  plans,
  availableBalance,
}: {
  rates: InvestmentRates | null;
  plans: FixedTermPlan[] | null;
  availableBalance: number | null;
}) {
  const t = useTranslations("Dashboard.investment.advisor");
  // Les titres de plan vivent sous Dashboard.investment.fixedTermPlans (partagés avec
  // FixedTermPlansSection, cf. investment-panel.tsx), pas sous .advisor — traducteur
  // séparé plutôt que de dupliquer ces 6 titres dans le namespace advisor.
  const tInvestment = useTranslations("Dashboard.investment");
  const [selection, setSelection] = useState<SimSelection>({
    kind: "basket",
    id: "RWA_STRATEGY",
  });
  const [amount, setAmount] = useState("1000");
  const [months, setMonths] = useState<number>(12);

  const selectedPlan =
    selection.kind === "plan" ? plans?.find((p) => p.id === selection.id) ?? null : null;
  const annualPct =
    selection.kind === "basket"
      ? rates
        ? Number(rates[selection.id].indicativeAnnualPct)
        : null
      : selectedPlan
        ? Number(selectedPlan.annualizedPct)
        : null;
  const principal = Number(amount) || 0;
  const monthlyRate = annualPct != null ? Math.pow(1 + annualPct / 100, 1 / 12) - 1 : null;
  const projected =
    monthlyRate != null && principal > 0 ? principal * Math.pow(1 + monthlyRate, months) : null;
  const gain = projected != null ? projected - principal : null;

  function handleSelectionChange(value: string) {
    const next = decodeSelection(value);
    setSelection(next);
    // Un plan à échéance fixe a une durée propre (3/6/12 mois) — la présélectionner
    // évite au client de devoir la retrouver manuellement dans les boutons ci-dessous
    // (cf. demande client : "calculer la projection exacte du gain sur ces durées").
    if (next.kind === "plan") {
      const plan = plans?.find((p) => p.id === next.id);
      if (plan) setMonths(plan.horizonMonths);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label>{t("simulator.basketLabel")}</Label>
        <Select value={encodeSelection(selection)} onValueChange={(v) => v && handleSelectionChange(v)}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return null;
                const decoded = decodeSelection(value);
                return decoded.kind === "basket"
                  ? t(`simulator.basket.${decoded.id}`)
                  : tInvestment(`fixedTermPlans.plan.${decoded.id}.title`);
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("simulator.basketGroupLabel")}</SelectLabel>
              {INVESTMENT_BASKETS.map((b) => (
                <SelectItem key={b} value={encodeSelection({ kind: "basket", id: b })}>
                  {t(`simulator.basket.${b}`)}
                </SelectItem>
              ))}
            </SelectGroup>
            {plans && plans.length > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>{t("simulator.planGroupLabel")}</SelectLabel>
                  {FIXED_TERM_PLAN_IDS.map((id) => (
                    <SelectItem key={id} value={encodeSelection({ kind: "plan", id })}>
                      {tInvestment(`fixedTermPlans.plan.${id}.title`)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="advisor-amount">{t("simulator.amountLabel")}</Label>
        <Input
          id="advisor-amount"
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {availableBalance != null && (
          <p className="text-xs text-muted-foreground">
            {t("simulator.balanceHint", { balance: formatUsd(availableBalance) })}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>{t("simulator.horizonLabel")}</Label>
        <div className="flex gap-2">
          {HORIZONS_MONTHS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setMonths(h)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                months === h
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {h < 12 ? t("simulator.horizonMonths", { months: h }) : t("simulator.horizonYears", { years: h / 12 })}
            </button>
          ))}
        </div>
      </div>

      {projected != null && gain != null && (
        <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("simulator.projectedValue")}</span>
            <span className="font-semibold tabular-nums">{formatUsd(projected)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("simulator.projectedGain")}</span>
            <span className={`font-semibold tabular-nums ${gain >= 0 ? "text-primary" : "text-destructive"}`}>
              {gain >= 0 ? "+" : ""}
              {formatUsd(gain)}
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground/80">{t("simulator.disclaimer")}</p>
    </div>
  );
}

// Questionnaire d'appétence au risque — 3 questions, score 1-3 par réponse, somme sur
// 3-9. Débouche sur une suggestion d'allocation entre RWA_STRATEGY et un panier d'actions
// précis, jamais exécutée automatiquement (cf. quiz.disclaimer) : le client reste seul
// décisionnaire, il applique lui-même le montant suggéré via les champs de dépôt des
// cartes ci-dessus.
const QUIZ_QUESTIONS = [
  { key: "horizon", options: ["short", "medium", "long"] },
  { key: "reaction", options: ["sell", "wait", "buy"] },
  { key: "goal", options: ["preserve", "balance", "grow"] },
] as const;

type RiskProfile = "prudent" | "balanced" | "dynamic" | "veryDynamic";

// Le panier d'actions suggéré par profil parcourt le spectre de risque des 4 paniers
// introduits à l'entrée #27 du journal (1,5 → 4,8, cf. RISK_LEVEL côté backend) — le
// panier STOCKS d'origine (risque 4, chevauchant STOCKS_TECH_AI) n'est volontairement
// jamais suggéré ici : ces 4 paniers ont été conçus pour ce gradient, contrairement au
// panier historique.
const RISK_PROFILE_STOCK_BASKET: Record<RiskProfile, InvestmentBasket> = {
  prudent: "STOCKS_CONSERVATIVE",
  balanced: "STOCKS_BALANCED",
  dynamic: "STOCKS_TECH_AI",
  veryDynamic: "STOCKS_MOMENTUM",
};

function RiskQuizTab() {
  const t = useTranslations("Dashboard.investment.advisor");
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const answeredAll = QUIZ_QUESTIONS.every((q) => answers[q.key] != null);
  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);

  let profile: RiskProfile | null = null;
  let allocation: { rwa: number; stocks: number } | null = null;
  if (answeredAll) {
    if (totalScore <= 4) {
      profile = "prudent";
      allocation = { rwa: 80, stocks: 20 };
    } else if (totalScore <= 6) {
      profile = "balanced";
      allocation = { rwa: 50, stocks: 50 };
    } else if (totalScore <= 8) {
      profile = "dynamic";
      allocation = { rwa: 30, stocks: 70 };
    } else {
      profile = "veryDynamic";
      allocation = { rwa: 15, stocks: 85 };
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {QUIZ_QUESTIONS.map((q) => (
        <div key={q.key} className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-foreground">{t(`quiz.${q.key}.question`)}</p>
          <div className="flex flex-col gap-1.5">
            {q.options.map((optionKey, index) => {
              const score = index + 1;
              return (
                <button
                  key={optionKey}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: score }))}
                  className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${
                    answers[q.key] === score
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(`quiz.${q.key}.options.${optionKey}`)}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {profile && allocation && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-sm font-semibold text-foreground">{t(`quiz.result.${profile}.title`)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t(`quiz.result.${profile}.description`)}</p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="font-medium">{t("quiz.allocationRwa", { pct: allocation.rwa })}</span>
            <span className="font-medium">
              {t("quiz.allocationStock", {
                basket: t(`simulator.basket.${RISK_PROFILE_STOCK_BASKET[profile]}`),
                pct: allocation.stocks,
              })}
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground/80">{t("quiz.disclaimer")}</p>
    </div>
  );
}

const FAQ_KEYS = ["difference", "guarantee", "liquidity"] as const;

function FaqTab() {
  const t = useTranslations("Dashboard.investment.advisor");
  return (
    <div className="flex flex-col gap-2">
      {FAQ_KEYS.map((key) => (
        <details key={key} className="group rounded-lg border border-border/60 p-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground marker:content-none">
            {t(`faq.${key}.question`)}
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(`faq.${key}.answer`)}</p>
        </details>
      ))}
    </div>
  );
}

// Bouton flottant + modal — "Simuler mes gains / Parler au Copilote" côté demande, mais un
// vrai calculateur + questionnaire + FAQ plutôt qu'une conversation simulée : le projet
// n'a aucune intégration LLM branchée à ce stade, et présenter un texte scripté comme une
// IA conversationnelle serait trompeur (cohérent avec le reste du produit, qui ne fabrique
// jamais une donnée ou une capacité qui n'existe pas réellement).
export function InvestmentAdvisorDialog({
  rates,
  plans,
  availableBalance,
}: {
  rates: InvestmentRates | null;
  plans: FixedTermPlan[] | null;
  availableBalance: number | null;
}) {
  const t = useTranslations("Dashboard.investment.advisor");
  const [tab, setTab] = useState("simulator");

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <Sparkles className="size-4" />
            {t("trigger")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simulator">{t("tabs.simulator")}</TabsTrigger>
            <TabsTrigger value="quiz">{t("tabs.quiz")}</TabsTrigger>
            <TabsTrigger value="faq">{t("tabs.faq")}</TabsTrigger>
          </TabsList>
          <TabsContent value="simulator" className="max-h-[50vh] overflow-y-auto pt-4">
            <SimulatorTab rates={rates} plans={plans} availableBalance={availableBalance} />
          </TabsContent>
          <TabsContent value="quiz" className="max-h-[50vh] overflow-y-auto pt-4">
            <RiskQuizTab />
          </TabsContent>
          <TabsContent value="faq" className="max-h-[50vh] overflow-y-auto pt-4">
            <FaqTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
