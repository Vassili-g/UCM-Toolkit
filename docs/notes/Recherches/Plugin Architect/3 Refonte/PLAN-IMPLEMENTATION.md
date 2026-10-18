

Formule à respecter pour tous les agents:
"Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."


# Plan d'implémentation de la refonte d'UCM Architect

Ce plan construit la refonte décrite dans la [conception](./CONCEPTION.md) et
dessinée dans les [maquettes](./MAQUETTES-ARCHITECT.html), avec les
optimisations de [OPTIMISATION-LECTURE-ET-AFFICHAGE.md](../OPTIMISATION-LECTURE-ET-AFFICHAGE.md)
qui restent utiles une fois le périmètre réduit aux variables. Une revue l'a
relu avant son lancement ; la section « Revue du plan » dit ce qu'elle a
changé.

Cocher une case quand son commit est fait, avec le hash entre parenthèses.

## Décisions qui encadrent le plan

| Sujet | Décision |
|---|---|
| Périmètre | Les variables et les collections locales ; plus aucune lecture de page ni de composant |
| Confirmation | Une feuille de confirmation à chaque application |
| Palettes | Une variable qu'UCM Palettes a écrite n'est jamais renommée ; renommer la collection qui la porte reste permis, Palettes la suit par son identifiant |
| Termes UCM | Toujours appliqués ; l'option « Employer les termes UCM » de la v1 disparaît |
| Bases communes | En-tête, bouton Configuration, onglets, boutons, interrupteur, poignée et fenêtre viennent de `ucm-plugin-socle` ; la feuille qui monte du bas y entre aussi |
| Données UCM | Termes, collections, conventions, tables de synonymes, espaces et clés partagés viennent de `@ucm-kit/core/referentiel` ; le plugin n'en recopie aucune |
| Moteur | Le moteur pur (vocabulaire, lexique, normalisation, questions) vit dans le kit |
| Textes | Le sandbox envoie des données et des codes ; tous les textes vivent dans `src/ui/textes.ts` |
| Configuration | Une page sans onglets : l'onglet Général des maquettes n'aurait rien à porter tant qu'Architect n'a qu'une langue |
| Chromium | Aucun nouveau test Chromium ; la galerie sert à la relecture du mainteneur, qui lance lui-même les tests d'interface |

## Règles d'exécution

- Un lot par appel d'agent. Deux agents Claude au plus en même temps, sur des
  fichiers différents. Les lots Codex tournent en parallèle, sur leurs seuls
  fichiers : `packages/kit/`, `packages/plugin-socle/`,
  `packages/plugin-palettes/src/variables/suivi.ts` et ses importateurs,
  `docs/notes/Recherches/Plugin Architect/Mesures/`. Les lots Claude ne touchent
  que `packages/plugin-architect/`, sauf L0.
- Chaque agent charge la skill `rediger-sans-tics-ia` avant d'écrire un
  commentaire, et `rediger-diagnostics-ucm` avant d'écrire un texte destiné au
  designer.
- Chaque agent reçoit son lot, les contrats, ses fichiers et ses commandes de
  fin. Il ne touche aucun autre fichier. Un contrat à changer arrête le lot et
  remonte à la conversation principale.
- La conversation principale relit chaque diff, puis un `verificateur` relance
  les commandes du lot.
- Commit par chemins explicites sur `main`, sans pousser. Avant de commiter,
  comparer les fins de ligne au fichier de `HEAD`.
- **Rien n'est poussé avant F3.** Le kit change sans nouveau numéro jusqu'à
  F3 : `tests/versionSuitLeContenu.test.mjs` reste rouge en local, et seul ce
  test est toléré rouge. F3 monte les versions dans un commit, puis pousse
  toute la série.
- Un lot Claude qui a besoin d'un lot K attend son commit, puis la conversation
  principale lance `npm run build --workspace @ucm-kit/core` avant de lancer
  l'agent. Codex ne lance jamais le build ni les tests d'Architect.
- Aucune couleur écrite en dur dans `src/ui/styles.css` hors de sa section des
  rôles, placée en tête : la loi `couleursHorsDesRoles` du socle le refuse.

## Répartition et vagues

| Lot | Contenu | Agent | Exécutant | Dépend de |
|---|---|---|---|---|
| L0 | Contrats et squelette compilable | `implementeur`, relu par la principale | Claude | Ce plan |
| K0 | Types du moteur dans le kit | `implementeur` | Codex | Ce plan |
| K1 | Données du référentiel | `implementeur` | Codex | L0 |
| K2a | Vocabulaire du fichier | `implementeur` | Codex | K1 |
| K2b | Lexique et normalisation par étapes | `implementeur-exigeant` | Codex | K2a |
| K3 | Détecteurs de questions | `implementeur-exigeant` | Codex | K2b |
| K4 | Mesures | `implementeur` | Codex | K3 |
| S1 | Feuille et onglets renommables du socle | `implementeur` | Codex | L0 |
| P1 | Lecture des variables seules | `implementeur` | Claude | L0, K1 |
| P2 | Règles du fichier, journal et port de stockage | `implementeur` | Claude | L0 |
| P3 | Écriture des variables et des collections | `implementeur-exigeant` | Claude | P1, P2 |
| P5 | Projection vers l'écran | `implementeur-exigeant` | Claude | K2b, K3 |
| P4 | Session de calcul et protocole | `implementeur-exigeant` | Claude | P3, P5 |
| U1a | Coquille : en-tête, onglets, frontière, états | `implementeur-exigeant` | Claude | L0 |
| U1b | Premier lancement, écriture, Configuration | `implementeur` | Claude | U1a |
| U2 | Onglet À appliquer | `implementeur-exigeant` | Claude | U1a |
| U3 | Onglet À trancher | `implementeur-exigeant` | Claude | U1a |
| U4a | Onglet Règles : liste des termes | `implementeur` | Claude | U1a |
| U4b | Feuilles de l'écriture et des termes | `implementeur-exigeant` | Claude | U4a, S1 |
| U5 | Galerie des états | `implementeur` | Claude | U2, U3, U4b |
| Q1 | Seuil des questions | Principale, avec le mainteneur | Claude | K4 |
| F1 | Documents | Principale | Claude | P4 |
| F2 | Vérification d'ensemble | `verificateur` | Claude | Tous |
| F3 | Versions, publication, poussée | `executant`, puis principale | Claude | F2 |
| F4 | Recette dans Figma | Mainteneur | | F3 |

