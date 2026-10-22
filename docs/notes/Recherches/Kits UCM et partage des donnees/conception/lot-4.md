# Conception du lot 4

Entrée des tâches T4.1, T4.2 et T4.3 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi est
dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md), lot 4 et
décision D4, et dans la [revue de Codex](../REVUE-CODEX-DU-PLAN-FIABILITE.md),
constats F07 et F11.

## Ce que le code fait aujourd'hui

- `lecteurDeVariablesFigma` lit le suivi racine une fois. Si la lecture lève,
  il obtient un ensemble vide (`plugin-architect/src/nomenclature/lectureFigma.ts:14`).
  Une variable est protégée si le suivi la liste ou si son marqueur `palette`
  n'est pas vide (`:31`).
- Une variable reprise par Palettes ne porte pas de marqueur : `ecrireLaReprise`
  (`plugin-palettes/src/ecriture/variables.ts`) ne pose `palette` et `cle` que
  sur les variables qu'elle crée. Quand la lecture du suivi est refusée, une
  variable reprise paraît ordinaire (sonde `protection-lecture-refusee`).
- `tests/ecriture.test.ts:497-499` fige ce défaut : une racine qui refuse la
  lecture n'y donne aucune protection. T4.1 inverse cette attente.
- Une marque dont la lecture lève vaut `false` (`lectureFigma.ts:16`) : la
  protection reste, c'est le sens sûr. Une marque vide, illisible ou d'une
  version future vaut aussi `false` (`plugin-socle/src/inventaireDeNoms.ts`,
  `marqueDeNommageLue`). Ces quatre cas se confondent, alors que le geste qui
  libère les variables n'est pas le même.
- Le marqueur de chaque variable se lit sans `try` (`lectureFigma.ts:21`) : un
  refus fait échouer toute l'analyse.
- `palettesLibres` libère les variables de Palettes quand la marque est lue et
  que les règles sont rangées ; `estProtegee` est le seul juge.
- L'écriture relit l'inventaire avec un lecteur neuf (`ecriture.ts`,
  `creerPortEcriture`) et relit les règles (`palettesLibresMaintenant`). Une
  variable protégée est sautée avec le motif `protegee`.
- `variablesSuiviesParPalettes` relève les identifiants de toute version du
  suivi. Ce relevé conservateur reste.
- « À appliquer » affiche `nomsProteges(n)` et une seule explication,
  `nomsProtegesExplication` (`ui/aAppliquer.ts`). La Configuration écrit
  « palettes protégées », sans compte ni raison (`ui/configuration.ts:51`).
- `rienAFaire` (`ui/etat.ts:60`) ignore les protégés, et `tests/etat.test.ts:73`
  l'exige. Un fichier où ne restent que des variables protégées affiche « Tous
  les noms suivent vos règles ».

## La lecture du suivi et de la marque (T4.1)

```ts
// packages/plugin-socle/src/inventaireDeNoms.ts

/** Ce que rend la lecture du suivi racine `variables` de Palettes. */
export type LectureDuSuivi =
  | { readonly etat: 'absent' }                                  // la clé est vide
  | { readonly etat: 'lu'; readonly ids: ReadonlySet<string> }   // relevé de `variablesSuiviesParPalettes`, toute version
  | { readonly etat: 'refuse' };                                 // la lecture a levé

/** Lit le suivi par `lire`, qui appelle Figma. Une exception donne `refuse`, jamais un ensemble vide. */
export function lireLeSuiviDePalettes(lire: () => string): LectureDuSuivi;

/** La marque `nommage` de Palettes. `courante` : un objet JSON de `version: 1`. */
export type EtatDeLaMarque = 'absente' | 'courante' | 'illisible' | 'future' | 'refusee';
export function classerLaMarqueDeNommage(texte: string): Exclude<EtatDeLaMarque, 'refusee'>;
/** Une exception donne `refusee`. */
export function lireLaMarqueDeNommage(lire: () => string): EtatDeLaMarque;
```

- **Le suivi.** Un texte vide donne `absent`. Un texte illisible donne `lu`
  avec un ensemble vide, comme aujourd'hui : Palettes le lit comme un suivi
  vide et ne connaît plus ces variables. Un suivi de version future garde ses
  identifiants.
