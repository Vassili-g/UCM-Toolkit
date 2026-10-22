# Conception du lot 12

Entrée des tâches T12.1 et T12.2 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi est
dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md), lot 12. Le
lot suit le lot 11 ([conception](./lot-11.md)) : il emploie `classerLaDonnee`
et la porte `protocoles`.

## Deux familles de clés `terme:`

Le préfixe `terme:` sert à deux choses différentes. Ce ne sont pas les mêmes
clés.

| Clé | Forme | Où elle vit | Constructeur aujourd'hui |
|---|---|---|---|
| Entrée rangée dans Figma (`ESPACE_ARCHITECT`) | `terme:` + mots du terme joints par une espace, casse gardée : `terme:font size` | Données partagées du fichier | `cleTerme` (`plugin-architect/src/nomenclature/regles.ts`) ; lue par `apres(cle, 'terme:')` et `motsDe` (`plugin-socle/src/reglesDeNommage.ts`) |
| Règle de l'analyse (`CleDeRegle`, `kit/src/referentiel/harmonisation.ts`) | `terme:` + mots en minuscules joints par `-` : `terme:font-size` | Mémoire seulement | Écrite à la main dans `vocabulaire-du-fichier.ts` (`terme:${par.join('-').toLowerCase()}`) et dans `projection.ts` (`cleDeTerme`, `` `terme:${cle}` `` dans `fiche`) |

Le lot donne un seul constructeur à chacune :

- l'entrée rangée : `cleTerme`, `cleEcart`, `cleOrdinaire` dans
  `protocoles/nommage.ts` ;
- la règle de l'analyse : `cleDeRegleDuTerme(mots: Mots): CleDeRegle` dans
  `referentiel/harmonisation.ts`, employée par `vocabulaire-du-fichier.ts`
  et par `projection.ts` (`cleDeTerme`, `fiche`).

Le commentaire de chaque constructeur cite l'autre et dit la différence.

## Le protocole des règles : `protocoles/nommage.ts`

Ce module reçoit tout `plugin-socle/src/reglesDeNommage.ts`, sans changement de
comportement sauf le classement des versions futures :

- constantes : `VERSION_DES_REGLES`, `CLE_ECRITURE`, `CLE_EXCLUES`,
  `CLE_CONVENTIONS_V1`, et les préfixes
  `PREFIXES_DE_NOMMAGE = { terme: 'terme:', ecart: 'ecart:', ordinaire: 'ordinaire:' } as const` ;
- constructeurs : `cleTerme(mots)`, `cleEcart(id)`, `cleOrdinaire(cle)`, qui
  quittent `plugin-architect/src/nomenclature/regles.ts` ;
- lecture : `lireEntree`, `lireEcriture`, `lireTerme`, `lireChoix`,
  `estConventions`, `estCleDeNommage`, `lireLesEntreesDeNommage`,
  `vocabulaireDeNommage`, `lireReglesDeNommage` ;
- types : `EcritureChoisie`, `ChoixDeConventions`, `EntreesDeNommage`,
  `ReglesPourLeCalcul`, `ReglesDeNommage` ;
- les petits prédicats (`estTexte`, `estMot`, `estMots`, `estObjet`,
  `trier`, `comparer`, `apres`, `motsDe`) restent exportés : Nomenclature les
  emploie.

L'écrivain reste Nomenclature (`serialiserRegle` dans `regles.ts`). Il prend
les constructeurs de clés et `VERSION_DES_REGLES` du kit.

### Les entrées d'une version future

`lireEntree` s'appuie sur `classerLaDonnee` avec la fenêtre
`{ champ: 'version', courante: VERSION_DES_REGLES, premiere: VERSION_DES_REGLES }`.
Elle rend toujours l'objet d'une entrée courante, et `undefined` sinon.

`EntreesDeNommage` gagne un champ :

```ts
/** Les clés de nommage dont l'entrée vient d'une version plus récente, triées. */
readonly futures: readonly string[];
```

`lireLesEntreesDeNommage` y range chaque clé de nommage (`estCleDeNommage`)
dont l'entrée est `future`. Les entrées futures restent ignorées pour le
calcul, comme aujourd'hui, mais elles sont nommées.

Les deux lecteurs en tirent une politique :