Vagues Claude, deux agents à la fois : L0 ; puis U1a et P2 ; U1b et U2 ;
U3 et U4a ; P1 dès K1 commité ; U4b dès S1 ; P3 et P5 dès K2b et K3 ; P4 ;
U5 ; F1 à F3.

## Contrats d'interface

L0 les écrit en code, types seuls pour le kit.

### Kit : `packages/kit/src/referentiel/harmonisation.ts`

Un terme est une suite de mots : `extra-small` vaut `['extra', 'small']`.

```ts
import type { CategorieDeNom, ConventionsParCategorie, NomANormaliser } from './conventions.js';
import type { ConventionDetectee } from './normalisation.js';
import type { Collection } from './architecture.js';

export type Mots = readonly string[];

/** Un nom lu ; pour une variable, l'identifiant visé par l'alias de son premier mode. */
export interface NomLu extends NomANormaliser { readonly cibleAlias?: string }
export interface Occurrence { readonly nomId: string; readonly rangSegment: number; readonly rangMot: number }

export interface Lexique {
  readonly noms: ReadonlyMap<string, NomLu>;
  /** Texte d'un segment vers ses mots, découpés une seule fois. */
  readonly mots: ReadonlyMap<string, Mots>;
  /** Mot en minuscules vers ses occurrences. */
  readonly occurrences: ReadonlyMap<string, readonly Occurrence[]>;
  /** Portée vers les identifiants de ses noms, occupants inchangés compris. */
  readonly portees: ReadonlyMap<string, readonly string[]>;
  /** Calculée une fois par lexique ; un changement de règle ne la refait pas. */
  readonly detection: Readonly<Record<CategorieDeNom, ConventionDetectee>>;
}
/** Le plugin ajoute les noms par lots, puis avance `terminer` entre deux pauses. */
export interface PreparationDuLexique { ajouter(noms: readonly NomLu[]): void; terminer(): Generator<void, Lexique> }

export interface TermePersonnalise { readonly terme: Mots; readonly remplace: readonly Mots[]; readonly definition?: string }
export interface VocabulaireDuFichier {
  readonly personnalises: readonly TermePersonnalise[];
  /** Termes UCM, par leur identifiant, que le fichier n'applique pas. */
  readonly ecartsUcm: readonly string[];
}
export type OrigineDuTerme = 'ucm' | 'personnalise';
export interface Remplacement { readonly debut: number; readonly fin: number; readonly par: Mots; readonly origine: OrigineDuTerme; readonly cle: string }
export interface IndexDuVocabulaire {
  /** Les remplacements d'une suite de mots, le plus long terme d'abord, sans chevauchement. */
  remplacements(mots: Mots, categorie: CategorieDeNom): readonly Remplacement[];
}
export type ConflitDeVocabulaire =
  | { readonly type: 'contredit-ucm'; readonly terme: Mots; readonly remplace: Mots; readonly termeUcm: Mots }
  | { readonly type: 'deja-remplace'; readonly remplace: Mots; readonly par: Mots }
  | { readonly type: 'cycle'; readonly termes: readonly Mots[] };

export type CleDeRegle = `ecriture:${CategorieDeNom}` | `terme:${string}` | `collection:${string}`;
export interface ChangementDeTerme { readonly avant: Mots; readonly apres: Mots; readonly origine: OrigineDuTerme }
export interface Renommage {
  readonly id: string; readonly categorie: CategorieDeNom; readonly portee: string;
  readonly ancienNom: string; readonly nouveauNom: string;
  /** Rangées par priorité : terme UCM, terme personnalisé, collection, écriture. */
  readonly regles: readonly CleDeRegle[];
  readonly termes: readonly ChangementDeTerme[];
}
export interface Collision { readonly categorie: CategorieDeNom; readonly portee: string; readonly nom: string; readonly ids: readonly string[] }
export interface ResultatDuLexique { readonly renommages: readonly Renommage[]; readonly collisions: readonly Collision[] }

/** `exemples` : des identifiants de noms, deux au plus. */
export interface TermeEnQuestion { readonly mot: string; readonly nombre: number; readonly exemples: readonly string[]; readonly ucm: boolean }
export type IndiceDePaire = 'terminaison' | 'pluriel' | 'abreviation' | 'synonymes' | 'meme-place';
export type Question =
  | { readonly type: 'paire'; readonly cle: string; readonly indice: IndiceDePaire; readonly termes: readonly [TermeEnQuestion, TermeEnQuestion]; readonly propose: 0 | 1; readonly score: number; readonly cibleAlias?: string }
  | { readonly type: 'ecriture-du-terme'; readonly cle: string; readonly indice: 'faute' | 'mots-colles'; readonly terme: TermeEnQuestion; readonly proposition: Mots; readonly reference?: { readonly mot: string; readonly nombre: number }; readonly score: number }
  | { readonly type: 'echelle'; readonly cle: string; readonly formes: readonly [readonly string[], readonly string[]]; readonly nombres: readonly [number, number]; readonly exemples: readonly [string | null, string | null]; readonly propose: 0 | 1; readonly score: number }
  | { readonly type: 'collection'; readonly cle: string; readonly collectionId: string; readonly nom: string; readonly nombre: number; readonly proposee?: Collection; readonly score: number };
export interface DejaJuge {
  readonly distincts: readonly (readonly [string, string])[];
  readonly plusTard: readonly string[];
  readonly voulus: readonly string[];
  readonly collectionsGardees: readonly string[];
}
export interface ResultatDesQuestions { readonly questions: readonly Question[]; readonly autres: readonly Question[] }
```

Les fonctions, écrites par K2a, K2b et K3. Une fonction `ParEtapes` cède
tous les deux cents noms ; la forme courte la mène à son terme.

```ts
// K2a, vocabulaire-du-fichier.ts
export function indexerVocabulaire(vocabulaire: VocabulaireDuFichier): { readonly index: IndexDuVocabulaire; readonly conflits: readonly ConflitDeVocabulaire[] };
// K2b, lexique.ts
export function commencerLexique(): PreparationDuLexique;
export function normaliserParEtapes(lexique: Lexique, conventions: ConventionsParCategorie, index: IndexDuVocabulaire,
  options?: { readonly nonRenommables?: readonly string[]; readonly portees?: readonly string[] }): Generator<void, ResultatDuLexique>;
export function normaliserLeLexique(...memes: Parameters<typeof normaliserParEtapes>): ResultatDuLexique;
export function porteesTouchees(lexique: Lexique, termes: readonly Mots[]): readonly string[];
// K3, questions.ts
export function detecterParEtapes(lexique: Lexique, index: IndexDuVocabulaire, dejaJuge: DejaJuge,
  options?: { readonly seuil?: number; readonly maximum?: number }): Generator<void, ResultatDesQuestions>;
export function detecterLesQuestions(...memes: Parameters<typeof detecterParEtapes>): ResultatDesQuestions;
// K1, normalisation.ts : placée ici pour éviter un cycle avec architecture.ts
export function collectionUcmReconnue(nom: string): Collection | undefined;
```