- **La marque.** `future` : un objet dont `version` est un entier supérieur à
  1. `illisible` : tout autre texte non vide qui n'est pas `courante` (`{}`,
  `[]`, `null`, `1`, `{"version":"1"}`, `{"version":0}`, un texte qui n'est pas
  du JSON). `marqueDeNommageLue` disparaît ; ses tests passent à
  `classerLaMarqueDeNommage`.
- **Ce qui remonte.** Le type à trois états reste dans le lecteur. Ce qui
  remonte au port et à l'inventaire est la décision prise variable par
  variable :

```ts
export interface PortDeLecture {
  // … inchangé, dont protegee(variable)
  /** Vrai quand on ne sait pas si Palettes suit cette variable. Absent : faux. */
  indecidable?(variable: VariableLue): boolean;
  /** Remplace `palettesSuiventLesRegles`. Absent : `absente`. */
  marqueDePalettes?(): EtatDeLaMarque;
}

export interface EntreeInventaire {
  // …
  /** Variable seulement, posé quand c'est vrai, jamais avec `protegee: true`. */
  readonly indecidable?: true;
}
export interface Inventaire {
  readonly entrees: readonly EntreeInventaire[];
  /** Remplace `palettesSuiventLesRegles`. Absent : `absente`. */
  readonly marque?: EtatDeLaMarque;
}
```

- `lireInventaire` et `inventaireDeLectures` posent `indecidable` et `marque`.
  Le lecteur de Palettes (`plugin-palettes/src/variables/nommeur.ts`) ne donne
  ni l'un ni l'autre et ne change pas.
- `palettesLibres(inventaire: Pick<Inventaire, 'marque'>, reglesRangees)` vaut
  `inventaire.marque === 'courante' && reglesRangees`.
- `inventaireSelonLaProtection` efface `protegee` et `indecidable` quand les
  variables de Palettes sont libres.

## La règle de suspension (T4.1)

Dans `lecteurDeVariablesFigma` :

```
protegee(v)    = (suivi lu et suivi.ids contient v.id) ou marqueur(v) non vide
indecidable(v) = peutEtreUneCouleur(v) et non protegee(v)
                 et (suivi refusé ou lecture du marqueur de v refusée)
peutEtreUneCouleur(v) = resolvedType de v absent, ou 'COLOR'
```

Sont suspendues toutes les variables locales de couleur sans marqueur, et
seulement elles :

- Palettes ne crée, ne relève et ne reprend que des variables `COLOR`. Une
  variable d'un autre type n'est jamais suivie.
- Le tri par collection est exclu : la destination et la reprise peuvent viser
  n'importe quelle collection locale, et dans un fichier libre le nom d'une
  collection ne prouve rien (D5).
- Une variable qui porte un marqueur reste décidée : elle est protégée.
- Un `resolvedType` absent, comme dans les doubles de test, compte pour une
  couleur possible : c'est le sens sûr.
- Un marqueur dont la lecture lève entre dans la même règle au lieu de faire
  échouer l'analyse ; `palette(v)` rend alors `undefined`.

Le seul juge reste `estProtegee` :

```ts
export function estProtegee(entree: Pick<EntreeInventaire, 'protegee' | 'indecidable'>, options: OptionsDeProtection = {}): boolean {
  return (entree.protegee || entree.indecidable === true) && options.palettesLibres !== true;
}
```

Une variable indécidable suit les règles quand Palettes est libre : Palettes
ne réécrit alors plus ses noms, et savoir s'il la suit ne change rien.

**Dans la proposition.** `idsNonRenommables` passe déjà par `estProtegee`
(`plugin-socle/src/nomsSelonLesRegles.ts`). Les variables indécidables sont
figées, et leur dossier garde son nom (`groupesFiges` du lexique). Cela peut
bloquer d'autres renommages des mêmes dossiers : c'est le sens sûr. Une
nouvelle analyse relit tout avec un lecteur neuf : une lecture rétablie lève la
suspension.

**Au moment d'écrire** (`ecriture.ts`) :

- `palettesLibresMaintenant` devient `reglesRangeesMaintenant(stockage)`. Un
  stockage illisible donne `false`.
- `ObjetDuDocument.protegee: boolean` devient `protection?: CauseDeProtection`,
  calculé par `causeDeProtection` (section suivante).
