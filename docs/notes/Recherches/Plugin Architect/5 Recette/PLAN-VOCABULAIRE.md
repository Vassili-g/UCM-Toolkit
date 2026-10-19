# Plan du vocabulaire d'UCM Nomenclature

Ce plan corrige la liste « Vocabulaire » de l'onglet Règles, d'après l'export
du détail du vocabulaire (lien en bas de l'onglet, 0a98374) pris sur le
fichier Playground : 140 termes, 77 avec règle, 63 sans règle,
7 collections. Les chemins `src/…` partent de
`packages/plugin-nomenclature/`, les chemins `referentiel/…` de
`packages/kit/src/`.

## La cause commune

Le kit découpe un segment de deux façons.

| Fonction | Rôle | `StressTest` | `lineheight` | `Padding-x` |
|---|---|---|---|---|
| `decouperSegment` (`referentiel/ecriture-des-mots.ts`) | mots à réécrire selon la casse et le séparateur | `Stress`, `Test` | `line`, `height` | `Padding`, `x` |
| `decouperPourQuestions` (`referentiel/termes-connus.ts`) | termes que les questions comparent | `StressTest` | `line-height` | `Padding`, `x` |

Le second découpage ne coupe une casse ou un bloc soudé que si chaque morceau
est un terme connu, et garde entière une propriété de `TERMES_COMPOSES`. La
liste du vocabulaire lit pourtant le premier : `listeDesTermes`
(`src/projection.ts`) parcourt `lexique.occurrences`, indexé mot par mot par
`commencerLexique` (`referentiel/lexique.ts`). Chaque mot d'écriture devient
une ligne. La liste montre donc `line-height` (31, règle UCM) et aussi `line`
(31) et `height` (35), qui comptent les mêmes noms.

Le renommage lit le même découpage en mots. Une règle sur `wrap` changerait
`ScaleWrap` en remplaçant un mot à l'intérieur d'un nom.

## Les 63 termes sans règle

| Classe | Termes | Verdict |
|---|---|---|
| Morceau d'une propriété composée | `font`, `line`, `letter`, `spacing`, `weight`, `family`, `max` | erreur : le terme est `font-size`, `line-height`, `letter-spacing`, `font-weight`, `font-family`, `max-width` |
| Morceau d'un nom coupé à la casse | `stress`, `test`, `wrap`, `links`, `tiles`, `grid`, `user`, `input`, `columns` | erreur : les termes sont `StressTest`, `TileLink`, `TileLinksWrap`, `ScaleWrap`, `TilesGrid`, `UserInput`, `TextColumns` |
| Nom de collection | `brands`, `components`, `layouts`, `primitives`, `theme`, `typography`, `utilities` | erreur : la ligne « Collections » des conventions les couvre déjà |
| Nom de palette | `titanium`, `terracota`, `poppy`, `grass`, `orange`, `sky`, `sun`, `deep` | légitime, sans pastille |
| Nom de composant | `button`, `alert` | légitime, sans pastille |
| Nom d'élément d'un composant | `head`, `badge` | légitime, sans pastille |
| Valeur de variante | `contained`, `outlined`, `standard`, `outline` | légitime |
| Propriété | `padding`, `gap`, `height` (4 sur 35), `width` (1 sur 5) | légitime |
| Côté, axe, partie | `x`, `y`, `top`, `bottom`, `left`, `right`, `col`, `rows`, `main`, `subtle`, `tag` | légitime ; `col`, `rows` et `columns` méritent une question |
| Taille hors du registre | `5xs`, `5xl`, `6xl`, `7xl`, `8xl`, `9xl` | lacune : `REGISTRE_TAILLES` s'arrête à `4xs` et `4xl` |
| Mot d'une feuille | `tile`, `link`, `description` | légitime |

Les mêmes coupes faussent des termes avec règle : `size` compte 31 noms
`fontsize`, `border` 9 noms `Border-radius` et `Border-width`, `scale` 22 noms
`ScaleWrap`, `text` 5 noms `TextColumns`.

Réponses aux cinq questions du retour :

1. Noms de composants : oui, à détecter. Aujourd'hui le kit n'a aucune notion
   de nom propre. Le plugin ne lit pas les composants Figma ; la position
   suffit : rang 0 de la collection reconnue `components`.
2. Noms de palettes : oui, à détecter. Le segment dont toutes les variables
   descendantes finissent par un cran, avec ou sans mode et profil entre les
   deux, nomme une palette. Les variables suivies par Palettes le confirment.
3. `StressTest` : erreur de `decouperSegment`, corrigée par le lot V1.
4. `height` tiré de `lineheight` : erreur, 31 des 35 noms ; corrigée par V1.
5. `wrap` tiré de `TileLinksWrap` : erreur, et de `ScaleWrap` aussi ;
   corrigée par V1.

## Un défaut de renommage relevé dans l'export

`colors/Titanium/white` et `colors/Titanium/black` deviennent
`Color/Titanium/white` et `Color/Titanium/black`. Les 22 crans voisins,
protégés par Palettes, gardent `colors/Titanium/…`. Le groupe se coupe en
deux dossiers. À revérifier sur un build qui contient le lot S du
[plan de fiabilité](./PLAN-FIABILITE.md), qui étend la protection au suivi de
Palettes. S'il persiste, le lot V5 le corrige.

## Décisions à prendre

- **DV1, forme affichée d'un terme sans règle.** Décidé : la forme la plus
  fréquente dans le fichier (`StressTest`, `lineheight`, `Outlined`). La clé
  `stress-test` reste interne. Un terme avec règle montre son terme de
  référence.
- **DV2, place des noms.** La [maquette](./Maquettes/vocabulaire/MAQUETTE-VOCABULAIRE.html)
  compare deux formes. A garde une seule liste, avec une pastille grise
  « Composant », « Élément » ou « Palette » et deux filtres de plus. B, recommandée,
  sort les noms du vocabulaire dans une section « Composants et palettes »
  rangée par intertitres. Dans les deux, la fiche d'un nom porte la pastille
  grise et le lien « Traiter comme un terme ».
- **DV3, deux ajouts au référentiel du kit.** Les tailles `5xs` et `5xl` à
  `9xl` du Playground sortent de « Sans règle » et prennent la pastille UCM,
  comme `4xl`. Les côtés et les axes (`x`, `y`, `top`, `right`, `bottom`,
  `left`) deviennent des mots connus d'UCM : ils sortent de « Sans règle », et
  une faute de frappe sur l'un d'eux devient une question. Deux oui ou non.

Le plugin ne lit pas les contrats publiés pour repérer les composants. Son
manifeste n'ouvre aucun domaine réseau, et `socle.test.ts` le vérifie ; un
dépôt privé demanderait un jeton. La règle de position trouve les quatre
composants du Playground sans réseau.

## Lots

Chaque lot passe `npm test` à la racine, `tsc` et le build du plugin. Les
tests emploient les noms du Playground déjà présents dans le dépôt.

### V1 · Les termes d'un segment (kit)

Agent : `implementeur-exigeant`, car le lexique, les questions et le
renommage lisent la même règle. Fichiers : `referentiel/ecriture-des-mots.ts`,
`referentiel/termes-connus.ts`, `referentiel/lexique.ts`,
`referentiel/harmonisation.ts`, et leurs tests.

- [ ] `termesDuSegment(segment)` rend les plages `[début, fin[` des mots de
  `decouperSegment` qui forment chaque terme de `decouperPourQuestions`. Les
  deux découpages s'alignent sur les lettres sans séparateur ; un écart
  retombe sur un terme par mot.
- [ ] `decouperPourQuestions` garde entière une taille (`5xl`, `2xs`) : la
  coupe lettre/chiffre la sépare aujourd'hui en `5` et `xl`.
- [ ] Le lexique indexe les occurrences par terme, la clé jointe par des
  tirets (`stress-test`), en plus des mots.
- [ ] `index.remplacements` ne retient qu'un remplacement qui couvre des
  termes entiers : une règle sur `wrap` ne touche plus `ScaleWrap`, la règle
  UCM `radius` remplace toujours `Border-radius`.
- [ ] Tests : les 21 segments du tableau de la cause commune et de l'export,
  dont `TextColumns` (aucune règle `text`), `Text-color-Tag` (trois termes),
  `foreground-main` (deux termes).
- [ ] Changer la version de `@ucm-kit/core`.

### V2 · La liste lit les termes (plugin)

Agent : `implementeur`. Fichiers : `src/projection.ts`, `tests/projection.test.ts`,
`tests/protocole.test.ts`.

- [ ] `listeDesTermes` et `nomsEmployant` lisent les occurrences par terme.
- [ ] Un nom de collection n'a plus de ligne.
- [ ] La fiche marque le segment du terme entier.
- [ ] Le détail du vocabulaire porte les termes de chaque segment à côté de
  ses mots.
- [ ] Test sur un extrait du Playground : `line`, `height` (31), `stress`,
  `wrap` et `components` disparaissent ; `StressTest` et `line-height`
  comptent chacun leurs noms une fois.

### V3 · La nature d'un terme (kit, puis plugin)

Agent : `implementeur`, après le choix entre A et B de DV2. Fichiers :
`referentiel/` (nouvelle fonction), `src/projection.ts`, `src/messages.ts`,
`src/ui/regles.ts`, `src/ui/listeDesTermes.ts`, `src/ui/textes.ts`,
`src/ui/feuilles.ts`.

- [ ] Le kit rend la nature d'un segment : `composant` au rang 0 de la
  collection reconnue `components`, ou au rang 0 suivi d'un groupe de
  propriétés (`color`, `size` et leurs formes tolérées) ; `element` à un rang
  suivant, suivi d'un tel groupe ; `palette` pour un segment dont chaque
  variable descendante finit par un cran, ou que l'identifiant de palette
  d'UCM Palettes désigne. Un mot du référentiel, ou employé aussi hors de ces
  positions, n'a pas de nature.
- [ ] « Traiter comme un terme » range le nom dans les règles du fichier ; il
  revient dans le vocabulaire.
- [ ] Un nom n'entre dans aucune question de paire, de faute ou de mots
  collés.
- [ ] La liste et la fiche portent la pastille ; le filtre suit DV2.

### V4 · Les registres (kit)

Agent : `executant`, après DV3. Fichiers : `referentiel/vocabulaire.ts`, la
vue illustrée (`generer-donnees-referentiel.ts`), la version du kit.

### V5 · Un groupe protégé ne se coupe pas (plugin)

Agent : `implementeur-exigeant`, seulement si le défaut persiste après le
lot S. Fichiers : `src/session.ts`, `tests/session.test.ts`.

- [ ] Un segment de groupe partagé avec une variable protégée garde son
  écriture pour toutes les variables du même chemin parent.
- [ ] Test : `colors/Titanium/white` reste à côté de
  `colors/Titanium/light/50` protégé.

## Ordre

V1, puis V2. V3 attend DV2 et sa maquette, V4 attend DV3. V5 se décide après
l'essai du lot S dans Figma.
