# E7b. Matrice et tokens sans emploi

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E7a.

Fichiers : `packages/kit/src/controles/nommage.ts`, `packages/kit/src/controles/oublis.ts`,
`packages/kit/tests/stress/f5-variants/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E7.5 Au-delà de 4 096 combinaisons, une information donne le total et le nombre de variants. Sous la borne, 200 constats au plus,
  puis « et N autres » (Q-F5-7, E-44). Une valeur répétée ne donne qu'un C31 (N-38).
- [x] E7.6 Un token au nom illisible donne C32 `nom-illisible` ignorable (Q-F5-8, N-39). C32 `inutilise` ne compte pas une liaison illisible
  (E-33). Une palette hors registre donne `sans-variant` (N-40).
- [x] E7.8 N-41. Comptez les opérations sur la matrice de 16 × 16 × 16 variants. Mesurez sa durée sur le même banc.
  La cible de 2 secondes reste un objectif du harnais, sans seuil de temps réel dans `npm test`.
- [ ] E7.9 Monter la version du kit. Les nouvelles régressions F5 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les tests bornent le nombre de combinaisons et de constats. La durée de la matrice est relevée dans le harnais, hors test unitaire.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E7.5, au-delà de la borne. Phrase : `${variants} variants donnent ${combinaisons} combinaisons. Le plugin ne cherche pas les variants absents au-delà de 4 096 combinaisons.` Statut : « Vérifiez vous-même les variants à créer ».
- E7.5, sous la borne. Ligne qui suit les 200 premiers constats : `Et 1 autre variant absent` ou `Et ${n} autres variants absents`.
- E7.6, C32 `nom-illisible`. Phrase : `Le plugin ne lit pas le nom du token \`${token}\`.` Statut : « Renommez-le comme les autres tokens du composant, ou ignorez ce constat ».

## Avancement

E7.5, E7.6 et E7.8 faites, avec leurs textes. E7.9 reste pour F2 : personne ne monte la version du kit avant la fin. Pas de commit.

Fichiers :
- `packages/kit/src/controles/oublis.ts` :
  - E7.5. `matriceDeclaree` range les valeurs distinctes de chaque axe : une valeur répétée compte une fois dans le total et ne donne qu'un C31 (N-38). Au-delà de 4 096 combinaisons, une information `C31:au-dela-de-la-borne` (type `info`, `faits.genre`, `variants`, `combinaisons`) remplace la liste, qui n'était plus rendue du tout (E-44). Sous la borne, 200 constats au plus, puis une information `C31:et-autres` (`faits.autres`). La borne et le plafond sont des constantes du fichier, hors de l'API.
  - E7.8 (N-41). Les variants se rangent une fois dans un jeu de clés et chaque combinaison se cherche dans ce jeu, au lieu de parcourir les variants pour chaque combinaison. La matrice de 16 x 16 x 16 variants passe de 17 367 575 étapes (4 s) à 33 354 étapes (49 ms) sur le même banc.
  - E7.6 (N-39). Un token du composant que la grammaire ne lit pas donne C32 `nom-illisible` (type `verifier`, famille `tokens`), au lieu d'être sauté.
  - E-33. `naturesDesLiaisonsIllisibles` relève la nature des champs que portent les liaisons illisibles (layers, plages de texte, variants de wrapper). `inutilise` ne s'applique plus à un token COLOR quand une liaison illisible de couleur existe, ni à un token FLOAT quand une liaison illisible de dimension existe. Une liaison illisible n'entre plus dans l'ensemble des clés liées, car sa clé est vide.
  - N-40. Un token de couleur dont aucun segment n'est une palette et dont un segment d'élément ne nomme aucun layer du composant (`estUnePaletteHorsRegistre`), dans un jeu qui a un axe de palette, donne `sans-variant`. Un élément qui nomme un layer reste `inutilise`. Le jeu sans axe de palette ne change pas.
