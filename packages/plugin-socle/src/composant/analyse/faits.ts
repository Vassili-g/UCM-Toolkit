/**
 * Les faits ordinaires d'une analyse : ce qu'une acquisition a lu dans Figma,
 * copié en valeurs simples (chaînes, nombres, booléens, tableaux, objets
 * littéraux). Le relevé d'Architect, sa vue Composant, le moteur, le budget
 * et la surveillance en tirent chacun leur projection ; ce fichier ne les
 * fusionne pas.
 *
 * Aucun type ne renvoie aux typages Figma : une projection se teste sur un
 * fait écrit à la main, sans double de nœud.
 *
 * Un sous-objet (peinture, effet, définition de propriété) se copie entier :
 * une clé facultative absente y signifie que Figma ne la donne pas. Un champ
 * de nœud ou de ressource, lui, porte un état : acquis, mixte, refusé ou non
 * demandé. Aucun état ne vaut une valeur par défaut : un `visible` non demandé
 * n'est pas `true`.
 */

// États d'une lecture.

/** `leve` : la lecture a levé. `absent` : le nœud n'expose ni la propriété ni la méthode (`undefined`). `introuvable` : l'appel a rendu `null`. */
export type RaisonDeRefus = 'leve' | 'absent' | 'introuvable';

export interface Acquis<V> {
  readonly etat: 'acquis';
  readonly valeur: V;
}

/** La propriété vaut la valeur mixte de Figma, ou n'a pas la forme attendue : pas une liste là où une liste est attendue. */
export interface Mixte {
  readonly etat: 'mixte';
}

export interface Refuse<R extends RaisonDeRefus = RaisonDeRefus> {
  readonly etat: 'refuse';
  readonly raison: R;
  readonly message?: string;
}

export interface NonDemande {
  readonly etat: 'non-demande';
}

/** Ce qu'une acquisition écrit pour un champ qu'elle a lu. */
export type EtatEcrit<V> = Acquis<V> | Mixte | Refuse;

/** Ce qu'une projection reçoit : `champDe` ajoute le non-demandé, que la table n'écrit jamais. */
export type EtatDeChamp<V> = EtatEcrit<V> | NonDemande;

export const MIXTE: Mixte = { etat: 'mixte' };
export const NON_DEMANDE: NonDemande = { etat: 'non-demande' };

export function acquis<V>(valeur: V): Acquis<V> {
  return { etat: 'acquis', valeur };
}

export function refuse<R extends RaisonDeRefus>(raison: R, message?: string): Refuse<R> {
  return message === undefined ? { etat: 'refuse', raison } : { etat: 'refuse', raison, message };
}

/**
 * Les champs lus d'un nœud ou d'une ressource. Un champ non demandé n'a pas de
 * clé : la table d'un nœud que la vue Composant lit n'a ni `visible` ni
 * `opacity`. La provenance d'un champ est la propriété que nomme sa clé.
 */
export type TableDesChamps<C> = { readonly [K in keyof C]?: EtatEcrit<C[K]> };

/** L'état d'un champ, `non-demande` quand l'acquisition ne l'a pas lu. Lire une table par cette fonction seulement. */
export function champDe<C, K extends keyof C>(table: TableDesChamps<C>, champ: K): EtatDeChamp<C[K]> {
  return table[champ] ?? NON_DEMANDE;
}

// Valeurs structurées.

/** Une valeur dont aucun lecteur ne lit la forme : il la compare ou l'avertit. */
export type ValeurLitterale = string | number | boolean | null | readonly ValeurLitterale[] | { readonly [cle: string]: ValeurLitterale };

/** Les SOLID n'ont pas de `a` ; les arrêts de dégradé en ont un. */
export type CouleurLue = { readonly r: number; readonly g: number; readonly b: number; readonly a?: number };

export type BoiteLue = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

export type AliasDeVariable = { readonly type: 'VARIABLE_ALIAS'; readonly id: string };

/** `boundVariables.componentProperties` : une liaison par propriété de composant. */
export type LiaisonsDeProprietes = { readonly [propriete: string]: AliasDeVariable };