### Plugin : `packages/plugin-architect/src/messages.ts`

```ts
import type { Convention, OrigineDuTerme, IndiceDePaire, CategorieDeNom } from '@ucm-kit/core/referentiel';
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';

/** Un nom est coché si son groupe principal l'est et qu'il n'est pas exclu, ou s'il est inclus. */
export interface Selection { readonly groupes: readonly string[]; readonly exclus: readonly string[]; readonly inclus: readonly string[] }
export interface EcritureChoisie { readonly groupes: Convention; readonly variables: Convention }
export type Reponse =
  | { readonly type: 'garder'; readonly rang: 0 | 1 } | { readonly type: 'autre'; readonly terme: string }
  | { readonly type: 'distincts' } | { readonly type: 'plus-tard' }
  | { readonly type: 'corriger'; readonly mots: readonly string[] } | { readonly type: 'voulu' }
  | { readonly type: 'echelle'; readonly forme: 0 | 1 } | { readonly type: 'collection'; readonly cible: string | null };
export type GesteSurLesRegles =
  | { readonly type: 'ecriture'; readonly ecriture: EcritureChoisie }
  | { readonly type: 'remplacer-par'; readonly terme: string; readonly par: string }
  | { readonly type: 'remplace-termes'; readonly terme: string; readonly termes: readonly string[] }
  | { readonly type: 'retirer-remplace'; readonly terme: string; readonly remplace: string }
  | { readonly type: 'supprimer'; readonly terme: string }
  | { readonly type: 'ecart-ucm'; readonly terme: string; readonly actif: boolean }
  | { readonly type: 'retirer-distinct'; readonly termes: readonly [string, string] }
  | { readonly type: 'retirer-voulu'; readonly terme: string }
  | { readonly type: 'reprendre'; readonly question: string }
  | { readonly type: 'annuler-reponse'; readonly question: string };

export type DemandeArchitect =
  | { readonly type: 'analyser'; readonly demande: number }
  | { readonly type: 'lignes'; readonly demande: number; readonly generation: number; readonly groupe: string; readonly debut: number }
  | { readonly type: 'termes'; readonly demande: number; readonly generation: number; readonly recherche: string; readonly filtre: 'tous' | 'avec-regle' | 'sans-regle'; readonly debut: number }
  | { readonly type: 'fiche'; readonly demande: number; readonly generation: number; readonly terme: string }
  | { readonly type: 'simuler'; readonly demande: number; readonly generation: number; readonly geste: GesteSurLesRegles }
  | { readonly type: 'repondre'; readonly demande: number; readonly question: string; readonly reponse: Reponse }
  | { readonly type: 'regle'; readonly demande: number; readonly geste: GesteSurLesRegles }
  | { readonly type: 'appliquer'; readonly demande: number; readonly generation: number; readonly selection: Selection }
  | { readonly type: 'annuler-dernier'; readonly demande: number }
  | { readonly type: 'exporter'; readonly demande: number }
  | { readonly type: 'importer'; readonly demande: number; readonly texte: string }
  | { readonly type: 'configurer'; readonly demande: number; readonly collectionsExclues: readonly string[] };
export type UiMessage = DemandeArchitect | DemandeDeTaille;

/** Un chemin découpé autour du segment en cause. */
export interface LigneVue { readonly id: string; readonly avant: string; readonly terme: string; readonly apres: string; readonly aussi: readonly string[] }
export type RegleVue =
  | { readonly sorte: 'terme'; readonly origine: OrigineDuTerme }
  | { readonly sorte: 'ecriture'; readonly categorie: CategorieDeNom; readonly convention: Convention }
  | { readonly sorte: 'collection' };
export interface GroupeVue {
  readonly cle: string; readonly regle: RegleVue;
  readonly avant: string; readonly apres: string; readonly autres: number;
  readonly variables: number; readonly collections: number;
  readonly nouveau: boolean; readonly apercu: readonly LigneVue[];
}
export interface BloqueVue { readonly avant: string; readonly apres: string; readonly collection: string }
export interface TermeVue { readonly mot: string; readonly nombre: number; readonly exemples: readonly LigneVue[]; readonly ucm: boolean }
export type QuestionVue =
  | { readonly type: 'paire'; readonly cle: string; readonly indice: IndiceDePaire; readonly termes: readonly [TermeVue, TermeVue]; readonly propose: 0 | 1; readonly cibleCommune: string | null }
  | { readonly type: 'ecriture-du-terme'; readonly cle: string; readonly indice: 'faute' | 'mots-colles'; readonly terme: TermeVue; readonly proposition: readonly string[]; readonly reference: { readonly mot: string; readonly nombre: number } | null }
  | { readonly type: 'echelle'; readonly cle: string; readonly formes: readonly [readonly string[], readonly string[]]; readonly nombres: readonly [number, number]; readonly exemples: readonly [LigneVue | null, LigneVue | null]; readonly propose: 0 | 1 }
  | { readonly type: 'collection'; readonly cle: string; readonly nom: string; readonly nombre: number; readonly proposee: string | null };
export interface LigneDEcriture { readonly convention: Convention; readonly suivent: number; readonly total: number; readonly exemple: LigneVue | null }
export interface CollectionVue { readonly id: string; readonly nom: string; readonly nombre: number; readonly analysee: boolean; readonly palettes: boolean }
export interface Bilan {
  readonly generation: number;
  readonly premierLancement: boolean;
  readonly sansVariableLocale: boolean;
  readonly ecriture: { readonly groupes: LigneDEcriture; readonly variables: LigneDEcriture; readonly collections: { readonly reconnues: number; readonly total: number } };
  readonly groupes: readonly GroupeVue[];
  readonly bloques: readonly BloqueVue[];
  readonly proteges: number;
  readonly questions: readonly QuestionVue[];
  readonly autresPistes: number;
  readonly plusTard: readonly QuestionVue[];
  readonly collections: readonly CollectionVue[];
  readonly dernierRenommage: { readonly nombre: number; readonly heure: string } | null;
}
/** Le filtre `avec-regle` montre `regle` et `ecart` ; `sans-regle` montre `sans-regle` et `a-trancher`. */
export interface TermeDeListe { readonly mot: string; readonly origine: OrigineDuTerme | null; readonly statut: 'regle' | 'ecart' | 'a-trancher' | 'sans-regle'; readonly remplace: readonly string[]; readonly avec: string | null; readonly nombre: number }
export interface FicheVue {
  readonly mot: string; readonly origine: OrigineDuTerme | null; readonly categorieUcm: string | null; readonly definition: string | null;
  readonly remplace: readonly { readonly mot: string; readonly nombre: number; readonly ucm: boolean }[];
  readonly emploi: { readonly nombre: number; readonly exemples: readonly LigneVue[] };
  readonly ecart: boolean; readonly voulu: boolean; readonly distincts: readonly string[]; readonly question: string | null;
}
export type EffetVue =
  | { readonly sorte: 'terme'; readonly avant: string; readonly apres: string; readonly nombre: number; readonly exemple: LigneVue | null }
  | { readonly sorte: 'ecriture'; readonly groupes: LigneDEcriture; readonly variables: LigneDEcriture; readonly renommages: number; readonly exemple: { readonly avant: string; readonly apres: string } | null };
export type ConflitVue =
  | { readonly type: 'contredit-ucm'; readonly terme: string; readonly remplace: string; readonly termeUcm: string }
  | { readonly type: 'deja-remplace'; readonly remplace: string; readonly par: string }
  | { readonly type: 'cycle'; readonly termes: readonly string[] };
export interface ResultatVue { readonly sorte: 'application' | 'annulation'; readonly statut: 'applique' | 'partiel' | 'refuse'; readonly renommes: number; readonly sautes: number; readonly annulable: boolean }
export type CodeDErreur = 'analyse-en-cours' | 'fichier-modifie' | 'generation-perimee' | 'regles-modifiees' | 'import-illisible' | 'echec';

export type PluginMessage =
  | { readonly type: 'initial'; readonly dejaAnalyse: boolean }
  | { readonly type: 'lecture'; readonly demande: number; readonly lues: number; readonly total: number }
  | { readonly type: 'bilan'; readonly demande: number; readonly bilan: Bilan }
  | { readonly type: 'lignes'; readonly demande: number; readonly generation: number; readonly groupe: string; readonly debut: number; readonly lignes: readonly LigneVue[]; readonly total: number }
  | { readonly type: 'termes'; readonly demande: number; readonly generation: number; readonly debut: number; readonly termes: readonly TermeDeListe[]; readonly total: number; readonly comptes: { readonly tous: number; readonly avecRegle: number; readonly sansRegle: number } }
  | { readonly type: 'fiche'; readonly demande: number; readonly generation: number; readonly fiche: FicheVue }
  | { readonly type: 'simulation'; readonly demande: number; readonly generation: number; readonly effet: EffetVue | null; readonly conflit: ConflitVue | null }
  | { readonly type: 'refus'; readonly demande: number; readonly conflits: readonly ConflitVue[] }
  | { readonly type: 'application'; readonly demande: number; readonly resultat: ResultatVue }
  | { readonly type: 'regles-exportees'; readonly demande: number; readonly texte: string }
  | { readonly type: 'erreur'; readonly demande: number; readonly code: CodeDErreur };
```