- `controler` saute avec le motif `non-verifiee` quand la cause est
  `lecture-refusee`, et avec `protegee` sinon. `MotifSaute` gagne
  `'non-verifiee'`.
- Une lecture refusée entre l'analyse et l'écriture se voit ici, puisque
  l'écriture relit avec un lecteur neuf.
- L'annulation passe par le même `controler` : une restitution indécidable est
  sautée en `non-verifiee` et reste au journal.
- `ResultatVue` (`messages.ts`) gagne `nonVerifiees?: number`, compté dans
  `resultatVue` (`session.ts`) comme `exclues`.

## Les causes de protection (calcul en T4.1, bilan en T4.2)

```ts
// packages/plugin-socle/src/inventaireDeNoms.ts
export type CauseDeProtection = 'marque-absente' | 'marque-illisible' | 'marque-future' | 'sans-regles' | 'lecture-refusee';

/** Ce qui empêche de renommer l'entrée ; `undefined` quand rien ne l'empêche. Le seul endroit où la cause se calcule. */
export function causeDeProtection(
  entree: Pick<EntreeInventaire, 'protegee' | 'indecidable'>, inventaire: Pick<Inventaire, 'marque'>, reglesRangees: boolean,
): CauseDeProtection | undefined;
```

| Entrée | Marque | Règles rangées | Cause |
|---|---|---|---|
| ni `protegee` ni `indecidable` | toute | tout | `undefined` |
| `protegee` ou `indecidable` | `courante` | oui | `undefined` (libre) |
| `indecidable` | autre cas | | `lecture-refusee` |
| `protegee` | `refusee` | | `lecture-refusee` |
| `protegee` | `absente` | | `marque-absente` |
| `protegee` | `illisible` | | `marque-illisible` |
| `protegee` | `future` | | `marque-future` |
| `protegee` | `courante` | non | `sans-regles` |

- Un test parcourt toutes les combinaisons et vérifie que
  `estProtegee(e, { palettesLibres: palettesLibres(inv, r) })` est vrai si et
  seulement si `causeDeProtection(e, inv, r) !== undefined`.
- La projection compte avec `causeDeProtection`, sur l'inventaire effectif,
  dans les collections analysées (le filtre actuel de `proteges` dans
  `projection.ts`). `reglesRangees` vaut `!premierLancement()`.

```ts
// packages/plugin-architect/src/messages/nomenclature.ts
export interface Bilan {
  // …
  readonly proteges: number;   // inchangé : le total, toutes causes
  /** Une ligne par cause présente, dans l'ordre de `CauseDeProtection`, sans nombre nul. La somme vaut `proteges`. */
  readonly protections: readonly { readonly cause: CauseDeProtection; readonly nombre: number }[];
}
export interface CollectionVue { /* … */ readonly protegees: number }   // remplace `palettes: boolean`
```

- Le nombre d'une cause, son explication et le total du titre viennent du même
  tableau. Un test projette un fichier qui mêle les causes et compare
  `protections` aux identifiants que `idsNonRenommables` fige, collection par
  collection.
- `CollectionVue.protegees` compte toutes les causes, collections exclues
  comprises.
- `proteges` garde son sens : toutes les variables protégées, même celles dont
  le nom suit déjà les règles.
- **« Rien à faire »** : `rienAFaire` exige aussi `proteges === 0`. Chaque
  cause a un geste, et « Tous les noms suivent vos règles » le cacherait.
  `tests/etat.test.ts:73` s'inverse.

## Les textes d'écran (T4.2)

Écrits avec `rediger-diagnostics-ucm` : un constat, puis le geste.

**Carte « Non renommés » d'« À appliquer »**, une ligne par cause, avec sa
pastille :

