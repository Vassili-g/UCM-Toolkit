# Conception du lot 6

Entrée des tâches T6.1 à T6.3 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi est
dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md), lot 6,
décisions D1 et D7, et dans le constat F08 de la
[revue de Codex](../REVUE-CODEX-DU-PLAN-FIABILITE.md). Le lot 1 est fait :
`cheminConforme` compare par `formeReconnue` et `termeReconnu`.

## Ce que le code fait aujourd'hui

La sonde `matrice-grammaire` se reproduit à l'identique : chaque nom de
`planDesVariables` passe à `cheminConforme('primitives', nom.split('/'))`. En
modes, les entrées Light et Dark d'une nuance portent le même nom.

`planDesVariables` (`plugin-palettes/src/variables/plan.ts`) écrit `[groupe,
palette, intensité si deux, thème si dans le chemin, nuance]`. La grammaire
(`kit/src/referentiel/architecture.ts`) garde les formes de même longueur, puis
accepte un terme du registre ou tout segment d'un registre extensible.

| Cas | Chemin | Verdict et cause |
|---|---|---|
| Une, onze, chemin | `color/Ocean/light/50` | accepté |
| Une, onze, modes | `color/Ocean/50` | refusé : la seule forme à trois positions est `[colors, palette, couleur absolue]`, et `REGISTRE_COULEURS_ABSOLUES` n'est pas extensible |
| Une, treize, chemin | `color/Ocean/light/1000` | `1000` et `1050` refusés : `REGISTRE_CRANS` ne porte que `CRANS` et n'est pas extensible |
| Deux, onze, modes | `color/Ocean/soft/50` | accepté à tort : `soft` tombe à la position du mode, et `REGISTRE_MODES` est extensible |
| Deux, treize | `…/1000` | `1000` et `1050` refusés |

La même confusion touche `brands` : `cheminConforme('brands', ['primary',
'soft', '500'])` rend `true`.

`cheminConforme` n'a aucun lecteur de production : seul
`packages/kit/tests/architectureReferentiel.test.ts` le lit.

`naturesDesNoms` (`kit/src/referentiel/natures.ts`) lit aussi `CRANS` : pour
`color/Ocean/{n}` à treize nuances, le rang 1 perd sa nature `palette`. Même
cause, même correction.

## Le cycle d'imports du lot 1

Le lot 1 avait créé le cycle `architecture` → `termes` → `ecriture-des-mots` →
`architecture` : importer `architecture.ts` seul levait `ReferenceError` sur
`REGISTRES_ARCHITECTURE`. Il est cassé : `formeReconnue` et `termeReconnu`
vivent dans `reconnaissance.ts`, `cheminConforme` dans `grammaire.ts`, et
`architecture.ts` ne dépend plus du découpage des mots.
`packages/kit/tests/chargementDesModules.test.mjs` charge chaque module seul,
dans un processus neuf. `reconnaitreLeChemin` va donc dans `grammaire.ts`, à
côté de `cheminConforme`, et `architecture.ts` garde les données (formes,
positions, places des thèmes). `porteeDeLaGrammaire` reste dans
`normalisation.ts`.

## Les numéros de palette

```ts
// packages/kit/src/referentiel/vocabulaire.ts, juste après CRANS
/** Les numéros qu'une palette de `primitives` peut porter : les crans, puis 1000 et 1050 des palettes à treize nuances (D1). */
export const NUMEROS_DE_PALETTE = [...CRANS, 1000, 1050] as const;
export type NumeroDePalette = (typeof NUMEROS_DE_PALETTE)[number];
```

- `REGISTRE_CRANS` ne change pas, et aucun registre n'est ajouté : un registre
  ferait entrer `1000` et `1050` dans la table de Nomenclature, l'index du
  vocabulaire et le corpus, sans besoin.
- `primitives` lit les numéros par une position de valeurs :
  `position(REGISTRE_CRANS, 'cran', NUMEROS_DE_PALETTE.map(String))`.
