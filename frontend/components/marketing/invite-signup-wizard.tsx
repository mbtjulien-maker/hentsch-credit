"use client";

import { useEffect, useId, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  KeyRound,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  api,
  ApiError,
  type AccountType,
  type BusinessSector,
  type FundsOrigin,
  type IdentityCheckMethod,
  type IdentityDocumentInput,
  type IdentityDocumentType,
  type IncomeBracket,
  type MaritalStatus,
  type NetWorthBracket,
  type ProfessionalStatus,
  type ProofOfAddressType,
  type RelationshipPurpose,
  type SubmitAmlProfileInput,
  type UpdateOwnAddressInput,
  type UpdateOwnEmploymentInput,
  type UpdateOwnProfileInput,
} from "@/lib/api";

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

const STEPS = [
  "code",
  "credentials",
  "civil",
  "address",
  "employment",
  "identity",
  "aml",
  "recap",
] as const;
type Step = (typeof STEPS)[number];

// Chip à bascule — un seul choix ou plusieurs, même composant que kyc-dossier-section.tsx
// (Dashboard.kycDossier) : cohérence visuelle entre l'auto-déclaration progressive du
// dashboard et cet assistant d'inscription, qui alimente exactement le même dossier.
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

interface WizardData {
  code: string;
  accountType: AccountType | null;
  email: string;
  password: string;
  confirmPassword: string;
  profile: UpdateOwnProfileInput;
  address: UpdateOwnAddressInput;
  employment: UpdateOwnEmploymentInput;
  identityDocument: IdentityDocumentInput;
  aml: SubmitAmlProfileInput;
}

const EMPTY_DATA: WizardData = {
  code: "",
  accountType: null,
  email: "",
  password: "",
  confirmPassword: "",
  profile: {},
  address: { label: "DOMICILE", street: "", city: "", postalCode: "", country: "" },
  employment: {},
  identityDocument: {},
  aml: { confirmAttestation: false },
};

