// Nom du cookie de session — httpOnly (inaccessible en JS), SameSite=Lax (protection CSRF
// de base pour une API JSON : les requêtes cross-site en POST ne l'envoient pas), Secure
// en production uniquement (HTTPS requis, cf. AuthController).
export const SESSION_COOKIE_NAME = 'session';

// 24h — durée de session raisonnable pour un dashboard bancaire consulté quotidiennement ;
// à revoir (probablement plus court + refresh token) avant une vraie mise en production.
export const SESSION_DURATION_SECONDS = 60 * 60 * 24;

// Jeton intermédiaire émis par POST /auth/login quand le compte a la 2FA activée — ne
// vaut jamais comme session (aucun cookie posé à ce stade), sert uniquement à prouver
// que le mot de passe a déjà été validé avant d'accepter un code TOTP sur
// POST /auth/2fa/challenge. 5 minutes : assez pour saisir un code, pas assez pour un
// jeton volé/intercepté (ex. log applicatif) de rester exploitable longtemps.
export const PENDING_TWO_FACTOR_TOKEN_TTL_SECONDS = 60 * 5;
