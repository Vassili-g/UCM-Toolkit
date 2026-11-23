# Plan du socle d'intencial-library

Ce plan suit la piste P18 de `docs/notes/Recherches/Evolutions globales/pistes.json`. Le travail se fait dans le repository intencial-library, sur la branche `dev`. Chaque case cochée porte le hash du commit de fusion dans `dev`.

## Règle du plan

- Le mainteneur fusionne les pull requests d'intencial-library. Un agent prépare la branche et la pull request.
- Une case se coche quand la pull request qui la livre est fusionnée dans `dev`.
- intencial-library n'a pas besoin des tokens : le plan ne prévoit ni export de `tokens.json` ni feuille CSS des tokens. Le mainteneur a fermé la pull request #9 sans la fusionner.

## Étapes

- [x] 1 (intencial-library@62d32976). Socle React et TypeScript : `package.json`, `package-lock.json`, `tsconfig.json`, `src/`, la CLI et l'adaptateur épinglés en version exacte. Pull request #10, fusionnée dans `dev`.
- [ ] 2. `npm ci` puis `npx ucm check` chargent l'adaptateur, et le rapport contient la section de parité. Le CI passe déjà `npm ci` et `ucm check` ; la section de parité attend le premier contrat de composant dans `src/components`.
- [ ] 3. `tsc --noEmit` passe dans le job `contrats` du CI. Le job lance aujourd'hui `npm ci` et `ucm check`, sans `tsc`.
- [x] 4 (intencial-library@62d32976). intencial-library épingle `@ucm-kit/cli` 0.2.0 et `@ucm-kit/adapter-typescript` 0.2.11, qui contiennent P19.
