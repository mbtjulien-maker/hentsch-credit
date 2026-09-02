import { IsIn, IsOptional } from 'class-validator';
import {
  AML_RISK_LEVELS,
  KYC_REVIEW_DECISIONS,
} from '../../common/kyc.constants';

// "Avis de conformité : Validé / Refusé" du dossier KYC papier (§6, "Cadre réservé à la
// banque") — jusqu'à cette entrée (§6 entrée #33), AUCUNE route n'existait pour faire
// passer un User.kycStatus de PENDING à VERIFIED/REJECTED en dehors du seed de démo.
// `decision` répercute directement User.kycStatus (VALIDE -> VERIFIED, REFUSE ->
// REJECTED, cf. AdminClientsService.decideKyc) ; `riskLevel` est une appréciation
// éditoriale du conseiller, jamais recalculée automatiquement (même principe que
// RISK_LEVEL en §2H) — optionnelle : un refus n'a pas toujours besoin d'un niveau de
// risque explicite.
export class DecideKycDto {
  @IsIn(KYC_REVIEW_DECISIONS)
  decision: (typeof KYC_REVIEW_DECISIONS)[number];

  @IsOptional()
  @IsIn(AML_RISK_LEVELS)
  riskLevel?: (typeof AML_RISK_LEVELS)[number];
}
