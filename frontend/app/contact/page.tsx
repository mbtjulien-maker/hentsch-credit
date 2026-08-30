import { Building2, Clock, Mail, MapPin, Phone, ShieldQuestion } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export const metadata = {
  title: "Contact · Hentsch Credit",
};

// Page de contact — pas de formulaire web (la plateforme n'accepte aucune inscription
// publique, cf. mentions légales section 4) : uniquement les coordonnées réelles, issues
// de lib/entity-identity.ts, et un renvoi clair vers /demande-de-compte pour les
// prospects qui n'ont pas encore de relation avec la société.
const CHANNELS = [
  {
    icon: Mail,
    label: "E-mail",
    value: ENTITY_IDENTITY.generalContactEmail,
    href: `mailto:${ENTITY_IDENTITY.generalContactEmail}`,
  },
  {
    icon: Phone,
    label: "Téléphone",
    value: ENTITY_IDENTITY.generalContactPhone,
    href: `tel:${ENTITY_IDENTITY.generalContactPhone.replace(/\s+/g, "")}`,
  },
  {
    icon: MapPin,
    label: "Adresse postale",
    value: ENTITY_IDENTITY.postalAddress,
    href: undefined,
  },
  {
    icon: Building2,
    label: "Siège social",
    value: ENTITY_IDENTITY.registeredOffice,
    href: undefined,
  },
] as const;

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Nous contacter"
      title="Contactez-nous"
      description="Les coordonnées réelles de H. Hentsch Asset Management SA, pour toute question relative à votre compte ou à la plateforme."
    >
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map((channel) => (
            <div key={channel.label} className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-white">
                <channel.icon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{channel.label}</h3>
                {channel.href ? (
                  <a href={channel.href} className="mt-1 block text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    {channel.value}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{channel.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/80 bg-muted p-5">
          <Clock className="mt-0.5 size-4.5 shrink-0 text-muted-foreground/80" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Les demandes sont traitées durant les jours ouvrés. Pour toute question relative à une
            opération en cours (dépôt, demande de crédit, carte), merci de préciser votre nom et,
            si possible, la référence de l&apos;opération concernée.
          </p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <ShieldQuestion className="mt-0.5 size-4.5 shrink-0 text-muted-foreground/80" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Vous n&apos;avez pas encore de compte ? La plateforme est réservée à une clientèle
            restreinte, sur invitation. Vous pouvez néanmoins déposer une{" "}
            <a href="/demande-de-compte" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
              demande d&apos;ouverture de compte
            </a>
            , qui sera examinée par nos équipes.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/80">
          Pour une réclamation formelle et, à défaut de résolution amiable, les voies de médiation
          disponibles, voir la page{" "}
          <a href="/reglementation" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
            Réglementation
          </a>
          , section 6.
        </p>
      </div>
    </MarketingPageShell>
  );
}
