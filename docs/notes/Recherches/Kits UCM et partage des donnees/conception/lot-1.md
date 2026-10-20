# Conception du lot 1

Entrée des tâches T1.1, T1.2 et T1.3 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi est
dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md), lot 1 et
décision D6.

## La forme reconnue d'un mot

Une seule règle ramène un texte à la forme qu'on compare : les mots que rend
`decouperSegment`, en minuscules, joints par `-`. `Soft`, `SOFT` et `soft`
donnent `soft` ; `ForegroundMain`, `foreground_main` et `foregroundmain`
donnent `foreground-main`.

```ts
// packages/kit/src/referentiel/reconnaissance.ts (d'abord écrit dans termes.ts, déplacé pour casser un cycle d'imports)
/** Le texte ramené à la forme qu'on compare : mots de `decouperSegment`, en minuscules, joints par `-`. */
export function formeReconnue(texte: string): string;

/**
 * Retrouve un terme quelle que soit l'écriture du segment : la forme reconnue du segment est
 * comparée à celle de l'identifiant et de chaque forme tolérée. `undefined` pour un terme absent.
 */
export function termeReconnu(registre: Registre, segment: string): Terme | undefined;
```

- `collectionUcmReconnue` (`normalisation.ts`) applique déjà cette règle :
  elle appelle `formeReconnue` au lieu de la recopier.
- `termeRetenu` ne change pas. L'exporteur et Nomenclature l'emploient pour
  dire qu'une valeur s'écrit autrement : ils veulent la forme exacte.
- `termeReconnu` ignore `identifiantParCategorie`, comme `termeRetenu`.
- Un segment vide ou qui ne donne aucun mot rend `undefined`.

## La grammaire

