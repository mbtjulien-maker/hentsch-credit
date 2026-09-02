import { useId } from "react";
import { FileText, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Résumé des conditions applicables, à cocher explicitement avant toute soumission d'une
// demande de crédit ou tout placement d'investissement (demande client : "un formulaire
// [...] pour accepter les conditions [...] le contrat à valider avant soumission ou
// placement de l'investissement"). Le texte résumé ici reprend les VRAIES clauses déjà
// rédigées dans les CGU (cf. app/[locale]/conditions-generales, section §4 crédit gagé /
// §16 investissement direct) — jamais un texte inventé pour l'occasion : mêmes chiffres
// que CLAUDE.md §2A/§2D/§2H (ratio 350%, taux 13,5%/12%, frais 2%, seuils de liquidation
// 30%/50%, risque de perte réelle sur l'investissement). Le lien "Lire les CGU complètes"
// pointe vers l'ancre de la section correspondante (cf. id sur LegalSection) plutôt que
// le haut de la page — la clause pertinente doit être immédiatement visible.
export function TermsAcceptance({
  variant,
  accepted,
  onAcceptedChange,
  disabled,
}: {
  variant: "credit" | "investment";
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Dashboard.termsAcceptance");
  const checkboxId = useId();
  const anchor = variant === "credit" ? "#s4" : "#s16";
  const Icon = variant === "credit" ? ScrollText : FileText;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border/70 bg-muted/30 p-3.5">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="text-xs leading-relaxed text-muted-foreground">{t(`${variant}.summary`)}</p>
          <Link
            href={{ pathname: "/conditions-generales", hash: anchor.slice(1) }}
            target="_blank"
            className="w-fit text-xs font-medium text-primary underline underline-offset-2"
          >
            {t("readFull")}
          </Link>
        </div>
      </div>
      <label htmlFor={checkboxId} className="flex items-start gap-2 text-xs font-medium text-foreground">
        <input
          id={checkboxId}
          type="checkbox"
          checked={accepted}
          disabled={disabled}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 size-3.5 shrink-0 accent-primary"
        />
        {t(`${variant}.checkboxLabel`)}
      </label>
    </div>
  );
}
