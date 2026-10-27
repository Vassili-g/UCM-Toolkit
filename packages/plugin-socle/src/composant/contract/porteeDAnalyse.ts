/**
 * La portée d'une analyse : ce que `handleExportComponent` garde le temps d'un
 * export, et oublie à la fin.
 *
 * Aucune signature de `src/composant/contract/` ne transporte ces mémoires : chaque
 * fonction qui en profite les lit ici, et une fonction appelée hors de toute
 * portée calcule sans mémoire. Le résultat est le même dans les deux cas ; seul
 * le nombre d'allers-retours vers Figma change.
 */
import { lireLesPeintures, lireLesSegments, lireUnChamp, projeterLesPlages, type ChampDePeinture, type EtatDesSegments, type ValeurScalaire } from '../analyse/acquisition';
import { acquis, cleDeSegments, type ChampDeSegment, type EtatEcrit, type PeintureLue } from '../analyse/faits';
import { lireUneFoisParIdentifiant, type LectureNative, type MemoireDeRessources } from '../analyse/ressources';
import { compter, attendrePourLaMesure, mesurerLeCalcul } from './mesure';

/**
 * Le jeton qu'un appelant lève pour demander l'arrêt de l'analyse : une
 * seconde demande, un changement de sujet. L'analyse le lit entre deux variants
 * et aux points de respiration ; elle ne l'écoute pas pendant un bloc qu'elle
 * calcule sans rendre la main.
 */
export type JetonDAnnulation = { readonly leve: boolean };

/** Levée au point de contrôle qui voit le jeton levé ; `analyserLeComposant` la rend en résultat. */
export class AnalyseAnnulee extends Error {
  constructor() {
    super('analyse annulée');
    this.name = 'AnalyseAnnulee';
  }
}

/** Lève `AnalyseAnnulee` si le jeton est levé ; sans jeton, ne fait rien. */
export function verifierLAnnulation(jeton?: JetonDAnnulation): void {
  if (jeton?.leve) throw new AnalyseAnnulee();
}

/** Ce qu'une analyse injecte pour céder la main : horloge, pause, budget et jeton. */
export interface OptionsDeCooperation {
  /** Rend la main au sandbox, et lève si l'analyse est annulée. */
  readonly respirer?: () => Promise<void>;
  readonly jeton?: JetonDAnnulation;
  readonly horloge?: () => number;
  readonly budgetDeCalculMs?: number;
}

export interface ContexteCooperatif {
  /** Lève `AnalyseAnnulee` si le jeton est levé. */
  verifier(): void;
  /** Rend la main si le budget est écoulé ; relit le jeton avant et après la pause. */
  cederSiBesoin(): Promise<void> | void;
  /**
   * Vrai quand `cederSiBesoin` céderait ou lèverait : budget écoulé avec une pause injectée, ou jeton levé. Un pilote
   * synchrone le consulte entre deux étapes pour s'arrêter au budget plutôt qu'après un nombre fixe d'étapes.
   */
  doitCeder(): boolean;
}

/**
 * Un budget de calcul que les boucles et les variants se partagent. Le jeton se
 * relit après la pause, pas au prochain appel : une annulation levée pendant la
 * pause arrête le calcul avant l'unité suivante. Une attente Figma reste
 * indivisible.
 */
export function creerContexteCooperatif(options: OptionsDeCooperation = {}): ContexteCooperatif {
  const horloge = options.horloge ?? (() => Date.now());
  const budget = options.budgetDeCalculMs ?? BUDGET_DE_CALCUL_MS;
  let derniereCession = horloge();
  const verifier = () => verifierLAnnulation(options.jeton);
  return {
    verifier,
    cederSiBesoin() {
      verifier();
      if (!options.respirer || horloge() - derniereCession < budget) return;
      compter('respirations');
      return attendrePourLaMesure(() => options.respirer!(), 'cession').then(() => {
        verifier();
        derniereCession = horloge();
      });
    },
    doitCeder() {
      return options.jeton?.leve === true || (options.respirer !== undefined && horloge() - derniereCession >= budget);
    },
  };
}

type ContexteMemorise = {
  iconNames: ReadonlySet<string>;
  composed: ReadonlyMap<string, object>;
  valeur: unknown;
};

