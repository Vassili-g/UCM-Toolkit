# Les changements du moteur que demande l'architecture proposée

**Statut :** recherche. Ce document liste ce que l'architecture de
[ARCHITECTURE-PROPOSEE.html](./ARCHITECTURE-PROPOSEE.html) demanderait au
kit, à UCM Palettes, à `ucm check` et à UCM Explorateur. Aucun code n'est
modifié. Chaque décision de la
[recherche sur la collection usage](./RECHERCHE-COLLECTION-USAGE.md) qui
touche le moteur ajoute ou modifie une ligne.

[CHANGEMENTS-DU-MOTEUR.html](./CHANGEMENTS-DU-MOTEUR.html) sert à valider
cette liste : le lexique complet, une maquette qui met côte à côte la
collection `theme` de Figma et l'aperçu d'UCM Palettes, l'avant et l'après
de chaque changement, et un bilan à copier.

Lecteur : le mainteneur, pour valider et ordonner les chantiers, et le
contributeur du moteur, pour savoir quels modules et quels tests bougent.

## 1. La règle du vocabulaire

UCM Palettes nomme chaque usage par le nom de sa variable dans `theme`, sans
le préfixe de palette : `surface/hover`, `page/foreground`, `solid/default`.
Le nom s'écrit en police de code ; un libellé français court le suit, tiré
du lexique de la page de validation. Les états sont ceux des variables :
`default`, `hover`, `pressed`. Une garantie s'écrit « variable sur fonds » :
`surface/foreground` sur `surface/default`, `surface/hover`,
`surface/pressed`, `elevation/page`, `elevation/raised`.

Disparaissent de l'interface : les noms d'emploi (`solid` seul, `on-solid`,
`text`, `surface-card`, `border-control`, `border-decorative`), les rangs
`active` et `active-hover`, et les mots « fond » et « fond de carte », qui
deviennent `elevation/page` et `elevation/raised`.

## 2. Ce que le moteur fait aujourd'hui

**La table des emplois**, dans
[`packages/kit/src/emplois/`](../../../../../packages/kit/src/emplois/), est
la source commune d'UCM Palettes, de `ucm check` et d'UCM Explorateur.

- [`emplois.ts`](../../../../../packages/kit/src/emplois/emplois.ts) : huit
  emplois et leur cran. `solid` 700, `on-solid` le fond du thème, `text` 700,
  `surface` 100, `surface-card` 50, `border-control` 600,
  `border-decorative` 300, `focus` 600. Les crans obligatoires comprennent
  400 et 950.
- [`paires.ts`](../../../../../packages/kit/src/emplois/paires.ts) :
  dix-neuf paires. Le texte et le contour avancent d'un cran avec le fond
  teinté, jusqu'au quatrième rang.
- [`rangs.ts`](../../../../../packages/kit/src/emplois/rangs.ts) : quatre
  rangs, `default`, `hover`, `active`, `active-hover`.
- [`usages.ts`](../../../../../packages/kit/src/emplois/usages.ts) : la
  collection `usage`, vingt variables par palette, et les usages propres au
  neutre `text-strong` 900, `text-disabled` 500, `fill-disabled` 200.

**UCM Palettes** n'écrit qu'une collection : la destination choisie, par
défaut `primitives`, groupe `colors`
([`destination.ts`](../../../../../packages/plugin-palettes/src/variables/destination.ts),
[`ecriture/variables.ts`](../../../../../packages/plugin-palettes/src/ecriture/variables.ts)).
Les chemins qu'il écrit, `colors/terracota/light/700` et
`colors/poppy/vivid/light/700`, sont ceux du fichier remappé. Il lit la
table dans l'aperçu (les accolades sous la rampe), la carte des garanties
(les arcs et les paires), le détail d'une nuance, la planche dessinée dans
Figma, l'Interface de test et les messages. Aucun module ne connaît le
thème inversé.

**`ucm check`** juge les couleurs d'un contrat contre la table quand
`tokens.json` porte une collection `usage`
([`diagnostic-emplois.mjs`](../../../../../packages/kit/src/lecteurs/diagnostic-emplois.mjs)).

