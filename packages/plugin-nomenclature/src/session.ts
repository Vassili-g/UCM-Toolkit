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
 * Le moteur vient du kit ; `Moteur` permet à un test de compter ses appels.
 */
import {
  COLLECTIONS, REGISTRES, REGISTRES_ARCHITECTURE, commencerLexique, decouperSegment, detecterParEtapes, indexerVocabulaire,
  normaliserParEtapes, porteesTouchees,
  type ConflitDeVocabulaire, type IndexDuVocabulaire, type Lexique, type Mots,
  type Collection, type Collision, type Question, type Renommage, type ResultatDesQuestions, type ResultatDuLexique,
} from '@ucm-kit/core/referentiel';
import { avecLesCheminsPublies, conventionsDe, ecritureEffective, idsNonRenommables, nomsSelonLesRegles } from 'ucm-plugin-socle/src/nomsSelonLesRegles';
import {
  annulerLeDernierRenommage, appliquerLesRenommages,
  type PortDeRegles, type PortEcriture, type RenommageDemande, type ResultatEcriture,
} from './ecriture';
import { inventaireSelonLaProtection, lireInventaire, palettesLibres, type Inventaire, type PortDeLecture } from './lecture';
import type {
  CodeDErreur, DemandeArchitect, EcritureChoisie, EffetVue, GesteSurLesRegles, PluginMessage, Reponse, ResultatVue,
} from './messages';
import { conflitVue, effetDEcriture, effetDeTerme, projeter, type EntreeDeProjection, type Projection } from './projection';
import {
  CLE_EXCLUES, cleDuTermeOrdinaire, cleEcart, cleOrdinaire, clePlusTard, cleReponse, cleTerme, cleVoulu, cleDistinct, dejaJugeDuFichier, defaireReponse,
  defaireLImport, estMot, exporterLesRegles, importerLesRegles, lireLesRegles, lireLeStockage, preparerImport, preparerReponse, rangerLesEcritures,
  serialiserRegle,
  vocabulaireDuFichier,
  type Ecriture, type ReglesDuFichier,
} from './regles';
import { mener, pauseParDefaut, type OptionsDeTranches } from './tranches';

export interface Moteur {
  readonly commencerLexique: typeof commencerLexique;
  readonly indexerVocabulaire: typeof indexerVocabulaire;
  readonly normaliserParEtapes: typeof normaliserParEtapes;
  readonly detecterParEtapes: typeof detecterParEtapes;
  readonly porteesTouchees: typeof porteesTouchees;
}
export const moteurDuKit: Moteur = { commencerLexique, indexerVocabulaire, normaliserParEtapes, detecterParEtapes, porteesTouchees };

export interface PortDeSession {
  readonly lecture: PortDeLecture;
  readonly ecriture: PortEcriture;
  readonly regles: PortDeRegles;
}

export interface OptionsDeSession {
  readonly port: PortDeSession;
  readonly envoyer: (message: PluginMessage) => void;
  readonly moteur?: Moteur;
  readonly tranches?: OptionsDeTranches;
  /** Heure du journal ; l'heure courante par défaut. */
  readonly heure?: () => string;
}

export interface Session {
  /** Traite une demande de l'écran ; la promesse se résout quand la demande est répondue ou écartée. */
  recevoir(demande: DemandeArchitect): Promise<void>;
}

type DemandeDeCalcul = Extract<DemandeArchitect, { type: 'analyser' | 'regle' | 'repondre' | 'configurer' | 'importer' | 'appliquer' | 'annuler-dernier' }>;
const TYPES_DE_CALCUL: ReadonlySet<DemandeArchitect['type']> = new Set(['analyser', 'regle', 'repondre', 'configurer', 'importer', 'appliquer', 'annuler-dernier']);
/** Pour ces calculs, une demande plus récente de même sorte écarte la précédente. */
const DERNIERE_INTENTION: ReadonlySet<DemandeArchitect['type']> = new Set(['analyser', 'configurer']);

class ErreurDeProtocole extends Error {
  constructor(readonly code: CodeDErreur) { super(code); }
}

// Les règles qui comptent pour le calcul

