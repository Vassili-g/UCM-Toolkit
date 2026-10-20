# Conception du lot 2

Entrée des tâches T2.1 à T2.4 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi est
dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md), lot 2.

## Ce que le code fait aujourd'hui

`memeValeur` (`plugin-explorateur/src/integrations/contrats.ts`) rend déjà
`null` pour une forme qu'elle ne sait pas comparer : graisse, durée, courbe,
alias à opacité, forme DTCG inconnue. Mais `ecartsAvecLExport` ne garde que
les `false`. Un `null` disparaît, et l'inspecteur affiche « L’export porte la
même chose que Figma pour ce token ». Trois autres trous s'ajoutent :

- un mode sans valeur dans Figma est sauté (`if (!source) continue`) ;
- `{ value: 1, unit: 'rem' }` et `{ value: 1, unit: 'ms' }` se lisent comme
  le nombre `1` et passent pour égaux ;
- une couleur se compare sans son espace : l'explorateur ne lit pas le profil
  du document.

## L'écriture de l'exporteur, que la comparaison suit

| Type Figma | `$value` écrit par l'exporteur |
|---|---|
| `COLOR` | `{ colorSpace, components: [r, g, b], alpha }`, l'espace venant du profil du document (`espaceDuProfil` : `DISPLAY_P3` donne `display-p3`, le reste `srgb`) |
| `FLOAT` | `{ value, unit: 'px' }`, ou le nombre seul pour une variable sans unité |
| `TIMING` | `{ value, unit: 's' }` : Figma range la durée en secondes (`dureeDeToken`) |
| `EASING` | `[x1, y1, x2, y2]` (`courbeDeToken`), et la variable sort du fichier si un mode n'a pas de courbe |
| `STRING`, `BOOLEAN` | la valeur telle quelle |
| alias | `{chemin}` |

`courbeDeToken`, `dureeDeToken` et `espaceDuProfil` vivent dans l'exporteur.
L'explorateur doit appliquer les mêmes règles, et il ne peut pas importer
l'exporteur (`tests/pluginsSepares.test.ts`). Les trois fonctions passent donc
dans le kit (troisième principe : une décision se calcule à un seul endroit).

## Le kit

### Les règles de l'exporteur dans `format`

Un module nouveau, `packages/kit/src/format/valeurs-figma.ts`, exporté par
`format/index.ts`, reçoit tels quels `dureeDeToken`, `courbeDeToken`,
`CauseSansCourbe` et `espaceDuProfil`. `espaceDuProfil` prend une chaîne, pas
le type Figma : le kit ne dépend pas des typages de Figma. L'exporteur les
importe du kit, et ses sorties restent identiques octet pour octet.

### Le comparateur, dans `lecteurs`

Un module nouveau, `packages/kit/src/lecteurs/comparaison-dtcg.mjs`, avec sa
déclaration `.d.mts`, exporté par `index.mjs` et `navigateur.mjs` (il est pur)
et ajouté à `porteNavigateur.test.mjs`.

```ts
/** Une valeur Figma ramenée à ce que l'exporteur en écrirait, sans dépendre des objets de Figma. */
export type ValeurFigmaPortable =
  | { readonly nature: 'couleur'; readonly espace: 'srgb' | 'display-p3'; readonly composantes: readonly [number, number, number]; readonly alpha: number }
  | { readonly nature: 'nombre'; readonly nombre: number }
  | { readonly nature: 'duree'; readonly secondes: number }
  | { readonly nature: 'courbe'; readonly points: readonly [number, number, number, number] | null }
  | { readonly nature: 'texte'; readonly texte: string }
  | { readonly nature: 'booleen'; readonly booleen: boolean };

export type CauseNonComparable =
  | 'forme-inconnue'      // la valeur publiée n'a pas la forme que son $type annonce
  | 'unite-relative'      // rem, em : la taille en pixels dépend de la page
  | 'unite-inconnue'      // une unité que ni l'exporteur ni DTCG n'écrit pour ce type
  | 'espace-inconnu'      // un colorSpace autre que srgb et display-p3
  | 'courbe-sans-points'  // la valeur Figma n'a pas de points de contrôle
  | 'type-incompatible';  // la valeur Figma n'est pas de la nature que le $type annonce

export type Comparaison =
  | { readonly etat: 'egal' }
  | { readonly etat: 'different' }
  | { readonly etat: 'non-comparable'; readonly cause: CauseNonComparable };

/** Compare une valeur Figma à la valeur qu'un token publié porte, selon son $type. */
export function comparerAuTokenPublie(source: ValeurFigmaPortable, type: string | undefined, publiee: unknown): Comparaison;
```

Les règles, par `$type` de la feuille publiée. Toute entrée qu'aucune règle
ne couvre rend `non-comparable`, jamais `egal`.

