import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateEmploymentDto {
  @IsOptional()
  @IsBoolean()
  isIndependent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string;

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
}