| Cause | Ligne du nombre | Explication |
|---|---|---|
| `marque-absente` | `nomsProteges` (actuel) | « UCM Palettes écrit ces variables, et leur groupe garde son nom. Ouvrez UCM Palettes une fois dans ce fichier pour qu’il suive les règles, puis revenez ici. » (texte actuel) |
| `marque-illisible` | `nomsProteges` | « Ce qu’UCM Palettes a noté dans ce fichier est illisible. Signalez ce fichier au mainteneur des plugins UCM. » |
| `marque-future` | `nomsProteges` | « Ce fichier a été ouvert avec une version d’UCM Palettes plus récente que celle qu’UCM Nomenclature connaît. Mettez à jour UCM Nomenclature pour renommer ces variables. » |
| `sans-regles` | `nomsProteges` | « Les variables d’UCM Palettes gardent leur nom tant que l’écriture des noms n’est pas enregistrée. Choisissez l’écriture, puis appuyez sur Continuer. » |
| `lecture-refusee` | « 1 variable de couleur non vérifiée » / « N variables de couleur non vérifiées » | « UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse pour renommer ces variables. » |

- Le titre : `nonRenommes(bloques, proteges, nonVerifiees)` donne « Non
  renommés : 1 bloqué, 3 protégés, 40 non vérifiés ». Les protégés comptent les
  quatre premières causes, les non vérifiés la cinquième.
- La pastille : `pastilleProtege` (« Protégé ») pour les quatre premières
  causes ; `pastilleNonVerifie` (« Non vérifié ») pour `lecture-refusee`.
- La ligne `lecture-refusee` porte le bouton « Relancer l’analyse »
  (`fabriquerAction`).
- `sans-regles` ne s'affiche que dans la Configuration : sans règles rangées,
  l'écran est celui du premier lancement, et les onglets y sont masqués
  (`ui/etat.ts:72`, `ui/coquille.ts`). L'implémenteur vérifie que la
  Configuration s'ouvre pendant le premier lancement ; sinon la cause n'est
  tenue que par les tests du sandbox, et il le dit.

**La Configuration**, ligne d'une collection (`ui/configuration.ts:51`) :

- « 346 variables, dont 120 gardent leur nom » ; « 346 variables, qui gardent
  leur nom » quand toutes le gardent ; sinon `variablesDeLaCollection`. Au
  singulier : « 1 variable, qui garde son nom » et « dont 1 garde son nom ».
- Sous la liste des collections, chaque cause présente reprend sa ligne du
  nombre et son explication, avec les textes de la carte.
- `palettesProtegees` disparaît.

**La ligne du résultat** (`ui/annonce.ts`, `ui/aAppliquer.ts`), quand
`nonVerifiees > 0` :

- Lot partiel : « 1 variable de couleur n’a pas été renommée. UCM Nomenclature
  n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. » ou « N variables
  de couleur n’ont pas été renommées. … ». Elle remplace `nomsSautes` pour ces
  variables, et `nomsSautes` compte les autres.
- Lot refusé, quand toutes les variables sautées sont non vérifiées : « Rien
  n’a été renommé. UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté
  dans ce fichier. Relancez l’analyse. » Le bouton « Relancer l’analyse »
  reste.

## Les états de galerie (T4.2)

La galerie rejoue des messages : les faits du sandbox n'y entrent que par
`Bilan.protections`, `CollectionVue.protegees` et `ResultatVue.nonVerifiees`.
Les règles absentes et les règles illisibles donnent le même bilan, celui du
premier lancement : elles ont un seul état, et les tests du sandbox les
séparent.

| État | Scénario | Ce qu'il montre |
|---|---|---|
| `a-appliquer-non-renommes` (existant) | `protections: [{ marque-absente, 3 }]` | « 1 bloqué, 3 protégés », le nom bloqué, « 3 noms écrits par UCM Palettes » et le texte actuel |
| `protection-marque-courante` | `proteges: 0`, `protections: []`, un groupe qui renomme une variable de Palettes | Aucune ligne de protection ; la variable de Palettes figure parmi les renommages |
| `protection-marque-illisible` | `[{ marque-illisible, 3 }]` | Le texte qui renvoie au mainteneur, sans « Ouvrez UCM Palettes » |
| `protection-marque-future` | `[{ marque-future, 3 }]` | Le texte « Mettez à jour UCM Nomenclature » |
| `protection-sans-regles` | Premier lancement avec `[{ sans-regles, 120 }]`, puis la Configuration | « 346 variables, dont 120 gardent leur nom » et le texte de l'écriture à enregistrer |
| `protection-lecture-refusee` | `[{ lecture-refusee, 120 }]` | « 120 variables de couleur non vérifiées », le texte, le bouton et la pastille « Non vérifié » |
| `protection-deux-causes` | `[{ marque-absente, 3 }, { lecture-refusee, 40 }]` | « 1 bloqué, 3 protégés, 40 non vérifiés » et deux lignes dans l'ordre des causes |
| `protection-seule` | Ni groupe, ni bloqué, ni question ; `[{ marque-absente, 3 }]` | Pas de « Tous les noms suivent vos règles » ; la carte seule |
| `configuration-protegees` | `bilanDeBase`, puis la Configuration | La ligne de `primitives` avec son compte, et l'explication sous la liste |
| `application-non-verifiee` | Appliquer, puis un lot refusé avec `sautes: 2`, `nonVerifiees: 2` | « Rien n’a été renommé. … » et « Relancer l’analyse » |
| `application-partielle-non-verifiee` | Appliquer, puis un lot partiel avec `nonVerifiees: 2`, puis le bilan | « ✓ 85 noms renommés » et la note des deux variables non vérifiées |

