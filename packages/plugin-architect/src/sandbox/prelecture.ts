/**
 * La prélecture à la sélection (lot 16, 16.16) : quand le designer sélectionne un composant et ne touche plus à rien pendant
 * 1 s, le sandbox lance une demande `analyser` d'origine `prelecture`. Elle tourne en mode discret (`analyse.ts`) et promeut son
 * entrée en session : le clic suivant la valide au lieu de tout relire.
 *
 * Ce module ne décide que du moment. Chaque `selectionchange`, `currentpagechange`, `stylechange` et `nodechange` lève le jeton
 * de la prélecture en cours et repart d'un silence de 1 s ; il relance aussi la lecture des libraries toutes les 5 s, pour que
 * la vérification du clic tombe dans la mémoire de Figma (E6), jusqu'à 2 minutes après la sélection, ou jusqu'à la première
 * analyse du designer. Désactivée, une prélecture ne se lance jamais et rien ne se relance : `code.ts` lit le drapeau
 * `UCM_ARCHITECT_PRELECTURE` une seule fois, ici sous `actif`.
 */

/** Le silence qui précède une prélecture : le geste d'un designer qui s'est arrêté. */
export const SILENCE_AVANT_PRELECTURE_MS = 1000;
/** L'intervalle de la relance des libraries : sous les 5 à 10 s que Figma les garde (E6). */
export const RELANCE_DES_LIBRARIES_MS = 5000;
/** La relance des libraries s'arrête 2 minutes après la sélection si le designer n'a rien analysé. */
export const BORNE_DE_LA_RELANCE_MS = 120_000;

export interface DependancesDeLaPrelecture {
  /** Le drapeau du build. Faux : aucune prélecture, aucune relance. */
  readonly actif: boolean;
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
  const { actif, planifier, maintenant } = dependances;
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
      if (!actif) return;
      sujetSelectionne = dependances.aUnSujet();
      relancer();
      armer();
    },
    surChangement() {
      if (!actif) return;
      armer();
    },
    fermer() {
      interrompre();
      arreterLaRelance();
      sujetSelectionne = false;
    },
  };
}
