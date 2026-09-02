import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  INCOME_BRACKETS,
  NET_WORTH_BRACKETS,
  PROFESSIONAL_STATUSES,
} from '../../common/kyc.constants';

// Auto-service — mêmes champs que UpdateEmploymentDto (admin-clients), sans `verified`
// (seul un admin peut certifier une situation professionnelle vérifiée, cf.
// UsersService.updateEmployment) ni `turnover`/`netResult` (chiffres d'affaires/résultat
// net — pertinents pour l'analyse business d'un dossier, hors du périmètre demandé pour
// l'auto-déclaration client : nom/prénom, adresse, date de naissance, emploi, revenu
// annuel, nationalité, contact).
export class UpdateOwnEmploymentDto {
  @IsOptional()
  @IsBoolean()
  isIndependent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string;

  // Statut professionnel du dossier KYC papier (SALARIE/FONCTIONNAIRE/INDEPENDANT/
  // DIRIGEANT/RETRAITE/ETUDIANT/SANS_EMPLOI) — plus fin que `status` en texte libre
  // ci-dessus, cf. §6 entrée #33.
  @IsOptional()
  @IsIn(PROFESSIONAL_STATUSES)
  professionalStatus?: (typeof PROFESSIONAL_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(150)
  employer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  seniority?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  annualIncome?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  monthlyIncome?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contractType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  activity?: string;

  // Tranches déclaratives (revenus annuels nets / patrimoine global estimé) du dossier
  // KYC papier — cf. §6 entrée #33, distinctes du montant exact `annualIncome` ci-dessus.
  @IsOptional()
  @IsIn(INCOME_BRACKETS)
  annualIncomeBracket?: (typeof INCOME_BRACKETS)[number];

  @IsOptional()
  @IsIn(NET_WORTH_BRACKETS)
  netWorthBracket?: (typeof NET_WORTH_BRACKETS)[number];
}