Chaque `regarder` écrit le texte exact que l'état doit montrer. `collections`
de `donnees.cjs` passe de `palettes` à `protegees`.

## L'exception D4 dans `AGENTS.md` (T4.3)

Le groupe « Écriture dans le document » d'`AGENTS.md` ne porte que l'écriture
de l'exporteur. La règle que D4 assouplit est celle d'« Écriture d'UCM
Palettes » : `src/code.ts` est le seul fichier qui importe `src/ecriture/`,
avec une porte par geste d'écriture. La puce suivante va juste après celle-ci.
Le commentaire d'en-tête de `plugin-palettes/src/code.ts` gagne une phrase de
renvoi.

> - Une seule écriture se fait sans geste du designer. À l'ouverture,
>   `src/code.ts` appelle `rangerLaMarqueDeNommage` (`src/ecriture/marque.ts`),
>   qui range la marque `nommage`, `{"version":1}`, à la racine de
>   `ESPACE_PARTAGE` quand la clé est vide. La marque déclare une capacité du
>   code ouvert : ce Palettes nomme ses variables selon les règles d'UCM
>   Nomenclature, qui cesse alors de les protéger dès que l'écriture est rangée.
>   Une valeur non vide, même illisible ou d'une version future, n'est jamais
>   remplacée. Un fichier qui refuse l'écriture garde la marque absente, et la
>   protection avec. Aucun `commitUndo` ne suit, et aucun code ne l'efface :
>   elle reste après la fermeture. Risque : une version de Palettes antérieure
>   à la marque, rouverte ensuite dans le fichier, ne la retire pas et ne suit
>   pas les règles. À sa prochaine écriture de variables, elle peut redonner
>   des noms bruts aux variables qu'UCM Nomenclature a renommées. Conduite : un
>   fichier marqué ne s'ouvre qu'avec une version de Palettes qui pose la
>   marque. Si une version ancienne y a écrit, relancer l'analyse d'UCM
>   Nomenclature, qui propose de nouveau ces renommages. Aucune autre écriture
>   ne s'ajoute à l'ouverture sans une décision écrite ici.
>   `packages/plugin-palettes/tests/nommageDesPalettes.test.ts` et
>   `tests/nomsDePalettes.test.ts` à la racine le tiennent.

Dans le même commit :

- dans le groupe « UCM Nomenclature », la puce sur la protection gagne : « Une
  lecture refusée du suivi racine ou de la marque n'est pas une absence : une
  variable de couleur dont la protection ne se lit pas n'est ni proposée ni
  écrite (motif `non-verifiee`), annulation comprise, et l'écran donne la
  cause que calcule `causeDeProtection` du socle. » ;
- la carte du code ajoute `causeDeProtection` à côté de `estProtegee` et
  `palettesLibres` ;
- `rangerLaMarqueDeNommage` entre dans `AUTORITES`
  (`tests/inventaireInvariants.test.ts`).

## Les fichiers de chaque tâche

- T4.1 : `plugin-socle/src/inventaireDeNoms.ts`,
  `plugin-socle/src/nomsSelonLesRegles.ts` (à relire), `plugin-architect/src/nomenclature/lectureFigma.ts`,
  `session.ts`, `ecriture.ts`, `messages.ts` (`ResultatVue`), les tests du
  socle, de Nomenclature et `tests/nomsDePalettes.test.ts` à la racine.
