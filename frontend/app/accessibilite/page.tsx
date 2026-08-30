import { LegalField, LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export const metadata = {
  title: "Accessibilité numérique · Hentsch Credit",
  description:
    "État réel d'avancement de l'accessibilité numérique de la plateforme Hentsch Credit, sans revendiquer un niveau de conformité non vérifié.",
};

// Déclaration d'accessibilité honnête : le site n'a fait l'objet d'aucun audit RGAA/WCAG
// formel à ce stade, donc "conformité partielle, non auditée" plutôt qu'une conformité
// revendiquée sans preuve. Décrit ce qui est réellement en place (structure sémantique,
// contraste, navigation clavier de base) sans prétendre à un niveau de conformité précis.
export default function AccessibilitePage() {
  return (
    <LegalPageShell
      title="Déclaration d'accessibilité"
      intro="H. Hentsch Asset Management SA s'efforce de rendre la plateforme Hentsch Credit utilisable par le plus grand nombre. Cette déclaration décrit l'état réel d'avancement, sans revendiquer un niveau de conformité qui n'a pas été vérifié par un audit formel."
    >
      <LegalSection title="1. État de conformité">
        <p>
          Le site n&apos;a pas encore fait l&apos;objet d&apos;un audit d&apos;accessibilité
          formel (de type RGAA ou WCAG). Il ne peut donc pas être déclaré conforme à un niveau
          précis. Des efforts sont néanmoins déjà appliqués dans la conception : structure
          sémantique des pages, hiérarchie de titres, contrastes de couleur pensés pour la
          lisibilité, et navigation possible au clavier sur les principaux parcours (connexion,
          demande de compte, consultation du compte).
        </p>
      </LegalSection>

      <LegalSection title="2. Limites connues">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Certains graphiques et tableaux de données de marché n&apos;offrent pas encore
            d&apos;équivalent textuel complet pour les lecteurs d&apos;écran ;
          </li>
          <li>
            Aucun audit contradictoire n&apos;a été mené par un organisme tiers spécialisé en
            accessibilité numérique ;
          </li>
          <li>
            Certains contenus tiers (par exemple les webhooks et interfaces de prestataires
            externes intégrées à la plateforme) ne sont pas sous le contrôle direct de{" "}
            {ENTITY_IDENTITY.legalName}.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Signaler un problème">
        <p>
          Si vous rencontrez une difficulté d&apos;accès à un contenu ou une fonctionnalité de la
          plateforme, merci de le signaler au contact ci-dessous, en précisant la page concernée
          et, si possible, le logiciel d&apos;assistance utilisé.
        </p>
        <dl className="space-y-2">
          <LegalField label="E-mail" value={ENTITY_IDENTITY.generalContactEmail} />
          <LegalField label="Téléphone" value={ENTITY_IDENTITY.generalContactPhone} />
        </dl>
      </LegalSection>

      <LegalSection title="4. Voies de recours">
        <p>
          À défaut de réponse satisfaisante dans un délai raisonnable, vous pouvez adresser une
          réclamation dans les conditions décrites sur la page{" "}
          <a href="/reglementation" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            Réglementation
          </a>
          , section 6.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