### Règles du protocole

- Les demandes de calcul (`analyser`, `regle`, `repondre`, `configurer`,
  `importer`, `appliquer`, `annuler-dernier`) passent une à une. Entre deux
  calculs de même sorte, seule la dernière intention est calculée ; une
  nouvelle demande abandonne le calcul en cours à la tranche suivante.
- Les lectures (`lignes`, `termes`, `fiche`, `simuler`) répondent sur la
  génération courante et n'abandonnent aucun calcul ; une lecture d'une
  génération périmée reçoit `erreur` `generation-perimee`.
- `repondre` et `regle` portent sur des clés stables, quelle que soit la
  génération. `appliquer` exige la génération courante et des règles
  inchangées depuis son calcul, sinon `generation-perimee` ou
  `regles-modifiees`.
- Une `application`, une `annulation` réussie, un geste, une réponse, un import
  et une configuration sont suivis d'un `bilan` neuf. Un import ou un geste en
  conflit répond `refus`, sans rien écrire.
- Une page de `lignes` ou de `termes` porte cinquante entrées.
- Un renommage appartient au groupe de sa première règle ; il apparaît dans
  les autres groupes par `aussi`, sans être compté deux fois.
- `bilan.groupes` suit l'ordre de priorité des règles : terme UCM, terme
  personnalisé, collection, écriture.
- `GroupeVue.variables` et `GroupeVue.collections` comptent les seuls noms
  renommés : un groupe de collection a zéro variable. `autres` vaut le total
  du groupe moins son aperçu.

## Lots

Commandes de référence, depuis la racine :

```sh
npm run build --workspace @ucm-kit/core
npm run typecheck --workspace @ucm-kit/core
npx tsx --test packages/kit/tests/<fichier>.test.ts
npm run typecheck --workspace ucm-architect-plugin
npx tsx --test packages/plugin-architect/tests/<fichier>.test.ts
npm run build:ui --workspace ucm-architect-plugin
npm run galerie --workspace ucm-architect-plugin
npm test --workspace ucm-plugin-socle
```

### L0 · Contrats et squelette compilable

**Agent :** `implementeur`, relu par la principale. **Effort :** moyen.

- [x] (cfe90bf) `packages/kit/src/referentiel/harmonisation.ts`, types seuls, exporté par
  `referentiel/index.ts`
- [x] (6e48bbf) `packages/plugin-architect/src/messages.ts` : les types et
  `estUiMessage`, qui refuse une demande hors contrat (rang, `debut` négatif,
  filtre inconnu, doublons d'une sélection, texte d'import de plus d'un
  million de caractères) ; `tests/messages.test.ts`, une demande valide et un
  refus par type
- [x] (6e48bbf) Supprimer `routage.ts`, `analyse.ts`, `ui/presentation.ts`,
  `ui/vues.ts`, `ui/frontiere.ts`, les tests `presentation`, `frontiere` ; ne
  garder de `ui/telechargement.ts` que `telecharger`
- [x] (6e48bbf) `ecriture.ts` remplace l'import d'`Analyse` par une interface locale de
  même forme, pour compiler jusqu'à P3
