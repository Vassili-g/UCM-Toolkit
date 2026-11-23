# Zone 4 : la couleur, de bout en bout

## Étapes

- [x] 1. Relire `CONCEPT.md`, le premier audit P27, la zone 1, la spec de Palettes, les invariants de `couleur`, du kit et d'Architect
- [x] 2. Suivre les paramètres du moteur et du référentiel (crans, modes, profils, courbes, seuils, fonds, gamut)
- [x] 3. Juger une même paire de couleurs par C49, l'explorateur d'Architect, `ucm check` et Palettes (`contrastes.mts`)
- [x] 4. Mesurer le document Display P3 (`p3.mts`, `p3rampes.mts`)
- [x] 5. Mesurer les minimums de contraste de la recette (`minimums.mts`, `nontexte.mts`)
- [x] 6. Comparer la page de Palettes et la page du référentiel (`fond.mts`)
- [x] 7. Comparer les numéros de crans écrits et reconnus (`crans.mts`, `detection.mts`, `lexique.mts`, `nomenclature.mts`)
- [x] 8. Comparer les lectures des noms de modes et la profondeur d'alias (`modes.mts`, `alias.mts`)
- [x] 9. Comparer les écritures hexadécimales (`hexa.mts`)
- [x] 10. Relever le vocabulaire de la couleur face au designer (sous-agent `Explore`, relu)
- [x] 11. Fiches, inventaire `parametres-zone4.json`, contrôle de style

## Synthèse

La zone compte 10 écarts. 5 sont importants, 5 mineurs, aucun bloquant. 4 cassent la Robustesse et 6 la Confiance.

Le calcul est sain. Le contraste WCAG, la luminance, l'arrondi à 8 bits et l'hexadécimal ont une source et une loi, et quatre écritures rendent les mêmes octets sur 8 cas limites. Les écarts tiennent aux entrées que chaque juge accepte et aux seuils qu'il applique.

C49 lit les composantes d'un document Display P3 comme du sRGB et bascule 20 verdicts sur 6 336 (PP-401). Palettes juge ses garanties à des minimums que le designer règle de 0,5 à 30, Architect et `ucm check` à 4,5 et 3 (PP-402), et l'aide dit à tort que ces minimums ne changent pas les couleurs (PP-403). Une icône tient à 3:1 dans C49 et manque à 4,5:1 dans `ucm check` (PP-404). `ucm check` ne juge ni une couleur translucide ni une couleur P3, et ne le dit pas (PP-405).

## Méthode

Les scripts sont rangés hors du dépôt, dans le dossier `audit-p27-zone4` du brouillon de session. Chacun importe les vraies fonctions des sources par `npx tsx`, sans copie, et rend une table. Les fiches citent leur sortie.

| Script | Ce qu'il appelle | Résultat |
|---|---|---|
| `contrastes.mts` | `controlerLAccessibilite` (C49, C50), `jugerContraste` (explorateur), `constatsDesContrastes` (`ucm check`), `mesurerCran` (Palettes) sur 13 paires | 11 paires sur 13 reçoivent des verdicts différents |
| `p3.mts`, `p3rampes.mts` | `rgb8VersP3`, `p3VersRgb8`, `versRgb8`, `rampesDe` sur 24 teintes et 140 608 couleurs | 20 verdicts sur 6 336 basculent ; écart maximal 0,274 ; 51 couleurs écrites avec une composante négative |
| `minimums.mts`, `nontexte.mts` | `rampesDe`, `verifierPromesses`, `jugerLesRampes`, `validerRecette` sur 8 références | le minimum texte change 1 à 16 crans sur 44 ; au minimum 3, 0 garantie manquée dans Palettes et 1 à 7 au seuil 4,5 |
| `fond.mts` | `couleurDeLaCarte`, `jugerLesRampes`, `CIBLES_DE_L_ELEVATION` | page de Palettes et neutral 50 égales par défaut ; 4 verdicts sur 1 800 basculent quand la courbe du 50 change |
| `crans.mts`, `detection.mts`, `lexique.mts`, `nomenclature.mts` | `planDesVariables`, `cheminConforme`, `palettesDuFichier`, `naturesDesNoms`, `detecterLesQuestions`, `nomsSelonLesReglesSync` | une palette libre perd sa nature de palette ; 32 noms sur 44 hors des formes du référentiel |
| `modes.mts` | `modeDuThemeReconnu`, `normalizeName`, `tokenCssVariable` sur 17 noms de mode | `Clair` et `Sombre`, libellés du registre, ne sont pas reconnus |
| `alias.mts` | `couleurDeLiaison` contre `constatsDesContrastes` sur des chaînes de 3 à 20 renvois | au-delà de 10 renvois, C49 ne lit plus la couleur et `ucm check` la juge |
| `hexa.mts` | `hexaDeFigma`, `hexaDeCouleur` (Architect), `hexaLu` (Palettes) sur 8 entrées, aller-retour octet et flottant 32 bits | 0 écart ; 0 aller-retour faux sur 256 |

