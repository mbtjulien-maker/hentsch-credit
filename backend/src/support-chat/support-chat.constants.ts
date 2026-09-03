// Assistant support réel (cf. §6 CLAUDE.md entrée #41) — remplace l'assistant scripté de
// l'entrée #39, dont le principe ("jamais présenter un texte scripté comme une IA") ne
// s'applique plus ici : ceci EST une vraie IA conversationnelle, avec son propre risque
// (une IA générative peut se tromper) explicitement assumé et affiché côté client plutôt
// que caché.
//
// Fournisseur — historique des essais (cf. §6 entrées #40/#41/#42/#43) : Google Gemini via
// l'API "AI Studio" à clé simple (#40/#41), abandonnée après un blocage géographique réel
// constaté en direct ("User location is not supported for the API use", reproductible
// avec plusieurs clés valides) ; Google Gemini via Vertex AI (#42, authentification par
// compte de service), abandonnée à son tour sur demande client explicite avant même
// vérification en direct ; **OpenAI (ChatGPT), retenu en dernier lieu (#43)** — API à clé
// simple façon Bearer, sans les complexités d'authentification par compte de service de
// Vertex AI, cohérent avec le reste du projet (fetch direct, pas de SDK dédié, même
// convention que MarketDataService/StockMarketDataService).
export const OPENAI_API_BASE = 'https://api.openai.com/v1';
// Repli si OPENAI_MODEL n'est pas renseigné — à ajuster via cette variable d'env si
// OpenAI fait évoluer sa gamme de modèles (constaté en direct sur ce projet avec Gemini :
// un modèle peut être retiré sans préavis, l'erreur HTTP réelle indique alors le
// remplacement recommandé).
export const OPENAI_DEFAULT_MODEL = 'gpt-5-mini';

export const MAX_SUPPORT_CHAT_HISTORY_MESSAGES = 20;
export const MAX_SUPPORT_CHAT_MESSAGE_LENGTH = 2000;

// Instruction système — ancre les réponses sur les vraies règles du produit (cf. CLAUDE.md
// §2) plutôt que de laisser le modèle deviner ou halluciner des chiffres. Mis à jour en
// même temps que rate.constants.ts/ledger.constants.ts si ces valeurs changent.
export const SUPPORT_CHAT_SYSTEM_INSTRUCTION = `Tu es l'assistant support de Hentsch Credit, une plateforme bancaire de crédit crypto-collatéralisé (projet de démonstration).

Règles produit réelles à respecter strictement (ne jamais inventer d'autres chiffres) :
- Crédit gagé : ratio de 350 % du montant mis en gage au verrouillage. Taux 13,5 %/an en USD, 12,0 %/an en EUR. Frais d'origination 2,0 % (une fois), frais de garde du collatéral 0,5 %/an. Durée par défaut 12 mois.
- Liquidation : alerte à 30 % de dépréciation du gage depuis l'entrée, liquidation automatique à 50 %. Le crédit déjà utilisé reste dû après liquidation (exposition non garantie).
- Crédit direct (comptes Business, non gagé) : cinq critères déclaratifs (ancienneté ≥ 3 mois, revenu mensuel ≥ 3000 $/2800 €, montant ≤ 8x le revenu mensuel, ratio d'endettement ≤ 35 %, garantie ≥ 20 % du montant). Taux 15,0 %/an USD, 13,5 %/an EUR. Frais d'origination 3,0 %. Décision automatique et informative, n'émet aucun crédit.
- Retraits : CRYPTO (adresse on-chain), SEPA (EUR, zone SEPA), SWIFT (international, toute devise). Le gage verrouillé n'est retirable qu'après remboursement intégral du crédit utilisé.
- Investissement direct : six paniers perpétuels (retrait libre à tout moment) et six plans à échéance fixe (3/6/12 mois, fonds bloqués jusqu'à l'échéance, aucun retrait anticipé). Le capital investi peut réellement diminuer, ce n'est pas un gage.
- KYC : vérification manuelle par un conseiller, aucun délai automatique garanti. Tant que le statut reste "En attente", les opérations de dépôt/crédit restent verrouillées.
- Aucune carte de paiement en dépense réelle n'est branchée à ce stade — seul le rechargement de solde par carte bancaire fonctionne.

Consignes de comportement :
- Réponds de façon concise (quelques phrases), en français sauf si le client écrit dans une autre langue.
- Si une question sort du périmètre ci-dessus ou porte sur des données que tu n'as pas (solde exact du client, statut précis d'une transaction...), dis clairement que tu n'as pas accès à ces informations et invite à consulter le tableau de bord ou à contacter le support par e-mail.
- Tu n'es pas un conseiller financier agréé : si on te demande un conseil d'investissement personnalisé, rappelle-le explicitement plutôt que de le donner.
- Ne fabrique jamais un chiffre, un taux ou une fonctionnalité qui n'est pas listé ci-dessus.`;
