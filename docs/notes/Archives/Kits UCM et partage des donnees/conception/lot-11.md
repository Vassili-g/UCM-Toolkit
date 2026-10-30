# Conception du lot 11

Entrée des tâches T11.1 à T11.3 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi est
dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md), lot 11, et
dans la section « Les données partagées, par adresse » de la
[revue de Codex](../REVUE-CODEX-DU-PLAN-FIABILITE.md).

## La porte

Un dossier nouveau, `packages/kit/src/protocoles/` :

| Module | Contenu | Lot |
|---|---|---|
| `donnee.ts` | Le classement commun d'une donnée lue | 11 |
| `palettes.ts` | Recette, suivi des variables, marque `nommage`, marqueurs `palette` et `cle` | 11 |
| `nommage.ts` | Règles de nommage rangées par Nomenclature | 12 |
| `index.ts` | Republie les modules existants | 11 |

Le lot 11 crée `donnee.ts`, `palettes.ts` et `index.ts`. Le lot 12 ajoute
son module et sa ligne dans `index.ts`. Le kit de règles Figma du lot 13 ne
range aucune donnée partagée : sa grammaire va dans le référentiel
([conception du lot 13](./lot-13.md)).

- `packages/kit/tsconfig.build.json` : ajouter `src/protocoles/**/*` à
  `include`, et corriger le commentaire qui le précède. L'empreinte du lot 8
  lit `include` : rien d'autre à changer.
- `packages/kit/package.json`, `exports` : `"./protocoles"`, avec `types`
  `./dist/protocoles/index.d.ts` et `default` `./dist/protocoles/index.js`,
  sur le modèle de `./referentiel`.
- Sens des imports : `protocoles` peut importer `referentiel` et `emplois`.
  `referentiel` n'importe jamais `protocoles`. Les adresses restent donc dans
  `referentiel/produits.ts` (`ESPACE_PARTAGE`, `CLES_PARTAGEES_DE_PALETTES`,
  `CLE_NOMMAGE_DE_PALETTES`, `CLE_RECETTE`), et `palettes.ts` les republie.
  Le commentaire de tête de `produits.ts` renvoie à la porte `protocoles` pour
  la forme et la version de chaque donnée.