**UCM Explorateur** calcule la cible attendue de chaque usage avec
`usagesDeLaPalette`
([`profilUcm.ts`](../../../../../packages/plugin-explorateur/src/integrations/profilUcm.ts)).

## 3. Changements profonds

Le calcul, la table du kit, les garanties, l'écriture dans Figma et les
lecteurs.

| N° | Changement | État | Modules |
|---|---|---|---|
| P1 | La table passe des emplois aux dossiers : treize variables par palette, les exceptions du neutre (`page/foreground-main`, `page/foreground-subtle`), `disabled/*`, deux niveaux d'`elevation` | Retenu | `emplois.ts`, `usages.ts` |
| P2 | Une nuance par variable et par thème, normal et inversé ; le thème inversé change huit variables | Décidé | `emplois.ts` et tous ses lecteurs |
| P3 | Le réglage `texteDesBoutons: { light, dark }`, blanc ou noir par thème, soit quatre combinaisons (recette au format 9, qui lit le format 8), et la courbe du thème inversé : Dark 500 à 800 à 0,45 / 0,50 / 0,55 / 0,70, Light 500 à 700 à 0,745 / 0,69 / 0,61, retenue sans essai Figma et corrigée après la mesure de 204 couleurs, où 0,71 / 0,66 / 0,58 échouait sur des violets et des roses vifs ; une courbe réglée à la main voit ses nuances 500 à 800 remplacées, après un message de confirmation ; Gestion signale les primitives « À actualiser » | Décidé | `couleur/src`, migration de format, Gestion |
| P4 | Les dix-neuf paires deviennent les garanties G1 à G7, plus G8 et G9 entre palettes (section 5) ; l'escalier et le quatrième rang disparaissent | Retenu ; G8 et G9 proposées | `paires.ts`, `couleur/src/promesses.ts` |
| P5 | Trois états, `default`, `hover`, `pressed` ; un état sélectionné prend un autre dossier ; le focus ajoute `page/focus` | Retenu | `rangs.ts`, nature `etat` de `ucm check` |
| P6 | `solid/foreground` vaut le blanc ou le noir purs selon le réglage, au lieu du fond du thème | Retenu | `emplois.ts`, `usages.ts`, garanties |
| P7 | Les crans 50, 400 et 950 ne portent plus aucune variable d'usage ; ils restent sous `scale` | À décider : obligatoires ou facultatifs (D7) | `CRANS_DES_EMPLOIS`, validation de la recette |
| P8 | Ce que chaque variable peint (fond, texte et icône, contour, anneau), pour la nature `support` de `ucm check` | À reprendre avec P1 | `SUPPORT_DES_USAGES` |
| P9 | Les fonds des mesures : le fond réglé de chaque thème est `elevation/page` ; la carte, `elevation/raised`, vaut le blanc en light et le neutre 100 en dark, par règle fixe ou par réglage | À décider | recette, `couleur/src` |
| P10 | `ucm check` lit `theme`, compare chaque alias à la table, vérifie la règle du dossier et mesure chaque garantie | Suit la décision 1 de la recherche | `diagnostic-emplois.mjs` |
| P11 | UCM Explorateur tire la cible attendue de la nouvelle table, par thème | Suit P1 | `profilUcm.ts` |
| P12 | Les tests et documents d'autorité suivent : `emplois.test.ts`, `diagnostic-emplois.test.mjs`, les tests du moteur de couleur, de la planche et des textes ; AGENTS.md, la section 11.2 de la recherche initiale d'UCM Palettes, ARCHITECTURE-FINALE | Suit P1 à P11 | tests, documents |

Le moteur fait déjà une partie du travail : `focus` est un emploi de chaque
palette à la 600, mesuré contre la page (paire 12) et le fond 100 de sa
palette (paire 13). L'anneau ne change que de nom, `page/focus`, et de
nuance en thème inversé.

Le fichier remappé dans Figma applique déjà les valeurs inversées en Dark.
Sans la courbe inversée de P3, le texte blanc y tombe entre 2,49 et 3,37:1
sur `solid/default`.

### Hors d'UCM Palettes