- T4.2 : `plugin-architect/src/nomenclature/projection.ts`, `messages.ts` (`Bilan`,
  `CollectionVue`), `ui/etat.ts`, `ui/annonce.ts`, `ui/aAppliquer.ts`,
  `ui/configuration.ts`, `ui/textes.ts`, la galerie et ses tests.
- T4.3 : `AGENTS.md`, le commentaire de `plugin-palettes/src/code.ts`,
  `tests/inventaireInvariants.test.ts`.

## Les tests attendus

Un test qui prouve un défaut est rouge sans la correction ; il est marqué
**rouge**.

Socle (`plugin-socle/tests/protectionDePalettes.test.ts`) :

- `classerLaMarqueDeNommage` sur la table de la section « Lecture » ;
  `lireLaMarqueDeNommage` rend `refusee` quand `lire` lève.
- `lireLeSuiviDePalettes` : vide donne `absent` ; un suivi de version 2 ou 3
  donne `lu` avec ses identifiants ; illisible donne `lu` vide ; une exception
  donne `refuse`.
- `causeDeProtection` sur toutes les combinaisons, et l'invariant avec
  `estProtegee`.
- `inventaireSelonLaProtection` efface `indecidable` quand les variables sont
  libres.

Nomenclature, le lecteur :

- **Rouge.** Une variable `COLOR` sans marqueur, avec un suivi racine qui lève,
  donne `indecidable: true` et `estProtegee` vrai.
- Une variable `FLOAT` sans marqueur, avec le même refus, n'est pas
  indécidable ; une variable sans `resolvedType` l'est.
- **Rouge.** Un marqueur dont la lecture lève donne une variable indécidable,
  sans faire échouer `lireInventaire`.
- La marque refusée donne `marque: 'refusee'`.

Nomenclature, l'écriture (`tests/ecriture.test.ts`) :

- **Rouge.** L'attente de `:497-499` s'inverse : avec une racine qui lève, la
  demande d'une couleur sans marqueur est sautée en `non-verifiee`, et rien
  n'est écrit.
- **Rouge.** Annulation : une variable renommée avec un suivi lisible ; la
  racine refuse ensuite la lecture ; la restitution est sautée en
  `non-verifiee` et le journal garde la ligne.

Nomenclature, le protocole (`tests/protocole.test.ts`) :

- **Rouge.** La lecture devient refusée entre l'analyse et l'écriture : le nom
  ne change pas, et `nonVerifiees` vaut 1.
- **Rouge.** Lecture racine refusée puis rétablie, avec une variable reprise
  (dans le suivi, sans marqueur) et une couleur ordinaire. Pendant le refus,
  aucune n'est renommée, et `protections` vaut `[{ lecture-refusee, 2 }]`.
  Après une nouvelle analyse, marque absente : la reprise est protégée, la
  couleur ordinaire est proposée.

Racine (`tests/nomsDePalettes.test.ts`, liaison `reprise`) :

- **Rouge.** Palettes reprend une palette ; la lecture de la clé `variables`
  lève ensuite ; Nomenclature ne renomme aucune variable reprise.
- La même palette, lecture rétablie et marque posée : le test actuel reste
  vert.

Projection et interface :

- `projection.test.ts` : `protections` par cause, somme égale à `proteges`, et
  `CollectionVue.protegees`.
- **Rouge.** `etat.test.ts` : un bilan qui n'a que des protégés ne donne plus
  `rien-a-faire`.
- Les tests d'interface d'« À appliquer » et de la Configuration : une ligne et
  un texte par cause, le titre en trois parties.
- `annonce.test.ts` : un lot partiel et un lot refusé avec `nonVerifiees`.
- Un état de galerie par ligne du tableau ; la conversation principale les
  relit, `test:ui` n'est pas lancé.

Palettes : `nommageDesPalettes.test.ts` reste vert, l'écriture de la marque ne
change pas.

## Limites de cette note

- Les refus réels de `getSharedPluginData` dans Figma ne sont pas vérifiés :
  seules les sondes et les doubles de test les injectent.
- Aucune ancienne distribution de Palettes n'a été exécutée face à un fichier
  marqué : le risque écrit vient de la lecture du code actuel de la reprise.