Un sous-agent `Explore` a relevé les noms de modes et le vocabulaire des textes. Chaque ligne citée ici a été relue dans le code.

## Carte de la chaîne de la couleur

| Maillon | Lit | Écrit ou juge | Propriétaire de |
|---|---|---|---|
| Référentiel du kit (`referentiel/vocabulaire.ts`, `emplois/`) | rien | `CRANS`, `NUMEROS_DE_PALETTE`, `MODES`, `PROFILS`, `TABLE_DES_DOSSIERS`, `GARANTIES`, `SEUILS_PAR_USAGE`, `CIBLES_DE_L_ELEVATION`, contraste WCAG | crans, modes, rôles, garanties, seuils, formule |
| Moteur `ucm-couleur` | référentiel, recette | rampes en octets sRGB, promesses G1 à G9, alertes | courbes, enveloppe, ancrage, correction des textes, frontière gris et coloré |
| UCM Palettes | moteur, document Figma | variables de `primitives` (octets ÷ 255, ou composantes P3), recette en données partagées | minimums de contraste, fond de la page, liste des crans d'une palette |
| UCM Architect | variables Figma, référentiel, contrôles du kit | liens de `theme`, `brands`, `utility` ; C49 à C53 ; C82 ; explorateur | niveau AA ou AAA du fichier |
| Exporter | variables Figma | `tokens.json`, `{ colorSpace, components, alpha }` à la précision de Figma | espace du document (`espaceDuProfil`) |
| Kit lecteur et CLI | `tokens.json`, contrats | diagnostic des contrastes d'`ucm check`, `tokens.css` en `color(srgb …)` ou `color(display-p3 …)` | rôles de rendu et leur seuil (`SEUILS_PAR_ROLE`) |
| Inventaire et planche | kit compilé, moteur | `INVENTAIRE-UCM.html`, `PLANCHE-DU-MOTEUR.html` | rien ; générés, gardés par leur test de fraîcheur |

## Ce qui est sain

| Paramètre ou règle | Source unique | Garde |
|---|---|---|
| Luminance et contraste WCAG 2 | `contraste`, `luminanceRelative`, `packages/kit/src/emplois/contraste.ts` | loi D-09 de `tests/reglesUniques.test.ts` (`0.2126` hors du propriétaire) ; `packages/kit/tests/oracleContraste.test.ts` |
| Comparaison au seuil et écriture d'un contraste | `atteintLeSeuil`, `contrasteTronque`, `ecrireContraste`, même fichier | lois D-08 de `reglesUniques` |
| Encre noire ou blanche | `encreLisible`, même fichier | loi D-10 |
| Composante de Figma vers octet et hexadécimal | `versOctet`, `versRgb8`, `hexaDeFigma`, `packages/kit/src/emplois/couleur.ts` | loi D-24 ; `hexa.mts` rend les mêmes octets pour `hexaDeFigma`, `hexaDeCouleur` d'Architect et `hexaLu` de Palettes sur 8 cas, dont `1,002`, `−0,001`, l'alpha `0,998` |
| Aller-retour octet, flottant 32 bits, octet | `versRgb8` | `hexa.mts` : 0 faux sur 256 |
| Aller-retour sRGB, P3, sRGB | `rgb8VersP3`, `p3VersRgb8`, `packages/couleur/src/conversions.ts` | `p3.mts` : 0 faux sur 140 608 |
| Crans, modes et profils du moteur | `CRANS`, `MODES`, `PROFILS` du référentiel, importés par `packages/couleur/src/rampe.ts:22-23` et `nuances.ts:8` | `tests/referentielUnique.test.ts` |
| Table des dossiers, crans requis, garanties | `TABLE_DES_DOSSIERS`, `GARANTIES`, `packages/kit/src/emplois/` | `referentielUnique`, `kit/tests/dossiers.test.ts`, `garanties.test.ts` |
| Seuils par défaut de la recette | `SEUILS_PAR_USAGE`, importé par `packages/couleur/src/recette.ts:11,233` | import |
| Gamut de fabrication | `gamut: 'srgb'`, `recette.ts:207` | la règle `gamut-inconnu` refuse toute autre valeur (`recette.ts:772`) |
| Courbes des préréglages | `PREREGLAGES`, `packages/couleur/src/nuances.ts:34` | `INVENTAIRE-UCM.html` et la planche les recopient par génération, sous test de fraîcheur |
| Syntaxe de la feuille CSS d'un mode | `chaineCss`, `packages/cli/src/tokens-css.mjs:431` | `[data-theme="dark-inversé"]` reste un sélecteur valide |

