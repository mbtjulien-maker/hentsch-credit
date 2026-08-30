import { LegalField, LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export const metadata = {
  title: "Réglementation · Hentsch Credit",
};

// Page dédiée au cadre réglementaire — complète les mentions légales (qui restent la
// référence pour l'identité de l'éditeur) avec le détail du cadre légal suisse applicable
// à un gestionnaire de fortune indépendant (GFI), à la garde d'actifs numériques et à la
// lutte contre le blanchiment. Contenu à valider par la conformité avant publication,
// notamment la classification de clientèle (section 4) et l'organe de médiation (section 6),
// laissés en placeholder tant que l'information officielle n'a pas été communiquée.
export default function ReglementationPage() {
  return (
    <LegalPageShell
      title="Cadre réglementaire"
      intro="Cette page détaille le cadre légal et réglementaire suisse applicable à Hentsch Credit, en complément des mentions légales."
    >
      <LegalSection title="1. Cadre légal applicable">
        <p>L&apos;activité de {ENTITY_IDENTITY.legalName} est notamment régie par :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            la loi fédérale sur les établissements financiers (LEFin) et son ordonnance
            (OEFin), applicables aux gestionnaires de fortune indépendants ;
          </li>
          <li>
            la loi fédérale sur les services financiers (LSFin) et son ordonnance (OSFin),
            relatives à la fourniture de services financiers et à la classification de la
            clientèle ;
          </li>
          <li>
            la loi fédérale sur le blanchiment d&apos;argent (LBA), relative aux obligations
            de diligence et de vigilance ;
          </li>
          <li>
            la loi fédérale sur la protection des données (nLPD) et, le cas échéant, le
            règlement général sur la protection des données (RGPD).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Statut de l'exploitant">
        <p>
          {ENTITY_IDENTITY.legalName} est un{" "}
          <strong className="font-semibold text-foreground">
            gestionnaire de fortune indépendant (GFI)
          </strong>{" "}
          au sens de la LEFin : elle n&apos;est titulaire d&apos;aucune autorisation bancaire
          et n&apos;accepte aucun dépôt de fonds du public en son nom propre.
        </p>
        <dl className="space-y-2">
          <LegalField label="Organisme de surveillance (OS)" value={ENTITY_IDENTITY.supervisionBodyName} />
          <LegalField label="Autorité de surveillance suprême" value={ENTITY_IDENTITY.supervisoryAuthority} />
          <LegalField label="Organisme d'autorégulation LBA" value={ENTITY_IDENTITY.amlBodyName} />
        </dl>
        <p>
          L&apos;OS agrée et surveille l&apos;activité de gestion de fortune, contrôle le
          respect des obligations légales (dont la LBA) et peut prononcer des mesures en cas
          de manquement. Le détail de l&apos;identité de l&apos;éditeur figure dans les{" "}
          <a href="/mentions-legales" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            mentions légales
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Protection des avoirs des clients">
        <p>{ENTITY_IDENTITY.depositaryNote}</p>
        <p>{ENTITY_IDENTITY.digitalAssetCustodyNote}</p>
        <p>{ENTITY_IDENTITY.depositProtectionNote}</p>
      </LegalSection>

      <LegalSection title="4. Classification de la clientèle (LSFin)">
        <p>
          La LSFin distingue trois catégories de clients (privés, professionnels et
          institutionnels), auxquelles correspondent des niveaux différents
          d&apos;information et de protection. La clientèle de{" "}
          {ENTITY_IDENTITY.tradingName} est classée en{" "}
          <strong className="font-semibold text-foreground">{ENTITY_IDENTITY.clientClassification}</strong>{" "}
          au sens de la LSFin, la catégorie offrant le niveau de protection et
          d&apos;information le plus élevé. L&apos;accès reste néanmoins réservé à une liste
          de clients restreinte, sur invitation, dans le cadre d&apos;une relation de gestion
          de fortune existante avec {ENTITY_IDENTITY.legalName}.
        </p>
      </LegalSection>

      <LegalSection title="5. Lutte contre le blanchiment d'argent (LBA)">
        <p>
          Conformément à la LBA, l&apos;accès à la plateforme, la génération d&apos;une
          adresse de dépôt et tout octroi de crédit sont subordonnés à la vérification
          préalable de l&apos;identité du client et de l&apos;origine économique des valeurs
          patrimoniales concernées. {ENTITY_IDENTITY.legalName} applique des mesures de
          vigilance accrue en présence d&apos;indices de blanchiment d&apos;argent ou de
          financement du terrorisme, et respecte les obligations de communication prévues par
          la loi le cas échéant.
        </p>
      </LegalSection>

      <LegalSection title="6. Réclamations et médiation">
        <p>
          Toute réclamation relative au service peut être adressée au contact indiqué
          ci-dessous. À défaut de résolution amiable, le client peut, dans les conditions
          prévues par la LSFin, saisir l&apos;organe de médiation dont dépend{" "}
          {ENTITY_IDENTITY.legalName} :{" "}
          <strong className="font-semibold text-foreground">{ENTITY_IDENTITY.mediationBody}</strong>.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact conformité">
        <dl className="space-y-2">
          <LegalField label="E-mail" value={ENTITY_IDENTITY.generalContactEmail} />
          <LegalField label="Téléphone" value={ENTITY_IDENTITY.generalContactPhone} />
        </dl>
      </LegalSection>
    </LegalPageShell>
  );
}