UCM Palettes écrit les palettes dans `primitives`, à l'endroit fixé par sa
configuration, et rien d'autre. Ce qui ne change pas : sa destination et les
chemins qu'il écrit. `color-brands`, `color-utilities` et `theme` se posent
hors du plugin, à la main comme dans le fichier remappé, ou un jour par un
autre plugin qui lirait la table du kit. Les portées des variables de `theme`
se règlent au même endroit. `ucm check` (P10) est le contrôle qui compare
ces alias à la table.

## 4. Changements d'interface

Ce que le designer lit dans UCM Palettes. Chaque écran a son état dans la
galerie du plugin (`npm run galerie`, dossier `packages/plugin-palettes`).

| N° | Écran | Aujourd'hui | Demain | État |
|---|---|---|---|---|
| I1 | Tous les textes | Emplois en police de code, noms français (« texte coloré », « fond léger »), rangs `default` à `active-hover` | Nom de variable, libellé court du lexique, trois états | Retenu |
| I2 | Aperçu, accolades (`palette-deux-intensites`) | `on-solid`, `surface` 100 à 400, `solid · text` 700 à 950, `surface-card`, `border-decorative`, `border-control · focus` | Une ligne d'accolades par dossier (`solid`, `surface`, `page`), le dossier écrit à gauche comme Soft et Vivid ; sous chaque accolade, la fin du nom de variable et son nom français ; la case tiretée devient `solid/foreground` | Retenu |
| I3 | Aperçu, thème affiché | Accolades identiques en Light et en Dark | Les accolades suivent la table du thème affiché, normal ou inversé selon le texte des boutons de ce thème | Proposé |
| I4 | Garanties (`garanties-respectees`) | Arcs en escalier, quatre colonnes d'état, paires « `text` sur `surface` », note `neutral.50` | Un éventail par texte vers ses fonds, une ligne par garantie G1 à G7, trois états au plus ; la note cite le réglage Texte des boutons | Retenu |
| I5 | Détail d'une nuance | Rôles par emploi ; contrastes contre « Fond du thème », blanc, noir | Les variables que la nuance porte dans le thème affiché ; contrastes contre `elevation/page`, `elevation/raised`, blanc, noir | Retenu |
| I6 | Planche dans Figma | Une ligne par emploi, de `surface-card` à `border-decorative`, en quatre rangs | Une ligne par dossier, chaque variable nommée comme dans `theme`, trois états, G1 à G7 | Retenu |
| I7 | Messages (`garanties-refaites`) | « Texte coloré (text) sur Fond léger (surface) » | « `surface/foreground` sur `surface/hover` », le libellé en second | Retenu |
| I8 | Interface de test (`interface-de-test-light`) | Aucun nom de variable | Survoler un élément montre la variable qui le peint ; la vue États suit les trois états | Proposé |
| I9 | Réglages communs | Pas de réglage du texte des boutons | « Texte des boutons » : Blanc, Noir, sous le fond de chaque thème, dans « Couleurs de fond », avec `solid/foreground` affiché à côté ; « Rétablir » rétablit les valeurs de sa carte ; les tests Chromium couvrent les quatre combinaisons | Décidé |
| I10 | Fonds du thème | Un réglage « Fond » ; la carte est implicite | Le fond s'appelle `elevation/page` ; la valeur de `elevation/raised` s'affiche à côté | Proposé |
| I11 | Rapport et import | Le rapport exporté nomme les paires par leurs emplois | Le rapport nomme les garanties par leurs variables ; l'import lit le format 9 | Retenu |
| I12 | Aperçu, bandes des dossiers | Accolades grises, sans délimitation entre les lignes | Une bande par dossier, sur un fond très léger ; le nom du dossier se dessine comme ce qu'il peint (`solid` en pastille pleine, `surface` en pastille teintée, `page` en contour) avec son rôle en français dessous ; l'accolade devient une rangée de petites pastilles aux couleurs des nuances qu'elle couvre ; les états s'écrivent « repos · survol · appui » dans l'ordre de leurs nuances ; la colonne de gauche passe de 34 à 56 px | Proposé |
| I13 | Aperçu, survol lié | Le survol d'une pastille signale seulement la cible ; les accolades ne réagissent pas | Survoler ou focaliser une pastille surligne chaque variable de cette nuance et la même nuance dans l'autre intensité ; survoler une variable surligne sa nuance dans chaque intensité (la case tiretée pour `solid/foreground`) ; survoler un dossier surligne ses nuances et atténue les autres ; la nuance choisie garde son surlignage ; tout suit la table du thème affiché. Les accolades restent `aria-hidden` et hors de la tabulation ; le détail de la nuance nomme ses variables (I5). Anneau et fond, pas la couleur seule ; ni délai ni animation. Tests Chromium : les trois sens, thème normal et inversé, une et deux intensités | Demandé par le mainteneur |

