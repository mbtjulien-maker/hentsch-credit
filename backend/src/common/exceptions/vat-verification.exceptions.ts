import { ServiceUnavailableException } from '@nestjs/common';

// Levée quand l'appel réel à VIES (Commission européenne) échoue — réseau, timeout, ou un
// `userError` autre que INVALID/VALID (ex. MS_MAX_CONCURRENT_REQ, MS_UNAVAILABLE : le nœud
// national d'un État membre, notamment la France, est notoirement instable). Jamais
// interprété comme "numéro invalide" : un numéro réellement invalide renvoie
// isValid=false + userError="INVALID", une vraie réponse de VIES, pas une panne.
export class VatVerificationUnavailableException extends ServiceUnavailableException {
  constructor() {
    super(
      'La vérification du numéro de TVA est momentanément indisponible (service VIES de la Commission européenne). Réessayez plus tard.',
    );
  }
}