Un texte de 24 px à 3,45:1 tient dans C49 et manque dans `ucm check` (`contrastes.mts`, cas 5). L'en-tête de `diagnostic-contrastes.mjs` écrit cette limite, puisque le contrat ne dit pas la taille d'un texte, et le rapport la répète au designer. Ce n'est pas un écart.

Aucun outil ne calcule l'APCA. La recherche de `apca` dans `packages/*/src`, `docs/format` et `docs/guides` ne rend rien.

## Fiches

### PP-401 · C49 lit les couleurs d'un document Display P3 comme du sRGB

| | |
|---|---|
| Règle | l'espace des composantes qu'un juge du contraste reçoit de Figma |
| Implémentations | Palettes écrit dans un document `DISPLAY_P3` les composantes P3 de ses octets (`couleurPourFigma`, `packages/plugin-palettes/src/variables/releve.ts:63`), comme la spec le prévoit (`RECHERCHE-PLUGIN-PALETTES.md`, section 6.7) ; l'explorateur d'Architect les ramène en sRGB par `versSrgb` (`packages/plugin-architect/src/contraste.ts:36`, `espace.ts:28`) ; C49 et C50 passent les composantes à `versRgb8` sans lire `espaceDeCouleur` (`packages/kit/src/controles/accessibilite.ts:925`), hypothèse H1 « Display P3 est écarté » des stress tests (`packages/kit/tests/stress/f7-accessibilite/cas.ts:83`) ; `ucm check` ne juge pas une couleur `display-p3` (`packages/kit/src/lecteurs/diagnostic-contrastes.mjs:64`) |
| Entrées qui divergent | `#16A34A` sur blanc, écrits en P3 ; `#B85778`, `#9F6878`, `#BC5763` sur blanc ; `#D56F95` sur `#FAF5F8` |
| Preuve | `contrastes.mts`, cas 7 : `#16A34A` vaut 3,29 dans Palettes et l'explorateur, 3,21 dans C49, « non jugé » dans `ucm check`. `p3.mts` : sur les rampes de 24 teintes, 20 verdicts sur 6 336 basculent entre Palettes et C49, écart maximal 0,274 ; `#B85778` sur blanc vaut 4,49 dans Palettes et 4,61 dans C49 |
| Cas | le fichier de la charte est en Display P3. Palettes signale le texte `#B85778` sous 4,5:1. Architect rend le composant sans constat C49. Le rapport de la demande de fusion ne contient aucune section de contraste |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | une fonction `octetsDeFigma(couleur, espace)` dans `@ucm-kit/core/emplois`, qui porte la conversion P3 de `ucm-couleur`, appelée par C49, l'explorateur et Palettes ; le diagnostic d'`ucm check` convertit `display-p3` par la même fonction ; un test de parité rejoue `p3.mts` sur les rampes du moteur et exige 0 bascule |
| À vérifier en recette Figma | Figma garde-t-il les composantes P3 que Palettes écrit, sans les ramener en sRGB (hypothèse `[MOT-25]` de la spec) ? Garde-t-il la composante `−1,79e-16` que `rgb8VersP3` rend pour `#0000FF`, que C49 classe `couleur-hors-gamut` ? |