/**
 * `boundVariables` d'un nœud, d'un style, d'un effet, d'une grille ou d'un
 * segment, dans l'ordre des clés de Figma : les lecteurs rendent leurs
 * liaisons dans cet ordre. La clé `componentProperties` porte un
 * `LiaisonsDeProprietes`.
 */
export type LiaisonsParChamp = { readonly [champ: string]: AliasDeVariable | readonly AliasDeVariable[] | LiaisonsDeProprietes };

export type ArretDeDegradeLu = {
  readonly position: number;
  readonly color: CouleurLue;
  readonly boundVariables?: { readonly color?: AliasDeVariable };
};

export type PeintureLue = {
  readonly type: string;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: string;
  /** SOLID seulement. */
  readonly color?: CouleurLue;
  readonly boundVariables?: { readonly color?: AliasDeVariable };
  readonly gradientStops?: readonly ArretDeDegradeLu[];
};

export type EffetLu = {
  readonly type: string;
  readonly visible?: boolean;
  readonly radius?: number;
  readonly spread?: number;
  readonly offset?: { readonly x: number; readonly y: number };
  readonly color?: CouleurLue;
  readonly blendMode?: string;
  readonly blurType?: string;
  readonly showShadowBehindNode?: boolean;
  readonly boundVariables?: LiaisonsParChamp;
};

/** Les lecteurs ne lisent d'une grille que ses liaisons. */
export type GrilleLue = { readonly boundVariables?: LiaisonsParChamp };

/** Identifiant de collection → identifiant de mode. */
export type ModesParCollection = { readonly [collection: string]: string };

export type DefinitionDeProprieteLue = {
  /** `VARIANT`, `BOOLEAN`, `TEXT`, `INSTANCE_SWAP`, `SLOT`. */
  readonly type: string;
  readonly defaultValue?: string | boolean;
  readonly variantOptions?: readonly string[];
  readonly preferredValues?: readonly { readonly type: string; readonly key: string }[];
  readonly description?: string;
  readonly slotSettings?: ValeurLitterale;
};

export type ReferencesDeProprietes = { readonly visible?: string; readonly characters?: string; readonly mainComponent?: string };

export type ProprieteDInstanceLue = { readonly type: string; readonly value: string | boolean; readonly boundVariables?: LiaisonsParChamp };

export type SurchargeLue = { readonly id: string; readonly overriddenFields: readonly string[] };

// Nœuds.

export type IdDeNoeud = string;

/** Les champs qu'un lecteur actuel lit sur un nœud, avec le type de leur valeur acquise. */
export interface ChampsDeNoeud {
  readonly visible: boolean;
  readonly opacity: number;
  readonly absoluteBoundingBox: BoiteLue | null;
  readonly absoluteRenderBounds: BoiteLue | null;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;

  readonly layoutMode: string;
  readonly layoutWrap: string;
  readonly primaryAxisAlignItems: string;
  readonly counterAxisAlignItems: string;
  readonly counterAxisSpacing: number | null;
  readonly itemSpacing: number;
  readonly paddingLeft: number;
  readonly paddingRight: number;
  readonly paddingTop: number;
  readonly paddingBottom: number;
  readonly layoutSizingHorizontal: string;
  readonly layoutSizingVertical: string;
  readonly layoutPositioning: string;
  readonly layoutAlign: string;
  readonly layoutGrow: number;
  readonly minWidth: number | null;
  readonly maxWidth: number | null;
  readonly minHeight: number | null;
  readonly maxHeight: number | null;
  readonly cornerRadius: number;
  readonly topLeftRadius: number;
  readonly topRightRadius: number;
  readonly bottomLeftRadius: number;
  readonly bottomRightRadius: number;

  readonly fills: readonly PeintureLue[];
  readonly strokes: readonly PeintureLue[];
  readonly strokeWeight: number;
  readonly strokeTopWeight: number;
  readonly strokeRightWeight: number;
  readonly strokeBottomWeight: number;
  readonly strokeLeftWeight: number;
  readonly blendMode: string;
  readonly isMask: boolean;
  readonly dashPattern: readonly number[];
  readonly effects: readonly EffetLu[];
  readonly effectStyleId: string;
  readonly layoutGrids: readonly GrilleLue[];

