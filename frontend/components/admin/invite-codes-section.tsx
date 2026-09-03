"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError, type AccountType, type InviteCode, type InviteCodeStatus } from "@/lib/api";
import { formatDate } from "@/lib/format";

function statusVariant(status: InviteCodeStatus): "default" | "secondary" | "destructive" {
  if (status === "ACTIVE") return "default";
  if (status === "USED") return "secondary";
  return "destructive";
}

function statusLabel(status: InviteCodeStatus): string {
  if (status === "ACTIVE") return "Actif";
  if (status === "USED") return "Utilisé";
  return "Expiré";
}

// Génération à la demande pour une invitation individuelle (cf. §6 CLAUDE.md entrée #40)
// — jamais un lot automatique : un conseiller génère un code pour un client précis, dont
// il connaît déjà le profil (accountType fixé ici), puis le transmet hors-bande (aucun
// service d'e-mail branché sur ce projet). Remplace le formulaire public "Demander
// l'ouverture d'un compte" comme point d'entrée réel.
export function InviteCodesSection() {
  const [codes, setCodes] = useState<InviteCode[] | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("PARTICULIER");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState<InviteCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refetch() {
    api
      .listInviteCodes()
      .then(setCodes)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      });
  }

  useEffect(() => {
    refetch();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const created = await api.generateInviteCode({
        accountType,
        note: note.trim() || undefined,
      });
      setJustGenerated(created);
      setNote("");
      refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          Codes d&apos;invitation
        </CardTitle>
        <CardDescription>
          Générez un code pour un client à inviter — usage unique, valable 24h. Le client
          le saisit sur la page publique d&apos;accès pour créer son compte lui-même.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {justGenerated && (
          <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              Code généré — transmettez-le au client par un canal sécurisé (téléphone,
              e-mail...), valable jusqu&apos;au {formatDate(justGenerated.expiresAt)}.
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <code className="flex-1 text-sm font-semibold tracking-wide">{justGenerated.code}</code>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => handleCopy(justGenerated.code)}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Type de compte</label>
            <Select value={accountType} onValueChange={(v) => v && setAccountType(v as AccountType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTICULIER">Particulier</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Repère interne (optionnel, jamais montré au client)
            </label>
            <Input
              placeholder="ex. Jean Dupont, contact du 02/09"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button type="button" disabled={generating} onClick={() => void handleGenerate()}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Générer un code
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          {codes?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun code généré pour l&apos;instant.</p>
          )}
          {codes?.slice(0, 10).map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <code className="font-medium tracking-wide">{c.code}</code>
                <Badge variant="outline" className="text-[10px]">
                  {c.accountType === "BUSINESS" ? "Business" : "Particulier"}
                </Badge>
                {c.note && <span className="text-xs text-muted-foreground">« {c.note} »</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {c.status === "USED" ? "Utilisé le" : "Expire le"}{" "}
                  {formatDate(c.status === "USED" ? c.usedAt! : c.expiresAt)}
                </span>
                <Badge variant={statusVariant(c.status)}>{statusLabel(c.status)}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