const premierLancement = (regles: ReglesDuFichier): boolean => regles.ecriture === undefined || regles.ecritureDeLaV1;
const memes = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Ce qu'`appliquer` compare : les règles qui changent les renommages proposés. */
const signatureDuCalcul = (regles: ReglesDuFichier): string =>
  JSON.stringify([regles.ecriture ?? null, regles.termes, regles.ecartsUcm, regles.collectionsExclues, regles.collectionsRenommees]);

const motsDe = (texte: string): Mots => texte.trim().toLowerCase().split(/[\s-]+/u).filter((mot) => mot !== '');
const jointure = (mots: Mots): string => mots.map((mot) => mot.toLowerCase()).join(' ');

/** Le mot, ses formes tolérées et leurs découpes, pour un terme UCM désigné par son identifiant. */
function motsDuTermeUcm(id: string): Mots[] {
  const cle = id.toLowerCase();
  const mots: Mots[] = [decouperSegment(id)];
  for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE]) {
    for (const terme of registre.termes) {
      if (terme.id.toLowerCase() !== cle) continue;
      for (const tolere of terme.toleres ?? []) mots.push(decouperSegment(tolere));
    }
  }
  return mots;
}

/** L'identifiant UCM d'un terme écrit `disable` ou `extra-small` ; à défaut, le terme lui-même. */
function identifiantUcm(terme: string): string {
  const cle = motsDe(terme).join('-');
  for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE]) {
    for (const candidat of registre.termes) if (decouperSegment(candidat.id).map((mot) => mot.toLowerCase()).join('-') === cle) return candidat.id;
  }
  return cle;
}

/** Les suites de mots dont une règle a changé : celles qui gardent un terme, celles qu'il remplace, et les formes d'un terme UCM écarté. */
function termesChanges(avant: ReglesDuFichier, apres: ReglesDuFichier): Mots[] {
  const lister = (regles: ReglesDuFichier) => new Map(regles.termes.map((terme) => [jointure(terme.terme), terme]));
  const a = lister(avant);
  const b = lister(apres);
  const touches: Mots[] = [];
  for (const cle of new Set([...a.keys(), ...b.keys()])) {
    const ancien = a.get(cle);
    const nouveau = b.get(cle);
    if (memes(ancien ?? null, nouveau ?? null)) continue;
    for (const terme of [ancien, nouveau]) if (terme) touches.push(terme.terme, ...terme.remplace);
  }
  const ecartsAvant = new Set(avant.ecartsUcm);
  const ecartsApres = new Set(apres.ecartsUcm);
  for (const id of new Set([...ecartsAvant, ...ecartsApres])) {
    if (ecartsAvant.has(id) !== ecartsApres.has(id)) touches.push(...motsDuTermeUcm(id));
  }
  return touches;
}

/** Ce qui change la détection : les jugements du fichier, et le nombre de questions mises de côté qui agrandit le plafond. */
const jugementsDuFichier = (regles: ReglesDuFichier) => {
  const { distincts, voulus, collectionsGardees } = dejaJugeDuFichier(regles);
  return { distincts, voulus, collectionsGardees, misesDeCote: regles.plusTard.length };
};

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
      const mots = motsDe(geste.terme);
      const existant = regles.termes.find((terme) => jointure(terme.terme) === jointure(mots));
      if (!existant) return [];
      const reste = existant.remplace.filter((forme) => jointure(forme) !== jointure(motsDe(geste.remplace)));
      return [reste.length === 0 ? { cle: cleTerme(existant.terme), texte: null } : serialiserRegle({ type: 'terme', terme: { ...existant, remplace: reste } })];
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

const employe = (lexique: Lexique, forme: string): boolean => lexique.occurrences.has(motsDe(forme)[0] ?? '');

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

// Le calcul

interface Indexation { readonly index: IndexDuVocabulaire; readonly conflits: readonly ConflitDeVocabulaire[] }
interface Calcul {
  readonly lexique: Lexique;
  /** Le résultat du lexique, avant l'ajout des collections que le fichier renomme. */
  readonly brut: ResultatDuLexique;
  readonly nonRenommables: readonly string[];
  readonly indexation: Indexation;
  readonly ecriture: EcritureChoisie;
  readonly resultat: ResultatDuLexique;
  readonly questions: ResultatDesQuestions;
}
interface Etat extends Calcul {
  readonly generation: number;
  readonly inventaire: Inventaire;
  readonly regles: ReglesDuFichier;
  readonly entree: EntreeDeProjection;
  readonly projection: Projection;
}

