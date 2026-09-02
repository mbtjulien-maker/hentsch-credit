import { expect, test } from "@playwright/test";

// Parcours de connexion — le garde-fou le plus critique de toute la plateforme (aucune
// opération financière n'est accessible sans lui). Comptes de test : cf.
// backend/prisma/seed.ts (client.verifie@example.com / ChangeMe123!, mot de passe commun
// DEV_PASSWORD à tous les comptes seedés).
const SEEDED_PASSWORD = "ChangeMe123!";

test.describe("Connexion", () => {
  test("un identifiant/mot de passe valide redirige vers le tableau de bord", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill("client.verifie@example.com");
    await page.getByLabel("Mot de passe").fill(SEEDED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    // Vue d'ensemble de l'accueil — exactement 3 soldes (wallet principal, crédit,
    // investissement), cf. HomeBalanceOverview ; "Solde global"/"Gage verrouillé"
    // restent affichés sur /dashboard/solde uniquement (cf. BalanceCards).
    await expect(page.getByText("Solde principal", { exact: true })).toBeVisible();
  });

  test("un mot de passe incorrect affiche une erreur générique, reste sur /login", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill("client.verifie@example.com");
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/login/);
    // Message générique (ni "e-mail inconnu" ni "mot de passe incorrect" séparément) —
    // cf. AuthService.validateCredentials, contre l'énumération de comptes.
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("un compte KYC en attente (PENDING) peut se connecter mais reste bloqué sur les opérations financières", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill("client.pending@example.com");
    await page.getByLabel("Mot de passe").fill(SEEDED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    // AccountMenu affiche ce badge à la fois dans l'en-tête desktop et dans la barre
    // mobile (cf. MobileNav) — .first() cible celui toujours rendu en premier dans le DOM.
    await expect(page.getByText("KYC en attente").first()).toBeVisible();
  });

  test("/dashboard redirige vers /login pour un visiteur non connecté", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
