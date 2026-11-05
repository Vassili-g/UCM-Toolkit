/**
 * La session du sandbox : elle garde l'inventaire, les règles du fichier et, selon qui a mené le calcul, l'état complet (lexique, vocabulaire
 * indexé, résultat, questions), et n'envoie à l'écran que le `Bilan` et les pages demandées.
 *
 * Protocole (voir le plan de la refonte, « Règles du protocole ») :
 * - les calculs passent un à un ; `analyser` et `configurer` ne gardent que leur dernière demande, et une demande
 *   plus récente de même sorte abandonne le calcul en cours à la tranche suivante, sans réponse pour lui ;
 * - les lectures répondent sur la génération courante et n'attendent aucun calcul ;
 * - chaque calcul abouti change de génération et se termine par un `bilan`, un `refus` ou une `erreur`,
 *   sauf une application ou une annulation refusée, qui répond par `application` seule.
 *
 * Deux voies mènent le calcul des noms (lexique, renommages, questions, projection, dans `calcul.ts`, pur et sans Figma) :
 * - le Worker de l'écran, par le port `calcul` : il garde l'état complet de la génération (`atelier.ts`) et répond aux lectures, aux simulations,
 *   aux préparations de geste et aux recalculs ; la session ne garde alors que l'entrée du calcul (`distant`) ;
 * - le sandbox, par tranches, quand le port manque ou se replie : la session garde l'état complet (`etat`). Un travail que le Worker n'a pas rendu
 *   refait le calcul de la génération courante dans le sandbox (`completerLEtat`), puis la session reste sur cette voie jusqu'à la prochaine analyse.
 * Le sandbox lit, relit et écrit seul les objets de Figma et le stockage des règles. `Moteur` permet à un test de compter les appels du kit.
 */
import { type Inventaire } from '@ucm-kit/core/nommage';
import {
  annulerLeDernierRenommage, appliquerLesRenommages, reglesFuturesDuStockage,
  type PortDeRegles, type PortEcriture, type RenommageDemande, type ResultatEcriture,
} from '../ecriture/noms';
import { chronometrerUnAppel, mesurerUnePhaseDeTokens, noterUnPassageDeTokens, type AppelsDePhase, type PhaseDeTokens } from '../lecture';
import { lireInventaire, type PortDeLecture } from './lecture';
import type {
  Bilan, CodeDErreur, DemandeDeNomenclature, MessageDeNomenclature, ResultatVue, Selection,
} from '../messages/nomenclature';
import type { CauseDeRepli, DemandeDeLecture, RenommageAEcrire, ResultatDuTravail, TravailDePreparation, TravailDesNoms } from '../messages/calculDesNoms';
import type { PortDeCalculDistant } from './distant';
import {
  calculerTout, construireEtat, moteurDuKit, motsDe, motsDuTermeUcm, premierLancement, recalculer,
  type Calcul, type Etat, type Moteur,
} from './calcul';
import {
  ErreurDeProtocole, conclureLaSimulation, debuterLaSimulation, employe, messageDeSimulation, preparerLeGeste,
  renommagesDeLaSelection, repondreALaLecture,
  type PreparationDeGeste,
} from './gestes';
import {
  exporterLesRegles, importerLesRegles, lireLesRegles, lireLeStockage, preparerImport, rangerLesEcritures, serialiserRegle,
  type ReglesDuFichier,
} from './regles';
import { conflitVue } from './projection';
import { mener, pauseParDefaut, type MesureDeTranches, type OptionsDeTranches, type ResultatDeTranches } from './tranches';

export { employe, motsDe, motsDuTermeUcm, moteurDuKit, type Moteur };

/**
 * Mène `interne` pas à pas en notant au journal du mode Tokens sa phase : début, fin, temps passé à calculer et plus long pas.
 * Deux lectures de l'horloge par pas, jamais une par variable. Le passage se note aussi quand le calcul est abandonné ou lève.
 */
function* chronometrer<T>(phase: PhaseDeTokens, demande: number, interne: Generator<void, T>): Generator<void, T> {
  const debut = Date.now();
  let actifMs = 0;
  let pasMaxMs = 0;
  try {
    for (;;) {
      const avant = Date.now();
      const etape = interne.next();
      const pas = Date.now() - avant;
      actifMs += pas;
      if (pas > pasMaxMs) pasMaxMs = pas;
      if (etape.done) return etape.value;
      yield;
    }
  } finally {
    interne.return(undefined as never);
    noterUnPassageDeTokens({ phase, debut, fin: Date.now(), demande, actifMs, pasMaxMs });
  }
}

