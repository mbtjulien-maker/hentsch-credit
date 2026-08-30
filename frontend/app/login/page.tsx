"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VaultWatermarkSvg } from "@/components/dashboard/vault-graphics";
import { api, ApiError } from "@/lib/api";

// Connexion réelle — remplace l'ancien UserSwitcher (bascule libre entre comptes de
// démo, incompatible avec une vraie authentification). Après succès, le cookie de
// session httpOnly est posé par le serveur (cf. AuthController.login) ; la redirection
// vers /dashboard déclenche DashboardProvider, qui relit /auth/me pour charger le compte.
export default function LoginPage() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <VaultWatermarkSvg className="h-[550px] w-[550px] -rotate-12 text-muted-foreground/80 opacity-20" />
      </div>

      <Card className="relative z-10 w-full max-w-sm rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="items-center text-center">
          <Image
            src="/brand/hentsch-mark.png"
            alt=""
            width={500}
            height={500}
            className="mb-2 size-12 rounded-xl"
          />
          <CardTitle className="text-lg">Hentsch Credit</CardTitle>
          <CardDescription>Accès réservé aux clients invités.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor={emailId}>E-mail</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={passwordId}>Mot de passe</Label>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={submitting} className="mt-1">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Link
        href="/"
        className="absolute bottom-6 z-10 text-xs text-muted-foreground/80 underline underline-offset-2 hover:text-foreground/80"
      >
        ← Retour à l&apos;accueil
      </Link>
    </div>
  );
}
