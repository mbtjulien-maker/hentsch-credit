import { Injectable } from '@nestjs/common';
import {
  AccountCurrency,
  DirectCreditDecision,
  DirectCreditRequest,
  Prisma,
} from '@prisma/client';
import { toPositiveDecimal } from '../common/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  DIRECT_CREDIT_TERM_MONTHS,
  MAX_DEBT_SERVICE_RATIO_PCT,
  MAX_REQUEST_TO_MONTHLY_REVENUE_MULTIPLE,
  MIN_COMPANY_SENIORITY_MONTHS,
  MIN_GUARANTEE_COVERAGE_PCT,
  MIN_MONTHLY_REVENUE,
  getDirectCreditInterestRatePct,
} from './direct-credit.constants';
import { CreateDirectCreditRequestDto } from './dto/create-direct-credit-request.dto';

// Un critère du moteur d'éligibilité, tel que persisté dans
// DirectCreditRequest.eligibilityBreakdown (JSON) et renvoyé au client — chaque critère
// montre sa valeur observée et son seuil, jamais un simple booléen opaque (même principe
// de transparence que le reste du produit, ex. /admin/algorithme).
export interface EligibilityCriterion {
  key: string;
  label: string;
  passed: boolean;
  observed: string;
  threshold: string;
}

export interface EligibilityResult {
  decision: DirectCreditDecision;
  criteria: EligibilityCriterion[];
  estimatedRatePct: Prisma.Decimal;
  estimatedMonthlyPayment: Prisma.Decimal;
}

// Mensualité constante (amortissement classique) en Decimal — même formule que
// frontend/lib/amortization.ts (computeAmortizedPayment), reportée ici en arithmétique
// Decimal (jamais de `number` JS pour un calcul financier côté backend, cf. CLAUDE.md
// §3). decimal.js (type sous-jacent de Prisma.Decimal) supporte nativement les exposants
// négatifs sur .pow(), donc la formule se transpose telle quelle.
function computeAmortizedPaymentDecimal(
  principal: Prisma.Decimal,
  annualRatePct: Prisma.Decimal,
  months: number,
): Prisma.Decimal {
  if (principal.lessThanOrEqualTo(0) || months <= 0) {
    return new Prisma.Decimal(0);
  }
  const monthlyRate = annualRatePct.dividedBy(100).dividedBy(12);
  if (monthlyRate.lessThanOrEqualTo(0)) {
    return principal.dividedBy(months);
  }
  const denominator = new Prisma.Decimal(1).minus(
    new Prisma.Decimal(1).plus(monthlyRate).pow(-months),
  );
  return principal.times(monthlyRate).dividedBy(denominator);
}

