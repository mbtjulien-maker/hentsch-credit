import { LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export const metadata = {
  title: "Politique de cookies · Hentsch Credit",
};

// Politique de cookies dédiée, en complément de la section 8 (courte) de la page
// Confidentialité. Honnête sur l'absence de bandeau de préférences : puisque la plateforme
// ne dépose qu'un seul cookie strictement nécessaire, il n'y a rien à faire consentir ni à
// gérer via un centre de préférences, ce qui évite de construire un faux bouton "gérer mes
// cookies" qui n'aurait rien à piloter.
export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Politique de cookies"
      intro="Cette page décrit les cookies réellement déposés par la plateforme Hentsch Credit et pourquoi aucun centre de préférences n'est proposé."
    >
      <LegalSection title="1. Ce que la plateforme dépose">
        <p>
          Un seul cookie est utilisé, de session, strictement nécessaire au fonctionnement du
          service : il maintient votre connexion authentifiée pendant votre navigation sur
          l&apos;espace client. Il est supprimé à la fermeture de votre session ou de votre
          navigateur.
        </p>
      </LegalSection>

      <LegalSection title="2. Ce que la plateforme ne dépose pas">
        <ul className="list-disc space-y-1 pl-5">
          <li>Aucun cookie publicitaire ou de ciblage ;</li>
          <li>Aucun cookie de mesure d&apos;audience tiers (analytics, statistiques) ;</li>
          <li>Aucun traceur de réseau social ;</li>
          <li>Aucun cookie de suivi entre sites (cross-site tracking).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Pourquoi il n'y a pas de « gérer mes cookies »">
        <p>
          Un centre de préférences a du sens lorsqu&apos;un site dépose des cookies non
          essentiels (publicité, mesure d&apos;audience) qui nécessitent votre consentement
          préalable et un moyen de le retirer. La plateforme n&apos;en dépose aucun : il
          n&apos;existe donc aucune préférence à activer ou désactiver au-delà du réglage de
          votre propre navigateur. Si cela change un jour, cette page sera mise à jour et un
          véritable centre de préférences sera proposé, plutôt qu&apos;un bouton sans effet réel.
        </p>
      </LegalSection>

      <LegalSection title="4. Contrôle depuis votre navigateur">
        <p>
          Vous pouvez à tout moment bloquer ou supprimer le cookie de session depuis les réglages
          de votre navigateur. Le blocage de ce cookie particulier vous déconnectera de
          l&apos;espace client : c&apos;est un cookie fonctionnel, pas un traceur, et il n&apos;a
          pas d&apos;autre rôle.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <p>
          Pour toute question relative à cette politique, contactez le délégué à la protection
          des données à l&apos;adresse {ENTITY_IDENTITY.dataProtectionContact}. Le traitement des
          autres données personnelles est décrit dans la{" "}
          <a href="/confidentialite" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            politique de confidentialité
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
