/**
 * La session du sandbox : elle garde l'inventaire, le lexique, le vocabulaire indexé, le résultat, les questions et
 * les règles du fichier, et n'envoie à l'écran que le `Bilan` et les pages demandées.
 *
 * Protocole (voir le plan de la refonte, « Règles du protocole ») :
 * - les calculs passent un à un ; `analyser` et `configurer` ne gardent que leur dernière demande, et une demande
 *   plus récente de même sorte abandonne le calcul en cours à la tranche suivante, sans réponse pour lui ;
 * - les lectures répondent sur la génération courante et n'attendent aucun calcul ;
 * - chaque calcul abouti change de génération et se termine par un `bilan`, un `refus` ou une `erreur`,
 *   sauf une application ou une annulation refusée, qui répond par `application` seule.
 *
 * Le calcul des noms (lexique, renommages, questions, projection) est dans `calcul.ts`, pur et sans Figma ; la session le mène
 * par tranches et le note au journal. `Moteur` permet à un test de compter les appels du kit.
 */
import {
  COLLECTIONS, REGISTRES, REGISTRES_ARCHITECTURE, decouperSegment,
  type ConflitDeVocabulaire, type Lexique, type Mots,
  type Collection, type Question,
} from '@ucm-kit/core/referentiel';
import { type Inventaire } from '@ucm-kit/core/nommage';
import {
  annulerLeDernierRenommage, appliquerLesRenommages, reglesFuturesDuStockage,
  type PortDeRegles, type PortEcriture, type RenommageDemande, type ResultatEcriture,
} from '../ecriture/noms';
import { chronometrerUnAppel, mesurerUnePhaseDeTokens, noterUnPassageDeTokens, type AppelsDePhase, type PhaseDeTokens } from '../lecture';
import { lireInventaire, type PortDeLecture } from './lecture';
import type {
  Bilan, CodeDErreur, DemandeDeNomenclature, EffetVue, GesteSurLesRegles, MessageDeNomenclature, Reponse, ResultatVue,
} from '../messages/nomenclature';
import type { CauseDeRepli } from '../messages/calculDesNoms';
import type { PortDeCalculDistant } from './distant';
import { conflitVue, effetDEcriture, effetDeTerme, type EntreeDeProjection } from './projection';
import {
  calculerTout, construireEtat, jointure, moteurDuKit, motsDe, motsDuTermeUcm, premierLancement, recalculer,
  type Calcul, type Etat, type Moteur,
} from './calcul';
import {
  CLE_EXCLUES, cleDuTermeOrdinaire, cleEcart, cleOrdinaire, clePlusTard, cleReponse, cleTerme, cleVoulu, cleDistinct, defaireReponse,
  defaireLImport, estMot, exporterLesRegles, importerLesRegles, lireLesRegles, lireLeStockage, preparerImport, preparerReponse, rangerLesEcritures,
  serialiserRegle, vocabulaireDuFichier,
  type Ecriture, type ReglesDuFichier,
} from './regles';
import { mener, pauseParDefaut, type MesureDeTranches, type OptionsDeTranches, type ResultatDeTranches } from './tranches';

export { motsDe, motsDuTermeUcm, moteurDuKit, type Moteur };

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
   * Le calcul des noms hors du sandbox. Sans lui, ou quand il se replie, la session mène le calcul par tranches. Le bilan qu'il rend
   * est celui de la session ; la session ne garde alors que l'entrée du calcul, et refait le calcul complet à la première lecture
   * ou au premier geste qui en a besoin.
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

class ErreurDeProtocole extends Error {
  constructor(readonly code: CodeDErreur) { super(code); }
}

// Les règles qui comptent pour le calcul

/**
 * Ce qu'`appliquer` compare : les règles qui changent les renommages proposés. Les termes ordinaires changent les frontières
 * des termes, et la reprise de l'écriture de la v1 libère les variables de Palettes.
 */
const signatureDuCalcul = (regles: ReglesDuFichier): string =>
  JSON.stringify([regles.ecriture ?? null, regles.ecritureDeLaV1, regles.termes, regles.ecartsUcm, regles.ordinaires, regles.collectionsExclues, regles.collectionsRenommees]);

