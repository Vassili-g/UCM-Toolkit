/**
 * Contrat des messages entre l'écran et le sandbox : les demandes de l'écran, les réponses numérotées du sandbox et le contrôle de forme des demandes.
 * Le `type` `noms-analyser`, `noms-repondre` et `noms-selection` porte le préfixe `noms-` : l'analyse d'un composant, les questions et la sélection
 * d'Architect gardent les noms sans préfixe, et la table de `code.ts` route chaque `type` vers un seul domaine.
 */
import type { ArchitectureDuFichier, Convention, OrigineDuTerme, IndiceDePaire, CategorieDeNom, NatureDeSegment } from '@ucm-kit/core/referentiel';
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';
import type { EcritureChoisie } from '@ucm-kit/core/protocoles';
import type { CauseDeProtection, MotifDeChemin } from '@ucm-kit/core/nommage';
import { estConventions } from '../nomenclature/conventions';

export type { CauseDeProtection, EcritureChoisie, MotifDeChemin };

/** Un nom est coché si son groupe principal l'est et qu'il n'est pas exclu, ou s'il est inclus. */
export interface Selection { readonly groupes: readonly string[]; readonly exclus: readonly string[]; readonly inclus: readonly string[] }
export type Reponse =
  | { readonly type: 'garder'; readonly rang: 0 | 1 } | { readonly type: 'autre'; readonly terme: string }
  | { readonly type: 'distincts' } | { readonly type: 'plus-tard' }
  | { readonly type: 'corriger'; readonly mots: readonly string[] } | { readonly type: 'voulu' }
  | { readonly type: 'collection'; readonly cible: string | null };
export type GesteSurLesRegles =
  | { readonly type: 'architecture'; readonly ucm: boolean }
  | { readonly type: 'ecriture'; readonly ecriture: EcritureChoisie }
  | { readonly type: 'remplacer-par'; readonly terme: string; readonly par: string }
  | { readonly type: 'remplace-termes'; readonly terme: string; readonly termes: readonly string[] }
  | { readonly type: 'retirer-remplace'; readonly terme: string; readonly remplace: string }
  | { readonly type: 'supprimer'; readonly terme: string }
  | { readonly type: 'ecart-ucm'; readonly terme: string; readonly actif: boolean }
  | { readonly type: 'terme-ordinaire'; readonly terme: string; readonly actif: boolean }
  | { readonly type: 'retirer-distinct'; readonly termes: readonly [string, string] }
  | { readonly type: 'retirer-voulu'; readonly terme: string }
  | { readonly type: 'reprendre'; readonly question: string }
  | { readonly type: 'annuler-reponse'; readonly question: string }
  | { readonly type: 'annuler-import' };

/**
 * Le type d'un terme de la liste du vocabulaire, qui fixe sa section. La nature d'un nom passe avant la règle : `composant` et `palette` ;
 * puis `a-trancher` ; un terme réglé est `remplace` quand le fichier emploie au moins une de ses variantes, sinon `conforme` ;
 * `sans-regle` couvre aussi une règle UCM écartée (son statut reste `ecart`).
 */
export type TypeDeTerme = 'a-trancher' | 'remplace' | 'conforme' | 'sans-regle' | 'composant' | 'palette';
/** Les types dans l'ordre des sections. */
export const TYPES_DE_TERMES: readonly TypeDeTerme[] = ['a-trancher', 'remplace', 'conforme', 'sans-regle', 'composant', 'palette'];
/** Qui a posé la règle d'un terme : le référentiel UCM ou le fichier. */
export type OrigineDeFiltre = 'ucm' | 'personnalise';
export const ORIGINES_DE_FILTRE: readonly OrigineDeFiltre[] = ['ucm', 'personnalise'];
/** La place où une ligne de la liste emploie son terme : le nom d'un groupe ou le dernier segment d'un nom de variable. */
export type PlaceDuTerme = 'groupes' | 'variables';
/** Les places dans l'ordre de la liste : les groupes d'abord. */
export const PLACES_DE_TERMES: readonly PlaceDuTerme[] = ['groupes', 'variables'];
export type TriDeTermes = 'alpha' | 'nombre';
export const TRIS_DE_TERMES: readonly TriDeTermes[] = ['alpha', 'nombre'];
/**
 * Ce que l'écran demande à la liste. `types`, `origines` et `places` vides ne filtrent rien ; `origines` ne retient que parmi `remplace` et `conforme`.
 * Sans `section`, la réponse donne les premières lignes de chaque section ; avec `section`, une page de cette seule section, à partir de `debut`.
 * `place` n'a d'effet qu'avec `section` et le tri `alpha` : la page ne lit alors que les lignes de cette place. Sinon il vaut `null`.
 */
