import { Prisma } from '@prisma/client';
import { InvalidAmountException } from './exceptions/financial.exceptions';

// Normalise une entrée utilisateur en Decimal strictement positif et fini,
// ou lève InvalidAmountException. Utilisé partout où un montant est saisi
// (verrouillage de gage, remboursement, retrait).
export function toPositiveDecimal(value: Prisma.Decimal.Value): Prisma.Decimal {
  let decimal: Prisma.Decimal;
  try {
    decimal = new Prisma.Decimal(value);
  } catch {
    throw new InvalidAmountException('Le montant fourni est invalide');
  }
  if (!decimal.isFinite() || decimal.lessThanOrEqualTo(0)) {
    throw new InvalidAmountException();
  }
  return decimal;
}