  readonly characters: string;
  readonly textStyleId: string;
  readonly fontSize: number;
  readonly textCase: string;
  readonly textDecoration: string;
  readonly textDecorationStyle: string;
  readonly textDecorationOffset: ValeurLitterale;
  readonly textDecorationThickness: ValeurLitterale;
  readonly textDecorationColor: ValeurLitterale;
  readonly textDecorationSkipInk: boolean;
  readonly textWrapStyle: string;
  readonly leadingTrim: string;
  readonly textAlignHorizontal: string;
  readonly textAlignVertical: string;
  readonly textTruncation: string;
  readonly openTypeFeatures: { readonly [fonctionnalite: string]: boolean };
  readonly listSpacing: number;
  readonly hangingList: boolean;
  readonly hangingPunctuation: boolean;

  readonly boundVariables: LiaisonsParChamp;
  readonly resolvedVariableModes: ModesParCollection;
  readonly explicitVariableModes: ModesParCollection;

  readonly key: string;
  readonly remote: boolean;
  /** Le variant par défaut d'un jeu, par son identifiant. */
  readonly defaultVariant: IdDeNoeud;
  readonly componentPropertyDefinitions: { readonly [nom: string]: DefinitionDeProprieteLue };
  readonly variantProperties: { readonly [axe: string]: string } | null;
  readonly componentPropertyReferences: ReferencesDeProprietes | null;
  readonly componentProperties: { readonly [nom: string]: ProprieteDInstanceLue };
  readonly overrides: readonly SurchargeLue[];
}

/**
 * `racine` : un jeu ou un variant que l'acquisition lit comme sommet de
 * composant. `instance` : une instance sous une racine, frontière que la
 * couverture `frontiere` ne descend pas.
 */
export type Frontiere = 'racine' | 'instance' | 'ordinaire';

/**
 * Un nœud de la topologie : identité, place et frontière, sans valeur.
 * `parent` est `null` pour un sommet de l'acquisition : son parent Figma n'a
 * pas été lu. `rang` est `null` quand la liste des enfants du parent n'a pas
 * été lue.
 */
export interface NoeudDeTopologie {
  readonly id: IdDeNoeud;
  readonly type: string;
  readonly nom: string;
  readonly parent: IdDeNoeud | null;
  readonly rang: number | null;
  /**
   * `refuse` + `leve` : sous-arbre inconnu, et trou de la couverture.
   * `refuse` + `absent` : le type de nœud n'a pas d'enfants.
   * `non-demande` : instance frontière non descendue.
   */
  readonly enfants: Acquis<readonly IdDeNoeud[]> | Refuse | NonDemande;
  readonly frontiere: Frontiere;
  readonly sousUneInstance: boolean;
}

export type ChampDeSegment = keyof ValeursDeSegment;

export interface ValeursDeSegment {
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly fills: readonly PeintureLue[];
  readonly boundVariables: LiaisonsParChamp;
  readonly textStyleId: string;
  readonly listOptions: ValeurLitterale;
  readonly textStyleOverrides: readonly ValeurLitterale[];
}

/** Une plage de `getStyledTextSegments`, `fin` exclue, avec la valeur de chaque champ demandé. */
export interface PlageDeTexte {
  readonly debut: number;
  readonly fin: number;
  readonly valeurs: { readonly [C in ChampDeSegment]?: ValeursDeSegment[C] };
}

/**
 * Un appel `getStyledTextSegments(champs)`, plages telles que Figma les rend.
 * Un refus porte sur l'appel entier : aucune plage n'est connue.
 */
export interface FaitDeSegments {
  /** Triés, sans doublon : la clé de `cleDeSegments`. */
  readonly champs: readonly ChampDeSegment[];
  readonly etat: Acquis<readonly PlageDeTexte[]> | Refuse<'leve' | 'absent'>;
}

/** La clé d'un fait de segments : deux appels aux mêmes champs, dans un autre ordre, ont la même. */
export function cleDeSegments(champs: readonly ChampDeSegment[]): string {
  return [...new Set(champs)].sort().join(',');
}

/** Le maître d'une instance, par son identifiant dans `Ressources.maitres`. */
export type EtatDuMaitre = Acquis<IdDeNoeud> | Refuse;

/** La valeur que `resolveForConsumer` rend pour une variable sur ce nœud. */
export type EtatDeResolution = Acquis<ValeurDeVariable> | Refuse;