- [x] (6e48bbf) `code.ts` : la fenêtre, la poignée et le message `initial` ;
  `ui/index.ts` : un écran vide monté par le socle
- [x] (6e48bbf) `galerie/donnees.cjs` et `galerie/etats.cjs` : un état minimal par type de
  `PluginMessage`, avec des données factices conformes aux contrats
- [x] (6e48bbf) Fin : `npm run build --workspace @ucm-kit/core`, typecheck du kit et
  d'Architect, `npm test --workspace ucm-architect-plugin` verts

### K0 · Types du moteur

- [x] (cfe90bf) Types seuls du contrat dans `harmonisation.ts`, en-tête du référentiel,
  imports de types en `.js` et export depuis `referentiel/index.ts` (cfe90bf)

### K1 · Données du référentiel

**Agent :** `implementeur`. **Exécutant :** Codex. **Effort :** petit.

- [x] (07836c0) `SYNONYMES_COURANTS`, dans `vocabulaire.ts` : des groupes de termes, le
  terme UCM en tête. `danger` avec `error`, `negative`, `critical` ; `warning`
  avec `attention`, `notice` ; `success` avec `positive` ; `info` avec
  `information`, `informative` ; `pressed` avec `active`, `down` ;
  `foreground` avec `fg`, `content` ; `background` avec `bg` ; `border` avec
  `stroke` ; `radius` avec `corner`, `border-radius`
- [x] (07836c0) `ABREVIATIONS` : `bg` → `background`, `fg` → `foreground`, `btn` →
  `button`, `txt` → `text`, `img` → `image`
- [x] (07836c0) `ECHELLES_DE_TAILLES` : `sm`/`small`, `md`/`medium`, `lg`/`large` ; un
  test vérifie que chaque forme appartient à `SIZE_VALUES`
- [x] (07836c0) `collectionUcmReconnue(nom)`, dans `normalisation.ts` : le nom découpé,
  en minuscules, joint par des tirets, comparé à `COLLECTIONS`
- [x] (07836c0) Dans `produits.ts` : `CLES_PARTAGEES_DE_PALETTES` (`variables`,
  `palette`, `cle`), déplacées depuis `plugin-palettes/src/variables/suivi.ts`
  qui les importe ; `ESPACE_ARCHITECT = 'ucm_architect'` ; la donnée
  `regles-de-nommage` ; la définition d'`architect` : il lit et écrit les noms
  des collections et des variables, et range ses règles
- [x] (07836c0) Fin : tests du kit et de Palettes, `tests/referentielUnique.test.ts`,
  vue illustrée régénérée (`generer-donnees-referentiel.ts`)

### K2a · Vocabulaire du fichier

**Agent :** `implementeur`. **Exécutant :** Codex. **Effort :** moyen.
**Fichiers :** `packages/kit/src/referentiel/vocabulaire-du-fichier.ts`, son
test, `referentiel/index.ts`.

- [x] (0fa038d) `indexerVocabulaire()` : une `Map` des suites de mots à remplacer, termes
  UCM des registres sauf `ecartsUcm`, puis termes personnalisés ;
  `remplacements()` apparie les suites de mots, la plus longue d'abord, sans
  chevauchement, en respectant la restriction par catégorie de la v1
  (`REGISTRE_AXES_ETAT` réservé aux propriétés)
- [x] (0fa038d) Conflits : un terme personnalisé qui remplace un terme gardé par UCM
  (`contredit-ucm`), une forme remplacée par deux termes (`deja-remplace`), un
  cycle
- [x] (0fa038d) Fin : son test, typecheck du kit

### K2b · Lexique et normalisation par étapes

**Agent :** `implementeur-exigeant`. **Exécutant :** Codex. **Effort :** élevé.
**Fichiers :** `packages/kit/src/referentiel/lexique.ts`, un module interne
non exporté pour les fonctions d'écriture des mots partagées avec
`normalisation.ts`, leurs tests, `referentiel/index.ts`.

- [x] (ea60fef) `commencerLexique()` : découpe chaque texte de segment une fois, indexe
  les occurrences et les portées, calcule `detection` dans `terminer()`, par
  étapes
- [x] (ea60fef) `normaliserParEtapes()` : réutilise les découpes et l'index ; chaque
  renommage porte ses règles rangées par priorité ; une collection n'est
  renommée que si `collectionUcmReconnue` la reconnaît sous une autre écriture ;
  `portees` limite le calcul aux portées touchées, avec tous leurs occupants
- [x] (ea60fef) `porteesTouchees()` : les portées où apparaît l'un des termes
- [x] (ea60fef) `normaliserLesNoms` et `detecterLesConventions` gardent leur signature et
  leurs résultats ; `normalisation.ts` n'importe pas `lexique.ts`
- [x] (ea60fef) Test d'équivalence : sur les noms de `donnees-vue-illustree.js` et sur un
  jeu généré de 8 000 noms avec collisions en cascade, sans terme
  personnalisé, mêmes renommages et mêmes collisions que `normaliserLesNoms`
  avec les termes UCM
- [x] (ea60fef) Test : un recalcul d'écriture ne refait pas la détection ; un recalcul
  par portée rend, sur ces portées, le résultat du calcul global
- [x] (ea60fef) Fin : tests du référentiel, typecheck du kit ; 32 000 noms préparés et
  normalisés en moins d'une seconde sous Node, aucune étape de plus de deux
  cents noms

### K3 · Détecteurs de questions

**Agent :** `implementeur-exigeant`. **Exécutant :** Codex. **Effort :** élevé.
**Fichiers :** `packages/kit/src/referentiel/questions.ts`, son test,
`referentiel/index.ts`.

- [x] (9d36840, 850e1c0) Les détecteurs portent sur les mots qu'aucune règle ne couvre, à la même
  place seulement : même collection, même profondeur, et même segment avant ou
  même segment après
- [x] (9d36840, 850e1c0) Terminaison (`-ed`, `-d`, `-ing`), pluriel (`-s`, `-es`), abréviation,
  synonymes, même place (deux mots jamais voisins dont une variable de chaque
  côté vise la même cible d'alias), faute (une lettre d'écart par un index des
  suppressions, l'un employé au plus deux fois, l'autre au moins cinq fois),
  mots collés (un mot sans séparateur qui se découpe en mots du lexique),
  échelle, collection hors de `COLLECTIONS` et non reconnue
- [x] (9d36840, 850e1c0) Le terme proposé est le terme UCM, sinon le plus employé ; une paire dont
  un mot est déjà remplacé par une règle n'est pas une question