export interface RequeteDeTermes {
  readonly recherche: string; readonly types: readonly TypeDeTerme[]; readonly origines: readonly OrigineDeFiltre[]; readonly places: readonly PlaceDuTerme[];
  readonly tri: TriDeTermes; readonly section: TypeDeTerme | null; readonly place: PlaceDuTerme | null; readonly debut: number;
}
/**
 * Le total d'une section, après recherche et filtres, et ses lignes : les premières, ou la page demandée. `totaux` donne le total de chaque
 * place et `total` en est la somme. En tri `alpha`, les lignes des groupes précèdent celles des variables.
 */
export interface SectionDeTermes {
  readonly type: TypeDeTerme; readonly total: number; readonly totaux: Readonly<Record<PlaceDuTerme, number>>; readonly termes: readonly TermeDeListe[];
}
/** Le nombre de lignes de chaque type, de chaque origine et de chaque place, hors recherche et hors filtres : il alimente le menu des filtres. */
export interface ComptesDeTermes {
  readonly types: Readonly<Record<TypeDeTerme, number>>;
  readonly origines: Readonly<Record<OrigineDeFiltre, number>>;
  readonly places: Readonly<Record<PlaceDuTerme, number>>;
}

export type DemandeDeNomenclature =
  | { readonly type: 'noms-analyser'; readonly demande: number }
  | { readonly type: 'lignes'; readonly demande: number; readonly generation: number; readonly groupe: string; readonly debut: number }
  | ({ readonly type: 'termes'; readonly demande: number; readonly generation: number } & RequeteDeTermes)
  | { readonly type: 'fiche'; readonly demande: number; readonly generation: number; readonly terme: string }
  /** Les identifiants que l'écran a exclus ou inclus à la main : le sandbox dit lesquels sont encore à renommer, et dans quel groupe. */
  | { readonly type: 'noms-selection'; readonly demande: number; readonly generation: number; readonly exclus: readonly string[]; readonly inclus: readonly string[] }
  | { readonly type: 'diagnostic'; readonly demande: number; readonly generation: number }
  | { readonly type: 'simuler'; readonly demande: number; readonly generation: number; readonly geste: GesteSurLesRegles }
  | { readonly type: 'noms-repondre'; readonly demande: number; readonly question: string; readonly reponse: Reponse }
  | { readonly type: 'regle'; readonly demande: number; readonly geste: GesteSurLesRegles }
  | { readonly type: 'appliquer'; readonly demande: number; readonly generation: number; readonly selection: Selection }
  | { readonly type: 'annuler-dernier'; readonly demande: number }
  | { readonly type: 'exporter'; readonly demande: number }
  | { readonly type: 'importer'; readonly demande: number; readonly texte: string }
  | { readonly type: 'configurer'; readonly demande: number; readonly collectionsExclues: readonly string[] };
export type UiMessage = DemandeDeNomenclature | DemandeDeTaille;

/**
 * Un nom avant et après le renommage. `ancien` et `nouveau` sont les noms complets, de même nombre de segments séparés par `/` ;
 * `marques` donne les rangs (à partir de 0) des segments que la règle de la carte change. Un nom qui ne change pas a `nouveau === ancien`.
 */
export interface LigneVue { readonly id: string; readonly ancien: string; readonly nouveau: string; readonly marques: readonly number[]; readonly aussi: readonly string[] }
export type RegleVue =
  /** `categorie` : la place du terme quand sa forme en dépend (les tailles), sinon `null`. */
  | { readonly sorte: 'terme'; readonly origine: OrigineDuTerme; readonly categorie: 'variables' | 'groupes' | null }
  | { readonly sorte: 'ecriture'; readonly categorie: CategorieDeNom; readonly convention: Convention }
  | { readonly sorte: 'collection' };
