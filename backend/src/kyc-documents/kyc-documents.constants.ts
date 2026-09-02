// Contraintes de téléversement des pièces KYC (cf. §6 entrée #36 CLAUDE.md) — validées
// côté service (pas seulement côté Multer) pour un message d'erreur clair, cohérent avec
// le reste du produit (jamais une limite silencieuse).
export const MAX_KYC_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

export const ACCEPTED_KYC_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;
export type AcceptedKycMimeType = (typeof ACCEPTED_KYC_MIME_TYPES)[number];