type Portee = {
  /**
   * La mémoire de ressources de la demande d'Architect, quand elle en a une : maîtres et styles s'y lisent alors, et la
   * portée ne garde rien d'eux. Le relevé et les dépendances y ont déjà lu les mêmes.
   */
  ressources?: MemoireDeRessources;
  /** Le maître de chaque instance déjà demandée, par id d'instance, refus compris. */
  maitres: Map<string, Promise<LectureNative<object>>>;
  /** Le style de chaque identifiant déjà demandé, refus compris. */
  styles: Map<string, Promise<LectureNative<object>>>;
  /** Les peintures copiées de chaque champ de chaque nœud, par id de nœud et champ, refus compris. */
  peintures: Map<string, EtatEcrit<readonly PeintureLue[]>>;
  /** Les champs lus de chaque nœud, par id de nœud puis champ, tels que Figma les a rendus. Une lecture qui lève n'y entre pas. */
  champs: Map<string, Map<string, unknown>>;
  /** Les plages lues de chaque nœud texte pour un jeu de champs, par id de nœud et `cleDeSegments`, refus compris. */
  segments: Map<string, EtatDesSegments>;
  /** Le parcours brut de chaque racine, par id : tous ses descendants, avant frontière ni filtre de visibilité. */
  parcours: Map<string, readonly SceneNode[]>;
  /** Les chemins de texte de chaque racine, par id, avec le contexte complet qui les a produits. */
  chemins: Map<string, ContexteMemorise[]>;
  /** Le parcours rendable de chaque racine, par id, avec le contenu de `composed` qui l'a filtré. */
  filtres: Map<string, Array<{ composed: ReadonlyMap<string, object>; valeur: unknown }>>;
  cooperation: ContexteCooperatif;
};

/**
 * Le calcul qu'une analyse enchaîne sans rendre la main.
 *
 * Le sandbox n'a qu'un fil : tant que l'analyse calcule, un changement de
 * sélection n'est pas lu, et l'annulation coopérative de `code.ts` attend la
 * fin de l'étape. Ce seuil se vérifie aux points de respiration ; un bloc
 * synchrone ou un appel Figma peut le dépasser.
 */
export const BUDGET_DE_CALCUL_MS = 25;

let portee: Portee | null = null;
let porteesRefusees = 0;
let desactivee = false;

/**
 * Exécute `corps` dans une portée d'analyse.
 *
 * Une seule portée est ouverte à la fois : `code.ts` refuse déjà une seconde
 * opération. Une ouverture pendant qu'une portée est ouverte exécute `corps`,
 * et la mémoire comme les respirations se taisent pour tous tant qu'il court.
 * Le sandbox ne fournit aucun contexte asynchrone pour identifier l'appelant.
 * Le refus persiste même si la première portée se ferme avant lui.
 */
export async function dansUnePorteeDAnalyse<T>(
  options: OptionsDeCooperation & { cooperation?: ContexteCooperatif; inventaires?: { readonly ressources?: MemoireDeRessources } },
  corps: () => Promise<T>,
): Promise<T> {
  if (portee || porteesRefusees > 0) {
    compter('porteeRefusee');
    porteesRefusees += 1;
    try {
      return await corps();
    } finally {
      porteesRefusees -= 1;
    }
  }
  const ouverte: Portee = {
    ressources: options.inventaires?.ressources,
    maitres: new Map(),
    styles: new Map(),
    peintures: new Map(),
    champs: new Map(),
    segments: new Map(),
    parcours: new Map(),
    chemins: new Map(),
    filtres: new Map(),
    cooperation: options.cooperation ?? creerContexteCooperatif(options),
  };
  portee = ouverte;
  try {
    return await corps();
  } finally {
    if (portee === ouverte) portee = null;
  }
}

/**
 * Le maître d'une instance, ou null quand Figma ne le sert pas.
 *
 * `getMainComponentAsync` lève sur une instance orpheline, et une méthode
 * absente vaut une instance orpheline : aucun des appelants ne fait échouer
 * l'export pour un node cassé. Dans une portée, chaque id d'instance n'est
 * demandé qu'une fois, et une fois pour toute la demande d'Architect quand la
 * portée reçoit sa mémoire de ressources (celle du relevé et des dépendances).
 */