/**
 * Les questions sont détectées sans `plusTard` : la projection sépare celles que le fichier met de côté.
 * Le plafond de dix s'agrandit du nombre de questions mises de côté, qui ne prennent donc aucune place.
 */
function* detecter(moteur: Moteur, lexique: Lexique, indexation: Indexation, regles: ReglesDuFichier): Generator<void, ResultatDesQuestions> {
  return yield* moteur.detecterParEtapes(lexique, indexation.index, { ...dejaJugeDuFichier(regles), plusTard: [] }, { maximum: 10 + regles.plusTard.length });
}

/**
 * Ajoute un renommage par collection que le fichier renomme vers une collection UCM. Si une autre collection porte déjà
 * ce nom, après les renommages du kit et ceux déjà ajoutés, les deux forment une collision, comme dans le kit.
 */
function avecLesCollectionsRenommees(lexique: Lexique, brut: ResultatDuLexique, regles: ReglesDuFichier): ResultatDuLexique {
  const renommees = Object.entries(regles.collectionsRenommees).filter(([id]) => lexique.noms.get(id)?.categorie === 'collections');
  if (renommees.length === 0) return brut;
  const noms = new Map<string, string>();
  for (const nom of lexique.noms.values()) if (nom.categorie === 'collections') noms.set(nom.id, nom.nom);
  for (const renommage of brut.renommages) if (renommage.categorie === 'collections') noms.set(renommage.id, renommage.nouveauNom);
  const ajoutes: Renommage[] = [];
  const collisions: Collision[] = [];
  for (const [id, cible] of renommees) {
    const ancien = lexique.noms.get(id)!.nom;
    if (ancien === cible) continue;
    const occupants = [...noms].filter(([autre, nom]) => autre !== id && nom === cible).map(([autre]) => autre);
    if (occupants.length > 0) {
      collisions.push({ categorie: 'collections', portee: 'document', nom: cible, ids: [...occupants, id] });
      continue;
    }
    noms.set(id, cible);
    ajoutes.push({ id, categorie: 'collections', portee: 'document', ancienNom: ancien, nouveauNom: cible, regles: [`collection:${id}`], termes: [] });
  }
  const ids = new Set(ajoutes.map((renommage) => renommage.id));
  const parId = new Map([...brut.renommages.filter((renommage) => !ids.has(renommage.id)), ...ajoutes].map((renommage) => [renommage.id, renommage] as const));
  return { renommages: dansLOrdre(lexique, parId), collisions: [...brut.collisions, ...collisions] };
}

function dansLOrdre(lexique: Lexique, parId: ReadonlyMap<string, Renommage>): Renommage[] {
  const renommages: Renommage[] = [];
  for (const id of lexique.noms.keys()) {
    const renommage = parId.get(id);
    if (renommage) renommages.push(renommage);
  }
  return renommages;
}

/** Les variables de Palettes se renomment quand Palettes suit les règles du fichier et qu'une écriture est rangée (le jugement du socle). */
const palettesLibresSelon = (inventaire: Inventaire, regles: ReglesDuFichier): boolean => palettesLibres(inventaire, !premierLancement(regles));

/**
 * Le calcul complet depuis l'inventaire : lexique, vocabulaire, renommages, questions. Les collections exclues n'y entrent pas.
 * Les renommages viennent de `nomsSelonLesRegles` du socle, que UCM Palettes appelle aussi ; ici s'ajoutent les collections
 * que le fichier renomme, avant le contrôle des chemins publiés.
 */
function* calculerTout(moteur: Moteur, inventaire: Inventaire, regles: ReglesDuFichier): Generator<void, Calcul> {
  const nonRenommables = idsNonRenommables(inventaire, regles.collectionsExclues, { palettesLibres: palettesLibresSelon(inventaire, regles) });
  const { lexique, indexation, ecriture, brut, resultat } = yield* nomsSelonLesRegles(
    inventaire,
    { ecriture: regles.ecriture, vocabulaire: vocabulaireDuFichier(regles), ordinaires: regles.ordinaires, collectionsExclues: regles.collectionsExclues },
    nonRenommables,
    { moteur, ajuster: (lexiqueCalcule, resultatDuKit) => avecLesCollectionsRenommees(lexiqueCalcule, resultatDuKit, regles) },
  );
  const questions = yield* detecter(moteur, lexique, indexation, regles);
  return { lexique, nonRenommables, indexation, ecriture, brut, resultat, questions };
}

