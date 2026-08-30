import { IsString, Length } from 'class-validator';

// Étape 2 du login pour un compte avec 2FA activée — pendingToken vient de la réponse de
// POST /auth/login (cf. AuthController.login), jamais du cookie de session (aucune
// session n'existe encore à ce stade).
export class TwoFactorChallengeDto {
  @IsString()
  pendingToken: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