- [x] (9d36840, 850e1c0) Clé stable : type, puis mots triés ; `dejaJuge` retire ce qui est déjà
  jugé
- [x] (9d36840, 850e1c0) Score : nombre de noms touchés, majoré quand deux indices concordent ;
  sous `seuil`, la question va dans `autres` ; dix questions au plus par
  défaut
- [x] (9d36840, 850e1c0) Fin : un jeu écrit à la main par détecteur, un jeu sans question ; 32 000
  noms en moins d'une seconde sous Node

### K4 · Mesures

**Agent :** `implementeur`. **Exécutant :** Codex. **Effort :** moyen.
**Fichiers :** `docs/notes/Recherches/Plugin Architect/Mesures/`.

- [x] (0910d0f) `mesurer-performances.ts` n'importe que le kit : préparation, détection,
  normalisation initiale, recalcul d'écriture, recalcul après une règle de
  terme, sur 800, 8 000 et 32 000 noms ; résultats dans
  `resultats-performances.json`
- [x] (0910d0f) `mesurer-questions.ts` : les questions sur C1
  (`UCM-Playground/src/tokens/tokens.json`) et sur C2
  (`1 Architecture globale/Mesures/tokens-slice-exemple.json`), nombre par
  détecteur et vingt premières, avec leur score ; les résultats de C2 restent
  hors du dépôt
- [x] (0910d0f) Une section « Mesures de la refonte » dans
  `OPTIMISATION-LECTURE-ET-AFFICHAGE.md`, avec les chiffres de C1 seulement

### S1 · Feuille et onglets renommables du socle

**Agent :** `implementeur`. **Exécutant :** Codex. **Effort :** moyen.
**Fichiers :** `packages/plugin-socle/src/ui/Feuille.ts`, `Onglets.ts`,
`socle.css`, `packages/plugin-socle/tests/feuille.test.ts`, `onglets.test.ts`.

- [x] (265f0ab) `createFeuille({ titre, retour?, corps, pied, onFermer })` : un voile
  sombre sur la fenêtre, une feuille qui monte du bas, une poignée, un en-tête
  (‹ facultatif, titre, ✕), un corps qui défile, un pied ; Échap, ✕ et un clic
  sur le voile ferment ; le focus reste dans la feuille et revient à
  l'élément qui l'a ouverte ; `remplacer({ titre, retour, corps, pied })`
  passe à l'étape suivante
- [x] (265f0ab) `OngletsUi.nommer(id, libelle)` : le libellé d'un onglet change sans
  recréer la liste
- [x] (265f0ab) Classes et rôles dans `socle.css` ; la loi des styles reste verte
- [x] (265f0ab) Fin : `npm test --workspace ucm-plugin-socle`

### P1 · Lecture des variables seules

**Agent :** `implementeur`. **Effort :** moyen.
**Fichiers :** `src/lecture.ts`, `src/lectureFigma.ts`, `tests/lecture.test.ts`.

- [x] (702faea) Le port lit collections et variables par `Promise.all`, sans aucune
  page ; une `Map` des collections ; toutes les collections locales sont lues,
  l'exclusion se fait dans la session
- [x] (702faea) Chaque variable porte l'identifiant visé par l'alias de son premier mode
  et sa protection : la donnée partagée `palette` de l'espace de Palettes
  (`ESPACE_PARTAGE`, `CLES_PARTAGEES_DE_PALETTES`) n'est pas vide ; ces
  lectures se font par lots de cinq cents, avec une pause entre deux
- [x] (702faea) L'inventaire rend des `NomLu` ; `relireInventaireAvantEcriture` relit
  les seules variables et collections
- [x] (702faea) Fin : `tests/lecture.test.ts` réécrit (variables distantes ignorées,
  protection, alias), typecheck d'Architect

### P2 · Règles du fichier, journal et port de stockage

**Agent :** `implementeur`. **Effort :** moyen.
**Fichiers :** `src/regles.ts` (nouveau, pur), `src/conventions.ts`,
`src/ecriture.ts` (port de stockage seulement), `tests/regles.test.ts`.

- [x] (43a7d1c) Le modèle pur : écriture des groupes et des noms, termes personnalisés,
  écarts UCM, paires distinctes, termes voulus, questions mises de côté,
  collections gardées, collections exclues, réponses, groupes déjà vus, journal
- [x] (43a7d1c) Une entrée de données partagées par règle, dans `ESPACE_ARCHITECT` :
  `ecriture`, `terme:<mots>`, `ecart:<id>`, `distinct:<a>|<b>`, `voulu:<mots>`,
  `plus-tard:<cle>`, `collection:<id>`, `exclues`, `reponse:<cle>`, `vus`,
  `journal:<n>` ; chaque entrée porte `version: 1` ; une entrée illisible se
  lit comme absente et n'est jamais réécrite par une lecture
- [x] (43a7d1c) `reponse:<cle>` garde les entrées qu'une réponse a créées ou changées,
  avec leur valeur d'avant : « Annuler » la défait exactement
- [x] (43a7d1c) Le journal se découpe en entrées de 90 000 caractères au plus ; un test
  range 8 000 renommages
- [x] (43a7d1c) Reprise de la v1 : `lireChoix` et la clé `conventions` fournissent
  l'écriture quand `ecriture` manque ; tester l'absence et la donnée corrompue
- [x] (43a7d1c) Export et import : un JSON versionné de toutes les règles ; l'import
  valide tout avant d'écrire et rend les conflits de `indexerVocabulaire`
- [x] (43a7d1c) Le port de stockage (lire les clés, lire, écrire, effacer) vit dans
  `ecriture.ts`, seul fichier autorisé à appeler `setSharedPluginData` ;
  aucune écriture de règle n'appelle `commitUndo`
- [x] (43a7d1c) Fin : `tests/regles.test.ts`, `tests/loiDEcriture.test.ts`, typecheck

### P3 · Écriture des variables et des collections

**Agent :** `implementeur-exigeant`. **Effort :** moyen.
**Fichiers :** `src/ecriture.ts`, `tests/ecriture.test.ts`,
`tests/loiDEcriture.test.ts`.

- [x] (702faea) Retirer tout ce qui touche les composants, les propriétés et les valeurs
- [x] (702faea) Garder la relecture de chaque nom avant l'écriture, le contrôle des
  doublons sur le document relu, portée par portée, sans nouvelle
  normalisation : le nom final de chaque objet y reste unique ; un seul
  `commitUndo` pour le lot