// Assistant d'inscription par invitation (cf. §6 CLAUDE.md entrée #40) — remplace le
// formulaire public "Demander l'ouverture d'un compte" comme point d'entrée. Un code
// valide déverrouille un dossier KYC progressif (une section à la fois, jamais le tout en
// même temps), terminé par un récapitulatif régénérant le dossier en PDF avec les
// données réellement saisies, à valider explicitement avant toute création de compte.
export function InviteSignupWizard() {
  const t = useTranslations("InviteSignup");
  const tKyc = useTranslations("Dashboard.kycDossier");
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardData>(EMPTY_DATA);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [confirmFinal, setConfirmFinal] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const step: Step = STEPS[stepIndex];
  const isBusiness = data.accountType === "BUSINESS";

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goTo(index: number) {
    setError(null);
    setStepIndex(index);
  }

  async function handleValidateCode() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.validateInviteCode(data.code.trim());
      setData((d) => ({ ...d, accountType: result.accountType }));
      setCodeExpiresAt(result.expiresAt);
      goTo(stepIndex + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function loadPdfPreview() {
    setPdfLoading(true);
    setError(null);
    try {
      const blob = await api.previewKycDossierPdf({
        email: data.email.trim(),
        accountType: data.accountType!,
        profile: data.profile,
        address: data.address,
        employment: data.employment,
        identityDocument: data.identityDocument,
        aml: data.aml,
      });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleFinalSubmit() {
    if (!confirmFinal) return;
    setBusy(true);
    setError(null);
    try {
      const user = await api.redeemInviteCode({
        code: data.code.trim(),
        email: data.email.trim(),
        password: data.password,
        profile: data.profile,
        address: data.address,
        employment: data.employment,
        identityDocument: data.identityDocument,
        aml: data.aml,
      });
      setCreatedEmail(user.email);
      // Même mécanisme que LoginForm : la session vient d'être posée par un cookie
      // httpOnly (cf. InviteCodesController.redeem, même cookie que /auth/login) — la
      // navigation déclenche DashboardProvider, qui relit /auth/me pour charger le compte.
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
      setBusy(false);
    }
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
  const passwordValid = data.password.length >= 8;
  const passwordsMatch = data.password === data.confirmPassword;
  const canAdvanceCredentials = emailValid && passwordValid && passwordsMatch;

  const codeInputId = useId();
  const streetId = useId();
  const companyRegistrationNumberId = useId();

  if (createdEmail) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <BadgeCheck className="size-8 text-primary" />
          <p className="font-medium">{t("recap.successTitle")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("recap.successDescription", { email: createdEmail })}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Titres des étapes — "code"/"credentials"/"aml"/"recap" sont propres à l'assistant
  // (t, namespace InviteSignup), "civil"/"address"/"employment"/"identity" reprennent tels
  // quels les titres de section déjà traduits de /dashboard/kyc (tKyc, Dashboard.kycDossier
  // .sections) : le dossier alimenté est exactement le même, jamais un second jeu de
  // libellés à maintenir en double dans les 7 langues.
  const currentStepTitle =
    step === "civil"
      ? tKyc("sections.civil")
      : step === "address"
        ? tKyc("sections.address")
        : step === "employment"
          ? tKyc("sections.employment")
          : step === "identity"
            ? tKyc("sections.documents")
            : t(`steps.${step}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {step === "code" ? <KeyRound className="size-4 text-muted-foreground" /> : null}
          {currentStepTitle}
        </CardTitle>
        <CardDescription>
          {t("progress", { step: stepIndex + 1, total: STEPS.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "code" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={codeInputId}>{t("code.label")}</Label>
              <Input
                id={codeInputId}
                placeholder={t("code.placeholder")}
                value={data.code}
                onChange={(e) => setData((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
                className="font-mono tracking-widest"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{t("code.hint")}</p>
            </div>
            <Button
              type="button"
              disabled={busy || data.code.trim().length < 6}
              onClick={() => void handleValidateCode()}
              className="self-start"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : t("code.cta")}
            </Button>
            <p className="text-xs text-muted-foreground/80">
              {t.rich("alreadyHaveAccount", {
                link: (chunks) => (
                  <Link href="/login" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        )}

        {step === "credentials" && (
          <div className="flex flex-col gap-3">
            {data.accountType && (
              <p className="text-xs text-muted-foreground">
                {t("code.accountTypeNote", {
                  type:
                    data.accountType === "BUSINESS"
                      ? t("code.accountTypeBusiness")
                      : t("code.accountTypeParticulier"),
                })}
                {codeExpiresAt && ` · ${t("code.expiresNote")}`}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>{t("credentials.email")}</Label>
              <Input
                type="email"
                value={data.email}
                onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("credentials.password")}</Label>
              <Input
                type="password"
                value={data.password}
                onChange={(e) => setData((d) => ({ ...d, password: e.target.value }))}
              />
              {data.password.length > 0 && !passwordValid && (
                <p className="text-xs text-destructive">{t("credentials.passwordTooShort")}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("credentials.confirmPassword")}</Label>
              <Input
                type="password"
                value={data.confirmPassword}
                onChange={(e) => setData((d) => ({ ...d, confirmPassword: e.target.value }))}
              />
              {data.confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">{t("credentials.passwordMismatch")}</p>
              )}
            </div>
          </div>
        )}

        {step === "civil" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("firstName")}</Label>
              <Input
                value={data.profile.firstName ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, firstName: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("lastName")}</Label>
              <Input
                value={data.profile.lastName ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, lastName: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("usageLastName")}</Label>
              <Input
                value={data.profile.usageLastName ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, usageLastName: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("dateOfBirth")}</Label>
              <Input
                type="date"
                value={data.profile.dateOfBirth ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, dateOfBirth: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("placeOfBirth")}</Label>
              <Input
                value={data.profile.placeOfBirth ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, placeOfBirth: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("birthCountry")}</Label>
              <Input
                value={data.profile.birthCountry ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, birthCountry: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("gender")}</Label>
              <div className="flex gap-1.5">
                {(["M", "F", "AUTRE"] as const).map((value) => (
                  <ToggleChip
                    key={value}
                    active={data.profile.gender === value}
                    onClick={() => setData((d) => ({ ...d, profile: { ...d.profile, gender: value } }))}
                  >
                    {tKyc(`genderLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("nationality")}</Label>
              <Input
                value={data.profile.nationality ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, nationality: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("secondNationality")}</Label>
              <Input
                value={data.profile.secondNationality ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, secondNationality: e.target.value } }))}
              />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{tKyc("maritalStatus")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {MARITAL_STATUSES.map((value) => (
                  <ToggleChip
                    key={value}
                    active={data.profile.maritalStatus === value}
                    onClick={() => setData((d) => ({ ...d, profile: { ...d.profile, maritalStatus: value } }))}
                  >
                    {tKyc(`maritalStatusLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("phone")}</Label>
              <Input
                value={data.profile.phone ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, phone: e.target.value } }))}
              />
            </div>
          </div>
        )}

        {step === "address" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="col-span-full flex flex-col gap-1">
              <Label htmlFor={streetId} className="text-xs text-muted-foreground">{tKyc("street")}</Label>
              <Input
                id={streetId}
                value={data.address.street}
                onChange={(e) => setData((d) => ({ ...d, address: { ...d.address, street: e.target.value } }))}
              />
            </div>
            <div className="col-span-full flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("addressLine2")}</Label>
              <Input
                value={data.address.addressLine2 ?? ""}
                onChange={(e) => setData((d) => ({ ...d, address: { ...d.address, addressLine2: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("city")}</Label>
              <Input
                value={data.address.city}
                onChange={(e) => setData((d) => ({ ...d, address: { ...d.address, city: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("postalCode")}</Label>
              <Input
                value={data.address.postalCode}
                onChange={(e) => setData((d) => ({ ...d, address: { ...d.address, postalCode: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("country")}</Label>
              <Input
                value={data.address.country}
                onChange={(e) => setData((d) => ({ ...d, address: { ...d.address, country: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("taxResidenceCountry")}</Label>
              <Input
                value={data.profile.taxResidenceCountry ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, taxResidenceCountry: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("additionalTaxResidence")}</Label>
              <Input
                value={data.profile.additionalTaxResidence ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, additionalTaxResidence: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("taxIdNumber")}</Label>
              <Input
                value={data.profile.taxIdNumber ?? ""}
                onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, taxIdNumber: e.target.value } }))}
              />
            </div>
          </div>
        )}

        {step === "employment" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Statut professionnel n'a de sens que pour un particulier déclarant sa
                propre situation — un compte Business déclare l'entreprise elle-même
                (même traitement que kyc-dossier-section.tsx/profile-section.tsx). */}
            {!isBusiness && (
              <div className="col-span-full flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">{tKyc("professionalStatus")}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PROFESSIONAL_STATUSES.map((value) => (
                    <ToggleChip
                      key={value}
                      active={data.employment.professionalStatus === value}
                      onClick={() => setData((d) => ({ ...d, employment: { ...d.employment, professionalStatus: value } }))}
                    >
                      {tKyc(`professionalStatusLabels.${value}`)}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{isBusiness ? tKyc("companyName") : tKyc("employer")}</Label>
              <Input
                value={data.employment.employer ?? ""}
                onChange={(e) => setData((d) => ({ ...d, employment: { ...d.employment, employer: e.target.value } }))}
              />
            </div>
            {isBusiness ? (
              <div className="flex flex-col gap-1">
                <Label htmlFor={companyRegistrationNumberId} className="text-xs text-muted-foreground">
                  {tKyc("companyRegistrationNumber")}
                </Label>
                <Input
                  id={companyRegistrationNumberId}
                  value={data.employment.companyRegistrationNumber ?? ""}
                  onChange={(e) =>
                    setData((d) => ({ ...d, employment: { ...d.employment, companyRegistrationNumber: e.target.value } }))
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{tKyc("activity")}</Label>
                <Input
                  value={data.employment.activity ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, employment: { ...d.employment, activity: e.target.value } }))}
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("sector")}</Label>
              <Select
                value={data.employment.sector || undefined}
                onValueChange={(v) => setData((d) => ({ ...d, employment: { ...d.employment, sector: v as BusinessSector } }))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder={tKyc("selectPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_SECTORS.map((value) => (
                    <SelectItem key={value} value={value}>{tKyc(`sectorLabels.${value}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                {isBusiness ? tKyc("companySeniority") : tKyc("seniority")}
              </Label>
              <Input
                value={data.employment.seniority ?? ""}
                onChange={(e) => setData((d) => ({ ...d, employment: { ...d.employment, seniority: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                {isBusiness ? t("employment.annualRevenue") : t("employment.annualIncome")}
              </Label>
              <Input
                type="number"
                min="0"
                value={data.employment.annualIncome ?? ""}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    employment: { ...d.employment, annualIncome: e.target.value ? Number(e.target.value) : undefined },
                  }))
                }
              />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {isBusiness ? tKyc("annualRevenueBracket") : tKyc("annualIncomeBracket")}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {INCOME_BRACKETS.map((value) => (
                  <ToggleChip
                    key={value}
                    active={data.employment.annualIncomeBracket === value}
                    onClick={() => setData((d) => ({ ...d, employment: { ...d.employment, annualIncomeBracket: value } }))}
                  >
                    {tKyc(`incomeBracketLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {isBusiness ? tKyc("businessAssetsBracket") : tKyc("netWorthBracket")}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {NET_WORTH_BRACKETS.map((value) => (
                  <ToggleChip
                    key={value}
                    active={data.employment.netWorthBracket === value}
                    onClick={() => setData((d) => ({ ...d, employment: { ...d.employment, netWorthBracket: value } }))}
                  >
                    {tKyc(`netWorthBracketLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "identity" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">{t("identity.fileUploadNote")}</p>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{tKyc("documentType")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {DOCUMENT_TYPES.map((value) => (
                  <ToggleChip
                    key={value}
                    active={data.identityDocument.documentType === value}
                    onClick={() => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, documentType: value } }))}
                  >
                    {tKyc(`documentTypeLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{tKyc("documentNumber")}</Label>
                <Input
                  value={data.identityDocument.documentNumber ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, documentNumber: e.target.value } }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{tKyc("issuingAuthority")}</Label>
                <Input
                  value={data.identityDocument.issuingAuthority ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, issuingAuthority: e.target.value } }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{tKyc("issuePlace")}</Label>
                <Input
                  value={data.identityDocument.issuePlace ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, issuePlace: e.target.value } }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{tKyc("issueDate")}</Label>
                <Input
                  type="date"
                  value={data.identityDocument.issueDate ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, issueDate: e.target.value } }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{tKyc("expiryDate")}</Label>
                <Input
                  type="date"
                  value={data.identityDocument.expiryDate ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, expiryDate: e.target.value } }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{tKyc("identityCheckMethod")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {CHECK_METHODS.map((value) => (
                  <ToggleChip
                    key={value}
                    active={data.identityDocument.identityCheckMethod === value}
                    onClick={() => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, identityCheckMethod: value } }))}
                  >
                    {tKyc(`identityCheckMethodLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{tKyc("proofOfAddressType")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {PROOF_TYPES.map((value) => (
                  <ToggleChip
                    key={value}
                    active={data.identityDocument.proofOfAddressType === value}
                    onClick={() => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, proofOfAddressType: value } }))}
                  >
                    {tKyc(`proofOfAddressTypeLabels.${value}`)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{tKyc("proofOfAddressIssuer")}</Label>
                <Input
                  value={data.identityDocument.proofOfAddressIssuer ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, proofOfAddressIssuer: e.target.value } }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{tKyc("proofOfAddressDate")}</Label>
                <Input
                  type="date"
                  value={data.identityDocument.proofOfAddressDate ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, identityDocument: { ...d.identityDocument, proofOfAddressDate: e.target.value } }))}
                />
              </div>
            </div>
          </div>
        )}

        {step === "aml" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{tKyc("isPoliticallyExposed")}</Label>
              <div className="flex gap-1.5">
                <ToggleChip
                  active={data.aml.isPoliticallyExposed === true}
                  onClick={() => setData((d) => ({ ...d, aml: { ...d.aml, isPoliticallyExposed: true } }))}
                >
                  {tKyc("yes")}
                </ToggleChip>
                <ToggleChip
                  active={data.aml.isPoliticallyExposed === false}
                  onClick={() => setData((d) => ({ ...d, aml: { ...d.aml, isPoliticallyExposed: false } }))}
                >
                  {tKyc("no")}
                </ToggleChip>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{tKyc("fundsOrigin")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {FUNDS_ORIGINS.map((value) => {
                  const active = data.aml.fundsOrigin?.includes(value) ?? false;
                  return (
                    <ToggleChip
                      key={value}
                      active={active}
                      onClick={() =>
                        setData((d) => {
                          const current = d.aml.fundsOrigin ?? [];
                          const next = active ? current.filter((v) => v !== value) : [...current, value];
                          return { ...d, aml: { ...d.aml, fundsOrigin: next } };
                        })
                      }
                    >
                      {tKyc(`fundsOriginLabels.${value}`)}
                    </ToggleChip>
                  );
                })}
              </div>
              {data.aml.fundsOrigin?.includes("AUTRE") && (
                <Input
                  className="mt-1"
                  placeholder={tKyc("fundsOriginOther")}
                  value={data.aml.fundsOriginOther ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, aml: { ...d.aml, fundsOriginOther: e.target.value } }))}
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{tKyc("relationshipPurpose")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIP_PURPOSES.map((value) => {
                  const active = data.aml.relationshipPurpose?.includes(value) ?? false;
                  return (
                    <ToggleChip
                      key={value}
                      active={active}
                      onClick={() =>
                        setData((d) => {
                          const current = d.aml.relationshipPurpose ?? [];
                          const next = active ? current.filter((v) => v !== value) : [...current, value];
                          return { ...d, aml: { ...d.aml, relationshipPurpose: next } };
                        })
                      }
                    >
                      {tKyc(`relationshipPurposeLabels.${value}`)}
                    </ToggleChip>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{tKyc("attestationCity")}</Label>
              <Input
                className="max-w-xs"
                value={data.aml.attestationCity ?? ""}
                onChange={(e) => setData((d) => ({ ...d, aml: { ...d.aml, attestationCity: e.target.value } }))}
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={data.aml.confirmAttestation}
                onChange={(e) => setData((d) => ({ ...d, aml: { ...d.aml, confirmAttestation: e.target.checked } }))}
                className="mt-0.5 size-3.5 accent-primary"
              />
              <span>{tKyc("attestationText")}</span>
            </label>
          </div>
        )}

        {step === "recap" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t("recap.intro")}</p>
            {!pdfUrl && !pdfLoading && (
              <Button type="button" variant="outline" className="self-start" onClick={() => void loadPdfPreview()}>
                <RefreshCw className="size-4" />
                {t("recap.generate")}
              </Button>
            )}
            {pdfLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t("recap.generating")}
              </div>
            )}
            {pdfUrl && (
              <>
                <iframe src={pdfUrl} title="Dossier KYC" className="h-[420px] w-full rounded-lg border border-border/60" />
                <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => void loadPdfPreview()}>
                  <RefreshCw className="size-3.5" />
                  {t("recap.regenerate")}
                </Button>
              </>
            )}
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={confirmFinal}
                onChange={(e) => setConfirmFinal(e.target.checked)}
                className="mt-0.5 size-3.5 accent-primary"
              />
              <span>{t("recap.confirmLabel")}</span>
            </label>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-4">
          {step !== "code" && step !== "recap" ? (
            <Button type="button" variant="outline" size="sm" onClick={() => goTo(stepIndex - 1)} disabled={busy}>
              <ArrowLeft className="size-4" />
              {t("nav.back")}
            </Button>
          ) : (
            <span />
          )}

          {step === "credentials" && (
            <Button type="button" disabled={!canAdvanceCredentials} onClick={() => goTo(stepIndex + 1)}>
              {t("nav.next")}
              <ArrowRight className="size-4" />
            </Button>
          )}
          {(step === "civil" || step === "address" || step === "employment" || step === "identity") && (
            <Button type="button" onClick={() => goTo(stepIndex + 1)}>
              {t("nav.next")}
              <ArrowRight className="size-4" />
            </Button>
          )}
          {step === "aml" && (
            <Button type="button" disabled={!data.aml.confirmAttestation} onClick={() => goTo(stepIndex + 1)}>
              {t("nav.next")}
              <ArrowRight className="size-4" />
            </Button>
          )}
          {step === "recap" && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => goTo(stepIndex - 1)} disabled={busy}>
                <ArrowLeft className="size-4" />
                {t("nav.back")}
              </Button>
              <Button type="button" disabled={busy || !confirmFinal || !pdfUrl} onClick={() => void handleFinalSubmit()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                {t("nav.submit")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
