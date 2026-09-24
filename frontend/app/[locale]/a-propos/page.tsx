import Image from "next/image";
import {
  ArrowRight,
  Briefcase,
  ExternalLink,
  Handshake,
  Landmark,
  Layers,
  Scale,
  ShieldCheck,
  UserRound,
  Vault,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { COMPANY_PROFILE } from "@/lib/company-profile";
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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</div>;
}

function IconChip({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon className="size-[18px]" />
    </span>
  );
}

function SectionTitle({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      {intro && <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground sm:text-base">{intro}</p>}
    </div>
  );
}

// Page "À propos de nous" — présente la société de façon complète ET vérifiable (retour
// client : "structure les données importantes collectées sur le site officiel, avec le logo,
// pour plus de transparence"). Les faits (dates, noms, chiffres, adresses) viennent de
// lib/company-profile.ts, relevés sur https://hhentsch.com le 24 septembre 2026 ; les
// numéros d'immatriculation/TVA et le prestataire de garde crypto viennent de
// lib/entity-identity.ts (documentation interne, non publiés sur le site public — dit
// explicitement dans le bloc "Sources et transparence" en bas de page). Toujours AUCUNE
// donnée inventée : encours, nombre de clients et autres chiffres absents du site
// officiel n'apparaissent pas ici.
export default async function AboutUsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AboutUs");

  const dateLong = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const formatDate = (iso: string) => (/^\d{4}$/.test(iso) ? iso : dateLong.format(new Date(`${iso}T00:00:00Z`)));
  const languageNames = new Intl.DisplayNames(locale, { type: "language" });
  const languages = COMPANY_PROFILE.serviceLanguages.map((code) => (languageNames.of(code) ?? code)).join(", ");
  const P = COMPANY_PROFILE;

  const FACTS = [
    { value: String(P.foundedYear), label: t("facts.founded") },
    { value: formatDate(P.finma.authorisationDate), label: t("facts.finma") },
    { value: String(P.teamSize), label: t("facts.team") },
    { value: `${P.ownership.privateSwissSharePct} %`, label: t("facts.ownership", { holding: P.ownership.holding }) },
  ];

  const SERVICES = [
    { key: "discretionary", icon: Briefcase },
    { key: "privateEquity", icon: Landmark },
    { key: "consolidation", icon: Layers },
    { key: "advice", icon: Handshake },
  ] as const;

  const PILLARS = ["independence", "personalization", "professionalism"] as const;

  const identityRows: [string, React.ReactNode][] = [
    [t("identity.legalName"), ENTITY_IDENTITY.legalName],
    [t("identity.legalForm"), ENTITY_IDENTITY.legalForm],
    [t("identity.registeredOffice"), ENTITY_IDENTITY.registeredOffice],
    [t("identity.postalAddress"), ENTITY_IDENTITY.postalAddress],
    [t("identity.canton"), `${ENTITY_IDENTITY.canton}, ${ENTITY_IDENTITY.country}`],
    [t("identity.commercialRegister"), ENTITY_IDENTITY.commercialRegisterNumber],
    [t("identity.vat"), ENTITY_IDENTITY.vatNumber],
    [t("identity.founded"), String(P.foundedYear)],
    [t("identity.phone"), <a key="tel" className="hover:underline" href={`tel:${P.phone.replace(/\s+/g, "")}`}>{P.phone}</a>],
    [t("identity.fax"), P.fax],
    [t("identity.email"), <a key="mail" className="hover:underline" href={`mailto:${P.email}`}>{P.email}</a>],
    [t("identity.website"), <a key="web" className="inline-flex items-center gap-1 hover:underline" href={P.officialSite} target="_blank" rel="noopener noreferrer">{P.officialSite.replace("https://", "")}<ExternalLink className="size-3" /></a>],
    [t("identity.languages"), languages],
  ];

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pb-16 sm:px-6">
        {/* Carte d'identité : logo officiel (fond blanc, donc posé sur un cadre blanc quel
            que soit le thème), slogan et quatre chiffres clés — tous issus du site officiel. */}
        <section>
          <Card className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex items-center justify-center rounded-xl border border-border bg-white p-4">
              <Image
                src={P.logo.src}
                alt={t("logoAlt")}
                width={P.logo.width}
                height={P.logo.height}
                className="h-auto w-[240px] sm:w-[300px]"
                priority
              />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">{ENTITY_IDENTITY.legalName}</h2>
              <p className="mt-2 max-w-xl text-base text-muted-foreground">{t("tagline")}</p>
            </div>
          </Card>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((fact) => (
              <Card key={fact.label}>
                <p className="font-heading text-3xl leading-none font-medium tracking-tight text-foreground">{fact.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{fact.label}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Histoire — cinq jalons publiés par la société, dans l'ordre chronologique. */}
        <section>
          <SectionTitle title={t("timeline.title")} />
          <ol className="relative flex flex-col gap-4 border-l border-border pl-6">
            {P.timeline.map((event) => (
              <li key={event.key} className="relative">
                <span className="absolute top-1.5 -left-[31px] size-2.5 rounded-full bg-primary ring-4 ring-background" />
                <p className="text-sm font-semibold text-primary">{formatDate(event.date)}</p>
                <p className="mt-0.5 text-sm text-foreground sm:text-base">{t(`timeline.${event.key}`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Direction */}
        <section>
          <SectionTitle title={t("management.title")} intro={t("management.intro")} />
          <div className="grid gap-4 sm:grid-cols-3">
            {P.management.map((person) => (
              <Card key={person.id}>
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-5" />
                  </span>
                  <div>
                    <p className="font-heading text-lg leading-tight font-semibold text-foreground">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{t("management.role")}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(`management.${person.id}`)}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Philosophie */}
        <section>
          <SectionTitle title={t("philosophy.title")} intro={t("philosophy.intro")} />
          <div className="grid gap-4 sm:grid-cols-3">
            {PILLARS.map((pillar) => (
              <Card key={pillar}>
                <h3 className="font-heading text-lg font-semibold text-foreground">{t(`philosophy.${pillar}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`philosophy.${pillar}.body`)}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Services de la société */}
        <section>
          <SectionTitle title={t("services.title")} intro={t("services.intro")} />
          <div className="grid gap-4 sm:grid-cols-2">
            {SERVICES.map(({ key, icon }) => (
              <Card key={key} className="flex items-start gap-3">
                <IconChip icon={icon} />
                <div>
                  <h3 className="font-heading text-lg leading-tight font-semibold text-foreground">{t(`services.${key}.title`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`services.${key}.body`)}</p>
                </div>
              </Card>
            ))}
          </div>
          <Card className="mt-4 border-primary/30 bg-primary/5">
            <h3 className="font-heading text-lg font-semibold text-foreground">{t("product.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("product.body", { legalName: ENTITY_IDENTITY.legalName })}
            </p>
          </Card>
        </section>

        {/* Cadre réglementaire et garde des avoirs */}
        <section>
          <SectionTitle title={t("framework.title")} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col">
              <IconChip icon={ShieldCheck} />
              <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">{t("framework.authorisation.title")}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t("framework.authorisation.body", {
                  legalName: ENTITY_IDENTITY.legalName,
                  date: formatDate(P.finma.authorisationDate),
                  body: `${P.supervision.body} (${P.supervision.fullName})`,
                })}
              </p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("framework.authorisation.bodyLabel")}</dt>
                  <dd className="text-foreground">
                    <a className="hover:underline" href={P.supervision.website} target="_blank" rel="noopener noreferrer">{P.supervision.body}</a>, {P.supervision.address}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("framework.authorisation.auditorLabel")}</dt>
                  <dd className="text-foreground">{P.auditors.statutory}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("framework.authorisation.prudentialLabel")}</dt>
                  <dd className="text-foreground">{P.auditors.prudential}</dd>
                </div>
              </dl>
              <Link href="/reglementation" className="mt-auto inline-flex w-fit items-center gap-1 pt-3 text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80">
                {t("framework.regulationLink")}
                <ArrowRight className="size-3" />
              </Link>
            </Card>

            <Card className="flex flex-col">
              <IconChip icon={Scale} />
              <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">{t("framework.mediation.title")}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("framework.mediation.body")}</p>
              <p className="mt-3 text-sm text-foreground">
                <a className="font-medium hover:underline" href={P.mediation.website} target="_blank" rel="noopener noreferrer">{P.mediation.name}</a>
                <br />
                <span className="text-muted-foreground">{P.mediation.address}</span>
              </p>
            </Card>

            <Card className="flex flex-col">
              <IconChip icon={Vault} />
              <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">{t("framework.custody.title")}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t("framework.custody.body", {
                  pms: `${P.portfolioSystemPartner.name} (${P.portfolioSystemPartner.city})`,
                  custodian: ENTITY_IDENTITY.digitalAssetCustodians[0],
                })}
              </p>
              <Link href="/gestion-des-risques" className="mt-auto inline-flex w-fit items-center gap-1 pt-3 text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80">
                {t("framework.custodyLink")}
                <ArrowRight className="size-3" />
              </Link>
            </Card>
          </div>
        </section>

        {/* Fiche d'identité complète */}
        <section>
          <SectionTitle title={t("identity.title")} />
          <Card className="p-0">
            <dl className="divide-y divide-border">
              {identityRows.map(([label, value]) => (
                <div key={label} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[14rem_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>

        {/* Transparence sur l'origine des informations */}
        <section>
          <Card className="bg-muted/50">
            <h3 className="font-heading text-lg font-semibold text-foreground">{t("sources.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t("sources.body", { date: formatDate(P.verifiedOn), site: P.officialSite.replace("https://", "") })}
            </p>
            <a
              href={P.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t("sources.link")}
              <ExternalLink className="size-3.5" />
            </a>
          </Card>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("ctaContact")}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/inscription"
            className="rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("ctaNoAccount")}
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
