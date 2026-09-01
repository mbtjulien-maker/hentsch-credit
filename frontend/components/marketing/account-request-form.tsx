"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, type AccountType } from "@/lib/api";

// Formulaire public "Demander l'ouverture d'un compte / être contacté" — la plateforme
// est réservée à une clientèle sur invitation (cf. mentions légales) : aucune
// auto-inscription. Ce formulaire crée seulement une AccountOpeningRequest, en attente
// de validation manuelle du dossier par le back-office (cf. AccountRequestsService) —
// l'accès n'est accordé qu'une fois cette validation faite.
export function AccountRequestForm() {
  const t = useTranslations("AccountRequestForm");
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const messageId = useId();

  const [accountType, setAccountType] = useState<AccountType>("PARTICULIER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isValid = firstName.trim() !== "" && lastName.trim() !== "" && email.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createAccountRequest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
        accountType,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="size-8 text-[#1baf7a]" />
        <p className="font-medium text-foreground">{t("successTitle")}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 text-left shadow-sm sm:p-8"
    >
      <div className="grid gap-2">
        <Label>{t("accountType.label")}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["PARTICULIER", "BUSINESS"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                accountType === type
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/80 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <span className="block font-medium text-foreground">
                {t(`accountType.${type}.title`)}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t(`accountType.${type}.description`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={firstNameId}>{t("firstName")}</Label>
          <Input
            id={firstNameId}
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={lastNameId}>{t("lastName")}</Label>
          <Input
            id={lastNameId}
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={emailId}>{t("email")}</Label>
          <Input
            id={emailId}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={phoneId}>{t("phone")}</Label>
          <Input
            id={phoneId}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={messageId}>{t("message")}</Label>
        <Textarea
          id={messageId}
          placeholder={t("messagePlaceholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground/80">
        {t.rich("disclaimer", {
          link: (chunks) => (
            <Link href="/confidentialite" className="underline underline-offset-2 hover:text-foreground/80">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <Button type="submit" disabled={!isValid || submitting} className="mt-1 self-start">
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {t("submit")}
      </Button>
    </form>
  );
}
