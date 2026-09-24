// Profil vérifié de H. Hentsch Asset Management SA — données FACTUELLES relevées le
// 24 septembre 2026 sur le site officiel de la société (https://hhentsch.com, pages
// "À propos de nous", "Notre philosophie", "Nos services", "Dépositaires", "Affiliation",
// "Contact"), à la demande du client : "structure les données importantes collectées afin
// de mieux présenter la boîte, avec plus de transparence". Rien ici n'est déduit ni
// arrondi : une information absente du site (encours, nombre de clients, numéro
// d'immatriculation…) n'apparaît pas. Les textes descriptifs (bios, services, piliers) sont
// traduits dans messages/*.json (AboutUs.*) ; ce fichier ne porte que les faits invariants
// par langue : noms propres, dates ISO, chiffres, adresses.
//
// Les numéros d'immatriculation/TVA et le prestataire de garde des actifs numériques
// restent dans lib/entity-identity.ts : ils viennent de la documentation interne de la
// société, pas de son site public (cf. AboutUs.sources).
export const COMPANY_PROFILE = {
  officialSite: "https://hhentsch.com",
  sourceUrl: "https://hhentsch.com/fr/a-propos-de-nous/",
  verifiedOn: "2026-09-24",

  // Logo officiel (site de la société, 340×96, fond blanc) — à poser sur un fond clair.
  logo: { src: "/brand/hhentsch-am-logo.jpg", width: 340, height: 96 },

  foundedYear: 2010,
  teamSize: 4,
  // Codes BCP-47 (noms affichés via Intl.DisplayNames, dans la langue du visiteur).
  serviceLanguages: ["fr", "en", "de", "no", "es", "pt"],

  ownership: { holding: "H. Hentsch Holding SA", privateSwissSharePct: 100 },
  affiliates: [
    { name: "HH Equity Partners SA", createdYear: 2018 },
    { name: "HH Equity Partners II SA", createdYear: 2020 },
  ],

  finma: { applicationDate: "2022-10-17", authorisationDate: "2025-09-08" },

  management: [
    { id: "hentsch", name: "Henri Hentsch" },
    { id: "dubois", name: "Alain Dubois" },
    { id: "mentha", name: "Frédéric Mentha" },
  ],

  timeline: [
    { key: "founding", date: "2010" },
    { key: "equity", date: "2018" },
    { key: "equity2", date: "2020" },
    { key: "finmaApplication", date: "2022-10-17" },
    { key: "finmaAuthorisation", date: "2025-09-08" },
  ],

  supervision: {
    body: "SO-FIT",
    fullName: "Supervisory Organisation for Financial Intermediaries & Trustees",
    address: "Rue Pedro-Meylan 2, Genève",
    website: "https://www.so-fit.ch",
  },
  mediation: {
    name: "Terraxis SA",
    address: "Rue de la Tour de l'Île 1, Genève",
    website: "https://www.terraxis.ch",
  },
  auditors: { statutory: "Fiducior SA", prudential: "Consultants Associés SA" },
  portfolioSystemPartner: { name: "TeamWork Management SA", city: "Genève" },

  phone: "+41 22 809 57 00",
  fax: "+41 22 809 57 09",
  email: "office@hhentsch.com",
} as const;