export function maitreDe(instance: InstanceNode): Promise<ComponentNode | null> {
  const portee = porteeQuiMemorise();
  const lire = () => {
    if (typeof instance.getMainComponentAsync !== 'function') return undefined;
    compter('appelsGetMainComponentAsync');
    return attendrePourLaMesure(() => instance.getMainComponentAsync(), 'parallele', undefined, 'getMainComponentAsync');
  };
  const reutilise = () => compter('maitresReutilises');
  const lecture = portee?.ressources
    ? portee.ressources.maitre(instance, { lire, reutilise })
    : lireUneFoisParIdentifiant(typeof instance.id === 'string' ? portee?.maitres : undefined, instance.id, lire, { reutilise });
  return lecture.then((lu) => (lu.etat === 'lu' ? lu.natif as ComponentNode : null));
}

/**
 * Le style d'un identifiant, ou null quand Figma ne le sert pas ou qu'il lève. Dans une portée, chaque identifiant n'est
 * demandé qu'une fois : le moteur lit un même style de texte pour la typographie de référence, puis pour l'exacte.
 * Chaque appelant garde son traitement d'un style absent ou de mauvais type.
 */
export function styleDeLaPortee(id: string): Promise<BaseStyle | null> {
  const portee = porteeQuiMemorise();
  return (portee?.ressources ? portee.ressources.styleNatif(id) : lireUneFoisParIdentifiant(portee?.styles, id, () => figma.getStyleByIdAsync(id)))
    .then((lu) => (lu.etat === 'lu' ? lu.natif as BaseStyle : null));
}

/**
 * Les peintures copiées d'un nœud (`fills` ou `strokes`). Dans une portée, chaque champ de chaque nœud se lit une fois :
 * l'extraction des couleurs et celle des propriétés non portées lisent les mêmes peintures. Chaque appelant garde son
 * traitement d'une valeur mixte ou refusée.
 */
export function peinturesDuNoeud(noeud: { readonly id?: unknown }, champ: ChampDePeinture): EtatEcrit<readonly PeintureLue[]> {
  const memoire = typeof noeud.id === 'string' ? porteeQuiMemorise()?.peintures : undefined;
  const cle = `${noeud.id} ${champ}`;
  const deja = memoire?.get(cle);
  if (deja) return deja;
  const lu = lireLesPeintures(noeud, champ);
  memoire?.set(cle, lu);
  return lu;
}

/**
 * La valeur d'un champ du nœud, ce que rend `noeud[champ]`. Dans une portée, chaque champ de chaque nœud se lit une fois :
 * le moteur relit sans cesse `name`, `layoutMode` et `boundVariables` du même nœud, et Figma facture chaque lecture.
 * Une valeur absente (`undefined`) se mémorise aussi. Une lecture qui lève lève comme avant et n'est pas mémorisée.
 *
 * La valeur est partagée entre les lecteurs, là où Figma rendait une copie neuve de `boundVariables` à chaque lecture :
 * un appelant ne la modifie pas, ni elle ni ses alias. Un appelant qui veut la modifier la copie d'abord.
 */
export function champDuNoeud<T = unknown>(noeud: object, champ: string): T {
  const ouverte = porteeQuiMemorise();
  const id = ouverte ? (noeud as { readonly id?: unknown }).id : undefined;
  if (!ouverte || typeof id !== 'string') return (noeud as Record<string, T>)[champ];
  let champs = ouverte.champs.get(id);
  if (!champs) {
    champs = new Map();
    ouverte.champs.set(id, champs);
  } else if (champs.has(champ)) {
    return champs.get(champ) as T;
  }
  const valeur = (noeud as Record<string, T>)[champ];
  champs.set(champ, valeur);
  return valeur;
}

/** `lireUnChamp` sur la lecture mémorisée de la portée : mêmes états, un accès natif par nœud et champ. */
export function etatDuChamp(noeud: object, champ: string): EtatEcrit<ValeurScalaire> {
  return lireUnChamp(noeud, champ, undefined, champDuNoeud);
}

