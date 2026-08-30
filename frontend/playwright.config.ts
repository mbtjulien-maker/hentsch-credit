import { defineConfig, devices } from "@playwright/test";

// Config Playwright — parcours critiques uniquement (login, demande de crédit, dépôt).
// Ne remplace pas les 243 tests unitaires backend : ceux-ci couvrent les calculs
// financiers en détail. Ici on vérifie que l'utilisateur peut réellement dérouler un
// parcours de bout en bout dans un vrai navigateur, contre le vrai backend NestJS.
//
// Nécessite le backend ET le frontend démarrés au préalable, avec la base de données
// seedée (`cd backend && npx prisma db seed`) — cf. tests/e2e/README.md pour le détail
// des comptes de test utilisés (client.verifie@example.com, ChangeMe123!).
export default defineConfig({
  testDir: "./tests/e2e",
  // workers: 1 partout, pas seulement en CI — plusieurs specs se connectent réellement
  // (POST /auth/login) contre le vrai throttle backend (5 req/min, cf. auth.controller.ts).
  // Une exécution parallèle risquerait de cumuler les tentatives de connexion de deux
  // specs différentes dans la même fenêtre et de déclencher un 429 qui n'a rien à voir
  // avec un vrai bug.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // En local, `npm run test:e2e` suppose que `npm run dev` (frontend) et le backend
  // tournent déjà (cf. README) — pas de webServer ici pour ne pas dupliquer un serveur
  // déjà lancé pendant le développement. En CI, le workflow démarre explicitement les
  // deux serveurs avant d'appeler Playwright (cf. .github/workflows/ci.yml).
});
