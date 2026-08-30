import { LegalField, LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export const metadata = {
  title: "Mentions légales · Hentsch Credit",
  description:
    "Informations légales relatives à l'éditeur et à l'exploitant de la plateforme Hentsch Credit.",
};

// Page de mentions légales (impressum) — identité de l'éditeur, statut réglementaire réel
// (gestionnaire de fortune indépendant, PAS une banque) et supervision, hébergement,
// propriété intellectuelle. Tous les champs viennent de lib/entity-identity.ts.
export default function MentionsLegalesPage() {
  return (
    <LegalPageShell
      title="Mentions légales"
      intro="Informations légales relatives à l'éditeur et à l'exploitant du site et de la plateforme Hentsch Credit, conformément à la législation suisse applicable. Plateforme réservée à une clientèle restreinte, sur invitation : elle n'est pas ouverte au public et ne constitue pas une offre publique."
    >
      <LegalSection title="1. Éditeur du site">
        <dl className="space-y-2">
          <LegalField label="Raison sociale" value={ENTITY_IDENTITY.legalName} />
          <LegalField label="Forme juridique" value={ENTITY_IDENTITY.legalForm} />
          <LegalField label="Nom commercial de la plateforme" value={ENTITY_IDENTITY.tradingName} />
          <LegalField label="Siège social" value={ENTITY_IDENTITY.registeredOffice} />
          <LegalField label="Adresse postale" value={ENTITY_IDENTITY.postalAddress} />
          <LegalField label="Canton" value={ENTITY_IDENTITY.canton} />
          <LegalField label="Pays" value={ENTITY_IDENTITY.country} />
          <LegalField label="N° IDE / registre du commerce" value={ENTITY_IDENTITY.commercialRegisterNumber} />
          <LegalField label="N° TVA" value={ENTITY_IDENTITY.vatNumber} />
          <LegalField label="Responsable de la publication" value={ENTITY_IDENTITY.publicationDirector} />
        </dl>
      </LegalSection>

      <LegalSection title="2. Statut réglementaire et supervision">
        <p>
          {ENTITY_IDENTITY.legalName} est un{" "}
          <strong className="font-semibold text-foreground">
            gestionnaire de fortune indépendant (GFI)
          </strong>{" "}
          au sens de la loi fédérale sur les établissements financiers (LEFin),{" "}
          <strong className="font-semibold text-foreground">et non un établissement bancaire</strong>
          . À ce titre, elle n&apos;est pas titulaire d&apos;une autorisation bancaire délivrée
          directement par la FINMA, mais est soumise à la surveillance d&apos;un organisme de
          surveillance (OS) agréé par l&apos;{ENTITY_IDENTITY.supervisoryAuthority}.
        </p>
        <dl className="space-y-2">
          <LegalField label="Organisme de surveillance (OS)" value={ENTITY_IDENTITY.supervisionBodyName} />
          <LegalField label="Organisme d'autorégulation LBA" value={ENTITY_IDENTITY.amlBodyName} />
        </dl>
        <p>{ENTITY_IDENTITY.supervisionBodyDescription}.</p>
        <p>
          Le détail du cadre légal applicable (LEFin, LSFin, LBA) est présenté sur la page{" "}
          <a href="/reglementation" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            Réglementation
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Garde des avoirs">
        <p>{ENTITY_IDENTITY.depositaryNote}</p>
        <p>{ENTITY_IDENTITY.digitalAssetCustodyNote}</p>
        <p>{ENTITY_IDENTITY.depositProtectionNote}</p>
      </LegalSection>

      <LegalSection title="4. Accès restreint">
        <p>
          La plateforme {ENTITY_IDENTITY.tradingName} n&apos;est pas destinée au grand public.
          Son accès est réservé à une liste de clients déterminée, sur invitation de{" "}
          {ENTITY_IDENTITY.legalName}, à l&apos;issue d&apos;une relation de gestion de fortune
          existante et d&apos;une vérification d&apos;identité préalable. Aucun élément du présent
          site ne constitue une offre, une sollicitation ou une publicité destinée au public.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <dl className="space-y-2">
          <LegalField label="E-mail" value={ENTITY_IDENTITY.generalContactEmail} />
          <LegalField label="Téléphone" value={ENTITY_IDENTITY.generalContactPhone} />
        </dl>
      </LegalSection>

      <LegalSection title="6. Hébergement">
        <p>Le site et la plateforme sont hébergés par :</p>
        <p className="font-medium text-foreground/80">{ENTITY_IDENTITY.hostingProvider}</p>
      </LegalSection>

      <LegalSection title="7. Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments composant le site et la plateforme (textes, logos,
          graphismes, icônes, structure, code source) est la propriété de{" "}
          {ENTITY_IDENTITY.legalName} ou de ses concédants, et protégé à ce titre par le droit
          suisse et les conventions internationales relatives à la propriété intellectuelle.
          Toute reproduction, représentation, modification ou exploitation, totale ou
          partielle, sans autorisation écrite préalable, est interdite.
        </p>
      </LegalSection>

      <LegalSection title="8. Partenaires techniques">
        <p>
          La plateforme s&apos;appuie sur des prestataires tiers pour certaines fonctions
          techniques (garde des actifs numériques et gestion des clés, émission de cartes
          bancaires, vérification d&apos;identité, données de marché). La liste de ces
          prestataires et leur rôle sont détaillés dans la{" "}
          <a href="/confidentialite" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            politique de confidentialité
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
