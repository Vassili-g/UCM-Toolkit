# Plan d'implémentation de la référence complète

Ce plan met en œuvre [PROPOSITION-REFERENCE-COMPLETE.md](./PROPOSITION-REFERENCE-COMPLETE.md) (piste P21), avec les choix de sa partie 6. La partie 7 de la proposition donne les fichiers et les critères de chaque lot. Chaque case cochée porte le hash du commit qui la livre.

## Règle du plan

- Un agent reçoit la note de son lot, la sortie de `npm run agents:lire -- <chemins>` et ses critères de fin.
- Deux agents au plus en même temps, jamais sur les mêmes fichiers. Le lot 1 et le lot 2 de [PLAN-VERDICT-UCM-CHECK.md](../Linter%20Dev/PLAN-VERDICT-UCM-CHECK.md) touchent tous deux `packages/kit/CARTE.md`, donc ils ne tournent pas ensemble.
- Aucun lot ne monte de version. La publication se fait au lot 8 du plan de P19.
- La conversation principale relit chaque diff, lance `npm run agents:diff`, commite par chemins explicites et pousse.

## Lots

- [x] 1 (ae75122b). La référence dans le kit (`implementeur`).
- [x] 2 (d641fc43). C82 dans `brands` et `utility` (`implementeur-exigeant`). Après le lot 1.
- [x] 3 (f2d9edda). Architect crée les alias (`implementeur-exigeant`). Après le lot 2.
- [x] 4 (7caae0cb). Générateur et vue illustrée (`implementeur`). Après le lot 1.
- [ ] 5. Comparaison au nouvel export (`verificateur` qui lit `_local/exports-figma/`, puis la conversation principale). Après les lots 1 et 4.