Fichiers touchés : `i18n/fr.ts`, `i18n/en.ts`, `presentation.ts`,
`ui/nuancier.ts` (dont son en-tête, qui dit aujourd'hui que le survol
signale seulement la cible), `ui/styles.css`, `ui/garanties.ts`, `ui/ajustement.ts`,
`planche/modele.ts`, `ui/interfaceDeTest.ts`, `rapport.ts`,
`importation.ts`, les Réglages communs et les états de la galerie.

## 5. Les garanties proposées

Mesurées sur les 42 rampes de la recherche, dans les quatre thèmes ; le
thème inversé suit la courbe de P3.

| N° | Garantie | Seuil | Light | Dark | Light inversé | Dark inversé |
|---|---|---|---|---|---|---|
| G1 | `solid/foreground` sur `solid/default`, `hover`, `pressed` | 4,5 | 126/126 | 126/126 | 116/126, pire 3,90 | 120/126, pire 3,81 |
| G2 | `solid/default` sur `elevation/page`, `raised` | 3 | 84/84 | 84/84 | 84/84 | 84/84 |
| G3 | `surface/foreground` sur `surface/*`, `elevation/*` | 4,5 | 210/210 | 210/210 | 210/210 | 210/210 |
| G4 | `surface/border`, mêmes fonds | 3 | 210/210 | 210/210 | 210/210 | 210/210 |
| G5 | `page/foreground` sur `elevation/*` | 4,5 | 84/84 | 84/84 | 84/84 | 84/84 |
| G6 | `page/border` sur `elevation/*` | 3 | 84/84 | 84/84 | 84/84 | 84/84 |
| G7 | `page/focus` sur `elevation/*` et le `surface/default` de sa palette | 3 | 124/126, pire 2,92 | 126/126 | 124/126, pire 2,92 | 126/126 |
| G8 | `page/focus` sur le `surface/default` des autres palettes (proposée) | 3 | 1 640/1 722, pire 2,83 | toutes | 1 640/1 722, pire 2,83 | toutes |
| G9 | `surface/foreground` sur les `surface/*` des autres palettes (proposée) | 4,5 | toutes | toutes | toutes | toutes |

Les échecs de G1 en thème inversé touchent la nuance où la référence est
ancrée. Le mainteneur a décidé que la référence reste ancrée
([dossier du texte des boutons](../../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md),
décision 3) : le plugin signale la garantie manquée, et le lien « Ajuster la
référence » permet d'en corriger la luminosité. Ces échecs sont attendus. Ceux de G7 et de G8 en Light et en Light inversé
touchent une seule référence verte, `#16A34A`, ancrée à la 600 en Light et
à la 700 en Light inversé : l'anneau est alors la référence elle-même.
Ceux de G7 en Light touchent une référence verte ancrée à la 600. Dans le
thème inversé, G2 se juge sur le bouton au repos (garantie 14 du dossier du
texte des boutons, décidée). `page/divider` n'a pas de minimum ; `disabled/*` est
exempté. `page/foreground-subtle` a les mesures de G5 ;
`page/foreground-main`, noir ou blanc purs, tient au moins 17:1 (blanc sur la carte dark).

## 6. Un ordre possible

1. **La table du kit et ses tests** : P1, P4 à P8, P12 pour le kit.
2. **UCM Palettes** : I1 à I8, I10 à I13 sur la nouvelle table ; P9.
3. **`ucm check` et l'Explorateur** : P10, P11.
4. **Le thème inversé** : P2, P3, I9, décidés dans le dossier du texte des
   boutons.
