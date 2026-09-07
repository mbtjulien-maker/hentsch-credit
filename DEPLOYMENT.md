# Guide de mise en production — Hentsch Credit

Document à transmettre à l'équipe technique/infra qui prendra en charge le déploiement sur ses propres serveurs et son propre hébergeur. Il couvre : l'infrastructure requise, les variables d'environnement, la procédure de build/démarrage, et — le plus important — la liste de ce qui est **réellement fonctionnel** vs **simulé/à brancher** avant toute utilisation par de vrais clients avec de vrais fonds.

---

## 1. Architecture & infrastructure requise

- **Backend** : NestJS (TypeScript), Node.js 20+ (développé sous Node 24). Port par défaut 3000.
- **Frontend** : Next.js 16 (App Router), Node 20+. Port par défaut 3001 en dev (`next start` en prod écoute sur le port fourni par la plateforme ou `PORT`).
- **Base de données** : PostgreSQL (14+ recommandé). Géré via Prisma ORM — migrations versionnées dans `backend/prisma/migrations/`.
- **Redis** : mentionné dans les specs internes du projet mais **non branché à ce jour** — aucune dépendance Redis dans le code. Rien à provisionner pour l'instant.
- Aucun `Dockerfile`/`docker-compose.yml` n'existe encore dans le repo principal (seul un sous-projet non lié, `xaf-xof-transfer/`, en a un). Si l'équipe infra du client déploie via conteneurs, il faudra en écrire — je peux le faire sur demande.

## 2. Variables d'environnement

### Backend (`backend/.env`, voir `backend/.env.example`)

| Variable | Rôle | Obligatoire en prod |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL | Oui |
| `PORT` | Port d'écoute | Non (défaut 3000) |
| `NODE_ENV=production` | Mode Node | Oui |
| `JWT_SECRET` | Signature des sessions — **générer une nouvelle valeur** (`openssl rand -hex 32`), jamais réutiliser celle de dev | Oui |
| `FRONTEND_ORIGIN` | Origine autorisée en CORS (URL du site en prod) | Oui |
| `BACKEND_PUBLIC_URL` | URL publique du backend (webhook Mollie) | Si Mollie réel activé |
| `BLOCKCHAIN_WEBHOOK_SIGNING_KEY` | Signature HMAC des webhooks de dépôt on-chain | Oui si webhooks blockchain réels branchés (cf. §3) |
| `COINMARKETCAP_API_KEY` | Cours crypto/métaux en direct | Oui (sinon page Marché vide) |
| `FINNHUB_API_KEY` | Cours des actions (investissement direct) | Oui (sinon dégrade proprement) |
| `MOLLIE_API_KEY` | Rechargement carte réel — vide = mode sandbox simulé | À décider avec le client |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Assistant support IA — vide = assistant affiché indisponible | Optionnel |

### Frontend (`frontend/.env`, voir `frontend/.env.example`)

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL publique du backend |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site (OG/canonical/sitemap) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Vérification Search Console — à créer une fois le domaine réel connu |

## 3. Procédure de build & démarrage

```bash
# Backend
cd backend
npm ci
npx prisma migrate deploy      # applique les migrations, JAMAIS `prisma migrate dev` en prod
npm run build
npm run start:prod             # node dist/main

# Frontend
cd frontend
npm ci
npm run build
npm run start                  # next start
```

