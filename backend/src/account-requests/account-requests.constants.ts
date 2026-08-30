// Plafond de comptes clients (rôle CLIENT) sur la plateforme — "clientèle restreinte, sur
// invitation" (cf. CLAUDE.md, mentions légales) prend ici une limite chiffrée réelle, pas
// seulement une posture. Les comptes ADMIN (back-office) ne comptent pas dans ce total :
// ce sont des places réservées aux membres, pas au personnel. Vérifié à l'approbation
// d'une demande (cf. AccountRequestsService.approve), jamais à la création de la demande
// elle-même : une demande PENDING ne réserve pas de place tant qu'elle n'est pas
// approuvée, cf. AccountCapacityReachedException.
export const MAX_CLIENT_ACCOUNTS = 5000;
