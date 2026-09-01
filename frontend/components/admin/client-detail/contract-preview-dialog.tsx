"use client";

import { useEffect, type ReactNode } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_BTN_SECONDARY, ADMIN_FOCUS_RING } from "@/lib/admin-theme";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";
import { formatPercentPlain } from "@/lib/admin-format";
import { formatUsd } from "@/lib/format";
import { buildAmortizationSchedule } from "@/lib/amortization";
import type { AdminClient } from "@/lib/admin-mock-data";

// Aperçu du contrat — rendu du document tel qu'il serait généré en PDF (cf.
// contract.documentName). Document complet, structuré par articles, adapté aux données
// réelles du dossier (identité, montants, garanties) plutôt qu'un gabarit générique.
// Reprend l'identité légale réelle de l'exploitant (lib/entity-identity.ts) :
// H. Hentsch Asset Management SA est un gestionnaire de fortune indépendant (GFI, LEFin),
// PAS une banque — le contrat désigne donc systématiquement "le Créancier", jamais "la
// banque", et le produit est nommé "crédit lombard". Texte juridique de démonstration
// (références légales réelles — LEFin, LSFin, LBA, CO, LPD — pour la crédibilité du
// document), pas un contrat opposable réel.

const ARTICLES = [
  "Définitions",
  "Objet du contrat",
  "Conditions financières",
  "Déblocage des fonds",
  "Garantie et nantissement",
  "Modalités de remboursement",
  "Remboursement anticipé",
  "Appel de garantie et dépréciation du gage",
  "Défaut de paiement et exigibilité anticipée",
  "Déclarations et garanties de l'Emprunteur",
  "Lutte contre le blanchiment d'argent",
  "Protection des données",
  "Droit de rétractation",
  "Résiliation",
  "Cadre réglementaire et agréments",
  "Droit applicable et for",
  "Dispositions finales",
] as const;

function Article({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-6" style={{ breakInside: "avoid" }}>
      <p className="font-semibold text-slate-900">
        Article {number} : {title}
      </p>
      <div className="mt-1.5 space-y-2">{children}</div>
    </section>
  );
}

