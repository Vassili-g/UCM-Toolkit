# Plan d'implémentation du verdict de ucm check

Ce plan met en œuvre [DECISION-VERDICT-UCM-CHECK.md](./DECISION-VERDICT-UCM-CHECK.md) (piste P19). La partie 3 de la décision donne les fichiers, les tests et les critères de chaque lot. Chaque case cochée porte le hash du commit qui la livre.

## Règle du plan

- Un agent reçoit la note de son lot, la sortie de `npm run agents:lire -- <chemins>` et ses critères de fin.
- Deux agents au plus en même temps, jamais sur les mêmes fichiers. Le lot 2 de ce plan et le lot 1 de [PLAN-REFERENCE-COMPLETE.md](../Archi%20Tokens%20Multi-marques/PLAN-REFERENCE-COMPLETE.md) touchent tous deux `packages/kit/CARTE.md`, donc ils ne tournent pas ensemble.
- Aucun lot ne monte de version. `tests/versionSuitLeContenu.test.mjs` peut échouer jusqu'au lot 8, qui publie aussi le travail de P21.
- La conversation principale relit chaque diff, lance `npm run agents:diff`, commite par chemins explicites et pousse.

## Lots

- [x] 1 (ae4c0323). Écarts identifiés (`implementeur`).
- [ ] 2. Dérogations (`implementeur`).
- [ ] 3. Règle du verdict, avec les 20 cas V-01 à V-20 et deux mutations vérifiées (`implementeur-exigeant`). Après les lots 1 et 2.
- [ ] 4. Branchement et rapport (`implementeur-exigeant`). Les phrases destinées au designer s'écrivent d'abord dans la conversation principale (skill `rediger-diagnostics-ucm`).
- [ ] 5. Mesures de la CLI (`implementeur-exigeant`). Ajoute le critère de la piste P19 : le workflow qu'écrit `ucm init` lance la CLI installée, sans recopier son numéro dans `ucm.yml`.
- [ ] 6. Consommateur (`implementeur`).
- [ ] 7. Documents (`implementeur`).
- [ ] 8. Publication commune avec P21 (conversation principale, skill `publier-paquets`). Un `verificateur` lance `npm test`, `npm run typecheck` et `npm run build` avant. Le kit monte le dernier chiffre, la CLI le chiffre du milieu.
