import { ArrowRight, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Carte de renvoi vers une page dédiée — remplace, sur la page d'accueil, le contenu
// complet d'une section qui vit désormais sur sa propre route (cf. app/[locale]/page.tsx).
// Garde l'accueil lisible (aperçu + lien) sans dupliquer le contenu détaillé de chaque page.
export async function SectionTeaserCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}) {
  const t = await getTranslations("Common");

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-300/40 hover:shadow-xl"
    >
      <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-white">
        <Icon className="size-4.5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <span className="mt-3 flex items-center gap-1 text-xs font-medium text-foreground/80 group-hover:text-foreground">
        {t("learnMore")}
        <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
