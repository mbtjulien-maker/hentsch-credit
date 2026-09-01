import {
  AcceptedCurrency,
  AccountCurrency,
  Chain,
  WithdrawalMethod,
} from '@prisma/client';
import {
  IsBIC,
  IsEnum,
  IsIBAN,
  IsString,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';

// userId dérivé du token authentifié (@CurrentUser(), cf. WithdrawalController) — jamais
// du body, cf. AuthModule. Trois méthodes de retrait (cf. WithdrawalMethod côté schema) :
// CRYPTO (inchangé, réseau + adresse on-chain) et deux virements bancaires classiques,
// SEPA (zone euro uniquement) et SWIFT (international). @IsIBAN()/@IsBIC() valident le
// format + la clé de contrôle (cf. src/common/iban.util.ts) — la règle "SEPA = zone SEPA
// + EUR uniquement" est vérifiée séparément dans WithdrawalService (dépend de la devise
// choisie, pas seulement du format de l'IBAN).
export class RequestWithdrawalDto {
  @IsEnum(WithdrawalMethod)
  method: WithdrawalMethod;

  @Matches(/^\d+(\.\d{1,6})?$/, {
    message: "amount doit être un nombre décimal positif (jusqu'à 6 décimales)",
  })
  amount: string;

  // --- CRYPTO uniquement ---
  @ValidateIf((o: RequestWithdrawalDto) => o.method === 'CRYPTO')
  @IsEnum(Chain)
  chain?: Chain;

  @ValidateIf((o: RequestWithdrawalDto) => o.method === 'CRYPTO')
  @IsEnum(AcceptedCurrency)
  currency?: AcceptedCurrency;

  @ValidateIf((o: RequestWithdrawalDto) => o.method === 'CRYPTO')
  @IsString()
  @MinLength(6)
  destinationAddress?: string;

  // --- SEPA / SWIFT uniquement ---
  @ValidateIf((o: RequestWithdrawalDto) => o.method !== 'CRYPTO')
  @IsEnum(AccountCurrency)
  withdrawalCurrency?: AccountCurrency;

  @ValidateIf((o: RequestWithdrawalDto) => o.method !== 'CRYPTO')
  @IsString()
  @MinLength(2)
  bankAccountHolder?: string;

  // Réutilise le rôle sémantique de `destinationAddress` ("où va le retrait") sous un nom
  // dédié côté DTO pour profiter de @IsIBAN() — WithdrawalService l'écrit dans la même
  // colonne `destinationAddress` que pour CRYPTO plutôt que de dupliquer la colonne.
  @ValidateIf((o: RequestWithdrawalDto) => o.method !== 'CRYPTO')
  @IsIBAN()
  destinationIban?: string;

  // Obligatoire pour SWIFT ; optionnel pour SEPA (règle IBAN-only depuis 2016) mais
  // validé s'il est fourni — la présence conditionnelle est vérifiée dans
  // WithdrawalService, pas ici (class-validator ne peut pas exprimer "obligatoire pour
  // SWIFT, optionnel pour SEPA" avec un seul décorateur sans dupliquer le champ).
  @ValidateIf(
    (o: RequestWithdrawalDto) =>
      o.method === 'SWIFT' || (o.method === 'SEPA' && !!o.bankBic),
  )
  @IsBIC()
  bankBic?: string;
}