/** Les valeurs lues d'un nœud. Une clé facultative absente : rien de cette sorte n'a été demandé. */
export interface FaitsDuNoeud {
  readonly champs: TableDesChamps<ChampsDeNoeud>;
  /** Par `cleDeSegments`. */
  readonly segments?: { readonly [cle: string]: FaitDeSegments };
  readonly maitre?: EtatDuMaitre;
  /** Par identifiant de variable. */
  readonly resolutions?: { readonly [variable: string]: EtatDeResolution };
}

export function segmentsDe(faits: FaitsDuNoeud, champs: readonly ChampDeSegment[]): FaitDeSegments | NonDemande {
  return faits.segments?.[cleDeSegments(champs)] ?? NON_DEMANDE;
}

export function maitreDe(faits: FaitsDuNoeud): EtatDuMaitre | NonDemande {
  return faits.maitre ?? NON_DEMANDE;
}

// Provenance.

export type AppelNatif =
  | { readonly appel: 'propriete'; readonly nom: string }
  | { readonly appel: 'getStyledTextSegments'; readonly champs: readonly ChampDeSegment[] }
  | { readonly appel: 'getMainComponentAsync'; readonly instance: IdDeNoeud }
  | { readonly appel: 'getNodeByIdAsync'; readonly id: IdDeNoeud }
  | { readonly appel: 'getStyleByIdAsync'; readonly id: string }
  | { readonly appel: 'getVariableByIdAsync'; readonly id: string }
  | { readonly appel: 'getVariableCollectionByIdAsync'; readonly id: string }
  | { readonly appel: 'getLocalVariablesAsync' }
  | { readonly appel: 'getLocalVariableCollectionsAsync' }
  | { readonly appel: 'importVariableByKeyAsync'; readonly cle: string }
  | { readonly appel: 'resolveForConsumer'; readonly variable: string; readonly noeud: IdDeNoeud }
  | { readonly appel: 'teamLibrary.getAvailableLibraryVariableCollectionsAsync' }
  | { readonly appel: 'teamLibrary.getVariablesInLibraryCollectionAsync'; readonly cle: string };

/**
 * `locale` : ressource du fichier. `distante` : ressource d'une library que le
 * fichier connaît (`remote`). `library` : lue par `teamLibrary`, sans import.
 * `inconnue` : la ressource refusée ne dit pas d'où elle vient.
 */
export type Origine = 'locale' | 'distante' | 'library' | 'inconnue';

export interface Provenance {
  readonly appel: AppelNatif;
  readonly origine: Origine;
}

// Ressources partagées.

/** Un résultat d'appel natif hors des champs de nœud. Pas d'état mixte : ces appels rendent une valeur ou échouent. */
export interface FaitLu<V> {
  readonly provenance: Provenance;
  readonly etat: Acquis<V> | Refuse;
}

/**
 * Une ressource par identifiant, une fois par acquisition, quel que soit le
 * nombre de nœuds qui la citent. L'état vaut pour cette acquisition : une
 * variable refusée dans l'une peut être acquise dans la suivante.
 */
export interface FaitDeRessource<V> extends FaitLu<V> {
  readonly id: string;
}

export interface ChampsDeVariable {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly remote: boolean;
  readonly hiddenFromPublishing: boolean;
  readonly variableCollectionId: string;
  readonly resolvedType: string;
  readonly scopes: readonly string[];
  readonly codeSyntax: { readonly [plateforme: string]: string };
  /** Identifiant de mode → valeur. */
  readonly valuesByMode: { readonly [mode: string]: ValeurDeVariable };
}

export type ValeurDeVariable = number | boolean | string | CouleurLue | AliasDeVariable;

export type ModeDeCollectionLu = { readonly modeId: string; readonly name: string; readonly parentModeId?: string };

export interface ChampsDeCollection {
  readonly key: string;
  readonly name: string;
  readonly remote: boolean;
  readonly hiddenFromPublishing: boolean;
  readonly isExtension: boolean;
  readonly modes: readonly ModeDeCollectionLu[];
  readonly defaultModeId: string;
  readonly variableIds: readonly string[];
  readonly parentVariableCollectionId: string;
  readonly rootVariableCollectionId: string;
  /** Identifiant de variable → identifiant de mode → valeur. */
  readonly variableOverrides: { readonly [variable: string]: { readonly [mode: string]: ValeurDeVariable } };
}