- `packages/couleur/src/nuances.ts` importe `NUMEROS_DE_PALETTE`, et
  `PREREGLAGES[13].crans` le vaut. Les courbes des deux numéros ajoutés restent
  dans le moteur : ce sont des valeurs de calcul. `PREREGLAGES[11]` garde
  `CRANS`.
- `naturesDesNoms` lit `NUMEROS_DE_PALETTE` là où il reconnaît une palette de
  `primitives`.
- Les dossiers du thème gardent `CRANS` : aucune variable du thème ne vise 1000
  ni 1050. Dans le thème, `scale/1000` est une autre variable, la borne pure du
  neutre ; `primary/scale/1000` reste refusé.
- `brands` et `utility` gardent `CRANS` : D1 ne nomme que `primitives`.
- Une palette aux crans libres (`BORNES_DES_CRANS_LIBRES`,
  `couleur/src/recette.ts`, qui admet par exemple `150` ou `250`) est une
  sortie libre (D7) : la grammaire ne la juge pas. D1 n'est pas élargi.

## La place des thèmes

```ts
// packages/kit/src/referentiel/architecture.ts
export const PLACES_DES_THEMES = ['chemin', 'modes'] as const;
/** Les thèmes Light et Dark : un segment du chemin, ou des modes de la collection. */
export type PlaceDesThemes = (typeof PLACES_DES_THEMES)[number];
export interface ContexteDuChemin { readonly themes: PlaceDesThemes }
```

- Le contexte porte la valeur que Palettes range déjà dans sa destination
  (`Destination.themes`) et que `DESTINATION_DES_PALETTES.themes` déclare.
- Palettes passe sa destination telle quelle :
  `reconnaitreLeChemin('primitives', nom.split('/'), destination)`.
  `ThemesDeLaDestination` (`plugin-palettes/src/variables/destination.ts`)
  devient un alias de `PlaceDesThemes`, et `validerLaDestination` teste
  `PLACES_DES_THEMES.includes(themes)`.
- Pour qu'une intensité ne soit jamais prise pour un thème, la position `mode`
  devient la position `theme` et exclut les profils, dans toutes les
  collections. `REGISTRE_MODES` reste extensible :

  ```ts
  const theme = position(REGISTRE_MODES, 'theme', undefined, PROFILS);
  ```

## Les formes

```ts
export type RoleDeSegment =
  | 'famille' | 'palette' | 'intensite' | 'theme' | 'cran' | 'couleur-absolue'
  | 'niveau' | 'dossier' | 'valeur' | 'taille' | 'propriete';

export type PositionDeChemin = {
  readonly registre: Registre;
  readonly role: RoleDeSegment;
  readonly valeurs?: readonly string[];
  readonly exclues?: readonly string[];
};
export type IdentifiantDeForme = `${Exclude<Collection, 'components'>}:${string}`;
export type FormeDeChemin = {
  readonly id: IdentifiantDeForme;
  readonly positions: readonly PositionDeChemin[];
  /** Absent : la forme vaut quelle que soit la place des thèmes. */
  readonly themes?: PlaceDesThemes;
};
```

- `position(registre, role, valeurs?, exclues?)` reçoit le rôle.
- L'identifiant se dérive des positions : le nom de la collection, `:`, puis
  pour chaque position sa valeur si `valeurs` n'en a qu'une, sinon son rôle,
  joints par `/`. Un test vérifie que deux formes n'ont jamais le même
  identifiant.

