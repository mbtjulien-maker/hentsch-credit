import { expect, test } from "@playwright/test";

// Vitrine publique — pas de session requise. Couvre la navigation de base et la bascule
// clair/sombre globale (cf. lib/theme-provider.tsx), qui doit persister après rechargement.
// SiteNav et SiteFooter dupliquent volontairement les mêmes liens (footer = repli mobile,
// cf. site-footer.tsx) : les sélecteurs ci-dessous ciblent explicitement le <header> pour
// éviter les violations de "strict mode" de Playwright sur les liens en double.
test.describe("Vitrine publique", () => {
  test("la page d'accueil affiche le hero et les liens de navigation", async ({ page }) => {
    await page.goto("/");

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Comment ça marche" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Accéder à mon compte" })).toBeVisible();
  });

  test("la navigation vers Tarifs affiche la grille tarifaire réelle", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Tarifs" }).click();

    await expect(page).toHaveURL(/\/tarifs/);
    await expect(page.getByText("350%")).toBeVisible();
    await expect(page.getByText("13,5% USD")).toBeVisible();
  });

  test("la bascule clair/sombre persiste après rechargement", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByRole("button", { name: /Passer en mode/ });
    await expect(toggle).toBeVisible();

    const initialLabel = await toggle.getAttribute("aria-label");
    await toggle.click();

    const htmlHasDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
    const wasDarkBefore = initialLabel?.includes("clair"); // "Passer en mode clair" = on est en sombre
    await expect.poll(htmlHasDark).toBe(!wasDarkBefore);

    await page.reload();
    await expect.poll(htmlHasDark).toBe(!wasDarkBefore);
  });

  test("le plan du site public liste les pages accessibles sans connexion", async ({ page }) => {
    await page.goto("/plan-du-site");

    await expect(page.getByRole("link", { name: "Politique de confidentialité" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Gestion des risques et garde des avoirs" }).first()).toBeVisible();
  });
});
