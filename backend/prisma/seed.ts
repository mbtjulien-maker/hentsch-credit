import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/password.util';

const prisma = new PrismaClient();

// Mot de passe commun aux 3 comptes de démo — DEV UNIQUEMENT, jamais utilisé tel quel en
// production (une vraie plateforme n'utilise jamais de seed pour créer des comptes réels).
const DEV_PASSWORD = 'ChangeMe123!';

// Adresses de dépôt "pool" gérées par la banque (CLAUDE.md — pas propres à un client,
// cf. ManagedDepositAddress). Réseau Ethereum uniquement pour l'instant.
const MANAGED_DEPOSIT_ADDRESSES: {
  currency:
    | 'USDT'
    | 'USDC'
    | 'XAUT'
    | 'DEURO'
    | 'ETH'
    | 'SHIB'
    | 'KAG'
    | 'XPT'
    | 'XPD'
    | 'XCU'
    | 'WTI';
  address: string;
}[] = [
  { currency: 'USDT', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'USDC', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'XAUT', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'DEURO', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'ETH', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'SHIB', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'KAG', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'XPT', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'XPD', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'XCU', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'WTI', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
];

async function main() {
  const passwordHash = await hashPassword(DEV_PASSWORD);

  for (const { currency, address } of MANAGED_DEPOSIT_ADDRESSES) {
    await prisma.managedDepositAddress.upsert({
      where: { chain_currency: { chain: 'ETHEREUM', currency } },
      update: { address },
      create: { chain: 'ETHEREUM', currency, address },
    });
  }

  // Client 1 : KYC vérifié, avec gage/crédit actif — scénario de référence CLAUDE.md §2B
  // Dépôt 2000$, crédit accordé 350% => 7000$, pouvoir d'achat total 9000$.
  const verifiedUser = await prisma.user.upsert({
    where: { email: 'client.verifie@example.com' },
    update: { passwordHash },
    create: {
      email: 'client.verifie@example.com',
      passwordHash,
      kycStatus: 'VERIFIED',
      wallets: {
        create: [
          {
            chain: 'ETHEREUM',
            address: '0x000000000000000000000000000000000000AA',
            currency: 'USDS',
          },
        ],
      },
      // Pouvoir d'Achat Total = Solde Disponible + Gage Verrouillé + (Gage Verrouillé * 3.5) - Crédit Utilisé
      //                       = 0 + 2000 + 7000 - 0 = 9000 (cf. CLAUDE.md §2B)
      ledgerBalance: {
        create: {
          availableBalance: '0.000000',
          lockedCollateral: '2000.000000',
          grantedCredit: '7000.000000',
          usedCredit: '0.000000',
        },
      },
      creditPositions: {
        create: [
          {
            collateralAmount: '2000.000000',
            creditIssued: '7000.000000',
            status: 'ACTIVE',
          },
        ],
      },
      cards: {
        create: [
          {
            externalCardId: 'card_seed_verified_001',
            status: 'ACTIVE',
            creditLimit: '7000.000000',
          },
        ],
      },
      transactions: {
        create: [
          {
            type: 'DEPOSIT',
            amount: '2000.000000',
            currency: 'USDS',
            tokenAmount: '2000.000000',
            status: 'COMPLETED',
            referenceTx: '0xseeddeposittxhash',
          },
          {
            type: 'COLLATERAL_LOCK',
            amount: '2000.000000',
            status: 'COMPLETED',
          },
          {
            type: 'CREDIT_ISSUED',
            amount: '7000.000000',
            status: 'COMPLETED',
          },
        ],
      },
    },
  });

  // Wallet personnel interne (cf. ClientManagedWallet) — normalement provisionné à la
  // volée (ClientWalletsService.getOrCreate), seedé ici pour que le compte de démo en ait
  // déjà un dès le premier affichage.
  await prisma.clientManagedWallet.upsert({
    where: { userId: verifiedUser.id },
    update: {},
    create: { userId: verifiedUser.id, reference: 'CW-SEED0001' },
  });

  // Client 2 : KYC en attente — doit être bloqué pour wallet/dépôt/crédit (Étape 5)
  const pendingUser = await prisma.user.upsert({
    where: { email: 'client.pending@example.com' },
    update: { passwordHash },
    create: {
      email: 'client.pending@example.com',
      passwordHash,
      kycStatus: 'PENDING',
      ledgerBalance: {
        create: {},
      },
    },
  });

  // Compte back-office : rôle ADMIN, seul habilité par AdminGuard à valider/rejeter les
  // demandes de crédit et déclencher les jobs manuels (cf. §5 Rôles d'accès).
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hhentsch.com' },
    update: { role: 'ADMIN', passwordHash },
    create: {
      email: 'admin@hhentsch.com',
      passwordHash,
      kycStatus: 'VERIFIED',
      role: 'ADMIN',
      ledgerBalance: {
        create: {},
      },
    },
  });

  console.log({
    verifiedUser: verifiedUser.email,
    pendingUser: pendingUser.email,
    adminUser: adminUser.email,
    devPassword: DEV_PASSWORD,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
