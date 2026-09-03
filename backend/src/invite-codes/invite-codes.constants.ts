// Format `XXXX-XXXX-AAAA` (cf. §6 CLAUDE.md entrée #40) — deux segments aléatoires de 4
// caractères + l'année en cours, ex. "58BY-IU76-2026". Alphabet complet A-Z0-9 (pas
// d'exclusion des caractères ambigus type O/0, I/1 : un conseiller transmet le code
// verbalement ou par écrit, jamais saisi à l'aveugle par le client sans le relire).
export const INVITE_CODE_SEGMENT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const INVITE_CODE_SEGMENT_LENGTH = 4;

// Usage unique, jamais réutilisable après 24h (demande client explicite) — calculé à la
// lecture (`expiresAt`), jamais un statut stocké qui pourrait dériver d'une horloge non
// rafraîchie (cf. InviteCodesService).
export const INVITE_CODE_VALIDITY_HOURS = 24;

// Un conseiller ne devrait jamais rencontrer de collision réelle (36^8 combinaisons pour
// les deux segments aléatoires par année), mais la génération reste protégée par une
// boucle de nouvelle tentative bornée plutôt que de faire confiance à la seule
// probabilité — cf. InviteCodesService.generateCode().
export const INVITE_CODE_MAX_GENERATION_ATTEMPTS = 10;
