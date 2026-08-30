import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export const metadata = {
  title: "Archives · Hentsch Credit",
};

// Archives client-facing de l'évolution des règles métier — adaptation en langage client
// du journal d'audit interne (CLAUDE.md §6 "JOURNAL DES MODIFICATIONS"), qui reste la
// source de vérité technique. Rappelle explicitement le principe de non-rétroactivité déjà
// présent dans les CGU §2 : une position verrouillée garde les conditions de son époque.
const ENTRIES = [
  {
    period: "Depuis l'origine",
    title: "Non-rétroactivité des changements de conditions",
    detail:
      "Un changement de ratio de crédit, de taux ou de seuil ne s'applique jamais à une position déjà verrouillée : elle conserve les conditions qui lui ont été accordées au moment de sa création, jusqu'à son remboursement ou son échéance. Ce principe n'a jamais changé depuis le lancement de la plateforme.",
  },
  {
    period: "Étape 1",
    title: "Ratio de crédit initial",
    detail: "75 % du montant mis en gage.",
  },
  {
    period: "Étape 2",
    title: "Premier relèvement du ratio",
    detail: "75 % → 150 % du montant mis en gage, pour les nouveaux verrouillages.",
  },
  {
    period: "Étape 3",
    title: "Second relèvement du ratio",
    detail: "150 % → 200 % du montant mis en gage, pour les nouveaux verrouillages.",
  },
  {
    period: "Étape 4 (valeur actuelle)",
    title: "Ratio de crédit en vigueur",
    detail: "200 % → 350 % du montant mis en gage, pour les nouveaux verrouillages.",
  },
  {
    period: "Étape 5",
    title: "Extension des actifs acceptés en garantie",
    detail: "Ajout de l'ETH et du SHIB, puis de l'argent tokenisé (KAG), en complément des stablecoins.",
  },
  {
    period: "Étape 6",
    title: "Extension aux métaux et matières premières industriels",
    detail:
      "Ajout du platine (XPT), du palladium (XPD), du cuivre (XCU) et du pétrole synthétique (WTI), dans le cadre de la stratégie RWA.",
  },
  {
    period: "Étape 7",
    title: "Remboursement automatique par rendement du gage",
    detail:
      "Introduction du remboursement automatique par la plus-value réelle du gage, plafonné à 60 % du crédit émis ; le reste demeure à la charge du client.",
  },
  {
    period: "Étape 8",
    title: "Objectif de rendement indicatif sur les actifs RWA industriels",
    detail:
      "Ajout d'un objectif indicatif de 8 à 14 % annualisé sur le platine, le palladium, le cuivre et le pétrole synthétique uniquement. Cet objectif reste indicatif : il n'est ni garanti, ni utilisé dans le calcul du crédit accordé.",
  },
  {
    period: "Étape 9",
    title: "Introduction du mécanisme de liquidation",
    detail:
      "Mise en place d'un seuil d'alerte (30 % de dépréciation du gage depuis son entrée) et d'un seuil de liquidation (50 %). Le détail figure sur la page Rendement et dans les conditions générales, section 7.",
  },
  {
    period: "Étape 10",
    title: "Passage à un rendement estimé calculé automatiquement",
    detail:
      "Les simulateurs de crédit client calculent désormais le rendement estimé, la mensualité et la date de premier remboursement à partir de la performance réelle sur 12 mois, plutôt que de demander au client de saisir une estimation.",
  },
] as const;

export default function ArchivesPage() {
  return (
    <MarketingPageShell
      eyebrow="Historique"
      title="Archives"
      description="L'évolution des principales règles de la plateforme depuis son lancement, dans l'ordre chronologique."
    >
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <ol className="space-y-4 border-l border-border pl-6">
          {ENTRIES.map((entry) => (
            <li key={entry.title} className="relative">
              <span className="absolute -left-[1.65rem] top-1.5 size-2.5 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-600" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">{entry.period}</span>
              <h3 className="mt-0.5 text-sm font-semibold text-foreground">{entry.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{entry.detail}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-border/80 bg-muted p-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            Les valeurs actuellement en vigueur (ratio, taux, frais, plafond de rendement, seuils
            de liquidation) sont détaillées avec leurs chiffres exacts sur la page{" "}
            <a href="/tarifs" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
              Tarifs
            </a>
            . Cette page d&apos;archives ne retrace que l&apos;historique des changements,
            pas les conditions applicables à votre position actuelle.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/80">
            Dernière mise à jour : {ENTITY_IDENTITY.lastUpdated}
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
