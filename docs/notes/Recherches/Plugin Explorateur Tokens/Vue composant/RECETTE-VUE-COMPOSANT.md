# Recette Figma de la vue composant

Cette recette lève les questions R1 à R8 et R10 à R14 du
[plan de recherche](./PLAN-RECHERCHE-VUE-COMPOSANT.md). Le mainteneur l'exécute
dans Figma Desktop : aucune de ses étapes n'a été jouée. R9, l'essai des outils
du marché, ne dépend pas du code et reste hors de cette recette.

Le [suivi](./SUIVI-VUE-COMPOSANT.md#conduite-quand-une-étape-échoue) dit quoi
faire quand une étape échoue.

## Préparer

1. Depuis la racine du dépôt : `npm run build --workspace ucm-explorateur-plugin`.
2. Dans Figma Desktop, `Plugins > Development > Import plugin from manifest`,
   puis `packages/plugin-explorateur/dist/manifest.json`.
3. **Fichier A.** Créer un fichier vide. Activer la bibliothèque
   `intencial-library`. Poser une instance d'Alert et une instance de
   StressTest. Ne créer aucune variable locale.
4. **Fichier B.** Dupliquer le fichier A, puis y créer une collection locale
   d'une variable.
5. Noter, pour chaque étape, le résultat observé dans la colonne « Constat ».

## Fichier A, sans variable locale

| # | Question | Geste | Attendu | Constat |
|---|---|---|---|---|
| 1 | D1, D8 | Ouvrir le plugin | La fenêtre s'ouvre à 364 × 680, sur « Sélectionnez un composant », sans barre, arbre ni onglets | - [ ] |
| 2 | R1 | Sélectionner Alert | Chaque ligne nomme son token. Aucune n'affiche un identifiant `VariableID:…` | - [ ] |
| 3 | R1 | Déplier le rayon d'Alert | Les étapes de la chaîne, chacune avec sa collection, puis la valeur 6 | - [ ] |
| 4 | R2 | Lier un calque à un token dont une cible est masquée à la publication, puis le sélectionner | La chaîne se lit jusqu'à la primitive, ou s'arrête sur « Cible inaccessible » après les étapes lues | - [ ] |
| 5 | R3 | Après ces lectures, ouvrir le panneau des variables du fichier | Noter ce que le panneau montre des variables des chaînes lues. Aucune variable locale n'est créée | - [ ] |
| 6 | R4, R5 | Poser un mode explicite sur un calque d'Alert, par exemple un autre thème, puis sélectionner Alert | L'en-tête nomme ce mode, l'étape de la collection l'affiche, et la valeur le suit | - [ ] |
| 7 | R6 | Sélectionner Alert | Une ligne par style de texte, Body/Large et Body/Small. Les variables du style ne font pas d'autres lignes | - [ ] |
| 8 | R7 | Sélectionner tour à tour une instance, un composant, un jeu de variants, un calque interne, un calque masqué | Le sujet est le composant le plus proche. Le jeu lit son variant par défaut et propose les autres. Le calque interne restreint la vue, avec le fil d'Ariane | - [ ] |
| 9 | R7 | Sélectionner deux calques | Le premier décide du sujet ; le pied compte « 1 calque ignoré » | - [ ] |
| 10 | R8 | Sélectionner StressTest, déplier chaque section | Aucune ligne ne porte la marque `≠` d'un écart avec Figma | - [ ] |
| 11 | R10 | Sélectionner StressTest | L'aperçu paraît sous l'en-tête. L'historique du fichier ne montre aucune modification | - [ ] |
| 12 | R10, R12 | Déplier Couleur, survoler la ligne `tilesgrid/colors/tile ×12` | Douze cadres posés sur les douze tuiles de l'aperçu | - [ ] |
| 13 | R12 | Survoler une ligne d'un calque rogné ou pivoté | Le cadre entoure le calque, ou aucun cadre ne paraît. Noter l'écart | - [ ] |
| 14 | R11 | Dans StressTest, cliquer sur `◇ Button ×2` | La vue montre les tokens de Button. « StressTest » dans le fil d'Ariane ramène au parent | - [ ] |
| 15 | R13 | Sélectionner StressTest, montre en main | La liste s'affiche en moins d'une seconde ; l'aperçu peut suivre | - [ ] |
| 16 | R14 | Sélectionner Alert | La couleur que Alert pose sur son icône figure dans la section Couleur d'Alert | - [ ] |
| 17 | D4 | Poser une couleur à la main sur un calque d'Alert, désélectionner, sélectionner Alert | Le pied compte « 1 sans token » ; un clic liste la valeur | - [ ] |
| 18 | Lecture seule | Fermer le plugin, ouvrir l'historique des versions | Aucune modification du fichier depuis l'ouverture du plugin | - [ ] |

## Fichier B, avec une variable locale

| # | Question | Geste | Attendu | Constat |
|---|---|---|---|---|
| 19 | D6 | Ouvrir le plugin | La fenêtre s'ouvre à 1200 × 800, avec l'onglet « Composant » après « Variables » | - [ ] |
| 20 | D6 | Sélectionner Alert, ouvrir l'onglet « Composant » | La même vue que dans le fichier A, dans le panneau de l'onglet | - [ ] |
| 21 | D8 | Redimensionner chaque fenêtre, fermer, rouvrir dans chaque fichier | Chaque disposition retrouve sa propre taille | - [ ] |

## Seconde bibliothèque

Rejouer les étapes 2, 3, 6 et 10 dans un fichier vide qui consomme une
bibliothèque sans UCM. Noter chaque divergence avec le fichier A.
