/**
 * Les variables, collections, styles et maîtres d'instance qu'une demande d'analyse lit par identifiant, une fois chacun.
 *
 * `creerMemoireDeRessources` rend une mémoire que la demande crée à son début et oublie à sa fin : une ressource
 * refusée n'y survit pas, la demande suivante la relit et la trouve lisible si Figma la sert alors. Une demande
 * d'Architect n'en crée qu'une (`InventairesDeLaDemande.ressources`) : le relevé, les dépendances et le moteur y lisent
 * chacun une variable, un style ou un maître une seule fois, le premier lecteur donnant la lecture. La mémoire garde la
 * promesse de chaque identifiant, donc deux lecteurs simultanés d'une même variable ne font qu'un appel natif, refus compris.
 *
 * Elle copie en `FaitDeRessource` les seuls champs que le lecteur nomme, plus `remote` pour l'origine. Elle ne lit
 * ni `valuesByMode` ni aucun alias : suivre un alias est l'affaire du lecteur, par un autre identifiant. Chaque
 * lecteur tire de ces faits son traitement du refus.
 *
 * Styles et maîtres ont deux étages. L'appel natif et son refus se mémorisent d'abord par identifiant (`LectureNative`) :
 * le moteur s'arrête là, parce qu'il relit ensuite l'objet natif pour des champs que le fait ne porte pas. Le relevé
 * demande en plus la copie, `FaitDeRessource`, rangée par identifiant de la ressource et non de la demande : deux
 * instances d'un même maître ne copient qu'une fois.
 */
import { lireUnChamp } from './acquisition';
import {
  MIXTE,
  acquis,
  refuse,
  type ChampsDeCollection,
  type ChampsDeStyle,
  type ChampsDeVariable,
  type EtatEcrit,
  type FaitDeRessource,
  type IdDeNoeud,
  type MaitreLu,
  type ModeDeCollectionLu,
  type Origine,
  type Refuse,
  type TableDesChamps,
} from './faits';
import type { ContexteCooperatif } from '../contract/porteeDAnalyse';

/** Le résultat d'un appel natif par identifiant : l'objet rendu, ou le refus que le lecteur traite à sa façon. */
export type LectureNative<T> = { readonly etat: 'lu'; readonly natif: T } | Refuse;

/**
 * Appelle `lire` une fois par identifiant dans `memoire`, et range le refus avec le succès. Sans `memoire`, chaque
 * appel lit. `lire` rend la promesse de l'appel natif, ou `undefined` quand la méthode manque : refus `absent`.
 * `propager` laisse remonter une erreur que la mémoire ne range pas.
 */
export function lireUneFoisParIdentifiant<T extends object>(
  memoire: Map<string, Promise<LectureNative<T>>> | undefined,
  id: string | undefined,
  lire: () => Promise<T | null> | undefined,
  options: { readonly propager?: (erreur: unknown) => boolean; readonly reutilise?: () => void } = {},
): Promise<LectureNative<T>> {
  const cle = typeof id === 'string' ? id : undefined;
  const deja = cle === undefined ? undefined : memoire?.get(cle);
  if (deja) {
    options.reutilise?.();
    return deja;
  }
  const lecture = (async (): Promise<LectureNative<T>> => {
    try {
      const promesse = lire();
      if (promesse === undefined) return refuse('absent');
      const natif = await promesse;
      return natif ? { etat: 'lu', natif } : refuse('introuvable');
    } catch (erreur) {
      if (options.propager?.(erreur)) throw erreur;
      return refuse('leve', messageDErreur(erreur));
    }
  })();
  if (cle !== undefined) memoire?.set(cle, lecture);
  return lecture;
}

export type ChampDeVariableCopie = 'key' | 'name' | 'variableCollectionId';
export type ChampDeCollectionCopie = 'name' | 'modes';
export type ChampDeStyleCopie = 'type' | 'name';

export type FaitDeVariable = FaitDeRessource<TableDesChamps<ChampsDeVariable>>;
export type FaitDeCollection = FaitDeRessource<TableDesChamps<ChampsDeCollection>>;
export type FaitDeStyle = FaitDeRessource<TableDesChamps<ChampsDeStyle>>;
export type FaitDuMaitre = FaitDeRessource<MaitreLu>;

/** Une instance, pour la mémoire des maîtres : son identifiant clé la lecture, `getMainComponentAsync` peut manquer. */
export interface InstanceLue {
  readonly id: string;
  getMainComponentAsync?(): Promise<object | null>;
}

export interface OptionsDeLaLectureDuMaitre {
  readonly lire?: () => Promise<object | null> | undefined;
  readonly reutilise?: () => void;
}

