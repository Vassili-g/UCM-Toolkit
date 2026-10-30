# Conception du lot 14

Entrée des tâches T14.2 et T14.1 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi est
dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md), lot 14 et
décision D5, et dans le constat F12 de la
[revue de Codex](../REVUE-CODEX-DU-PLAN-FIABILITE.md).

## Le signal du full UCM

Le nom d'une collection ne départage pas un fichier libre d'un fichier qui
suit l'architecture UCM : une collection appelée `theme` peut exister dans les
deux. Les règles v2 de Nomenclature ne portent plus l'interrupteur
`termesUcm` de la v1. Le mainteneur a décidé : un interrupteur de la
Configuration d'UCM Nomenclature, au format des interrupteurs de la
Configuration de l'exporteur, rangé dans les données partagées du fichier, lu
par Palettes.

## La donnée partagée (kit)

```ts
// packages/kit/src/referentiel/produits.ts, à côté de CLE_NOMMAGE_DE_PALETTES
/** La déclaration qu'UCM Nomenclature range à la racine de `ESPACE_ARCHITECT` : ce fichier suit l'architecture UCM. */
export const CLE_ARCHITECTURE_DU_FICHIER = 'architecture';

/** Ce que la lecture de la déclaration rend. `ucm` : `{"version":1,"ucm":true}` ; `libre` : `{"version":1,"ucm":false}`. */
export type ArchitectureDuFichier = 'absente' | 'ucm' | 'libre' | 'illisible' | 'future';

/** Classe le texte rangé : vide, `absente` ; un objet `version` 1 avec un booléen `ucm` ; un entier supérieur à 1, `future` ; le reste, `illisible`. */
export function lireLArchitectureDuFichier(texte: string): ArchitectureDuFichier;

/** Le texte que Nomenclature range. */
export function texteDeLArchitectureDuFichier(ucm: boolean): string;
```

- Le kit déclare la clé, sa forme et son lecteur, comme pour la marque de
  nommage. Le lot 11 déplacera les deux dans le module `nommage` de la porte
  `protocoles`.
- `PRODUITS` : Nomenclature écrit cette donnée, Palettes la lit. Si aucune
  valeur de `DonneeDeProduit` ne la décrit, en ajouter une
  (`architecture-du-fichier`) et le dire.
- Seul `ucm` déclenche le refus de Palettes. `absente`, `libre`, `illisible` et
  `future` n'en déclenchent aucun : le périmètre agnostique reste le défaut.

## L'interrupteur de Nomenclature (T14.2)

- **Place.** L'onglet « Réglages » de la Configuration
  (`plugin-architect/src/ui/nomenclature/configuration.ts`), en tête, dans une section
  d'intertitre « Architecture du fichier », avant « Collections analysées ».
- **Forme.** `createInterrupteur` du socle (`ucm-plugin-socle/src/ui/Interrupteur`),
  comme l'exporteur dans `plugin-exporter/src/ui/components/ConfigurationPage.ts` :
  un identifiant, un libellé, une phrase d'aide, un effet immédiat.
- **Textes.**
  - Libellé : « Ce fichier suit l’architecture UCM ».
  - Aide : « UCM Palettes n’écrit alors ses palettes ni dans theme, ni dans
    brands, ni dans utility. Ces collections ne portent que des alias. »
- **Écriture.** Le basculement passe par le canal des règles du fichier
  (`frontiere.regle`, le message validé par `messages.ts`) : une règle
  nouvelle `{ type: 'architecture', ucm: boolean }` dans `regles.ts`, rangée
  sous `CLE_ARCHITECTURE_DU_FICHIER` avec `texteDeLArchitectureDuFichier`.
  Comme les autres règles, elle entre dans l'export et l'import du fichier de
  règles (`regles-ucm-nomenclature.json`), et un fichier importé qui ne la
  porte pas ne la change pas.
- **État affiché.** L'interrupteur montre l'état lu à chaque bilan ;
  `illisible` et `future` s'affichent désactivés, avec une ligne qui le dit :
  « La déclaration rangée dans ce fichier est illisible. » ou « Elle vient
  d’une version plus récente d’UCM Nomenclature. » Le basculement réécrit
  alors une valeur courante.
- **Échec.** Une écriture refusée par Figma remet l'interrupteur à l'état lu,
  comme l'exporteur le fait.
- **Historique.** L'Historique garde le dernier renommage et le dernier
  import ; le basculement de l'interrupteur n'y entre pas, puisqu'il se défait
  par un autre basculement.
- **Galerie.** Deux états : interrupteur désactivé, interrupteur activé ; un
  troisième pour la déclaration illisible.

