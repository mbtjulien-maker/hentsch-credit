import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

// Chaque bloc (revenus/charges/patrimoine/passifs) est écrit en une fois, jamais champ
// par champ — reflète la déclaration financière telle que présentée au client/analyste
// (cf. FinancialTab côté frontend), pas un formulaire ligne à ligne.

class IncomeDto {
  @IsOptional() @IsNumber() @Min(0) salary?: number;
  @IsOptional() @IsNumber() @Min(0) additional?: number;
  @IsOptional() @IsNumber() @Min(0) professional?: number;
  @IsOptional() @IsNumber() @Min(0) other?: number;
}

class ExpensesDto {
  @IsOptional() @IsNumber() @Min(0) rent?: number;
  @IsOptional() @IsNumber() @Min(0) mortgage?: number;
  @IsOptional() @IsNumber() @Min(0) autoLoan?: number;
  @IsOptional() @IsNumber() @Min(0) otherLoans?: number;
  @IsOptional() @IsNumber() @Min(0) pension?: number;
  @IsOptional() @IsNumber() @Min(0) recurring?: number;
  @IsOptional() @IsNumber() @Min(0) other?: number;
}

class AssetsDto {
  @IsOptional() @IsNumber() @Min(0) bankAccounts?: number;
  @IsOptional() @IsNumber() @Min(0) savings?: number;
  @IsOptional() @IsNumber() @Min(0) realEstate?: number;
  @IsOptional() @IsNumber() @Min(0) vehicles?: number;
  @IsOptional() @IsNumber() @Min(0) investments?: number;
  @IsOptional() @IsNumber() @Min(0) other?: number;
}

class LiabilitiesDto {
  @IsOptional() @IsNumber() @Min(0) mortgage?: number;
  @IsOptional() @IsNumber() @Min(0) autoLoan?: number;
  @IsOptional() @IsNumber() @Min(0) personalLoan?: number;
  @IsOptional() @IsNumber() @Min(0) debts?: number;
  @IsOptional() @IsNumber() @Min(0) other?: number;
}

export class UpdateFinancialsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => IncomeDto)
  income?: IncomeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExpensesDto)
  expenses?: ExpensesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssetsDto)
  assets?: AssetsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LiabilitiesDto)
  liabilities?: LiabilitiesDto;
}