/** Les deux lectures natives que la mémoire appelle. Un nœud de test sans l'une d'elles lève à l'appel : refus `leve`. */
export interface LecturesDeRessources {
  getVariableByIdAsync(id: string): Promise<object | null>;
  getVariableCollectionByIdAsync(id: string): Promise<object | null>;
  /** Absente : tout style est refusé `absent`. */
  getStyleByIdAsync?(id: string): Promise<object | null>;
}

export interface OptionsDeLaMemoire {
  /** Les lectures, résolues à chaque appel : un lecteur qui lit `figma.variables` ne le fige pas à la création. */
  readonly lectures: () => LecturesDeRessources;
  /** Défaut : `key`, `name`, `variableCollectionId`. */
  readonly champsDeVariable?: readonly ChampDeVariableCopie[];
  /** Défaut : `name`, `modes`. */
  readonly champsDeCollection?: readonly ChampDeCollectionCopie[];
  /** Défaut : `name`. */
  readonly champsDeStyle?: readonly ChampDeStyleCopie[];
  /** Cède entre deux modes d'une collection : la copie d'une longue liste ne retient pas le sandbox. */
  readonly cooperation?: ContexteCooperatif;
  /** Vrai pour une erreur que la mémoire ne range pas en refus et laisse remonter, comme l'annulation d'une analyse. */
  readonly propager?: (erreur: unknown) => boolean;
}

export interface MemoireDeRessources {
  variable(id: string): Promise<FaitDeVariable>;
  collection(id: string): Promise<FaitDeCollection>;
  /** L'appel natif et son refus, par identifiant de style. */
  styleNatif(id: string): Promise<LectureNative<object>>;
  /** La copie des champs demandés du style, par identifiant de style. */
  style(id: string): Promise<FaitDeStyle>;
  /**
   * L'appel natif et son refus, par identifiant d'instance ; l'objet rendu reste au lecteur. `lire` remplace l'appel de
   * l'instance (le moteur y met son appel mesuré), `reutilise` signale une lecture déjà faite.
   */
  maitre(instance: InstanceLue, options?: OptionsDeLaLectureDuMaitre): Promise<LectureNative<object>>;
  /** La copie du maître rendu pour cette instance, par identifiant de maître ; un maître refusé n'a pas de fait. */
  faitDuMaitre(instance: IdDeNoeud, natif: object): Promise<FaitDuMaitre>;
  /**
   * Met les variables et collections hors d'atteinte des imports du catalogue, qui rendent lisible ce que le relevé avait
   * vu refusé. L'analyse l'appelle en lançant le catalogue, avec sa fin :
   * - toute lecture qui n'a pas encore eu lieu attend `fin`, puis appelle Figma comme si elle suivait le catalogue ;
   * - un refus rangé jusqu'ici s'oublie et suit la même règle : une relecture, après `fin`, puis mémorisée ; de même
   *   pour un refus que rend après l'appel une lecture partie avant lui ;
   * - une ressource acquise avant l'appel reste acquise.
   * Un rejet de `fin` lève l'attente comme une fin normale. Les styles et les maîtres sont hors de cette attente : les
   * imports ne les changent pas.
   */
  attendreLesImports(fin: Promise<unknown>): void;
}

/** La table pendant sa copie, avant qu'elle ne soit rendue en lecture seule. */
type Ecrivable<C> = { -readonly [K in keyof C]?: EtatEcrit<C[K]> };

const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/** Une chaîne (défaut) ou un booléen ; toute autre forme est mixte. Un champ de ressource n'a pas de mixte de Figma : c'est une forme inattendue. */
function lireUnTexte(objet: object, champ: string): EtatEcrit<string>;
function lireUnTexte(objet: object, champ: string, forme: 'boolean'): EtatEcrit<boolean>;
function lireUnTexte(objet: object, champ: string, forme: 'string' | 'boolean' = 'string'): EtatEcrit<string> | EtatEcrit<boolean> {
  const lu = lireUnChamp(objet, champ);
  if (lu.etat !== 'acquis') return lu;
  return typeof lu.valeur === forme ? (lu as EtatEcrit<string> | EtatEcrit<boolean>) : MIXTE;
}

async function copierLesModes(collection: object, cooperation: ContexteCooperatif | undefined): Promise<EtatEcrit<readonly ModeDeCollectionLu[]>> {
  let liste: unknown;
  try {
    liste = (collection as { modes?: unknown }).modes;
  } catch (erreur) {
    return refuse('leve', messageDErreur(erreur));
  }
  if (liste === undefined) return refuse('absent');
  if (!Array.isArray(liste)) return MIXTE;
  const modes: ModeDeCollectionLu[] = [];
  for (const mode of liste) {
    await cooperation?.cederSiBesoin();
    if (typeof mode !== 'object' || mode === null) return MIXTE;
    const { modeId, name, parentModeId } = mode as { modeId?: unknown; name?: unknown; parentModeId?: unknown };
    if (typeof modeId !== 'string' || typeof name !== 'string') return MIXTE;
    modes.push(typeof parentModeId === 'string' ? { modeId, name, parentModeId } : { modeId, name });
  }
  return acquis(modes);
}

