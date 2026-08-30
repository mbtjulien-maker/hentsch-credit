import { Coins, Landmark, Lock, Percent, ShieldAlert, ShieldCheck, Timer } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

export const metadata = {
  title: "Tarifs · Hentsch Credit",
  description:
    "Les taux et frais réels appliqués par Hentsch Credit : ratio de crédit, intérêts, frais d'origination et seuils de liquidation, sans surprise.",
};

// Grille tarifaire réelle — miroir des valeurs effectivement appliquées par le moteur de
// crédit (cf. backend/src/credit/rate.constants.ts et ledger.constants.ts, sources de
// vérité). Duplication assumée côté marketing (même principe que CURRENCY_LABELS dans
// lib/format.ts) : ce sont des constantes de tarification, pas des données de marché à
// synchroniser en direct. Objectif de transparence explicite (cf. CGU §9, qui renvoyait
// jusqu'ici à "aux taux communiqués au client" sans donner les chiffres) : donner les
// vrais chiffres plutôt qu'un renvoi vague à des conditions particulières.
const PRICING = [
  {
    icon: Percent,
    label: "Ratio de crédit",
    value: "350%",
    detail: "Du montant mis en gage, au taux en vigueur au moment du verrouillage.",
  },
  {
    icon: Landmark,
    label: "Taux d'intérêt annuel",
    value: "13,5% USD · 12,0% EUR",
    detail: "Taux de référence (SOFR/EURIBOR) + prime de risque de 8,5 points, sur le crédit utilisé.",
  },
  {
    icon: Coins,
    label: "Frais d'origination",
    value: "2,0%",
    detail: "Prélevés une fois, sur le crédit émis, au moment du verrouillage du gage.",
  },
  {
    icon: Lock,
    label: "Frais de garde du collatéral",
    value: "0,5% / an",
    detail: "Sur le montant du gage verrouillé, tant que la position reste active.",
  },
  {
    icon: Timer,
    label: "Durée de la position",
    value: "12 mois",
    detail: "Renouvelable ; le gage reste bloqué tant que le crédit utilisé n'est pas remboursé.",
  },
  {
    icon: ShieldCheck,
    label: "Remboursement automatique",
    value: "jusqu'à 60%",
    detail: "Par la plus-value réelle du gage (or, argent, ETH, métaux industriels). Les 40% restants se remboursent par apport personnel.",
  },
  {
    icon: ShieldAlert,
    label: "Seuils de liquidation du gage",
    value: "30% · 50%",
    detail: "Dépréciation depuis la valeur d'entrée : 30% déclenche une alerte, 50% liquide le gage (le crédit déjà utilisé reste dû). Détail sur la page Rendement.",
  },
] as const;

// Page dédiée à la grille tarifaire réelle — pour la transparence, en complément des
// pages de mécanisme (Comment ça marche, Rendement) qui expliquent le fonctionnement sans
// forcément détailler les chiffres. Un changement de taux ne s'applique jamais
// rétroactivement (cf. CreditPosition — structure de taux figée à l'ouverture).
export default function TarifsPage() {
  return (
    <MarketingPageShell
      eyebrow="Transparence tarifaire"
      title="Nos tarifs, sans surprise"
      description="Les taux et frais réellement appliqués par la plateforme, figés au moment du verrouillage de votre gage."
    >
      <div className="mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING.map((item) => (
            <div key={item.label} className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
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
          <p>
            Un changement ultérieur de l&apos;un de ces taux ne s&apos;applique qu&apos;aux nouveaux
            verrouillages : une position déjà ouverte conserve la structure de taux qui lui a été
            appliquée au moment de sa création, jusqu&apos;à son remboursement ou son échéance.
          </p>
          <p className="mt-3">
            Le détail contractuel complet de ces tarifs figure dans nos{" "}
            <a href="/conditions-generales" className="font-medium text-foreground underline underline-offset-2">
              conditions générales
            </a>
            .
          </p>
        </div>

        <h2 className="mt-10 text-xl font-semibold text-foreground">Exemple de coût total sur 12 mois</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pour un dépôt de 2 000 $ (7 000 $ de crédit accordé), intégralement utilisé pendant 12
          mois puis remboursé, scénario le plus prudent (sans aucune réduction par rendement).
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/80 text-xs uppercase tracking-wide text-muted-foreground/80">
                <th className="px-4 py-2.5 font-medium">Poste</th>
                <th className="px-4 py-2.5 font-medium">Calcul</th>
                <th className="px-4 py-2.5 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 tabular-nums">
              <tr>
                <td className="px-4 py-2.5">Frais d&apos;origination</td>
                <td className="px-4 py-2.5 text-muted-foreground/80">2,0 % × 7 000 $, prélevé une fois</td>
                <td className="px-4 py-2.5 text-right">140 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">Intérêts sur 12 mois</td>
                <td className="px-4 py-2.5 text-muted-foreground/80">13,5 % × 7 000 $ utilisés toute l&apos;année</td>
                <td className="px-4 py-2.5 text-right">945 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-semibold text-foreground">Total avant rendement</td>
                <td className="px-4 py-2.5 text-muted-foreground/80">Hors réduction éventuelle par plus-value du gage</td>
                <td className="px-4 py-2.5 text-right font-semibold text-foreground">1 085 $</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground/80">
          Les frais de garde du collatéral (0,5 %/an) sont affichés et figés au verrouillage, mais
          leur prélèvement automatique périodique n&apos;est pas encore en service à ce stade ; ils
          ne sont donc pas inclus dans ce total. Si votre gage génère un rendement (or, argent, ETH,
          métaux industriels), une partie de ces 1 085 $ peut être couverte automatiquement, dans la
          limite de 60 % du crédit utilisé (cf.{" "}
          <a href="/rendement" className="font-medium text-foreground/80 underline underline-offset-2">
            Rendement
          </a>
          ).
        </p>

        <h2 className="mt-10 text-xl font-semibold text-foreground">Questions fréquentes</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Y a-t-il des frais de remboursement anticipé ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Non. Vous pouvez rembourser tout ou partie du crédit utilisé à tout moment, sans
              pénalité. Les intérêts ne courent que sur la durée et le montant réellement utilisés.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Ces tarifs sont-ils négociables ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Non, ils s&apos;appliquent uniformément à tous les clients au taux en vigueur au
              moment du verrouillage. Un futur changement de taux ne s&apos;applique qu&apos;aux
              nouveaux verrouillages.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Pourquoi le taux diffère-t-il entre USD et EUR ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Chaque devise applique son propre taux de référence monétaire (SOFR pour l&apos;USD,
              EURIBOR pour l&apos;EUR) avant d&apos;y ajouter la même prime de risque de 8,5 points,
              d&apos;où l&apos;écart de 1,5 point entre les deux.
            </p>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