- La porte est pure : aucun import de Figma, de Node ni d'`ajv`.
  `porteNavigateur.test.mjs` ne couvre que les lecteurs ; ajouter à
  `paquetPublie.test.mjs` la clé `./protocoles`, et un test qui importe
  `@ucm-kit/core/protocoles` depuis Node. Le README du kit décrit la porte
  (le test `portesDocumentees` l'exige).
- `PRODUITS` (`produits.ts`) : rien à changer dans les données ; le
  commentaire du registre cite la porte.

## Le classement commun

`donnee.ts` :

```ts
/** Ce qu'une lecture conclut d'une donnée partagée. */
export type EtatDeLaDonnee = 'absente' | 'illisible' | 'refusee' | 'ancienne' | 'courante' | 'future';

export type DonneeLue<T> =
  | { readonly etat: 'absente' }
  | { readonly etat: 'illisible'; readonly cause: 'json' | 'forme' | 'version'; readonly version?: number }
  | { readonly etat: 'refusee' }
  | { readonly etat: 'ancienne'; readonly version: number; readonly valeur: T }
  | { readonly etat: 'courante'; readonly version: number; readonly valeur: T }
  | { readonly etat: 'future'; readonly version: number };

/** Les versions qu'un lecteur reconnaît. */
export interface FenetreDeVersions {
  /** Le champ qui porte la version : `version` ou `formatVersion`. */
  readonly champ: string;
  readonly courante: number;
  /** La plus ancienne version lue ; en dessous, la donnée est illisible. */
  readonly premiere: number;
  /** La version d'un objet dont le champ n'est pas un nombre. Absent : un tel objet est illisible. */
  readonly parDefaut?: number;
}

export function classerLaDonnee(texte: string | undefined, fenetre: FenetreDeVersions): DonneeLue<Record<string, unknown>>;

/** Appelle `lire`, qui touche Figma ; une exception donne `refusee`, jamais `absente`. */
export function lireLaDonnee<T>(lire: () => string, classer: (texte: string) => DonneeLue<T>): DonneeLue<T>;
```

Règles de `classerLaDonnee`, dans l'ordre :

1. `undefined` ou `''` : `absente`.
2. JSON invalide : `illisible`, cause `json`.
3. Autre chose qu'un objet (tableau, nombre, `null`) : `illisible`, cause
   `forme`.
4. Champ de version qui n'est pas un nombre : la version `parDefaut` si elle
   existe ; sinon `illisible`, cause `version`.
5. Version qui n'est pas un entier positif ou nul : `illisible`, cause
   `version`.
6. Version supérieure à `courante` : `future`.
7. Version inférieure à `premiere` : `illisible`, cause `version`, avec la
   version lue.
8. Version inférieure à `courante` : `ancienne`, avec l'objet.
9. Sinon : `courante`, avec l'objet.

Aucune lecture ne migre ni ne réécrit la donnée. Le classement ne valide que
l'enveloppe : la forme du contenu reste au lecteur de chaque donnée.

Le féminin suit les classements existants (`Classement` de la recette,
`EtatDeLaMarque`, `ArchitectureDuFichier`) : leurs valeurs ne changent pas.

## Le module `palettes`

### La recette

```ts
export const FENETRE_DE_LA_RECETTE: FenetreDeVersions = { champ: 'formatVersion', courante: 12, premiere: 8 };
export function classerLEnveloppeDeLaRecette(texte: string | undefined): DonneeLue<Record<string, unknown>>;
```

Pas de `parDefaut` : une recette sans `formatVersion` reste illisible.

Frontière avec `ucm-couleur` : le kit classe l'enveloppe ; `ucm-couleur` garde
le type `Recette`, `validerRecette` et les migrations des formats 8 à 11. Ces
trois parties lisent les bornes et les valeurs par défaut du moteur
(`BORNES_DES_CRANS_LIBRES`, profils par défaut du format 11,
`luminositeAuNumero`) : les déplacer porterait le calcul dans le kit.

`packages/couleur/src/recette.ts` :

- `FORMAT_RECETTE` vaut `FENETRE_DE_LA_RECETTE.courante` et reste exporté ;
  `PREMIER_FORMAT_LISIBLE` vaut `FENETRE_DE_LA_RECETTE.premiere`.
- `classerRecette` appelle `classerLEnveloppeDeLaRecette`, puis traduit :
  `absente` → recette par défaut ; `illisible` cause `json` ou `forme` →
  refus `{ regle: 'forme', chemin: '' }` ; cause `version` → refus
  `{ regle: 'forme', chemin: 'formatVersion' }`, avec `valeur` quand la
  version est lue ; `future` → inchangé ; `ancienne` → migrations puis
  validation ; `courante` → validation.
- Le `Classement` rendu reste identique pour chaque entrée : les tests de
  `packages/couleur/tests/` passent sans changement d'attente. Seul écart
  admis : aucun.

### Le suivi des variables

```ts
export const VERSION_DU_SUIVI_DES_VARIABLES = 1;
export const FENETRE_DU_SUIVI: FenetreDeVersions = { champ: 'version', courante: 1, premiere: 1, parDefaut: 1 };

export type ModeDuSuivi = typeof INTENSITE_UNIQUE | Mode;
export type Liaison = 'destination' | 'reprise';
export interface VariableSuivie { readonly id: string; readonly ecrite: string }
export interface PaletteSuivie { /* les champs actuels de plugin-palettes/src/variables/suivi.ts */ }

/** Ce que la lecture complète rend ; la destination reste brute, Palettes la valide. */
export interface SuiviLu {
  readonly destination: unknown;
  readonly confirmee: unknown;
  readonly palettes: { readonly [id: string]: PaletteSuivie };
}

/** La lecture complète : refuse une version future. */
export function lireLeSuiviComplet(texte: string): DonneeLue<SuiviLu>;

/** Le relevé conservateur : les identifiants suivis, quelle que soit la version. */
export function identifiantsDuSuivi(texte: string): ReadonlySet<string>;
```

- `lireLeSuiviComplet` reprend `lireLaPalette` et le corps de `lireLeSuivi`
  (`plugin-palettes/src/variables/suivi.ts`), sans `validerLaDestination`.
  `INTENSITE_UNIQUE`, `MODES` et `PROFILS` viennent du référentiel.
- `identifiantsDuSuivi` est `variablesSuiviesParPalettes`
  (`plugin-socle/src/inventaireDeNoms.ts`), déplacée sans changement.
- Les deux lecteurs ne fusionnent pas. Le commentaire de chacun dit pourquoi :
  la lecture complète d'un suivi futur ne rend aucune palette, et la
  protection des variables qu'il suit disparaîtrait.
- Palettes : `lireLeSuivi` garde sa signature et son résultat. Il appelle
  `lireLeSuiviComplet` : `absente` et `illisible` → `SUIVI_VIDE` ; `future` →
  `{ ...SUIVI_VIDE, version }` ; sinon il valide la destination comme
  aujourd'hui. `VariableSuivie`, `PaletteSuivie` et `Liaison` sont
  importés du kit et republiés par `suivi.ts` pour ses clients.
- Écart admis : un suivi de version `0`, négative ou décimale se lisait
  comme un suivi normal (ou futur au-dessus de 1) ; il devient illisible,
  donc `SUIVI_VIDE`. Aucun Palettes n'a jamais écrit ces versions.
- Socle : `variablesSuiviesParPalettes` disparaît ; `lireLeSuiviDePalettes`
  appelle `identifiantsDuSuivi`. Ses clients changent d'import.

### La marque `nommage`

```ts
export const VERSION_DE_LA_MARQUE = 1;
export type EtatDeLaMarque = 'absente' | 'courante' | 'illisible' | 'future' | 'refusee';
export function classerLaMarqueDeNommage(texte: string): Exclude<EtatDeLaMarque, 'refusee'>;
export function lireLaMarqueDeNommage(lire: () => string): EtatDeLaMarque;
export function texteDeLaMarque(): string; // JSON.stringify({ version: VERSION_DE_LA_MARQUE })
```

- Les deux lecteurs passent du socle au kit sans changement de comportement.
  Ils s'appuient sur `classerLaDonnee` avec la fenêtre
  `{ champ: 'version', courante: 1, premiere: 1 }` : `ancienne` n'existe pas
  encore pour la marque.
- Une version `0`, une version décimale ou une version absente restent
  `illisible`, comme aujourd'hui.
- `rangerLaMarqueDeNommage` (`plugin-palettes/src/ecriture/marque.ts`) écrit
  `texteDeLaMarque()`. L'écriture reste dans Palettes : le kit ne touche pas
  Figma.
- Le socle republie `EtatDeLaMarque` le temps du lot, puis ses clients
  l'importent du kit.

### Les marqueurs d'une variable

```ts
/** Le marqueur `palette` n'est pas versionné : un texte non vide prouve que Palettes suit la variable. */
export function marqueurDePaletteLu(texte: string): string | null;
```

- `cle` reste un texte libre, décrit par un commentaire. Avant de changer le
  sens de l'un de ces deux marqueurs, il faudra leur donner une version.
- Le lecteur Figma de Nomenclature (`lectureFigma.ts`) appelle
  `marqueurDePaletteLu` là où il teste aujourd'hui un texte non vide.

## Hors du lot

- `lireLArchitectureDuFichier` (`produits.ts`, lot 14) reste où il est. Le
  lot 12 décidera s'il rejoint le module `nommage`.
- Le suivi des planches (`ucm_palettes/planche`) reste interne à Palettes.

## Les tests

- `donnee.ts` : chaque règle de `classerLaDonnee`, une entrée par ligne ;
  `lireLaDonnee` sur une exception rend `refusee`.
- `palettes.ts` : pour la recette, le suivi et la marque, absence, JSON
  invalide, lecture refusée, version ancienne, courante et future.
- Les octets de chaque producteur, lus par chaque lecteur :
  `texteDuSuivi(suivi)` de Palettes lu par `lireLeSuiviComplet` et par
  `identifiantsDuSuivi` ; `texteDeLaMarque()` lu par
  `classerLaMarqueDeNommage` ; un suivi de version 2 qui garde des
  identifiants : la lecture complète le dit `future`, le relevé rend ses
  identifiants.
- Les tests actuels de la recette (`packages/couleur/tests/`), du suivi
  (`plugin-palettes/tests/`) et de la protection
  (`plugin-socle/tests/protectionDePalettes.test.ts`) passent sans
  changement d'attente.
