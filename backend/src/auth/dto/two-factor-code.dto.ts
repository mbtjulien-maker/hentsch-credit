import { IsString, Length } from 'class-validator';

// Réutilisé pour /auth/2fa/enable et /auth/2fa/disable — un code TOTP à 6 chiffres,
// toujours transmis en string (pas en number : un code commençant par 0 perdrait ce 0).
export class TwoFactorCodeDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
