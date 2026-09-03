"use client";

import { useEffect, useId, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Contact,
  FileCheck2,
  FileText,
  IdCard,
  Loader2,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import {
  api,
  ApiError,
  type AmlRiskLevel,
  type BusinessSector,
  type ClientProfileView,
  type FundsOrigin,
  type IdentityCheckMethod,
  type IdentityDocumentType,
  type IncomeBracket,
  type KycDocumentCategory,
  type KycDocumentSummary,
  type MaritalStatus,
  type KycReviewDecision,
  type NetWorthBracket,
  type ProfessionalStatus,
  type ProofOfAddressType,
  type RelationshipPurpose,
} from "@/lib/api";
import { formatDate } from "@/lib/format";

const MARITAL_STATUSES: MaritalStatus[] = ["CELIBATAIRE", "MARIE", "PACSE", "DIVORCE", "VEUF"];
const BUSINESS_SECTORS: BusinessSector[] = [
  "TECHNOLOGIE_LOGICIEL",
  "FINANCE_ASSURANCE",
  "SANTE_PHARMACIE",
  "COMMERCE_DETAIL",
  "INDUSTRIE_MANUFACTURE",
  "IMMOBILIER_CONSTRUCTION",
  "AGRICULTURE_AGROALIMENTAIRE",
  "EDUCATION_FORMATION",
  "TRANSPORT_LOGISTIQUE",
  "TOURISME_HOTELLERIE_RESTAURATION",
  "MEDIA_COMMUNICATION",
  "ENERGIE_ENVIRONNEMENT",
  "SERVICES_PROFESSIONNELS_CONSEIL",
  "ARTISANAT",
  "CULTURE_LOISIRS",
  "ADMINISTRATION_PUBLIQUE",
  "AUTRE",
];
const PROFESSIONAL_STATUSES: ProfessionalStatus[] = [
  "SALARIE",
  "FONCTIONNAIRE",
  "INDEPENDANT",
  "DIRIGEANT",
  "RETRAITE",
  "ETUDIANT",
  "SANS_EMPLOI",
];
const INCOME_BRACKETS: IncomeBracket[] = ["LT_20K", "B20K_50K", "B50K_100K", "B100K_250K", "GT_250K"];
const NET_WORTH_BRACKETS: NetWorthBracket[] = ["LT_100K", "B100K_500K", "B500K_1M", "GT_1M"];
const DOCUMENT_TYPES: IdentityDocumentType[] = ["CNI", "PASSEPORT", "TITRE_SEJOUR"];
const CHECK_METHODS: IdentityCheckMethod[] = ["FACE_A_FACE", "PVID", "EIDAS"];
const PROOF_TYPES: ProofOfAddressType[] = ["FACTURE", "AVIS_IMPOSITION", "QUITTANCE"];
const FUNDS_ORIGINS: FundsOrigin[] = [
  "REVENUS_PROFESSIONNELS",
  "EPARGNE",
  "VENTE_BIENS",
  "HERITAGE",
  "DIVIDENDES",
  "AUTRE",
];
const RELATIONSHIP_PURPOSES: RelationshipPurpose[] = [
  "COMPTE_COURANT",
  "PLACEMENT",
  "FINANCEMENT",
  "OPERATIONS_INTERNATIONALES",
];

function reviewVariant(decision: KycReviewDecision | null): "default" | "destructive" | "secondary" {
  if (decision === "VALIDE") return "default";
  if (decision === "REFUSE") return "destructive";
  return "secondary";
}

function riskVariant(level: AmlRiskLevel | null): "default" | "destructive" | "secondary" {
  if (level === "ELEVE") return "destructive";
  if (level === "FAIBLE") return "default";
  return "secondary";
}

// Chip à bascule — un seul choix (segmenté) ou plusieurs (multi-sélection), même style
// visuel que le toggle salarié/indépendant déjà utilisé par ProfileSection : cohérence
// visuelle plutôt qu'un nouveau composant Checkbox introduit pour l'occasion.
function ToggleChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// Téléversement réel d'un fichier (cf. §6 entrée #36 CLAUDE.md) — un seul fichier par
// catégorie, un nouvel envoi remplace le précédent (upsert côté service) : pas besoin
// d'un flux "remplacer" distinct de "téléverser", le même bouton fait les deux. Le lien
// de téléchargement est une vraie ancre <a> (pas un fetch) : le cookie de session,
// SameSite=Lax, n'accompagne qu'une navigation top-level, cf. lib/api.ts.
function KycFileUploadRow({
  userId,
  category,
  label,
  document,
  onChange,
}: {
  userId: string;
  category: KycDocumentCategory;
  label: string;
  document: KycDocumentSummary | null;
  onChange: (docs: KycDocumentSummary[]) => void;
}) {
  const t = useTranslations("Dashboard.kycDossier");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const docs = await api.uploadUserKycDocument(userId, category, file);
      onChange(docs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!document) return;
    setBusy(true);
    setError(null);
    try {
      const docs = await api.deleteUserKycDocument(userId, document.id);
      onChange(docs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {document && (
          <Badge variant={document.verified ? "default" : "secondary"}>
            {document.verified ? t("documentVerified") : t("documentNotVerified")}
          </Badge>
        )}
      </div>

      {document ? (
        <div className="flex items-center justify-between gap-2">
          <a
            href={api.getKycDocumentDownloadUrl(userId, document.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2"
          >
            <FileText className="size-3.5 shrink-0" />
            <span className="truncate">{document.fileName}</span>
            <span className="shrink-0 text-muted-foreground">
              · {formatFileSize(document.fileSize)} · {formatDate(document.uploadedAt, locale)}
            </span>
          </a>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={busy}
            className="shrink-0 text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
            aria-label={t("removeFile")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("noFileUploaded")}</p>
      )}

      <label
        htmlFor={inputId}
        className={`flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground ${busy ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => void handleFileChange(e)}
        />
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {document ? t("replaceFile") : t("uploadFile")}
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Dossier KYC complet (cf. §6 entrée #33 CLAUDE.md) — inspiré de la structure du dossier
// papier bancaire (état civil, coordonnées/résidence fiscale, situation
// socio-professionnelle, pièces justificatives, conformité LCB-FT + attestation). Reprend
// et étend IdentityForm (profile-section.tsx) plutôt que de le dupliquer : mêmes
// endpoints profile/addresses/employment, plus les deux nouveaux (identity-document, aml).
// Toujours en mode édition, comme le reste de l'auto-déclaration — sauf la section
// conformité, dont la soumission est un geste délibéré distinct (attestation "Lu et
// approuvé" obligatoire), jamais un simple champ parmi d'autres.
export function KycDossierSection({ userId }: { userId: string }) {
  const t = useTranslations("Dashboard.kycDossier");
  const locale = useLocale();
  // Champs adaptés au modèle BUSINESS (cf. §6 CLAUDE.md entrée #46, retour client :
  // "adapte les champs à renseigner en fonction du modèle business") — numéro
  // d'immatriculation affiché uniquement pour ces comptes, le secteur d'activité (choix
  // fermé ci-dessous) reste pertinent pour tout compte.
  const { selectedUser } = useDashboard();
  const isBusiness = selectedUser?.accountType === "BUSINESS";
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingCore, setSavingCore] = useState(false);
  const [savingAml, setSavingAml] = useState(false);

  // Section 1 — état civil
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [usageLastName, setUsageLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "AUTRE" | "">("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [birthCountry, setBirthCountry] = useState("");
  const [nationality, setNationality] = useState("");
  const [secondNationality, setSecondNationality] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">("");
  const [phone, setPhone] = useState("");

  // Section 2 — coordonnées et résidence fiscale
  const [street, setStreet] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [taxResidenceCountry, setTaxResidenceCountry] = useState("");
  const [additionalTaxResidence, setAdditionalTaxResidence] = useState("");
  const [taxIdNumber, setTaxIdNumber] = useState("");

  // Section 3 — situation socio-professionnelle
  const [professionalStatus, setProfessionalStatus] = useState<ProfessionalStatus | "">("");
  const [employer, setEmployer] = useState("");
  const [activity, setActivity] = useState("");
  const [role, setRole] = useState("");
  const [sector, setSector] = useState<BusinessSector | "">("");
  const [seniority, setSeniority] = useState("");
  const [annualIncomeBracket, setAnnualIncomeBracket] = useState<IncomeBracket | "">("");
  const [netWorthBracket, setNetWorthBracket] = useState<NetWorthBracket | "">("");

  // Section 4 — pièces justificatives
  const [documentType, setDocumentType] = useState<IdentityDocumentType | "">("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [issuePlace, setIssuePlace] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [identityCheckMethod, setIdentityCheckMethod] = useState<IdentityCheckMethod | "">("");
  const [proofOfAddressType, setProofOfAddressType] = useState<ProofOfAddressType | "">("");
  const [proofOfAddressIssuer, setProofOfAddressIssuer] = useState("");
  const [proofOfAddressDate, setProofOfAddressDate] = useState("");
  const [documentVerified, setDocumentVerified] = useState(false);
  const [kycDocuments, setKycDocuments] = useState<KycDocumentSummary[]>([]);

  // Section 5 — conformité LCB-FT et attestation
  const [isPoliticallyExposed, setIsPoliticallyExposed] = useState<boolean | null>(null);
  const [fundsOrigin, setFundsOrigin] = useState<FundsOrigin[]>([]);
  const [fundsOriginOther, setFundsOriginOther] = useState("");
  const [relationshipPurpose, setRelationshipPurpose] = useState<RelationshipPurpose[]>([]);
  const [attestationCity, setAttestationCity] = useState("");
  const [confirmAttestation, setConfirmAttestation] = useState(false);
  const [attestedAt, setAttestedAt] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<AmlRiskLevel | null>(null);
  const [reviewDecision, setReviewDecision] = useState<KycReviewDecision | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);

  function applyProfile(profile: ClientProfileView) {
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setUsageLastName(profile.usageLastName ?? "");
    setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "");
    setGender(profile.gender ?? "");
    setPlaceOfBirth(profile.placeOfBirth ?? "");
    setBirthCountry(profile.birthCountry ?? "");
    setNationality(profile.nationality ?? "");
    setSecondNationality(profile.secondNationality ?? "");
    // `profile.maritalStatus` reste `string | null` côté API (compat valeurs historiques
    // en texte libre saisies par un admin avant l'entrée #35) — on ne pré-sélectionne un
    // chip que si la valeur correspond à l'un des 5 codes fermés du dossier papier,
    // jamais une valeur héritée non reconnue.
    setMaritalStatus(
      MARITAL_STATUSES.includes(profile.maritalStatus as MaritalStatus)
        ? (profile.maritalStatus as MaritalStatus)
        : "",
    );
    setPhone(profile.phone ?? "");
    setTaxResidenceCountry(profile.taxResidenceCountry ?? "");
    setAdditionalTaxResidence(profile.additionalTaxResidence ?? "");
    setTaxIdNumber(profile.taxIdNumber ?? "");

    const domicile = profile.addresses.find((a) => a.label === "DOMICILE") ?? profile.addresses[0];
    setStreet(domicile?.street ?? "");
    setAddressLine2(domicile?.addressLine2 ?? "");
    setPostalCode(domicile?.postalCode ?? "");
    setCity(domicile?.city ?? "");
    setCountry(domicile?.country ?? "");

    setProfessionalStatus(profile.employment?.professionalStatus ?? "");
    setEmployer(profile.employment?.employer ?? "");
    setActivity(profile.employment?.activity ?? "");
    setRole(profile.employment?.role ?? "");
    setSector(
      BUSINESS_SECTORS.includes(profile.employment?.sector as BusinessSector)
        ? (profile.employment?.sector as BusinessSector)
        : "",
    );
    setCompanyRegistrationNumber(profile.employment?.companyRegistrationNumber ?? "");
    setSeniority(profile.employment?.seniority ?? "");
    setAnnualIncomeBracket(profile.employment?.annualIncomeBracket ?? "");
    setNetWorthBracket(profile.employment?.netWorthBracket ?? "");

    setDocumentType(profile.identityDocument?.documentType ?? "");
    setDocumentNumber(profile.identityDocument?.documentNumber ?? "");
    setIssuingAuthority(profile.identityDocument?.issuingAuthority ?? "");
    setIssuePlace(profile.identityDocument?.issuePlace ?? "");
    setIssueDate(profile.identityDocument?.issueDate ? profile.identityDocument.issueDate.slice(0, 10) : "");
    setExpiryDate(profile.identityDocument?.expiryDate ? profile.identityDocument.expiryDate.slice(0, 10) : "");
    setIdentityCheckMethod(profile.identityDocument?.identityCheckMethod ?? "");
    setProofOfAddressType(profile.identityDocument?.proofOfAddressType ?? "");
    setProofOfAddressIssuer(profile.identityDocument?.proofOfAddressIssuer ?? "");
    setProofOfAddressDate(
      profile.identityDocument?.proofOfAddressDate ? profile.identityDocument.proofOfAddressDate.slice(0, 10) : "",
    );
    setDocumentVerified(profile.identityDocument?.verified ?? false);

    setIsPoliticallyExposed(profile.aml?.isPoliticallyExposed ?? null);
    setFundsOrigin(profile.aml?.fundsOrigin ?? []);
    setFundsOriginOther(profile.aml?.fundsOriginOther ?? "");
    setRelationshipPurpose(profile.aml?.relationshipPurpose ?? []);
    setAttestationCity(profile.aml?.attestationCity ?? "");
    setAttestedAt(profile.aml?.attestedAt ?? null);
    setRiskLevel(profile.aml?.riskLevel ?? null);
    setReviewDecision(profile.aml?.reviewDecision ?? null);
    setReviewedAt(profile.aml?.reviewedAt ?? null);
    // Une nouvelle lecture du dossier ne doit jamais laisser la case cochée d'une session
    // précédente : l'attestation est un geste explicite à chaque soumission.
    setConfirmAttestation(false);
  }

  useEffect(() => {
    let ignore = false;
    api
      .getUserProfile(userId)
      .then((data) => {
        if (!ignore) applyProfile(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setLoadError(err instanceof ApiError ? err.message : t("genericError"));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyProfile ne dépend que de son argument
  }, [userId]);

  useEffect(() => {
    let ignore = false;
    api
      .listUserKycDocuments(userId)
      .then((docs) => {
        if (!ignore) setKycDocuments(docs);
      })
      .catch(() => {
        // Silencieux — un échec de chargement des fichiers n'empêche pas de compléter le
        // reste du dossier déclaratif, même principe que useAssetLogos ailleurs.
      });
    return () => {
      ignore = true;
    };
  }, [userId]);

  function findDocument(category: KycDocumentCategory): KycDocumentSummary | null {
    return kycDocuments.find((d) => d.category === category) ?? null;
  }

  const isIndependentStatus = professionalStatus === "INDEPENDANT";
  const hasAddress = street.trim() !== "" || city.trim() !== "" || postalCode.trim() !== "" || country.trim() !== "";

  function toggleFundsOrigin(value: FundsOrigin) {
    setFundsOrigin((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }
  function toggleRelationshipPurpose(value: RelationshipPurpose) {
    setRelationshipPurpose((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  async function handleSaveCore(e: React.FormEvent) {
    e.preventDefault();
    setSavingCore(true);
    try {
      const [, , , refreshed] = await Promise.all([
        api.updateUserProfile(userId, {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          usageLastName: usageLastName.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gender: gender || undefined,
          placeOfBirth: placeOfBirth.trim() || undefined,
          birthCountry: birthCountry.trim() || undefined,
          nationality: nationality.trim() || undefined,
          secondNationality: secondNationality.trim() || undefined,
          maritalStatus: maritalStatus || undefined,
          phone: phone.trim() || undefined,
          taxResidenceCountry: taxResidenceCountry.trim() || undefined,
          additionalTaxResidence: additionalTaxResidence.trim() || undefined,
          taxIdNumber: taxIdNumber.trim() || undefined,
        }),
        hasAddress
          ? api.updateUserAddresses(userId, [
              {
                label: "DOMICILE",
                street: street.trim(),
                addressLine2: addressLine2.trim() || undefined,
                city: city.trim(),
                postalCode: postalCode.trim(),
                country: country.trim(),
              },
            ])
          : Promise.resolve(null),
        api.updateUserEmployment(userId, {
          professionalStatus: professionalStatus || undefined,
          employer: !isIndependentStatus ? employer.trim() || undefined : undefined,
          activity: isIndependentStatus ? activity.trim() || undefined : undefined,
          role: !isIndependentStatus ? role.trim() || undefined : undefined,
          sector: sector || undefined,
          companyRegistrationNumber: isBusiness ? companyRegistrationNumber.trim() || undefined : undefined,
          seniority: seniority.trim() || undefined,
          annualIncomeBracket: annualIncomeBracket || undefined,
          netWorthBracket: netWorthBracket || undefined,
        }),
        api.updateUserIdentityDocument(userId, {
          documentType: documentType || undefined,
          documentNumber: documentNumber.trim() || undefined,
          issuingAuthority: issuingAuthority.trim() || undefined,
          issuePlace: issuePlace.trim() || undefined,
          issueDate: issueDate || undefined,
          expiryDate: expiryDate || undefined,
          identityCheckMethod: identityCheckMethod || undefined,
          proofOfAddressType: proofOfAddressType || undefined,
          proofOfAddressIssuer: proofOfAddressIssuer.trim() || undefined,
          proofOfAddressDate: proofOfAddressDate || undefined,
        }),
      ]);
      applyProfile(refreshed);
      toast.success(t("saveSuccess"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSavingCore(false);
    }
  }

  async function handleSubmitAml(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmAttestation) return;
    setSavingAml(true);
    try {
      const refreshed = await api.submitUserAmlProfile(userId, {
        isPoliticallyExposed: isPoliticallyExposed ?? undefined,
        fundsOrigin,
        fundsOriginOther: fundsOriginOther.trim() || undefined,
        relationshipPurpose,
        attestationCity: attestationCity.trim() || undefined,
        confirmAttestation: true,
      });
      applyProfile(refreshed);
      toast.success(t("submitSuccess"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSavingAml(false);
    }
  }

  const firstNameId = useId();
  const lastNameId = useId();
  const usageLastNameId = useId();
  const dobId = useId();
  const placeOfBirthId = useId();
  const birthCountryId = useId();
  const nationalityId = useId();
  const secondNationalityId = useId();
  const phoneId = useId();
  const streetId = useId();
  const addressLine2Id = useId();
  const postalCodeId = useId();
  const cityId = useId();
  const countryId = useId();
  const taxResidenceCountryId = useId();
  const additionalTaxResidenceId = useId();
  const taxIdNumberId = useId();
  const employerId = useId();
  const activityId = useId();
  const roleId = useId();
  const companyRegistrationNumberId = useId();
  const seniorityId = useId();
  const documentNumberId = useId();
  const issuingAuthorityId = useId();
  const issuePlaceId = useId();
  const issueDateId = useId();
  const expiryDateId = useId();
  const proofOfAddressIssuerId = useId();
  const proofOfAddressDateId = useId();
  const fundsOriginOtherId = useId();
  const attestationCityId = useId();

  if (loadError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-destructive">{loadError}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {reviewDecision && <Badge variant={reviewVariant(reviewDecision)}>{t(`decisionLabels.${reviewDecision}`)}</Badge>}
            {riskLevel && <Badge variant={riskVariant(riskLevel)}>{t(`riskLabels.${riskLevel}`)}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {reviewDecision ? (
            <p className="text-xs text-muted-foreground">
              {reviewDecision === "VALIDE"
                ? t("reviewedValidNote", { date: reviewedAt ? formatDate(reviewedAt, locale) : "" })
                : t("reviewedRejectedNote", { date: reviewedAt ? formatDate(reviewedAt, locale) : "" })}
            </p>
          ) : attestedAt ? (
            <p className="text-xs text-muted-foreground">{t("pendingReviewNote", { date: formatDate(attestedAt, locale) })}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("notSubmittedNote")}</p>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSaveCore} className="flex flex-col gap-4">
        {/* Section 1 — état civil */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <Contact className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("sections.civil")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor={firstNameId} className="text-xs text-muted-foreground">{t("firstName")}</Label>
              <Input id={firstNameId} value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={lastNameId} className="text-xs text-muted-foreground">{t("lastName")}</Label>
              <Input id={lastNameId} value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={usageLastNameId} className="text-xs text-muted-foreground">{t("usageLastName")}</Label>
              <Input id={usageLastNameId} value={usageLastName} onChange={(e) => setUsageLastName(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={dobId} className="text-xs text-muted-foreground">{t("dateOfBirth")}</Label>
              <Input id={dobId} type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{t("gender")}</Label>
              <div className="flex gap-1.5">
                {(["M", "F", "AUTRE"] as const).map((value) => (
                  <ToggleChip key={value} active={gender === value} disabled={savingCore} onClick={() => setGender(value)}>
                    {t(`genderLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("maritalStatus")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {MARITAL_STATUSES.map((value) => (
                  <ToggleChip key={value} active={maritalStatus === value} disabled={savingCore} onClick={() => setMaritalStatus(value)}>
                    {t(`maritalStatusLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={placeOfBirthId} className="text-xs text-muted-foreground">{t("placeOfBirth")}</Label>
              <Input id={placeOfBirthId} value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={birthCountryId} className="text-xs text-muted-foreground">{t("birthCountry")}</Label>
              <Input id={birthCountryId} value={birthCountry} onChange={(e) => setBirthCountry(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={nationalityId} className="text-xs text-muted-foreground">{t("nationality")}</Label>
              <Input id={nationalityId} value={nationality} onChange={(e) => setNationality(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={secondNationalityId} className="text-xs text-muted-foreground">{t("secondNationality")}</Label>
              <Input id={secondNationalityId} value={secondNationality} onChange={(e) => setSecondNationality(e.target.value)} disabled={savingCore} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor={phoneId} className="text-xs text-muted-foreground">{t("phone")}</Label>
              <Input id={phoneId} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={savingCore} />
            </div>
          </CardContent>
        </Card>

        {/* Section 2 — coordonnées et résidence fiscale */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <Building2 className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("sections.address")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor={streetId} className="text-xs text-muted-foreground">{t("street")}</Label>
              <Input id={streetId} value={street} onChange={(e) => setStreet(e.target.value)} disabled={savingCore} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor={addressLine2Id} className="text-xs text-muted-foreground">{t("addressLine2")}</Label>
              <Input id={addressLine2Id} value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={postalCodeId} className="text-xs text-muted-foreground">{t("postalCode")}</Label>
              <Input id={postalCodeId} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={cityId} className="text-xs text-muted-foreground">{t("city")}</Label>
              <Input id={cityId} value={city} onChange={(e) => setCity(e.target.value)} disabled={savingCore} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor={countryId} className="text-xs text-muted-foreground">{t("country")}</Label>
              <Input id={countryId} value={country} onChange={(e) => setCountry(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={taxResidenceCountryId} className="text-xs text-muted-foreground">{t("taxResidenceCountry")}</Label>
              <Input id={taxResidenceCountryId} value={taxResidenceCountry} onChange={(e) => setTaxResidenceCountry(e.target.value)} disabled={savingCore} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={taxIdNumberId} className="text-xs text-muted-foreground">{t("taxIdNumber")}</Label>
              <Input id={taxIdNumberId} value={taxIdNumber} onChange={(e) => setTaxIdNumber(e.target.value)} disabled={savingCore} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor={additionalTaxResidenceId} className="text-xs text-muted-foreground">{t("additionalTaxResidence")}</Label>
              <Input id={additionalTaxResidenceId} value={additionalTaxResidence} onChange={(e) => setAdditionalTaxResidence(e.target.value)} disabled={savingCore} />
            </div>
          </CardContent>
        </Card>

        {/* Section 3 — situation socio-professionnelle */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <IdCard className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("sections.employment")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("professionalStatus")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {PROFESSIONAL_STATUSES.map((value) => (
                  <ToggleChip key={value} active={professionalStatus === value} disabled={savingCore} onClick={() => setProfessionalStatus(value)}>
                    {t(`professionalStatusLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {isIndependentStatus ? (
                <div className="col-span-2 flex flex-col gap-1">
                  <Label htmlFor={activityId} className="text-xs text-muted-foreground">{t("activity")}</Label>
                  <Input id={activityId} value={activity} onChange={(e) => setActivity(e.target.value)} disabled={savingCore} />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={employerId} className="text-xs text-muted-foreground">{t("employer")}</Label>
                    <Input id={employerId} value={employer} onChange={(e) => setEmployer(e.target.value)} disabled={savingCore} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={roleId} className="text-xs text-muted-foreground">{t("role")}</Label>
                    <Input id={roleId} value={role} onChange={(e) => setRole(e.target.value)} disabled={savingCore} />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("sector")}</Label>
                <Select value={sector || undefined} onValueChange={(v) => setSector((v as BusinessSector) ?? "")} disabled={savingCore}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t("selectPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_SECTORS.map((value) => (
                      <SelectItem key={value} value={value}>{t(`sectorLabels.${value}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={seniorityId} className="text-xs text-muted-foreground">{t("seniority")}</Label>
                <Input id={seniorityId} value={seniority} onChange={(e) => setSeniority(e.target.value)} disabled={savingCore} />
              </div>
              {isBusiness && (
                <div className="col-span-2 flex flex-col gap-1">
                  <Label htmlFor={companyRegistrationNumberId} className="text-xs text-muted-foreground">
                    {t("companyRegistrationNumber")}
                  </Label>
                  <Input
                    id={companyRegistrationNumberId}
                    value={companyRegistrationNumber}
                    onChange={(e) => setCompanyRegistrationNumber(e.target.value)}
                    disabled={savingCore}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("annualIncomeBracket")}</Label>
                <Select value={annualIncomeBracket || undefined} onValueChange={(v) => setAnnualIncomeBracket((v as IncomeBracket) ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t("selectPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {INCOME_BRACKETS.map((value) => (
                      <SelectItem key={value} value={value}>{t(`incomeBracketLabels.${value}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("netWorthBracket")}</Label>
                <Select value={netWorthBracket || undefined} onValueChange={(v) => setNetWorthBracket((v as NetWorthBracket) ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t("selectPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {NET_WORTH_BRACKETS.map((value) => (
                      <SelectItem key={value} value={value}>{t(`netWorthBracketLabels.${value}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4 — pièces justificatives */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <FileCheck2 className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">{t("sections.documents")}</CardTitle>
              </div>
              <Badge variant={documentVerified ? "default" : "secondary"}>
                {documentVerified ? t("documentVerified") : t("documentNotVerified")}
              </Badge>
            </div>
            <CardDescription>{t("documentsNote")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("documentType")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {DOCUMENT_TYPES.map((value) => (
                  <ToggleChip key={value} active={documentType === value} disabled={savingCore} onClick={() => setDocumentType(value)}>
                    {t(`documentTypeLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KycFileUploadRow
                userId={userId}
                category="IDENTITY_FRONT"
                label={t("identityFrontLabel")}
                document={findDocument("IDENTITY_FRONT")}
                onChange={setKycDocuments}
              />
              <KycFileUploadRow
                userId={userId}
                category="IDENTITY_BACK"
                label={t("identityBackLabel")}
                document={findDocument("IDENTITY_BACK")}
                onChange={setKycDocuments}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor={documentNumberId} className="text-xs text-muted-foreground">{t("documentNumber")}</Label>
                <Input id={documentNumberId} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} disabled={savingCore} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={issuingAuthorityId} className="text-xs text-muted-foreground">{t("issuingAuthority")}</Label>
                <Input id={issuingAuthorityId} value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} disabled={savingCore} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={issuePlaceId} className="text-xs text-muted-foreground">{t("issuePlace")}</Label>
                <Input id={issuePlaceId} value={issuePlace} onChange={(e) => setIssuePlace(e.target.value)} disabled={savingCore} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={issueDateId} className="text-xs text-muted-foreground">{t("issueDate")}</Label>
                <Input id={issueDateId} type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} disabled={savingCore} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={expiryDateId} className="text-xs text-muted-foreground">{t("expiryDate")}</Label>
                <Input id={expiryDateId} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} disabled={savingCore} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("identityCheckMethod")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {CHECK_METHODS.map((value) => (
                  <ToggleChip key={value} active={identityCheckMethod === value} disabled={savingCore} onClick={() => setIdentityCheckMethod(value)}>
                    {t(`identityCheckMethodLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("proofOfAddressType")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {PROOF_TYPES.map((value) => (
                  <ToggleChip key={value} active={proofOfAddressType === value} disabled={savingCore} onClick={() => setProofOfAddressType(value)}>
                    {t(`proofOfAddressTypeLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor={proofOfAddressIssuerId} className="text-xs text-muted-foreground">{t("proofOfAddressIssuer")}</Label>
                <Input id={proofOfAddressIssuerId} value={proofOfAddressIssuer} onChange={(e) => setProofOfAddressIssuer(e.target.value)} disabled={savingCore} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={proofOfAddressDateId} className="text-xs text-muted-foreground">{t("proofOfAddressDate")}</Label>
                <Input id={proofOfAddressDateId} type="date" value={proofOfAddressDate} onChange={(e) => setProofOfAddressDate(e.target.value)} disabled={savingCore} />
              </div>
            </div>
            <KycFileUploadRow
              userId={userId}
              category="PROOF_OF_ADDRESS"
              label={t("proofOfAddressFileLabel")}
              document={findDocument("PROOF_OF_ADDRESS")}
              onChange={setKycDocuments}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={savingCore} className="self-start">
          {savingCore ? <Loader2 className="size-4 animate-spin" /> : t("save")}
        </Button>
      </form>

      {/* Section 5 — conformité LCB-FT et attestation */}
      <form onSubmit={handleSubmitAml}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("sections.compliance")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("isPoliticallyExposed")}</Label>
              <div className="flex gap-1.5">
                <ToggleChip active={isPoliticallyExposed === true} disabled={savingAml} onClick={() => setIsPoliticallyExposed(true)}>
                  {t("yes")}
                </ToggleChip>
                <ToggleChip active={isPoliticallyExposed === false} disabled={savingAml} onClick={() => setIsPoliticallyExposed(false)}>
                  {t("no")}
                </ToggleChip>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("fundsOrigin")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {FUNDS_ORIGINS.map((value) => (
                  <ToggleChip key={value} active={fundsOrigin.includes(value)} disabled={savingAml} onClick={() => toggleFundsOrigin(value)}>
                    {t(`fundsOriginLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
              {fundsOrigin.includes("AUTRE") && (
                <div className="mt-1 flex flex-col gap-1">
                  <Label htmlFor={fundsOriginOtherId} className="text-xs text-muted-foreground">{t("fundsOriginOther")}</Label>
                  <Input id={fundsOriginOtherId} value={fundsOriginOther} onChange={(e) => setFundsOriginOther(e.target.value)} disabled={savingAml} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("relationshipPurpose")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIP_PURPOSES.map((value) => (
                  <ToggleChip key={value} active={relationshipPurpose.includes(value)} disabled={savingAml} onClick={() => toggleRelationshipPurpose(value)}>
                    {t(`relationshipPurposeLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t pt-3">
              <Label htmlFor={attestationCityId} className="text-xs text-muted-foreground">{t("attestationCity")}</Label>
              <Input id={attestationCityId} value={attestationCity} onChange={(e) => setAttestationCity(e.target.value)} disabled={savingAml} className="max-w-xs" />
            </div>

            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={confirmAttestation}
                onChange={(e) => setConfirmAttestation(e.target.checked)}
                disabled={savingAml}
                className="mt-0.5 size-3.5 accent-primary"
              />
              <span>{t("attestationText")}</span>
            </label>

            {!confirmAttestation && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="size-3.5" />
                {t("attestationRequired")}
              </p>
            )}

            <Button type="submit" disabled={savingAml || !confirmAttestation} className="self-start">
              {savingAml ? <Loader2 className="size-4 animate-spin" /> : <><BadgeCheck className="size-4" />{t("submitDossier")}</>}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