/**
 * Les plages d'un nœud texte pour `champs`, ce que rend `getStyledTextSegments(champs)`. Dans une portée, le nœud se lit
 * une fois pour tout `groupe` (qui contient `champs`), et chaque appelant en projette ses champs : deux lecteurs qui
 * demandent des champs différents au même nœud partagent un seul appel natif. Hors portée, ou sans identifiant de
 * nœud, `champs` se lit seul, comme avant. Chaque appelant garde son traitement d'un refus (méthode absente, appel qui lève).
 */
export function plagesDuNoeud(noeud: { readonly id?: unknown }, champs: readonly ChampDeSegment[], groupe: readonly ChampDeSegment[]): EtatDesSegments {
  const memoire = typeof noeud.id === 'string' ? porteeQuiMemorise()?.segments : undefined;
  if (!memoire) return lireLesSegments(noeud, champs);
  const cle = `${noeud.id} ${cleDeSegments(groupe)}`;
  let lu = memoire.get(cle);
  if (!lu) {
    lu = lireLesSegments(noeud, groupe);
    memoire.set(cle, lu);
  }
  return lu.etat === 'acquis' ? acquis(projeterLesPlages(lu.valeur, champs)) : lu;
}

/** La portée qui garde ses mémoires, ou null : hors portée, portée refusée en cours, ou banc sans mémoire. */
function porteeQuiMemorise(): Portee | null {
  return portee && porteesRefusees === 0 && !desactivee ? portee : null;
}

/**
 * Tous les descendants d'une racine, dans l'ordre de `findAll`, sans la racine.
 *
 * Le relevé natif de Figma ne dépend ni des frontières composées ni de la
 * visibilité : il est lu une fois par racine et par portée, et chaque appelant
 * applique ensuite son propre contexte sur le tableau rendu, qu'il ne modifie pas.
 * Un node sans `findAll` n'a pas de descendants. Seul le relevé effectif
 * compte dans `nodesParcourus`, un relevé repris compte dans `parcoursReutilises`.
 * Une exception de `findAll` traverse : rien n'est mémorisé et l'appelant la voit.
 */
export function descendantsBruts(racine: SceneNode): readonly SceneNode[] {
  if (!('findAll' in racine)) return [];
  const memoire = typeof racine.id === 'string' ? porteeQuiMemorise()?.parcours : undefined;
  const deja = memoire?.get(racine.id);
  if (deja) {
    compter('parcoursReutilises');
    return deja;
  }
  const descendants = racine.findAll(() => true);
  compter('nodesParcourus', descendants.length);
  memoire?.set(racine.id, descendants);
  return descendants;
}

/** Vrai si les deux ensembles ont les mêmes éléments. */
function memesNoms(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const nom of a) if (!b.has(nom)) return false;
  return true;
}

/** Vrai si les deux tables portent les mêmes ids et, pour chacun, une dépendance de mêmes champs. */
function memesDependances(a: ReadonlyMap<string, object>, b: ReadonlyMap<string, object>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const [id, x] of a) {
    const y = b.get(id) as Record<string, unknown> | undefined;
    if (!y) return false;
    if (x === y) continue;
    const champs = Object.keys(x);
    if (champs.length !== Object.keys(y).length) return false;
    for (const champ of champs) if ((x as Record<string, unknown>)[champ] !== y[champ]) return false;
  }
  return true;
}

/**
 * Les chemins de texte déjà calculés pour cette racine dans ce contexte complet, ou undefined.
 *
 * Le contexte est la paire `iconNames` et `composed`, comparée par contenu : deux appels qui construisent
 * chacun leurs ensembles reprennent la même valeur, et un contexte qui diffère par un nom ou une dépendance
 * ne la reprend jamais. La valeur rendue est celle qu'a rangée `memoriserLesChemins`, sans copie.
 */
export function cheminsMemorises<T>(
  racine: SceneNode,
  iconNames: ReadonlySet<string>,
  composed: ReadonlyMap<string, object>,
): T | undefined {
  const connus = typeof racine.id === 'string' ? porteeQuiMemorise()?.chemins.get(racine.id) : undefined;
  const trouve = connus?.find((c) => memesNoms(c.iconNames, iconNames) && memesDependances(c.composed, composed));
  if (!trouve) return undefined;
  compter('cheminsDeTexteReutilises');
  return trouve.valeur as T;
}

