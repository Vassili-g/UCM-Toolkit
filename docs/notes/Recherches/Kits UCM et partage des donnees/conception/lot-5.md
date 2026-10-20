# Conception du lot 5

Entrée des tâches T5.1 à T5.4 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi est
dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md), lot 5 et
décision D2, et dans la [revue de Codex](../REVUE-CODEX-DU-PLAN-FIABILITE.md),
constats F05, F06 et F09. Les chemins sont relatifs à `packages/plugin-palettes/`.

## Ce que le code fait aujourd'hui

- **F05.** `ecrireLesVariables` lit les collections et les variables une fois
  (`src/ecriture/variables.ts`, début de la fonction). Le contrôle des noms
  pris construit `dansLaCollection` sur `variablesLocales`, la liste de cette
  lecture. Les variables créées n'entrent que dans `toutesLesVariables`, que le
  nommeur relit. Un renommage fait par une palette précédente se voit, puisque
  le nom se lit sur l'objet vivant ; une création ne se voit pas. Deux palettes
  `Ocean-Blue` et `OceanBlue` sous des groupes en PascalCase reçoivent les
  mêmes 44 noms ; sur un double strict la seconde finit en `interrompue`, sur un
  double permissif l'écriture laisse 88 variables pour 44 noms.
- **La reprise ne contrôle aucun nom au moment d'écrire.** `ecrireLaReprise`
  crée et renomme sans relire le fichier. Son plan cherche l'occupant d'un nom
  dans `origine.parNom`, construit sur `lues`, figée au début du geste.
- **Gestion annonce des créations que l'écriture refuse.** `tokensDeLaPalette`
  (`src/variables/gestion.ts`) ne compte pas les variables qu'une autre palette
  de la recette suit, alors que l'écriture refuse ces noms, même avec
  « Remplacer » (`variablesProtegees`). L'interface n'écrit qu'une palette par
  geste : cet écart touche chaque écriture, et les doublons de F05 n'arrivent
  que par une demande à plusieurs palettes.
- **Le nommeur.** Chaque palette se planifie avec `nommeurActuel()`, relu sur
  `toutesLesVariables`. Après un échec, les variables retirées y restent.
- **F06.** Le suivi se range, puis `commitUndo`. Si le rangement lève, le
  `catch` extérieur rend `interrompue` : les variables créées restent, le suivi
  reste l'ancien, et `commitUndo` n'est pas appelé (sonde `suivi-refuse`).
- **Échec au milieu d'une palette qui remplace.** Une variable tiers remplacée
  prend le nom du plan, ses couleurs et ses marqueurs ; le `catch` de la
  palette ne la restaure pas.
- **Les renommages d'une reprise.** `aRenommer` n'est rempli que pour une
  reprise (`src/variables/etat.ts`), et exclut une variable qui porte le nom
  brut du plan (`lue.nom !== entree.brut`, ajouté par 170a6d79). L'écriture
  renomme pourtant toute variable dont le nom diffère du plan.
  `tests/nommageDesPalettes.test.ts` fige les deux faits : un renommage dû aux
  seules règles se fait sans annonce.
- **L'encart et la ligne.** Les deux encarts d'une reprise annoncent ses
  renommages par `paragrapheDuRenommage` (`src/ui/ongletGestion.ts`).
  `texteDeLEcriture` reçoit déjà ce nombre. La ligne « Tokens Figma » d'une
  reprise ne choisit qu'un écart : créations, puis couleurs, puis noms occupés,
  puis renommages.
- **Le double.** `FauxFigma` refuse un nom identique à la création et au
  renommage (`tests/figmaDeTest.ts`). Le marqueur d'une variable et son retrait
  ne lèvent jamais. Une collection n'a ni `removeMode` ni `remove`.

## Le plan du lot

Un module nouveau, `src/variables/lot.ts`, pur : ni Figma, ni DOM. Gestion et
l'écriture l'appellent.

