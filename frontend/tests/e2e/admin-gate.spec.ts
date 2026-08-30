import { expect, test } from "@playwright/test";

// Vérifie que la séparation admin/client (cf. AdminAuthGate) fonctionne réellement dans
// un navigateur, pas seulement en lecture de code — un compte CLIENT ne doit jamais voir
// la coquille back-office, même brièvement.
const SEEDED_PASSWORD = "ChangeMe123!";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(SEEDED_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("un compte CLIENT visitant /admin est redirigé vers /dashboard", async ({ page }) => {
  await login(page, "client.verifie@example.com");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("un compte ADMIN peut accéder à /admin", async ({ page }) => {
  await login(page, "admin@hhentsch.com");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
