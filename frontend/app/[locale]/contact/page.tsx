import { Building2, Clock, Mail, MapPin, Phone, ShieldQuestion } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact.meta" });
  return buildPageMetadata({ locale, path: "/contact", title: t("title"), description: t("description") });
}

// Page de contact — pas de formulaire web (la plateforme n'accepte aucune inscription
// publique, cf. mentions légales section 4) : uniquement les coordonnées réelles, issues
// de lib/entity-identity.ts, et un renvoi clair vers /demande-de-compte pour les
// prospects qui n'ont pas encore de relation avec la société.
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  const CHANNELS = [
    {
      icon: Mail,
      label: t("channels.email"),
      value: ENTITY_IDENTITY.generalContactEmail,
      href: `mailto:${ENTITY_IDENTITY.generalContactEmail}`,
    },
    {
      icon: Phone,
      label: t("channels.phone"),
      value: ENTITY_IDENTITY.generalContactPhone,
      href: `tel:${ENTITY_IDENTITY.generalContactPhone.replace(/\s+/g, "")}`,
    },
    {
      icon: MapPin,
      label: t("channels.postalAddress"),
      value: ENTITY_IDENTITY.postalAddress,
      href: undefined,
    },
    {
      icon: Building2,
      label: t("channels.registeredOffice"),
      value: ENTITY_IDENTITY.registeredOffice,
      href: undefined,
    },
  ] as const;

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
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
          <p className="text-sm leading-relaxed text-muted-foreground">{t("hours")}</p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <ShieldQuestion className="mt-0.5 size-4.5 shrink-0 text-muted-foreground/80" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t.rich("noAccount", {
              link: (chunks) => (
                <Link href="/demande-de-compte" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/80">
          {t.rich("complaint", {
            link: (chunks) => (
              <Link href="/reglementation" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </MarketingPageShell>
  );
}
