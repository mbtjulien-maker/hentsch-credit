import { AccountType, Prisma } from '@prisma/client';

// Dépôt initial minimum, condition d'ouverture de compte (CLAUDE.md §2G/§6, entrée sur
// le sujet) — un seuil à atteindre une seule fois, jamais un solde plancher permanent :
// une fois le cumul de dépôts réels (DEPOSIT + CARD_TOPUP, cf.
// LedgerService.getInitialDepositStatus) au moins égal à ce montant, le capital reste
// pleinement réutilisable (retrait, dépense, mise en gage...) exactement comme n'importe
// quel autre dépôt — rien ne le bloque après coup, contrairement à un gage verrouillé
// (§2C). Montant différent par AccountType : un compte BUSINESS suppose un projet
// professionnel à financer, d'où un apport initial plus consequent qu'un particulier.
export const INITIAL_DEPOSIT_REQUIREMENT_USD: Record<AccountType, Prisma.Decimal> = {
  PARTICULIER: new Prisma.Decimal('500'),
  BUSINESS: new Prisma.Decimal('1000'),
};
