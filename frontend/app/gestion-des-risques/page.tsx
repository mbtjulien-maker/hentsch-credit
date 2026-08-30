import { LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export const metadata = {
  title: "Gestion des risques et garde des avoirs · Hentsch Credit",
};

// Remplace, en toute honnêteté, les documents "Politique d'exécution" et "Rapport de
// meilleure sélection" d'un modèle de référence tiers (footer d'un courtier/gérant
// exécutant des ordres) : ces documents supposent une activité d'exécution d'ordres pour
// compte de tiers (MiFID / best execution) que H. Hentsch Asset Management SA n'exerce pas
// en tant que GFI opérant Hentsch Credit. Cette page décrit ce que la société fait
// réellement : garde des avoirs, valorisation du gage, mécanisme de liquidation, séparation
// du capital propre engagé dans la stratégie RWA. Aucune activité d'exécution d'ordres pour
// compte de tiers n'est revendiquée nulle part sur cette page.
export default function GestionDesRisquesPage() {
  return (
    <LegalPageShell
      title="Gestion des risques et garde des avoirs"
      intro="H. Hentsch Asset Management SA n'exécute pas d'ordres de bourse pour compte de tiers et ne publie donc pas de politique d'exécution ni de rapport de meilleure sélection au sens de la réglementation sur les marchés financiers. Cette page décrit, à la place, les pratiques réelles de gestion des risques appliquées à la plateforme Hentsch Credit."
    >
      <LegalSection title="1. Nature de l'activité">
        <p>
          {ENTITY_IDENTITY.legalName} agit comme gestionnaire de fortune indépendant (GFI) : elle
          octroie du crédit crypto-collatéralisé à ses clients, contre une garantie déposée par
          eux, et gère une stratégie de trésorerie sur métaux et matières premières industriels
          tokenisés avec son propre capital. Elle n&apos;exécute aucun ordre de bourse pour le
          compte de ses clients et ne gère aucun portefeuille de titres discrétionnaire en leur
          nom.
        </p>
      </LegalSection>

      <LegalSection title="2. Garde et séparation des avoirs">
        <p>{ENTITY_IDENTITY.depositaryNote}</p>
        <p>{ENTITY_IDENTITY.digitalAssetCustodyNote}</p>
        <p>
          Les avoirs déposés en garantie par les clients ne sont jamais utilisés dans la
          stratégie de trésorerie de la société : les deux flux sont distincts et ne se
          rencontrent à aucun moment. Le détail de la stratégie de trésorerie figure sur la page{" "}
          <a href="/strategie-rwa" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            Stratégie RWA
          </a>
          , section &laquo;&nbsp;Gouvernance &amp; séparation des fonds&nbsp;&raquo;.
        </p>
      </LegalSection>

      <LegalSection title="3. Valorisation du gage">
        <p>
          La valeur du gage déposé est déterminée à partir de cours de marché en temps réel
          (cours spot pour l&apos;or tokenisé, les métaux industriels tokenisés, l&apos;ETH ; parité
          1:1 avec le dollar pour les stablecoins USD ; cours spot pour le stablecoin indexé sur
          l&apos;euro), sans marge ni ajustement discrétionnaire appliqué par la société. Cette
          valorisation sert à la fois au calcul du crédit accordé lors du verrouillage et au
          suivi quotidien de dépréciation décrit ci-dessous.
        </p>
      </LegalSection>

      <LegalSection title="4. Mécanisme de liquidation du gage">
        <p>
          Un contrôle automatique quotidien compare la valeur actuelle du gage à sa valeur
          d&apos;entrée (au moment du verrouillage). Une dépréciation de 30 % déclenche une alerte
          visible sur le compte du client ; une dépréciation de 50 % entraîne la liquidation du
          gage. Le crédit déjà utilisé n&apos;est pas effacé par la liquidation : il devient une
          créance non garantie. Le détail complet, avec un exemple chiffré, figure sur la page{" "}
          <a href="/rendement" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            Rendement
          </a>{" "}
          et dans les{" "}
          <a href="/conditions-generales" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            conditions générales
          </a>
          , section 7.
        </p>
      </LegalSection>

      <LegalSection title="5. Conflits d'intérêts">
        <p>
          La société ne prend jamais de position contraire à celle de ses clients sur les actifs
          qu&apos;ils déposent en garantie : elle ne fait que recevoir ce gage, calculer le
          crédit correspondant et, le cas échéant, le liquider selon les seuils fixés à l&apos;avance
          et appliqués de manière automatique et identique à tous les clients. La stratégie de
          trésorerie de la société (métaux et matières premières industriels) est financée par
          son capital propre, jamais par les avoirs déposés par les clients.
        </p>
      </LegalSection>

      <LegalSection title="6. Contrôle et audit">
        <p>
          Les paramètres de risque en vigueur (ratio de crédit, taux, seuils de liquidation) sont
          centralisés dans le moteur de crédit de la plateforme et font l&apos;objet d&apos;une
          suite de tests automatisés à chaque évolution. Tout changement de ces paramètres est
          consigné et ne s&apos;applique jamais rétroactivement à une position déjà verrouillée.
          Le détail de l&apos;historique de ces évolutions figure sur la page{" "}
          <a href="/archives" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            Archives
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