### PP-402 · Palettes juge les garanties à des minimums réglables, Architect et `ucm check` à des seuils fixes

| | |
|---|---|
| Paramètre | seuil de contraste du texte et des éléments graphiques |
| Implémentations | Palettes lit `recette.seuils.texte` et `recette.seuils.nonTexte`, que le designer règle dans la carte « Contrastes minimums » (`packages/plugin-palettes/src/configuration.ts:72`, `i18n/fr.ts:321`) ; la validation refuse seulement une valeur nulle ou négative (`packages/couleur/src/recette.ts:784`) ; C49 et C50 lisent `SEUILS_D_ACCESSIBILITE` (`packages/kit/src/controles/accessibilite.ts:88-92`) et le niveau AA ou AAA d'Architect (`CLE_DU_NIVEAU`, `packages/plugin-architect/src/sandbox/configuration.ts:27`) ; `ucm check` lit `SEUILS_PAR_ROLE` (`diagnostic-contrastes.mjs:33`). Aucun ne lit la recette |
| Entrées qui divergent | minimum texte 3 ; minimum texte 0,5 ou 30, que la validation accepte |
| Preuve | `minimums.mts`, section (c) : rampes fabriquées au minimum 3 puis jugées à 4,5. Palettes rend 0 garantie manquée pour chacune des 8 références ; au seuil du référentiel, `#1E6FD9` en manque 2, `#16A34A` 7, `#0891B2` 4. Section (b) : `validerRecette` accepte 0,5 et 30 |
| Cas | le designer baisse le minimum texte à 3 pour que la palette verte « passe ». Palettes affiche toutes les garanties tenues. Architect rend ensuite des C49 sur les boutons, et le designer ne sait pas lequel des deux croire |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | des bornes `MINIMUMS_ADMIS` dans `referentiel/contraste.ts`, dérivées de `SEUILS_PAR_USAGE` (pas sous le seuil AA, pas au-dessus de 21), lues par la règle `seuils-positifs` ; un test exige que C49, `ucm check` et `verifierPromesses` rendent le même verdict sur une paire au minimum par défaut |

### PP-403 · L'aide dit que les minimums ne changent pas les couleurs

| | |
|---|---|
| Paramètre | effet du minimum texte sur les rampes |
| Implémentations | la correction des textes éloigne les crans de texte jusqu'à `recette.seuils.texte` (`packages/couleur/src/textes.ts:88`), et l'ancrage déplacé le lit aussi (`ancrageDeplace.ts:58`) ; deux textes au designer disent le contraire, `aideMinimums` (« Ces seuils changent le résultat des garanties, pas les couleurs ni les niveaux WCAG. », `packages/plugin-palettes/src/i18n/fr.ts:329`) et la ligne d'import (« les couleurs restent identiques », `fr.ts:1418`) |
| Entrées qui divergent | minimum texte 3 ou 7 au lieu de 4,5 ; le minimum non-texte ne change aucune couleur |
| Preuve | `minimums.mts`, section (a) : au minimum 7, `#1E6FD9` change 16 crans sur 44 et `#64748B` 16 ; au minimum 3, `#16A34A` change 7 crans. `nontexte.mts` : le minimum non-texte à 2 puis à 4,5 change 0 cran sur 704 |
| Cas | le designer importe une recette dont le minimum texte vaut 7. L'écran d'import lui dit que ses couleurs restent identiques. Au geste suivant, Palettes réécrit 16 variables de la palette bleue |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | un test de `plugin-palettes` qui fabrique une palette aux minimums par défaut et relevés, compare les rampes, et refuse le texte `aideMinimums` quand les rampes diffèrent ; la phrase vient d'une fonction qui reçoit le nombre de crans changés |

### PP-404 · Une icône tient à 3:1 dans C49 et doit atteindre 4,5:1 dans `ucm check` et Palettes