export function ContractPreviewDialog({
  client,
  onClose,
  autoPrint = false,
}: {
  client: AdminClient;
  onClose: () => void;
  // Ouvre directement la boîte de dialogue d'impression du navigateur (destination
  // "Enregistrer au format PDF") — utilisé quand l'action déclenchante est un clic sur
  // "Télécharger" plutôt que "Voir", pour éviter un aller-retour inutile.
  autoPrint?: boolean;
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!autoPrint) return;
    const timer = setTimeout(() => window.print(), 150);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  const { contract, creditRequest, personalInfo, addresses, employment, guarantees } = client;
  const domicile = addresses.find((a) => a.label === "Domicile") ?? addresses[0];
  const pledgeDescription =
    guarantees.length > 0
      ? guarantees.map((g) => `${g.type} : ${g.description} (valeur retenue : ${formatUsd(g.retainedValue)})`).join(" ; ")
      : "les actifs numériques (stablecoins et/ou or tokenisé) déposés par l'Emprunteur en garantie, conservés par le prestataire de garde désigné par le Créancier";

  const professionalSituation = employment.isIndependent
    ? `activité indépendante (${employment.activity ?? "profession libérale"}), ancienneté ${employment.seniority}`
    : `salarié(e) auprès de ${employment.employer ?? "son employeur déclaré"} en qualité de ${employment.role ?? "employé(e)"}, ancienneté ${employment.seniority}`;

  const schedule = buildAmortizationSchedule(
    creditRequest.amountRequested,
    creditRequest.estimatedMonthlyPayment,
    contract.nominalRate,
    creditRequest.durationMonths,
  );

  const signatureLine = (label: string, date: string | null) => (
    <div className="flex-1">
      <p className="text-[12px] text-slate-500">{label}</p>
      <div className="mt-8 border-t border-slate-300 pt-1.5">
        <p className="text-[11px] text-slate-500">{date ? `Signé le ${date}` : "En attente de signature"}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm print:hidden" />

      <div className="relative z-10 flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-foreground/[0.09] bg-card shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] print:max-h-none print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:shadow-none">
        <div className="flex shrink-0 items-center justify-between border-b border-foreground/[0.07] px-5 py-3.5 print:hidden">
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">{contract.documentName}</h3>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">Aperçu · {contract.reference} · {schedule.length} échéances</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={ADMIN_BTN_SECONDARY} onClick={() => window.print()}>
              <Download className="size-3.5 text-primary" />
              Télécharger en PDF
            </button>
            <button
              type="button"
              aria-label="Fermer l'aperçu"
              onClick={onClose}
              className={cn("flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground", ADMIN_FOCUS_RING)}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto bg-background p-4 sm:p-6 print:overflow-visible print:bg-transparent print:p-0">
          {/* Page — simule le rendu du PDF généré : fond blanc, typographie de document légal.
              id ciblé par la règle d'impression (cf. globals.css) : seul ce bloc sort sur
              "Télécharger en PDF" (window.print → destination "Enregistrer au format PDF"). */}
          <div id="contract-print-area" className="mx-auto max-w-xl rounded-sm bg-white px-8 py-10 text-slate-800 shadow-lg print:max-w-none print:rounded-none print:px-0 print:py-0 print:shadow-none">
            <div className="text-center">
              <p className="text-[11px] font-medium tracking-[0.08em] text-slate-500 uppercase">{ENTITY_IDENTITY.legalName}</p>
              <h1 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">CONTRAT DE CRÉDIT LOMBARD</h1>
              <p className="mt-1 text-[12px] text-slate-500">
                Référence {contract.reference} · Dossier {creditRequest.id}
              </p>
            </div>

            <div className="mt-8 text-[13px] leading-relaxed">
              <p className="font-medium text-slate-900">Entre les soussignés :</p>

              <p className="mt-3">
                <strong>{ENTITY_IDENTITY.legalName}</strong>, {ENTITY_IDENTITY.legalForm}, dont le siège est sis {ENTITY_IDENTITY.registeredOffice},
                immatriculée au registre du commerce sous le n° {ENTITY_IDENTITY.commercialRegisterNumber}, gestionnaire de fortune indépendant au
                sens de la loi fédérale sur les établissements financiers (LEFin), soumis à la surveillance de {ENTITY_IDENTITY.supervisionBodyName},
                <br />
                ci-après « le Créancier »,
              </p>

              <p className="mt-3">d&apos;une part,</p>

              <p className="mt-3">
                <strong>
                  {client.firstName} {client.lastName}
                </strong>
                , né(e) le {personalInfo.dateOfBirth} à {personalInfo.placeOfBirth}, de nationalité {personalInfo.nationality}
                {personalInfo.maritalStatus ? `, ${personalInfo.maritalStatus.toLowerCase()}` : ""}, domicilié(e){" "}
                {domicile ? `${domicile.street}, ${domicile.postalCode} ${domicile.city}, ${domicile.country}` : "à l'adresse enregistrée au dossier"},
                <br />
                ci-après « l&apos;Emprunteur »,
              </p>

              <p className="mt-3">d&apos;autre part,</p>

              <p className="mt-5">
                le Créancier et l&apos;Emprunteur étant ci-après désignés ensemble « les Parties », il a été préalablement exposé que l&apos;Emprunteur a
                sollicité l&apos;octroi d&apos;un crédit lombard auprès du Créancier dans le cadre du dossier {creditRequest.id}, et qu&apos;à la suite de
                l&apos;examen de sa situation personnelle et financière, le Créancier a donné son accord de principe. Ceci exposé, il a été convenu ce qui
                suit.
              </p>

              <div className="mt-6 rounded-sm border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">Sommaire</p>
                <ol className="mt-2 columns-2 gap-x-6 text-[12px] text-slate-600">
                  {ARTICLES.map((title, i) => (
                    <li key={title} className="mb-0.5">
                      Art. {i + 1} : {title}
                    </li>
                  ))}
                  <li>Annexe 1 : Tableau d&apos;amortissement</li>
                </ol>
              </div>

              <Article number={1} title="Définitions">
                <p>Aux fins du présent contrat, les termes suivants ont la signification ci-après :</p>
                <p>
                  <strong>« Crédit »</strong> désigne le montant mis à disposition de l&apos;Emprunteur en vertu de l&apos;Article 2.{" "}
                  <strong>« Gage »</strong> désigne les actifs constitués en garantie décrits à l&apos;Article 5. <strong>« TAEG »</strong> désigne le
                  taux annuel effectif global, exprimant le coût total du Crédit en pourcentage annuel. <strong>« Valeur retenue »</strong> désigne la
                  valeur du Gage après application d&apos;une décote de sécurité par le Créancier.
                </p>
              </Article>

              <Article number={2} title="Objet du contrat">
                <p>
                  Le Créancier accorde à l&apos;Emprunteur, qui l&apos;accepte, un crédit lombard d&apos;un montant en principal de{" "}
                  <strong>{formatUsd(creditRequest.amountRequested)}</strong>, destiné à : {creditRequest.purpose}. Ce Crédit est intégralement gagé par{" "}
                  {pledgeDescription}, constitué en garantie au profit du Créancier pour toute la durée du présent contrat.
                </p>
                <p>
                  L&apos;Emprunteur reconnaît avoir reçu, préalablement à la signature, une information claire, exacte et non trompeuse sur les
                  caractéristiques essentielles du Crédit, conformément aux exigences de la loi fédérale sur les services financiers (LSFin).
                </p>
              </Article>

              <Article number={3} title="Conditions financières">
                <table className="mt-2 w-full border-collapse text-[12.5px]">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 pr-3 text-slate-500">Montant financé</td>
                      <td className="py-1.5 text-right font-medium text-slate-900">{formatUsd(creditRequest.amountRequested)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 pr-3 text-slate-500">Durée</td>
                      <td className="py-1.5 text-right font-medium text-slate-900">{creditRequest.durationMonths} mois</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 pr-3 text-slate-500">Taux nominal annuel</td>
                      <td className="py-1.5 text-right font-medium text-slate-900">{formatPercentPlain(contract.nominalRate)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 pr-3 text-slate-500">Taux annuel effectif global (TAEG)</td>
                      <td className="py-1.5 text-right font-medium text-slate-900">{formatPercentPlain(contract.apr)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 pr-3 text-slate-500">Mensualité</td>
                      <td className="py-1.5 text-right font-medium text-slate-900">{formatUsd(creditRequest.estimatedMonthlyPayment)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 pr-3 text-slate-500">Coût total du crédit</td>
                      <td className="py-1.5 text-right font-medium text-slate-900">{formatUsd(contract.totalInterest)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-3 text-slate-500">Montant total dû</td>
                      <td className="py-1.5 text-right font-medium text-slate-900">{formatUsd(contract.totalRepayable)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2">
                  Le taux nominal est fixe pour toute la durée du contrat. Le calcul des intérêts est effectué mensuellement sur le capital restant dû.
                </p>
              </Article>

              <Article number={4} title="Déblocage des fonds">
                <p>
                  Le Crédit est débloqué sur le compte courant de l&apos;Emprunteur ouvert dans les livres du Créancier dans un délai de deux (2) jours
                  ouvrés suivant la constitution effective du Gage à l&apos;Article 5 et la signature du présent contrat par les deux Parties. Le
                  déblocage peut être différé si les vérifications de conformité visées à l&apos;Article 11 ne sont pas finalisées.
                </p>
              </Article>

              <Article number={5} title="Garantie et nantissement">
                <p>
                  En garantie du remboursement intégral du Crédit, en principal, intérêts, frais et accessoires, l&apos;Emprunteur constitue au profit du
                  Créancier un nantissement, au sens des articles 884 et suivants du Code des obligations (CO), portant sur {pledgeDescription}.
                </p>
                <p>
                  Le Gage demeure bloqué et indisponible pour l&apos;Emprunteur pendant toute la durée du Crédit et ne peut être retiré, transféré ou
                  grevé d&apos;un droit concurrent sans l&apos;accord préalable écrit du Créancier.
                </p>
              </Article>

              <Article number={6} title="Modalités de remboursement">
                <p>
                  Le Crédit est remboursé selon deux sources cumulatives : (i) le rendement généré par les actifs mis en gage, appliqué automatiquement
                  et périodiquement au crédit utilisé, et (ii) des apports externes de l&apos;Emprunteur, effectués par dépôt ou virement sur son compte.
                  Le détail des échéances prévisionnelles figure à l&apos;Annexe 1.
                </p>
              </Article>

              <Article number={7} title="Remboursement anticipé">
                <p>
                  L&apos;Emprunteur peut à tout moment procéder à un remboursement anticipé, partiel ou total, du Crédit, sans pénalité ni indemnité de
                  remploi, moyennant une notification préalable de cinq (5) jours ouvrés au Créancier. Un remboursement partiel réduit le capital
                  restant dû et, en conséquence, les intérêts futurs ; il ne raccourcit pas automatiquement la durée résiduelle sauf accord contraire des
                  Parties.
                </p>
              </Article>

              <Article number={8} title="Appel de garantie et dépréciation du gage">
                <p>
                  Si la valeur retenue du Gage venait à se déprécier au point que le ratio entre le Crédit utilisé et la valeur retenue du Gage dépasse
                  le seuil fixé par la grille tarifaire en vigueur, le Créancier en informe sans délai l&apos;Emprunteur et l&apos;invite à reconstituer
                  le Gage ou à rembourser partiellement le Crédit dans un délai de cinq (5) jours ouvrés. À défaut de régularisation dans ce délai, le
                  Créancier peut procéder à la réalisation partielle du Gage, à due concurrence, sans mise en demeure préalable.
                </p>
              </Article>

              <Article number={9} title="Défaut de paiement et exigibilité anticipée">
                <p>
                  Constitue un cas de défaut : le non-paiement d&apos;une échéance à sa date d&apos;exigibilité, la dépréciation du Gage visée à
                  l&apos;Article 8 non régularisée, ou l&apos;ouverture d&apos;une procédure d&apos;exécution forcée à l&apos;encontre de l&apos;Emprunteur.
                  En cas de défaut, le Créancier peut, après mise en demeure restée infructueuse pendant dix (10) jours, prononcer l&apos;exigibilité
                  immédiate de l&apos;intégralité du solde dû et procéder à la réalisation du Gage à due concurrence.
                </p>
              </Article>

              <Article number={10} title="Déclarations et garanties de l'Emprunteur">
                <p>
                  L&apos;Emprunteur déclare que les informations communiquées dans le cadre de sa demande sont exactes, complètes et à jour, notamment
                  s&apos;agissant de sa situation professionnelle ({professionalSituation}) et de ses revenus déclarés. Il déclare que le Gage constitué
                  lui appartient en propre, libre de tout gage ou droit concurrent antérieur, et que les fonds mis en gage ne proviennent pas
                  d&apos;une activité illicite.
                </p>
              </Article>

              <Article number={11} title="Lutte contre le blanchiment d'argent">
                <p>
                  Le Créancier procède, préalablement à l&apos;entrée en relation et pendant toute la durée du contrat, aux vérifications d&apos;identité
                  et de conformité requises par la loi fédérale concernant la lutte contre le blanchiment d&apos;argent et le financement du terrorisme
                  (LBA), sous le contrôle de {ENTITY_IDENTITY.amlBodyName}. L&apos;Emprunteur s&apos;engage à fournir sans délai toute pièce
                  justificative complémentaire raisonnablement demandée par le Créancier à cet effet.
                </p>
              </Article>

              <Article number={12} title="Protection des données">
                <p>
                  Les données personnelles de l&apos;Emprunteur sont traitées par le Créancier conformément à la loi fédérale sur la protection des
                  données (LPD), aux seules fins de l&apos;exécution du présent contrat, du respect des obligations légales et réglementaires
                  applicables, et de la gestion de la relation contractuelle. Toute question relative à ce traitement peut être adressée à{" "}
                  {ENTITY_IDENTITY.dataProtectionContact}.
                </p>
              </Article>

              <Article number={13} title="Droit de rétractation">
                <p>
                  L&apos;Emprunteur dispose d&apos;un délai de quatorze (14) jours calendaires à compter de la signature du présent contrat pour se
                  rétracter, sans avoir à justifier de motif ni à supporter de pénalité, par notification écrite au Créancier. En cas de rétractation,
                  l&apos;Emprunteur restitue le capital effectivement versé dans un délai de trente (30) jours.
                </p>
              </Article>

              <Article number={14} title="Résiliation">
                <p>
                  Chaque Partie peut résilier le présent contrat pour juste motif, notamment en cas de manquement grave de l&apos;autre Partie à ses
                  obligations non réparé dans un délai raisonnable après mise en demeure. La résiliation n&apos;emporte pas exonération des sommes déjà
                  dues à la date d&apos;effet.
                </p>
              </Article>

              <Article number={15} title="Cadre réglementaire et agréments">
                <p>
                  Le Créancier est un gestionnaire de fortune indépendant au sens de la loi fédérale sur les établissements financiers (LEFin) du 15 juin
                  2018, soumis à la surveillance de {ENTITY_IDENTITY.supervisionBodyName}, {ENTITY_IDENTITY.supervisionBodyDescription}. Son activité
                  est également régie par la loi fédérale sur les services financiers (LSFin) du 15 juin 2018, ainsi que, pour les aspects relatifs au
                  prêt et au nantissement, par le Code des obligations (CO), notamment ses dispositions sur le prêt de consommation (art. 312 ss CO) et
                  le nantissement (art. 884 ss CO).
                </p>
                <p>
                  Conformément à la LSFin, l&apos;Emprunteur, en sa qualité de {ENTITY_IDENTITY.clientClassification}, bénéficie d&apos;un accès à un
                  organe de médiation en cas de litige non résolu à l&apos;amiable : {ENTITY_IDENTITY.mediationBody}.
                </p>
              </Article>

              <Article number={16} title="Droit applicable et for">
                <p>
                  Le présent contrat est régi par le droit suisse. Tout litige relatif à sa validité, son interprétation ou son exécution relève de la
                  compétence exclusive des tribunaux de {ENTITY_IDENTITY.jurisdiction}, sous réserve des voies de médiation prévues à l&apos;Article 15.
                </p>
              </Article>

              <Article number={17} title="Dispositions finales">
                <p>
                  Le présent contrat, y compris son Annexe 1, constitue l&apos;intégralité de l&apos;accord entre les Parties relatif au Crédit et
                  annule tout accord antérieur portant sur le même objet. Si l&apos;une de ses clauses devait être déclarée nulle ou inopposable, les
                  autres clauses demeureraient pleinement applicables. Toute modification du présent contrat doit faire l&apos;objet d&apos;un avenant
                  écrit signé par les deux Parties.
                </p>
              </Article>

              <section className="mt-8" style={{ breakBefore: "page" }}>
                <p className="font-semibold text-slate-900">Annexe 1 : Tableau d&apos;amortissement prévisionnel</p>
                <p className="mt-1.5 text-[12.5px] text-slate-600">
                  Échéancier indicatif établi sur la base du taux nominal fixe de {formatPercentPlain(contract.nominalRate)} et d&apos;une mensualité
                  constante de {formatUsd(creditRequest.estimatedMonthlyPayment)}. Toute modulation du remboursement par le rendement du gage (Article
                  6) accélère l&apos;amortissement réel par rapport à cet échéancier théorique.
                </p>
                <table className="mt-3 w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-slate-500 uppercase">
                      <th className="py-1 pr-2 font-medium">Mois</th>
                      <th className="py-1 pr-2 text-right font-medium">Échéance</th>
                      <th className="py-1 pr-2 text-right font-medium">Intérêts</th>
                      <th className="py-1 pr-2 text-right font-medium">Capital</th>
                      <th className="py-1 text-right font-medium">Solde restant dû</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.month} className="border-b border-slate-100">
                        <td className="py-1 pr-2 text-slate-600">{row.month}</td>
                        <td className="py-1 pr-2 text-right text-slate-800">{formatUsd(row.payment)}</td>
                        <td className="py-1 pr-2 text-right text-slate-500">{formatUsd(row.interest)}</td>
                        <td className="py-1 pr-2 text-right text-slate-500">{formatUsd(row.principal)}</td>
                        <td className="py-1 text-right font-medium text-slate-900">{formatUsd(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <p className="mt-8 text-[12.5px] text-slate-600" style={{ breakInside: "avoid" }}>
                Fait à Nyon, le {contract.generatedAt ?? "—"}, en deux exemplaires originaux, chaque Partie reconnaissant avoir reçu le sien.
              </p>

              <div className="mt-10 flex gap-10" style={{ breakInside: "avoid" }}>
                {signatureLine("Pour le Créancier, H. Hentsch Asset Management SA", contract.countersignedAt)}
                {signatureLine("L'Emprunteur", contract.signedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
