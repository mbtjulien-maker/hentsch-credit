"use client";

import { useEffect, useId, useState } from "react";
import { Briefcase, Loader2, MapPin, Wallet as WalletIcon } from "lucide-react";
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
import { CHAIN_LABELS } from "@/lib/format";
import { useCurrencyLabel } from "@/lib/use-currency-label";
import {
  api,
  ApiError,
  type BusinessSector,
  type ClientManagedWalletView,
  type ClientProfileView,
  type KycStatus,
  type UserSummary,
  type WalletRecord,
} from "@/lib/api";

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

function kycVariant(status: KycStatus): "default" | "secondary" | "destructive" {
  if (status === "VERIFIED") return "default";
  if (status === "PENDING") return "secondary";
  return "destructive";
}

// Formulaire d'auto-déclaration — noyau essentiel (ClientProfile/Address/Employment),
// identique dans son fond à la fiche 360 back-office mais restreint aux champs demandés
// (nom, prénom, date de naissance, nationalité, contact, adresse, emploi, revenu annuel)
// et sans les champs de confiance (`clientType`/`verified`) qu'un client ne peut jamais
// s'attribuer lui-même (cf. backend/src/users/dto/update-own-*.dto.ts). Une seule adresse
// gérée ici (label DOMICILE) — le multi-adresses (fiscale/postale/professionnelle) reste
// un outil back-office, pas un besoin client courant. Toujours en mode édition (pas de
// bascule lecture/édition) : c'est un profil à compléter, pas une fiche à consulter.
function IdentityForm({ userId }: { userId: string }) {
  const t = useTranslations("Dashboard.profileSection");
  const { selectedUser } = useDashboard();
  const isBusiness = selectedUser?.accountType === "BUSINESS";
  const firstNameId = useId();
  const lastNameId = useId();
  const dobId = useId();
  const nationalityId = useId();
  const phoneId = useId();
  const streetId = useId();
  const cityId = useId();
  const postalCodeId = useId();
  const countryId = useId();
  const employerId = useId();
  const activityId = useId();
  const roleId = useId();
  const seniorityId = useId();
  const annualIncomeId = useId();
  const companyRegistrationNumberId = useId();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [isIndependent, setIsIndependent] = useState(false);
  const [employer, setEmployer] = useState("");
  const [activity, setActivity] = useState("");
  const [role, setRole] = useState("");
  const [sector, setSector] = useState<BusinessSector | "">("");
  const [seniority, setSeniority] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");

  function applyProfile(profile: ClientProfileView) {
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "");
    setNationality(profile.nationality ?? "");
    setPhone(profile.phone ?? "");
    const domicile = profile.addresses.find((a) => a.label === "DOMICILE") ?? profile.addresses[0];
    setStreet(domicile?.street ?? "");
    setCity(domicile?.city ?? "");
    setPostalCode(domicile?.postalCode ?? "");
    setCountry(domicile?.country ?? "");
    setIsIndependent(profile.employment?.isIndependent ?? false);
    setEmployer(profile.employment?.employer ?? "");
    setActivity(profile.employment?.activity ?? "");
    setRole(profile.employment?.role ?? "");
    setSector(
      BUSINESS_SECTORS.includes(profile.employment?.sector as BusinessSector)
        ? (profile.employment?.sector as BusinessSector)
        : "",
    );
    setSeniority(profile.employment?.seniority ?? "");
    setAnnualIncome(profile.employment?.annualIncome != null ? String(profile.employment.annualIncome) : "");
    setCompanyRegistrationNumber(profile.employment?.companyRegistrationNumber ?? "");
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

  const hasAddress = street.trim() !== "" || city.trim() !== "" || postalCode.trim() !== "" || country.trim() !== "";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const [, , refreshed] = await Promise.all([
        api.updateUserProfile(userId, {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          nationality: nationality.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
        hasAddress
          ? api.updateUserAddresses(userId, [
              { label: "DOMICILE", street: street.trim(), city: city.trim(), postalCode: postalCode.trim(), country: country.trim() },
            ])
          : Promise.resolve(null),
        api.updateUserEmployment(userId, {
          isIndependent,
          employer: !isIndependent ? employer.trim() || undefined : undefined,
          activity: isIndependent ? activity.trim() || undefined : undefined,
          role: !isIndependent ? role.trim() || undefined : undefined,
          sector: sector || undefined,
          seniority: seniority.trim() || undefined,
          annualIncome: annualIncome.trim() !== "" ? Number(annualIncome) : undefined,
          companyRegistrationNumber: isBusiness ? companyRegistrationNumber.trim() || undefined : undefined,
        }),
      ]);
      applyProfile(refreshed);
      toast.success(t("saveSuccess"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return <p className="text-xs text-destructive">{loadError}</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">{t("selfDeclaredNote")}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={firstNameId} className="text-xs text-muted-foreground">{t("firstName")}</Label>
          <Input id={firstNameId} value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={lastNameId} className="text-xs text-muted-foreground">{t("lastName")}</Label>
          <Input id={lastNameId} value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={dobId} className="text-xs text-muted-foreground">{t("dateOfBirth")}</Label>
          <Input id={dobId} type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={nationalityId} className="text-xs text-muted-foreground">{t("nationality")}</Label>
          <Input id={nationalityId} value={nationality} onChange={(e) => setNationality(e.target.value)} disabled={saving} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor={phoneId} className="text-xs text-muted-foreground">{t("phone")}</Label>
          <Input id={phoneId} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
        </div>
      </div>

      <div className="border-t pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3.5" />
          {t("address")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <Label htmlFor={streetId} className="text-xs text-muted-foreground">{t("street")}</Label>
            <Input id={streetId} value={street} onChange={(e) => setStreet(e.target.value)} disabled={saving} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={postalCodeId} className="text-xs text-muted-foreground">{t("postalCode")}</Label>
            <Input id={postalCodeId} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={saving} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={cityId} className="text-xs text-muted-foreground">{t("city")}</Label>
            <Input id={cityId} value={city} onChange={(e) => setCity(e.target.value)} disabled={saving} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <Label htmlFor={countryId} className="text-xs text-muted-foreground">{t("country")}</Label>
            <Input id={countryId} value={country} onChange={(e) => setCountry(e.target.value)} disabled={saving} />
          </div>
        </div>
      </div>

      <div className="border-t pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Briefcase className="size-3.5" />
          {t("employmentTitle")}
        </div>
        <div className="mb-3 flex gap-1.5">
          {([false, true] as const).map((value) => (
            <button
              key={String(value)}
              type="button"
              disabled={saving}
              onClick={() => setIsIndependent(value)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                isIndependent === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {value ? t("independent") : t("employed")}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {isIndependent ? (
            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor={activityId} className="text-xs text-muted-foreground">{t("activity")}</Label>
              <Input id={activityId} value={activity} onChange={(e) => setActivity(e.target.value)} disabled={saving} />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <Label htmlFor={employerId} className="text-xs text-muted-foreground">{t("employer")}</Label>
                <Input id={employerId} value={employer} onChange={(e) => setEmployer(e.target.value)} disabled={saving} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={roleId} className="text-xs text-muted-foreground">{t("role")}</Label>
                <Input id={roleId} value={role} onChange={(e) => setRole(e.target.value)} disabled={saving} />
              </div>
            </>
          )}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{t("sector")}</Label>
            <Select value={sector || undefined} onValueChange={(v) => setSector((v as BusinessSector) ?? "")} disabled={saving}>
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
            <Input id={seniorityId} value={seniority} onChange={(e) => setSeniority(e.target.value)} disabled={saving} />
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
                disabled={saving}
              />
            </div>
          )}
          <div className="col-span-2 flex flex-col gap-1">
            <Label htmlFor={annualIncomeId} className="text-xs text-muted-foreground">{t("annualIncome")}</Label>
            <Input
              id={annualIncomeId}
              type="number"
              min="0"
              step="1"
              value={annualIncome}
              onChange={(e) => setAnnualIncome(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={saving} className="self-start">
        {saving ? <Loader2 className="size-4 animate-spin" /> : t("save")}
      </Button>
    </form>
  );
}

// Référence interne de suivi (cf. ClientManagedWallet côté backend) — PAS une adresse
// blockchain : les dépôts sur les actifs mutualisés (USDT/USDC/XAUT/dEURO) transitent
// par l'adresse commune affichée dans le dialogue "Déposer" (cf. wallet-actions.tsx).
// Provisionnée à la volée au premier chargement de cet écran si elle n'existait pas.
function ManagedWalletRow({ userId }: { userId: string }) {
  const t = useTranslations("Dashboard.profileSection");
  const [wallet, setWallet] = useState<ClientManagedWalletView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .getManagedWallet(userId)
      .then((data) => {
        if (!ignore) setWallet(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : t("genericError"));
      });
    return () => {
      ignore = true;
    };
  }, [userId, t]);

  if (error) return null;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{t("managedWallet")}</span>
      {wallet ? (
        <code className="font-mono text-xs font-medium">{wallet.reference}</code>
      ) : (
        <Skeleton className="h-4 w-24" />
      )}
    </div>
  );
}

export function ProfileSection({ user, wallets }: { user: UserSummary; wallets: WalletRecord[] }) {
  const t = useTranslations("Dashboard.profileSection");
  const tLabels = useTranslations("Dashboard.labels");
  const currencyLabel = useCurrencyLabel();
  const locale = useLocale();
  const memberSinceFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("email")}</span>
          <span className="font-medium">{user.email}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("kycStatus")}</span>
          <Badge variant={kycVariant(user.kycStatus)}>{tLabels(`kycStatus.${user.kycStatus}`)}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("memberSince")}</span>
          <span className="font-medium">{memberSinceFormatter.format(new Date(user.createdAt))}</span>
        </div>

        <div className="border-t pt-3">
          <IdentityForm userId={user.id} />
        </div>

        <div className="border-t pt-3">
          <ManagedWalletRow userId={user.id} />
          <p className="mt-1 text-xs text-muted-foreground">{t("managedWalletNote")}</p>
        </div>

        <div className="border-t pt-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <WalletIcon className="size-3.5" />
            {t("depositAddresses")}
          </div>
          {wallets.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noWallets")}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {currencyLabel(w.currency)} · {CHAIN_LABELS[w.chain]}
                  </span>
                  <code className="truncate font-mono">{w.address.slice(0, 6)}…{w.address.slice(-4)}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
