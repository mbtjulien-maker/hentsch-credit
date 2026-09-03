"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError, loginRequiresTwoFactor } from "@/lib/api";

// Connexion réelle — remplace l'ancien UserSwitcher (bascule libre entre comptes de
// démo, incompatible avec une vraie authentification). Après succès, le cookie de
// session httpOnly est posé par le serveur (cf. AuthController.login) ; la redirection
// vers /dashboard déclenche DashboardProvider, qui relit /auth/me pour charger le compte.
// Composant client séparé de app/[locale]/login/page.tsx (server component) pour que la
// page puisse exporter des métadonnées SEO spécifiques — un "use client" ne peut pas le
// faire. /dashboard fait désormais partie du routage par locale (cf. proxy.ts) : router
// et Link viennent tous les deux de @/i18n/navigation, pas de next/navigation.
//
// Deux étapes possibles : email/mot de passe, puis un code TOTP si le compte (réservé aux
// ADMIN, cf. AuthController) a activé la 2FA — pendingToken prouve que la première étape a
// déjà réussi sans jamais poser de cookie de session avant la seconde, cf. lib/api.ts.
export function LoginForm() {
  const t = useTranslations("LoginForm");
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const codeId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.login(email, password);
      if (loginRequiresTwoFactor(result)) {
        setPendingToken(result.pendingToken);
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
      setSubmitting(false);
    }
  }

  async function handleTwoFactorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingToken) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.twoFactorChallenge(pendingToken, code);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Même photo réelle de coffre-fort que le hero de la vitrine publique et le
          dashboard (cf. app/[locale]/page.tsx, app/[locale]/dashboard/layout.tsx) — mais
          plus nette ici (opacité pleine, pas de voile plat à 78%) : la carte de connexion
          porte déjà son propre fond opaque, seul le dégradé bas assure la lisibilité du
          lien "Retour à l'accueil" posé directement sur la photo (retour client : "moins
          flou et plus net" que le traitement du dashboard). */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/brand/homepage-vault-bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-background/45 to-background/70" />
      </div>

      <Card className="relative z-10 w-full max-w-sm rounded-2xl border border-border/80 bg-card shadow-sm">
        {pendingToken ? (
          <>
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-6" />
              </div>
              <CardTitle className="text-lg">{t("twoFactorTitle")}</CardTitle>
              <CardDescription>{t("twoFactorDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTwoFactorSubmit} className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={codeId}>{t("verificationCode")}</Label>
                  <Input
                    id={codeId}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    autoFocus
                    className="text-center text-lg tracking-[0.5em]"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={submitting || code.length !== 6} className="mt-1">
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {t("verify")}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingToken(null);
                    setCode("");
                    setError(null);
                  }}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  {t("backToLogin")}
                </button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="items-center text-center">
              <Image
                src="/brand/hentsch-mark.png"
                alt=""
                width={500}
                height={500}
                className="mb-2 size-12 rounded-xl"
              />
              <CardTitle className="text-lg">Hentsch Credit</CardTitle>
              <CardDescription>{t("restrictedAccess")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={emailId}>{t("email")}</Label>
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
                  <Label htmlFor={passwordId}>{t("password")}</Label>
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
                  {t("submit")}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>

      <Link
        href="/"
        className="absolute bottom-6 z-10 text-xs text-muted-foreground/80 underline underline-offset-2 hover:text-foreground/80"
      >
        {t("backToHome")}
      </Link>
    </div>
  );
}