```ts
import type { Recette } from 'ucm-couleur';
import type { VariablesDuFichier } from '../lectureDesVariables';
import type { Destination } from './destination';
import type { EtatDesTokensDUnePalette, RenommageExecute } from './etat';
import type { CollectionVisee } from './nommeur';
import type { EntreeDuPlan, ModeDuPlan } from './plan';

/** Ce que le plan d'un lot lit du fichier : le relevé, le suivi et les données de nommage, tels que la lecture les rend. */
export type InventaireDuLot = Pick<VariablesDuFichier, 'collections' | 'variables' | 'suivi' | 'nommage'>;

export interface DemandeDuLot {
  /** Les palettes demandées. Le lot suit l'ordre de la recette, puis celles qu'elle ne porte pas. */
  readonly palettes: readonly string[];
  /** Les palettes « Modifiés dans Figma » dont le designer remet les couleurs ([VAR-06]). */
  readonly remettre: readonly string[];
  /** Les palettes qui prennent les variables tiers de même nom ([VAR-08]). */
  readonly remplacer: readonly string[];
}

/** Ce qui porte déjà un nom que la palette veut prendre. */
export type OccupantDuNom =
  /** Une variable qu'aucune palette de la recette ne suit : remplaçable sur confirmation ([VAR-08]). */
  | { readonly par: 'tiers'; readonly id: string; readonly nom: string }
  /** Une variable d'une autre palette de la recette : jamais remplaçable. `dansLeLot` : elle la crée, la garde, la prend ou la renomme plus tôt dans le même lot. */
  | { readonly par: 'palette'; readonly palette: string; readonly id: string; readonly nom: string; readonly dansLeLot: boolean };

/** La variable qu'une entrée du plan écrit. */
export type CibleDeLEntree =
  /** Une variable du fichier, suivie, reprise ou remplacée ; `ecrire` : sa couleur diffère dans le mode visé, ou ce mode reste à créer. */
  | { readonly cible: 'presente'; readonly id: string; readonly ecrire: boolean }
  /** La variable de rang `rang` dans `creations`. */
  | { readonly cible: 'creee'; readonly rang: number }
  /** Aucune : entrée sans nom d'une palette figée, ou mode suivi sorti de la collection. L'entrée quitte le suivi. */
  | { readonly cible: 'aucune' };

/** Ce que l'écriture fera d'une palette. */
export interface EcritureDUnePalette {
  readonly liaison: 'destination' | 'reprise';
  /** La collection où la palette écrit : une collection du fichier, ou celle que le lot crée sous ce nom. */
  readonly collection: CollectionVisee;
  /** Le plan sous ses noms finaux. */
  readonly plan: readonly EntreeDuPlan[];
  /** L'état des tokens et ses trois listes. */
  readonly etat: EtatDesTokensDUnePalette;
  /** La cible de chaque entrée, dans l'ordre du plan. */
  readonly cibles: readonly CibleDeLEntree[];
  /** Une variable à créer par nom, dans l'ordre du plan ; `cle` est celle de sa première entrée, rangée dans son marqueur. */
  readonly creations: readonly { readonly nom: string; readonly cle: string }[];
  /** Les variables tiers prises sur confirmation : elles prennent le nom du plan, à la casse près, et gardent leur portée. */
  readonly remplacements: readonly { readonly id: string; readonly de: string; readonly vers: string }[];
  /** Les renommages que l'écriture fait : ceux d'une reprise (`etat.aRenommer`). Vide pour une destination (D2). */
  readonly renommages: readonly RenommageExecute[];
  /** Les noms que la palette tient dans sa collection après l'écriture. */
  readonly reserves: readonly string[];
  /** Reprise : les noms du plan qu'une variable hors du lot occupe ; ces entrées sortent du plan ([VAR-13]). */
  readonly nomsOccupes: readonly string[];
  /** Le nombre de couleurs déjà écrites que l'écriture remplace. */
  readonly aRemplacer: number;
}

export type DecisionDuLot =
  | { readonly palette: string; readonly decision: 'absente' }
  | { readonly palette: string; readonly decision: 'modifiee'; readonly etat: EtatDesTokensDUnePalette }
  | { readonly palette: string; readonly decision: 'collection-introuvable' }
  | { readonly palette: string; readonly decision: 'mode-introuvable'; readonly mode: ModeDuPlan }
  /** Refus avant toute mutation ; `ecriture` dit ce que la palette aurait fait, pour l'annonce. */
  | { readonly palette: string; readonly decision: 'nom-pris'; readonly nom: string; readonly occupant: OccupantDuNom; readonly ecriture: EcritureDUnePalette }
  | ({ readonly palette: string; readonly decision: 'ecrire' } & EcritureDUnePalette);

export interface PlanDuLot {
  /** Une décision par palette demandée, dans l'ordre d'écriture. */
  readonly palettes: readonly DecisionDuLot[];
  /** La destination après le lot ; une collection `{ nom }` le reste, et l'écriture y range l'identifiant de la collection créée. */
  readonly destination: Destination;
}

/** Le plan d'un lot entier : chaque palette se planifie sur le fichier tel que les palettes précédentes du lot le laissent. */
export function planDuLot(recette: Recette, fichier: InventaireDuLot, demande: DemandeDuLot): PlanDuLot;
```

