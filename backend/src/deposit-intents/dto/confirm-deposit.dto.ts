import { IsOptional, IsString, MinLength } from 'class-validator';

export class ConfirmDepositDto {
  // Hash de la transaction on-chain réellement reçue — optionnel (déclaration purement
  // manuelle possible), mais recommandé pour l'audit une fois les fonds vérifiés.
  @IsOptional()
  @IsString()
  @MinLength(6)
  referenceTx?: string;
}
