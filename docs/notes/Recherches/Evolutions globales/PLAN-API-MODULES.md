# Plan d'implémentation de la prise des modules

Ce plan met en œuvre [DECISION-API-PUBLIQUE.md](./DECISION-API-PUBLIQUE.md) (piste P3) et le guide des modules (piste P4). Chaque case cochée porte le hash du commit qui la livre.

## Règle du plan

Le mainteneur ne porte pas cette connaissance. Une décision n'est livrée que si un test la fait respecter et si un agent sans contexte la lit avant de toucher le code concerné : invariants du kit routés par `.agents/domiciles.json`, skill `publier-paquets`, guide des modules. Aucune règle ne dépend de la mémoire du mainteneur.

## Stratégie de coût

- Un agent reçoit la note de son lot, la sortie de `npm run agents:lire -- <chemins>` et ses critères de fin, rien d'autre.
- Deux agents au plus en même temps, jamais sur les mêmes fichiers.
- Un implémenteur lance seulement les tests de son lot. Un `verificateur` (Haiku) lance `npm test`, `npm run typecheck` et `npm run build` une fois, avant la publication.
- La conversation principale relit chaque diff, lance `npm run agents:diff`, commite par chemins explicites et publie.

## Lots

- [x] M0 (b14cbe15). Pistes à jour. Conversation principale, après la piste P12 en cours.
  - [x] Dans `pistes.json` : P3 reçoit les points, critères et risques de la partie 3 de la décision ; ses trois questions disparaissent. P4, P6, P10 et P15 citent `@ucm-kit/core/modules` à la place de `api-publique.json`.
  - [x] `npm run vues`.
- [x] M1 (82b12725). La prise et ses garde-fous. Agent : `implementeur-exigeant` (le kit, la CLI et l'adaptateur lisent la même règle). Après P12.
  - [ ] M1.1. `packages/kit/src/modules/` (`index.mjs`, `index.d.mts`) republie les 7 fonctions et le type `Contract` de la décision, sous leur nom d'origine. `packages/kit/package.json` : porte `./modules` et fichiers publiés.
  - [ ] M1.2. `packages/kit/tests/apiPublique.test.mjs` : noms de la prise comparés à la version précédente lue dans Git, un exemple d'appel par nom sur `packages/kit/fixtures/`, entrée du journal exigée pour tout changement de la prise, chiffre du milieu exigé pour une rupture.
  - [ ] M1.3. `tests/modulesParLaPrise.test.mjs` : un paquet qui se déclare module n'importe que `@ucm-kit/core/modules`.
  - [ ] M1.4. `packages/kit/CHANGELOG.md`, première entrée « ajout » de la prise en 0.17.0.
  - [ ] M1.5. Connaissance portée par le dépôt : les règles de la décision (prise unique, numéros, préavis, journal, référentiel hors de la prise, décision avec le mainteneur) entrent dans un fichier d'invariants du kit que `npm run agents:lire -- packages/kit/src/modules/index.mjs` rend ; la skill `.agents/skills/publier-paquets/SKILL.md` dit quel chiffre monter et quand écrire le journal ; `packages/kit/README.md` dit que seule `./modules` est promise.
  - [ ] M1.6. `packages/cli/src/guide.mjs` signale un `@ucm-kit/core` installé dans le repository à une autre version que celui de la CLI, avec son test.
  - Fin : les critères de fin de la partie 3 de la décision, `npm run test --workspace @ucm-kit/core`, `npm run test:paquet -- cli`, `npm run typecheck`. Seul `tests/versionSuitLeContenu.test.mjs` peut échouer avant M3.
- [ ] M2. Le guide des modules (P4). Agent : `implementeur`. Après M1.
  - [ ] `docs/guides/MODULES.md` : où brancher un module, la prise et ses 8 noms, l'épinglage sur le kit de la CLI, la règle ESLint `no-restricted-imports` qui refuse les autres portes, comment tester un module sur les contrats de `packages/kit/fixtures/contrats/`, comment demander un nom nouveau.
  - [ ] Renvois d'une ligne depuis `AGENTS.md` (sous 12 288 octets), `docs/README.md` et `packages/kit/README.md`.
  - Fin : `npx tsx --test tests/domiciles.test.ts tests/docLinks.test.ts tests/styleDocumentaire.test.ts tests/registreDesDocuments.test.ts` passe.
- [ ] M3. Version et publication. Conversation principale.
  - [ ] Kit en 0.17.0, CLI et adaptateur épinglés sur 0.17.0 et montés, README et pins à jour, `npm run vues`.
  - [ ] Un `verificateur` lance `npm test`, `npm run typecheck`, `npm run build`.
  - [ ] Publication du kit, de la CLI puis de l'adaptateur (skill `publier-paquets`), paquets constatés par `npm view`.
