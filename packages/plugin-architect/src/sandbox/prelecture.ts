/**
 * La prélecture à la sélection (lot 16, 16.16) : quand le designer sélectionne un composant et ne touche plus à rien pendant
 * 1 s, le sandbox lance une demande `analyser` d'origine `prelecture`. Elle tourne en mode discret (`analyse.ts`) et promeut son
 * entrée en session : le clic suivant la valide au lieu de tout relire.
 *
 * Ce module ne décide que du moment. Chaque `selectionchange`, `currentpagechange`, `stylechange` et `nodechange` lève le jeton
 * de la prélecture en cours et repart d'un silence de 1 s ; il relance aussi la lecture des libraries toutes les 5 s, pour que
 * la vérification du clic tombe dans la mémoire de Figma (E6), jusqu'à 2 minutes après la sélection, ou jusqu'à la première
 * analyse du designer.
 *
 * `creerLaPrelectureDesTokens`, en fin de fichier, prépare la même idée pour le relevé du mode Tokens. Ce candidat reste inactif :
 * rien ne l'appelle tant que le mainteneur n'a pas comparé, dans Figma, les interactions avec et sans lui (D5b).
 */
import { AnalyseAnnulee, creerContexteCooperatif, type JetonDAnnulation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { lireLeReleveAcquis, portSansImportParCle, type IssueDeLectureAcquise, type PortDeLecture } from '../lecture';
import type { EspaceDuReleve } from '../modele';

/** Le silence qui précède une prélecture : le geste d'un designer qui s'est arrêté. */
export const SILENCE_AVANT_PRELECTURE_MS = 1000;
/** L'intervalle de la relance des libraries : sous les 5 à 10 s que Figma les garde (E6). */
export const RELANCE_DES_LIBRARIES_MS = 5000;
/** La relance des libraries s'arrête 2 minutes après la sélection si le designer n'a rien analysé. */
export const BORNE_DE_LA_RELANCE_MS = 120_000;

export interface DependancesDeLaPrelecture {
  /** Vrai quand la sélection désigne un jeu de variants ou un composant que le mode Composant analyserait. */
  aUnSujet(): boolean;
  /** Lance la demande `analyser` d'origine `prelecture` ; ne rejette jamais. */
  lancer(): Promise<void>;
  /** Lève le jeton de la prélecture discrète en cours, s'il y en a une. */
  annuler(): void;
  /** L'opération en cours : la relance des libraries se tait pendant une prélecture et une écriture. */
  operationEnCours(): 'prelecture' | 'ecriture' | 'analyse' | null;
  /** Le nombre d'analyses lancées par le designer : une analyse de plus arrête la relance. */
  analysesDuDesigner(): number;
  relancerLesLibraries(): Promise<void>;
  /** Appelle `rappel` dans `ms` ms ; rend l'annulation. Les tests donnent une horloge qu'ils avancent à la main. */
  planifier(rappel: () => void, ms: number): () => void;
  maintenant(): number;
}

export interface Prelecture {
  /** `selectionchange`, ou `currentpagechange` qui le suit : la sélection a peut-être un autre sujet. */
  surSelection(): void;
  /** `nodechange` ou `stylechange` : le silence reprend, sur la même sélection. */
  surChangement(): void;
  /** Fermeture du plugin : plus aucune minuterie. */
  fermer(): void;
}

export function creerLaPrelecture(dependances: DependancesDeLaPrelecture): Prelecture {
  const { planifier, maintenant } = dependances;
  let sujetSelectionne = false;
  let finDuSilence: (() => void) | null = null;
  let finDeLaRelance: (() => void) | null = null;

  const interrompre = (): void => {
    dependances.annuler();
    finDuSilence?.();
    finDuSilence = null;
  };

  const armer = (): void => {
    interrompre();
    if (!sujetSelectionne) return;
    finDuSilence = planifier(() => {
      finDuSilence = null;
      void dependances.lancer();
    }, SILENCE_AVANT_PRELECTURE_MS);
  };

  const arreterLaRelance = (): void => {
    finDeLaRelance?.();
    finDeLaRelance = null;
  };

  const relancer = (): void => {
    arreterLaRelance();
    if (!sujetSelectionne) return;
    const debut = maintenant();
    const analyses = dependances.analysesDuDesigner();
    const tic = (): void => {
      finDeLaRelance = planifier(() => {
        finDeLaRelance = null;
        if (maintenant() - debut >= BORNE_DE_LA_RELANCE_MS || dependances.analysesDuDesigner() !== analyses) return;
        const operation = dependances.operationEnCours();
        if (operation === null) void dependances.relancerLesLibraries();
        tic();
      }, RELANCE_DES_LIBRARIES_MS);
    };
    tic();
  };

  return {
    surSelection() {
      sujetSelectionne = dependances.aUnSujet();
      relancer();
      armer();
    },
    surChangement() {
      armer();
    },
    fermer() {
      interrompre();
      arreterLaRelance();
      sujetSelectionne = false;
    },
  };
}

/** Le calcul que la prélecture des Tokens enchaîne entre deux cessions, comme l'analyse du mode Composant. */
export const BUDGET_DE_LA_PRELECTURE_DES_TOKENS_MS = 50;

export interface DependancesDeLaPrelectureDesTokens {
  readonly port: PortDeLecture;
  /** Le nom du fichier et l'espace du profil, lus à chaque lecture : le designer peut les changer entre deux sélections. */
  fichier(): string;
  espace(): EspaceDuReleve;
  /** Rend la main au sandbox : c'est la cession. Une attente d'API ne la remplace pas, car Figma ne rend pas la main à l'interface pendant qu'elle attend. */
  respirer(): Promise<void>;
  /** Vrai quand une demande du designer attend (Composant, Actualiser, écriture) : la prélecture lui laisse la place à la cession suivante. */
  demandePrioritaire(): boolean;
  /** Change à chaque écriture de variable et à chaque Actualiser (`reperDesLectures`) : un candidat lu sous un autre repère est jeté. */
  repere(): string;
  maintenant(): number;
}

/** Ce qu'une prélecture des Tokens a lu : l'état avant `separerLesModes`, comme l'acquisition d'Actualiser. Il ne sert qu'à la mesure de D5b. */
export type CandidatDeTokens = Extract<IssueDeLectureAcquise, { statut: 'lu' }>;

export interface PrelectureDesTokens {
  /** Lance la lecture coopérative et remplace celle qui court. Ne rejette jamais. */
  lancer(): Promise<void>;
  /** `nodechange`, `stylechange` ou sélection : la lecture qui court s'arrête et le candidat est jeté. */
  surChangement(): void;
  /** Une demande du designer vient d'arriver : la lecture qui court s'arrête à sa prochaine cession, le candidat reste jugé au clic. */
  cederLaPlace(): void;
  /** Le candidat lu sans événement, écriture ni demande depuis. Il sert à comparer les sorties (D5b), jamais à répondre. */
  candidat(): CandidatDeTokens | null;
  /**
   * Ce que le clic sur Actualiser reprend : toujours `null`. Figma n'émet aucun événement quand une variable change : aucune
   * preuve de fraîcheur n'existe, donc le clic relit Figma.
   */
  reprendreAuClic(): null;
  /** Fermeture du plugin : la lecture s'arrête et rien n'est gardé. */
  fermer(): void;
}

/**
 * Le port de lecture dont chaque réponse passe par une cession explicite, et qui refuse l'import par clé (`portSansImportParCle`).
 */
function portCooperatif(port: PortDeLecture, ceder: () => Promise<void>): PortDeLecture {
  const apres = async <T>(lecture: Promise<T>): Promise<T> => {
    const rendu = await lecture;
    await ceder();
    return rendu;
  };
  return {
    ...portSansImportParCle(port),
    getLocalVariableCollectionsAsync: () => apres(port.getLocalVariableCollectionsAsync()),
    getLocalVariablesAsync: () => apres(port.getLocalVariablesAsync()),
    getVariableByIdAsync: (id) => apres(port.getVariableByIdAsync(id)),
    getVariableCollectionByIdAsync: (id) => apres(port.getVariableCollectionByIdAsync(id)),
  };
}

export function creerLaPrelectureDesTokens(dependances: DependancesDeLaPrelectureDesTokens): PrelectureDesTokens {
  let courante: { readonly jeton: { leve: boolean } } | null = null;
  let garde: CandidatDeTokens | null = null;
  let repereDuCandidat: string | null = null;

  const jeter = (): void => {
    garde = null;
    repereDuCandidat = null;
  };
  const arreter = (): void => {
    if (courante) courante.jeton.leve = true;
    courante = null;
  };

  return {
    async lancer() {
      arreter();
      jeter();
      const jeton: { leve: boolean } & JetonDAnnulation = { leve: false };
      const sienne = { jeton };
      courante = sienne;
      const repere = dependances.repere();
      const cooperation = creerContexteCooperatif({
        respirer: () => dependances.respirer(),
        budgetDeCalculMs: BUDGET_DE_LA_PRELECTURE_DES_TOKENS_MS,
        horloge: dependances.maintenant,
        jeton,
      });
      const ceder = async (): Promise<void> => {
        // La place appartient au designer : sa demande arrête la lecture avant la cession qui la rendrait.
        if (dependances.demandePrioritaire()) jeton.leve = true;
        await cooperation.cederSiBesoin();
      };
      try {
        const issue = await lireLeReleveAcquis(
          portCooperatif(dependances.port, ceder), dependances.fichier(), 0, { annulee: () => jeton.leve }, dependances.maintenant, dependances.espace(),
        );
        cooperation.verifier();
        if (issue.statut !== 'lu' || courante !== sienne || dependances.repere() !== repere) return;
        garde = issue;
        repereDuCandidat = repere;
      } catch (erreur) {
        // Une annulation et une erreur de Figma ont le même effet : aucun candidat, et le clic lit comme avant.
        if (!(erreur instanceof AnalyseAnnulee)) jeter();
      } finally {
        if (courante === sienne) courante = null;
      }
    },
    surChangement() {
      arreter();
      jeter();
    },
    cederLaPlace() {
      arreter();
    },
    candidat() {
      return garde !== null && repereDuCandidat === dependances.repere() ? garde : null;
    },
    reprendreAuClic() {
      return null;
    },
    fermer() {
      arreter();
      jeter();
    },
  };
}
