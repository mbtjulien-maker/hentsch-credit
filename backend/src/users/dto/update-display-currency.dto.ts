import { IsIn } from 'class-validator';

export class UpdateDisplayCurrencyDto {
  @IsIn(['USD', 'EUR'])
  currency!: 'USD' | 'EUR';
}