/** Le moteur dont le lexique, les renommages et les questions se notent au journal sous la demande `demande` ; ses résultats ne changent pas. */
function moteurMesure(moteur: Moteur, demande: number): Moteur {
  return {
    ...moteur,
    commencerLexique: (options) => {
      const preparation = moteur.commencerLexique(options);
      return { ...preparation, ajouter: (noms) => preparation.ajouter(noms), terminer: () => chronometrer('lexique', demande, preparation.terminer()) };
    },
    normaliserParEtapes: (lexique, conventions, index, options) => chronometrer('renommages', demande, moteur.normaliserParEtapes(lexique, conventions, index, options)),
    detecterParEtapes: (lexique, index, dejaJuge, options) => chronometrer('questions', demande, moteur.detecterParEtapes(lexique, index, dejaJuge, options)),
  };
}

export interface PortDeSession {
  readonly lecture: PortDeLecture;
  readonly ecriture: PortEcriture;
  readonly regles: PortDeRegles;
}

export interface OptionsDeSession {
  readonly port: PortDeSession;
  readonly envoyer: (message: MessageDeNomenclature) => void;
  readonly moteur?: Moteur;
  /**
   * Le Worker qui garde l'état et mène les calculs, les lectures et les simulations hors du sandbox. Sans lui, ou quand il se replie, la session
   * travaille elle-même : par tranches pour un calcul, sur son état complet pour une lecture. Après un bilan du Worker, la session ne garde que
   * l'entrée du calcul ; elle refait le calcul complet seulement si le Worker ne répond plus à un travail.
   */
  readonly calcul?: PortDeCalculDistant;
  readonly tranches?: OptionsDeTranches;
  /** Heure du journal ; l'heure courante par défaut. */
  readonly heure?: () => string;
}

export interface Session {
  /** Traite une demande de l'écran ; la promesse se résout quand la demande est répondue ou écartée. */
  recevoir(demande: DemandeDeNomenclature): Promise<void>;
}

type DemandeDeCalcul = Extract<DemandeDeNomenclature, { type: 'noms-analyser' | 'regle' | 'noms-repondre' | 'configurer' | 'importer' | 'appliquer' | 'annuler-dernier' }>;
const TYPES_DE_CALCUL: ReadonlySet<DemandeDeNomenclature['type']> = new Set(['noms-analyser', 'regle', 'noms-repondre', 'configurer', 'importer', 'appliquer', 'annuler-dernier']);
/** Pour ces calculs, une demande plus récente de même sorte écarte la précédente. */
const DERNIERE_INTENTION: ReadonlySet<DemandeDeNomenclature['type']> = new Set(['noms-analyser', 'configurer']);

// Les règles qui comptent pour le calcul

/**
 * Ce qu'`appliquer` compare : les règles qui changent les renommages proposés. Les termes ordinaires changent les frontières
 * des termes, et la reprise de l'écriture de la v1 libère les variables de Palettes.
 */
const signatureDuCalcul = (regles: ReglesDuFichier): string =>
  JSON.stringify([regles.ecriture ?? null, regles.ecritureDeLaV1, regles.termes, regles.ecartsUcm, regles.ordinaires, regles.collectionsExclues, regles.collectionsRenommees]);

/** Le fichier a déjà reçu une écriture : l'écran s'ouvre sur le travail plutôt que sur l'invitation. */
export function fichierDejaAnalyse(port: PortDeRegles): boolean {
  try {
    return !premierLancement(lireLesRegles(lireLeStockage(port)));
  } catch {
    return false;
  }
}

// Les renommages à écrire

type EntreeDInventaire = Inventaire['entrees'][number];

/** Le renommage que le sandbox demandera à l'écriture : l'objet de Figma que l'entrée désigne, avec l'ancien et le nouveau nom. */
function demandeDeRenommage(renommage: RenommageAEcrire, entree: EntreeDInventaire): RenommageDemande {
  const commun = { id: renommage.id, ancienNom: renommage.ancienNom, nouveauNom: renommage.nouveauNom };
  return entree.cible.type === 'collection'
    ? { ...commun, type: 'collection', figmaId: entree.cible.collectionId }
    : { ...commun, type: 'variable', figmaId: entree.cible.variableId, collectionId: entree.cible.collectionId };
}

/** Les renommages de l'état du sandbox ; un identifiant que l'inventaire ne porte plus est laissé de côté. */
function demandesDeRenommage(renommages: readonly RenommageAEcrire[], inventaire: Inventaire): RenommageDemande[] {
  const entrees = new Map(inventaire.entrees.map((entree) => [entree.nom.id, entree]));
  return renommages.flatMap((renommage): RenommageDemande[] => {
    const entree = entrees.get(renommage.id);
    return entree ? [demandeDeRenommage(renommage, entree)] : [];
  });
}

/**
 * Les renommages que le Worker rend, vérifiés contre l'inventaire que le sandbox a lu : chacun doit désigner une entrée de cet inventaire sous
 * l'ancien nom que le Worker annonce. Un seul écart rend `null`, et le sandbox calcule lui-même ce qu'il écrira.
 */