- **`color`.** La valeur publiée est `{ colorSpace, components, alpha? }`
  (`alpha` absent vaut 1), ou un hexadécimal `#rrggbb` ou `#rrggbbaa`, lu en
  `srgb`. Un `colorSpace` autre que `srgb` et `display-p3` rend
  `espace-inconnu`. Un espace différent de celui de la source rend
  `different` : l'export a été fait sous un autre profil. Même espace : les
  quatre canaux se comparent à `0,5/255 + 1e-9` près, comme aujourd'hui.
- **`dimension`.** `{ value, unit: 'px' }` se compare au nombre. `rem` et
  `em` rendent `unite-relative`, toute autre unité `unite-inconnue`. Un nombre
  seul ou une chaîne `16px` se compare aussi (anciens exports).
- **`number`.** Un nombre se compare au nombre.
- **`duration`.** `{ value, unit }` avec `unit` `s` ou `ms` se ramène en
  secondes : `1 s` égale `1000 ms`. L'écart admis est
  `1e-9 × max(1, |valeur|)`. Toute autre unité rend `unite-inconnue`.
- **`cubicBezier`.** Un tableau de quatre nombres finis. Une source sans
  points rend `courbe-sans-points`. Sinon, les quatre nombres se comparent à
  `1e-9` près.
- **`fontWeight`.** Un nombre contre un nombre, ou une chaîne contre une
  chaîne. Un poids publié contre un nom de graisse rend `forme-inconnue`.
- **`string`, `fontFamily`.** Une chaîne contre une chaîne.
- **`boolean`.** Un booléen contre un booléen.
- **`$type` absent ou inconnu.** `forme-inconnue`.
- Une source dont la nature ne va pas avec le `$type` (une couleur face à un
  `$type` `dimension`) rend `type-incompatible`. L'écart de type est déjà
  relevé à part ; la comparaison ne conclut rien de plus.

Les alias ne passent pas par le kit : seul l'explorateur sait calculer le
chemin publié de la cible.

## L'explorateur

### Le relevé porte l'espace (T2.2)

- `Releve` (`src/lecture.ts`) gagne `espace: 'srgb' | 'display-p3'`, lu dans
  `code.ts` par `espaceDuProfil(figma.root.documentColorProfile)` du kit. Un
  relevé importé sans ce champ se lit en `srgb`, la valeur que l'exporteur
  publie pour un fichier sans profil.
- Le contraste (`src/contraste.ts`) se calcule sur la couleur en sRGB à 8 bits.
  En Display P3, les canaux passent d'abord par `p3VersRgb8` (`ucm-couleur`,
  comme Palettes).
- La copie `composantes` d'une couleur P3 s'écrit `color(display-p3 r g b)`,
  avec ` / a` quand l'alpha n'est pas 1. La copie `hexa` part de la couleur
  convertie en sRGB et garde l'annonce de son arrondi.

### La comparaison avec l'export (T2.3)

```ts
export type LimiteDExport =
  | { readonly cause: 'mode-sans-valeur'; readonly mode: string }
  | { readonly cause: 'alias-a-opacite'; readonly mode: string }
  | { readonly cause: CauseNonComparable; readonly mode: string };

export interface ComparaisonAvecLExport {
  readonly ecarts: ReadonlyArray<{ readonly ecart: EcartDExport; readonly mode?: string }>;
  readonly limites: readonly LimiteDExport[];
}

export function ecartsAvecLExport(index: Index, variable: string, feuille: FeuilleDeTokens): ComparaisonAvecLExport;
```

- Chaque mode de la collection donne exactement un résultat : un écart
  (`mode`, `alias`, `valeur`), une limite, ou une égalité.
- Un mode sans valeur dans Figma donne la limite `mode-sans-valeur`.
- Un écart de `type` arrête la comparaison des valeurs : aucun mode n'est dit
  égal.
- L'explorateur construit la `ValeurFigmaPortable` depuis le type de la
  variable et sa valeur source. `TIMING` donne une durée en secondes,
  `EASING` une courbe dont les points viennent de `courbeDeToken` du kit
  appliqué à la valeur brute, et `COLOR` prend l'espace du relevé.
- `memeValeur` et `valeurDtcg` disparaissent au profit du kit, sauf la
  comparaison des alias.

### Le contrôle du profil

```ts
export type CauseDeLimiteDuProfil = 'role-inconnu' | 'mode-non-reconnu' | 'mode-sans-valeur' | 'cible-sans-couche';
export interface LimiteDuProfil {
  readonly cause: CauseDeLimiteDuProfil;
  readonly cle: string;
  readonly variable: string;
  readonly mode?: string;
}
export interface ControleDuProfil {
  readonly constats: readonly ConstatDuProfil[];
  readonly limites: readonly LimiteDuProfil[];
}
export function controlerLeProfil(index, couches, options): ControleDuProfil;
```