| | |
|---|---|
| Paramètre | seuil de contraste d'une icône |
| Implémentations | le rôle `icon` porte `usageDeContraste: 'texte'` (`packages/kit/src/format/roles-de-rendu.ts:40`), donc 4,5 pour `ucm check` ; le thème promet « Texte et icônes » sur les mêmes variables (`packages/kit/src/referentiel/theme.ts:21,26,29`), jugées au seuil `texte` par G1, G3 et G5 ; C49 juge une icône au seuil `nonTexte` (`packages/kit/src/controles/accessibilite.ts:863-864`), le minimum 3:1 du critère 1.4.11 |
| Entrées qui divergent | `#8A8A8A` sur blanc, 3,45:1 |
| Preuve | `contrastes.mts`, cas 4 : C49 « tient », l'explorateur « tient 3,45 / 3 », `ucm check` « manque 3,45 < 4,5 », Palettes « nonTexte » |
| Cas | Architect valide l'icône du bouton. La demande de fusion rapporte la même couleur sous le contraste attendu, et le développeur ne sait pas s'il doit la changer |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | C49 lit le seuil d'une icône dans `SEUILS_PAR_ROLE.icon` au lieu de l'écrire ; un test de parité passe la même paire d'icône à C49 et à `constatsDesContrastes` et exige le même verdict |

### PP-405 · Les juges du contraste n'acceptent pas les mêmes couleurs, et `ucm check` se tait

| | |
|---|---|
| Règle | quelle couleur se juge, et ce que le rapport dit d'une couleur non jugée |
| Implémentations | C49 compose une couleur translucide sur son fond (`composer`, `accessibilite.ts:488`) et refuse toute composante hors de [0, 1], « jamais bornée en silence » (`accessibilite.ts:116-117`) ; l'explorateur refuse la transparence et le hors-gamut (`plugin-architect/src/contraste.ts:34-35`) ; `ucm check` ignore une couleur dont l'alpha n'est pas 1 et borne une composante hors de [0, 1] par `versRgb8` (`diagnostic-contrastes.mjs:64-67`), sans rien écrire au rapport ; `emplois/couleur.ts:3-4` pose que « 1,002 vaut `FF` » |
| Entrées qui divergent | texte noir d'alpha 0,40 sur blanc ; fond blanc de composante 1,0000001 ; composante −1e-7 ; alpha 0,999 |
| Preuve | `contrastes.mts`, cas 2b : C49 « manque 2,84 < 4,5 », l'explorateur et `ucm check` « non jugé ». Cas 3 et 3b : C49 et l'explorateur « non jugé (gamut) », `ucm check` « tient ». `hexa.mts` : l'alpha 0,999 s'écrit `#000000` dans les trois hexadécimaux, alors que C49 le compose et qu'`ucm check` l'écarte |
| Cas | le texte désactivé d'un bouton est un noir à 40 %. Architect rend un C49. La demande de fusion ne contient aucune section de contraste, et le relecteur conclut que les contrastes tiennent |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | `composer` et une tolérance `dansLeGamut` partagée passent dans `@ucm-kit/core/emplois` ; `ucm check` compose la couleur translucide sur son fond et écrit une ligne « non jugée » avec sa cause ; un test de parité rejoue les cas 2 à 3b de `contrastes.mts` |
| À vérifier en recette Figma | Figma range-t-il une variable de couleur avec une composante légèrement au-delà de 1 ou sous 0, après un collage ou une conversion d'espace ? |

### PP-406 · La page de Palettes et la page du référentiel ont deux définitions