- `packages/plugin-architect/src/sandbox/projectionsDesControles.ts` : le gabarit des oublis lit maintenant le nom des layers, `champ` et `illisible` des liaisons (layers, plages, wrappers) et le type des variables. Sans cela, la reprise de session servirait un résultat périmé.
- `packages/plugin-architect/src/ui/textes/ignores.ts`, `src/ui/ignores/modele.ts`, `src/ui/panneau/informations.ts` : les textes de la note. Les deux informations de C31 s'affichent dans la section Informations (`ligneDInformation`), la phrase de `nom-illisible` sur la carte À faire de C32.
- Tests : `packages/kit/tests/matrice-et-tokens-sans-emploi.test.ts` (20 tests) ; sur les sources d'avant le lot, 12 échouent (les 8 qui passent gardent des règles qui existaient). `packages/plugin-architect/tests/textesDeLaMatriceEtDesIcones.test.ts` pour les phrases. Attentes qui changent : `controles-composant.test.ts` (borne), `stressVariantsOperateurs.test.ts`, et dans Architect `projectionsDesControles.test.ts` et `paritesDeSession.test.ts` (un nom de calque rejoue aussi les oublis).
- Harnais F5 : M3 attend 200 constats puis la ligne « et N autres », ou l'information de borne ; M4-1, O1-2, O3-1 à O3-3 et O6 passent de `mesure` ou d'écart à `attendu`. Le relevé d'O3 porte maintenant la liaison illisible comme le lecteur d'Architect (`illisible: true`, variable sans clé), pas seulement `lecture.manquees`. `npx tsx tests/stress/f5-variants/mesurer.ts --operateur M3|M4|O1|O3|O6` : 0 écart. M3-1 dure 75 ms (2,9 s dans `MESURE-DES-FAILLES.md`).
- Carte, invariants : `packages/kit/CARTE.md` (oublis, releve), `packages/kit/invariants/referentiel.md` (deux puces).

Décisions prises :
- Les deux informations de C31 sont de type `info`, comme la décision le dit. Une information n'a ni statut ni geste : le statut de la note pour la borne (« Vérifiez vous-même les variants à créer ») n'est pas affiché.
- N-40. Le plan ne dit pas comment distinguer une palette hors registre d'un élément. La règle retenue : le segment à la place de la palette qui ne nomme aucun layer du composant est une palette (le relevé porte tous les layers de tous les variants). Elle ne s'applique que si le jeu a un axe de palette.
- E-33. Une liaison illisible sur un champ de typographie ne protège aucun token du composant : par la règle de C65, un champ de typographie se lie à `typography`. Elle protège un token FLOAT quand son champ est une dimension, un token COLOR quand son champ est `fills` ou `strokes`.
- C32 `nom-illisible` touche tout token du composant sans lecture, y compris `Button/radius/medium` (sans famille) du relevé riche d'Architect.
- Le coût du N-40 : un changement de nom de layer rejoue maintenant les oublis (cinq familles au lieu de quatre), ce que les tests de reprise reflètent.

Commandes :
- `npm run build --workspace @ucm-kit/core` passe ; `npm run test --workspace @ucm-kit/core` : 1674 tests, seul « 32 000 noms » dépasse son chrono sous charge (13 s), il passe seul.
- `npm run test:paquet -- architect` : 2079 tests, 2 échecs hors lot (`accueilPendantLActualisation.test.ts`, `stylesUi.test.ts`, deux fichiers que la session qui travaille sur l'interface de Tokens modifie).
- `npm run typecheck` : 2 erreurs dans `packages/plugin-architect/tests/questionsEtCartesDeStructure.test.ts` (lignes 28 et 164), causées par le travail en cours sur les cartes de structure, hors lot.

Reste :
- Le statut de la borne, si le mainteneur veut le voir : il demande une carte À faire, non une information.
- Une ligne à écrire dans `packages/plugin-architect/invariants/explorateur.md` (puce « Une lecture manquée ne devient jamais un constat ») : `elle compte comme liée pour C25, C32, C64, C65, C66 et la préparation`.
- E7.9, montée de version du kit en F2.
