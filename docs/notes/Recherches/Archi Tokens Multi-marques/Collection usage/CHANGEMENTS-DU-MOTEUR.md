# Les changements du moteur que demande l'architecture proposée

**Statut :** recherche. Ce document liste ce que l'architecture de
[ARCHITECTURE-PROPOSEE.html](./ARCHITECTURE-PROPOSEE.html) demanderait au
kit, à UCM Palettes, à `ucm check` et à UCM Explorateur. Aucun code n'est
modifié. Chaque décision de la
[recherche sur la collection usage](./RECHERCHE-COLLECTION-USAGE.md) qui
touche le moteur ajoute ou modifie une ligne de la section 2.

Lecteur : le mainteneur, pour décider de l'ordre des chantiers, et le
contributeur du moteur, pour savoir quels modules et quels tests bougent.

## 1. Ce que le moteur fait aujourd'hui

**La table des emplois**, dans
[`packages/kit/src/emplois/`](../../../../../packages/kit/src/emplois/), est
la source commune d'UCM Palettes, de `ucm check` et d'UCM Explorateur
([AGENTS.md](../../../../../AGENTS.md), carte du code et invariants de
`ucm check`).

- [`emplois.ts`](../../../../../packages/kit/src/emplois/emplois.ts) : huit
  emplois et leur cran. `solid` 700, `on-solid` le fond du thème, `text` 700,
  `surface` 100, `surface-card` 50, `border-control` 600,
  `border-decorative` 300, `focus` 600. Les crans obligatoires comprennent
  400 et 950.
- [`paires.ts`](../../../../../packages/kit/src/emplois/paires.ts) :
  dix-neuf paires. Le texte et le contour avancent d'un cran avec le fond
  teinté, jusqu'au quatrième rang : `text` sur `surface`, puis `text` + 1 sur
  `surface` + 1, et ainsi de suite (paires 2 à 4, 9 à 11, 17 à 19).
- [`rangs.ts`](../../../../../packages/kit/src/emplois/rangs.ts) : quatre
  rangs, `default`, `hover`, `active`, `active-hover`, et la table qui situe
  l'état d'un composant sur un rang.
- [`usages.ts`](../../../../../packages/kit/src/emplois/usages.ts) : la
  collection `usage`, vingt variables par palette, leurs cibles et leurs
  portées Figma.

**UCM Palettes** n'écrit qu'une collection : la destination choisie, par
défaut `primitives`, groupe `colors`, thèmes dans le chemin ou en modes Light
et Dark
([`destination.ts`](../../../../../packages/plugin-palettes/src/variables/destination.ts),
[`ecriture/variables.ts`](../../../../../packages/plugin-palettes/src/ecriture/variables.ts)).
Il n'écrit ni `color-brands`, ni `color-utilities`, ni `theme`, ni `usage`. Il lit
la table pour la carte des garanties, la planche, la présentation et
l'ajustement. Aucun module ne connaît le thème inversé.

**`ucm check`** juge les couleurs d'un contrat contre la table quand
`tokens.json` porte une collection `usage`
([`diagnostic-emplois.mjs`](../../../../../packages/kit/src/lecteurs/diagnostic-emplois.mjs)) :
support, état, hors de la table, paire. Le fond de page y vaut
`usage.elevation.page`.

**UCM Explorateur** calcule la cible attendue de chaque usage avec
`usagesDeLaPalette`
([`profilUcm.ts`](../../../../../packages/plugin-explorateur/src/integrations/profilUcm.ts)).

## 2. Les changements