/** L'identifiant UCM d'un terme écrit `disable` ou `extra-small` ; à défaut, le terme lui-même. */
function identifiantUcm(terme: string): string {
  const cle = motsDe(terme).join('-');
  for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE]) {
    for (const candidat of registre.termes) if (decouperSegment(candidat.id).map((mot) => mot.toLowerCase()).join('-') === cle) return candidat.id;
  }
  return cle;
}

// Les règles qu'un geste ou une réponse écrit

/** Les mots d'un terme que le fichier va garder : vide ou refusé par `estMot`, le terme arrête le geste ou la réponse. */
function motsRetenus(texte: string): Mots {
  const mots = motsDe(texte);
  if (mots.length === 0 || !mots.every(estMot)) throw new ErreurDeProtocole('mot-refuse');
  return mots;
}

function termeAvec(regles: ReglesDuFichier, mots: Mots, ajouts: readonly Mots[]): Ecriture {
  const existant = regles.termes.find((terme) => jointure(terme.terme) === jointure(mots));
  const remplace = new Map((existant?.remplace ?? []).map((forme) => [jointure(forme), forme]));
  for (const ajout of ajouts) if (jointure(ajout) !== jointure(mots)) remplace.set(jointure(ajout), ajout);
  return serialiserRegle({
    type: 'terme',
    terme: { terme: mots, remplace: [...remplace.values()], ...(existant?.definition ? { definition: existant.definition } : {}) },
  });
}

function ecrituresDuGeste(geste: GesteSurLesRegles, regles: ReglesDuFichier, courant: ReadonlyMap<string, string>): Ecriture[] {
  switch (geste.type) {
    case 'architecture': return [serialiserRegle(geste)];
    case 'ecriture':
      return [serialiserRegle({ type: 'ecriture', ecriture: geste.ecriture })];
    case 'remplacer-par':
      return [termeAvec(regles, motsRetenus(geste.par), [motsRetenus(geste.terme)])];
    case 'remplace-termes': {
      // La liste de l'écran remplace celle du fichier ; une liste vide supprime la règle si elle ne porte pas de définition.
      const mots = motsRetenus(geste.terme);
      const existant = regles.termes.find((terme) => jointure(terme.terme) === jointure(mots));
      const formes = geste.termes.map(motsDe).filter((forme) => forme.length > 0);
      if (formes.some((forme) => !forme.every(estMot))) throw new ErreurDeProtocole('mot-refuse');
      const liste = new Map(formes.filter((forme) => jointure(forme) !== jointure(mots)).map((forme) => [jointure(forme), forme]));
      if (liste.size === 0 && !existant?.definition) return existant ? [{ cle: cleTerme(existant.terme), texte: null }] : [];
      return [serialiserRegle({
        type: 'terme',
        terme: { terme: existant?.terme ?? mots, remplace: [...liste.values()], ...(existant?.definition ? { definition: existant.definition } : {}) },
      })];
    }
    case 'retirer-remplace': {
      // Comme `remplace-termes` : une règle sans forme remplacée reste quand elle porte une définition.
      const mots = motsDe(geste.terme);
      const existant = regles.termes.find((terme) => jointure(terme.terme) === jointure(mots));
      if (!existant) return [];
      const reste = existant.remplace.filter((forme) => jointure(forme) !== jointure(motsDe(geste.remplace)));
      return [reste.length === 0 && !existant.definition ? { cle: cleTerme(existant.terme), texte: null } : serialiserRegle({ type: 'terme', terme: { ...existant, remplace: reste } })];
    }
    case 'supprimer': {
      const existant = regles.termes.find((terme) => jointure(terme.terme) === jointure(motsDe(geste.terme)));
      return existant ? [{ cle: cleTerme(existant.terme), texte: null }] : [];
    }
    case 'ecart-ucm': {
      const id = identifiantUcm(geste.terme);
      return geste.actif ? [serialiserRegle({ type: 'ecart', id })] : [{ cle: cleEcart(id), texte: null }];
    }
    case 'terme-ordinaire': {
      const cle = cleDuTermeOrdinaire(motsRetenus(geste.terme));
      return geste.actif ? [serialiserRegle({ type: 'ordinaire', cle })] : [{ cle: cleOrdinaire(cle), texte: null }];
    }
    case 'retirer-distinct':
      return [{ cle: cleDistinct(geste.termes[0], geste.termes[1]), texte: null }];
    case 'retirer-voulu':
      return [{ cle: cleVoulu(motsDe(geste.terme)), texte: null }];
    case 'reprendre':
      return [{ cle: clePlusTard(geste.question), texte: null }, ...(courant.has(cleReponse(geste.question)) ? [{ cle: cleReponse(geste.question), texte: null }] : [])];
    case 'annuler-reponse':
      return defaireReponse(geste.question, courant) ?? [];
    case 'annuler-import':
      return defaireLImport(courant);
  }
}

