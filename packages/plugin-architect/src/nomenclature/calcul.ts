/**
 * Le calcul des noms, sans le sandbox : de l'inventaire et des règles du fichier au `Bilan`. Le module est pur et n'importe ni
 * `figma`, ni le journal du mode Tokens, ni le socle d'interface ; il peut donc tourner dans le sandbox, dans un Worker de
 * l'interface ou sous Node. La session du sandbox l'appelle et y ajoute les tranches, le journal et les écritures.
 *
 * L'entrée (`EntreeDuCalcul`) tient en données seules : `structuredClone` la copie sans perte. Elle porte l'inventaire, avec la
 * protection de chaque variable et la marque de Palettes que le sandbox a lues, et les règles du fichier. La sortie est le `Bilan`
 * que l'écran reçoit, dans son ordre complet. `Moteur` permet à un test de compter les appels du kit.
 */
import {
  REGISTRES, REGISTRES_ARCHITECTURE, assembler, commencerLexique, decouperSegment, detecterParEtapes, indexerVocabulaire,
  motsAvecCasse, normaliserParEtapes, porteesTouchees, termeReconnu,
  type ConflitDeVocabulaire, type IndexDuVocabulaire, type Lexique, type Mots,
  type Collision, type Renommage, type ResultatDesQuestions, type ResultatDuLexique,
} from '@ucm-kit/core/referentiel';
import {
  CONVENTION_DES_COLLECTIONS, avecLesCheminsPublies, conventionsDe, ecritureEffective, idsNonRenommables, inventaireSelonLaProtection, nomsSelonLesRegles, palettesLibres,
  type Inventaire,
} from '@ucm-kit/core/nommage';
import type { Bilan, EcritureChoisie, EtapeDesNoms } from '../messages/nomenclature';
import { projeter, type EntreeDeProjection, type Projection } from './projection';
import { dejaJugeDuFichier, vocabulaireDuFichier, type ReglesDuFichier } from './regles';

export interface Moteur {
  readonly commencerLexique: typeof commencerLexique;
  readonly indexerVocabulaire: typeof indexerVocabulaire;
  readonly normaliserParEtapes: typeof normaliserParEtapes;
  readonly detecterParEtapes: typeof detecterParEtapes;
  readonly porteesTouchees: typeof porteesTouchees;
}
export const moteurDuKit: Moteur = { commencerLexique, indexerVocabulaire, normaliserParEtapes, detecterParEtapes, porteesTouchees };

/**
 * Le moteur qui annonce l'étape où le calcul entre : `lexique` à la préparation du lexique (qui précède les renommages), `questions` à la détection
 * des questions. Chaque étape s'annonce une fois. La session du sandbox et l'atelier du Worker l'emploient de la même façon, pour que l'écran
 * reçoive les mêmes événements de l'une ou de l'autre voie ; ses résultats ne changent pas.
 */
export function moteurAnnonceur(moteur: Moteur, signaler: (etape: EtapeDesNoms) => void): Moteur {
  const annoncees = new Set<EtapeDesNoms>();
  const annoncer = (etape: EtapeDesNoms): void => {
    if (annoncees.has(etape)) return;
    annoncees.add(etape);
    signaler(etape);
  };
  return {
    ...moteur,
    commencerLexique: (options) => { annoncer('lexique'); return moteur.commencerLexique(options); },
    detecterParEtapes: (lexique, index, dejaJuge, options) => { annoncer('questions'); return moteur.detecterParEtapes(lexique, index, dejaJuge, options); },
  };
}

// Les règles qui comptent pour le calcul

export const premierLancement = (regles: ReglesDuFichier): boolean => regles.ecriture === undefined || regles.ecritureDeLaV1;
export const memes = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Les mots d'un terme tels que le kit les découpe : `foregroundMain` donne `foreground` et `main`. */
export const motsDe = (texte: string): Mots => decouperSegment(texte.trim()).map((mot) => mot.toLowerCase());
export const jointure = (mots: Mots): string => mots.map((mot) => mot.toLowerCase()).join(' ');

/** Le mot, ses formes tolérées et leurs découpes, pour un terme UCM désigné par son identifiant. */
export function motsDuTermeUcm(id: string): Mots[] {
  const mots: Mots[] = [decouperSegment(id)];
  for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE]) {
    for (const tolere of termeReconnu(registre, id)?.toleres ?? []) mots.push(decouperSegment(tolere));
  }
  return mots;
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

// Le calcul