function origineDe(table: { readonly remote?: EtatEcrit<boolean> }): Origine {
  const remote = table.remote;
  if (remote?.etat !== 'acquis') return 'inconnue';
  return remote.valeur ? 'distante' : 'locale';
}

/** Une chaîne, `''` pour une forme ou une valeur absente (le `String(key ?? '')` du relevé), ou le refus d'une lecture qui lève. */
function texteOuVide(objet: object, champ: string): string | Refuse {
  const lu = lireUnTexte(objet, champ);
  if (lu.etat === 'refuse' && lu.raison === 'leve') return lu;
  return lu.etat === 'acquis' ? lu.valeur : '';
}

const provenanceDuMaitre = (instance: IdDeNoeud, origine: Origine) => ({ appel: { appel: 'getMainComponentAsync', instance }, origine }) as const;

/**
 * Copie le maître et son jeu, dans l'ordre où le relevé les lisait : `type` et `parent` décident du jeu, puis les champs
 * du jeu, puis ceux du maître. Une lecture qui lève refuse le maître. La `key` du maître ne le refuse que sans jeu : avec un
 * jeu, le relevé lisait celle du jeu et jamais celle du variant. Une `key` lisible mais absente ou non textuelle vaut `''`.
 */
function copierLeMaitre(natif: object, instance: IdDeNoeud, id: string): FaitDuMaitre {
  const echec = (etat: Refuse): FaitDuMaitre => ({ id, provenance: provenanceDuMaitre(instance, 'inconnue'), etat });
  let jeuNatif: object | null = null;
  try {
    const { type, parent } = natif as { type?: unknown; parent?: { type?: unknown } | null };
    if (type === 'COMPONENT' && parent?.type === 'COMPONENT_SET') jeuNatif = parent;
  } catch (erreur) {
    return echec(refuse('leve', messageDErreur(erreur)));
  }
  let jeu: MaitreLu['jeu'] = null;
  if (jeuNatif) {
    const idDuJeu = texteOuVide(jeuNatif, 'id');
    const cle = texteOuVide(jeuNatif, 'key');
    const nom = texteOuVide(jeuNatif, 'name');
    if (typeof idDuJeu !== 'string') return echec(idDuJeu);
    if (typeof nom !== 'string') return echec(nom);
    if (typeof cle !== 'string') return echec(cle);
    jeu = { id: idDuJeu, key: cle, nom };
  }
  const cle = texteOuVide(natif, 'key');
  const nom = texteOuVide(natif, 'name');
  if (typeof nom !== 'string') return echec(nom);
  if (typeof cle !== 'string' && !jeu) return echec(cle);
  const remote = lireUnTexte(natif, 'remote', 'boolean');
  const distant = remote.etat === 'acquis' && remote.valeur === true;
  const origine: Origine = remote.etat !== 'acquis' ? 'inconnue' : distant ? 'distante' : 'locale';
  return { id, provenance: provenanceDuMaitre(instance, origine), etat: acquis({ id, key: typeof cle === 'string' ? cle : '', nom, remote: distant, jeu }) };
}