- **`lireReglesDeNommage`** (Palettes, l'explorateur) rend `null` quand
  `ecriture` ou `exclues` est future. Palettes garde alors la protection de
  ses variables et son nommage par défaut, comme avant le premier lancement de
  Nomenclature. Une entrée `terme:`, `ecart:` ou `ordinaire:` future ne
  change rien pour ces lecteurs.
- **Nomenclature** refuse d'écrire quand `futures` n'est pas vide : aucun
  renommage, aucune règle rangée. Le refus se produit avant toute mutation,
  dans `ecriture.ts`, par le même canal que les autres refus d'écriture.
  Textes, avec la skill `rediger-diagnostics-ucm` :
  - fr : « Une version plus récente d'UCM Nomenclature a rangé des règles dans
    ce fichier. Mettez le plugin à jour pour renommer. »
  - en : « A newer version of UCM Nomenclature saved rules in this file.
    Update the plugin to rename. »
  Le texte s'affiche là où le compte « À appliquer » s'affiche, et le bouton
  d'application reste inactif.

## Le calcul : la porte `@ucm-kit/core/nommage`

Le calcul ne décrit pas une donnée rangée : il ne va pas dans `protocoles`.
Il ne peut pas aller dans `referentiel`, qui n'importe pas `protocoles`. Il
prend une porte nouvelle, `src/nommage/`, déclarée dans `exports` et dans
`include` de `tsconfig.build.json`, décrite dans le README du kit, couverte
par `paquetPublie.test.mjs`. Elle importe `format`, `referentiel` et
`protocoles`, jamais Figma.

| Module du kit | Vient de | Contenu |
|---|---|---|
| `nommage/inventaire.ts` | `plugin-socle/src/inventaireDeNoms.ts` | `CibleDeNom`, `EntreeInventaire`, `Inventaire`, `OptionsDeProtection`, `estProtegee`, `palettesLibres`, `inventaireSelonLaProtection`, `CAUSES_DE_PROTECTION`, `CauseDeProtection`, `causeDeProtection` |
| `nommage/chemins-publies.ts` | `plugin-socle/src/cheminsPublies.ts` | Tout le module : il est pur et ne dépend que de l'inventaire et du kit |
| `nommage/calcul.ts` | `plugin-socle/src/nomsSelonLesRegles.ts` | Tout le module : `nomsSelonLesRegles`, `nomsSelonLesReglesSync`, `entreesRetenues`, `idsNonRenommables`, `avecLesCheminsPublies`, `ecritureEffective`, `conventionsDe`, `MoteurDeNommage`, `moteurDeNommageDuKit` |
| `nommage/index.ts` | | Republie les trois modules |

Le socle garde l'acquisition depuis Figma : `ObjetNomme`, `VariableLue`,
`CollectionLue`, `PortDeLecture`, `LecteurDeVariable`, `lireInventaire`,
`inventaireDeLectures`, `TAILLE_DU_LOT`, `AvancementLecture`,
`lireLeSuiviDePalettes` et `lireLaMarqueDeNommage` (ces deux derniers
appellent le kit, lot 11). `inventaireDeNoms.ts` importe les types de
l'inventaire depuis le kit.

### Migration

1. Créer les modules du kit, puis faire de `reglesDeNommage.ts`,
   `nomsSelonLesRegles.ts` et `cheminsPublies.ts` du socle des réexports du
   kit.
2. Migrer les clients relevés : `plugin-architect/src/lecture.ts` ;
   `plugin-architect/src/nomenclature/` (`conventions.ts`, `ecriture.ts`, `lecture.ts`,
   `messages.ts`, `projection.ts`, `regles.ts`, `session.ts`,
   `cheminsPublies.ts`) et ses tests ; `plugin-palettes/src/`
   (`lectureDesVariables.ts`, `variables/nommeur.ts`) et ses tests ; les
   tests du socle et les tests racine.
3. Supprimer les trois réexports. `git grep` de `reglesDeNommage`,
   `nomsSelonLesRegles` et `cheminsPublies` sous `plugin-socle/src` ne rend
   plus rien ; le README du socle suit.

## Les tests

- Octets sérialisés par `serialiserRegle` de Nomenclature (écriture, terme
  avec et sans définition, écart, ordinaire, exclues) lus par
  `lireLesEntreesDeNommage` du kit.
- Une entrée `version: 2` sous chaque clé : rangée dans `futures`, absente du
  calcul ; `ecriture` ou `exclues` future : `lireReglesDeNommage` rend
  `null` ; Nomenclature refuse d'écrire, sans mutation, avec le texte.
- `cleTerme(['font', 'size'])` vaut `terme:font size` ;
  `cleDeRegleDuTerme(['Font', 'Size'])` vaut `terme:font-size`.
- Idempotence, remplacements personnalisés, exclusions, collisions,
  protection avec et sans marque : les tests actuels du socle et de
  Nomenclature, déplacés ou réimportés, sans changement d'attente.
- `tests/nomsDePalettes.test.ts` et
  `packages/plugin-architect/tests/nomenclatureNomsDePalettes.test.ts` passent sans
  changement d'attente.