export interface Indexation { readonly index: IndexDuVocabulaire; readonly conflits: readonly ConflitDeVocabulaire[] }
export interface Calcul {
  readonly lexique: Lexique;
  /** Le résultat du lexique, avant l'ajout des collections que le fichier renomme. */
  readonly brut: ResultatDuLexique;
  readonly nonRenommables: readonly string[];
  readonly indexation: Indexation;
  readonly ecriture: EcritureChoisie;
  readonly resultat: ResultatDuLexique;
  readonly questions: ResultatDesQuestions;
}
export interface Etat extends Calcul {
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

/** Le nom d'une collection UCM écrit dans la convention des collections, comme le kit l'écrit pour un renommage proposé. */
const nomDeCollection = (canonique: string): string =>
  assembler(canonique, motsAvecCasse(decouperSegment(canonique), CONVENTION_DES_COLLECTIONS.casse), CONVENTION_DES_COLLECTIONS.separateur);

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
  for (const [id, choisie] of renommees) {
    const cible = nomDeCollection(choisie);
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
export const palettesLibresSelon = (inventaire: Inventaire, regles: ReglesDuFichier): boolean => palettesLibres(inventaire, !premierLancement(regles));

/**
 * Le calcul complet depuis l'inventaire : lexique, vocabulaire, renommages, questions. Les collections exclues n'y entrent pas.
 * Les renommages viennent de `nomsSelonLesRegles` du socle, que UCM Palettes appelle aussi ; ici s'ajoutent les collections
 * que le fichier renomme, avant le contrôle des chemins publiés.
 */
export function* calculerTout(moteur: Moteur, inventaire: Inventaire, regles: ReglesDuFichier): Generator<void, Calcul> {
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
export function* recalculer(moteur: Moteur, base: Etat, regles: ReglesDuFichier, avecQuestions: boolean): Generator<void, Calcul> {
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

export function construireEtat(generation: number, inventaire: Inventaire, regles: ReglesDuFichier, calcul: Calcul): Etat {
  const noms = new Map<string, string>();
  for (const entree of inventaire.entrees) if (entree.cible.type === 'variable') noms.set(entree.nom.id, entree.nom.nom);
  const entree: EntreeDeProjection = {
    generation, lexique: calcul.lexique, resultat: calcul.resultat, questions: calcul.questions, regles,
    // L'écran compte comme protégées les seules variables que le calcul ne renomme pas.
    ecriture: calcul.ecriture, inventaire: inventaireSelonLaProtection(inventaire, { palettesLibres: palettesLibresSelon(inventaire, regles) }),
    nomDeLaCible: (identifiant) => noms.get(identifiant),
  };
  return { ...calcul, generation, inventaire, regles, entree, projection: projeter(entree) };
}

// Le calcul pur : de l'entrée sérialisable au bilan

/**
 * Tout ce que le calcul lit. `inventaire` vient d'une acquisition fraîche du sandbox, avec la protection et les refus de lecture de
 * chaque entrée et la marque de Palettes ; `regles` est ce que le fichier range ; `generation` est le numéro que le bilan porte.
 * Aucune fonction, aucun objet Figma : `structuredClone` copie l'entrée sans perte.
 */
export interface EntreeDuCalcul {
  readonly generation: number;
  readonly inventaire: Inventaire;
  readonly regles: ReglesDuFichier;
}

/** Le bilan que l'écran reçoit pour cette entrée : lexique, renommages, collisions, questions, puis projection, dans l'ordre complet. */
export function* calculerLeBilan(entree: EntreeDuCalcul, moteur: Moteur = moteurDuKit): Generator<void, Bilan> {
  const calcul = yield* calculerTout(moteur, entree.inventaire, entree.regles);
  return construireEtat(entree.generation, entree.inventaire, entree.regles, calcul).projection.bilan();
}

/** Mène un calcul du kit jusqu'au bout sans céder : pour un Worker, un test ou un moteur qui n'a pas besoin de tranches. */
export function menerSansCeder<T>(calcul: Generator<void, T>): T {
  for (let etape = calcul.next(); ; etape = calcul.next()) if (etape.done) return etape.value;
}

/** Mène `calculerLeBilan` sans céder. */
export function calculerLeBilanDirect(entree: EntreeDuCalcul, moteur: Moteur = moteurDuKit): Bilan {
  return menerSansCeder(calculerLeBilan(entree, moteur));
}

/** L'état complet que le calcul de `entree` donne, sans céder : le Worker le garde pour répondre aux lectures et aux gestes. */
export function calculerLEtatDirect(entree: EntreeDuCalcul, moteur: Moteur = moteurDuKit): Etat {
  const calcul = menerSansCeder(calculerTout(moteur, entree.inventaire, entree.regles));
  return construireEtat(entree.generation, entree.inventaire, entree.regles, calcul);
}