| Rôle | Positions |
|---|---|
| `famille` | `color` et `dimension` de `primitives`, les propriétés de texte, `identity` de `brands`, `elevation`, `FAMILLES_LAYOUT`, `FAMILLES_TYPOGRAPHY` |
| `palette` | `REGISTRE_PALETTES`, `paletteDeMarque`, `statut`, `neutre` |
| `intensite` | `profil` |
| `theme` | l'ancienne position `mode` |
| `cran` | `cran` (thème, `brands`, `utility`) et les numéros de `primitives` |
| `couleur-absolue` | `REGISTRE_COULEURS_ABSOLUES` |
| `niveau` | `REGISTRE_ELEVATIONS` |
| `dossier` | `REGISTRE_DOSSIERS_THEME` |
| `valeur` | `REGISTRE_VALEURS_THEME`, `REGISTRE_VALEURS_DIMENSIONNELLES`, `REGISTRE_VALEURS_TYPOGRAPHIQUES` |
| `taille` | `REGISTRE_TAILLES` |
| `propriete` | `REGISTRE_PROPRIETES_TYPOGRAPHIQUES` |

Les formes de couleur de `primitives` :

| Identifiant | Positions | Thèmes |
|---|---|---|
| `primitives:color/palette/theme/cran` | `color`, palette, thème, numéro | `chemin` |
| `primitives:color/palette/intensite/theme/cran` | `color`, palette, profil, thème, numéro | `chemin` |
| `primitives:color/palette/cran` | `color`, palette, numéro | `modes` |
| `primitives:color/palette/intensite/cran` | `color`, palette, profil, numéro | `modes` |
| `primitives:color/palette/couleur-absolue` | `color`, palette, `white` ou `black` | les deux |

Les formes des autres collections gardent leurs positions et ne portent pas
`themes`.

## La reconnaissance

```ts
// packages/kit/src/referentiel/grammaire.ts
export interface SegmentReconnu {
  /** Le segment tel qu'il est écrit. */
  readonly segment: string;
  readonly role: RoleDeSegment;
  /** L'identifiant du registre de la position. */
  readonly registre: string;
  /** L'identifiant du terme que `termeReconnu` trouve ; absent pour un nom admis par un registre extensible et pour `1000` et `1050`. */
  readonly terme?: string;
}

export type RefusDuChemin =
  | { readonly raison: 'collection-sans-grammaire' }
  | { readonly raison: 'segment-mal-forme'; readonly rang: number }
  | { readonly raison: 'hors-contexte'; readonly forme: IdentifiantDeForme }
  | { readonly raison: 'aucune-forme'; readonly forme?: IdentifiantDeForme; readonly rang?: number; readonly role?: RoleDeSegment };

export type CheminReconnu =
  | { readonly conforme: true; readonly forme: IdentifiantDeForme; readonly segments: readonly SegmentReconnu[] }
  | ({ readonly conforme: false } & RefusDuChemin);

/** Reconnaît des segments sans préfixe de collection, dans le contexte des thèmes de la collection. */
export function reconnaitreLeChemin(collection: Collection, segments: readonly string[], contexte: ContexteDuChemin): CheminReconnu;

/** Inchangé pour ses lecteurs : la reconnaissance dans le contexte de la destination de référence. */
export function cheminConforme(collection: Collection, segments: readonly string[]): boolean;
// = reconnaitreLeChemin(collection, segments, { themes: DESTINATION_DES_PALETTES.themes }).conforme
```

Ordre de décision :

1. `components` rend `collection-sans-grammaire`.
2. Un segment vide, entouré d'espaces ou qui contient `/` ou `.` rend
   `segment-mal-forme`, au premier rang fautif.
3. Les formes du contexte (sans `themes` ou de même `themes`) s'essaient dans
   l'ordre de `FORMES_DES_CHEMINS`. La première qui reconnaît chaque position
   l'emporte. Une position se reconnaît comme au lot 1 : `exclues`, puis
   `valeurs`, puis le registre ou son extensibilité.
4. Sinon, si une forme de l'autre contexte reconnaît les segments, le refus est
   `hors-contexte` avec cette forme.
5. Sinon, `aucune-forme`, avec la forme du contexte de même longueur qui
   reconnaît le plus long début (à égalité, la première), le premier rang
   refusé et son rôle.