`cheminConforme` (d'abord dans `architecture.ts`, désormais dans `grammaire.ts`) garde sa signature et ses refus d'un
segment vide, entouré d'espaces ou qui contient `/` ou `.`. Ensuite :

- `exclues` et `valeurs` se comparent par `formeReconnue` des deux côtés ;
- la position sans `valeurs` accepte un segment si `termeReconnu` le trouve
  ou si le registre est extensible.

Le lot 6 remplacera ce booléen par une reconnaissance structurée. Le lot 1 ne
change que la comparaison.

## Les variables du thème

`emplois` ne dépend de rien, et `referentiel` importe `emplois`. La liste vit
donc dans `emplois`, et la reconnaissance, qui a besoin de `decouperSegment`,
dans `referentiel`.

```ts
// packages/kit/src/emplois/dossiers.ts, à côté de VARIABLES_DE_PALETTE
/** Les variables de dossier que porte `theme`, dans l'ordre où une fin de nom les cherche. */
export const VARIABLES_DU_THEME: readonly VariableDuTheme[];
// = [...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE, ...VARIABLES_GLOBALES,
//    ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau) => `elevation/${niveau}`)]

// packages/kit/src/referentiel/theme.ts
/**
 * La variable de dossier qu'un nom de `theme` porte par sa fin, quelle que soit l'écriture :
 * `Primary/Solid/default` porte `solid/default`. `undefined` pour `identity` et tout nom inconnu.
 */
export function variableDuThemeReconnue(nom: string, index?: IndexDuVocabulaire): VariableDuTheme | undefined;
```

- Le nom se découpe par `/`. Chaque segment passe par `formeReconnue`, après
  les remplacements de `index` s'il est donné (section suivante). Une
  variable de la liste est reconnue quand ses segments égalent les derniers
  segments du nom.
- L'ordre de la liste départage deux fins possibles, comme le `find` actuel
  de `profilUcm.ts`. Un test vérifie qu'aucune variable de la liste n'est la
  fin d'une autre ; si l'une l'est, le test le dit et la plus longue passe
  d'abord.
- `profilUcm.ts` retire sa constante `VARIABLES_DU_THEME`. `variableDuNom`
  appelle `variableDuThemeReconnue` et garde sa forme de retour
  (`{ variable, support }`). `nuanceAttendue` passe par `variableDuNom`.
- Le nom affiché reste celui du fichier : la reconnaissance ne rend que
  l'identifiant.
- Au passage (décision du mainteneur), `ModeDuTheme` dérive de `MODES`.
  `MODES` vit dans `referentiel/vocabulaire.ts`. `emplois` ne peut pas
  l'importer : `ModeDuTheme` reste écrit dans `emplois`, et un test du kit
  vérifie qu'il vaut `MODES`. `Intensite` et `Theme`
  (`plugin-explorateur/src/integrations/palettes.ts`) et le paramètre `mode`
  de `nuanceAttendue` dérivent de `PROFILS` et `MODES`.

## Les modes, et les termes personnalisés

Le contrôle de nuance lit aujourd'hui le nom du mode en minuscules et
n'accepte que `light` et `dark` (`profilUcm.ts`, `controlerLeProfil`).

```ts
// packages/kit/src/referentiel/theme.ts
/** Le mode du thème qu'un nom de mode désigne, quelle que soit l'écriture ; `undefined` sinon. */
export function modeDuThemeReconnu(nom: string, index?: IndexDuVocabulaire): ModeDuTheme | undefined;
```

- `Light`, `LIGHT` et `light` donnent `light`.
- Avec `index`, les mots du nom passent d'abord par
  `index.remplacements(mots, 'variables')`. Un terme personnalisé `light`
  qui remplace `jour` fait alors reconnaître le mode `Jour`. La catégorie
  `variables` est un choix : Nomenclature ne renomme pas les modes, et ses
  termes personnalisés s'appliquent de la même façon à toutes les catégories.
  Les rôles du thème emploient la même catégorie.
- Sans règle, `Jour` rend `undefined`. Le lot 1 ne produit aucun constat dans
  ce cas. Le lot 2 affichera la limite « Mode Jour non reconnu : nuance non
  vérifiée ».

### Où l'explorateur lit les règles

L'explorateur n'écrit rien dans le document. Il lit l'espace partagé
`ESPACE_ARCHITECT` comme Palettes le fait (`lectureDesVariables.ts`) :
`getSharedPluginDataKeys(ESPACE_ARCHITECT)` filtré par `estCleDeNommage`,
puis `lireReglesDeNommage` du socle. Ce lecteur passera au kit au lot 12.

- Le relevé (`plugin-explorateur/src/lecture.ts`, `Releve`) gagne un champ
  facultatif `vocabulaire?: VocabulaireDuFichier`, lu dans `code.ts` au
  moment du relevé. Il est absent quand `lireReglesDeNommage` rend `null`.
- Un relevé importé d'une version antérieure n'a pas ce champ : il se lit
  comme « sans règle ».
- `controlerLeProfil` reçoit l'index (`indexerVocabulaire(vocabulaire).index`)
  dans ses options, et le passe à `variableDuThemeReconnue` et à
  `modeDuThemeReconnu`.

## Les tests attendus

Kit :

- `formeReconnue` et `termeReconnu` : `Soft`, `SOFT`, `soft` ; une forme
  tolérée en PascalCase ; `foreground-main`, `ForegroundMain`,
  `foregroundmain` ; un terme absent rend `undefined`.
- Aucun registre de `REGISTRES` ni de `REGISTRES_ARCHITECTURE` n'a deux
  termes dont l'identifiant ou une forme tolérée donne la même forme
  reconnue.
- `cheminConforme('primitives', segments)` est vrai pour
  `color/ocean/soft/light/500` écrit selon chaque convention de
  `CONVENTIONS`. Aujourd'hui, `Color/Ocean/Soft/Light/500` rend `false` : le
  test est rouge sans la correction.
- `variableDuThemeReconnue` : `Primary/Solid/default` et
  `primary/solid/default` rendent `solid/default` ; `primary/identity` rend
  `undefined`.
- `modeDuThemeReconnu` : `Light`, `DARK` ; `Jour` sans index rend
  `undefined`, et avec un index où `light` remplace `jour`, rend `light`.

Explorateur :

- Un thème renommé selon chaque convention de `CONVENTIONS` donne les mêmes
  constats de portée et de nuance que le thème en minuscules (sonde `T5-role`
  de Codex : `variableDuNom('Primary/Solid/default')` rend `null` aujourd'hui).
- Un mode `Jour` avec la règle est contrôlé ; sans la règle, aucun constat.
- La loi de lecture seule de l'explorateur reste verte.