Les protections viennent du suivi et de la recette, par `variablesProtegees`,
comme aujourd'hui.

Les règles, palette par palette, dans l'ordre :

1. Une palette que la recette ne porte pas rend `absente`.
2. Le plan sous ses noms finaux vient de `planDeLaPalette`, avec le nommeur et
   les `lues` de l'inventaire simulé (section suivante). L'état vient de
   `etatDesTokens`.
3. Des couleurs changées dans Figma, sans `remettre`, rendent `modifiee`.
4. La collection se choisit comme `ecrireLaPalette` la choisit : celle du suivi
   tant que la destination n'a pas changé, sinon celle de la destination ; un
   identifiant absent rend `collection-introuvable` ; une destination `{ nom }`
   vise la collection que le lot crée, la même pour toutes ses palettes.
5. Une reprise dont un mode suivi a quitté la collection rend
   `mode-introuvable`.
6. **Noms pris, destination.** Chaque nom du plan sans variable suivie se
   compare sans casse aux variables de couleur de la collection simulée, dans
   cet ordre : une variable d'une palette précédente du lot (`palette`,
   `dansLeLot: true`, refusée) ; une variable suivie par une autre palette de la
   recette (`palette`, `dansLeLot: false`, refusée) ; une variable tiers sans
   `remplacer` (`tiers`, refusée) ; une variable tiers avec `remplacer`
   (`remplacements`). Le premier nom refusé fait la décision `nom-pris`.
7. **Noms pris, reprise.** `planDesVariables` reçoit `reservesDuLot:
   ReadonlyMap<string, string>` (nom en minuscules vers palette) et remplit une
   sortie `nomsReserves`. Une entrée y entre quand le nom qu'elle crée, ou vers
   lequel elle renomme, est tenu par une palette précédente du lot. Une entrée
   de `nomsReserves` refuse la reprise entière (`nom-pris`, occupant `palette`,
   `dansLeLot: true`). Un occupant hors du lot garde la règle d'aujourd'hui :
   l'entrée sort du plan et rejoint `nomsOccupes`.
8. Sinon la décision est `ecrire`, et la palette réserve les noms que ses
   variables porteront après l'écriture, comparés sans casse. Une palette
   refusée ne réserve rien.

## Les noms d'une palette dépendent des palettes d'avant

Calculer tous les plans d'avance avec le nommeur du début du geste ne donne pas
toujours les noms du calcul palette par palette :

- une collision de chemins publiés retire un renommage
  (`avecLesCheminsPublies`, socle) : une variable créée par une palette
  précédente peut faire tomber le nom final d'une palette suivante sur son nom
  brut ;
- un renommage d'une reprise précédente prend un nom ou en libère un ;
- la reprise suivante juge l'occupant sur `origine.parNom`.

**La solution : une simulation pure, palette par palette.** `planDuLot` garde
une copie de l'inventaire. Après chaque décision `ecrire`, il y applique ce que
l'écriture fera : une création ajoute une `VariableLue` et une
`VariableNommee` d'identifiant `ucm-palettes:lot:{palette}:{rang}`, dans la
collection visée, avec la donnée `palette` ; un remplacement donne à la
variable le nom du plan et la donnée `palette` ; un renommage change le nom.
Une collection à créer porte l'identifiant `COLLECTION_A_CREER`, que
`nommeur.ts` exporte. Une table `appartenance` (variable vers palette du lot)
classe les occupants `dansLeLot`. La palette suivante se planifie sur cet
inventaire : le nommeur se recalcule si la palette précédente a changé un nom,
et `lues` et `origine` sont relues.

C'est la sémantique de `nommeurActuel()`, rendue pure et tenue partout. Les
limites :

