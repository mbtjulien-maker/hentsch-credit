# SPÉCIFICATIONS TECHNIQUES DU PROJET : PLATEFORME BANCAIRE CRYPTO-CRÉDIT  
  
## 1. VISION DU PROJET & CONTEXTE  
Développement d'une plateforme Web bancaire d'octroi de crédit crypto-collatéralisé.  
La plateforme est gérée de manière CUSTODIALE par une institution bancaire. Elle permet à des clients vérifiés (KYC) de déposer des stablecoins en garantie pour débloquer automatiquement une capacité d'achat / ligne de crédit utilisable en interne et sur carte bancaire.  
  
---  
  
## 2. RÈGLES MÉTIER ET FORMULES FINANCIÈRES  
  
### A. Collateral & Crédit (Gage en Stablecoins, Or Tokenisé et Cryptomonnaies)  
- **Nature des gages acceptés (mise à jour) :** DAI, USDT, USDC (stablecoins, valorisés 1:1 USD) ; dEURO (stablecoin indexé sur l'euro, valorisé au cours spot en direct) ; XAUT, KAG (or et argent tokenisés, valorisés au cours spot en direct) ; XPT, XPD, XCU, WTI (métaux industriels et matières premières tokenisés — platine, palladium, cuivre, pétrole synthétique — valorisés au cours spot en direct, issus de la feuille de route "Stratégie d'Investissement & Rendements RWA Métaux") ; ETH, SHIB (cryptomonnaies natives, valorisées au cours spot en direct). Réseau Ethereum uniquement pour l'instant (Polygon/Arbitrum/TRON/Solana retirés du sélecteur). USDS/USDe/PYUSD/PAXG restent en base pour les comptes existants mais ne sont plus proposés au dépôt.  
- **Rendement indexé du gage (mise à jour) :** les métaux précieux (XAUT, KAG), ETH, et les métaux industriels/matières premières tokenisés (XPT, XPD, XCU, WTI) sont éligibles au remboursement automatique du crédit par leur plus-value réelle, plafonné à 60% du crédit émis sur la position (les 40% restants se remboursent par apport personnel). Les métaux industriels/matières premières portent en plus un **objectif de rendement indicatif de 8 à 14% APY**, propre à la stratégie de trésorerie de la banque sur ces actifs (arbitrage cash & carry, collatéralisation/prêt triangulaire, apport de liquidité) — un objectif affiché au client à titre informatif, jamais une garantie, sans aucun effet sur le calcul du crédit.  
- **Ratio de Crédit :** **350% du montant mis en gage** au moment du verrouillage (mise à jour — était 200%, avant cela 150%, avant cela 75%). Ce taux s'applique à chaque nouveau verrouillage ; une position déjà verrouillée sous un taux antérieur conserve le crédit qui lui a été accordé à l'époque (pas de recalcul rétroactif).  
- **Structure de taux et frais (valeurs réellement appliquées, cf. `backend/src/credit/rate.constants.ts`, single source of truth) :**  
  - Taux d'intérêt annuel : **13,5 %** en USD (SOFR de référence 5,0 % + prime de risque 8,5 points), **12,0 %** en EUR (EURIBOR de référence 3,5 % + même prime de risque). Prime calibrée sur le sur-risque du ratio 350 % (contre 50-80 % pour un prêt crypto classique). Taux de référence figés en constante, pas un flux live.  
  - Frais d'origination : **2,0 %** du crédit émis, prélevés une fois au verrouillage.  
  - Frais de garde du collatéral : **0,5 % par an**, affichés/simulés (accrual quotidien réel non implémenté à ce stade).  
  - Durée de position par défaut : **12 mois**.  
  - Ces valeurs sont dupliquées côté frontend (page publique `/tarifs`, panneau admin `/admin/algorithme`) à partir de cette même source ; toute modification doit être répercutée aux deux endroits.  
- **Calcul du Pouvoir d'Achat Global :**  
  `Pouvoir d'Achat Total = Solde Disponible + Gage Verrouillé + Crédit Accordé - Crédit Utilisé`  
  (Crédit Accordé = somme des crédits réellement émis à date, pas `Gage Verrouillé × taux courant` — le taux peut changer dans le temps.)  
  
### B. Exemple de scénario financier :  
- Dépôt / Gage du client : 2 000 $.  
- Crédit accordé par la banque (350%) : 7 000 $.  
- Capacité d'achat totale sur le compte : 9 000 $.  
  
### C. Règles de Retrait & Sécurité :  
- Le `Gage Verrouillé` (ex: 2 000 $) ne peut pas être retiré tant que le `Crédit Utilisé` n'est pas intégralement remboursé.  
- Formule du `Solde Retirable` :  
  `Solde Retirable = Solde Disponible (hors gage bloqué)`  
- **Méthodes de retrait** (`WithdrawalService`, cf. `backend/src/withdrawal/`) : **CRYPTO** (adresse on-chain, réseau + devise, inchangé depuis le début du projet) ; **SEPA** (virement zone euro — EUR uniquement, IBAN dans un pays de la zone SEPA) ; **SWIFT** (virement international — toute devise, tout pays). L'IBAN/BIC est validé structurellement (format par pays + clé de contrôle ISO 7064 MOD-97-10, cf. `src/common/iban.util.ts`, appuyé sur le paquet `validator`) mais **aucune vérification d'existence réelle du compte** n'est effectuée (nécessiterait un service tiers type GoCardless Bank Account Data, non branché). Comme pour CRYPTO (aucune custody réelle branchée), **aucun rail bancaire réel n'exécute le virement** : la demande débite immédiatement le solde disponible et journalise une `Transaction` `WITHDRAWAL` `COMPLETED`, exactement comme un virement bancaire classique débite instantanément le compte même si le règlement final prend du temps — mais rien n'est réellement transmis à une banque tant qu'aucun partenaire bancaire/PSP n'est intégré.  
  
### D. Moteur de liquidation (`LiquidationService`, cf. `backend/src/credit/liquidation.service.ts`) :  
Couvre le sens inverse du rendement automatique (§2A) : si la valeur d'un gage volatil (métaux précieux, ETH, métaux industriels tokenisés) s'effondre après verrouillage, rien ne le corrigeait jusqu'ici. Dépréciation mesurée par rapport à la **valeur d'entrée du gage** (`collateralAmount`, figée au verrouillage), jamais par rapport au crédit utilisé — cohérent avec la non-rétroactivité déjà en vigueur pour le ratio de crédit.  
- **Seuil d'alerte : 30 %** de dépréciation depuis l'entrée → `CreditPosition.liquidationWarning = true` (purement informatif, aucun effet sur le ledger, réversible si le cours se redresse).  
- **Seuil de liquidation : 50 %** de dépréciation → liquidation automatique : le gage (à sa valeur d'entrée) est retiré du bilan (`lockedCollateral` et `grantedCredit` décrémentés), la position passe au statut **`LIQUIDATED`** (nouvel état terminal, distinct de `CLOSED`), et une `Transaction` de type **`LIQUIDATION`** est journalisée.  
- **Point clé pour l'audit :** le crédit déjà utilisé (`usedCredit`) n'est **jamais effacé** par une liquidation — il reste dû par le client et devient une exposition non garantie pour la banque (le gage qui le sécurisait a perdu l'essentiel de sa valeur). Ceci doit être reflété dans les CGU (cf. section "Actifs acceptés en garantie / Liquidation").  
- Tourne quotidiennement (cron 2h du matin, décalé du rendement à 1h du matin) ; déclenchable manuellement en back-office.  
  
### E. Bot de trésorerie — SIMULATION UNIQUEMENT (`TreasuryBotService`, cf. `backend/src/treasury-bot/`) :  
Paper trading reproduisant les 3 piliers de la feuille de route "Stratégie d'Investissement & Rendements RWA Métaux" (arbitrage cash & carry, collatéralisation/prêt triangulaire, apport de liquidité) sur un capital notionnel de 10 M$. Le rendement quotidien de chaque pilier dérive de la vraie variation de marché du panier XPT/XPD/XCU/WTI (pas d'aléatoire), avec une sensibilité croissante par pilier (4-7 % / 6,5-10 % / 9-15 % de cible annuelle). **Aucun ordre réel n'est jamais passé, aucun fonds ne bouge, aucune connexion à un exchange ou wallet réel** — table `TreasuryBotRun`, entièrement séparée du ledger et de tout compte client. Réservé au back-office (`/admin/algorithme`), jamais exposé au client à ce stade.  
  
### F. Simulateurs client (aucun effet sur le ledger, purement illustratifs) :  
- **Projection de remboursement flexible** (`RepaymentProjection`) : rendement annuel estimé (calculé automatiquement à partir de la performance réelle sur 12 mois des actifs générateurs de rendement, cf. `useEstimatedYield`, **affiché en lecture seule, non modifiable par le client**) + apport externe mensuel (suggéré automatiquement pour rembourser dans les 12 mois contractuels, celui-ci reste modifiable à la baisse pour explorer un remboursement plus lent : c'est un choix du client, pas une hypothèse de marché).  
- **Simulation à échéances fixes** (`InstallmentSchedule`) : mensualité fixe façon amortissement classique sur une durée choisie (6/12/24/36 mois), réduite par le même rendement estimé automatique **(lecture seule, non modifiable)**, plafonné à 60 % de la mensualité (même plafond que §2A). Indique aussi la date du premier remboursement (mois suivant l'émission) avec le rappel que, s'agissant d'une ligne de crédit et non d'un prêt versé en une fois, aucun remboursement n'est réellement dû tant que le crédit n'est pas utilisé.  
  
### G. Comptes business & Crédit direct (`DirectCreditService`, cf. `backend/src/direct-credit/`)  
La plateforme sert deux publics : les particuliers (gage crypto → crédit, §2A, inchangé) et les entreprises/startups/indépendants voulant financer un **projet professionnel uniquement**. Le type de compte (`AccountType` : `PARTICULIER`/`BUSINESS`) est choisi par le demandeur dans le formulaire public "Demander l'ouverture d'un compte" et fixé définitivement à l'approbation (pas de bascule après coup). Un compte `BUSINESS` garde l'accès au crédit gagé crypto **et** débloque en plus le crédit direct — les deux options cohabitent, ce n'est jamais l'un ou l'autre.  
- **Crédit direct = non gagé**, réservé aux comptes `BUSINESS` (`BusinessAccountGuard` + `KycVerifiedGuard`, même exigence d'identité vérifiée que le crédit gagé). Décision **automatique** à la soumission (pas de file d'attente admin) : cinq critères déclaratifs, **tous obligatoires** —  
  1. Ancienneté de l'entreprise ≥ 3 mois (volontairement bas pour ne pas exclure les startups explicitement visées — le vrai filtre "stade idée" est le critère 2).  
  2. Revenu mensuel déclaré ≥ 3 000 $ / 2 800 €.  
  3. Montant demandé ≤ 8× le revenu mensuel déclaré.  
  4. Ratio d'endettement (mensualité estimée / revenu net déclaré) ≤ 35 % — revenu net nul ou négatif échoue automatiquement (pas de division par zéro).  
  5. Garantie de remboursement proposée ≥ 20 % du montant demandé — **déclarative, ni verrouillée ni vérifiée** (contrairement au gage crypto : aucun flux de dépôt de garantie n'est construit à ce stade).  
- **Toutes les données évaluées sont auto-déclarées par le client, jamais vérifiées par un tiers** (aucun fournisseur de vérification de revenus ou de registre du commerce n'est branché) — rappelé explicitement dans l'interface client, pas seulement en interne.  
- **Taux** : même brique que le crédit gagé (taux de référence SOFR/EURIBOR figé, `BASE_RATE_PCT`) mais une prime de risque plus élevée (10,0 pts, contre 8,5 pts pour le gagé) reflétant l'absence de collatéral verrouillé — 15,0 %/an en USD, 13,5 %/an en EUR. Frais d'origination 3,0 % (contre 2,0 % gagé). Durée 12 mois.  
- **`eligible` n'émet aucun crédit** : c'est une réponse informative (transparente — chaque critère affiche sa valeur observée et son seuil, jamais un booléen opaque), cohérent avec le reste du produit où aucune émission de crédit ne se fait sans une étape humaine ou un actif réellement verrouillé. La suite du parcours (garantie réellement déposée, émission effective) n'est pas construite à ce stade.  
  
---  
  
## 3. ARCHITECTURE TECHNIQUE & STACK COMPLÈTE  
  
### Backend & Base de données :  
- **Framework :** NestJS (TypeScript) ou FastAPI (Python).  
- **ORM & DB :** Prisma ORM avec PostgreSQL (Intégrité ACID stricte, type Decimal pour les montants financiers).  
- **Cache & Verrous :** Redis (gestion des verrous distribués lors des transactions financières simultanées).  
  
### Frontend :  
- **Framework :** Next.js (App Router, TypeScript).  
- **UI & Style :** Tailwind CSS, Shadcn UI, Lucide Icons.  
  
### Partenaires & Integrations API (Infrastructures Tiers) :  
- **Wallets & Custody :** API Circle / DFNS / Fireblocks (génération des adresses de dépôt et sécurisation des clés MPC).  
- **Cartes Visa/Mastercard :** API Stripe Issuing / Marqeta (Just-In-Time Authorization Webhooks) — voir STEP 4, non implémenté à ce stade.  
- **Rechargement de solde par carte bancaire :** API Mollie (`backend/src/payments/mollie.service.ts`), réellement implémenté et testé — voir STEP 4. Distinct de l'autorisation JIT ci-dessus : ceci recharge le `availableBalance` du client (`CARD_TOPUP`), ce n'est pas l'émission/autorisation d'une carte Hentsch Credit.  
- **Conformité & KYC :** API Sumsub / Onfido (statuts: PENDING, VERIFIED, REJECTED).  
- **Blockchain Listeners :** Alchemy / QuickNode Webhooks pour la détection en temps réel des dépôts on-chain.  
- **Données de marché :** API publique CoinGecko (`backend/src/market-data/market-data.service.ts`), réellement implémenté et testé — cours en direct, plus haut/bas 24h, mini-graphique 7 jours, historique 12 mois, logos, taux de change EUR/USD (dérivé du prix du Bitcoin en USD et en EUR via `/exchange_rates`). Aucune clé requise ; le service se dégrade gracieusement (dernières données en cache, ou vide) en cas de panne plutôt que d'échouer bruyamment. Un essai de CoinMarketCap (§6, entrée 15) a été abandonné et le service est revenu à CoinGecko (§6, entrée 17) — le mapping devise → identifiant CoinGecko est dans `market-data.constants.ts`.  
  
---  
  
## 4. SCHÉMA DE BASE DE DONNÉES (état réel, `backend/prisma/schema.prisma` fait foi)  
  
- **User :** id, email, passwordHash, kycStatus (PENDING, VERIFIED, REJECTED), role (CLIENT, ADMIN), **accountType (PARTICULIER, BUSINESS — cf. §2G, fixé à l'ouverture du compte)**, createdAt.  
- **Wallet :** id, userId, chain, address, currency (une des valeurs `AcceptedCurrency`, cf. §2A).  
- **ManagedDepositAddress :** adresse de dépôt mutualisée par (chain, currency) — pas propre à un client ; validation manuelle du dépôt déclaré (cf. `DepositIntentsModule`).  
- **ClientManagedWallet :** référence de suivi interne "façon numéro de compte" (`CW-XXXXXXXX`), pas une adresse blockchain.  
- **LedgerBalance :** id, userId, availableBalance, lockedCollateral, grantedCredit, usedCredit.  
- **CreditPosition :** id, userId, collateralAmount, creditIssued, status (ACTIVE, CLOSED, **LIQUIDATED**), currency (USD/EUR), exchangeRateAtLock, creditIssuedInCurrency, interestRatePct, originationFeePct/Amount, custodyFeePct, termMonths, maturityDate, collateralCurrency, collateralTokenAmount, collateralEntryPriceUsd, collateralYieldAppliedPriceUsd (cliquet), yieldRepaidAmount (cumul remboursé par rendement, plafonné à 60% de creditIssued), **liquidationWarning** (alerte à 30% de dépréciation, cf. §2D), createdAt.  
- **CreditRequest :** id, userId, collateralAmount, currency, status (PENDING, APPROVED, REJECTED, FULFILLED), collateralCurrency, creditPositionId.  
- **DirectCreditRequest (cf. §2G) :** id, userId, companyName, registrationNumber, sector, companySeniorityMonths, projectDescription, requestedAmount, currency, declaredMonthlyRevenue, declaredMonthlyExpenses, guaranteeOffered, decision (ELIGIBLE, INELIGIBLE — calculé à la création, pas de statut PENDING), eligibilityBreakdown (JSON, détail des 5 critères), estimatedRatePct, estimatedMonthlyPayment, createdAt.  
- **Card :** id, userId, externalCardId, status, creditLimit.  
- **Transaction :** id, userId, type (DEPOSIT, COLLATERAL_LOCK, CREDIT_ISSUED, CARD_PAYMENT, REPAYMENT, WITHDRAWAL, ORIGINATION_FEE, INTEREST_PAYMENT, CARD_TOPUP, YIELD_REPAYMENT, **LIQUIDATION**), amount, status, currency, tokenAmount, chain, destinationAddress (adresse on-chain pour un retrait CRYPTO, IBAN pour SEPA/SWIFT), referenceTx, **withdrawalMethod** (CRYPTO/SEPA/SWIFT, cf. §2C), **withdrawalCurrency** (USD/EUR, retraits bancaires uniquement), **bankAccountHolder**, **bankBic**.  
- **TreasuryBotRun :** id, runDate (unique), pillarA/B/CReturnPct, blendedReturnPct, marketSignalPct, notionalCapitalUsd, dailyPnlUsd, cumulativeNavUsd — simulation uniquement (cf. §2E), aucune relation avec User/LedgerBalance.  
- **AccountOpeningRequest, ClientProfile, Address, Employment, FinancialSnapshot, ClientNote :** fiche client back-office (KYC, coordonnées, situation professionnelle/financière), cf. `AdminClientsModule`. `AccountOpeningRequest` porte aussi **accountType** (choisi par le demandeur, propagé tel quel au `User` créé à l'approbation).  
  
---  
  
## 5. ROADMAP ET ORDRE D'EXÉCUTION DU DÉVELOPPEMENT  
  
Le projet doit être construit dans l'ordre chronologique strict suivant :  
  
### STEP 1 : Initialisation & Modélisation de la Base de Données  
- Initialiser le projet Monorepo / Backend.  
- Créer le schéma Prisma complet avec toutes les contraintes financières (types `Decimal`).  
- Générer les migrations PostgreSQL et créer un script de seed de test.  
  
### STEP 2 : Moteur de Registre (Master Ledger) & Moteur de Crédit (Core Service)  
- Développer le service de tenue de comptes (`LedgerService`).  
- Développer le `CreditEngineService` :  
  - Fonction `lockCollateralAndIssueCredit(userId, collateralAmount)`.  
  - Fonction `repayCreditAndUnlockCollateral(userId, amount)`.  
- Écrire des **tests unitaires à 100%** avec Jest sur tous les calculs financiers et scénarios d'erreurs.  
  
### STEP 3 : Module Wallet & Webhooks de Dépôt  
- Créer l'intégration Sandbox pour générer des adresses de dépôt USDT/USDC (via `viem` / `ethers` en Testnet ou SDK Circle).  
- Développer le Webhook de réception de paiement `POST /webhooks/blockchain-deposit` pour créditer le solde disponible du client après confirmation.  
  
### STEP 4 : Module de Cartes Visa/Mastercard (Authorization Engine) — ⚠️ partiel  
- Fait : `CardsService`/`CardsController` (`GET /users/:userId/cards`), modèle `Card` en base.  
- Fait (trouvé non documenté lors de l'audit du 30 août 2026, cf. §6 entrée 13) : **rechargement du solde par carte bancaire réellement fonctionnel** via Mollie (`PaymentsModule`, `POST /payments/card-topup`, `POST /payments/mollie-webhook`), couvert par tests. Sans `MOLLIE_API_KEY` configurée, bascule automatiquement en mode sandbox (paiement simulé, même logique de confirmation). Le webhook ne fait jamais confiance au corps de la requête Mollie : il re-vérifie le statut du paiement via un appel API authentifié avant de créditer le compte.  
- **Pas fait** : intégration webhook d'autorisation JIT (Stripe Issuing/Marqeta) ni contrôle de solde en temps réel à l'autorisation d'une dépense carte — `CARD_PAYMENT` existe comme type de `Transaction` mais n'est déclenché par aucun flux réel. À prioriser avant tout audit portant sur l'usage effectif de la carte en dépense (le rechargement, lui, est réel).  
  
### STEP 5 : Module KYC & Rôles d'Accès — ✅ appliqué (`KycVerifiedGuard`, cf. §6 entrée 12)  
- Garde-fous : génération de wallet, dépôt et octroi de crédit bloqués si `kycStatus !== VERIFIED` (`POST /credit-requests`, `POST /credit-requests/:id/deposit-address`, `POST /wallets/deposit-address`), statut relu en base à chaque requête.  
  
### STEP 6 : Interface Utilisateur Web (Dashboard Next.js)  
- Écran Dashboard : Solde Global ($5 000 $), Carte de Gage ($2 000 $), Carte de Crédit ($3 000 $).  
- Formulaire interactif de demande de crédit avec calcul dynamique en direct.  
- Section de gestion et émission de carte virtuelle.  
- Historique détaillé des transactions financiers.  
  
### STEP 7 : Extensions post-roadmap (au-delà du plan initial ci-dessus)  
- **Vitrine publique multi-pages** : accueil (hero + teasers) et pages dédiées `/comment-ca-marche`, `/rendement`, `/strategie-rwa`, `/marche`, `/tarifs`, `/demande-de-compte`, plus les pages légales (`/mentions-legales`, `/conditions-generales`, `/confidentialite`, `/reglementation`).  
- **Moteur de liquidation** (§2D) et **bot de trésorerie en simulation** (§2E) — cf. `/admin/algorithme`, vue interne qui décompose tout l'algorithme de crédit composant par composant, avec ses pistes d'amélioration documentées.  
- **Simulateurs client** à calcul entièrement automatique (§2F) — aucun champ laissé à deviner par le client (rendement, mensualité et date de premier remboursement tous calculés).  
- **Comptes business & crédit direct** (§2G) — deuxième public (entreprises/startups/pros), moteur d'éligibilité automatique à 5 critères, espace client à deux profils (particulier/business).  
- **Durcissement sécurité** : `helmet`, limitation de débit (`@nestjs/throttler`, 120 req/min global + 5 req/min sur `/auth/login`), en-têtes de sécurité Next.js (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), suppression des métadonnées/scaffolding par défaut.  
- **Couverture de tests** : 243/243 tests backend passants (Jest) à la date du dernier changement documenté ici — cf. §6 pour le détail des ajouts.  
  
---  
  
## 6. JOURNAL DES MODIFICATIONS (grand livre du projet — trace d'audit)  
  
Historique des changements de règles métier significatifs, dans l'ordre chronologique. Toute position déjà verrouillée sous une règle antérieure conserve les conditions de son époque (non-rétroactivité, principe constant depuis le début du projet) : ce journal documente l'évolution des règles appliquées aux **nouveaux** verrouillages/mécanismes, jamais un recalcul du passé.  
  
| # | Changement | Détail |  
|---|---|---|  
| 1 | Ratio de crédit initial | 75% du gage |  
| 2 | Ratio de crédit | 75% → 150% |  
| 3 | Ratio de crédit | 150% → 200% |  
| 4 | Ratio de crédit (valeur actuelle) | 200% → **350%** |  
| 5 | Extension des actifs acceptés | Ajout ETH, SHIB, puis KAG (argent tokenisé, Kinesis Silver) |  
| 6 | Extension des actifs acceptés (RWA industriels) | Ajout XPT (platine), XPD (palladium), XCU (cuivre), WTI (pétrole synthétique) — issus de la feuille de route "Stratégie d'Investissement & Rendements RWA Métaux" |  
| 7 | Rendement indexé du gage | Introduction du remboursement automatique par plus-value réelle, plafonné à 60% du crédit émis (40% restants par apport personnel) |  
| 8 | Objectif indicatif RWA | Ajout d'un objectif de rendement indicatif 8-14% APY sur les actifs RWA industriels uniquement (jamais une garantie, jamais appliqué au calcul du crédit) |  
| 9 | Moteur de liquidation | Introduction des seuils d'alerte (30%) et de déclenchement (50%) de dépréciation, statut `LIQUIDATED`, transaction `LIQUIDATION` |  
| 10 | Bot de trésorerie | Introduction de la simulation (paper trading) des 3 piliers de la feuille de route RWA — aucun ordre réel, aucun fonds réel |  
| 11 | Simulateurs client | Passage d'un rendement estimé saisi manuellement par le client à un calcul automatique basé sur la performance réelle sur 12 mois (cf. §2F) |  
| 12 | Correction d'un écart de conformité (§5) | `KycVerifiedGuard` : le blocage de la génération de wallet, du dépôt et de l'octroi de crédit pour KYC non vérifié était documenté depuis le début du projet (§5) mais jamais réellement appliqué en base — aucune vérification de `kycStatus` n'existait dans le chemin `credit-requests`/`wallet`. Guard ajouté et câblé sur `POST /credit-requests`, `POST /credit-requests/:id/deposit-address` et `POST /wallets/deposit-address`, relisant le statut en base à chaque requête (pas de confiance en un statut porté par le JWT, qui ne contient que id/role). Trouvé et corrigé lors de la préparation de ce journal pour audit. |  
| 13 | Audit du 30 août 2026 — intégration Mollie non documentée (§3, STEP 4) | `PaymentsModule`/`MollieService` (rechargement du solde par carte, `CARD_TOPUP`) existait déjà, entièrement implémenté et testé, mais n'apparaissait dans aucune section de ce document (§3 ne listait que Stripe Issuing/Marqeta pour les cartes). Guards vérifiés corrects (`JwtAuthGuard` + `assertSelfOrAdmin` sur les routes authentifiées ; le webhook public ne fait jamais confiance au corps de la requête, il re-vérifie le statut via un appel API Mollie authentifié). Aucun code changé : correction documentaire uniquement. |  
| 14 | Rendement estimé des simulateurs — retour en lecture seule (§2F) | Le champ "Rendement annuel estimé (%)" de `RepaymentProjection` et `InstallmentSchedule` était modifiable par le client depuis l'entrée 11 de ce journal (passage au calcul automatique, mais laissé éditable). Décision produit : ce n'est pas au client de fixer une hypothèse de marché, seul l'apport externe (un choix qui lui appartient réellement) reste modifiable. Champ converti en simple affichage (plus de `<Input>`), toujours calculé par `useEstimatedYield` à partir de la performance réelle sur 12 mois. |  
| 15 | Fournisseur de données de marché — CoinGecko → CoinMarketCap | Décision produit ("remplacer CoinGecko par un autre plus esthétique") : `MarketDataService` interroge désormais l'API CoinMarketCap (clé gratuite requise, `COINMARKETCAP_API_KEY`) au lieu de l'API publique CoinGecko (sans clé). Mapping devise → identifiant vérifié un par un avant migration (`market-data.constants.ts`), y compris pour les jetons RWA industriels tokenisés (Dinari/Ondo) qui n'ont d'équivalent direct sur aucune des deux plateformes. Deux champs abandonnés, documentés au moment de la migration : plus haut/bas 24h (absent de l'API CoinMarketCap gratuite) et mini-graphique 7 jours (aucun champ sparkline documenté) — l'attribution obligatoire passe d'un badge logo à un lien texte, plus sobre. Écart de couverture assumé sur le cuivre (XCU) : le jeton CoinMarketCap le plus proche suit un ETF de mineurs de cuivre (COPXon) plutôt que l'indice futures cuivre pur (CPERon) utilisé jusqu'ici — à surveiller pour `CollateralYieldService`. Le taux de change EUR/USD, auparavant obtenu via un endpoint CoinGecko dédié (`/exchange_rates`), reste un appel dédié côté CoinMarketCap — l'idée initiale de le fusionner dans l'appel groupé de tous les cours (`convert=USD,EUR`) s'est heurtée à une limite du plan gratuit (une seule devise de conversion par appel) ; l'appel dédié final reste néanmoins minimal (un seul actif, le Tether, converti en EUR). |  
| 16 | Correction d'un bug de cache partagé sur l'historique de rendement | `MarketDataService.getYieldAssetHistory` mettait en cache un seul tableau `entries` pour le dernier appel reçu, partagé entre tous les appelants. Deux appelants avec des listes de devises différentes (la vitrine "/rendement", 4 actifs, vs le simulateur de crédit client, les 8 actifs de `YIELD_ELIGIBLE_CURRENCIES`) se volaient mutuellement le cache pendant 6h (`HISTORY_CACHE_TTL_MS`) sans qu'aucune erreur ne le signale. Corrigé par un cache par actif (`Map<AcceptedCurrency, {entry, fetchedAt}>`), qui mutualise en prime les actifs communs aux deux appels au lieu de les refetcher deux fois. Un nouvel endpoint `GET /market/yield-history-full` (les 8 actifs) a été ajouté à cette occasion pour que le simulateur de crédit ne se limite plus aux 4 actifs de la vitrine. Régression couverte par un test dédié. |  
| 17 | Fournisseur de données de marché — retour CoinMarketCap → CoinGecko | Décision produit inverse de l'entrée 15 : l'essai CoinMarketCap est abandonné, `MarketDataService` revient à l'API publique CoinGecko (sans clé, `COINMARKETCAP_API_KEY` retirée de `.env.example`). Les deux champs perdus lors du passage à CoinMarketCap sont restaurés nativement : plus haut/bas 24h et mini-graphique 7 jours (composant `Sparkline`, `frontend/components/dashboard/sparkline.tsx`, recréé à l'identique) ; l'attribution repasse du lien texte au badge logo CoinGecko. Le mapping cuivre (XCU) retrouve au passage l'indice futures pur (au lieu de l'ETF de mineurs, écart assumé pendant l'essai CoinMarketCap) — CoinGecko le référence directement. Le cache par actif de l'historique 12 mois introduit à l'entrée 16 est conservé tel quel : ce correctif est indépendant du fournisseur sous-jacent. |  
| 18 | Retrait — ajout des méthodes SEPA et SWIFT | Extension de `WithdrawalService`/`RequestWithdrawalDto` (cf. §2C) : en plus de CRYPTO (inchangé), le client peut demander un retrait par virement SEPA (EUR, zone SEPA uniquement) ou SWIFT (toute devise, tout pays). Validation structurelle IBAN/BIC (format par pays + clé de contrôle MOD-97-10) via le paquet `validator` (`@IsIBAN()`/`@IsBIC()` de `class-validator`, déjà une dépendance transitive — formalisée en dépendance directe), regroupée dans `src/common/iban.util.ts` avec la liste des pays de la zone SEPA. Règles métier vérifiées côté service (pas seulement le DTO) : SEPA rejette toute devise autre qu'EUR et tout IBAN hors zone SEPA ; SWIFT exige un BIC. Comme pour CRYPTO, aucun rail bancaire réel n'exécute le virement — la demande journalise uniquement le ledger (cf. §2C pour le détail). Aucune vérification d'existence réelle du compte (nécessiterait un service tiers type GoCardless Bank Account Data) : question posée explicitement pendant le développement, réponse documentée dans le code et ici. |  
| 19 | Comptes business & crédit direct | Décision produit : la plateforme sert aussi les entreprises/startups/indépendants voulant financer un projet professionnel, distinct des particuliers (cf. §2G). Nouveau `AccountType` (PARTICULIER/BUSINESS) sur `User`/`AccountOpeningRequest`, choisi à l'ouverture, jamais modifié ensuite. Un compte BUSINESS garde le crédit gagé crypto **et** débloque le crédit direct (non gagé) — décision explicite de faire cohabiter les deux plutôt que de les opposer. Le crédit direct est un moteur d'éligibilité **automatique** (pas de file d'attente admin, contrairement à `CreditRequest`) : cinq critères déclaratifs tous obligatoires (ancienneté, revenu minimum, plafond vs revenu, ratio d'endettement, garantie de remboursement — cf. `backend/src/direct-credit/direct-credit.constants.ts`), évalués sur des données auto-déclarées jamais vérifiées par un tiers. La décision `ELIGIBLE`/`INELIGIBLE` est informative : elle n'émet aucun crédit, aucun mouvement de ledger — cohérent avec le reste du produit, où rien ne s'émet automatiquement sans une étape humaine ou un actif réellement verrouillé. Espace client restructuré en conséquence : nouvel onglet "Crédit direct" dans la sidebar, visible uniquement pour les comptes BUSINESS (`BusinessAccountGuard` côté API, masquage + page de repli "accès refusé" côté frontend). |  
  
**Pour un contrôle d'audit :** les valeurs actuellement en vigueur (ratio 350%, taux 13,5%/12%, frais 2%/0,5%, plafond de rendement 60%, seuils de liquidation 30%/50%) sont centralisées dans `backend/src/ledger/ledger.constants.ts` et `backend/src/credit/rate.constants.ts` (sources de vérité uniques) ; leur duplication côté frontend (`/tarifs`, `/admin/algorithme`, CGU) doit être vérifiée à chaque modification de ces fichiers. Suite de tests de référence : `cd backend && npx jest` (296/296 au dernier contrôle).  
  
**Garde-fous vérifiés en conditions réelles (curl) à la date de ce journal :** `POST /credit-requests` avec un compte KYC `VERIFIED` → `201` ; avec un compte KYC `PENDING` → `403 Forbidden`.  
  
**Cartographie du code :** un graphe de dépendances par module (backend et frontend), généré via `dependency-cruiser`, vit dans `docs/architecture/` (SVG + JSON, régénérable — voir `docs/architecture/README.md`). Aucune dépendance circulaire détectée de part et d'autre au dernier contrôle (106 modules backend, 152 modules frontend). Une cartographie narrative plus large (architecture, flux métier, intégrations, pistes d'amélioration) a été produite sous forme d'artifact — cf. journal des modifications si retrouvée utile à re-générer.  