export interface GroupeVue {
  readonly cle: string; readonly regle: RegleVue;
  readonly avant: string; readonly apres: string; readonly autres: number;
  readonly variables: number; readonly collections: number;
  /** Pour un terme, le nombre de ses renommages qui changent aussi d'écriture ; 0 pour les autres règles. */
  readonly aussiDEcriture: number;
  readonly nouveau: boolean; readonly apercu: readonly LigneVue[];
}
/**
 * Un nom qui n'est pas renommé. `chemin` est posé quand deux chemins de `tokens.json` se rejoignent : `apres` est le nom, avec sa collection, du token
 * (qui est aussi le groupe de `autre` pour `token-et-groupe`), et `autre` celui de l'autre variable. Pour `meme-axe` et `axe-et-extensions`, le
 * renommage d'une collection fait écarter des axes de modes de l'export, et `apres` et `autre` sont les noms des deux collections.
 */
export interface BloqueVue {
  readonly avant: string; readonly apres: string; readonly collection: string;
  readonly chemin?: { readonly motif: MotifDeChemin; readonly apres: string; readonly autre: string };
}
export interface TermeVue { readonly mot: string; readonly nombre: number; readonly exemples: readonly LigneVue[]; readonly ucm: boolean }
/** `effet` : un nom réel du terme remplacé et ce même nom après le oui, `null` si aucun exemple ne l'emploie. */
export type QuestionVue =
  | { readonly type: 'paire'; readonly cle: string; readonly indice: IndiceDePaire; readonly termes: readonly [TermeVue, TermeVue]; readonly propose: 0 | 1; readonly cibleCommune: string | null; readonly effet: LigneVue | null }
  | { readonly type: 'ecriture-du-terme'; readonly cle: string; readonly indice: 'faute' | 'mots-colles'; readonly terme: TermeVue; readonly proposition: readonly string[]; readonly reference: { readonly mot: string; readonly nombre: number } | null; readonly effet: LigneVue | null }
  | { readonly type: 'collection'; readonly cle: string; readonly nom: string; readonly nombre: number; readonly proposee: string | null };
export interface LigneDEcriture { readonly convention: Convention; readonly suivent: number; readonly total: number; readonly exemple: LigneVue | null }
/** `protegees` compte les variables de la collection que `causeDeProtection` empêche de renommer, toutes causes, collection exclue comprise. */
export interface CollectionVue { readonly id: string; readonly nom: string; readonly nombre: number; readonly analysee: boolean; readonly protegees: number }
/** Le nombre de variables qu'une cause de protection empêche de renommer. */
export interface ProtectionVue { readonly cause: CauseDeProtection; readonly nombre: number }
export interface Bilan {
  readonly generation: number;
  readonly architecture: ArchitectureDuFichier;
  readonly premierLancement: boolean;
  readonly sansVariableLocale: boolean;
  /** Vrai quand une règle de nommage vient d'une version plus récente du plugin : rien ne s'applique tant que le plugin n'est pas à jour. */
  readonly reglesFutures: boolean;
  readonly ecriture: { readonly groupes: LigneDEcriture; readonly variables: LigneDEcriture; readonly collections: { readonly reconnues: number; readonly total: number } };
  readonly groupes: readonly GroupeVue[];
  readonly bloques: readonly BloqueVue[];
  /** Le total des variables des collections analysées que `causeDeProtection` empêche de renommer, toutes causes, même celles dont le nom suit déjà les règles. */
  readonly proteges: number;
  /** Une ligne par cause présente, dans l'ordre de `CauseDeProtection`, sans nombre nul. La somme vaut `proteges`. */
  readonly protections: readonly ProtectionVue[];
  readonly questions: readonly QuestionVue[];
  readonly autresPistes: number;
  readonly plusTard: readonly QuestionVue[];
  readonly collections: readonly CollectionVue[];
  /**
   * Le dernier renommage du journal. `nombre` est la taille du journal, `heure` sa date ISO. `reviennent` compte les noms que l'annulation
   * remettrait aujourd'hui, collections exclues retirées.
   */
  readonly dernierRenommage: {
    readonly nombre: number; readonly reviennent: number; readonly heure: string; readonly collections: readonly CollectionDuJournal[];
  } | null;
  /** Le dernier import qui a écrasé l'écriture ou un terme, que `annuler-import` défait, et ce qu'il a changé. */
  readonly dernierImport: { readonly heure: string; readonly lignes: readonly LigneDImport[] } | null;
}
/**
 * Un nom du journal que l'annulation ne rétablit pas encore. `aujourdhui` est le nom que l'objet porte, `null` s'il a disparu ; `ancien` celui
 * d'avant le renommage. `revient` : l'annulation le remettrait ; `change-depuis` : l'objet a été changé ou supprimé depuis, elle le laisse.
 */
