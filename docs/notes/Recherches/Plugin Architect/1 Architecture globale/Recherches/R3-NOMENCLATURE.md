# R3. La nomenclature : mesures et marché

**Statut :** résultats de recherche du sujet R3 de
[PLAN-DE-RECHERCHE.md](../PLAN-DE-RECHERCHE.md#r3-la-nomenclature--moteur-et-règles).
Aucune décision n'est prise ; la section 4 liste ce que ces résultats
permettent de trancher.

Lecteur : le mainteneur, pour décider des niveaux de règles de la
nomenclature et de la place de la détection automatique.

Corpus mesuré : C1, le `tokens.json` du Playground (760 feuilles), et C2, le
fichier multimarque d'un client (2 415 feuilles). C3 et C6 restent à
produire. Les termes métier et les noms de marques de C2 sont omis.

## 1. Les relevés

### 1.1 Les relevés de forme

[rapprocher-termes.mjs](../Mesures/rapprocher-termes.mjs)
porte six relevés. Sur C2, les trois relevés de forme sont exacts presque
sans exception :

| Relevé | Constats sur C2 | Faux positifs relevés |
|---|---|---|
| Mots soudés | 59 (`contrasttext`, `backgroundhovered`, `vspacingsmall`) | Aucun dans la liste lue |
| Séparateurs | 36 formes (`800-[light]`, `actions-(button---chip)`, soulignés) | Aucun |
| Modes écrits dans les noms | 1 299 segments `light` ou `dark`, 139 segments égaux à un nom de marque | Aucun : C2 déclare ces modes en colonnes |

Les fautes de frappe donnent 20 paires, dont 14 opposent `v` et `h`
(`vspacing`/`hspacing`), voulues, et une seule vraie faute
(`contrashovered`).

### 1.2 Les relevés de synonymie sans grammaire

| Relevé | C1 | C2 |
|---|---|---|
| Traduction par alias | Trouve `sizing`/`dimensions`, `border-radius`/`radius` | 100 candidats ; la tête de liste décrit le passage voulu d'une couche à la suivante (`spacing` vers `sizing`) |
| Valeur commune entre termes jamais frères | Trouve `contained`/`filled` et `standard`/`text` | 666 paires, bruit en tête |

### 1.3 Le relevé à la même place

[mesurer-positions.mjs](../Mesures/mesurer-positions.mjs) restreint la valeur
commune : deux termes de la même collection, à la même profondeur, jamais
frères, dont deux feuilles visent la même cible avec le même segment avant le
terme ou le même suffixe après lui.

| Corpus | Toutes les feuilles | Couleurs seules (`--type color`) | Vrais synonymes parmi les couleurs |
|---|---|---|---|
| C1 | 30 paires | 7 paires | Aucun |
| C2 | Non compté | 79 paires | `hover`/`hovered` (51 paires de feuilles), `hover`/`hovered-action`, `hover`/`hovered-closable` |

Deux causes produisent les faux positifs :

- **Les dimensions partagent leurs primitives.** `gap` et `height` visent la
  même valeur d'espacement sans nommer le même concept. Le filtre
  `--type color` retire ce bruit.
- **Les composants n'ont pas la même grammaire.** Dans C1, l'alerte range sa
  variante à la profondeur 4 (`alert/colors/success/outlined`) et la tuile y
  range son état (`tilelink/colors/success/default`) : le relevé apparie
  `outlined` et `default`. Dans C2, la variante d'un bouton (`outlined`)
  occupe la place de l'état de sélection d'une puce (`selected-false`).
  `contained`/`filled`, vrai synonyme de C1, échappe au relevé : le bouton a
  un niveau d'état que l'alerte n'a pas, et leurs chemins n'ont pas la même
  longueur.

### 1.4 Le vocabulaire par position

Le relevé 1 de `mesurer-positions.mjs` compte les termes distincts par
collection et par profondeur.

**Une position à vocabulaire fermé fait ressortir ses intrus.** Dans C2, la
profondeur 6 de la collection des thèmes porte les états :

| Terme | Feuilles |
|---|---|
| `focused` | 122 |
| `default` | 110 |
| `disabled` | 108 |
| `hover` | 98 |
| `pressed` | 98 |
| `surface` | 54 |
| `label` | 54 |
| `hovered` | 24 |
| `hovered-closable`, `hovered-action` | 12 chacun |

`hovered` est une flexion de `hover` à la même position. `surface` et `label`
sont des rôles rangés à la place d'un état. La profondeur 7 porte quatre
termes seulement : `foreground`, `background`, `border`, `action`.

**Un terme à plusieurs profondeurs signale une grammaire qui varie.** C1 en
compte 17 dans `components` (`colors` en 2 et 4, `hover` en 4 et 5,
`border-radius` en 3, 4 et 5) ; C2 en compte 72.

## 2. Ce que les relevés établissent

1. Les relevés de forme sont exacts sans nomenclature déclarée. Ils décrivent
   des observations, qui deviennent des écarts contre une convention de forme
   que l'équipe adopte. Un mode écrit dans un nom n'est pas un défaut en soi :
   les primitives de l'architecture UCM en portent.
2. Les relevés de synonymie sans grammaire ont une précision faible sur les
   deux corpus. Ils produisent des candidats à juger, jamais des constats.
3. Les erreurs de synonymie viennent surtout d'une grammaire qui varie d'un
   composant à l'autre. Déclarer la grammaire d'une collection (quelle
   position porte l'état, la variante, le rôle) rend le reste mesurable : une
   flexion ou un intrus à une position déclarée se repère sans ambiguïté.
4. Les synonymes qui ne se ressemblent pas (`error`/`danger`,
   `contained`/`filled`) demandent une table de termes. La détection
   automatique en trouve une partie seulement, et pas les plus coûteux.

L'ordre qui en découle pour la nomenclature : forme, puis grammaire par
collection, puis termes par position.

## 3. Le marché

Sources lues : les fichiers de tokens publiés, ou leur rendu CSS, de
Material 3 (`material-web`), Carbon (`@carbon/themes`), Primer
(`primer/primitives`), Spectrum (`@adobe/spectrum-tokens`), Atlassian
(`@atlaskit/tokens`), Polaris (`@shopify/polaris-tokens`) et Fluent 2
(`@fluentui/tokens`). Une case vide n'a pas pu être lue.

| Concept | Material 3 | Carbon | Primer | Spectrum | Atlassian | Polaris | Fluent 2 | UCM aujourd'hui |
|---|---|---|---|---|---|---|---|---|
| Erreur | `error` | `error` | `danger` | `negative` | `danger` | `critical` | `danger` | `error` (composants), `danger` (`color-utilities`) |
| Avertissement | Absent | `warning` | `attention` | `notice` | `warning` | `warning` | `warning` | `warning` |
| Succès | Absent | `success` | `success` | `positive` | `success` | `success` | `success` | `success` |
| Information | Absent | `info` | Absent | `informative` | `information` | `info` | | `info` |
| Survol | | `hover` | | `hover` | `hovered` | `hover` | `hover` | `hover` |
| Pressé | | `active` | | `down` | `pressed` | `active` | `pressed` | `pressed` (kit), `press` (Playground, message de l'exporteur) |
| Désactivé | | `disabled` | `disabled` | `disabled` | `disabled` | `disabled` | `disabled` | `disabled` (kit), `disable` (Playground) |
| Sélectionné | | `selected` | | `selected` | `selected` | `selected` | `selected` | Aucun terme |
| Focus | | `focus` | | `focus-indicator` | `focused` | `focus` | `focus` | `focus` |
| Contenu posé sur un fond | `on-*` | `text`, `icon` | `fg` | `content` | `text`, `icon` | `text` | `foreground` | `foreground` |
| Fond | `surface`, `background` | `background`, `layer` | `bgColor` | `background-color` | `background` | `bg`, `surface`, `fill` | `background` | `background` |
| Bordure | `outline` | `border` | `borderColor` | `border-color` | `border` | `border` | `stroke` | `border` |
| Fond plein | | | `emphasis` | `default` | `bold` | `fill` | Rang numérique | `solid` |
| Fond teinté | `container` | | `muted` | `subtle` | `subtle` | `surface` | Rang numérique | `surface` |
| Rayon | `corner` | | `borderRadius` | `corner-radius` | `radius` | `border-radius` | `borderRadius` | `radius`, `border-radius` |
| Espacement | | `spacing` | `gap`, `padding` | `spacing`, `gap` | `space` | `space` | `spacing` | `sizing`, `dimensions`, `sizes` |
| Tailles | Longues, cran `medium` | | Longues, cran `medium` | Longues | Numériques | Numériques | Abrégées | Longues et abrégées mêlées |
| Groupes | Singulier | | Singulier | Singulier | Singulier | Singulier | Singulier | Pluriel (`colors`, `sizes`) |

Ordre des segments : la plupart vont du général au particulier et finissent
par l'état (Spectrum `negative-border-color-hover`, Atlassian
`color.background.danger.bold.pressed`, Polaris, Fluent). Carbon place l'état
avant un rang (`layer-hover-01`) ; Material 3 préfixe le contenu par `on-`.
Séparateur : tiret et minuscules partout, sauf Primer et Fluent en camelCase.

## 4. Ce que ces résultats permettent de trancher

**Un consensus existe pour huit concepts** : `warning`, `success`, `hover`,
`disabled`, `selected`, `background`, `border`, et des groupes au singulier.
UCM suit déjà les sept premiers. Il s'écarte du dernier : `colors` et `sizes`
sont au pluriel dans le Playground et le fichier client.

**Aucun consensus pour quatre concepts**, où UCM doit choisir seul :

| Concept | Ce que le marché partage | Position d'UCM |
|---|---|---|
| Erreur | `danger` 3 systèmes, `error` 2, `negative` et `critical` 1 chacun | Non tranché : le Playground emploie les deux. Question 1 de RECHERCHE-NOMENCLATURE.md |
| Pressé | `pressed` 2, `active` 2, `down` 1 | Le kit a choisi `pressed`. Le message de l'exporteur et le Playground écrivent encore `press` |
| Contenu posé sur un fond | `text` 3, `foreground` ou `fg` 2, `content` 1, `on-*` 1 | Le kit a choisi `foreground` |
| Fond plein, fond teinté | Un terme par système | `solid` et `surface` sont propres à UCM ; le référentiel doit les définir, faute de terme partagé |

**Deux gestes découlent directement de ces résultats**, sans attendre
l'Architecte :

1. Reconnaître `selected` dans `STATE_SELECTORS` de l'exporteur : tous les
   systèmes lus le nomment pareil, et C2 l'emploie.
2. Corriger le message de l'exporteur qui recommande `press` et `disable` :
   ni le kit ni le marché ne les emploient.

La nomenclature par défaut peut reprendre le consensus et les choix du kit,
et laisser `error`/`danger`, le singulier des groupes et la forme des tailles
au mainteneur.

## 5. Le code d'UCM qui nomme déjà des termes

| Source | Termes | Écart |
|---|---|---|
| `TABLE_DES_DOSSIERS`, [dossiers.ts](../../../../../../packages/kit/src/emplois/dossiers.ts) | `default`, `hover`, `pressed` ; `disabled/*` | Référence du kit |
| `STATE_SELECTORS`, [semantics.ts](../../../../../../packages/plugin-socle/src/composant/contract/semantics.ts) | Accepte `hover`/`hovered`, `focus`/`focused`, `press`/`pressed`, `disable`/`disabled` | Le message d'un état inconnu demande de renommer la valeur « en default, hover, focus, press ou disable » : il recommande `press` et `disable`, que la table du kit n'emploie pas |
| Même fichier | Aucun état de sélection (`selected`, `checked`) | C2 porte `selected`, `selected-true`, `selected-false`, `unselected` |
| `SIZE_VALUES`, même fichier | `tiny`, `small`, `medium`, `large`, `big`, `huge`, `4xs` à `4xl`, `xxl`, `xxxl` | Reconnaît deux formes de la même échelle sans en recommander une |
| `LIBELLE_DE_LA_VARIABLE`, [fr.ts](../../../../../../packages/plugin-palettes/src/i18n/fr.ts) | Libellés français des variables de `theme` (`solid/default` : « bouton ») | Propres à Palettes : l'explorateur et `ucm check` n'en ont pas |

## Fichiers

| Fichier | Rôle |
|---|---|
| [mesurer-positions.mjs](../Mesures/mesurer-positions.mjs) | Vocabulaire par position, termes à plusieurs profondeurs, synonymes à la même place |
| [rapprocher-termes.mjs](../Mesures/rapprocher-termes.mjs) | Les six relevés de la section 1.1 et 1.2 |
