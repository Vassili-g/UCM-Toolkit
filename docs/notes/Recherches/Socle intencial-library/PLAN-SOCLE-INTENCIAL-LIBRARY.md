# Plan du socle d'intencial-library

Ce plan suit la piste P18 de `docs/notes/Recherches/Evolutions globales/pistes.json`. Le travail se fait dans le repository intencial-library, sur la branche `dev`. Chaque case cochée porte le hash du commit d'intencial-library qui la livre, ou le numéro de la pull request fusionnée.

## Règle du plan

- Le mainteneur fusionne les pull requests d'intencial-library. Un agent prépare la branche et la pull request.
- Une case se coche quand la pull request qui la livre est fusionnée dans `dev`.
- Le critère de la version de la CLI suit la publication de P19 : `@ucm-kit/cli` 0.2.0 et `@ucm-kit/adapter-typescript` 0.2.11.

## Étapes

- [ ] 1. Socle React et TypeScript : `package.json`, `package-lock.json`, `tsconfig.json`, `src/`, la CLI et l'adaptateur épinglés en version exacte. Pull request #10 vers `dev` (commit `a93d61f`), CI verte, fusion par le mainteneur attendue.
- [ ] 2. `npm ci` puis `npx ucm check` chargent l'adaptateur, et le rapport contient la section de parité.
- [ ] 3. `tokens.json` exporté depuis Figma et fusionné. Pull request #9 vers `dev`, ouverte.
- [ ] 4. `npx ucm tokens css` écrit `src/tokens/tokens.css` avec les attributs des modes `intencial` et `marque-2`.
- [ ] 5. `tsc --noEmit` passe dans le job `contrats` du CI.
- [ ] 6. intencial-library épingle `@ucm-kit/cli` 0.2.0 et `@ucm-kit/adapter-typescript` 0.2.11, qui contiennent P19. La branche de la pull request #10 épingle encore 0.1.152 et 0.2.10.