export interface LigneDuJournal {
  readonly type: 'variable' | 'collection'; readonly aujourdhui: string | null; readonly ancien: string; readonly sort: 'revient' | 'change-depuis';
}
/**
 * Les lignes du journal d'une collection, dans l'ordre de l'inventaire. `id` et `nom` valent `null` pour le groupe des objets introuvables.
 * Une collection exclue garde ses lignes, avec le sort qu'elles auraient sans l'exclusion : l'annulation ne les touche pas.
 */
export interface CollectionDuJournal {
  readonly id: string | null; readonly nom: string | null; readonly exclue: boolean; readonly lignes: readonly LigneDuJournal[];
}
/**
 * Une clé changée par le dernier import. `avant` et `apres` valent `null` quand la règle n'existait pas ou n'existe plus ;
 * `terme` est le mot du terme (mots en minuscules joints par un tiret) et ses formes remplacées sont écrites de même.
 * `autres` regroupe en un nombre les autres clés changées.
 */
export type LigneDImport =
  | { readonly sorte: 'ecriture'; readonly avant: EcritureChoisie | null; readonly apres: EcritureChoisie | null }
  | { readonly sorte: 'terme'; readonly terme: string; readonly avant: readonly string[] | null; readonly apres: readonly string[] | null }
  | { readonly sorte: 'autres'; readonly nombre: number };
/**
 * Une ligne de la liste : un terme à une place. `mot` est la clé du terme (`stress-test`) ; un terme employé aux deux places a deux lignes,
 * de même `mot`. `forme` est son écriture affichée à `place` : pour un terme réglé, le terme de référence écrit dans la convention de cette place
 * (`LineHeight` en groupe, `line-height` en variable, `Small` en groupe et `sm` en variable) ; pour un nom ou un mot sans règle, son écriture
 * la plus fréquente à cette place dans le fichier (`StressTest`). `nature` vaut `composant` ou `palette` pour un nom, `null` pour un mot ;
 * un nom n'a qu'une ligne, aux groupes.
 * `remplace` liste les formes du fichier des variantes du terme remplacées à cette place (`Colors`, `colors`), les plus fréquentes d'abord ; une
 * variante que le fichier n'emploie pas n'y figure pas. `type` et `nombre` se lisent à cette place. `trouve`, quand la recherche a trouvé
 * la ligne par une variante, en est un élément : si le fichier n'emploie pas cette variante, la ligne trouvée la porte sous sa clé.
 */
export interface TermeDeListe {
  readonly mot: string; readonly place: PlaceDuTerme; readonly forme: string; readonly type: TypeDeTerme; readonly nature: NatureDeSegment | null; readonly origine: OrigineDuTerme | null;
  readonly statut: 'regle' | 'ecart' | 'a-trancher' | 'sans-regle'; readonly remplace: readonly string[]; readonly avec: string | null; readonly nombre: number; readonly trouve: string | null;
}
export interface FicheVue {
  readonly mot: string; readonly forme: string; readonly nature: NatureDeSegment | null; readonly origine: OrigineDuTerme | null; readonly categorieUcm: string | null; readonly definition: string | null;
  /** `mot` est la clé de la variante, que les gestes sur les règles envoient ; `forme` son écriture dans le fichier, la clé si le fichier ne l'emploie pas. */
  readonly remplace: readonly { readonly mot: string; readonly forme: string; readonly nombre: number; readonly ucm: boolean }[];
  readonly emploi: { readonly nombre: number; readonly exemples: readonly LigneVue[] };
  /** Les renommages dus au terme, où l'une de ses variantes est remplacée par lui. */
  readonly aRenommer: { readonly nombre: number; readonly exemples: readonly LigneVue[] };
  readonly ecart: boolean; readonly voulu: boolean;
  /** Vrai quand le fichier traite ce terme comme un mot du vocabulaire et non comme un nom. */
  readonly ordinaire: boolean; readonly distincts: readonly string[]; readonly question: string | null;
}
export type EffetVue =
  | { readonly sorte: 'terme'; readonly avant: string; readonly apres: string; readonly nombre: number; readonly exemple: LigneVue | null }
  | { readonly sorte: 'ecriture'; readonly groupes: LigneDEcriture; readonly variables: LigneDEcriture; readonly renommages: number; readonly exemple: { readonly avant: string; readonly apres: string } | null };
