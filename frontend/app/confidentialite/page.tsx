import { LegalField, LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export const metadata = {
  title: "Confidentialité · Hentsch Credit",
};

// Politique de confidentialité — traitement des données personnelles au sens de la loi
// fédérale suisse sur la protection des données (nLPD) et, le cas échéant, du RGPD. Les
// sous-traitants listés reflètent les intégrations réellement prévues par la plateforme
// (cf. CLAUDE.md §3) — à confirmer/compléter selon les prestataires effectivement retenus
// en production.
export default function ConfidentialitePage() {
  return (
    <LegalPageShell
      title="Politique de confidentialité"
      intro="La présente politique décrit comment H. Hentsch Asset Management SA collecte, utilise et protège les données personnelles des clients de Hentsch Credit, plateforme réservée à une clientèle restreinte, conformément à la loi fédérale suisse sur la protection des données (nLPD) et, le cas échéant, au règlement général sur la protection des données (RGPD)."
    >
      <LegalSection title="1. Responsable du traitement">
        <dl className="space-y-2">
          <LegalField label="Responsable" value={ENTITY_IDENTITY.legalName} />
          <LegalField label="Adresse" value={ENTITY_IDENTITY.registeredOffice} />
          <LegalField label="Contact protection des données" value={ENTITY_IDENTITY.dataProtectionContact} />
        </dl>
        <p>Conforme LPD suisse et RGPD.</p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <ul className="list-disc space-y-1 pl-5">
          <li>Données d&apos;identification et de contact (nom, e-mail, coordonnées) ;</li>
          <li>
            Documents et données de vérification d&apos;identité (KYC) transmis lors de
            l&apos;ouverture de compte ;
          </li>
          <li>
            Données relatives aux adresses de dépôt, aux transactions on-chain et aux
            opérations effectuées sur la plateforme (dépôts, verrouillages de garantie,
            octrois de crédit, remboursements, paiements par carte) ;
          </li>
          <li>Données techniques de connexion à la plateforme (journaux, identifiants de session).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalités et base légale">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Exécution de la relation contractuelle : ouverture et gestion du compte, octroi et
            suivi du crédit, émission et gestion de la carte bancaire associée ;
          </li>
          <li>
            Respect des obligations légales et réglementaires : vérification
            d&apos;identité (KYC), lutte contre le blanchiment d&apos;argent et le
            financement du terrorisme (LBA), conservation des pièces comptables ;
          </li>
          <li>Sécurité de la plateforme et prévention de la fraude ;</li>
          <li>Communication avec le client relative à son compte et à ses opérations.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Partenaires et sous-traitants">
        <p>
          Pour exécuter le service, {ENTITY_IDENTITY.legalName} fait appel à des prestataires
          spécialisés, qui traitent certaines données pour son compte et sous ses instructions,
          ou qui interviennent en tant que responsables distincts pour la garde des avoirs :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground/80">Banques dépositaires tierces</span> :
            conservation des liquidités et titres des clients (cf. mentions légales, section 3) ;
          </li>
          <li>
            <span className="font-medium text-foreground/80">
              Garde des actifs numériques ({ENTITY_IDENTITY.digitalAssetCustodians.join(" et ")})
            </span>{" "}
            : conservation sécurisée des stablecoins et de l&apos;or tokenisé déposés en
            garantie ;
          </li>
          <li>
            <span className="font-medium text-foreground/80">Émission de cartes bancaires</span> :
            traitement des autorisations de paiement en temps réel ;
          </li>
          <li>
            <span className="font-medium text-foreground/80">Vérification d&apos;identité (KYC)</span>{" "}
            : contrôle de l&apos;identité et du statut de conformité du client ;
          </li>
          <li>
            <span className="font-medium text-foreground/80">Données de marché blockchain</span> :
            détection des dépôts on-chain et cours des actifs en temps réel.
          </li>
        </ul>
        <p>
          Le nom, le rôle exact et le pays d&apos;implantation de chaque prestataire retenu
          en production sont communiqués au client sur demande auprès du service indiqué en
          section 1.
        </p>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <p>
          Les données relatives aux clients et à leurs opérations sont conservées pendant la
          durée de la relation de gestion, puis pendant la durée requise par les obligations
          légales de conservation applicables (documents comptables et pièces justificatives
          des transactions notamment).
        </p>
      </LegalSection>

      <LegalSection title="6. Transferts internationaux">
        <p>
          Certains prestataires mentionnés en section 4 peuvent traiter des données en dehors
          de la Suisse. Dans ce cas, {ENTITY_IDENTITY.legalName} met en place les garanties
          appropriées requises par la législation suisse sur la protection des données
          (clauses contractuelles, décision d&apos;adéquation ou mécanisme équivalent).
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <p>
          Sous réserve des restrictions prévues par la loi (notamment les obligations légales
          de conservation applicables), le client dispose d&apos;un droit d&apos;accès, de
          rectification, d&apos;effacement et d&apos;opposition sur ses données personnelles.
          Ces droits peuvent être exercés en écrivant à l&apos;adresse indiquée en section 1.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies et traceurs">
        <p>
          La plateforme utilise uniquement les cookies strictement nécessaires à son
          fonctionnement (authentification de session, préférences d&apos;affichage). Aucun
          cookie publicitaire ou de mesure d&apos;audience tiers n&apos;est déposé sans
          consentement préalable du client. Le détail figure dans la{" "}
          <a href="/cookies" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            politique de cookies
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Cas particulier des prospects (demande d'ouverture de compte)">
        <p>
          Les personnes qui déposent une demande d&apos;ouverture de compte sans être encore
          clientes (via la page Demander un compte) transmettent des données d&apos;identification
          et de contact ainsi que des informations sur leur projet d&apos;investissement. Ces
          données sont traitées dans le seul but d&apos;examiner la demande. Si la demande
          n&apos;aboutit pas à une relation de gestion de fortune, elles sont conservées pendant
          une durée limitée, nécessaire au suivi du dossier, puis supprimées ; en cas
          d&apos;acceptation, elles sont intégrées au dossier client et suivent les règles de
          conservation décrites en section 5.
        </p>
      </LegalSection>

      <LegalSection title="10. Sécurité">
        <p>
          {ENTITY_IDENTITY.legalName} met en œuvre des mesures techniques et
          organisationnelles appropriées (chiffrement, contrôle d&apos;accès, verrous
          distribués sur les opérations financières) pour protéger les données personnelles
          contre l&apos;accès non autorisé, la perte ou l&apos;altération.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <dl className="space-y-2">
          <LegalField label="Délégué à la protection des données" value={ENTITY_IDENTITY.dataProtectionContact} />
          <LegalField label="E-mail général" value={ENTITY_IDENTITY.generalContactEmail} />
        </dl>
      </LegalSection>
    </LegalPageShell>
  );
}
