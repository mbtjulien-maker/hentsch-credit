import { PrismaClient } from '@prisma/client';
import { generateURI } from 'otplib';
import { hashPassword } from '../src/common/password.util';

const prisma = new PrismaClient();

// Mot de passe commun aux 3 comptes de démo — DEV UNIQUEMENT, jamais utilisé tel quel en
// production (une vraie plateforme n'utilise jamais de seed pour créer des comptes réels).
const DEV_PASSWORD = 'ChangeMe123!';

// 2FA désormais obligatoire pour tout accès back-office (cf. AdminGuard, journal des
// modifications CLAUDE.md) : le compte admin de démo doit donc en avoir une, sans quoi il
// serait bloqué hors de tout /admin/* dès le prochain seed. Secret FIXE (pas
// generateSecret() à chaque run) pour qu'un authenticator déjà configuré sur ce compte de
// démo reste valide d'un reseed à l'autre — DEV UNIQUEMENT, jamais un secret figé en
// production.
const DEV_ADMIN_TOTP_SECRET = 'PWVYTOPKBCVRGSRT4YCNT3YC7QQDUGXZ';

// Adresses de dépôt "pool" gérées par la banque (CLAUDE.md — pas propres à un client,
// cf. ManagedDepositAddress). Réseau Ethereum par défaut, sauf pour un actif dont une
// vraie adresse a été fournie sur un autre réseau (cf. §6 entrée #32 : KAG sur BNB Smart
// Chain). Les métaux industriels/matières premières tokenisés (XPT/XPD/XCU/WTI) n'ont
// volontairement PAS d'entrée ici : aucune vraie adresse de réception n'a été fournie
// pour eux — ils restent des actifs acceptés en garantie (valorisation, stratégie RWA,
// marché) mais ne sont plus proposés au dépôt direct tant qu'une vraie adresse n'existe
// pas, cohérent avec le principe du projet de ne jamais présenter une donnée fabriquée
// comme réelle.
const MANAGED_DEPOSIT_ADDRESSES: {
  currency: 'USDT' | 'USDC' | 'XAUT' | 'DEURO' | 'ETH' | 'SHIB' | 'KAG';
  chain: 'ETHEREUM' | 'BSC';
  address: string;
}[] = [
  { currency: 'USDT', chain: 'ETHEREUM', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'USDC', chain: 'ETHEREUM', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'XAUT', chain: 'ETHEREUM', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'DEURO', chain: 'ETHEREUM', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'ETH', chain: 'ETHEREUM', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  { currency: 'SHIB', chain: 'ETHEREUM', address: '0x3b688A6285f44C95489A5464495eCe963E112C36' },
  // Vraie adresse de réception fournie par la banque pour KAG, sur BNB Smart Chain —
  // seul actif de la liste avec une vraie adresse à ce jour (les autres restent le
  // placeholder de dev 0x3b68...C36, jamais présenté comme réel).
  { currency: 'KAG', chain: 'BSC', address: '0x55D53AB5a09359BB11341a33c80e9aBedb6D287b' },
];

async function main() {
  const passwordHash = await hashPassword(DEV_PASSWORD);

  for (const { currency, chain, address } of MANAGED_DEPOSIT_ADDRESSES) {
    await prisma.managedDepositAddress.upsert({
      where: { chain_currency: { chain, currency } },
      update: { address },
      create: { chain, currency, address },
    });
  }

  // Retire les entrées devenues obsolètes d'un seed précédent : KAG sur Ethereum
  // (déplacé vers BSC ci-dessus) et les métaux industriels/matières premières
  // tokenisés, qui n'ont plus de vraie adresse de dépôt (cf. commentaire ci-dessus).
  await prisma.managedDepositAddress.deleteMany({
    where: {
      OR: [
        { currency: 'KAG', chain: 'ETHEREUM' },
        { currency: { in: ['XPT', 'XPD', 'XCU', 'WTI'] } },
      ],
    },
  });

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
    update: {
      role: 'ADMIN',
      passwordHash,
      twoFactorEnabled: true,
      twoFactorSecret: DEV_ADMIN_TOTP_SECRET,
    },
    create: {
      email: 'admin@hhentsch.com',
      passwordHash,
      kycStatus: 'VERIFIED',
      role: 'ADMIN',
      twoFactorEnabled: true,
      twoFactorSecret: DEV_ADMIN_TOTP_SECRET,
      ledgerBalance: {
        create: {},
      },
    },
  });

  console.log({
    verifiedUser: verifiedUser.email,
    pendingUser: pendingUser.email,
    adminUser: adminUser.email,
    adminTotpOtpauthUrl: generateURI({
      issuer: 'Hentsch Credit',
      label: adminUser.email,
      secret: DEV_ADMIN_TOTP_SECRET,
    }),
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
