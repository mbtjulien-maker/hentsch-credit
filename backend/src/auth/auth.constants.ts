// Nom du cookie de session — httpOnly (inaccessible en JS), SameSite=Lax (protection CSRF
// de base pour une API JSON : les requêtes cross-site en POST ne l'envoient pas), Secure
// en production uniquement (HTTPS requis, cf. AuthController).
export const SESSION_COOKIE_NAME = 'session';

// 24h — durée de session raisonnable pour un dashboard bancaire consulté quotidiennement ;
// à revoir (probablement plus court + refresh token) avant une vraie mise en production.
export const SESSION_DURATION_SECONDS = 60 * 60 * 24;
