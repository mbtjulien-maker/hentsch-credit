import { Prisma } from '@prisma/client';

// Ratio de Crédit — CLAUDE.md §2A : 350% du montant mis en gage (mis à jour ; était 200%,
// avant cela 150%, avant cela 75%). Ce taux s'applique à chaque nouveau verrouillage ; une
// position déjà verrouillée sous un taux antérieur conserve le crédit qui lui a été
// accordé à l'époque (pas de recalcul rétroactif, cf.
// LedgerService.calculateTotalPurchasingPower).
export const CREDIT_RATIO = new Prisma.Decimal('3.5');