/** Les renommages précédents hors des portées recalculées, plus ceux du recalcul, dans l'ordre du lexique. */
function fusionner(lexique: Lexique, precedent: ResultatDuLexique, partiel: ResultatDuLexique, portees: readonly string[]): ResultatDuLexique {
  const recalculees = new Set(portees);
  const parId = new Map([...precedent.renommages.filter((renommage) => !recalculees.has(renommage.portee)), ...partiel.renommages]
    .map((renommage) => [renommage.id, renommage] as const));
  return {
    renommages: dansLOrdre(lexique, parId),
    collisions: [...precedent.collisions.filter((collision) => !recalculees.has(collision.portee)), ...partiel.collisions],
  };
}

/**
 * Le calcul que de nouvelles règles demandent, depuis l'état courant et sans lire Figma. Une collection exclue en plus
 * ou en moins refait le lexique depuis l'inventaire en mémoire. Sinon le lexique et sa détection de conventions
 * restent ; une autre écriture recalcule tout, un terme recalcule les portées où il apparaît, et les questions ne
 * sont détectées de nouveau que si une règle qui les touche a changé.
 */
function* recalculer(moteur: Moteur, base: Etat, regles: ReglesDuFichier, avecQuestions: boolean): Generator<void, Calcul> {
  // Une collection exclue, ou un terme ordinaire, en plus ou en moins change les noms ou leur nature : tout le lexique se refait.
  // Le premier choix d'écriture libère les variables de Palettes : les noms non renommables changent, le calcul repart de zéro.
  if (!memes(base.regles.collectionsExclues, regles.collectionsExclues) || !memes(base.regles.ordinaires, regles.ordinaires)
    || palettesLibresSelon(base.inventaire, base.regles) !== palettesLibresSelon(base.inventaire, regles)) return yield* calculerTout(moteur, base.inventaire, regles);
  const termes = termesChanges(base.regles, regles);
  const indexation = termes.length > 0 ? moteur.indexerVocabulaire(vocabulaireDuFichier(regles)) : base.indexation;
  const ecriture = ecritureEffective(regles, base.lexique);
  const options = { nonRenommables: base.nonRenommables };
  let brut = base.brut;
  if (!memes(ecriture, base.ecriture)) {
    brut = yield* moteur.normaliserParEtapes(base.lexique, conventionsDe(ecriture), indexation.index, options);
  } else if (termes.length > 0) {
    const portees = moteur.porteesTouchees(base.lexique, termes);
    if (portees.length > 0) {
      const partiel = yield* moteur.normaliserParEtapes(base.lexique, conventionsDe(ecriture), indexation.index, { ...options, portees });
      brut = fusionner(base.lexique, base.brut, partiel, portees);
    }
  }
  const redetecter = avecQuestions && (termes.length > 0 || !memes(jugementsDuFichier(base.regles), jugementsDuFichier(regles)));
  const questions = redetecter ? yield* detecter(moteur, base.lexique, indexation, regles) : base.questions;
  const resultat = brut !== base.brut || !memes(base.regles.collectionsRenommees, regles.collectionsRenommees)
    ? avecLesCheminsPublies(base.inventaire, avecLesCollectionsRenommees(base.lexique, brut, regles)) : base.resultat;
  return { lexique: base.lexique, nonRenommables: base.nonRenommables, indexation, ecriture, brut, resultat, questions };
}

