import { ArrowRight, Compass, Gem, Handshake, Landmark, Scale, ShieldCheck, Sparkles, Vault } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "AboutUs.meta" });
  return buildPageMetadata({ locale, path: "/a-propos", title: t("title"), description: t("description") });
}

// Page "À propos de nous" (retour client explicite : présenter la société dans son
// ensemble) — toute affirmation factuelle (raison sociale, siège, forme juridique,
// dirigeant, superviseur, dépositaires) vient de ENTITY_IDENTITY (source unique déjà
// utilisée par /contact, /mentions-legales, /reglementation), jamais réinventée ici.
// Volontairement AUCUNE section "notre histoire"/"nos chiffres" : ni date de fondation
// ni métrique d'activité (encours, nombre de clients...) n'existe dans ENTITY_IDENTITY —
// en inventer une contredirait le principe du projet ("jamais une donnée fabriquée",
// déjà appliqué à chaque rendement/taux affiché ailleurs sur le site). Les valeurs
// (section "values" ci-dessous) restent volontairement qualitatives, pas des chiffres.
export default async function AboutUsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AboutUs");

  const VALUES = [
    { icon: Sparkles, title: t("values.transparency.title"), body: t("values.transparency.body") },
    { icon: ShieldCheck, title: t("values.security.title"), body: t("values.security.body") },
    { icon: Gem, title: t("values.precision.title"), body: t("values.precision.body") },
    { icon: Handshake, title: t("values.innovation.title"), body: t("values.innovation.body") },
  ] as const;

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        {/* Mission — pourquoi la société existe, formulé à partir du mécanisme produit
            réel (crédit gagé + investissement direct, cf. CLAUDE.md §2), jamais un
            slogan générique de "banque en ligne". */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <Compass className="size-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{t("mission.title")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{t("mission.body")}</p>
        </div>

        {/* Gouvernance / Régulation / Garde des avoirs — trois faits vérifiables, chacun
            renvoyant vers la page dédiée qui en détaille déjà le contenu complet plutôt
            que de le dupliquer ici. */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <Landmark className="size-5 text-primary" />
            <h3 className="mt-2.5 text-sm font-semibold text-foreground">{t("governance.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t("governance.body", {
                legalName: ENTITY_IDENTITY.legalName,
                canton: ENTITY_IDENTITY.canton,
                founder: ENTITY_IDENTITY.publicationDirector,
              })}
            </p>
          </div>
          <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <Scale className="size-5 text-primary" />
            <h3 className="mt-2.5 text-sm font-semibold text-foreground">{t("regulation.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t("regulation.body", { supervisionBodyName: ENTITY_IDENTITY.supervisionBodyName })}
            </p>
            <Link
              href="/reglementation"
              className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {t("regulation.learnMore")}
              <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <Vault className="size-5 text-primary" />
            <h3 className="mt-2.5 text-sm font-semibold text-foreground">{t("custody.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t("custody.body", { custodian: ENTITY_IDENTITY.digitalAssetCustodians[0] })}
            </p>
            <Link
              href="/gestion-des-risques"
              className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {t("custody.learnMore")}
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Valeurs — qualitatives par construction (cf. commentaire de tête de fichier),
            jamais une métrique chiffrée inventée. */}
        <h2 className="mt-14 text-xl font-semibold text-foreground">{t("values.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("values.intro")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div key={value.title} className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-white">
                <value.icon className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{value.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Identité légale complète — même source que le footer/mentions légales,
            affichée ici en un seul bloc de référence plutôt qu'éparpillée. */}
        <div className="mt-10 rounded-2xl border border-border/80 bg-muted p-5">
          <h3 className="text-sm font-semibold text-foreground">{t("identity.title")}</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2 sm:justify-start">
              <dt className="text-muted-foreground">{t("identity.legalName")}</dt>
              <dd className="font-medium text-foreground">{ENTITY_IDENTITY.legalName}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start">
              <dt className="text-muted-foreground">{t("identity.legalForm")}</dt>
              <dd className="font-medium text-foreground">{ENTITY_IDENTITY.legalForm}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start">
              <dt className="text-muted-foreground">{t("identity.registeredOffice")}</dt>
              <dd className="font-medium text-foreground">{ENTITY_IDENTITY.registeredOffice}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start">
              <dt className="text-muted-foreground">{t("identity.commercialRegister")}</dt>
              <dd className="font-medium text-foreground">{ENTITY_IDENTITY.commercialRegisterNumber}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact"
            className="group flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            {t("ctaContact")}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/inscription"
            className="rounded-lg border border-border/80 bg-card px-5 py-3 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:border-border hover:text-foreground"
          >
            {t("ctaNoAccount")}
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
