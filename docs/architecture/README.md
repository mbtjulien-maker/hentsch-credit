# Cartographie du code

Graphes de dépendances entre fichiers, générés automatiquement via
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) (pas de configuration
maison à maintenir : ces commandes sont autosuffisantes). Référencés depuis `CLAUDE.md` §6.

- `backend-dependency-graph.svg` / `.json` — modules de `backend/src/**/*.ts` (hors `*.spec.ts`).
- `frontend-dependency-graph.svg` / `.json` — modules de `frontend/{app,components,lib}/**/*.{ts,tsx}`.

Le `.json` est la source la plus utile pour une lecture programmatique (liste des modules,
arêtes, dépendances circulaires) ; le `.svg` est la vue d'ensemble visuelle.

## Régénérer

Nécessite Graphviz (`brew install graphviz` sur macOS, fournit la commande `dot`).

```bash
# Backend
cd backend
npx --yes dependency-cruiser@18.2.0 --no-config --ts-config tsconfig.json \
  --include-only "^src" --exclude "\.spec\.ts$|node_modules" \
  --output-type dot "src/**/*.ts" \
  | dot -Tsvg -o ../docs/architecture/backend-dependency-graph.svg

npx --yes dependency-cruiser@18.2.0 --no-config --ts-config tsconfig.json \
  --include-only "^src" --exclude "\.spec\.ts$|node_modules" \
  --output-type json "src/**/*.ts" > ../docs/architecture/backend-dependency-graph.json

# Frontend
cd ../frontend
npx --yes dependency-cruiser@18.2.0 --no-config --ts-config tsconfig.json \
  --include-only "^(app|components|lib)" --exclude "node_modules|\.next" \
  --output-type dot "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" "lib/**/*.{ts,tsx}" \
  | dot -Tsvg -o ../docs/architecture/frontend-dependency-graph.svg

npx --yes dependency-cruiser@18.2.0 --no-config --ts-config tsconfig.json \
  --include-only "^(app|components|lib)" --exclude "node_modules|\.next" \
  --output-type json "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" "lib/**/*.{ts,tsx}" \
  > ../docs/architecture/frontend-dependency-graph.json
```

> ⚠️ N'invoquez jamais `npx depcruise` (sans le nom complet du package) : c'est un nom de
> paquet npm distinct, un "placeholder" de sécurité publié par Aikido pour prévenir le
> squatting de nom (dependency confusion) — il ne fait rien. Le vrai paquet s'appelle
> `dependency-cruiser` (le binaire s'appelle `depcruise`, mais le paquet npm ne s'appelle
> pas ainsi).

## Dernier contrôle (30 août 2026)

- Backend : 101 modules, 0 dépendance circulaire.
- Frontend : 140 modules, 0 dépendance circulaire.