- L'exactitude dépend de la fidélité de la simulation. Un test de loi compare,
  sur chaque lot des tests de T5.2, l'inventaire simulé à la fin du plan au
  fichier après l'écriture : noms par identifiant, collection, donnée
  `palette`.
- Une palette qui échoue au moment d'écrire fausse l'hypothèse des suivantes.
  La garde vivante (plus bas) empêche tout doublon ; une palette suivante peut
  alors être refusée à tort. Le résultat nomme l'échec, et le geste suivant
  replanifie.
- Gestion planifie chaque fiche comme un lot d'une palette. Deux palettes
  jamais écrites dont les noms convergent ne le montrent qu'après l'écriture de
  la première ; la fiche de la seconde annonce alors le refus. Un avis à
  l'échelle de la recette sort du lot 5.

## Ce que Gestion et l'écriture en font

### Gestion

`tokensDeLaPalette(recette, palette, fichier)` garde sa signature et ses
appelants. Elle devient une projection de :

```ts
planDuLot(recette, fichier, { palettes: [palette.id], remettre: [palette.id], remplacer: [palette.id] }).palettes[0]
```

- `aCreer` vient des noms de `creations` ; `existantes` et `variablesExistantes`
  de `remplacements` ; `aRemplacer`, `nomsOccupes`, `collection`, `variables`
  et `themes` gardent leur sens.
- Un champ nouveau, `refus: { readonly nom: string; readonly palette: string } | null`,
  rempli par une décision `nom-pris` dont l'occupant est une palette. Un
  occupant tiers n'est pas un refus pour Gestion : il paraît dans `existantes`.
- La branche de reprise propre à `gestion.ts` disparaît au profit de la
  projection.

### L'écriture

`ecrireLesVariables` garde sa signature et sa demande. Elle :

1. lit comme aujourd'hui, puis construit l'inventaire avec la fonction qui sert
   à `lireLesVariablesDuFichier`, à extraire dans `src/lectureDesVariables.ts`
   (`inventaireLu(racine, collections, variables): InventaireDuLot`) ;
2. relit l'empreinte de la recette (inchangé) ;
3. appelle `planDuLot` après le dernier `await` du geste : aucun `await` ne
   sépare le plan des mutations, c'est la revalidation de l'inventaire ;
4. prépare les restaurations (section F06) ;
5. exécute les décisions dans l'ordre : elle crée `creations`, renomme
   `renommages` et `remplacements`, écrit les entrées de `cibles` à écrire.
   `nommeurActuel` et `lecturesDeNommage` disparaissent. Les modes se trouvent
   ou se créent comme aujourd'hui (`modes-refuses` reste une issue de
   l'écriture). Le suivi se construit avec les identifiants réels ;
6. avant la première mutation de chaque palette, applique une garde vivante :
   aucun nom que la palette crée ou prend n'est porté, sans casse, par une
   autre variable de la collection, d'après une liste que l'écriture tient à
   jour à chaque création et à chaque retrait. La garde ne joue qu'après
   l'échec d'une palette précédente ; elle rend `nom-pris` avec un occupant
   tiers.

`IssueDeLaPalette` change peu :

```ts
| { readonly palette: string; readonly issue: 'nom-pris'; readonly nom: string; readonly occupant?: { readonly palette: string; readonly dansLeLot: boolean } } // absent pour un tiers
| { readonly palette: string; readonly issue: 'interrompue'; readonly message: string; readonly restes?: readonly Reste[] } // absent quand tout est défait
```

## Les trois listes de l'état des tokens

`etatDesTokens` (`src/variables/etat.ts`) garde sa signature et calcule trois
listes.

```ts
export interface RenommageExecute {
  readonly id: string;
  readonly de: string;
  readonly vers: string;
  /** `regles` : le fichier porte le nom brut du plan, et seules les règles de nommage le changent. */
  readonly cause: 'forme' | 'regles';
}

export interface EtatDesTokensDUnePalette {
  // … champs actuels, sauf `aRenommer` :
  /** Reprise : chaque variable que l'écriture renomme. Vide pour une destination (D2). */
  readonly aRenommer: readonly RenommageExecute[];
  /** Destination : les variables suivies dont le nom du fichier n'est pas celui du plan ; l'écriture les garde, UCM Nomenclature les renomme (D2). */
  readonly ecartsLaissesANomenclature: readonly { readonly id: string; readonly nom: string; readonly plan: string }[];
  /** Les noms du plan, sans doublon, dans son ordre. */
  readonly nomsDuPlan: readonly string[];
}
```