| | |
|---|---|
| Paramètre | fond de la page et de la carte contre lesquels une garantie se juge |
| Implémentations | Palettes juge contre `recette.fonds` (`#F7F7F7` et `#0A0A0A`, `packages/couleur/src/recette.ts:231`), réglage « Fond » de la Configuration, et contre la carte que `couleurDeLaCarte` en déduit (`packages/couleur/src/jugement.ts:66`) ; le référentiel fait viser `neutral/<mode>/50` à `elevation/page` et `white` ou `neutral/dark/100` à `elevation/raised` (`CIBLES_DE_L_ELEVATION`, `packages/kit/src/referentiel/reference.ts:76-79`) ; C49 lit ces variables (`accessibilite.ts:756`). Palettes n'écrit pas `recette.fonds` dans Figma |
| Entrées qui divergent | courbe Light du 50 à 0,94 ; neutre Slate `#64748B` |
| Preuve | `fond.mts` : par défaut, le 50 et le 100 d'un gris pur valent exactement `#F7F7F7`, `#0A0A0A` et `#1C1C1C`, la coïncidence tient sans constante commune. Avec la courbe du 50 à 0,94, 4 verdicts sur 1 800 basculent (`#7B9300`, `page/border` Light, 3,25 contre 2,92). Un Fond réglé à `#FFFFFF` ou `#1E1E1E` ne fait basculer aucun verdict sur l'échantillon |
| Cas | le designer éclaircit le 50 de ses courbes. Palettes juge encore la page à `#F7F7F7`, et C49 contre la page `#EBEBEB` du fichier |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | un test du kit exige que `recetteParDefaut().fonds` égale le cran 50 d'une palette grise pure fabriquée par le moteur, et que la carte Dark égale son 100 ; Architect informe quand `elevation/page` diffère du Fond de la recette lue |

### PP-407 · Un numéro hors de `NUMEROS_DE_PALETTE` retire sa nature à toute la palette

| | |
|---|---|
| Paramètre | numéros de crans qu'une palette porte |
| Implémentations | Palettes accepte une liste libre de 4 à 13 multiples de 50, de 50 à 1050 (`BORNES_DES_CRANS_LIBRES`, `packages/couleur/src/recette.ts:457`), et détecte une palette du fichier sur tout entier en fin de nom (`packages/plugin-palettes/src/variables/detection.ts:62`) ; le référentiel ne reconnaît que `NUMEROS_DE_PALETTE`, 50 à 950, 1000 et 1050 (`packages/kit/src/referentiel/vocabulaire.ts:10`), dans les formes de `primitives` (`architecture.ts:257-260`) et dans les natures de Nomenclature (`natures.ts:112`) ; un segment qui paraît une fois sans nature perd sa nature partout (`natures.ts:169`) |
| Entrées qui divergent | liste libre `50, 150, …, 1050` ; `25` d'Untitled UI ; `1` à `12` de Radix ; `050` |
| Preuve | `detection.mts` : Palettes détecte les 6 jeux comme des palettes, Nomenclature lit 0 segment comme palette dans 5 d'entre eux. Une palette de Palettes déclarée par sa marque `palette` garde sa nature avec `50…950` (11 sur 11) et la perd avec `50…1050` au pas de 100 depuis 150 (0 sur 11). `lexique.mts` : `Primry` et `Sucess` reçoivent une question `ecriture-du-terme`, `BgBlue` une question `paire`, seulement en liste libre. `crans.mts` : 32 noms sur 44 de la liste libre sont hors des formes de `primitives`, qu'aucun contrôle ne lit encore |
| Cas | le designer passe sa palette `Sucess` en liste libre pour ajouter le 150. Nomenclature lui pose une question sur le nom de la palette, qu'elle ne posait pas la veille |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | `NUMEROS_DE_PALETTE` dérivé de `BORNES_DES_CRANS_LIBRES`, ou l'inverse ; `natures.ts` garde la nature d'un segment que la marque `palette` déclare ; un test de parité passe chaque liste que `validerRecette` accepte à `naturesDesNoms` et exige la nature `palette` |

### PP-408 · Le nom d'un mode du thème a trois lectures