- [x] (702faea) Refuser toute variable protégée, même cochée
- [x] (702faea) Ordonner les écritures : une chaîne (`a` devient `b`, `b` devient `c`)
  commence par la fin ; un cycle passe par des noms provisoires uniques
- [x] (702faea) Écrire le journal du lot ; « Annuler le dernier renommage » remet
  l'ancien nom à chaque objet dont le nom actuel est encore le nouveau, et
  saute les autres
- [x] (702faea) La loi d'écriture : seuls `name` d'une variable ou d'une collection
  locale et les données partagées d'`ESPACE_ARCHITECT` ; ni
  `editComponentProperty`, ni `loadAsync`, ni `loadAllPagesAsync`
- [x] (702faea) Fin : tests `ecriture` (chaîne, cycle, protection, journal, annulation
  partielle) et `loiDEcriture`, typecheck

### P5 · Projection vers l'écran

**Agent :** `implementeur-exigeant`. **Effort :** élevé.
**Fichiers :** `src/projection.ts` (nouveau, pur), `tests/projection.test.ts`.

- [x] (1b243d3) Du `ResultatDuLexique`, des questions et des règles vers `Bilan`,
  `GroupeVue` (groupe principal, `aussi`, `nouveau` d'après les groupes déjà
  vus), `LigneVue` (chemin découpé autour du segment en cause), `QuestionVue`,
  `TermeDeListe`, `FicheVue`, `EffetVue`, `ConflitVue`
- [x] (1b243d3) La résolution d'une `Selection` en identifiants : groupe principal coché
  sans exclusion, plus les inclus
- [x] (1b243d3) Pages de cinquante pour `lignes` et `termes`, recherche et filtres
- [x] (1b243d3) Fin : `tests/projection.test.ts`, typecheck

### P4 · Session de calcul et protocole

**Agent :** `implementeur-exigeant`. **Effort :** élevé.
**Fichiers :** `src/session.ts` (nouveau), `src/tranches.ts` (nouveau),
`src/code.ts`, `tests/session.test.ts`, `tests/protocole.test.ts`.

- [x] (f66fa59) Le sandbox garde l'inventaire, le lexique, le vocabulaire indexé, le
  résultat et les règles ; il ne transmet que le `Bilan` et les pages demandées
- [x] (f66fa59) `tranches.ts` : mène un générateur du kit par tranches de huit
  millisecondes, avec une pause entre deux, et l'abandonne quand une demande
  plus récente arrive
- [x] (f66fa59) Les règles du protocole de ce plan : file des calculs, lectures sur la
  génération courante, dernière intention, codes d'erreur
- [x] (f66fa59) Un geste écrit sa règle par le port, recalcule les portées touchées
  (`porteesTouchees`), fusionne le résultat ; `configurer` refait le lexique
  depuis l'inventaire en mémoire, sans relire Figma
- [x] (f66fa59) `appliquer` relit les règles et refuse si elles ont changé ; après
  l'écriture, la session relit Figma et envoie un `bilan`
- [x] (f66fa59) `tests/protocole.test.ts` : la session avec un port factice, de
  `analyser` à `application`, réponses périmées ignorées, conflit refusé,
  recalcul sans lecture de Figma ni nouvelle détection
- [x] (f66fa59) Fin : ces tests, typecheck, `npm run build --workspace ucm-architect-plugin`

### U1a · Coquille

**Agent :** `implementeur-exigeant`. **Effort :** moyen.
**Fichiers :** `src/ui/index.ts`, `src/ui/frontiere.ts` (nouveau),
`src/ui/textes.ts`, `src/ui/styles.css`, `src/ui/etat.ts` (nouveau, pur),
`tests/frontiereUi.test.ts`.
**Référence :** maquettes, plan de navigation et planche des états.

- [x] (fa54057) En-tête du socle : « UCM Architect », bouton Configuration avec texte
  (`createSettingsButton`, comme Palettes), `Retour` dans la Configuration
- [x] (fa54057) Onglets du socle : À appliquer, À trancher, Règles ; les comptes des deux
  premiers
- [x] (fa54057) La frontière : numérotation, génération courante, réponses périmées
  ignorées
- [x] (fa54057) États : analyse en cours, rien à faire, aucune variable à harmoniser
  ici, fichier modifié
- [x] (fa54057) Rôles de couleur en tête de `styles.css` : surlignage du terme en cause
  sur `--fond-avertissement` et `--texte-avertissement`, pastille UCM,
  pastille Personnalisé
- [x] (fa54057) Fin : `tests/frontiereUi.test.ts`, typecheck, `build:ui`,
  `npm test --workspace ucm-architect-plugin`

### U1b · Premier lancement, écriture, Configuration

**Agent :** `implementeur`. **Effort :** moyen.
**Fichiers :** `src/ui/premierLancement.ts`, `src/ui/ecriture.ts`,
`src/ui/configuration.ts` (nouveaux), `textes.ts`.
**Référence :** écrans 1, 2 et 14.

- [x] (7d76bf2) Premier lancement, avancement, carte de l'écriture (groupes, noms,
  collections), Continuer
- [x] (7d76bf2) Configuration : collections analysées, export (`telecharger`) et import
  des règles, dernier renommage avec Annuler
- [x] (7d76bf2) Fin : typecheck, `build:ui`, galerie construite

### U2 · Onglet À appliquer

**Agent :** `implementeur-exigeant`. **Effort :** élevé.
**Fichiers :** `src/ui/aAppliquer.ts`, `src/ui/selection.ts` (pur),
`tests/selection.test.ts`. **Référence :** écrans 3, 6, 7.

- [x] (7d76bf2) Intertitres Termes, Écriture, Collections ; une carte par `GroupeVue` :
  case, avant → après, détail tiré de `RegleVue`, pastille, chevron
- [x] (7d76bf2) Dépliée : l'aperçu, puis « N autres » qui demande une page de
  cinquante lignes
- [x] (7d76bf2) `selection.ts` : groupes cochés, exclus, inclus ; compte sans parcourir le
  DOM ; case partielle ; à chaque `bilan`, les clés disparues sortent et les
  exclus orphelins sont oubliés
- [x] (7d76bf2) Bloqués et protégés dans une carte repliée en bas ; Appliquer ouvre la
  feuille de confirmation ; le résultat devient la ligne « N noms renommés »
  avec Annuler
- [x] (7d76bf2) Fin : `tests/selection.test.ts`, typecheck, `build:ui`

