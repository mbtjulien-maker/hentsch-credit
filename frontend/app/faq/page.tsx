import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

export const metadata = {
  title: "Foire aux questions · Hentsch Credit",
  description:
    "Les réponses aux questions les plus fréquentes sur le compte, la sécurité et le fonctionnement de la plateforme Hentsch Credit.",
};

// FAQ générale et transversale — les questions déjà traitées en détail restent sur leur
// page dédiée (comment-ca-marche, rendement, tarifs, strategie-rwa ont chacune leur propre
// FAQ contextuelle) : celle-ci couvre ce qui ne rentre dans aucune d'entre elles (accès,
// sécurité du compte, support) et sert de point d'entrée unique, avec des renvois vers les
// FAQ spécialisées plutôt que de dupliquer leur contenu.
const FAQ_ITEMS = [
  {
    question: "Comment ouvrir un compte Hentsch Credit ?",
    answer:
      "La plateforme est réservée à une clientèle restreinte, sur invitation, dans le cadre d'une relation de gestion de fortune existante avec H. Hentsch Asset Management SA. Vous pouvez déposer une demande d'ouverture de compte depuis la page Demander un compte ; elle sera examinée par nos équipes avant toute ouverture effective.",
  },
  {
    question: "J'ai oublié mon mot de passe, que faire ?",
    answer:
      "Contactez le service indiqué sur la page Contact avec votre nom et l'adresse e-mail associée à votre compte. Pour des raisons de sécurité, aucune réinitialisation n'est effectuée par un autre canal.",
  },
  {
    question: "Mes actifs numériques sont-ils en sécurité ?",
    answer:
      "Les stablecoins et l'or tokenisé déposés en garantie sont conservés par un prestataire de garde d'actifs numériques agréé, distinct de H. Hentsch Asset Management SA, spécialisé dans la conservation sécurisée de crypto-actifs pour le compte d'établissements financiers suisses. Le détail figure sur la page Réglementation, section 3.",
  },
  {
    question: "Quels réseaux et actifs sont acceptés en garantie ?",
    answer:
      "Réseau Ethereum uniquement pour l'instant. Le détail des actifs acceptés (stablecoins, or tokenisé, ETH, métaux industriels tokenisés) et de leur valorisation figure sur la page Comment ça marche.",
  },
  {
    question: "Quel est le ratio de crédit et quels sont les frais réels ?",
    answer:
      "350 % du montant mis en gage au taux en vigueur au moment du verrouillage, avec des frais d'origination de 2 % et un taux d'intérêt annuel sur le crédit réellement utilisé. Le détail chiffré, y compris un exemple de coût total, figure sur la page Tarifs.",
  },
  {
    question: "Comment fonctionne le remboursement automatique et le risque de liquidation ?",
    answer:
      "Une partie du crédit utilisé peut être remboursée automatiquement par la plus-value réelle de votre gage, plafonnée à 60 %. À l'inverse, une forte dépréciation du gage peut entraîner sa liquidation. Le mécanisme complet, avec des exemples chiffrés, figure sur la page Rendement.",
  },
  {
    question: "Que se passe-t-il en cas de doute sur mon identité (KYC) ?",
    answer:
      "Aucune opération financière (génération d'adresse de dépôt, dépôt, octroi de crédit) n'est possible tant que votre statut de vérification d'identité n'est pas confirmé. Le détail figure sur la page Comment ça marche.",
  },
  {
    question: "Comment déposer une réclamation ?",
    answer:
      "Adressez votre réclamation au contact indiqué sur la page Contact. À défaut de résolution amiable, vous pouvez saisir l'organe de médiation compétent, indiqué sur la page Réglementation, section 6.",
  },
] as const;

export default function FaqPage() {
  return (
    <MarketingPageShell
      eyebrow="Foire aux questions"
      title="Questions fréquentes"
      description="Les réponses aux questions générales sur le compte, la sécurité et le fonctionnement de la plateforme."
    >
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div key={item.question} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-muted p-5 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Une question plus précise ?</p>
          <p className="mt-1.5">
            Chaque grand sujet a sa propre page détaillée, avec sa propre foire aux questions :{" "}
            <Link href="/comment-ca-marche" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
              Comment ça marche
            </Link>
            ,{" "}
            <Link href="/rendement" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
              Rendement
            </Link>
            ,{" "}
            <Link href="/strategie-rwa" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
              Stratégie RWA
            </Link>{" "}
            et{" "}
            <Link href="/tarifs" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
              Tarifs
            </Link>
            . Pour toute autre question, la page{" "}
            <Link href="/contact" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
              Contact
            </Link>{" "}
            reste le point d&apos;entrée le plus direct.
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
