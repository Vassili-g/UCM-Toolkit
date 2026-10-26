/**
 * La portée d'une analyse : ce que `handleExportComponent` garde le temps d'un
 * export, et oublie à la fin.
 *
 * Aucune signature de `src/composant/contract/` ne transporte ces mémoires : chaque
 * fonction qui en profite les lit ici, et une fonction appelée hors de toute
 * portée calcule sans mémoire. Le résultat est le même dans les deux cas ; seul
 * le nombre d'allers-retours vers Figma change.
 */
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

type Portee = {
  /** Le maître de chaque instance déjà demandée, par id d'instance. */
  maitres: Map<string, Promise<ComponentNode | null>>;
  /** Le parcours brut de chaque racine, par id : tous ses descendants, avant frontière ni filtre de visibilité. */
  parcours: Map<string, readonly SceneNode[]>;
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
  options: OptionsDeCooperation & { cooperation?: ContexteCooperatif },
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
    maitres: new Map(),
    parcours: new Map(),
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
 * demandé qu'une fois.
 */
export function maitreDe(instance: InstanceNode): Promise<ComponentNode | null> {
  const memoire = typeof instance.id === 'string' ? porteeQuiMemorise()?.maitres : undefined;
  const deja = memoire?.get(instance.id);
  if (deja) {
    compter('maitresReutilises');
    return deja;
  }
  const lecture = lireLeMaitre(instance);
  memoire?.set(instance.id, lecture);
  return lecture;
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

function lireLeMaitre(instance: InstanceNode): Promise<ComponentNode | null> {
  if (typeof instance.getMainComponentAsync !== 'function') return Promise.resolve(null);
  compter('appelsGetMainComponentAsync');
  try {
    return instance.getMainComponentAsync().catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
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