function formatDecimal(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

// Crédit direct — non gagé, réservé aux comptes BUSINESS (cf. BusinessAccountGuard,
// AccountType). Décision ELIGIBLE/INELIGIBLE calculée immédiatement à la soumission, sur
// cinq critères déclaratifs tous obligatoires (cf. direct-credit.constants.ts pour le
// détail et la justification de chaque seuil). `eligible` est une réponse informative :
// contrairement au crédit gagé crypto, aucune émission de crédit ni mouvement de ledger
// ne découle de cette décision à ce stade — cohérent avec le reste du produit, où rien ne
// s'émet automatiquement sans une étape humaine ou un actif réellement verrouillé.
@Injectable()
export class DirectCreditService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateDirectCreditRequestDto,
  ): Promise<DirectCreditRequest> {
    const requestedAmount = toPositiveDecimal(dto.requestedAmount);
    const declaredMonthlyRevenue = toPositiveDecimal(
      dto.declaredMonthlyRevenue,
    );
    // Les charges peuvent légitimement être nulles (déclaré) — toPositiveDecimal
    // rejetterait 0, donc parsing direct ici avec le même garde-fou (fini, non négatif).
    const declaredMonthlyExpenses = new Prisma.Decimal(
      dto.declaredMonthlyExpenses,
    );
    const guaranteeOffered = new Prisma.Decimal(dto.guaranteeOffered);

    const result = this.evaluate({
      currency: dto.currency,
      companySeniorityMonths: dto.companySeniorityMonths,
      requestedAmount,
      declaredMonthlyRevenue,
      declaredMonthlyExpenses,
      guaranteeOffered,
    });

    return this.prisma.directCreditRequest.create({
      data: {
        userId,
        companyName: dto.companyName,
        registrationNumber: dto.registrationNumber,
        sector: dto.sector,
        companySeniorityMonths: dto.companySeniorityMonths,
        projectDescription: dto.projectDescription,
        requestedAmount,
        currency: dto.currency,
        declaredMonthlyRevenue,
        declaredMonthlyExpenses,
        guaranteeOffered,
        decision: result.decision,
        eligibilityBreakdown: result.criteria as unknown as Prisma.InputJsonValue,
        estimatedRatePct: result.estimatedRatePct,
        estimatedMonthlyPayment: result.estimatedMonthlyPayment,
      },
    });
  }

  async listForUser(userId: string): Promise<DirectCreditRequest[]> {
    return this.prisma.directCreditRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll(): Promise<DirectCreditRequest[]> {
    return this.prisma.directCreditRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Moteur d'éligibilité pur (aucun accès base) — cinq critères, tous obligatoires pour
  // ELIGIBLE. Isolé de create() pour rester facilement testable indépendamment de Prisma.
  evaluate(input: {
    currency: AccountCurrency;
    companySeniorityMonths: number;
    requestedAmount: Prisma.Decimal;
    declaredMonthlyRevenue: Prisma.Decimal;
    declaredMonthlyExpenses: Prisma.Decimal;
    guaranteeOffered: Prisma.Decimal;
  }): EligibilityResult {
    const {
      currency,
      companySeniorityMonths,
      requestedAmount,
      declaredMonthlyRevenue,
      declaredMonthlyExpenses,
      guaranteeOffered,
    } = input;

    const estimatedRatePct = getDirectCreditInterestRatePct(currency);
    const estimatedMonthlyPayment = computeAmortizedPaymentDecimal(
      requestedAmount,
      estimatedRatePct,
      DIRECT_CREDIT_TERM_MONTHS,
    );

    const netMonthlyIncome = declaredMonthlyRevenue.minus(
      declaredMonthlyExpenses,
    );
    // Un revenu net nul ou négatif échoue directement (pas de division par zéro, pas de
    // ratio négatif "acceptable" par erreur de signe) — cf. commentaire constants.ts.
    const debtServiceRatioPct = netMonthlyIncome.greaterThan(0)
      ? estimatedMonthlyPayment.dividedBy(netMonthlyIncome).times(100)
      : null;

    const guaranteeCoveragePct = requestedAmount.greaterThan(0)
      ? guaranteeOffered.dividedBy(requestedAmount).times(100)
      : new Prisma.Decimal(0);

    const minMonthlyRevenue = MIN_MONTHLY_REVENUE[currency];
    const maxRequestAllowed = declaredMonthlyRevenue.times(
      MAX_REQUEST_TO_MONTHLY_REVENUE_MULTIPLE,
    );

    const criteria: EligibilityCriterion[] = [
      {
        key: 'seniority',
        label: "Ancienneté de l'entreprise",
        passed: companySeniorityMonths >= MIN_COMPANY_SENIORITY_MONTHS,
        observed: `${companySeniorityMonths} mois`,
        threshold: `≥ ${MIN_COMPANY_SENIORITY_MONTHS} mois`,
      },
      {
        key: 'minRevenue',
        label: 'Revenu mensuel déclaré minimum',
        passed: declaredMonthlyRevenue.greaterThanOrEqualTo(minMonthlyRevenue),
        observed: `${formatDecimal(declaredMonthlyRevenue)} ${currency}`,
        threshold: `≥ ${formatDecimal(minMonthlyRevenue)} ${currency}`,
      },
      {
        key: 'requestVsRevenue',
        label: 'Montant demandé vs revenu mensuel',
        passed: requestedAmount.lessThanOrEqualTo(maxRequestAllowed),
        observed: `${formatDecimal(requestedAmount)} ${currency}`,
        threshold: `≤ ${formatDecimal(maxRequestAllowed)} ${currency} (${MAX_REQUEST_TO_MONTHLY_REVENUE_MULTIPLE}× le revenu mensuel)`,
      },
      {
        key: 'debtServiceRatio',
        label: "Ratio d'endettement (mensualité / revenu net)",
        passed:
          debtServiceRatioPct !== null &&
          debtServiceRatioPct.lessThanOrEqualTo(MAX_DEBT_SERVICE_RATIO_PCT),
        observed:
          debtServiceRatioPct !== null
            ? `${formatDecimal(debtServiceRatioPct)}%`
            : 'revenu net nul ou négatif',
        threshold: `≤ ${MAX_DEBT_SERVICE_RATIO_PCT.toString()}%`,
      },
      {
        key: 'guaranteeCoverage',
        label: 'Garantie de remboursement proposée',
        passed: guaranteeCoveragePct.greaterThanOrEqualTo(
          MIN_GUARANTEE_COVERAGE_PCT,
        ),
        observed: `${formatDecimal(guaranteeCoveragePct)}% du montant demandé`,
        threshold: `≥ ${MIN_GUARANTEE_COVERAGE_PCT.toString()}%`,
      },
    ];

    const decision: DirectCreditDecision = criteria.every((c) => c.passed)
      ? 'ELIGIBLE'
      : 'INELIGIBLE';

    return { decision, criteria, estimatedRatePct, estimatedMonthlyPayment };
  }
}