function construireEtat(generation: number, inventaire: Inventaire, regles: ReglesDuFichier, calcul: Calcul): Etat {
  const noms = new Map<string, string>();
  for (const entree of inventaire.entrees) if (entree.cible.type === 'variable') noms.set(entree.cible.variableId, entree.nom.nom);
  const entree: EntreeDeProjection = {
    generation, lexique: calcul.lexique, resultat: calcul.resultat, questions: calcul.questions, regles,
    // L'écran compte comme protégées les seules variables que le calcul ne renomme pas.
    ecriture: calcul.ecriture, inventaire: inventaireSelonLaProtection(inventaire, { palettesLibres: palettesLibresSelon(inventaire, regles) }),
    nomDeLaCible: (identifiant) => noms.get(identifiant),
  };
  return { ...calcul, generation, inventaire, regles, entree, projection: projeter(entree) };
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
}

export function creerSession(options: OptionsDeSession): Session {
  const { port, envoyer } = options;
  const moteur = options.moteur ?? moteurDuKit;
  const tranches = options.tranches ?? {};
  const pause = tranches.pause ?? pauseParDefaut;

  let etat: Etat | null = null;
  let compteur = 0;
  let enCours: Passage | null = null;
  let tourne = false;
  const attente: Passage[] = [];

  const lireRegles = (): ReglesDuFichier => lireLesRegles(lireLeStockage(port.regles));
  const erreur = (demande: number, code: CodeDErreur): void => envoyer({ type: 'erreur', demande, code });
  const exiger = (): Etat => {
    if (!etat) throw new ErreurDeProtocole('echec');
    return etat;
  };
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
    // Les groupes déjà vus ne changent qu'à l'analyse : un geste garde la pastille « Nouveau » de la session.
    let suivant = construireEtat(++compteur, inventaire, base ? { ...regles, vus: base.regles.vus } : regles, calcul);
    if (base && premierLancement(base.regles) && !premierLancement(regles)) {
      const groupes = suivant.projection.bilan().groupes.map((groupe) => groupe.cle);
      rangerLesEcritures(port.regles, [serialiserRegle({ type: 'vus', groupes })]);
      suivant = construireEtat(suivant.generation, inventaire, lireRegles(), calcul);
    }
    etat = suivant;
    envoyerLeBilan(demande, suivant);
    return suivant;
  }

  /** Relit Figma et refait tout le calcul. */
  async function rafraichir(passage: Passage, avecProgression: boolean): Promise<void> {
    const { demande } = passage;
    const regles = lireRegles();
    const inventaire = await lireInventaire(port.lecture, {
      pause,
      avancement: avecProgression ? ({ lues, total }) => envoyer({ type: 'lecture', demande: demande.demande, lues, total }) : undefined,
    });
    const calcul = await mener(calculerTout(moteur, inventaire, regles), () => passage.abandonne, tranches);
    if (calcul.abandonne) return;
    const suivant = valider(demande.demande, null, inventaire, regles, calcul.valeur);
    if (avecProgression && !premierLancement(regles)) {
      const groupes = suivant.projection.bilan().groupes.map((groupe) => groupe.cle);
      if (groupes.some((cle) => !regles.vus.includes(cle))) {
        rangerLesEcritures(port.regles, [serialiserRegle({ type: 'vus', groupes: [...regles.vus, ...groupes] })]);
      }
    }
  }

  /** Recalcule depuis l'état courant après que les règles sont écrites. */
  async function recalculerDepuisLesRegles(passage: Passage, base: Etat, regles: ReglesDuFichier): Promise<void> {
    const calcul = await mener(recalculer(moteur, base, regles, true), () => passage.abandonne, tranches);
    if (calcul.abandonne) return;
    valider(passage.demande.demande, base, base.inventaire, regles, calcul.valeur);
  }

  /** Écrit les règles que `preparer` demande, sauf conflit de vocabulaire, puis recalcule. */
  async function modifierLesRegles(passage: Passage, preparer: (base: Etat, courant: ReadonlyMap<string, string>, regles: ReglesDuFichier) => Ecriture[]): Promise<void> {
    const base = exiger();
    const courant = lireLeStockage(port.regles);
    const ecritures = preparer(base, courant, lireLesRegles(courant));
    const { regles, conflits } = essayer(courant, ecritures);
    if (conflits.length > 0) {
      envoyer({ type: 'refus', demande: passage.demande.demande, conflits: conflits.map(conflitVue) });
      return;
    }
    rangerLesEcritures(port.regles, ecritures);
    await recalculerDepuisLesRegles(passage, base, regles);
  }

  async function importer(passage: Passage, texte: string): Promise<void> {
    const demande = passage.demande.demande;
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
    if (!etat) return rafraichir(passage, false);
    return recalculerDepuisLesRegles(passage, etat, lireRegles());
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

  const resultatVue = (sorte: ResultatVue['sorte'], resultat: ResultatEcriture): ResultatVue => ({
    sorte, statut: resultat.statut, renommes: resultat.renommes.length, sautes: resultat.sautes.length, annulable: resultat.annulable,
    ...(resultat.cause ? { cause: resultat.cause } : {}),
  });

  /** Après une écriture : `application`, puis un `bilan` neuf lu dans Figma, sauf si tout a été refusé. */
  async function conclureUneEcriture(passage: Passage, sorte: ResultatVue['sorte'], resultat: ResultatEcriture): Promise<void> {
    envoyer({ type: 'application', demande: passage.demande.demande, resultat: resultatVue(sorte, resultat) });
    if (resultat.statut !== 'refuse') await rafraichir(passage, false);
  }

  async function appliquer(passage: Passage, demande: Extract<DemandeArchitect, { type: 'appliquer' }>): Promise<void> {
    const base = exiger();
    if (demande.generation !== base.generation) throw new ErreurDeProtocole('generation-perimee');
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
      case 'analyser': return rafraichir(passage, true);
      case 'regle': return modifierLesRegles(passage, (_base, courant, regles) => ecrituresDuGeste(demande.geste, regles, courant));
      case 'repondre':
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
        if (enCours?.demande.type === demande.type) enCours.abandonne = true;
      }
      attente.push({ demande, fin: resoudre, abandonne: false });
      if (!tourne) void tourner();
    });
  }

  // Les lectures

  /** L'état de la génération demandée, ou l'erreur qui répond à la lecture. */
  function etatDeLaGeneration(demande: number, generation: number): Etat | null {
    if (etat && etat.generation === generation) return etat;
    const analyseEnCours = enCours?.demande.type === 'analyser' || attente.some((passage) => passage.demande.type === 'analyser');
    erreur(demande, !etat && analyseEnCours ? 'analyse-en-cours' : 'generation-perimee');
    return null;
  }

  async function simuler(demande: Extract<DemandeArchitect, { type: 'simuler' }>): Promise<void> {
    const base = etatDeLaGeneration(demande.demande, demande.generation);
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
      const calcul = await mener(recalculer(moteur, base, regles, false), () => etat?.generation !== base.generation, tranches);
      if (calcul.abandonne) return erreur(demande.demande, 'generation-perimee');
      const simulee: EntreeDeProjection = { ...base.entree, regles, resultat: calcul.valeur.resultat, ecriture: calcul.valeur.ecriture };
      effet = demande.geste.type === 'ecriture' ? effetDEcriture(simulee) : effetDeTerme(base.entree, simulee, terme!);
    }
    envoyer({ type: 'simulation', demande: demande.demande, generation: base.generation, effet, conflit: null });
  }

  async function lire(demande: DemandeArchitect): Promise<void> {
    switch (demande.type) {
      case 'lignes': {
        const courant = etatDeLaGeneration(demande.demande, demande.generation);
        if (!courant) return;
        const page = courant.projection.lignes(demande.groupe, demande.debut);
        envoyer({ type: 'lignes', demande: demande.demande, generation: courant.generation, groupe: demande.groupe, debut: demande.debut, ...page });
        return;
      }
      case 'termes': {
        const courant = etatDeLaGeneration(demande.demande, demande.generation);
        if (!courant) return;
        const { recherche, types, origines, places, tri, section, place, debut } = demande;
        const page = courant.projection.termes({ recherche, types, origines, places, tri, section, place, debut });
        envoyer({ type: 'termes', demande: demande.demande, generation: courant.generation, ...page });
        return;
      }
      case 'fiche': {
        const courant = etatDeLaGeneration(demande.demande, demande.generation);
        if (!courant) return;
        envoyer({ type: 'fiche', demande: demande.demande, generation: courant.generation, fiche: courant.projection.fiche(demande.terme) });
        return;
      }
      case 'diagnostic': {
        const courant = etatDeLaGeneration(demande.demande, demande.generation);
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
