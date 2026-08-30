"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";

// Formulaire public "Demander l'ouverture d'un compte / être contacté" — la plateforme
// est réservée à une clientèle sur invitation (cf. mentions légales) : aucune
// auto-inscription. Ce formulaire crée seulement une AccountOpeningRequest, en attente
// de validation manuelle du dossier par le back-office (cf. AccountRequestsService) —
// l'accès n'est accordé qu'une fois cette validation faite.
export function AccountRequestForm() {
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const messageId = useId();

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
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="size-8 text-[#1baf7a]" />
        <p className="font-medium text-foreground">Votre demande a bien été transmise</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Notre équipe étudie votre dossier et reviendra vers vous par e-mail. L&apos;accès
          à votre espace client n&apos;est accordé qu&apos;une fois cette validation faite.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 text-left shadow-sm sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={firstNameId}>Prénom</Label>
          <Input
            id={firstNameId}
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={lastNameId}>Nom</Label>
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
          <Label htmlFor={emailId}>E-mail</Label>
          <Input
            id={emailId}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={phoneId}>Téléphone (optionnel)</Label>
          <Input
            id={phoneId}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={messageId}>Votre projet (optionnel)</Label>
        <Textarea
          id={messageId}
          placeholder="Montant envisagé, actifs concernés, questions particulières…"
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
        En soumettant ce formulaire, vous acceptez que vos informations soient traitées
        conformément à notre{" "}
        <a href="/confidentialite" className="underline underline-offset-2 hover:text-foreground/80">
          politique de confidentialité
        </a>
        . Aucun compte n&apos;est créé automatiquement : l&apos;accès est accordé après
        étude et validation de votre dossier par notre équipe.
      </p>

      <Button type="submit" disabled={!isValid || submitting} className="mt-1 self-start">
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Envoyer ma demande
      </Button>
    </form>
  );
}