À mettre derrière un reverse proxy (nginx/Caddy/Traefik ou l'équivalent géré de l'hébergeur) avec HTTPS (Let's Encrypt ou certificat du client) — le cookie de session est `httpOnly` et le CORS exige `credentials: true`, donc frontend et backend doivent être servis en HTTPS pour que la session fonctionne correctement en prod.

## 4. Base de données — ne PAS lancer le seed de démo

`backend/prisma/seed.ts` crée des comptes de démonstration avec un mot de passe **en clair dans le code source** (`ChangeMe123!`) et un secret TOTP de démo également en clair (`DEV_ADMIN_TOTP_SECRET`). C'est un fixture de développement, jamais destiné à un environnement réel.

En production :
1. Appliquer uniquement les migrations (`prisma migrate deploy`), **pas** `npm run seed` / `prisma db seed`.
2. Créer le premier compte `ADMIN` réel directement en base (script ponctuel, mot de passe fort choisi par le client, hashé avec bcrypt coût 12) puis activer sa 2FA via `/auth/2fa/setup` dès la première connexion — `AdminGuard` exige `twoFactorEnabled=true` pour tout accès back-office.
3. Vérifier qu'aucune donnée de démo (comptes `client.verifie@example.com`, etc.) n'existe sur la base de production.

## 5. Identité légale affichée sur le site

Toutes les pages publiques (mentions légales, CGU, footer, page "À propos") tirent leur contenu d'un seul fichier : [`frontend/lib/entity-identity.ts`](frontend/lib/entity-identity.ts). Il contient actuellement la raison sociale, l'adresse, le numéro de registre du commerce et l'organisme de surveillance transmis lors du développement. **Avant mise en ligne, faire confirmer explicitement par le client que chaque champ de ce fichier est exact et à jour** (numéro RC, organisme de surveillance LBA, adresse) — c'est la source unique, donc une correction s'y fait à un seul endroit.

## 6. ⚠️ Le plus important : ce qui est réel vs simulé

Ce produit a été construit par étapes, et plusieurs briques **affichent un comportement réaliste côté client sans qu'aucun flux réel ne soit branché derrière**. Avant d'exposer la plateforme à de vrais clients avec de vrais fonds, l'équipe du client (technique + conformité) doit examiner et trancher chacun des points suivants :

| Fonctionnalité | État réel |
|---|---|
| **Retraits SEPA/SWIFT** | Aucun rail bancaire n'est branché. Une demande de retrait débite immédiatement le solde et journalise une transaction "complétée", mais **rien n'est réellement transmis à une banque** — cf. `backend/src/withdrawal/`. |
| **Retraits crypto** | Idem : aucune custody réelle (Circle/Fireblocks/DFNS) branchée. Le débit est réel en base, le virement on-chain ne l'est pas. |
| **Dépôts crypto** | Les adresses de dépôt affichées existent réellement pour les actifs listés (cf. `ManagedDepositAddress`), mais leur confirmation se fait par déclaration/webhook — vérifier avec le client que les vraies adresses de garde lui appartiennent bien. |
| **Vérification KYC** | Purement déclarative + téléversement de fichier stocké en base. **Aucun prestataire tiers réel (Sumsub/Onfido) ne vérifie l'authenticité des documents.** La validation finale est un humain (conseiller) qui approuve manuellement. |
| **Cartes bancaires** | Le rechargement de solde par carte (Mollie) est réellement fonctionnel si une clé API est fournie. **L'émission/autorisation de dépense d'une carte Hentsch Credit n'est pas implémentée** (pas d'intégration Stripe Issuing/Marqeta). |
| **Bot de trésorerie RWA** | Simulation (paper trading) à 100 % — aucun ordre réel, aucun fonds réel, capital notionnel fictif. |
| **Rendement/liquidation du gage** | Le calcul est réel et testé (voir suite de tests), basé sur des cours de marché réels, mais n'a **pas été audité par un actuaire/risk manager externe**. |
| **Assistant support IA** | Vraie IA (OpenAI) si une clé est fournie — répond avec un contexte produit, peut se tromper, aucune garantie contractuelle. |

**Recommandation concrète** : ne pas ouvrir l'accès public/réel tant que ces points n'ont pas été validés un par un avec le client (garde crypto réelle, partenaire bancaire pour les rails SEPA/SWIFT, prestataire KYC tiers le cas échéant). Le faire autrement exposerait la banque à des clients qui déposent de vrais fonds sans possibilité réelle de retrait — un risque opérationnel et réputationnel majeur, indépendamment de tout aspect technique.

## 7. Checklist sécurité déjà en place (à vérifier, pas à reconstruire)

- Helmet (en-têtes de sécurité), CSP composée côté frontend (`next.config.ts`)
- Rate limiting (`@nestjs/throttler`, 120 req/min global + 5 req/min sur `/auth/login`)
- 2FA TOTP obligatoire pour tout accès back-office (`AdminGuard`)
- Verrouillage de compte après 5 échecs de connexion (15 min)
- Validation IBAN/BIC structurelle, vérification VAT/SIRET via VIES
- **À faire côté infra client** : rotation de `JWT_SECRET` en prod, sauvegardes automatisées de PostgreSQL, monitoring/alerting, et idéalement un audit de sécurité indépendant avant l'ouverture au public (le projet n'en a pas eu à ce jour).

---

*Généré à la demande du développeur pour accompagner la remise du code à l'équipe du client.*