| N° | Changement | Décision | Modules touchés | État |
|---|---|---|---|---|
| M1 | Le texte et le contour d'un fond teinté deviennent constants. Les paires en escalier sont remplacées par une paire « un texte contre ses trois fonds, la page et la carte » | Texte constant | `paires.ts`, `promesses.ts` du moteur de couleur, carte des garanties, planche, présentation, ajustement | Retenu |
| M2 | Les quatre rangs disparaissent. Un dossier a trois fonds, `default`, `hover`, `pressed` ; la sélection change de dossier | Texte constant | `rangs.ts`, `CIBLE_DE_L_ETAT`, la nature `etat` de `ucm check`, la planche (`ETATS = RANGS`), libellés des états | Retenu |
| M3 | La table passe des emplois aux dossiers : `solid`, `surface` et `page` par palette, avec `foreground` (texte et icône), `border`, `divider`, `focus`, `disabled/border`, et pour le neutre `foreground-main` et `foreground-subtle` | Dossiers `page`, `surface`, `solid` | `emplois.ts`, `usages.ts`, libellés des emplois et des rôles | Retenu ; noms des fonds à éprouver dans Figma |
| M4 | Le texte et le contour de `surface` passent de 700 et 600, en escalier, à 800 constant, et 900 dans un thème inversé | Texte constant à 800 | `emplois.ts`, `paires.ts`, mesures des garanties | Retenu |
| M5 | Le contour de chaque dossier prend la nuance de son texte : `page/border` passe de 600 à 700 | Contour de `page` | `emplois.ts` (`border-control`), paires du contour | Retenu |
| M6 | L'anneau ne change presque pas : le moteur en fait déjà un emploi de chaque palette, à la 600, mesuré contre la page (paire 12) et le fond 100 de sa palette (paire 13). Changent son nom, `page/focus` (M3), et sa nuance en thème inversé, 700 (M7). Une paire de plus le mesurerait contre le fond 100 des autres palettes, où 84 mesures sur 1 764 échouent en Light | Anneau par palette | `emplois.ts`, `paires.ts` pour la paire croisée | Déjà en place ; la paire croisée est proposée |
| M7 | Une nuance par variable et par thème : la table porte une colonne pour le thème normal et une pour le thème inversé. Le fichier remappé dans Figma applique déjà les valeurs inversées en Dark ; sans la courbe inversée, le texte blanc tombe entre 2,49 et 3,37:1 sur `solid/default` | D2 modifiée | `emplois.ts` et tous ses lecteurs ; le moteur de couleur pour les courbes inversées | Suit la décision sur le thème inversé |
| M8 | La collection `usage` disparaît. Ses noms passent dans `theme`, qui porte les modes Light et Dark | `usage` dans `theme` | `usages.ts`, `diagnostic-emplois.mjs` (`usage` détecté, `usage.elevation.page`), `profilUcm.ts` | À décider (décision 1) |
| M9 | UCM Palettes écrit `theme`, et les collections `color-brands` et `color-utilities` que `theme` vise, depuis la table et la recette, dans la forme de la section 4.8 de la recherche. La reprise signale une valeur de `theme` modifiée à la main | Personne ne tape un alias | `ecriture/variables.ts`, `variables/destination.ts`, Gestion | Retenu dans son principe ; chantier le plus long |
| M10 | Les portées Figma suivent ce que chaque variable peint : les fonds de `solid` portent aussi le contour, les nuances sous `scale` ont des portées vides | Portées (D14) | `SUPPORT_DES_USAGES` dans `usages.ts` | Essai Figma A5.1 à faire |
| M11 | `ucm check` vérifie la règle du dossier : le texte et le fond posé dessous viennent du même dossier, ou d'un dossier dont la mesure tient | Règle du dossier | `diagnostic-emplois.mjs` | À écrire |
| M12 | Le texte de `surface` d'une palette se mesure aussi sur les fonds teintés des autres palettes : une ligne neutre sélectionnée en bleu | Texte croisé | carte des garanties | Proposé |
| M13 | Les crans 400 et 950 ne servent plus aucune variable : le quatrième rang disparaît | D7 | `CRANS_DES_EMPLOIS`, validation de la recette | À décider (décision 5) |
| M14 | `surface-card` (50) et les paires 15 et 16 n'ont pas de place dans les dossiers : la carte est un fond d'`elevation` | Dossiers | `emplois.ts`, `paires.ts` | À confirmer |
| M15 | `solid/foreground` vaut blanc ou noir purs selon le réglage du thème ; `on-solid` vise aujourd'hui le fond du thème | Texte des boutons | `emplois.ts`, `usages.ts`, réglette de la carte des garanties | Suit le dossier du texte des boutons |

## 3. Ce qui bouge avec le code

- **Tests.** [`emplois.test.ts`](../../../../../packages/kit/tests/emplois.test.ts)
  fige la table, les dix-neuf paires, les dix associations, les quatre rangs,
  la cible de chaque état et les vingt usages par palette.
  [`diagnostic-emplois.test.mjs`](../../../../../packages/kit/tests/diagnostic-emplois.test.mjs)
  fige les quatre natures de constat et le silence sans collection `usage`.
  Les tests du moteur de couleur (`promesses`, `alertes`, `recette`,
  `architecture`), de la planche, des textes et de l'Explorateur citent la
  table.
- **Textes de l'interface.** Les libellés des rôles, des emplois et des
  états, et le texte de `on-solid`, dans `i18n/fr.ts` et `i18n/en.ts`
  d'UCM Palettes.
- **Documents d'autorité.** La section 11.2 de la
  [recherche initiale d'UCM Palettes](../../Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md),
  les sections 4 et 5
  d'[ARCHITECTURE-FINALE-MULTIMARQUES.md](../ARCHITECTURE-FINALE-MULTIMARQUES.md),
  et les passages d'[AGENTS.md](../../../../../AGENTS.md) sur
  `src/emplois/`, sur `ucm check` et sur la source unique de la table.

## 4. Un ordre possible

1. **La table du kit et ses tests** : M1 à M5, M13 et M14. Le changement se
   lit en un seul endroit, et ses lecteurs échouent à la compilation tant
   qu'ils n'ont pas suivi.
2. **UCM Palettes, lecture** : carte des garanties, planche, présentation et
   textes, sur la nouvelle table (M1, M2, M12).
3. **`ucm check` et l'Explorateur** : M8 et M11, une fois la décision 1
   prise.
4. **UCM Palettes, écriture de `theme`** : M9 et M10, après l'essai Figma
   des portées.
5. **Le thème inversé** : M7 et M15, après la décision du
   [dossier du texte des boutons](../../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md).