export function creerMemoireDeRessources(options: OptionsDeLaMemoire): MemoireDeRessources {
  const variables = new Map<string, Promise<FaitDeVariable>>();
  const collections = new Map<string, Promise<FaitDeCollection>>();
  const champsDeVariable = options.champsDeVariable ?? (['key', 'name', 'variableCollectionId'] as const);
  const champsDeCollection = options.champsDeCollection ?? (['name', 'modes'] as const);
  const champsDeStyle = options.champsDeStyle ?? (['name'] as const);
  const styles = new Map<string, Promise<FaitDeStyle>>();
  const stylesNatifs = new Map<string, Promise<LectureNative<object>>>();
  const maitres = new Map<string, Promise<LectureNative<object>>>();
  const faitsDeMaitre = new Map<string, Promise<FaitDuMaitre>>();
  const refuses = { variables: new Set<string>(), collections: new Set<string>() };

  /** La fin des imports du catalogue tant qu'ils courent (`attendreLesImports`), sinon `null`. */
  let imports: Promise<void> | null = null;
  /** Le nombre d'appels de `attendreLesImports` : une lecture qui le voit changer a pu être servie sans les imports. */
  let appelsDesImports = 0;

  async function lire<T extends object>(
    id: string,
    appel: 'getVariableByIdAsync' | 'getVariableCollectionByIdAsync',
    copier: (ressource: object) => Promise<{ table: T; origine: Origine }>,
  ): Promise<FaitDeRessource<T>> {
    for (;;) {
      if (imports) await imports;
      const avant = appelsDesImports;
      const fait = await lireLaRessource(id, appel, copier);
      if (fait.etat.etat !== 'refuse') return fait;
      // Un refus rendu par une lecture partie avant `attendreLesImports` suit la règle d'un refus rangé avant l'appel : il se
      // relit après les imports.
      if (avant !== appelsDesImports) continue;
      (appel === 'getVariableByIdAsync' ? refuses.variables : refuses.collections).add(id);
      return fait;
    }
  }

  async function lireLaRessource<T extends object>(
    id: string,
    appel: 'getVariableByIdAsync' | 'getVariableCollectionByIdAsync',
    copier: (ressource: object) => Promise<{ table: T; origine: Origine }>,
  ): Promise<FaitDeRessource<T>> {
    const provenance = (origine: Origine) => ({ appel: { appel, id }, origine }) as const;
    let ressource: object | null;
    try {
      ressource = await options.lectures()[appel](id);
    } catch (erreur) {
      if (options.propager?.(erreur)) throw erreur;
      return { id, provenance: provenance('inconnue'), etat: refuse('leve', messageDErreur(erreur)) };
    }
    if (!ressource) return { id, provenance: provenance('inconnue'), etat: refuse('introuvable') };
    const { table, origine } = await copier(ressource);
    return { id, provenance: provenance(origine), etat: acquis(table) };
  }

  const memoriser = <F>(memoire: Map<string, Promise<F>>, id: string, lecture: () => Promise<F>): Promise<F> => {
    let promesse = memoire.get(id);
    if (!promesse) {
      promesse = lecture();
      memoire.set(id, promesse);
    }
    return promesse;
  };

  const styleNatif = (id: string): Promise<LectureNative<object>> =>
    lireUneFoisParIdentifiant(stylesNatifs, id, () => options.lectures().getStyleByIdAsync?.(id), { propager: options.propager });

  return {
    attendreLesImports: (fin) => {
      appelsDesImports += 1;
      const attente = fin.then(() => undefined, () => undefined);
      imports = attente;
      void attente.then(() => { if (imports === attente) imports = null; });
      for (const id of refuses.variables) variables.delete(id);
      for (const id of refuses.collections) collections.delete(id);
      refuses.variables.clear();
      refuses.collections.clear();
    },
    styleNatif,
    style: (id) => memoriser(styles, id, async () => {
      const lu = await styleNatif(id);
      const provenance = (origine: Origine) => ({ appel: { appel: 'getStyleByIdAsync', id }, origine }) as const;
      if (lu.etat === 'refuse') return { id, provenance: provenance('inconnue'), etat: lu };
      const table: Ecrivable<ChampsDeStyle> = {};
      for (const champ of champsDeStyle) table[champ] = lireUnTexte(lu.natif, champ);
      return { id, provenance: provenance('inconnue'), etat: acquis(table) };
    }),
    maitre: (instance, lecture) =>
      lireUneFoisParIdentifiant(maitres, instance.id, lecture?.lire ?? (() => instance.getMainComponentAsync?.()), { propager: options.propager, reutilise: lecture?.reutilise }),
    faitDuMaitre: async (instance, natif) => {
      const id = texteOuVide(natif, 'id');
      if (typeof id !== 'string') return { id: '', provenance: provenanceDuMaitre(instance, 'inconnue'), etat: id };
      return memoriser(faitsDeMaitre, id, async () => copierLeMaitre(natif, instance, id));
    },
    variable: (id) => memoriser(variables, id, () => lire(id, 'getVariableByIdAsync', async (variable) => {
      const table: Ecrivable<ChampsDeVariable> = {};
      for (const champ of champsDeVariable) table[champ] = lireUnTexte(variable, champ);
      table.remote = lireUnTexte(variable, 'remote', 'boolean');
      return { table, origine: origineDe(table) };
    })),
    collection: (id) => memoriser(collections, id, () => lire(id, 'getVariableCollectionByIdAsync', async (collection) => {
      const table: Ecrivable<ChampsDeCollection> = {};
      for (const champ of champsDeCollection) {
        if (champ === 'modes') table.modes = await copierLesModes(collection, options.cooperation);
        else table[champ] = lireUnTexte(collection, champ);
      }
      table.remote = lireUnTexte(collection, 'remote', 'boolean');
      return { table, origine: origineDe(table) };
    })),
  };
}