- `aRenommer` reçoit toute variable de reprise dont le nom diffère du plan,
  comme l'écriture la renomme. L'exclusion `lue.nom !== entree.brut` disparaît :
  la variable entre avec `cause: 'regles'`.
- **Décision.** Seul un renommage `forme` rend la palette « à mettre à jour ».
  La condition `aRenommer.size > 0` devient
  `aRenommer.some((renommage) => renommage.cause === 'forme')`. À couleurs
  égales, un changement de convention ne change donc pas l'état d'une reprise
  (correction 170a6d79, loi 1 du lot 7). Quand une écriture part pour une autre
  raison, l'encart annonce aussi les renommages `regles`, parce que l'écriture
  les fait.
- `regles` ne reconnaît que le nom brut. Un nom écrit sous une convention plus
  ancienne compte comme `forme` ; comparer les segments par `formeReconnue`
  relève du lot 7.
- `ecartsLaissesANomenclature` ne change ni l'état ni l'encart : les lois du
  lot 7 et les tests de D2 la lisent.
- Seule `aRenommer` paraît dans l'encart et sur la ligne.

## Défaire une écriture que Figma refuse d'enregistrer (F06)

### Préparer, avant la première mutation

Le plan dit quelles variables existantes l'écriture touche : renommages,
remplacements, cibles `presente` à écrire. Avant la première mutation,
l'écriture relève pour chacune son nom, une copie de `valuesByMode` (alias
compris) et ses données partagées `palette` et `cle`, et relève les modes de
chaque collection visée. Une lecture qui lève à ce stade rend `interrompue`,
et rien n'a changé.

Pendant l'écriture, un journal reçoit, avant chaque mutation, de quoi la
défaire :

```ts
type Restauration =
  | { readonly faite: 'creation'; readonly variable: Variable; readonly palette: string }
  | { readonly faite: 'modification'; readonly variable: Variable; readonly avant: EtatDAvant; readonly palette: string; readonly suivieAvant: boolean }
  | { readonly faite: 'mode-ajoute'; readonly collection: VariableCollection; readonly mode: string }
  | { readonly faite: 'mode-renomme'; readonly collection: VariableCollection; readonly mode: string; readonly avant: string }
  | { readonly faite: 'collection'; readonly collection: VariableCollection };

interface EtatDAvant {
  readonly nom: string;
  readonly valeurs: { readonly [mode: string]: VariableValue };
  readonly palette: string;
  readonly cle: string;
}
```

Défaire une `modification` rétablit le nom, chaque valeur d'un mode qui
existait avant, puis les deux marqueurs ; un marqueur vide retire la clé.
`Variable.remove`, `VariableCollection.remove` et
`VariableCollection.removeMode` sont déclarés dans `@figma/plugin-typings`.
Les restaurations se font à l'envers du journal ; une restauration faite ne se
rejoue pas.

### Quand défaire

- **Échec au milieu d'une palette** (création, valeur, marqueur) : défaire ce
  que la palette a fait aux variables qu'elle ne suivait pas avant le geste. Ses
  créations se retirent ; les variables tiers prises retrouvent nom, couleurs et
  marqueurs. Les variables qu'elle suivait gardent leurs valeurs et leurs
  renommages, et le suivi les retient (comportement actuel, tests verts). La
  palette rend `interrompue`, avec `restes` si une restauration échoue ; les
  autres palettes continuent. Un mode ajouté pour elle reste.