| | |
|---|---|
| Paramètre | nom d'un mode de la collection `theme` |
| Implémentations | `modeDuThemeReconnu` compare la forme du nom à `light` et `dark` (`packages/kit/src/referentiel/theme.ts:93-96`), lue par Palettes (`variables/lot.ts:169-172`), Architect et les contrôles ; le registre donne pour libellés français « Clair » et « Sombre » (`vocabulaire.ts:120-121`) ; l'aperçu de la préparation d'Architect compare `toLowerCase() === 'light'`, sinon prend le premier mode (`packages/plugin-architect/src/sandbox/preparation.ts:146`) ; l'Exporter publie `normalizeName(mode.name)` (`exportTokens.ts:664`) |
| Entrées qui divergent | `Clair`, `Sombre`, `Light mode`, `Dark ` avec une espace finale, un mot déclaré dans le vocabulaire du fichier (`Jour`) |
| Preuve | `modes.mts` : `Clair` et `Sombre` ne sont pas reconnus. `Dark ` est reconnu par `modeDuThemeReconnu` et pas par la préparation. Palettes et Architect affichent « Light » et « Dark » (`plugin-palettes/src/i18n/fr.ts:100`, `plugin-architect/src/ui/textes/structure.ts:70`), et aucun écran ne montre « Clair » |
| Cas | un designer francophone nomme ses modes comme le registre les libelle, `Clair` et `Sombre`. `modesDuTheme` ne garde aucun des deux (`packages/kit/src/controles/integrite.ts:263-268`). C82 ne juge plus le cran que chaque variable vise par mode, et ses créations de rôle perdent leur correction exacte (raison `mode-sans-cible`, `integrite.ts:199`) |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | les libellés du registre entrent dans les formes tolérées de `REGISTRE_MODES` ; la préparation appelle `modeDuThemeReconnu` ; un test exige que chaque libellé du registre soit reconnu |

### PP-409 · C49 abandonne une chaîne d'alias au-delà de 10 renvois, `ucm check` la suit

| | |
|---|---|
| Paramètre | profondeur d'une chaîne d'alias de couleur |
| Implémentations | `couleurDeLiaison` rend `mode-illisible` au-delà de 10 (`packages/kit/src/controles/accessibilite.ts:423`, littéral) ; le catalogue d'Architect s'arrête à `PROFONDEUR_D_ALIAS = 10` (`packages/plugin-architect/src/catalogue.ts:119`) ; l'aperçu de la préparation compte 10 tours (`preparation.ts:142`) ; l'explorateur (`resolution.ts:108-123`) et `ucm check` (`diagnostic-contrastes.mjs:75`) suivent sans borne jusqu'au cycle |
| Entrées qui divergent | chaînes de 11, 12 et 20 renvois |
| Preuve | `alias.mts` : à 10 renvois, les deux juges lisent la couleur ; à 11, C49 rend `mode-illisible` et `ucm check` un constat à 2,85:1 |
| Cas | un fichier multi-marques chaîne `components`, `theme`, `brands`, plusieurs alias de charte et `primitives`. Architect ne juge pas le contraste, la demande de fusion le juge |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | une constante `PROFONDEUR_D_ALIAS` exportée par `@ucm-kit/core/controles`, lue par C49, le catalogue, la préparation et le diagnostic ; une ligne de `reglesUniques` refuse `profondeur > 10` hors du propriétaire |

### PP-410 · Le numéro d'une palette s'appelle « nuance » dans Palettes et « cran » dans Architect

| | |
|---|---|
| Paramètre | vocabulaire de la couleur face au designer |
| Implémentations | Palettes écrit « nuance » (`fr.ts:60`, `fr.ts:314` traduit `cran` par « Nuance ») ; le kit libelle « nuance de la palette » (`packages/kit/src/referentiel/theme.ts:49-51`) ; Architect écrit « cran » (`ui/textes/structure.ts:33,42,63`, `preparation.ts:5`) et mêle les deux dans une phrase (« Le cran dit quelle nuance de la palette le token reçoit », `preparation.ts:16`) ; Palettes dit « intensité » à l'écran et « profil » dans le lieu d'une garantie manquée (`fr.ts:507,515`) ; `lexique.ts` ne fixe aucun terme de couleur |
| Copies de nombres | « nuances 500 à 800 » (`fr.ts:414`) recopie `CRANS_DU_TEXTE_DES_BOUTONS` (`packages/couleur/src/nuances.ts:42`) ; « Le bouton reste la 700 ; son survol et son appui vont vers la page : 600, 500 » (`fr.ts:412`) recopie la table inverse de `TABLE_DES_DOSSIERS` (`packages/kit/src/emplois/dossiers.ts:57`) |
| Preuve | relevé du sous-agent, relu : 132 « nuance » et 54 « cran » dans `fr.ts`, 53 « cran » et 1 « nuance » dans les textes d'Architect |
| Cas | le designer lit « nuance 700 » dans Palettes, puis « cran 700 » dans Architect, et se demande si ce sont deux choses |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | le terme retenu entre dans `referentiel/lexique.ts` ; un motif de `scripts/controle-style.mjs` signale l'autre terme dans les catalogues de textes ; les deux phrases de `fr.ts` interpolent `CRANS_DU_TEXTE_DES_BOUTONS` et `TABLE_DES_DOSSIERS` |

