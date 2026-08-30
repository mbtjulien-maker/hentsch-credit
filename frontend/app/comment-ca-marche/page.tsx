import Link from "next/link";
import { ArrowRight, CreditCard, HandCoins, ShieldCheck, UserCheck, Wallet } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { AssetLogoRow } from "@/components/marketing/asset-logo-row";

export const metadata = {
  title: "Comment ça marche · Hentsch Credit",
};

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

const STEPS = [
  {
    icon: UserCheck,
    title: "1. Vérification d'identité (KYC)",
    description:
      "Sur invitation uniquement : votre identité est vérifiée avant tout accès au dépôt ou au crédit, sans aucune exception.",
  },
  {
    icon: Wallet,
    title: "2. Déposez votre garantie",
    description: "Stablecoins, métaux précieux ou industriels tokenisés, ou ETH, sur le réseau Ethereum.",
    assets: DEPOSIT_ASSETS,
  },
  {
    icon: HandCoins,
    title: "3. Crédit accordé automatiquement",
    description:
      "350% du montant déposé, débloqué dès que votre demande est validée (moins 2% de frais d'origination, prélevés une fois).",
  },
  {
    icon: CreditCard,
    title: "4. Dépensez sur votre carte",
    description: "Utilisez votre ligne de crédit en interne ou directement sur votre carte bancaire.",
  },
  {
    icon: ShieldCheck,
    title: "5. Remboursez pour libérer le gage",
    description:
      "Jusqu'à 60% remboursé automatiquement par le rendement du gage ; le reste par apport personnel. À l'inverse, une forte baisse du gage peut entraîner sa liquidation.",
  },
] as const;

// Page dédiée au parcours client — contenu déplacé depuis la section #comment-ca-marche
// de la page d'accueil (cf. app/page.tsx, désormais une simple carte de renvoi). Enrichi
// d'une étape KYC explicite (garde-fou réel du backend, cf. CLAUDE.md §5) et des vrais
// chiffres de frais/remboursement (cf. /tarifs, /rendement) plutôt que de rester
// approximatif sur ce qui se passe entre chaque étape.
export default function CommentCaMarchePage() {
  return (
    <MarketingPageShell
      eyebrow="Le parcours client"
      title="Comment ça marche"
      description="De la vérification d'identité à la dépense, en cinq étapes."
    >
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
          Le détail des taux et frais réels vit sur la page{" "}
          <Link href="/tarifs" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            Tarifs
          </Link>
          , et le détail du remboursement automatique, y compris le risque de liquidation en cas de
          forte baisse du gage, sur la page{" "}
          <Link href="/rendement" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            Rendement
          </Link>
          .
        </p>

        <h2 className="mt-14 text-xl font-semibold text-foreground">Le détail de chaque étape</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">1. Vérification d&apos;identité</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              L&apos;accès n&apos;est ouvert que sur invitation. Une fois votre demande de compte
              acceptée, un compte et un mot de passe temporaire vous sont communiqués hors-ligne,
              puis votre identité est vérifiée avant toute autre opération. Tant que ce statut
              n&apos;est pas confirmé, la génération d&apos;adresse de dépôt et toute demande de
              crédit sont techniquement bloquées, pas seulement déconseillées.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">2. Dépôt de la garantie</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Selon l&apos;actif choisi, l&apos;adresse de dépôt communiquée est soit individuelle
              (créditée automatiquement dès confirmation on-chain), soit mutualisée entre clients
              (vous déclarez votre dépôt, un conseiller le valide manuellement après réception
              effective des fonds). Le crédit correspondant est émis automatiquement dès que le
              solde disponible atteint le montant de la demande, sans intervention manuelle
              supplémentaire de notre part.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">3. Émission du crédit</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              350 % du montant déposé, au taux en vigueur au moment du verrouillage : une position
              déjà verrouillée conserve toujours ce taux, même si le ratio change ensuite pour les
              nouveaux clients. Les frais d&apos;origination (2 %) sont prélevés une seule fois, sur
              le crédit émis, pas sur votre gage.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">4. Utilisation du crédit</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Le crédit accordé n&apos;est qu&apos;un plafond : aucun intérêt ni remboursement
              n&apos;est dû tant que vous ne l&apos;utilisez pas réellement (paiement carte,
              utilisation interne). C&apos;est une ligne de crédit renouvelable, pas un prêt versé
              en une fois sur votre solde disponible.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">5. Remboursement</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Deux canaux, quotidiens et automatiques pour le premier : la plus-value réelle de
              votre gage (jusqu&apos;à 60 % du crédit émis), et votre apport personnel pour le
              reste. Le remboursement intégral libère votre gage, qui redevient retirable. À
              l&apos;inverse, une dépréciation sévère du gage (50 % depuis son entrée) entraîne sa
              liquidation, sans effacer le crédit déjà utilisé.
            </p>
          </div>
        </div>

        <h2 className="mt-14 text-xl font-semibold text-foreground">Questions fréquentes</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Que se passe-t-il si mon KYC est rejeté ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Aucune opération financière n&apos;est possible tant que le statut n&apos;est pas
              vérifié. En cas de rejet, la société peut refuser, suspendre ou clôturer le compte
              concerné, notamment en cas de doute sur l&apos;identité déclarée.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Combien de temps prend l&apos;approbation d&apos;une demande de crédit ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Variable selon la charge du back-office : une demande passe par une file de
              validation manuelle avant de pouvoir recevoir un dépôt. Le crédit lui-même est émis
              automatiquement dès réception des fonds, sans délai supplémentaire une fois la
              demande approuvée.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Puis-je retirer mon gage avant d&apos;avoir tout remboursé ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Non. Le gage verrouillé reste bloqué tant que le crédit utilisé correspondant
              n&apos;est pas intégralement remboursé. Seul le solde disponible, hors gage bloqué,
              est librement retirable à tout moment.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Accéder à mon compte
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/demande-de-compte"
            className="rounded-lg border border-border/80 bg-card px-5 py-3 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:border-border hover:text-foreground"
          >
            Demander l&apos;ouverture d&apos;un compte
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