## Le refus de Palettes (T14.1)

```ts
// packages/kit/src/referentiel/architecture.ts
/** Les couches où UCM Palettes n'écrit pas en full UCM : elles ne portent que des alias. */
export const COUCHES_SANS_PALETTES = ['theme', 'brands', 'utility'] as const satisfies readonly Collection[];
```

- Palettes lit la déclaration à la racine de `ESPACE_ARCHITECT` au moment de
  ranger la destination (`rangerLaDestination`) et au début de l'écriture
  (`ecrireLesVariables`), avant toute mutation.
- Quand elle vaut `ucm` et que `collectionUcmReconnue` reconnaît la collection
  visée parmi `COUCHES_SANS_PALETTES`, Palettes refuse :
  - au rangement : un refus nouveau de `RefusDeDestination`, `couche`, affiché
    dans la carte « Destination des tokens » ;
  - à l'écriture : une issue nouvelle de palette, `couche-interdite`, sans
    mutation. Une destination `{ nom }` (collection à créer) se juge sur ce
    nom.
- `validerLaDestination` reste pure et ne lit pas Figma : le refus de couche
  se décide dans `rangerLaDestination`, qui connaît le nom de la collection.
- Une reprise n'écrit que dans sa collection d'origine : elle n'est pas
  refusée.

### Les textes

Écrits avec `rediger-diagnostics-ucm` ; une idée par phrase.

| Cas | ou | quoi | geste |
|---|---|---|---|
| Rangement | Collection | La collection « {nom} » est une couche de l’architecture UCM. Elle ne porte que des alias vers les primitives. | Choisissez la collection des primitives. |
| Écriture | Tokens non écrits : {palette} | même texte | Changez la destination des tokens : choisissez la collection des primitives. |

En anglais :

| Cas | ou | quoi | geste |
|---|---|---|---|
| Rangement | Collection | The collection “{nom}” is a layer of the UCM architecture. It only holds aliases to the primitives. | Choose the primitives collection. |
| Écriture | Tokens not written: {palette} | même texte | Change the token destination: choose the primitives collection. |

## `AGENTS.md`

Le groupe « Écriture d'UCM Palettes » gagne la frontière : « En full UCM (la
déclaration `architecture` d'UCM Nomenclature vaut `ucm`), Palettes n'écrit ni
dans `theme`, ni dans `brands`, ni dans `utility` (`COUCHES_SANS_PALETTES`).
Sans déclaration, une collection de ce nom reste une destination possible. »
Le groupe « UCM Nomenclature » décrit l'interrupteur et sa clé.

## Les tests attendus

Kit : `lireLArchitectureDuFichier` sur vide, `{"version":1,"ucm":true}`,
`{"version":1,"ucm":false}`, `{"version":2}`, `{}`, `{"version":1}`, un texte
qui n'est pas du JSON ; `texteDeLArchitectureDuFichier` se relit.

Nomenclature : basculer range la règle et la relit au bilan suivant ; l'export
et l'import du fichier de règles la portent ; un import qui ne la porte pas ne
la change pas ; un refus d'écriture remet l'interrupteur ; les états de
galerie.

Palettes (sonde `destination-theme` de Codex : aujourd'hui 44 variables
créées dans `theme`) :

- déclaration `ucm` : `theme`, `Theme`, `brands`, `utility`, `color-utilities`
  sont refusés au rangement et à l'écriture, sans mutation ; `primitives` et
  une collection libre sont admises. Rouge aujourd'hui ;
- déclaration absente, `libre`, `illisible` ou `future` : aucune collection
  n'est refusée ;
- une reprise dans une collection `theme` n'est pas refusée.

## Les fichiers de chaque tâche

- T14.2 : `packages/kit/src/referentiel/produits.ts`, les tests du kit,
  `packages/plugin-architect/src/nomenclature/regles.ts`, `messages.ts`, `session.ts`
  (le bilan porte l'état lu), `projection.ts` (sa construction), `ui/configuration.ts`, `ui/textes.ts`, la
  galerie et les tests de Nomenclature.
- T14.1 (après T14.2) : `packages/kit/src/referentiel/architecture.ts`,
  `packages/plugin-palettes/src/variables/destination.ts` (`RefusDeDestination`),
  `src/ecriture/variables.ts` (`rangerLaDestination`, `ecrireLesVariables`),
  `src/i18n/fr.ts`, `src/i18n/en.ts`, l'affichage de l'issue dans
  `src/ui/ongletGestion.ts` et la carte de destination, les tests, et
  `AGENTS.md`.