export type ConflitVue =
  | { readonly type: 'contredit-ucm'; readonly terme: string; readonly remplace: string; readonly termeUcm: string }
  | { readonly type: 'deja-remplace'; readonly remplace: string; readonly par: string }
  | { readonly type: 'cycle'; readonly termes: readonly string[] };
/**
 * `journal-impossible` : le fichier ne peut pas garder le journal du lot, qui est refusé avant tout renommage.
 * `regles-futures` : une règle de nommage vient d'une version plus récente du plugin ; rien ne s'écrit.
 */
export type CauseDeRefus = 'journal-impossible' | 'regles-futures';
export interface ResultatVue {
  readonly sorte: 'application' | 'annulation'; readonly statut: 'applique' | 'partiel' | 'refuse'; readonly renommes: number; readonly sautes: number; readonly annulable: boolean;
  readonly cause?: CauseDeRefus;
  /** Les lignes d'une annulation sautées parce que leur objet est dans une collection exclue de l'analyse ; présent quand il y en a. Elles sont comptées dans `sautes`. */
  readonly exclues?: number;
  /** Les variables sautées parce que leur protection ne se lit pas (`non-verifiee`) ; présent quand il y en a. Elles sont comptées dans `sautes`. */
  readonly nonVerifiees?: number;
}
export type CodeDErreur = 'analyse-en-cours' | 'fichier-modifie' | 'generation-perimee' | 'regles-modifiees' | 'regles-futures' | 'import-illisible' | 'mot-refuse' | 'import-partiel' | 'echec';

export type MessageDeNomenclature =
  | { readonly type: 'initial'; readonly dejaAnalyse: boolean }
  | { readonly type: 'lecture'; readonly demande: number; readonly lues: number; readonly total: number }
  | { readonly type: 'bilan'; readonly demande: number; readonly bilan: Bilan }
  | { readonly type: 'lignes'; readonly demande: number; readonly generation: number; readonly groupe: string; readonly debut: number; readonly lignes: readonly LigneVue[]; readonly total: number }
  /** `section` et `debut` répètent la demande. Sans section, `sections` ne garde que les types qui ont au moins un terme. */
  | { readonly type: 'termes'; readonly demande: number; readonly generation: number; readonly section: TypeDeTerme | null; readonly debut: number; readonly sections: readonly SectionDeTermes[]; readonly comptes: ComptesDeTermes }
  | { readonly type: 'fiche'; readonly demande: number; readonly generation: number; readonly fiche: FicheVue }
  /** Pour chaque identifiant reçu qui est encore un renommage de cette génération, la clé de son groupe principal. Un identifiant absent n'est plus à renommer. */
  | { readonly type: 'noms-selection'; readonly demande: number; readonly generation: number; readonly principaux: readonly (readonly [string, string])[] }
  | { readonly type: 'diagnostic'; readonly demande: number; readonly generation: number; readonly texte: string }
  | { readonly type: 'simulation'; readonly demande: number; readonly generation: number; readonly effet: EffetVue | null; readonly conflit: ConflitVue | null }
  | { readonly type: 'refus'; readonly demande: number; readonly conflits: readonly ConflitVue[] }
  | { readonly type: 'application'; readonly demande: number; readonly resultat: ResultatVue }
  | { readonly type: 'regles-exportees'; readonly demande: number; readonly texte: string }
  | { readonly type: 'erreur'; readonly demande: number; readonly code: CodeDErreur; readonly architecture?: ArchitectureDuFichier };

type Objet = Readonly<Record<string, unknown>>;
const entierPositif = (valeur: unknown): boolean => typeof valeur === 'number' && Number.isSafeInteger(valeur) && valeur > 0;
const entierNonNegatif = (valeur: unknown): boolean => typeof valeur === 'number' && Number.isSafeInteger(valeur) && valeur >= 0;
const chaine = (valeur: unknown): boolean => typeof valeur === 'string';
const zeroOuUn = (valeur: unknown): boolean => valeur === 0 || valeur === 1;
const chaines = (valeur: unknown): boolean => Array.isArray(valeur) && valeur.every(chaine);
const sansDoublon = (valeur: unknown): boolean => chaines(valeur) && new Set(valeur as string[]).size === (valeur as string[]).length;
const objet = (valeur: unknown): valeur is Objet => !!valeur && typeof valeur === 'object' && !Array.isArray(valeur);
const nombreFini = (valeur: unknown): boolean => typeof valeur === 'number' && Number.isFinite(valeur);