/**
 * Range les chemins d'une racine pour son contexte. `iconNames` et `composed` sont recopiés : un appelant
 * qui les modifie ensuite ne change pas la clé. Sans effet hors portée.
 */
export function memoriserLesChemins(
  racine: SceneNode,
  iconNames: ReadonlySet<string>,
  composed: ReadonlyMap<string, object>,
  valeur: unknown,
): void {
  const memoire = typeof racine.id === 'string' ? porteeQuiMemorise()?.chemins : undefined;
  if (!memoire) return;
  const connus = memoire.get(racine.id) ?? [];
  connus.push({ iconNames: new Set(iconNames), composed: new Map(composed), valeur });
  memoire.set(racine.id, connus);
}

/**
 * Le parcours rendable déjà filtré pour cette racine et ce contenu de `composed`, ou undefined.
 *
 * Seul le contenu de `composed` entre dans la clé : le filtre ne lit ni les noms d'icônes ni le canal de
 * diagnostics. La valeur est rendue telle que `memoriserLeParcoursFiltre` l'a rangée, sans copie.
 */
export function parcoursFiltreMemorise<T>(racine: SceneNode, composed: ReadonlyMap<string, object>): T | undefined {
  const connus = typeof racine.id === 'string' ? porteeQuiMemorise()?.filtres.get(racine.id) : undefined;
  const trouve = connus?.find((c) => memesDependances(c.composed, composed));
  if (!trouve) return undefined;
  compter('parcoursFiltresReutilises');
  return trouve.valeur as T;
}

/** Range le parcours rendable d'une racine pour son `composed`, recopié. Sans effet hors portée. */
export function memoriserLeParcoursFiltre(racine: SceneNode, composed: ReadonlyMap<string, object>, valeur: unknown): void {
  const memoire = typeof racine.id === 'string' ? porteeQuiMemorise()?.filtres : undefined;
  if (!memoire) return;
  const connus = memoire.get(racine.id) ?? [];
  connus.push({ composed: new Map(composed), valeur });
  memoire.set(racine.id, connus);
}

/**
 * Rend la main si le budget de calcul est écoulé ; sans effet hors portée, ou
 * dans une portée ouverte sans `respirer` ni jeton levé. Le jeton se lit à
 * chaque appel, avant le budget de calcul : il coûte une lecture.
 *
 * `respirer` lève sur une analyse annulée : l'exception traverse la boucle qui
 * respire, et la portée se ferme dans son `finally`.
 */
export async function respirerSiBesoin(): Promise<void> {
  const ouverte = portee;
  if (!ouverte || porteesRefusees > 0) return;
  await ouverte.cooperation.cederSiBesoin();
}

/**
 * Épuise un calcul par étapes dans la portée de l'analyse courante. Une tranche enchaîne les étapes jusqu'à ce que
 * le budget soit écoulé ou le jeton levé (`doitCeder`), puis cède : une étape peut couvrir bien des entrées, un
 * nombre fixe d'étapes par tranche ne bornerait pas sa durée. Hors portée, le calcul va jusqu'au bout.
 */
export async function calculerParTranches<T>(calcul: Generator<void, T>): Promise<T> {
  let fin: IteratorResult<void, T> | null = null;
  try {
    while (!fin) {
      await respirerSiBesoin();
      fin = mesurerLeCalcul(() => {
        for (;;) {
          const suivant = calcul.next();
          if (suivant.done) return suivant;
          const ouverte = portee;
          if (ouverte && porteesRefusees === 0 && ouverte.cooperation.doitCeder()) return null;
        }
      });
    }
    return fin.value as T;
  } finally {
    if (!fin) calcul.return(undefined as T);
  }
}

/**
 * Réservé au banc de parité (`tests/paritePerformance.test.ts`) : vrai, la
 * portée s'ouvre sans rien garder, et l'export calcule comme hors portée.
 */
export function desactiverLaPorteePourLeBanc(valeur: boolean): void {
  desactivee = valeur;
}