### U3 · Onglet À trancher

**Agent :** `implementeur-exigeant`. **Effort :** élevé.
**Fichiers :** `src/ui/aTrancher.ts`. **Référence :** écrans 4, 5.

- [x] (7d76bf2) Carte face à face pour une paire et une échelle, carte avant → après pour
  une écriture du terme, carte de collection, carte de conflit
- [x] (7d76bf2) Colonne proposée bordée de bleu, Garder dans chaque colonne, actions
  secondaires à gauche, Plus tard à droite ; Autre terme… ouvre un champ dans
  la carte
- [x] (7d76bf2) Une réponse réduit la carte à une ligne avec Annuler ; la section Plus
  tard repliée, avec Reprendre
- [x] (7d76bf2) Fin : typecheck, `build:ui`

### U4a · Onglet Règles : liste des termes

**Agent :** `implementeur`. **Effort :** moyen.
**Fichiers :** `src/ui/regles.ts`. **Référence :** écran 8.

- [x] (7d76bf2) Résumé de l'écriture avec Modifier ; recherche, filtres, liste par pages
  de cinquante, Afficher plus
- [x] (7d76bf2) Fin : typecheck, `build:ui`

### U4b · Feuilles de l'écriture et des termes

**Agent :** `implementeur-exigeant`. **Effort :** élevé.
**Fichiers :** `src/ui/feuilles.ts`. **Référence :** écrans 9 à 13.

- [x] (7d46a89) Feuille du socle pour l'écriture (effet simulé avant Enregistrer), le
  terme UCM, le terme personnalisé, le terme sans règle, et Remplacer par…
  comme étape suivante de la même feuille
- [x] (7d46a89) Une fiche montre aussi les paires distinctes et le terme voulu, avec
  Retirer
- [x] (7d46a89) Proposer à UCM copie le terme, sa définition et ses termes remplacés au
  format d'un `Terme` du référentiel
- [x] (7d46a89) Fin : typecheck, `build:ui`

### U5 · Galerie des états

**Agent :** `implementeur`. **Effort :** moyen.
**Fichiers :** `galerie/etats.cjs`, `galerie/donnees.cjs`,
`galerie/build-galerie.cjs`.

- [x] (0721a21) Un état par écran des maquettes, feuilles comprises, et par type de
  `PluginMessage`, à la taille par défaut et à la taille minimale si le banc
  du socle le permet
- [x] (0721a21) Aucune capture Chromium : le mainteneur ouvre la galerie
- [x] (0721a21) Fin : `npm run galerie --workspace ucm-architect-plugin`,
  `tests/socle.test.ts`

### Q1 · Seuil des questions

**Agent :** principale, avec le mainteneur. **Effort :** petit.

- [ ] Le mainteneur juge les vingt premières questions de C1 et de C2 que K4
  relève ; la principale fixe `seuil` et le nombre maximal dans la session

### F1 · Documents

**Agent :** principale. **Effort :** petit.

- [x] (45e59b4) `AGENTS.md` : l'entrée de `packages/plugin-architect/` dans la carte du
  code, et un domaine d'invariants « UCM Architect » ; ajouter ce domaine à
  `DOMAINES` de `tests/inventaireInvariants.test.ts`
- [x] (45e59b4) `README.md` racine : la ligne d'Architect parle des variables
- [x] (29fd819) La conception renvoie aux écarts constatés pendant l'implémentation

### F2 · Vérification d'ensemble

**Agent :** `verificateur`. **Effort :** petit.

- [x] (29c54ea) `npm test` à la racine, typecheck et build du kit, d'Architect et de
  Palettes, `controle-style` ; sans `test:ui` ; seul
  `versionSuitLeContenu` peut être rouge

### F3 · Versions, publication, poussée

**Agent :** `executant`, puis principale. **Effort :** petit.

- [x] (b41e85f) Monter la version mineure de `@ucm-kit/core`, les pins du CLI et de
  l'adaptateur et leurs versions, les pins de la documentation ; tests verts,
  `versionSuitLeContenu` compris
- [x] (b7674ff) Commiter, pousser la série, puis publier par `gh workflow run
  publish.yml`, le noyau d'abord ; la principale lance et suit les exécutions

### F4 · Recette dans Figma

**Agent :** mainteneur.

- [ ] Sur une copie du fichier des tokens : premier lancement, écriture,
  application, annulation par Ctrl+Z et par la Configuration, protection des
  palettes, réponse et son annulation, règle refusée, export et import
- [ ] Vérifier qu'une écriture de règle n'ajoute pas de pas d'annulation, et
  qu'un lot de 8 000 renommages s'annule en une fois
- [ ] Mesurer le changement d'écriture sur le fichier réel
- [ ] Vérifier qu'un fichier qui utilise la bibliothèque reçoit les nouveaux
  noms après publication

## Revue du plan

Un agent a relu la première version de ce plan. Ce qu'elle a changé :

| Constat | Correction |
|---|---|
| Le plugin ne compilait plus entre L0 et P4 | L0 livre un squelette compilable et supprime les modules de la v1 ; chaque lot a ses commandes de fin |
| Le kit changeait sans nouveau numéro | Rien n'est poussé avant F3, qui monte toutes les versions |
| Un terme n'était qu'un mot | Un terme est une suite de mots ; réponses, collections et annulation de réponse ont leurs entrées |
| La projection vers l'écran n'avait pas de lot | Lot P5 ; sélection avec `inclus` ; groupe principal d'un renommage |
| Les calculs du kit ne se découpaient pas | Fonctions par étapes, portées du lexique, `porteesTouchees` |
| Le protocole laissait des cas ouverts | Règles du protocole, codes d'erreur, `refus`, `bilan` après chaque geste |
| Le sandbox fabriquait des textes | Données et codes seulement ; textes dans `textes.ts` |
| Un cycle d'import entre `architecture.ts` et `normalisation.ts` | `collectionUcmReconnue` dans `normalisation.ts` |
| `setSharedPluginData` hors d'`ecriture.ts` | Le port de stockage vit dans `ecriture.ts` |
| Un journal de 8 000 renommages dépasserait une entrée | Journal découpé en entrées de 90 000 caractères |
| Lots trop gros | U1, U4 et K2 scindés ; P5 séparé de P4 |
| Écritures en chaîne et en cycle | Ordre des écritures et noms provisoires dans P3 |
| Seuil des questions sans porte | Lot Q1 avec le mainteneur |
| Onglets à libellé changeant | `OngletsUi.nommer` dans S1 |
