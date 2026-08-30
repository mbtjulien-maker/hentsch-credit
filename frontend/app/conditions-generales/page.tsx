import { LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export const metadata = {
  title: "Conditions générales · Hentsch Credit",
};

// Conditions générales d'utilisation (CGU) du service de crédit crypto-collatéralisé.
// Le contenu métier (ratio 350%, non-rétroactivité, blocage du gage, etc.) reflète les
// règles réellement implémentées par la plateforme (cf. CLAUDE.md §2 et CreditEngineService).
// L'exploitant (ENTITY_IDENTITY) est un gestionnaire de fortune indépendant (GFI), pas une
// banque : les avoirs ne sont jamais conservés en son nom propre, cf. section 5. À faire
// valider par la conformité/juridique avant publication.
export default function ConditionsGeneralesPage() {
  return (
    <LegalPageShell
      title="Conditions générales"
      intro="Les présentes conditions générales régissent l'accès et l'utilisation de la plateforme Hentsch Credit, service de crédit garanti par des actifs numériques, proposé par un nombre restreint de clients de la société sur invitation. En ouvrant un compte, le client déclare les avoir lues et acceptées."
    >
      <LegalSection title="1. Objet">
        <p>
          {ENTITY_IDENTITY.tradingName} permet à un client vérifié et préalablement invité de
          déposer, en garantie (« gage »), des stablecoins ou de l&apos;or tokenisé, et
          d&apos;obtenir en contrepartie une ligne de crédit, utilisable en interne et sur une
          carte bancaire associée. Le service est fourni par {ENTITY_IDENTITY.legalName},
          gestionnaire de fortune indépendant (GFI) au sens de la LEFin, en collaboration avec
          des établissements dépositaires et prestataires de garde tiers agréés (cf. section 5).
        </p>
      </LegalSection>

      <LegalSection title="2. Accès restreint et éligibilité">
        <p>
          La plateforme n&apos;est pas ouverte au public. Son accès est réservé à une liste de
          clients déterminée par {ENTITY_IDENTITY.legalName}, sur invitation, dans le cadre
          d&apos;une relation de gestion de fortune existante. L&apos;ouverture d&apos;un
          compte, la génération d&apos;une adresse de dépôt, tout dépôt de garantie et tout
          octroi de crédit sont en outre subordonnés à la vérification préalable de
          l&apos;identité du client (« KYC »). Tant que le statut de vérification du client
          n&apos;est pas confirmé, ces opérations sont refusées. La société se réserve le
          droit de refuser, suspendre ou clôturer un compte en cas d&apos;échec ou de doute
          sur cette vérification, ou de soupçon de fraude, de blanchiment d&apos;argent ou de
          financement du terrorisme.
        </p>
      </LegalSection>

      <LegalSection title="3. Actifs acceptés en garantie">
        <p>
          Sont acceptés en garantie les stablecoins suivants, valorisés au pair (1:1 USD) :
          DAI, USDT, USDC ; le stablecoin indexé sur l&apos;euro suivant, valorisé au cours
          spot en direct : dEURO ; les métaux précieux tokenisés suivants, également
          valorisés au cours spot en direct : XAUT (or), KAG (argent) ; les métaux
          industriels et matières premières tokenisés suivants, valorisés au cours spot en
          direct : XPT (platine), XPD (palladium), XCU (cuivre), WTI (pétrole synthétique) ;
          ainsi que les cryptomonnaies natives suivantes, valorisées au cours spot en direct
          et à la volatilité propre à chacune : ETH, SHIB. Ces actifs
          sont acceptés exclusivement sur le réseau Ethereum. Pour certains actifs,
          l&apos;adresse de dépôt communiquée est individuelle à chaque client ; pour
          d&apos;autres, elle est mutualisée entre clients et le dépôt déclaré fait l&apos;objet
          d&apos;une validation manuelle avant d&apos;être crédité. La liste des actifs acceptés,
          des réseaux pris en charge ou du mécanisme d&apos;adresse applicable à chaque actif
          peut être modifiée à tout moment, sans effet rétroactif sur les positions déjà
          constituées.
        </p>
      </LegalSection>

      <LegalSection title="4. Mécanisme de crédit et taux de gage">
        <p>
          Lors du verrouillage d&apos;une garantie, un crédit est accordé égal à{" "}
          <strong className="font-semibold text-foreground">350 % du montant mis en gage</strong>
          , au taux en vigueur au moment de ce verrouillage. Le pouvoir d&apos;achat total du
          compte se calcule comme suit :
        </p>
        <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground/80">
          Pouvoir d&apos;achat total = Solde disponible + Gage verrouillé + Crédit accordé −
          Crédit utilisé
        </p>
        <p>
          Le taux de gage applicable est celui en vigueur au moment de chaque nouveau
          verrouillage. Toute modification ultérieure de ce taux n&apos;affecte pas
          rétroactivement le crédit déjà accordé au titre d&apos;une garantie verrouillée
          antérieurement : ce crédit reste acquis aux conditions de l&apos;époque.
        </p>
        <p>
          Le crédit émis sur une garantie éligible (métaux précieux tokenisés, métaux industriels et
          matières premières tokenisés, ETH) peut être remboursé à
          hauteur de 60 % au maximum par la plus-value réelle constatée sur cette garantie,
          appliquée automatiquement au crédit utilisé. Les 40 % restants doivent être
          remboursés par apport personnel du client (dépôt ou virement explicite). Ce
          plafond porte sur le montant de crédit émis à l&apos;ouverture de la position et
          n&apos;est pas recalculé en cas de changement ultérieur du ratio de crédit.
        </p>
        <p>
          Un objectif de rendement indicatif (actuellement 8 à 14 % par an) est communiqué à titre
          d&apos;information sur les métaux industriels et matières premières tokenisés (platine,
          palladium, cuivre, pétrole synthétique) : il reflète l&apos;objectif de la stratégie de
          trésorerie propre de la société sur ces actifs (arbitrage, prêt collatéralisé,
          apport de liquidité), et non un taux garanti ou contractuel. Cet objectif n&apos;a aucun
          effet sur le calcul du crédit du client, qui reste exclusivement régi par le mécanisme
          décrit au paragraphe précédent.
        </p>
      </LegalSection>

      <LegalSection title="5. Garde des avoirs">
        <p>{ENTITY_IDENTITY.depositaryNote}</p>
        <p>{ENTITY_IDENTITY.digitalAssetCustodyNote}</p>
        <p>{ENTITY_IDENTITY.depositProtectionNote}</p>
      </LegalSection>

      <LegalSection title="6. Blocage de la garantie et retrait">
        <p>
          Le montant mis en gage et verrouillé ne peut pas être retiré tant que le crédit
          utilisé correspondant n&apos;a pas été intégralement remboursé. Seul le solde
          disponible, hors garantie bloquée, est librement retirable à tout moment, sous
          réserve des contrôles de conformité applicables.
        </p>
      </LegalSection>

      <LegalSection title="7. Liquidation de la garantie">
        <p>
          Les garanties dont la valeur évolue en fonction du marché (métaux précieux tokenisés,
          métaux industriels et matières premières tokenisés, ETH) font l&apos;objet d&apos;une
          surveillance quotidienne de leur valeur, par comparaison avec leur valeur au moment du
          verrouillage :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            en cas de dépréciation d&apos;au moins <strong className="font-semibold text-foreground">30 %</strong>{" "}
            par rapport à cette valeur d&apos;entrée, une alerte est enregistrée sur le compte,
            sans autre effet ;
          </li>
          <li>
            en cas de dépréciation d&apos;au moins <strong className="font-semibold text-foreground">50 %</strong>,
            la garantie est automatiquement retirée du compte (liquidée) à sa valeur d&apos;entrée.
          </li>
        </ul>
        <p>
          La liquidation d&apos;une garantie n&apos;éteint pas le crédit déjà utilisé au titre de
          cette garantie : ce crédit reste intégralement dû par le client, sans plus être
          couvert par la garantie initialement constituée. Une garantie liquidée ne peut plus
          être restituée, y compris si le cours de l&apos;actif concerné se redresse
          ultérieurement. Les seuils mentionnés ci-dessus peuvent être modifiés à tout moment,
          sans effet rétroactif sur l&apos;appréciation d&apos;une dépréciation déjà constatée.
        </p>
      </LegalSection>

      <LegalSection title="8. Carte bancaire et utilisation du crédit">
        <p>
          Une carte bancaire, émise par un partenaire tiers agréé, peut être associée au
          compte pour utiliser la ligne de crédit accordée, dans la limite du crédit
          disponible (crédit accordé moins crédit déjà utilisé). Toute transaction excédant
          cette limite est refusée. Les conditions spécifiques d&apos;émission,
          d&apos;utilisation et de blocage de la carte sont précisées dans les conditions
          particulières associées à celle-ci.
        </p>
      </LegalSection>

      <LegalSection title="9. Remboursement">
        <p>
          Le client peut rembourser tout ou partie du crédit utilisé à tout moment. Le
          remboursement intégral du crédit utilisé au titre d&apos;une garantie donnée
          libère cette garantie, qui redevient retirable. Les simulateurs de remboursement mis
          à disposition sur la plateforme (projection flexible, échéances fixes) sont fournis à
          titre indicatif uniquement : ils reposent sur un rendement estimé à partir de
          performances passées, qui ne préjuge pas des performances futures, et ne constituent
          ni un engagement contractuel ni un calendrier de paiement opposable.
        </p>
      </LegalSection>

      <LegalSection title="10. Frais">
        <p>
          Les frais et taux actuellement appliqués sont : des frais d&apos;origination de{" "}
          <strong className="font-semibold text-foreground">2,0 %</strong>, prélevés une fois sur le
          crédit émis au moment du verrouillage du gage ; des frais de garde du collatéral de{" "}
          <strong className="font-semibold text-foreground">0,5 % par an</strong>, sur le montant du
          gage verrouillé ; et des intérêts sur le crédit utilisé de{" "}
          <strong className="font-semibold text-foreground">13,5 % par an en USD</strong> (
          <strong className="font-semibold text-foreground">12,0 % par an en EUR</strong>),
          composés d&apos;un taux de référence monétaire (SOFR pour l&apos;USD, EURIBOR pour
          l&apos;EUR) et d&apos;une prime de risque de 8,5 points, justifiée par le ratio de crédit
          élevé (350 %) offert par la plateforme. Le détail à jour de ces tarifs figure sur la page{" "}
          <a href="/tarifs" className="font-medium text-foreground underline underline-offset-2">
            Tarifs
          </a>{" "}
          de la plateforme. Ces taux peuvent être mis à jour à tout moment, sans effet rétroactif
          sur les positions déjà constituées : la structure de taux figée au moment du verrouillage
          d&apos;une position reste acquise jusqu&apos;à son remboursement ou son échéance.
        </p>
      </LegalSection>

      <LegalSection title="11. Risques">
        <p>
          Le client reconnaît et accepte les risques inhérents aux actifs numériques,
          notamment :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            la volatilité du cours des actifs valorisés au prix spot (or tokenisé), qui peut
            affecter la valeur de la garantie et du pouvoir d&apos;achat total du compte ;
          </li>
          <li>
            le risque de liquidation de la garantie en cas de forte dépréciation (cf. section
            7), qui n&apos;éteint pas le crédit déjà utilisé ;
          </li>
          <li>
            le risque de contrepartie et le risque opérationnel liés aux établissements
            dépositaires et prestataires de garde tiers mentionnés en section 5 ;
          </li>
          <li>
            le risque réglementaire lié à l&apos;évolution du cadre juridique applicable aux
            actifs numériques et aux stablecoins.
          </li>
        </ul>
        <p>
          Les présentes conditions ne constituent ni un conseil en investissement, ni une
          recommandation d&apos;achat, de vente ou de détention d&apos;un quelconque actif
          numérique.
        </p>
      </LegalSection>

      <LegalSection title="12. Résiliation">
        <p>
          Le client peut clôturer son compte à tout moment, sous réserve du remboursement
          intégral de tout crédit utilisé. La société peut suspendre ou résilier l&apos;accès
          au service en cas de manquement aux présentes conditions, de soupçon de fraude ou
          de blanchiment, ou pour tout motif légal ou réglementaire.
        </p>
      </LegalSection>

      <LegalSection title="13. Responsabilité">
        <p>
          La société met en œuvre les moyens raisonnables pour assurer la disponibilité et
          la sécurité de la plateforme, sans garantie d&apos;absence totale
          d&apos;interruption. Sa responsabilité ne saurait être engagée en cas de force
          majeure, de dysfonctionnement d&apos;un réseau blockchain ou d&apos;un
          prestataire tiers indépendant de sa volonté, dans les limites permises par le
          droit suisse applicable.
        </p>
      </LegalSection>

      <LegalSection title="14. Modification des conditions générales">
        <p>
          La société peut modifier les présentes conditions générales à tout moment, moyennant
          une information préalable du client par les moyens de communication habituels. Les
          modifications n&apos;ont pas d&apos;effet rétroactif sur les positions de crédit
          déjà constituées, sauf disposition légale contraire.
        </p>
      </LegalSection>

      <LegalSection title="15. Droit applicable et for">
        <p>
          Les présentes conditions générales sont soumises au droit suisse. Tout litige
          relatif à leur validité, leur interprétation ou leur exécution relève de la
          compétence exclusive du for de {ENTITY_IDENTITY.jurisdiction}, sous réserve des
          dispositions légales impératives applicables.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