export interface ChampsDeStyle {
  readonly type: string;
  readonly name: string;
  readonly boundVariables: LiaisonsParChamp;
  readonly paints: readonly PeintureLue[];
  readonly effects: readonly EffetLu[];
  readonly layoutGrids: readonly GrilleLue[];
  readonly fontName: { readonly family: string; readonly style: string };
  readonly textCase: string;
  readonly textDecoration: string;
  readonly paragraphSpacing: number;
  readonly paragraphIndent: number;
  readonly textWrapStyle: string;
  readonly leadingTrim: string;
}

/** Le maître d'une instance et son jeu ; `jeu` est `null` quand le maître n'est pas un variant. */
export interface MaitreLu {
  readonly id: IdDeNoeud;
  readonly key: string;
  readonly nom: string;
  readonly remote: boolean;
  readonly jeu: { readonly id: IdDeNoeud; readonly key: string; readonly nom: string } | null;
}

/** Un nœud atteint par `getNodeByIdAsync` hors de la topologie, par exemple la cible d'une surcharge ; ses champs sont dans `Acquisition.faits`. */
export interface IdentiteDeNoeud {
  readonly type: string;
  readonly nom: string;
}

export type CollectionDeLibraryLue = { readonly key: string; readonly name: string; readonly libraryName: string };
export type VariableDeLibraryLue = { readonly key: string; readonly name: string; readonly resolvedType: string };

/** Les listes rendues entières par un seul appel ; une clé absente : liste non demandée. */
export interface Inventaires {
  readonly variablesLocales?: FaitLu<readonly string[]>;
  readonly collectionsLocales?: FaitLu<readonly string[]>;
  readonly collectionsDeLibrary?: FaitLu<readonly CollectionDeLibraryLue[]>;
}

export interface Ressources {
  readonly noeudsParIdentifiant: { readonly [id: string]: FaitDeRessource<IdentiteDeNoeud> };
  readonly variables: { readonly [id: string]: FaitDeRessource<TableDesChamps<ChampsDeVariable>> };
  readonly collections: { readonly [id: string]: FaitDeRessource<TableDesChamps<ChampsDeCollection>> };
  readonly styles: { readonly [id: string]: FaitDeRessource<TableDesChamps<ChampsDeStyle>> };
  readonly maitres: { readonly [id: string]: FaitDeRessource<MaitreLu> };
  /** Par clé de collection de library. */
  readonly variablesDeLibrary: { readonly [cle: string]: FaitDeRessource<readonly VariableDeLibraryLue[]> };
  readonly inventaires: Inventaires;
}

// Couverture et acquisition.

export type TrouDeCouverture =
  | { readonly type: 'enfants'; readonly noeud: IdDeNoeud; readonly raison: RaisonDeRefus; readonly message?: string }
  | { readonly type: 'page-non-ecoutee'; readonly page: IdDeNoeud };

/**
 * `instances` : `frontiere`, le parcours s'arrête à chaque instance sous une
 * racine (relevé, vue Composant) ; `descendues`, il les traverse (budget et
 * moteur, `findAll`). Une couverture incomplète sans trou connu est une
 * couverture inconnue.
 */
export type Couverture = { readonly instances: 'frontiere' | 'descendues' } & (
  | { readonly complete: true }
  | { readonly complete: false; readonly trous: readonly TrouDeCouverture[] }
);

/** Vrai quand une réutilisation doit relire Figma : trous connus ou couverture inconnue. */
export function doitEtreRelue(couverture: Couverture): boolean {
  return !couverture.complete;
}

export interface Acquisition {
  readonly couverture: Couverture;
  /** Les nœuds sans parent lu, dans l'ordre de lecture ; l'ordre des autres suit `enfants`. */
  readonly sommets: readonly IdDeNoeud[];
  readonly topologie: { readonly [id: string]: NoeudDeTopologie };
  /** Par identifiant de nœud, nœuds atteints hors de la topologie compris. */
  readonly faits: { readonly [id: string]: FaitsDuNoeud };
  readonly ressources: Ressources;
}
