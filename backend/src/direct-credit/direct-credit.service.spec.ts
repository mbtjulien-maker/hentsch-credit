import { Prisma } from '@prisma/client';
import { DirectCreditService } from './direct-credit.service';

describe('DirectCreditService', () => {
  let service: DirectCreditService;

  beforeEach(() => {
    service = new DirectCreditService(null as never);
  });

  describe('evaluate', () => {
    // Un dossier plausible qui passe les 5 critères — sert de base saine, chaque test
    // d'échec ci-dessous ne dégrade qu'UN seul champ par rapport à celui-ci.
    function healthyInput() {
      return {
        currency: 'USD' as const,
        companySeniorityMonths: 18,
        requestedAmount: new Prisma.Decimal('10000'),
        declaredMonthlyRevenue: new Prisma.Decimal('8000'),
        declaredMonthlyExpenses: new Prisma.Decimal('3000'),
        guaranteeOffered: new Prisma.Decimal('3000'),
      };
    }

    it('declares ELIGIBLE when all five criteria pass', () => {
      const result = service.evaluate(healthyInput());

      expect(result.decision).toBe('ELIGIBLE');
      expect(result.criteria).toHaveLength(5);
      expect(result.criteria.every((c) => c.passed)).toBe(true);
      expect(result.estimatedRatePct.toString()).toBe('15');
      expect(result.estimatedMonthlyPayment.greaterThan(0)).toBe(true);
    });

    it('uses the EUR rate (base + premium) for an EUR request', () => {
      const result = service.evaluate({ ...healthyInput(), currency: 'EUR' });
      expect(result.estimatedRatePct.toString()).toBe('13.5');
    });

    it('fails on insufficient company seniority alone', () => {
      const result = service.evaluate({
        ...healthyInput(),
        companySeniorityMonths: 1,
      });

      expect(result.decision).toBe('INELIGIBLE');
      const seniority = result.criteria.find((c) => c.key === 'seniority')!;
      expect(seniority.passed).toBe(false);
      expect(
        result.criteria
          .filter((c) => c.key !== 'seniority')
          .every((c) => c.passed),
      ).toBe(true);
    });

    it('fails when declared monthly revenue is below the minimum', () => {
      const result = service.evaluate({
        ...healthyInput(),
        declaredMonthlyRevenue: new Prisma.Decimal('1000'),
        // Réduit aussi le montant demandé pour ne pas déclencher accessoirement le
        // critère "requestVsRevenue" (8x le revenu) — isole bien le critère testé.
        requestedAmount: new Prisma.Decimal('5000'),
        guaranteeOffered: new Prisma.Decimal('1500'),
      });

      expect(result.decision).toBe('INELIGIBLE');
      expect(result.criteria.find((c) => c.key === 'minRevenue')!.passed).toBe(
        false,
      );
    });

    it('fails when the requested amount exceeds the revenue multiple cap', () => {
      const result = service.evaluate({
        ...healthyInput(),
        requestedAmount: new Prisma.Decimal('100000'), // 12.5x the 8000 revenue
        guaranteeOffered: new Prisma.Decimal('30000'),
      });

      expect(result.decision).toBe('INELIGIBLE');
      expect(
        result.criteria.find((c) => c.key === 'requestVsRevenue')!.passed,
      ).toBe(false);
    });

    it('fails the debt-service-ratio criterion when net income is zero or negative', () => {
      const result = service.evaluate({
        ...healthyInput(),
        declaredMonthlyExpenses: new Prisma.Decimal('8000'), // == revenue, net = 0
      });

      expect(result.decision).toBe('INELIGIBLE');
      const dsr = result.criteria.find((c) => c.key === 'debtServiceRatio')!;
      expect(dsr.passed).toBe(false);
      expect(dsr.observed).toContain('nul ou négatif');
    });

    it('fails the debt-service-ratio criterion when the payment exceeds the ratio cap despite positive net income', () => {
      const result = service.evaluate({
        ...healthyInput(),
        requestedAmount: new Prisma.Decimal('9000000'), // huge principal -> huge payment
        declaredMonthlyRevenue: new Prisma.Decimal('2000000'), // keep other ratios happy
        declaredMonthlyExpenses: new Prisma.Decimal('100'),
        guaranteeOffered: new Prisma.Decimal('2000000'),
      });

      expect(result.decision).toBe('INELIGIBLE');
      expect(
        result.criteria.find((c) => c.key === 'debtServiceRatio')!.passed,
      ).toBe(false);
    });

    it('fails when the offered guarantee covers less than the minimum percentage', () => {
      const result = service.evaluate({
        ...healthyInput(),
        guaranteeOffered: new Prisma.Decimal('500'), // 5% of 10000, below the 20% floor
      });

      expect(result.decision).toBe('INELIGIBLE');
      expect(
        result.criteria.find((c) => c.key === 'guaranteeCoverage')!.passed,
      ).toBe(false);
    });

    it('accepts a young startup with no seniority issue as long as it clears every threshold (seniority floor is low by design)', () => {
      const result = service.evaluate({
        ...healthyInput(),
        companySeniorityMonths: 3, // exactly at the floor
      });

      expect(result.decision).toBe('ELIGIBLE');
    });
  });
});