- **Échec après les palettes** (rangement du suivi refusé, ou toute exception
  hors d'une palette après la première mutation) : rien de ce geste ne sera
  suivi. Tout le journal se défait : créations, renommages, couleurs des
  variables suivies, marqueurs, modes ajoutés ou renommés, collection créée.

### Ce que dit l'issue

```ts
/** Ce qu'une restauration n'a pas pu défaire : le changement reste dans Figma. */
export type Reste =
  | { readonly reste: 'variable-creee'; readonly id: string; readonly nom: string }
  | { readonly reste: 'variable-changee'; readonly id: string; readonly nom: string }
  | { readonly reste: 'mode'; readonly collection: string; readonly mode: string }
  | { readonly reste: 'collection-creee'; readonly id: string; readonly nom: string };

export type ResultatDeLEcriture =
  | /* … variantes actuelles … */
  /** Une erreur après la première mutation : l'écriture est défaite ; `restes` liste ce qui n'a pas pu l'être. */
  | { readonly issue: 'defaite'; readonly message: string; readonly restes: readonly Reste[] };
```

Une variable créée qui n'a pas pu être retirée reste hors du suivi : le plan
suivant la voit comme un occupant tiers, et Gestion la propose au remplacement.

### Où `commitUndo` est appelé

Une seule fois, à la sortie de `ecrireLesVariables`, si le journal garde au
moins une mutation non défaite : après le rangement du suivi, comme
aujourd'hui ; après une issue `defaite` dont `restes` n'est pas vide. Jamais
quand tout est défait, ni quand rien n'a changé. Les restaurations passent
toujours avant `commitUndo`.

## Les textes (T5.4)

### La ligne « Tokens Figma » d'une reprise

Aucun texte nouveau. Le détail compose, après `origine` et `formeDesThemes`,
chaque fait non nul, séparé par ` · `, dans cet ordre :
`variablesACreer(aCreer.length)`, `couleursSurNChangent(aRemplacer,
variables)`, `variablesARenommer(aRenommer.length)`. Sans aucun de ces faits,
la ligne garde la suite d'aujourd'hui (`tokensPartiels(nomsOccupes).quoi`).

- En français : « Primitives / Color/Titanium · Thèmes dans le chemin · 2 couleurs sur 22 changent · 22 variables à renommer »
- En anglais : « Primitives / Color/Titanium · Themes in paths · 2 colors out of 22 change · 22 variables to rename »

L'encart garde `texteDeLEcriture`, `texteDuRenommage` et
`paragrapheDuRenommage` ; leur nombre et leur exemple viennent de `aRenommer`.
Une destination n'annonce aucun renommage.

### Un nom pris par une autre palette

`nomDejaPris(palette, nom, autre?)` : sans `autre`, le texte d'aujourd'hui.
Avec `autre` :

| | FR | EN |
|---|---|---|
| ou | Tokens non écrits : {palette} | Tokens not written: {palette} |
| quoi | La variable « {nom} » appartient déjà à {autre}. | The variable “{nom}” already belongs to {autre}. |
| geste | Renommez l’une des deux palettes, ou changez le groupe de la destination des tokens. | Rename one of the two palettes, or change the group in the token destination. |

La fiche montre ce bloc avant toute écriture quand `refus` n'est pas `null`,
sans geste d'écriture. La ligne « Tokens Figma » porte alors `nomsPrisPar(autre)` :
« Noms déjà pris par {autre} » / « Names already taken by {autre} ».

### L'écriture défaite

`ecritureDefaite(message, restes)`, montré dans la zone de `recevoirVariables`
comme `gesteInterrompu`.

| Cas | FR | EN |
|---|---|---|
| ou | Écriture des tokens annulée | Token writing cancelled |
| quoi, rien ne reste | Figma a refusé d’enregistrer l’écriture. Le plugin l’a défaite : le fichier est comme avant. | Figma refused to save the writing. The plugin undid it: the file is as before. |
| geste, rien ne reste | Synchronisez dans Gestion, puis réessayez. | Sync in Management, then retry. |
| quoi, 1 reste | Figma a refusé d’enregistrer l’écriture. Le plugin n’a pas pu la défaire entièrement. La variable {nom} reste changée. | Figma refused to save the writing. The plugin could not undo all of it. The variable {nom} remains changed. |
| quoi, N restes | … N variables restent changées, dont {nom}. | … N variables remain changed, including {nom}. |
| geste, avec restes | Faites Ctrl+Z dans Figma pour revenir à l’état d’avant, puis réessayez. | Press Ctrl+Z in Figma to return to the previous state, then retry. |
| detail | Détail de l’erreur : {message} | Error details: {message} |

`ecritureInterrompue(palette, message, restes?)` : sans `restes`, le texte
d'aujourd'hui. Avec `restes` : « Figma a interrompu l’écriture. N variables
gardent un changement de cette écriture, dont {nom}. » ; geste « Écrivez de
nouveau la palette : elle proposera de remplacer ces variables. » (EN :
« Figma interrupted the writing. N variables keep a change from this writing,
including {nom}. » ; « Write the palette again: it will offer to replace these
variables. »).

## Le double de Figma (T5.1)

Dans `tests/figmaDeTest.ts`, chaque option vaut par défaut le comportement
d'aujourd'hui.

```ts
export class FauxFigma {
  /** Vrai : la création et le renommage acceptent un nom que la collection porte déjà, ce que le guide de Figma dit possible (F09). */
  accepterLesDoublons = false;
  /** Le nombre de créations de variable avant que la suivante lève, une fois ; `null`, jamais. */
  echouerALaCreation: number | null = null;
  /** Le nombre de marqueurs de variable rangés avant que le suivant lève, une fois ; `null`, jamais. */
  echouerAuMarqueur: number | null = null;
  /** Les clés `espace/cle` que la racine refuse de ranger. */
  readonly rangementsRefuses = new Set<string>();
  /** Vrai : le retrait d'une variable ou d'une collection lève. */
  retraitsRefuses = false;
}
```

- `createVariable` et le setter `name` ne refusent un homonyme que si
  `accepterLesDoublons` est faux.
- `FausseVariable.setSharedPluginData` applique `echouerAuMarqueur` ;
  `Document.setSharedPluginData` applique `rangementsRefuses` ;
  `FausseVariable.remove` et `FausseCollection.remove` appliquent
  `retraitsRefuses`.
- `FausseCollection` gagne `removeMode(modeId)` et `remove()`, journalisés.

## Les tests attendus

Chaque test qui prouve un défaut est rouge avant la correction ; le compte
rendu cite l'échec obtenu.

T5.1 : avec `accepterLesDoublons`, deux créations et un renommage homonymes
réussissent, et lèvent sans l'option ; chaque injection lève une fois, au rang
voulu ; les tests existants passent sans changement.

T5.2 (`tests/planDuLot.test.ts`, `tests/variables.test.ts`,
`tests/nommageDesPalettes.test.ts`) :

1. **Pur.** Règles PascalCase, `Ocean-Blue` puis `OceanBlue`, puis l'ordre
   inverse : la première rend `ecrire` avec 44 créations, la seconde `nom-pris`
   avec `Color/OceanBlue/Soft/Light/50` et un occupant `palette`,
   `dansLeLot: true`.
2. **Écriture, double permissif, deux ordres.** La seconde rend `nom-pris` avec
   `occupant` ; le fichier porte 44 variables ; un seul `commitUndo`. Rouge
   aujourd'hui : 88 variables.
3. **Écriture, double strict.** `nom-pris` au lieu de `interrompue`. Rouge
   aujourd'hui.
4. **Reprise.** Une reprise dont les variables se renomment sous le groupe
   configuré, et une palette de destination dont les noms convergent. Dans
   l'ordre [destination, reprise], la reprise rend `nom-pris` et rien n'est
   renommé ; dans l'ordre inverse, la destination rend `nom-pris`. Rouge
   aujourd'hui.
5. **Occupant tiers.** Sans `remplacer` : `nom-pris` sans `occupant`. Avec
   `remplacer` : un remplacement. Gestion et l'écriture concordent.
6. **Gestion.** Après l'écriture de la première palette seule,
   `tokensDeLaPalette` de la seconde porte `refus`. Rouge aujourd'hui : 44
   créations annoncées, puis refus à l'écriture.
7. **Loi annonce et mutations.** Sur chaque lot ci-dessus : les noms de
   `creations`, `renommages` et `remplacements` sont ceux que le journal du
   double crée et renomme ; les `reserves` sont les noms portés après
   l'écriture ; l'inventaire simulé égale le fichier après l'écriture.
8. **Revalidation.** Le journal n'a aucune lecture de variables après la
   première mutation.
9. **Régression.** « [VAR-07] deux palettes écrites ensemble portent les noms
   que l’écriture d’une seule leur donne » reste vert.

Attentes existantes qui changent, à citer au compte rendu : l'issue `nom-pris`
de `tests/variables.test.ts` gagne `occupant` ; l'élément de `aRenommer` de
`tests/reprise.test.ts` gagne `id` et `cause` ; `aRenommer` de
`tests/nommageDesPalettes.test.ts` porte des renommages `regles`, et l'état ne
change pas à cause d'eux.

T5.3 (`tests/variables.test.ts`, `tests/reprise.test.ts`) :

1. Suivi refusé après une première écriture : `defaite` avec `restes` vide,
   aucune variable, suivi inchangé, aucun `commitUndo`. Rouge aujourd'hui.
2. Suivi refusé après une mise à jour des couleurs : les couleurs d'avant sont
   rétablies, et l'état suivant ne montre aucune couleur « modifiée dans
   Figma ». Rouge aujourd'hui.
3. Suivi refusé après une reprise qui renomme : les noms d'avant sont rétablis,
   mêmes identifiants. Rouge aujourd'hui.
4. Suivi refusé après un remplacement : la variable tiers retrouve nom,
   couleurs et marqueurs vides. Rouge aujourd'hui.
5. Suivi refusé avec une collection créée et ses modes Light et Dark : la
   collection est retirée. Rouge aujourd'hui.
6. Suivi refusé et retrait refusé : `defaite` avec `restes` qui nomme les
   variables créées, et exactement un `commitUndo`. Rouge aujourd'hui.
7. Création refusée au milieu d'une palette : `interrompue`, créations retirées,
   les autres palettes continuent (comportement gardé).
8. Marqueur refusé pendant un remplacement : variable tiers rétablie. Rouge
   aujourd'hui.
9. Retrait refusé après une erreur de valeur : `interrompue` avec `restes`, et
   l'état suivant propose la variable restée au remplacement. Rouge
   aujourd'hui.

T5.4 (`tests/textes.test.ts`, `tests/i18n.test.ts`, galerie) :

1. Reprise, couleur changée et renommage de forme : la ligne porte les couleurs
   et les renommages. Rouge aujourd'hui.
2. Reprise, couleur changée et nom brut sous règles : l'encart annonce les
   renommages, l'écriture renomme, l'état suivant est « à jour ». Rouge
   aujourd'hui.
3. Reprise, nom brut sous règles, couleurs égales : l'état reste « à jour », et
   la ligne ne parle d'aucun renommage.
4. Destination, même cas (sonde `destination-casse`) : aucune annonce, aucun
   renommage ; `ecartsLaissesANomenclature` nomme la variable.
5. Refus annoncé : le bloc `nomDejaPris` avec `autre` paraît dans la fiche
   avant l'écriture.
6. Issue `defaite` : le bloc paraît, avec et sans restes.
7. Galerie : un état par cas.

## Les fichiers de chaque tâche

- T5.1 : `tests/figmaDeTest.ts`.
- T5.2 : `src/variables/lot.ts` (nouveau), `src/variables/gestion.ts`,
  `src/variables/etat.ts`, `src/variables/plan.ts`, `src/variables/nommeur.ts`,
  `src/lectureDesVariables.ts`, `src/ecriture/variables.ts`, les tests.
- T5.3 : `src/ecriture/variables.ts`, les tests.
- T5.4 : `src/ui/ongletGestion.ts`, `src/i18n/fr.ts`, `src/i18n/en.ts`, la
  galerie et ses tests, dont l'affichage de `defaite` et des `restes`.
- À la clôture : le paragraphe « Écriture d'UCM Palettes » d'`AGENTS.md` dit à
  la fois « Aucune écriture ne renomme ni ne déplace une variable » et qu'une
  reprise « peut renommer leurs chemins ». Le corriger, avec la règle de
  restauration.

## Décisions

- Les renommages dus aux seules règles d'une reprise sont annoncés et faits,
  mais ne changent pas l'état.
- Une reprise est refusée en entier quand une palette précédente du lot tient
  un nom qu'elle veut. Un occupant hors du lot garde la sortie de l'entrée
  seule.
- La demande ne porte pas d'empreinte du plan : la revalidation se fait sur la
  lecture du geste.

## Limites de cette note

- Les doublons dans le vrai Figma (F09) ne sont pas vérifiés : le plan refuse
  dans les deux cas.
- Un homonyme d'un autre type : le contrôle reste sur les couleurs.
- `removeMode` et `VariableCollection.remove` sur des objets créés pendant le
  même geste ne sont pas vérifiés dans le vrai Figma.