- `cheminConforme` garde sa signature, dans le contexte `chemin`. Deux verdicts
  changent, et ce sont les corrections : `color/Ocean/soft/50` en `primitives`
  et `primary/soft/500` en `brands` deviennent faux.
- `FORMES_DES_CHEMINS` change de forme (`forme.positions`) : c'est un type
  publié, le kit monte d'un numéro mineur.

## La portée de la grammaire (D7)

```ts
// packages/kit/src/referentiel/normalisation.ts, à côté de collectionUcmReconnue
/**
 * La portée de la grammaire pour une sortie de palette : `reference` quand la collection est reconnue comme `primitives`
 * et que le groupe est un seul segment de forme reconnue `color` ; `libre` sinon.
 */
export function porteeDeLaGrammaire(nomDeCollection: string, groupe: readonly string[]): 'reference' | 'libre';
```

La grammaire s'applique au profil UCM, sur la destination de référence
(`primitives`, groupe `color`, quelle que soit l'écriture), liaison
`destination`, préréglages 11 et 13, une ou deux intensités, thèmes dans le
chemin ou en modes ; aux tests de ce lot ; puis à la loi 5 du lot 7.

Elle ne s'applique jamais à une destination libre (collection non reconnue
comme `primitives`), à un groupe personnalisé (vide, `palettes`,
`brand/color`, une forme tolérée comme `colors`), à une reprise, ni à une
palette aux crans libres. Aucun appel de production ne refuse ni ne change une
écriture par la grammaire : le lot 6 n'en ajoute aucun. Le refus de couche du
lot 14 vient d'un autre signal (décision D5 révisée).

## Les unions et les objets des modes et des profils (T6.3)

`tests/referentielUnique.test.ts` exclut les modes et les profils de ses
contrôles d'unions et d'objets. Décision : pour ces deux familles, le contrôle
d'objets ne signale que les déclarations de type (un bloc qui contient
`readonly` ou `;`). Les valeurs `{ light: …, dark: … }` sont tenues par leur
type et par le compilateur. Le commentaire du test le dit.

