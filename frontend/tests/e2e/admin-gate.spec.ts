import { generate } from "otplib";
import { expect, test } from "@playwright/test";

// Vérifie que la séparation admin/client (cf. AdminAuthGate) fonctionne réellement dans
// un navigateur, pas seulement en lecture de code — un compte CLIENT ne doit jamais voir
// la coquille back-office, même brièvement.
const SEEDED_PASSWORD = "ChangeMe123!";

// Secret TOTP fixe du compte admin de démo (cf. DEV_ADMIN_TOTP_SECRET, backend/prisma/seed.ts)
// — la 2FA est désormais obligatoire pour tout accès back-office (cf. AdminGuard), donc ce
// compte ne peut plus se connecter en une seule étape comme un compte CLIENT.
const ADMIN_TOTP_SECRET = "PWVYTOPKBCVRGSRT4YCNT3YC7QQDUGXZ";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(SEEDED_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@hhentsch.com");
  await page.getByLabel("Mot de passe").fill(SEEDED_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page.getByText("Vérification en deux étapes")).toBeVisible();
  const code = await generate({ secret: ADMIN_TOTP_SECRET });
  await page.getByLabel("Code de vérification").fill(code);
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("un compte CLIENT visitant /admin est redirigé vers /dashboard", async ({ page }) => {
  await login(page, "client.verifie@example.com");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("un compte ADMIN peut accéder à /admin (après la 2FA, désormais obligatoire)", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