## Compléments aux fiches précédentes

- PP-04. Les seuils ont une troisième source, la recette de Palettes, que le designer règle (PP-402). Architect garde aussi un niveau AA ou AAA par fichier, sans lien avec les minimums de la recette.
- PP-05. L'écart d'écriture n'est plus hypothétique. Le designer peut poser un minimum de 4,25, que Palettes écrit « 4,3:1 » (`seuilEcrit`, `fr.ts:496`).
- PP-13. La frontière compte deux autres constantes, qui décident la part de chroma et non l'étiquette grise : `CHROMA_SANS_TEINTE` (`packages/couleur/src/conversions.ts:28`, 1e-4) et `estGrisPur` (`palette.ts:72`, canaux à une unité près). Le kit et Architect ne classent aucune palette par sa chroma ; le neutre se reconnaît par son nom (`estNeutre`, `architecture.ts`).
- PP-19. Un numéro de cran n'est jamais décimal. La validation exige des entiers (`recette.ts:465,477`) et la détection refuse `0,5` (`detection.ts:62`). Le séparateur décimal ne touche que les dimensions.

## Questions au mainteneur

- PP-401, Display P3. Options : (a) la conversion P3 de `ucm-couleur` passe dans `@ucm-kit/core/emplois`, et C49 comme `ucm check` jugent une couleur P3 convertie en sRGB ; (b) Display P3 sort du périmètre partout, Palettes refuse d'écrire dans un document P3 et l'Exporter avertit. Recommandation : (a), Palettes, l'Exporter et l'explorateur gèrent déjà P3.
- PP-402, minimums de contraste. Options : (a) les minimums ne descendent pas sous les seuils du référentiel, et seul un minimum plus exigeant reste réglable ; (b) les minimums sortent de la recette ; (c) Architect et `ucm check` lisent les minimums de la recette. Recommandation : (a), un relèvement reste un choix du designer et aucun outil ne promet moins que WCAG AA.
- PP-403, aide des minimums. Options : (a) l'aide dit que le minimum texte déplace les crans de texte ; (b) la correction des textes vise toujours le seuil du référentiel, et le minimum ne change que le verdict. Recommandation : (a), la correction suit l'intention du designer.
- PP-404, seuil d'une icône. Options : (a) C49 juge une icône à 4,5:1, comme le thème qui partage ses variables avec le texte ; (b) le rôle `icon` passe à `nonTexte`, et le thème distingue l'icône du texte. Recommandation : (a), les variables `*/foreground` servent aux deux.
- PP-405, couleur translucide dans `ucm check`. Options : (a) `ucm check` compose la couleur sur son fond comme C49 ; (b) `ucm check` écrit seulement une ligne « non jugée ». Recommandation : (a), puis (b) pour ce qui reste non jugé.
- PP-406, page. Options : (a) un test tient l'égalité des défauts, et Architect informe d'un écart ; (b) Palettes juge contre le 50 de la palette neutre du fichier et retire le réglage « Fond ». Recommandation : (a), Palettes n'écrit pas `utility` et garde son réglage.
- PP-407, numéros de crans. Options : (a) le référentiel reconnaît tout numéro qu'une liste libre admet ; (b) une liste libre ne prend que des numéros de `NUMEROS_DE_PALETTE`. Recommandation : (a), sans retirer de choix au designer.
- PP-408, noms de modes. Options : (a) « Clair » et « Sombre » deviennent des formes tolérées ; (b) le registre libelle les modes « Light » et « Dark » en français aussi, comme les plugins. Recommandation : (b), les plugins disent déjà Light et Dark.
- PP-410, vocabulaire. Options : (a) « nuance » partout face au designer, « cran » dans le code ; (b) « cran » partout. Recommandation : (a), Palettes et le libellé du kit l'emploient déjà.