Les unions à dériver (`Mode` et `Profil` de `ucm-couleur`, ou les types de
l'explorateur) :

| Fichier | Écrit | Devient |
|---|---|---|
| `packages/couleur/src/recette.ts` | `Record<'light' \| 'dark', SensDuTheme>` | `Record<Mode, SensDuTheme>` |
| `packages/plugin-palettes/src/variables/detection.ts` | `IntensiteDuChemin`, `ThemeDuChemin` | `= Profil`, `= Mode` |
| `packages/plugin-palettes/src/variables/suivi.ts` | `intensite?: 'soft' \| 'vivid'` et sa lecture | `Profil`, et `PROFILS.includes` |
| `packages/plugin-palettes/src/ui/configuration.ts` | `partie as 'light' \| 'dark'` | `partie as Mode` |
| `packages/plugin-architect/src/ui/vues/integrations.ts` | `valeur as 'soft' \| 'vivid'`, `valeur as 'light' \| 'dark'` | `Intensite`, `Theme` |

Les déclarations de type d'objets à dériver, en `Readonly<Record<Mode, X>>` ou
`Readonly<Record<Profil, X>>`, ou en intersection avec ce `Record` quand
d'autres clés s'y mêlent : `couleur/src/rampe.ts`, `couleur/src/recette.ts`,
`couleur/src/reconstruction.ts`, `plugin-palettes/src/variables/reprise.ts`,
`plugin-palettes/src/planche/modele.ts`. L'implémenteur les trouve en levant
l'exclusion et en lisant les trouvailles du test.

La règle `crans` du test lit un ensemble égal à `NUMEROS_DE_PALETTE`, pour
qu'une copie qui va jusqu'à 1050 soit vue.

## Les tests attendus

Kit (`architectureReferentiel.test.ts` ou un fichier voisin) :

- `NUMEROS_DE_PALETTE` vaut `[...CRANS, 1000, 1050]` ; `REGISTRE_CRANS` garde
  onze termes.
- La matrice sur des chemins écrits : une et deux intensités, `CRANS` et
  `NUMEROS_DE_PALETTE`, contexte `chemin` et `modes`. Chaque chemin est
  conforme, avec la forme et les rôles attendus. Preuve rouge : avec les formes
  de `HEAD`, la matrice rend les comptes de Codex ;
  `cheminConforme('primitives', ['color', 'Ocean', 'light', '1000'])` est faux
  aujourd'hui.
- `color/Ocean/soft/50` en `modes` : forme
  `primitives:color/palette/intensite/cran`, segment 2 de rôle `intensite`.
  Même chose pour `Color/Ocean/Soft/50`. En `chemin` : `hors-contexte`.
  `cheminConforme('primitives', ['color', 'Ocean', 'soft', '50'])` est faux,
  vrai aujourd'hui.
- `cheminConforme('brands', ['primary', 'soft', '500'])` est faux, vrai
  aujourd'hui.
- Contre-exemples : `color/Ocean/light/50` en `modes` et `color/Ocean/50` en
  `chemin` rendent `hors-contexte` ; `color/Ocean/light/1100` rend
  `aucune-forme` au rang 3, rôle `cran` ; `primary/scale/1000` reste refusé dans
  `theme`, `neutral/scale/1000` est reconnu.
- Aucun identifiant de forme en double ; chaque chemin de la matrice est
  reconnu par une seule forme de son contexte.
- `porteeDeLaGrammaire` : `reference` pour (`Primitives`, `['Color']`) et
  (`primitives`, `['color']`) ; `libre` pour (`Primitives`, `['palettes']`),
  (`Primitives`, `[]`), (`Primitives`, `['colors']`), (`Brand`, `['color']`) et
  (`color-brands`, `['color']`).
- `naturesDesNoms` : `color/Ocean/1000` à treize nuances garde la nature
  `palette` au rang 1. Rouge aujourd'hui.

Moteur (`packages/couleur/tests/nuances.test.ts`) : `PREREGLAGES[13].crans`
égale `NUMEROS_DE_PALETTE`, `PREREGLAGES[11].crans` égale `CRANS`, et les
longueurs des courbes égalent celles des listes.

Palettes (`packages/plugin-palettes/tests/grammaireDuPlan.test.ts`) : le vrai
`planDesVariables`, sur la destination de référence et sa variante en modes,
pour les huit cases de la matrice : zéro refus, avec la forme et les rôles
attendus. Rouge avec les formes de `HEAD`. Une sortie libre a la portée
`libre`, et le test ne déclare aucun refus.

Racine (`tests/referentielUnique.test.ts`, T6.3) : l'exemple du test signale
`type M = 'light' | 'dark'` et `type N = { readonly light: number; readonly
dark: number }`, et ne signale pas `const l = { light: 1, dark: 2 }`.

## La planche et la vue (T6.2)

Après `npm run build --workspace @ucm-kit/core` : `npm run planche --workspace
ucm-couleur`, puis `npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts"`.
Aucune différence n'est attendue ; si un fichier change, le signaler avant le
commit.

## Les fichiers de chaque tâche

- T6.1 : `packages/kit/src/referentiel/vocabulaire.ts`, `architecture.ts`, `grammaire.ts`,
  `normalisation.ts`, `natures.ts`, `packages/couleur/src/nuances.ts`,
  `packages/plugin-palettes/src/variables/destination.ts`, les tests du kit, du
  moteur et `packages/plugin-palettes/tests/grammaireDuPlan.test.ts`.
- T6.2 : les sorties générées.
- T6.3 : les fichiers du tableau des unions, ceux des déclarations d'objets, et
  `tests/referentielUnique.test.ts`. Aucun fichier commun avec T6.1, sauf
  `destination.ts` : T6.3 attend T6.1.