/** Vrai quand le premier mot de la forme figure dans le lexique du fichier. */
export const employe = (lexique: Lexique, forme: string): boolean => lexique.occurrences.has(motsDe(forme)[0] ?? '');

/** Les écritures d'une réponse, avant `preparerReponse`. Une réponse qui ne convient pas à la question est une erreur. */
function ecrituresDeLaReponse(question: Question, reponse: Reponse, regles: ReglesDuFichier, lexique: Lexique): Ecriture[] {
  if (reponse.type === 'plus-tard') return [serialiserRegle({ type: 'plus-tard', cle: question.cle })];
  const echec = (): never => { throw new ErreurDeProtocole('echec'); };
  switch (question.type) {
    case 'paire': {
      const [a, b] = [question.termes[0].mot, question.termes[1].mot];
      if (reponse.type === 'garder') return [termeAvec(regles, motsRetenus(question.termes[reponse.rang].mot), [motsRetenus(question.termes[reponse.rang === 0 ? 1 : 0].mot)])];
      if (reponse.type === 'autre') return [termeAvec(regles, motsRetenus(reponse.terme), [motsRetenus(a), motsRetenus(b)])];
      if (reponse.type === 'distincts') {
        // La clé d'une paire joint ses termes par `|`.
        if (a.includes('|') || b.includes('|')) throw new ErreurDeProtocole('mot-refuse');
        return [serialiserRegle({ type: 'distinct', termes: [a, b] })];
      }
      return echec();
    }
    case 'ecriture-du-terme': {
      if (reponse.type === 'voulu') return [serialiserRegle({ type: 'voulu', mots: motsRetenus(question.terme.mot) })];
      const corrige = reponse.type === 'corriger' ? reponse.mots.join(' ') : echec();
      return [termeAvec(regles, motsRetenus(corrige), [motsRetenus(question.terme.mot)])];
    }
    case 'collection':
      if (reponse.type !== 'collection') return echec();
      if (reponse.cible === null) return [serialiserRegle({ type: 'collection', id: question.collectionId })];
      const cible = (COLLECTIONS as readonly string[]).includes(reponse.cible) ? reponse.cible as Collection : echec();
      return [serialiserRegle({ type: 'collection', id: question.collectionId, cible })];
  }
}

/** Le terme que l'effet d'un geste met en avant : le mot qui disparaît des noms, puis celui qui le remplace. */
function termeDeLEffet(geste: GesteSurLesRegles, regles: ReglesDuFichier, lexique: Lexique): { readonly avant: string; readonly apres: string } | null {
  switch (geste.type) {
    case 'remplacer-par': return { avant: geste.terme, apres: geste.par };
    case 'remplace-termes': return { avant: geste.termes[0] ?? geste.terme, apres: geste.terme };
    case 'retirer-remplace': return { avant: geste.remplace, apres: geste.terme };
    case 'supprimer': {
      const existant = regles.termes.find((terme) => jointure(terme.terme) === jointure(motsDe(geste.terme)));
      return { avant: existant?.remplace[0]?.join('-') ?? geste.terme, apres: geste.terme };
    }
    case 'ecart-ucm': {
      const forme = motsDuTermeUcm(identifiantUcm(geste.terme)).slice(1).find((mots) => employe(lexique, mots.join('-')));
      return { avant: forme?.join('-') ?? geste.terme, apres: geste.terme };
    }
    default: return null;
  }
}

