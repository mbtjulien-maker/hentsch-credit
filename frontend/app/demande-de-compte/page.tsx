import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { AccountRequestForm } from "@/components/marketing/account-request-form";

export const metadata = {
  title: "Demander l'ouverture d'un compte · Hentsch Credit",
};

// Page dédiée à la demande d'ouverture de compte — contenu déplacé depuis la page
// d'accueil (cf. app/page.tsx, désormais une simple carte de renvoi).
export default function DemandeDeComptePage() {
  return (
    <MarketingPageShell
      eyebrow="Accès sur invitation"
      title="Demander l'ouverture d'un compte"
      description="Plateforme réservée à une clientèle restreinte. Laissez-nous vos coordonnées : notre équipe étudie chaque dossier avant d'accorder l'accès."
    >
      <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
        <AccountRequestForm />
        <p className="mt-6 text-center text-sm text-muted-foreground/80">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            Se connecter
          </Link>
        </p>
      </div>
    </MarketingPageShell>
  );
}
