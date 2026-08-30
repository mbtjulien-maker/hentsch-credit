# Tests end-to-end (Playwright)

Couvrent les parcours critiques dans un vrai navigateur, contre le vrai backend — en
complément des 243 tests unitaires backend (`cd backend && npx jest`), qui couvrent les
calculs financiers en détail mais jamais l'expérience réelle dans le navigateur.

## Prérequis

1. PostgreSQL démarré et accessible via le `DATABASE_URL` du backend.
2. Backend démarré et migré : `cd backend && npx prisma migrate deploy && npm run start`.
3. Base seedée : `cd backend && npx prisma db seed` — crée notamment
   `client.verifie@example.com` (KYC `VERIFIED`), `client.pending@example.com` (KYC
   `PENDING`) et `admin@hhentsch.com` (rôle `ADMIN`), tous avec le mot de passe
   `ChangeMe123!` (`DEV_PASSWORD` dans `seed.ts`).
4. Frontend démarré : `cd frontend && npm run dev` (port 3001 par défaut).

## Lancer les tests

```bash
cd frontend
npm run test:e2e        # headless
npm run test:e2e:ui     # mode interactif (débogage pas à pas)
```

`PLAYWRIGHT_BASE_URL` permet de cibler un autre port/environnement si besoin
(par défaut `http://localhost:3001`).

## Fichiers

- `auth.spec.ts` — connexion (succès, échec, statut KYC affiché, garde `/dashboard`).
- `admin-gate.spec.ts` — séparation admin/client (`AdminAuthGate`).
- `marketing.spec.ts` — vitrine publique, bascule clair/sombre persistante.

## En CI

Le workflow `.github/workflows/ci.yml` démarre Postgres (service Docker), applique les
migrations, seed la base, démarre backend et frontend, puis lance cette suite — pas de
configuration supplémentaire nécessaire pour reproduire l'environnement CI en local au-delà
des 4 étapes ci-dessus.