- `role-inconnu` : une variable de couleur de `theme` dont ni le lot 1 ni la
  table du kit ne reconnaît le rôle. Un nom qui finit par `identity` n'en
  donne pas : ce rôle n'est pas jugé, par choix.
- `mode-non-reconnu` : avec une recette, un mode de `theme` que
  `modeDuThemeReconnu` ne reconnaît pas (lot 1).
- `mode-sans-valeur` : un mode de la collection sans valeur pour la variable.
- `cible-sans-couche` : un alias dont la collection cible n'a pas de couche.
  Le lot 3 s'en sert.
- Les exceptions du designer s'appliquent aux constats, pas aux limites.
- Les appelants de `controlerLeProfil` (`src/ui/vues/integrations.ts` et les
  tests) suivent la nouvelle forme.

## Les textes d'écran (T2.4)

Écrits avec `rediger-diagnostics-ucm`, une idée par phrase. `{mode}` est le nom
du mode dans Figma.

Inspecteur, section « Figma comparé à l’export » :

| Cas | Texte |
|---|---|
| Aucun écart, aucune limite | L’export porte la même chose que Figma pour ce token. (texte actuel) |
| Aucun écart, au moins une limite | Aucun écart dans les modes comparés. |
| `mode-sans-valeur` | Mode {mode} : Figma ne donne aucune valeur. Rien n’est comparé. |
| `alias-a-opacite` | Mode {mode} : un alias avec opacité n’est pas comparé. |
| `forme-inconnue` | Mode {mode} : la valeur de l’export n’est pas comparée. Sa forme n’est pas prise en charge. |
| `unite-relative` | Mode {mode} : l’export écrit cette valeur en {unité}. Sa taille en pixels dépend de la page. Elle n’est pas comparée. |
| `unite-inconnue` | Mode {mode} : l’unité {unité} de l’export n’est pas comparée. |
| `espace-inconnu` | Mode {mode} : l’espace de couleur {espace} de l’export n’est pas comparé. |
| `courbe-sans-points` | Mode {mode} : cette courbe de Figma n’a pas de points de contrôle. Elle n’est pas comparée. |
| Au moins une limite, à la fin | Vérifiez à la main les modes non comparés. |

`type-incompatible` n'a pas de texte : l'écart « Type différent » est déjà
affiché. Pour `unite-relative` et `unite-inconnue`, l'explorateur lit l'unité
dans la feuille publiée.

Section du profil UCM :

| Cas | Texte |
|---|---|
| Aucun constat, aucune limite | Aucun écart au profil. (texte actuel) |
| Aucun constat, au moins une limite | Aucun écart dans ce qui a été contrôlé. |
| Nombre de limites | 1 contrôle n’a pas pu se faire. / N contrôles n’ont pas pu se faire. |
| `role-inconnu` | {variable} : son rôle dans le thème n’est pas reconnu. Sa portée et sa nuance ne sont pas vérifiées. |
| `mode-non-reconnu` | Le mode {mode} n’est pas reconnu. Sa nuance n’est pas vérifiée. Dans UCM Nomenclature, déclarez ce mot comme une autre écriture de light ou de dark. |
| `mode-sans-valeur` | {variable} n’a pas de valeur dans le mode {mode}. Ce mode n’est pas contrôlé. |
| `cible-sans-couche` | {variable} vise une variable de la collection {collection}, qui n’a pas de couche. Associez-lui une couche pour la contrôler. |

## Les tests attendus

Kit, `comparerAuTokenPublie` :

- chaque règle ci-dessus, dans ses cas `egal`, `different` et `non-comparable` ;
- `1 s` égale `1000 ms` ; `1 s` diffère de `1 ms` ;
- une forme inconnue, un `$type` absent et un `$type` inconnu rendent
  `non-comparable`, jamais `egal` ;
- les six sondes de Codex (`C02-courbe`, `espace-ignore`, `unite-ignoree`,
  `duree-unite-ignoree`, `mode-non-lu`, `theme-mode-inconnu`) deviennent des
  tests, rouges avant la correction.

Exporteur : ses tests passent sans changement d'attente après le déplacement
de `dureeDeToken`, `courbeDeToken` et `espaceDuProfil`.

Explorateur :

- les mêmes canaux en sRGB et en Display P3 donnent un contraste et une copie
  différents, et le même hexadécimal qu'une conversion par `p3VersRgb8` ;
- deux courbes identiques sont égales ;
- un relevé importé sans `espace` se lit en sRGB ;
- l'inspecteur réel, pas seulement le modèle : le texte d'égalité n'apparaît
  que si chaque mode a été comparé ; chaque limite a son texte ;
- un état de galerie par limite de l'inspecteur, et un pour les limites du
  profil.
