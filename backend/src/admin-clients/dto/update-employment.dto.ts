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

export class UpdateEmploymentDto {
  @IsOptional()
  @IsBoolean()
  isIndependent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string;

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
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  activity?: string;

  // Numéro d'immatriculation de l'entreprise (ex. SIRET) — cf. §6 CLAUDE.md entrée #46.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companyRegistrationNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  turnover?: number;

  @IsOptional()
  @IsNumber()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  netResult?: number;

  @IsOptional()
  @IsIn(INCOME_BRACKETS)
  annualIncomeBracket?: (typeof INCOME_BRACKETS)[number];

  @IsOptional()
  @IsIn(NET_WORTH_BRACKETS)
  netWorthBracket?: (typeof NET_WORTH_BRACKETS)[number];
}
