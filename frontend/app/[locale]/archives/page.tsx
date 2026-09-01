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
  const t = await getTranslations({ locale, namespace: "Archives.meta" });
  return buildPageMetadata({ locale, path: "/archives", title: t("title"), description: t("description") });
}

const ENTRY_KEYS = [
  "nonRetroactivity",
  "step1",
  "step2",
  "step3",
  "step4",
  "step5",
  "step6",
  "step7",
  "step8",
  "step9",
  "step10",
] as const;

// Archives client-facing de l'évolution des règles métier — adaptation en langage client
// du journal d'audit interne (CLAUDE.md §6 "JOURNAL DES MODIFICATIONS"), qui reste la
// source de vérité technique. Rappelle explicitement le principe de non-rétroactivité déjà
// présent dans les CGU §2 : une position verrouillée garde les conditions de son époque.
export default async function ArchivesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Archives");

  const ENTRIES = ENTRY_KEYS.map((key) => ({
    key,
    period: t(`entries.${key}.period`),
    title: t(`entries.${key}.title`),
    detail: t(`entries.${key}.detail`),
  }));

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <ol className="space-y-4 border-l border-border pl-6">
          {ENTRIES.map((entry) => (
            <li key={entry.key} className="relative">
              <span className="absolute -left-[1.65rem] top-1.5 size-2.5 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-600" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/60">{entry.period}</span>
              <h3 className="mt-0.5 text-sm font-semibold text-foreground">{entry.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{entry.detail}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-border/80 bg-muted p-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            {t.rich("note", {
              link: (chunks) => (
                <Link href="/tarifs" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <p className="mt-2 text-xs text-muted-foreground/80">
            {t("lastUpdated")} {ENTITY_IDENTITY.lastUpdated}
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