const LIMITE_D_IMPORT = 1_000_000;
const membres = (valeur: unknown, permis: readonly string[]): boolean => Array.isArray(valeur) && valeur.every((element) => permis.includes(element as string));

function estEcriture(brut: unknown): boolean {
  return objet(brut) && Object.keys(brut).length === 2 && 'groupes' in brut && 'variables' in brut && estConventions(brut);
}

function estReponse(brut: unknown): boolean {
  if (!objet(brut)) return false;
  switch (brut.type) {
    case 'garder': return zeroOuUn(brut.rang);
    case 'autre': return chaine(brut.terme);
    case 'distincts': case 'plus-tard': case 'voulu': return true;
    case 'corriger': return chaines(brut.mots);
    case 'collection': return brut.cible === null || chaine(brut.cible);
    default: return false;
  }
}

function estGeste(brut: unknown): boolean {
  if (!objet(brut)) return false;
  switch (brut.type) {
    case 'architecture': return typeof brut.ucm === 'boolean';
    case 'ecriture': return estEcriture(brut.ecriture);
    case 'remplacer-par': return chaine(brut.terme) && chaine(brut.par);
    case 'remplace-termes': return chaine(brut.terme) && chaines(brut.termes);
    case 'retirer-remplace': return chaine(brut.terme) && chaine(brut.remplace);
    case 'supprimer': case 'retirer-voulu': return chaine(brut.terme);
    case 'ecart-ucm': case 'terme-ordinaire': return chaine(brut.terme) && typeof brut.actif === 'boolean';
    case 'retirer-distinct': return Array.isArray(brut.termes) && brut.termes.length === 2 && brut.termes.every(chaine);
    case 'reprendre': case 'annuler-reponse': return chaine(brut.question);
    case 'annuler-import': return true;
    default: return false;
  }
}

function estSelection(brut: unknown): boolean {
  return objet(brut) && sansDoublon(brut.groupes) && sansDoublon(brut.exclus) && sansDoublon(brut.inclus);
}

/** Refuse toute demande hors contrat : demande ou génération non numérotée, rang, type, origine, place, tri, section ou geste inconnu, sélection ou lecture de sélection à doublons, import de plus d'un million de caractères, coordonnées de fenêtre non finies. */
export function estUiMessage(brut: unknown): brut is UiMessage {
  if (!objet(brut)) return false;
  if (brut.type === 'resize') {
    return nombreFini(brut.largeur) && nombreFini(brut.hauteur) && (!('fin' in brut) || typeof brut.fin === 'boolean');
  }
  if (!entierPositif(brut.demande)) return false;
  const genere = entierPositif(brut.generation);
  switch (brut.type) {
    case 'noms-analyser': case 'annuler-dernier': case 'exporter': return true;
    case 'lignes': return genere && chaine(brut.groupe) && entierNonNegatif(brut.debut);
    case 'termes':
      return genere && chaine(brut.recherche) && membres(brut.types, TYPES_DE_TERMES) && membres(brut.origines, ORIGINES_DE_FILTRE) && membres(brut.places, PLACES_DE_TERMES)
        && TRIS_DE_TERMES.includes(brut.tri as TriDeTermes) && (brut.section === null || TYPES_DE_TERMES.includes(brut.section as TypeDeTerme))
        && (brut.place === null || PLACES_DE_TERMES.includes(brut.place as PlaceDuTerme)) && entierNonNegatif(brut.debut);
    case 'fiche': return genere && chaine(brut.terme);
    case 'noms-selection': return genere && sansDoublon(brut.exclus) && sansDoublon(brut.inclus);
    case 'diagnostic': return genere;
    case 'simuler': return genere && estGeste(brut.geste);
    case 'noms-repondre': return chaine(brut.question) && estReponse(brut.reponse);
    case 'regle': return estGeste(brut.geste);
    case 'appliquer': return genere && estSelection(brut.selection);
    case 'importer': return chaine(brut.texte) && (brut.texte as string).length <= LIMITE_D_IMPORT;
    case 'configurer': return chaines(brut.collectionsExclues);
    default: return false;
  }
}
