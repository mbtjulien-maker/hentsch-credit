import { Injectable, Logger } from '@nestjs/common';
import { VatVerificationUnavailableException } from '../common/exceptions/vat-verification.exceptions';
import {
  VIES_API_BASE,
  VIES_INVALID_ERROR,
  ViesCountryCode,
} from './vat-verification.constants';

// Forme (partielle) de la réponse VIES REST — vérifiée en direct contre l'API réelle
// (ec.europa.eu/taxation_customs/vies/rest-api/ms/{pays}/vat/{numéro}, sans clé, cf. §3
// CLAUDE.md) avant d'écrire ce service : `isValid` est le signal qui compte, `userError`
// vaut "VALID"/"INVALID" dans les deux cas normaux, autre chose (MS_UNAVAILABLE,
// MS_MAX_CONCURRENT_REQ...) signale une panne du nœud national plutôt qu'un vrai
// résultat. `name`/`address` valent "---" ou vide quand l'État membre ne les fournit
// pas (autorisé par le règlement européen, un État peut renvoyer isValid=true sans
// détails) — jamais traité comme une erreur dans ce cas.
interface ViesResponse {
  isValid: boolean;
  userError: string;
  name?: string;
  address?: string;
}

export interface VatCheckResult {
  valid: boolean;
  name: string | null;
  address: string | null;
}

function cleanText(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '---' ? null : trimmed;
}

// Vérification réelle d'un numéro de TVA intracommunautaire via VIES (Commission
// européenne) — seul registre gratuit, sans clé API, couvrant les 27 États membres de
// l'UE (retour client explicite : "possible de vérifier le [numéro d'immatriculation]
// directement ? europe" — pas de registre unique équivalent au SIRET français à
// l'échelle européenne, VIES est l'alternative réelle la plus proche). Purement
// informatif côté client (pas de champ "verified" persisté par cet appel, même principe
// que la validation structurelle d'IBAN, cf. §2C CLAUDE.md) : le conseiller reste seul
// juge de la certification finale du dossier KYC.
@Injectable()
export class VatVerificationService {
  private readonly logger = new Logger(VatVerificationService.name);

  async checkVat(
    countryCode: ViesCountryCode,
    vatNumber: string,
  ): Promise<VatCheckResult> {
    try {
      const url = `${VIES_API_BASE}/ms/${countryCode}/vat/${vatNumber}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        throw new Error(`VIES a répondu ${response.status}`);
      }
      const payload = (await response.json()) as ViesResponse;

      // Un numéro réellement invalide est une vraie réponse VIES (isValid=false,
      // userError="INVALID"), jamais une exception — c'est le résultat attendu.
      if (!payload.isValid && payload.userError === VIES_INVALID_ERROR) {
        return { valid: false, name: null, address: null };
      }
      if (payload.isValid) {
        return {
          valid: true,
          name: cleanText(payload.name),
          address: cleanText(payload.address),
        };
      }
      // Ni VALID ni INVALID : panne du nœud national ou du service central (cf.
      // vat-verification.constants.ts) — jamais présenté comme "numéro invalide".
      throw new Error(`VIES indisponible (${payload.userError})`);
    } catch (error) {
      this.logger.warn(
        `Échec de la vérification VIES pour ${countryCode}${vatNumber} : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new VatVerificationUnavailableException();
    }
  }
}