function demandesVerifiees(renommages: readonly RenommageAEcrire[], inventaire: Inventaire): RenommageDemande[] | null {
  const entrees = new Map(inventaire.entrees.map((entree) => [entree.nom.id, entree]));
  const demandes: RenommageDemande[] = [];
  for (const renommage of renommages) {
    const entree = entrees.get(renommage.id);
    if (!entree || entree.nom.nom !== renommage.ancienNom || typeof renommage.nouveauNom !== 'string') return null;
    demandes.push(demandeDeRenommage(renommage, entree));
  }
  return demandes;
}

// La session

interface Passage {
  readonly demande: DemandeDeCalcul;
  readonly fin: () => void;
  abandonne: boolean;
  /** Arrête l'attente du Worker quand une demande plus récente abandonne ce passage. */
  interrompre?: () => void;
}

/** Ce que la session garde d'un calcul que le Worker a mené : l'entrée, sans lexique ni résultat. `complet` est le calcul refait dans le sandbox. */
interface CalculDistant {
  readonly generation: number;
  readonly inventaire: Inventaire;
  readonly regles: ReglesDuFichier;
  complet: Promise<Etat | null> | null;
}

/** Ce que le Worker rend à une requête : un résultat, l'abandon de l'attente, ou la cause du repli (`null` sans Worker). */
type Confie = { readonly resultat: ResultatDuTravail } | 'abandonne' | { readonly repli: CauseDeRepli | null };

/** Les travaux qui créent une génération : le journal les note en entier, avec le passage englobant `calcul-des-noms`. */
const TRAVAUX_DE_CALCUL: ReadonlySet<TravailDesNoms['sorte']> = new Set(['calculer', 'recalculer']);

