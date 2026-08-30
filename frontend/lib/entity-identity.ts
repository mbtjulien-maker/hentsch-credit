// Identité légale de l'exploitant — SOURCE UNIQUE pour toutes les pages légales
// (mentions légales, CGU, confidentialité) et les footers. Un seul endroit à modifier
// en cas de changement (adresse, contact, etc.).
//
// ⚠️ H. Hentsch Asset Management SA est un GESTIONNAIRE DE FORTUNE INDÉPENDANT (GFI) au
// sens de la LEFin, PAS une banque au sens de la LB. Ne jamais réintroduire les termes
// « banque » / « établissement bancaire » / « agrément FINMA (bancaire) » pour désigner
// l'exploitant lui-même dans les pages légales — cf. LegalSection "Statut réglementaire"
// dans app/mentions-legales/page.tsx. La FINMA ne délivre pas d'autorisation bancaire
// individuelle à un GFI : c'est un organisme de surveillance (OS) agréé par la FINMA —
// ici SO-FIT — qui supervise l'activité, y compris le volet LBA. Les avoirs des clients
// (liquidités, titres, actifs numériques) ne sont jamais détenus par l'exploitant lui-même :
// ils sont déposés sous mandat auprès d'établissements dépositaires tiers agréés.
//
// Source : Fiche_Identite_H_Hentsch_Asset_Management.pdf fournie par l'utilisateur (dev
// du projet, pour le compte de son employeur).
export const ENTITY_IDENTITY = {
  tradingName: "Hentsch Credit",

  legalName: "H. Hentsch Asset Management SA",
  legalForm: "Société Anonyme (SA)",

  registeredOffice: "Rue de Rive 23, 1260 Nyon",
  postalAddress: "Case postale 1202, 1260 Nyon 1",
  canton: "Vaud",
  country: "Suisse",

  commercialRegisterNumber: "CHE-115.630.564 (registre du commerce du canton de Vaud)",
  vatNumber: "CHE-115.630.564 TVA",

  publicationDirector: "Henri Hentsch (Président du Conseil d'administration / Fondateur)",

  // Supervision — GFI au sens de la LEFin, pas de licence bancaire directe.
  supervisoryAuthority: "Autorité fédérale de surveillance des marchés financiers (FINMA)",
  supervisionBodyName: "SO-FIT",
  supervisionBodyDescription:
    "SO-FIT (Association Suisse des Organismes de Surveillance), organisme de surveillance agréé par la FINMA, compétent pour la gestion de fortune et le respect de la loi sur le blanchiment d'argent (LBA)",
  amlBodyName: "SO-FIT",

  dataProtectionContact: "dpo@hhentsch.com",
  generalContactEmail: "office@hhentsch.com",
  generalContactPhone: "+41 22 365 22 22",

  jurisdiction: "Nyon (Canton de Vaud, Suisse), Tribunal d'arrondissement de La Côte",

  hostingProvider: "Infomaniak Network SA, Rue Eugène-Marziano 25, 1227 Les Acacias, Genève, Suisse",

  // Garde des avoirs — jamais détenus par l'exploitant en son nom propre. Deux circuits
  // distincts : actifs traditionnels (banques dépositaires tierces) vs actifs numériques
  // (prestataires de garde crypto spécialisés, nommément désignés par l'utilisateur).
  depositaryNote:
    "Les liquidités et titres des clients restent déposés sous mandat auprès de banques dépositaires tierces agréées (ex. UBS, Lombard Odier, Pictet). Ce sont ces établissements qui assurent la protection légale des avoirs déposés.",
  digitalAssetCustodians: ["Taurus SA"],
  digitalAssetCustodyNote:
    "Les actifs numériques déposés en garantie (stablecoins, or tokenisé) sont conservés par un prestataire de garde d'actifs numériques agréé, Taurus SA, spécialisé dans la conservation sécurisée de crypto-actifs pour le compte d'établissements financiers suisses.",
  depositProtectionNote:
    "La garantie des dépôts esisuisse (jusqu'à CHF 100'000 par client, sur la part en espèces) s'applique, le cas échéant, au niveau de la banque dépositaire tierce, pour la part en espèces uniquement. Elle ne s'applique pas aux actifs numériques conservés auprès des prestataires de garde crypto : H. Hentsch Asset Management SA n'accepte aucun dépôt de fonds du public en son nom propre, et les actifs numériques ne bénéficient pas du statut de dépôt bancaire garanti.",

  // Classification de la clientèle au sens de la LSFin.
  clientClassification: "clients privés",

  // Organe de médiation (LSFin) — traite les réclamations en cas d'échec de résolution
  // amiable, cf. app/reglementation/page.tsx section 6. Distinct des prestataires de
  // garde ci-dessus.
  mediationBody: "Terraxis SA",

  lastUpdated: "25 août 2026",
} as const;
