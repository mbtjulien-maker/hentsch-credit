import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

// Coût bcrypt — 12 est la recommandation courante actuelle (équilibre sécurité/latence
// pour une vérification synchrone à chaque login), au-dessus du défaut historique (10).
const BCRYPT_COST_FACTOR = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST_FACTOR);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Mot de passe temporaire attribué à l'ouverture d'un compte approuvé (cf.
// AccountRequestsService.approve) — communiqué au client hors-bande par le back-office
// (aucun service d'e-mail branché à ce stade) et jamais stocké en clair : seul son hash
// bcrypt persiste, la valeur en clair n'est retournée qu'une fois dans la réponse HTTP
// de l'approbation. base64url pour rester copiable/lisible sans caractères ambigus.
export function generateTemporaryPassword(): string {
  return randomBytes(18).toString('base64url');
}
