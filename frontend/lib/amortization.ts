// Mensualité constante (amortissement classique) pour rembourser `principal` sur
// `months` mois à `annualRatePct` — formule standard, partagée par InstallmentSchedule
// (mensualité à échéances fixes) et RepaymentProjection (suggestion d'apport externe pour
// rembourser dans la durée contractuelle), pour ne pas la dupliquer deux fois.
export function computeAmortizedPayment(
  principal: number,
  annualRatePct: number,
  months: number,
): number {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  return monthlyRate > 0
    ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
    : principal / months;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

// Décompose une mensualité déjà connue (fixe) en intérêts/capital/solde restant, mois par
// mois — utilisé par contract-preview-dialog.tsx pour l'Annexe 1 (tableau d'amortissement
// prévisionnel) du contrat de crédit lombard généré côté back-office. Contrairement à
// computeAmortizedPayment ci-dessus (qui calcule LA mensualité), cette fonction part d'une
// mensualité déjà donnée (`monthlyPayment`, cf. estimatedMonthlyPayment côté dossier
// client) et reconstitue la ventilation intérêts/capital pour chaque échéance.
export function buildAmortizationSchedule(
  principal: number,
  monthlyPayment: number,
  annualRatePct: number,
  months: number,
): AmortizationRow[] {
  if (principal <= 0 || monthlyPayment <= 0 || months <= 0) return [];

  const monthlyRate = annualRatePct / 100 / 12;
  const rows: AmortizationRow[] = [];
  let balance = principal;

  for (let month = 1; month <= months && balance > 0.005; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(balance - principalPaid, 0);
    rows.push({
      month,
      payment: principalPaid + interest,
      interest,
      principal: principalPaid,
      balance,
    });
  }

  return rows;
}