/** Le fichier a déjà reçu une écriture : l'écran s'ouvre sur le travail plutôt que sur l'invitation. */
export function fichierDejaAnalyse(port: PortDeRegles): boolean {
  try {
    return !premierLancement(lireLesRegles(lireLeStockage(port)));
  } catch {
    return false;
  }
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

export function creerSession(options: OptionsDeSession): Session {
  const { port, envoyer } = options;
  const moteur = options.moteur ?? moteurDuKit;
  const tranches = options.tranches ?? {};
  const pause = tranches.pause ?? pauseParDefaut;

  let etat: Etat | null = null;
  /** La génération courante quand le Worker a mené le calcul ; `etat` est alors `null` jusqu'à ce qu'une lecture ou un geste le refasse. */
  let distant: CalculDistant | null = null;
  let compteur = 0;
  let enCours: Passage | null = null;
  let tourne = false;
  const attente: Passage[] = [];

  const lireRegles = (): ReglesDuFichier => lireLesRegles(lireLeStockage(port.regles));
  const erreur = (demande: number, code: CodeDErreur): void => envoyer({ type: 'erreur', demande, code });
  const generationCourante = (): number | null => etat?.generation ?? distant?.generation ?? null;
  const envoyerLeBilan = (demande: number, courant: Etat): void => envoyer({ type: 'bilan', demande, bilan: courant.projection.bilan() });

  /** Valide les écritures sur le stockage relu : les règles qui en résultent, ou les conflits du vocabulaire. */
  function essayer(courant: ReadonlyMap<string, string>, ecritures: readonly Ecriture[]): { readonly regles: ReglesDuFichier; readonly conflits: readonly ConflitDeVocabulaire[] } {
    const suivant = new Map(courant);
    for (const { cle, texte } of ecritures) {
      if (texte === null || texte === '') suivant.delete(cle);
      else suivant.set(cle, texte);
    }
    const regles = lireLesRegles(suivant);
    return { regles, conflits: moteur.indexerVocabulaire(vocabulaireDuFichier(regles)).conflits };
  }

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

  /** Enregistre la génération que le Worker a calculée et envoie son bilan, tel qu'il l'a rendu. */
  function validerLeCalculDistant(demande: number, inventaire: Inventaire, regles: ReglesDuFichier, bilan: Bilan): void {
    const generation = ++compteur;
    etat = null;
    distant = { generation, inventaire, regles, complet: null };
    envoyer({ type: 'bilan', demande, bilan });
  }

  /**
   * L'état complet de la génération courante, que les lectures et les gestes demandent. Quand le Worker a mené le calcul, le sandbox le refait
   * ici, par tranches, la première fois ; les demandes suivantes attendent le même calcul. Rend `null` si la génération change entre-temps.
   */
  function completerLEtat(demande: number): Promise<Etat | null> {
    if (etat) return Promise.resolve(etat);
    const source = distant;
    if (!source) return Promise.resolve(null);
    source.complet ??= (async () => {
      const calcul = await menerLeCalculDe(demande, () => distant !== source, (moteurDuPassage) => calculerTout(moteurDuPassage, source.inventaire, source.regles), 'relecture');
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
   * Confie le calcul au Worker quand la session en a un. Rend son bilan, `'abandonne'` si une demande plus récente a remplacé la
   * demande pendant l'attente, ou la cause du repli : le sandbox fait alors le calcul lui-même. La cause est `null` sans Worker.
   */
  async function calculerAilleurs(passage: Passage, inventaire: Inventaire, regles: ReglesDuFichier): Promise<{ readonly bilan: Bilan } | 'abandonne' | { readonly repli: CauseDeRepli | null }> {
    if (!options.calcul) return { repli: null };
    const demande = passage.demande.demande;
    const generation = compteur + 1;
    const debut = Date.now();
    let issue;
    try {
      const requete = options.calcul.calculer({ demande, generation, entree: { generation, inventaire, regles } });
      passage.interrompre = requete.annuler;
      issue = await requete.issue;
    } catch {
      issue = { type: 'repli', cause: 'echec' } as const;
    } finally {
      passage.interrompre = undefined;
    }
    if (passage.abandonne || issue.type === 'annule') return 'abandonne';
    if (issue.type === 'repli') return { repli: issue.cause };
    if (issue.bilan.generation !== generation) return { repli: 'echec' };
    const { mesure } = issue;
    // Le transfert court jusqu'au Worker quand il tournait déjà ; sinon il s'arrête à l'interface et le démarrage prend la suite.
    const finDuTransfert = mesure.demarrage ? mesure.recuA : mesure.travailleurRecuA;
    noterUnPassageDeTokens({ phase: 'worker-transfert', debut: issue.envoyeA, fin: finDuTransfert, demande });
    if (mesure.demarrage) noterUnPassageDeTokens({ phase: 'worker-demarrage', debut: mesure.recuA, fin: mesure.travailleurRecuA, demande });
    noterUnPassageDeTokens({ phase: 'worker-calcul', debut: mesure.calculDebutA, fin: mesure.calculFinA, demande });
    noterUnPassageDeTokens({ phase: 'worker-retour', debut: mesure.calculFinA, fin: issue.recuA, demande });
    noterUnPassageDeTokens({ phase: 'calcul-des-noms', debut, fin: issue.recuA, demande, voie: 'worker' });
    return { bilan: issue.bilan };
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

  /** Recalcule depuis l'état courant après que les règles sont écrites. */
  async function recalculerDepuisLesRegles(passage: Passage, base: Etat, regles: ReglesDuFichier): Promise<void> {
    const calcul = await menerLeCalcul(passage, (moteurDuPassage) => recalculer(moteurDuPassage, base, regles, true));
    if (calcul.abandonne) return;
    valider(passage.demande.demande, base, base.inventaire, regles, calcul.valeur);
  }

  /** Écrit les règles que `preparer` demande, sauf conflit de vocabulaire, puis recalcule. */
  async function modifierLesRegles(passage: Passage, preparer: (base: Etat, courant: ReadonlyMap<string, string>, regles: ReglesDuFichier) => Ecriture[]): Promise<void> {
    const base = await exiger(passage);
    if (reglesFuturesDuStockage(port.regles).length > 0) throw new ErreurDeProtocole('regles-futures');
    const courant = lireLeStockage(port.regles);
    const ecritures = preparer(base, courant, lireLesRegles(courant));
    const { regles, conflits } = essayer(courant, ecritures);
    if (conflits.length > 0) {
      envoyer({ type: 'refus', demande: passage.demande.demande, conflits: conflits.map(conflitVue) });
      return;
    }
    try {
      rangerLesEcritures(port.regles, ecritures);
    } catch (cause) {
      if (passage.demande.type !== 'regle' || passage.demande.geste.type !== 'architecture') throw cause;
      envoyer({ type: 'erreur', demande: passage.demande.demande, code: 'echec', architecture: lireRegles().architecture });
      return;
    }
    await recalculerDepuisLesRegles(passage, base, regles);
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
    return recalculerDepuisLesRegles(passage, await exiger(passage), lireRegles());
  }

  function demandesDeRenommage(base: Etat, ids: readonly string[]): RenommageDemande[] {
    const renommages = new Map(base.resultat.renommages.map((renommage) => [renommage.id, renommage]));
    const entrees = new Map(base.inventaire.entrees.map((entree) => [entree.nom.id, entree]));
    return ids.flatMap((id): RenommageDemande[] => {
      const renommage = renommages.get(id);
      const entree = entrees.get(id);
      if (!renommage || !entree) return [];
      const commun = { id, ancienNom: renommage.ancienNom, nouveauNom: renommage.nouveauNom };
      return entree.cible.type === 'collection'
        ? [{ ...commun, type: 'collection', figmaId: entree.cible.collectionId }]
        : [{ ...commun, type: 'variable', figmaId: entree.cible.variableId, collectionId: entree.cible.collectionId }];
    });
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

  async function appliquer(passage: Passage, demande: Extract<DemandeDeNomenclature, { type: 'appliquer' }>): Promise<void> {
    if (generationCourante() === null) throw new ErreurDeProtocole('echec');
    if (demande.generation !== generationCourante()) throw new ErreurDeProtocole('generation-perimee');
    const base = await exiger(passage);
    const demandes = demandesDeRenommage(base, base.projection.identifiants(demande.selection));
    const session = await port.ecriture.ouvrir();
    // Aucune attente après `ouvrir` : la signature se compare juste avant l'écriture synchrone.
    if (signatureDuCalcul(lireRegles()) !== signatureDuCalcul(base.regles)) throw new ErreurDeProtocole('regles-modifiees');
    const resultat = appliquerLesRenommages({ demandes, session, stockage: port.regles, heure: options.heure });
    await conclureUneEcriture(passage, 'application', resultat);
  }

  async function annulerLeDernier(passage: Passage): Promise<void> {
    const session = await port.ecriture.ouvrir();
    const resultat = annulerLeDernierRenommage({ session, stockage: port.regles });
    await conclureUneEcriture(passage, 'annulation', resultat);
  }

  async function configurer(passage: Passage, collectionsExclues: readonly string[]): Promise<void> {
    await modifierLesRegles(passage, (base) => {
      const connues = new Set(base.inventaire.entrees.map((entree) => entree.cible.collectionId));
      const ids = collectionsExclues.filter((id) => connues.has(id));
      return ids.length > 0 ? [serialiserRegle({ type: 'exclues', ids })] : [{ cle: CLE_EXCLUES, texte: null }];
    });
  }

  async function executer(passage: Passage): Promise<void> {
    const demande = passage.demande;
    switch (demande.type) {
      case 'noms-analyser': return rafraichir(passage, true);
      case 'regle': return modifierLesRegles(passage, (_base, courant, regles) => ecrituresDuGeste(demande.geste, regles, courant));
      case 'noms-repondre':
        return modifierLesRegles(passage, (base, courant, regles) => {
          const question = [...base.questions.questions, ...base.questions.autres].find((candidate) => candidate.cle === demande.question);
          if (!question) throw new ErreurDeProtocole('echec');
          return preparerReponse(question.cle, ecrituresDeLaReponse(question, demande.reponse, regles, base.lexique), courant);
        });
      case 'configurer': return configurer(passage, demande.collectionsExclues);
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

  async function simuler(demande: Extract<DemandeDeNomenclature, { type: 'simuler' }>): Promise<void> {
    const base = await etatDeLaGeneration(demande.demande, demande.generation);
    if (!base) return;
    const courant = lireLeStockage(port.regles);
    const ecritures = ecrituresDuGeste(demande.geste, lireLesRegles(courant), courant);
    const { regles, conflits } = essayer(courant, ecritures);
    if (conflits.length > 0) {
      envoyer({ type: 'simulation', demande: demande.demande, generation: base.generation, effet: null, conflit: conflitVue(conflits[0]) });
      return;
    }
    const terme = termeDeLEffet(demande.geste, regles, base.lexique);
    let effet: EffetVue | null = null;
    if (demande.geste.type === 'ecriture' || terme) {
      const calcul = await mener(recalculer(moteur, base, regles, false), () => generationCourante() !== base.generation, tranches);
      if (calcul.abandonne) return erreur(demande.demande, 'generation-perimee');
      const simulee: EntreeDeProjection = { ...base.entree, regles, resultat: calcul.valeur.resultat, ecriture: calcul.valeur.ecriture };
      effet = demande.geste.type === 'ecriture' ? effetDEcriture(simulee) : effetDeTerme(base.entree, simulee, terme!);
    }
    envoyer({ type: 'simulation', demande: demande.demande, generation: base.generation, effet, conflit: null });
  }

  async function lire(demande: DemandeDeNomenclature): Promise<void> {
    switch (demande.type) {
      case 'lignes': {
        const courant = await etatDeLaGeneration(demande.demande, demande.generation);
        if (!courant) return;
        const page = courant.projection.lignes(demande.groupe, demande.debut);
        envoyer({ type: 'lignes', demande: demande.demande, generation: courant.generation, groupe: demande.groupe, debut: demande.debut, ...page });
        return;
      }
      case 'termes': {
        const courant = await etatDeLaGeneration(demande.demande, demande.generation);
        if (!courant) return;
        const { recherche, types, origines, places, tri, section, place, debut } = demande;
        const page = courant.projection.termes({ recherche, types, origines, places, tri, section, place, debut });
        envoyer({ type: 'termes', demande: demande.demande, generation: courant.generation, ...page });
        return;
      }
      case 'fiche': {
        const courant = await etatDeLaGeneration(demande.demande, demande.generation);
        if (!courant) return;
        envoyer({ type: 'fiche', demande: demande.demande, generation: courant.generation, fiche: courant.projection.fiche(demande.terme) });
        return;
      }
      case 'noms-selection': {
        const courant = await etatDeLaGeneration(demande.demande, demande.generation);
        if (!courant) return;
        envoyer({ type: 'noms-selection', demande: demande.demande, generation: courant.generation, principaux: courant.projection.principaux([...demande.exclus, ...demande.inclus]) });
        return;
      }
      case 'diagnostic': {
        const courant = await etatDeLaGeneration(demande.demande, demande.generation);
        if (!courant) return;
        const texte = JSON.stringify({ version: 1, ...courant.projection.diagnostic(), regles: JSON.parse(exporterLesRegles(courant.regles)) }, null, 2);
        envoyer({ type: 'diagnostic', demande: demande.demande, generation: courant.generation, texte });
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