export function creerSession(options: OptionsDeSession): Session {
  const { port, envoyer } = options;
  const moteur = options.moteur ?? moteurDuKit;
  const tranches = options.tranches ?? {};
  const pause = tranches.pause ?? pauseParDefaut;

  /** L'état complet de la génération courante quand le sandbox l'a calculé. */
  let etat: Etat | null = null;
  /** La génération courante quand le Worker a mené le calcul ; `etat` est alors `null` jusqu'à ce que le Worker manque un travail. */
  let distant: CalculDistant | null = null;
  /** Pourquoi le dernier travail confié au Worker s'est replié, pour le journal du calcul que le sandbox refait. */
  let causeDuRepli: CauseDeRepli | 'relecture' = 'relecture';
  let compteur = 0;
  let enCours: Passage | null = null;
  let tourne = false;
  const attente: Passage[] = [];

  const lireRegles = (): ReglesDuFichier => lireLesRegles(lireLeStockage(port.regles));
  const erreur = (demande: number, code: CodeDErreur): void => envoyer({ type: 'erreur', demande, code });
  const generationCourante = (): number | null => etat?.generation ?? distant?.generation ?? null;
  const envoyerLeBilan = (demande: number, courant: Etat): void => envoyer({ type: 'bilan', demande, bilan: courant.projection.bilan() });

  /** Enregistre l'état d'un calcul abouti et envoie le `bilan` : les groupes du premier lancement sont déjà vus. */
  function valider(demande: number, base: Etat | null, inventaire: Inventaire, regles: ReglesDuFichier, calcul: Calcul): Etat {
    return mesurerUnePhaseDeTokens('bilan', () => validerLeCalcul(demande, base, inventaire, regles, calcul), Date.now, demande);
  }

  function validerLeCalcul(demande: number, base: Etat | null, inventaire: Inventaire, regles: ReglesDuFichier, calcul: Calcul): Etat {
    // Les groupes déjà vus ne changent qu'à l'analyse : un geste garde la pastille « Nouveau » de la session.
    let suivant = construireEtat(++compteur, inventaire, base ? { ...regles, vus: base.regles.vus } : regles, calcul);
    if (base && premierLancement(base.regles) && !premierLancement(regles)) {
      const groupes = suivant.projection.bilan().groupes.map((groupe) => groupe.cle);
      rangerLesEcritures(port.regles, [serialiserRegle({ type: 'vus', groupes })]);
      suivant = construireEtat(suivant.generation, inventaire, lireRegles(), calcul);
    }
    etat = suivant;
    distant = null;
    envoyerLeBilan(demande, suivant);
    return suivant;
  }

  /** La génération `generation` est celle que le Worker a calculée : la session n'en garde que l'entrée. */
  function poserLaGenerationDistante(generation: number, inventaire: Inventaire, regles: ReglesDuFichier): void {
    compteur = generation;
    etat = null;
    distant = { generation, inventaire, regles, complet: null };
    causeDuRepli = 'relecture';
  }

  /** Enregistre la génération que le Worker a calculée et envoie son bilan, tel qu'il l'a rendu. */
  function validerLeCalculDistant(demande: number, inventaire: Inventaire, regles: ReglesDuFichier, bilan: Bilan): void {
    poserLaGenerationDistante(compteur + 1, inventaire, regles);
    envoyer({ type: 'bilan', demande, bilan });
  }

  /**
   * L'état complet de la génération courante, que les gestes et les lectures demandent quand le Worker ne les a pas servis. Quand le Worker a mené
   * le calcul, le sandbox le refait ici, par tranches, la première fois ; les demandes suivantes attendent le même calcul. Rend `null` si la
   * génération change entre-temps.
   */
  function completerLEtat(demande: number): Promise<Etat | null> {
    if (etat) return Promise.resolve(etat);
    const source = distant;
    if (!source) return Promise.resolve(null);
    const cause = causeDuRepli;
    source.complet ??= (async () => {
      const calcul = await menerLeCalculDe(demande, () => distant !== source, (moteurDuPassage) => calculerTout(moteurDuPassage, source.inventaire, source.regles), cause);
      if (calcul.abandonne) return null;
      const complet = construireEtat(source.generation, source.inventaire, source.regles, calcul.valeur);
      if (distant === source) {
        etat = complet;
        distant = null;
      }
      return complet;
    })();
    return source.complet;
  }

  /** L'état complet que le geste de `passage` lit, ou l'erreur de protocole qui le refuse. */
  async function exiger(passage: Passage): Promise<Etat> {
    const complet = await completerLEtat(passage.demande.demande);
    if (!complet) throw new ErreurDeProtocole(generationCourante() === null ? 'echec' : 'generation-perimee');
    return complet;
  }

  /** Relit Figma et refait tout le calcul. */
  function rafraichir(passage: Passage, avecProgression: boolean): Promise<void> {
    return mesurerUnePhaseDeTokens('rafraichir', (appels) => relire(passage, avecProgression, appels), Date.now, passage.demande.demande);
  }

  /**
   * Mène un calcul par tranches et note au journal ses cessions, son attente et sa tranche synchrone la plus longue, avec la voie `sandbox`.
   * `repli` dit pourquoi le Worker n'a pas mené ce calcul.
   */
  async function menerLeCalculDe<T>(
    demande: number, abandonne: () => boolean, calcul: (moteurDuPassage: Moteur) => Generator<void, T>, repli?: CauseDeRepli | 'relecture',
  ): Promise<ResultatDeTranches<T>> {
    const mesure: MesureDeTranches = { cessions: 0, attenteMs: 0, pasMaxMs: 0 };
    const debut = Date.now();
    try {
      return await mener(calcul(moteurMesure(moteur, demande)), abandonne, { ...tranches, mesure });
    } finally {
      noterUnPassageDeTokens({ phase: 'calcul-des-noms', debut, fin: Date.now(), demande, ...mesure, voie: 'sandbox', ...(repli ? { repli } : {}) });
    }
  }

  const menerLeCalcul = <T>(passage: Passage, calcul: (moteurDuPassage: Moteur) => Generator<void, T>, repli?: CauseDeRepli): Promise<ResultatDeTranches<T>> =>
    menerLeCalculDe(passage.demande.demande, () => passage.abandonne, calcul, repli);

  /**
   * Confie `travail` au Worker quand la session en a un. Rend son résultat, `'abandonne'` si une demande plus récente a remplacé le passage
   * pendant l'attente, ou la cause du repli : le sandbox fait alors le travail lui-même. La cause est `null` sans Worker.
   * Le journal note la voie `worker` : les quatre phases et le passage englobant pour un calcul, la seule phase de calcul pour le reste.
   */
  async function confier(demande: number, generation: number, travail: TravailDesNoms, passage?: Passage): Promise<Confie> {
    if (!options.calcul) return { repli: null };
    const debut = Date.now();
    let issue;
    try {
      const requete = options.calcul.calculer({ demande, generation, travail });
      if (passage) passage.interrompre = requete.annuler;
      issue = await requete.issue;
    } catch {
      issue = { type: 'repli', cause: 'echec' } as const;
    } finally {
      if (passage) passage.interrompre = undefined;
    }
    if (passage?.abandonne) return 'abandonne';
    if (issue.type === 'annule') return passage ? 'abandonne' : { repli: 'echec' };
    if (issue.type === 'repli') {
      causeDuRepli = issue.cause;
      return { repli: issue.cause };
    }
    const { mesure } = issue;
    if (TRAVAUX_DE_CALCUL.has(travail.sorte)) {
      // Le transfert court jusqu'au Worker quand il tournait déjà ; sinon il s'arrête à l'interface et le démarrage prend la suite.
      const finDuTransfert = mesure.demarrage ? mesure.recuA : mesure.travailleurRecuA;
      noterUnPassageDeTokens({ phase: 'worker-transfert', debut: issue.envoyeA, fin: finDuTransfert, demande });
      if (mesure.demarrage) noterUnPassageDeTokens({ phase: 'worker-demarrage', debut: mesure.recuA, fin: mesure.travailleurRecuA, demande });
      noterUnPassageDeTokens({ phase: 'worker-calcul', debut: mesure.calculDebutA, fin: mesure.calculFinA, demande });
      noterUnPassageDeTokens({ phase: 'worker-retour', debut: mesure.calculFinA, fin: issue.recuA, demande });
      noterUnPassageDeTokens({ phase: 'calcul-des-noms', debut, fin: issue.recuA, demande, voie: 'worker' });
    } else {
      noterUnPassageDeTokens({ phase: 'worker-calcul', debut: mesure.calculDebutA, fin: mesure.calculFinA, demande, voie: 'worker' });
    }
    return { resultat: issue.resultat };
  }

  /** Le Worker a rendu un résultat que la session ne sait pas lire, ou ne garde plus la génération : le sandbox travaille lui-même. */
  function replier(): false {
    causeDuRepli = 'echec';
    return false;
  }

  /** Confie le calcul du bilan au Worker. Rend son bilan, `'abandonne'`, ou la cause du repli. */
  async function calculerAilleurs(passage: Passage, inventaire: Inventaire, regles: ReglesDuFichier): Promise<{ readonly bilan: Bilan } | 'abandonne' | { readonly repli: CauseDeRepli | null }> {
    const generation = compteur + 1;
    const rendu = await confier(passage.demande.demande, generation, { sorte: 'calculer', entree: { generation, inventaire, regles } }, passage);
    if (rendu === 'abandonne' || 'repli' in rendu) return rendu;
    const { resultat } = rendu;
    if (resultat.sorte !== 'bilan' || resultat.bilan.generation !== generation) return { repli: 'echec' };
    return { bilan: resultat.bilan };
  }

  /** Les appels que `lireInventaire` fait au port de lecture, comptés pour la mesure du mode Tokens. */
  const compterLaLecture = (appels: Record<string, number>, suivi: AppelsDePhase): PortDeLecture => ({
    ...port.lecture,
    collections: () => { appels.collections = (appels.collections ?? 0) + 1; return chronometrerUnAppel(suivi, 'appels-locaux', () => port.lecture.collections()); },
    variables: () => { appels.variables = (appels.variables ?? 0) + 1; return chronometrerUnAppel(suivi, 'appels-locaux', () => port.lecture.variables()); },
    // Des listes reprises d'une autre lecture n'appellent pas Figma : aucun appel à compter.
    locales: port.lecture.locales ? async () => {
      const locales = await chronometrerUnAppel(suivi, 'appels-locaux', () => port.lecture.locales!());
      if (!locales.viaUneAutreLecture) {
        appels.collections = (appels.collections ?? 0) + 1;
        appels.variables = (appels.variables ?? 0) + 1;
      }
      return locales;
    } : undefined,
    cibleAlias: (variable) => port.lecture.cibleAlias(variable),
    protegee: (variable) => port.lecture.protegee(variable),
    palette: (variable) => port.lecture.palette(variable),
    indecidable: port.lecture.indecidable ? (variable) => port.lecture.indecidable!(variable) : undefined,
    marqueDePalettes: port.lecture.marqueDePalettes ? () => port.lecture.marqueDePalettes!() : undefined,
  });

  async function relire(passage: Passage, avecProgression: boolean, appels: Record<string, number>): Promise<void> {
    const { demande } = passage;
    const regles = lireRegles();
    const inventaire = await mesurerUnePhaseDeTokens('inventaire', (suivi) => lireInventaire(compterLaLecture(appels, suivi), {
      pause,
      avancement: avecProgression ? ({ lues, total }) => envoyer({ type: 'lecture', demande: demande.demande, lues, total }) : undefined,
    }), Date.now, demande.demande);
    const ailleurs = await calculerAilleurs(passage, inventaire, regles);
    if (ailleurs === 'abandonne') return;
    let bilan: Bilan;
    if ('bilan' in ailleurs) {
      bilan = ailleurs.bilan;
      validerLeCalculDistant(demande.demande, inventaire, regles, bilan);
    } else {
      const calcul = await menerLeCalcul(passage, (moteurDuPassage) => calculerTout(moteurDuPassage, inventaire, regles), ailleurs.repli ?? undefined);
      if (calcul.abandonne) return;
      bilan = valider(demande.demande, null, inventaire, regles, calcul.valeur).projection.bilan();
    }
    if (avecProgression && !premierLancement(regles)) {
      const groupes = bilan.groupes.map((groupe) => groupe.cle);
      if (groupes.some((cle) => !regles.vus.includes(cle))) {
        rangerLesEcritures(port.regles, [serialiserRegle({ type: 'vus', groupes: [...regles.vus, ...groupes] })]);
      }
    }
  }

  /**
   * Recalcule dans le Worker après que les règles sont écrites. Rend vrai quand la demande est traitée (bilan envoyé, ou passage abandonné),
   * faux quand le sandbox doit recalculer : pas de Worker, travail non rendu, ou état changé pendant l'attente.
   */
  async function recalculerAuDehors(passage: Passage, regles: ReglesDuFichier): Promise<boolean> {
    const source = distant;
    if (!source) return false;
    const demande = passage.demande.demande;
    const generation = compteur + 1;
    const rendu = await confier(demande, generation, { sorte: 'recalculer', base: source.generation, regles }, passage);
    if (rendu === 'abandonne') return true;
    if ('repli' in rendu) return false;
    const { resultat } = rendu;
    if (resultat.sorte !== 'bilan' || resultat.bilan.generation !== generation) return replier();
    // Le sandbox a refait l'état complet pendant l'attente : sa génération reste la courante, et il recalcule depuis elle.
    if (distant !== source) return false;
    // Les groupes déjà vus ne changent qu'à l'analyse : un geste garde la pastille « Nouveau » de la session.
    const reglesDeLEtat: ReglesDuFichier = { ...regles, vus: source.regles.vus };
    if (!(premierLancement(source.regles) && !premierLancement(regles))) {
      poserLaGenerationDistante(generation, source.inventaire, reglesDeLEtat);
      envoyer({ type: 'bilan', demande, bilan: resultat.bilan });
      return true;
    }
    // Le premier choix d'écriture marque tous les groupes comme vus, puis le Worker refait la projection avec les règles relues.
    rangerLesEcritures(port.regles, [serialiserRegle({ type: 'vus', groupes: resultat.bilan.groupes.map((groupe) => groupe.cle) })]);
    const relues = lireRegles();
    poserLaGenerationDistante(generation, source.inventaire, relues);
    const suite = await confier(demande, generation, { sorte: 'adopter', regles: relues });
    if (typeof suite === 'object' && 'resultat' in suite && suite.resultat.sorte === 'bilan' && suite.resultat.bilan.generation === generation) {
      envoyer({ type: 'bilan', demande, bilan: suite.resultat.bilan });
      return true;
    }
    const complet = await completerLEtat(demande);
    if (complet) envoyerLeBilan(demande, complet);
    return true;
  }

  /** Recalcule après que les règles sont écrites : dans le Worker quand il garde la génération, sinon depuis l'état du sandbox. */
  async function recalculerDepuisLesRegles(passage: Passage, regles: ReglesDuFichier): Promise<void> {
    if (await recalculerAuDehors(passage, regles)) return;
    const base = await exiger(passage);
    const calcul = await menerLeCalcul(passage, (moteurDuPassage) => recalculer(moteurDuPassage, base, regles, true));
    if (calcul.abandonne) return;
    valider(passage.demande.demande, base, base.inventaire, regles, calcul.valeur);
  }

  /** Les écritures d'un geste, préparées par le Worker. Rend `null` quand le sandbox doit les préparer : pas de Worker, travail non rendu. */
  async function preparerAuDehors(passage: Passage, preparation: TravailDePreparation, courant: ReadonlyMap<string, string>): Promise<PreparationDeGeste | null> {
    const source = distant;
    if (!source) return null;
    const rendu = await confier(passage.demande.demande, source.generation, { sorte: 'preparer', preparation, courant: [...courant] });
    if (rendu === 'abandonne' || 'repli' in rendu) return null;
    const { resultat } = rendu;
    if (resultat.sorte === 'erreur') throw new ErreurDeProtocole(resultat.code);
    if (resultat.sorte === 'refus') return { sorte: 'refus', conflits: resultat.conflits };
    if (resultat.sorte === 'ecritures') return { sorte: 'ecritures', ecritures: resultat.ecritures, regles: resultat.regles };
    replier();
    return null;
  }

  /** Écrit les règles que `travail` demande, sauf conflit de vocabulaire, puis recalcule. */
  async function modifierLesRegles(passage: Passage, travail: TravailDePreparation): Promise<void> {
    if (!distant) await exiger(passage);
    if (reglesFuturesDuStockage(port.regles).length > 0) throw new ErreurDeProtocole('regles-futures');
    const courant = lireLeStockage(port.regles);
    const preparation = await preparerAuDehors(passage, travail, courant) ?? preparerLeGeste(moteur, travail, await exiger(passage), courant);
    if (preparation.sorte === 'refus') {
      envoyer({ type: 'refus', demande: passage.demande.demande, conflits: preparation.conflits });
      return;
    }
    try {
      rangerLesEcritures(port.regles, preparation.ecritures);
    } catch (cause) {
      if (passage.demande.type !== 'regle' || passage.demande.geste.type !== 'architecture') throw cause;
      envoyer({ type: 'erreur', demande: passage.demande.demande, code: 'echec', architecture: lireRegles().architecture });
      return;
    }
    await recalculerDepuisLesRegles(passage, preparation.regles);
  }

  async function importer(passage: Passage, texte: string): Promise<void> {
    const demande = passage.demande.demande;
    if (reglesFuturesDuStockage(port.regles).length > 0) throw new ErreurDeProtocole('regles-futures');
    const courant = lireLeStockage(port.regles);
    const resultat = importerLesRegles(texte, lireLesRegles(courant), (vocabulaire) => moteur.indexerVocabulaire(vocabulaire).conflits);
    if (resultat.statut === 'illisible') return erreur(demande, 'import-illisible');
    if (resultat.statut === 'conflits') return envoyer({ type: 'refus', demande, conflits: resultat.conflits.map(conflitVue) });
    const rangee = preparerImport(resultat.ecritures, courant, (options.heure ?? (() => new Date().toISOString()))());
    try {
      rangerLesEcritures(port.regles, rangee ? [...resultat.ecritures, rangee] : resultat.ecritures);
    } catch {
      throw new ErreurDeProtocole('import-partiel');
    }
    if (generationCourante() === null) return rafraichir(passage, false);
    return recalculerDepuisLesRegles(passage, lireRegles());
  }

  const resultatVue = (sorte: ResultatVue['sorte'], resultat: ResultatEcriture): ResultatVue => {
    const exclues = resultat.sautes.filter(({ motif }) => motif === 'exclue').length;
    const nonVerifiees = resultat.sautes.filter(({ motif }) => motif === 'non-verifiee').length;
    return {
      sorte, statut: resultat.statut, renommes: resultat.renommes.length, sautes: resultat.sautes.length, annulable: resultat.annulable,
      ...(resultat.cause ? { cause: resultat.cause } : {}),
      ...(exclues > 0 ? { exclues } : {}),
      ...(nonVerifiees > 0 ? { nonVerifiees } : {}),
    };
  };

  /** Après une écriture : `application`, puis un `bilan` neuf lu dans Figma, sauf si tout a été refusé. */
  async function conclureUneEcriture(passage: Passage, sorte: ResultatVue['sorte'], resultat: ResultatEcriture): Promise<void> {
    envoyer({ type: 'application', demande: passage.demande.demande, resultat: resultatVue(sorte, resultat) });
    if (resultat.statut !== 'refuse') await rafraichir(passage, false);
  }

  /**
   * Les renommages que la sélection coche et les règles du calcul qui les a produits, pris dans le Worker et vérifiés contre l'inventaire du
   * sandbox. Rend `null` quand le sandbox doit les calculer lui-même : pas de Worker, travail non rendu, renommage que l'inventaire ne confirme pas.
   */
  async function renommagesAuDehors(passage: Passage, generation: number, selection: Selection): Promise<{ readonly demandes: RenommageDemande[]; readonly regles: ReglesDuFichier } | null> {
    const source = distant;
    if (!source || source.generation !== generation) return null;
    const rendu = await confier(passage.demande.demande, generation, { sorte: 'renommages', selection });
    if (rendu === 'abandonne' || 'repli' in rendu) return null;
    if (rendu.resultat.sorte !== 'renommages' || distant !== source) {
      if (rendu.resultat.sorte !== 'renommages') replier();
      return null;
    }
    const demandes = demandesVerifiees(rendu.resultat.renommages, source.inventaire);
    if (!demandes) {
      replier();
      return null;
    }
    return { demandes, regles: source.regles };
  }

  async function appliquer(passage: Passage, demande: Extract<DemandeDeNomenclature, { type: 'appliquer' }>): Promise<void> {
    if (generationCourante() === null) throw new ErreurDeProtocole('echec');
    if (demande.generation !== generationCourante()) throw new ErreurDeProtocole('generation-perimee');
    let aEcrire = await renommagesAuDehors(passage, demande.generation, demande.selection);
    if (!aEcrire) {
      const base = await exiger(passage);
      aEcrire = { demandes: demandesDeRenommage(renommagesDeLaSelection(base, demande.selection), base.inventaire), regles: base.regles };
    }
    const session = await port.ecriture.ouvrir();
    // Aucune attente après `ouvrir` : la signature se compare juste avant l'écriture synchrone.
    if (signatureDuCalcul(lireRegles()) !== signatureDuCalcul(aEcrire.regles)) throw new ErreurDeProtocole('regles-modifiees');
    const resultat = appliquerLesRenommages({ demandes: aEcrire.demandes, session, stockage: port.regles, heure: options.heure });
    await conclureUneEcriture(passage, 'application', resultat);
  }

  async function annulerLeDernier(passage: Passage): Promise<void> {
    const session = await port.ecriture.ouvrir();
    const resultat = annulerLeDernierRenommage({ session, stockage: port.regles });
    await conclureUneEcriture(passage, 'annulation', resultat);
  }

  async function executer(passage: Passage): Promise<void> {
    const demande = passage.demande;
    switch (demande.type) {
      case 'noms-analyser': return rafraichir(passage, true);
      case 'regle': return modifierLesRegles(passage, { sorte: 'geste', geste: demande.geste });
      case 'noms-repondre': return modifierLesRegles(passage, { sorte: 'reponse', question: demande.question, reponse: demande.reponse });
      case 'configurer': return modifierLesRegles(passage, { sorte: 'configurer', collectionsExclues: demande.collectionsExclues });
      case 'importer': return importer(passage, demande.texte);
      case 'appliquer': return appliquer(passage, demande);
      case 'annuler-dernier': return annulerLeDernier(passage);
    }
  }

  async function tourner(): Promise<void> {
    tourne = true;
    try {
      for (let passage = attente.shift(); passage; passage = attente.shift()) {
        enCours = passage;
        try {
          await executer(passage);
        } catch (cause) {
          if (!passage.abandonne) erreur(passage.demande.demande, cause instanceof ErreurDeProtocole ? cause.code : 'echec');
        } finally {
          passage.fin();
        }
      }
    } finally {
      enCours = null;
      tourne = false;
    }
  }

  function enfiler(demande: DemandeDeCalcul): Promise<void> {
    return new Promise((resoudre) => {
      if (DERNIERE_INTENTION.has(demande.type)) {
        for (let rang = attente.length - 1; rang >= 0; rang -= 1) {
          if (attente[rang].demande.type !== demande.type) continue;
          attente[rang].fin();
          attente.splice(rang, 1);
        }
        if (enCours?.demande.type === demande.type) {
          enCours.abandonne = true;
          enCours.interrompre?.();
        }
      }
      attente.push({ demande, fin: resoudre, abandonne: false });
      if (!tourne) void tourner();
    });
  }

  // Les lectures

  /** L'état de la génération demandée, ou l'erreur qui répond à la lecture. */
  async function etatDeLaGeneration(demande: number, generation: number): Promise<Etat | null> {
    if (generationCourante() === generation) {
      const complet = await completerLEtat(demande);
      if (complet && complet.generation === generation) return complet;
    }
    const analyseEnCours = enCours?.demande.type === 'noms-analyser' || attente.some((passage) => passage.demande.type === 'noms-analyser');
    erreur(demande, generationCourante() === null && analyseEnCours ? 'analyse-en-cours' : 'generation-perimee');
    return null;
  }

  /**
   * Envoie la réponse que le Worker a calculée pour `demande`, sauf si la génération a changé pendant l'attente : l'écran reçoit alors l'erreur
   * d'une génération périmée. Rend faux quand le sandbox doit répondre lui-même : pas de Worker ou de génération chez lui, travail non rendu.
   */
  async function repondreAuDehors(demande: number, generation: number, travail: TravailDesNoms, type: MessageDeNomenclature['type']): Promise<boolean> {
    const source = distant;
    if (!source || source.generation !== generation) return false;
    const rendu = await confier(demande, generation, travail);
    if (rendu === 'abandonne' || 'repli' in rendu) return false;
    const { resultat } = rendu;
    if (resultat.sorte === 'erreur') {
      erreur(demande, generationCourante() === generation ? resultat.code : 'generation-perimee');
      return true;
    }
    if (resultat.sorte !== 'message' || resultat.message.type !== type || !('demande' in resultat.message) || resultat.message.demande !== demande) return replier();
    if (generationCourante() !== generation) erreur(demande, 'generation-perimee');
    else envoyer(resultat.message);
    return true;
  }

  const lireAuDehors = (lecture: DemandeDeLecture): Promise<boolean> =>
    repondreAuDehors(lecture.demande, lecture.generation, { sorte: 'lire', lecture }, lecture.type);

  async function simuler(demande: Extract<DemandeDeNomenclature, { type: 'simuler' }>): Promise<void> {
    if (distant && distant.generation === demande.generation) {
      const courant = [...lireLeStockage(port.regles)];
      const travail: TravailDesNoms = { sorte: 'simuler', demande: demande.demande, geste: demande.geste, courant };
      if (await repondreAuDehors(demande.demande, demande.generation, travail, 'simulation')) return;
    }
    const base = await etatDeLaGeneration(demande.demande, demande.generation);
    if (!base) return;
    const debut = debuterLaSimulation(moteur, base, demande.geste, lireLeStockage(port.regles));
    if (debut.sorte === 'repond') {
      envoyer(messageDeSimulation(demande.demande, base, debut.effet, debut.conflit));
      return;
    }
    const calcul = await mener(recalculer(moteur, base, debut.regles, false), () => generationCourante() !== base.generation, tranches);
    if (calcul.abandonne) return erreur(demande.demande, 'generation-perimee');
    envoyer(messageDeSimulation(demande.demande, base, conclureLaSimulation(base, demande.geste, debut, calcul.valeur), null));
  }

  async function lire(demande: DemandeDeNomenclature): Promise<void> {
    switch (demande.type) {
      case 'lignes':
      case 'termes':
      case 'fiche':
      case 'noms-selection':
      case 'diagnostic': {
        if (await lireAuDehors(demande)) return;
        const courant = await etatDeLaGeneration(demande.demande, demande.generation);
        if (courant) envoyer(repondreALaLecture(demande, courant));
        return;
      }
      case 'simuler':
        return simuler(demande);
      case 'exporter':
        envoyer({ type: 'regles-exportees', demande: demande.demande, texte: exporterLesRegles(lireRegles()) });
        return;
      default:
        return;
    }
  }

  return {
    async recevoir(demande) {
      try {
        if (TYPES_DE_CALCUL.has(demande.type)) await enfiler(demande as DemandeDeCalcul);
        else await lire(demande);
      } catch (cause) {
        erreur(demande.demande, cause instanceof ErreurDeProtocole ? cause.code : 'echec');
      }
    },
  };
}
