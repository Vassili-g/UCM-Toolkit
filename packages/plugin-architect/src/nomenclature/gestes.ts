/**
 * Ce que la session et le Worker partagent pour les gestes, les lectures et les simulations de Nomenclature : les règles qu'un geste ou une
 * réponse écrit, le terme que l'effet d'un geste met en avant, la réponse à chaque lecture paginée et les renommages d'une sélection.
 *
 * Le module est pur : il ne lit ni Figma, ni le stockage des règles, ni le journal. Le sandbox lui donne ce qu'il a lu, par exemple le
 * stockage sous forme de `Map`, et écrit lui-même le résultat. Le Worker et la session appellent les mêmes fonctions, donc ils répondent pareil.
 */
import { REGISTRES, REGISTRES_ARCHITECTURE, COLLECTIONS, decouperSegment, type Collection, type ConflitDeVocabulaire, type Lexique, type Mots, type Question } from '@ucm-kit/core/referentiel';
import type { CodeDErreur, ConflitVue, EffetVue, GesteSurLesRegles, MessageDeNomenclature, Reponse, Selection } from '../messages/nomenclature';
import type { DemandeDeLecture, RenommageAEcrire, TravailDePreparation } from '../messages/calculDesNoms';
import { jointure, motsDe, motsDuTermeUcm, type Calcul, type Etat, type Moteur } from './calcul';
import { conflitVue, effetDEcriture, effetDeTerme, type EntreeDeProjection } from './projection';
import {
  CLE_EXCLUES, cleDuTermeOrdinaire, cleEcart, cleOrdinaire, clePlusTard, cleReponse, cleTerme, cleVoulu, cleDistinct, defaireReponse,
  defaireLImport, estMot, exporterLesRegles, lireLesRegles, preparerReponse, serialiserRegle, vocabulaireDuFichier,
  type Ecriture, type ReglesDuFichier,
} from './regles';

/** Une erreur que la session rend à l'écran sous son code. */
export class ErreurDeProtocole extends Error {
  constructor(readonly code: CodeDErreur) { super(code); }
}

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

export function ecrituresDuGeste(geste: GesteSurLesRegles, regles: ReglesDuFichier, courant: ReadonlyMap<string, string>): Ecriture[] {
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

// Les écritures d'une demande, puis leur essai sur le stockage

/** Ce que les écritures d'une demande lisent de l'état : les questions et l'inventaire, jamais le résultat des renommages. */
export type BaseDesEcritures = Pick<Etat, 'questions' | 'lexique' | 'inventaire'>;

/** Les écritures que `travail` demande : un geste sur les règles, la réponse à une question, ou l'exclusion de collections. */
export function ecrituresDeLaDemande(travail: TravailDePreparation, base: BaseDesEcritures, courant: ReadonlyMap<string, string>, regles: ReglesDuFichier): Ecriture[] {
  switch (travail.sorte) {
    case 'geste': return ecrituresDuGeste(travail.geste, regles, courant);
    case 'reponse': {
      const question = [...base.questions.questions, ...base.questions.autres].find((candidate) => candidate.cle === travail.question);
      if (!question) throw new ErreurDeProtocole('echec');
      return preparerReponse(question.cle, ecrituresDeLaReponse(question, travail.reponse, regles, base.lexique), courant);
    }
    case 'configurer': {
      const connues = new Set(base.inventaire.entrees.map((entree) => entree.cible.collectionId));
      const ids = travail.collectionsExclues.filter((id) => connues.has(id));
      return ids.length > 0 ? [serialiserRegle({ type: 'exclues', ids })] : [{ cle: CLE_EXCLUES, texte: null }];
    }
  }
}

/** Valide les écritures sur le stockage relu : les règles qui en résultent, ou les conflits du vocabulaire. */
export function essayerLesEcritures(
  moteur: Moteur, courant: ReadonlyMap<string, string>, ecritures: readonly Ecriture[],
): { readonly regles: ReglesDuFichier; readonly conflits: readonly ConflitDeVocabulaire[] } {
  const suivant = new Map(courant);
  for (const { cle, texte } of ecritures) {
    if (texte === null || texte === '') suivant.delete(cle);
    else suivant.set(cle, texte);
  }
  const regles = lireLesRegles(suivant);
  return { regles, conflits: moteur.indexerVocabulaire(vocabulaireDuFichier(regles)).conflits };
}

/** Le résultat de `ecrituresDeLaDemande` puis `essayerLesEcritures` : les écritures à ranger et les règles qu'elles donnent, ou le refus du vocabulaire. */
export type PreparationDeGeste =
  | { readonly sorte: 'ecritures'; readonly ecritures: readonly Ecriture[]; readonly regles: ReglesDuFichier }
  | { readonly sorte: 'refus'; readonly conflits: readonly ConflitVue[] };

export function preparerLeGeste(moteur: Moteur, travail: TravailDePreparation, base: BaseDesEcritures, courant: ReadonlyMap<string, string>): PreparationDeGeste {
  const ecritures = ecrituresDeLaDemande(travail, base, courant, lireLesRegles(courant));
  const { regles, conflits } = essayerLesEcritures(moteur, courant, ecritures);
  return conflits.length > 0 ? { sorte: 'refus', conflits: conflits.map(conflitVue) } : { sorte: 'ecritures', ecritures, regles };
}

// La simulation

type Simulation = Extract<MessageDeNomenclature, { readonly type: 'simulation' }>;

/** Ce qu'une simulation décide avant de recalculer : sa réponse tout de suite, ou les règles à recalculer et le terme à mettre en avant. */
export type DebutDeSimulation =
  | { readonly sorte: 'repond'; readonly effet: null; readonly conflit: ConflitVue | null }
  | { readonly sorte: 'recalcule'; readonly regles: ReglesDuFichier; readonly terme: { readonly avant: string; readonly apres: string } | null };

export function debuterLaSimulation(moteur: Moteur, base: Etat, geste: GesteSurLesRegles, courant: ReadonlyMap<string, string>): DebutDeSimulation {
  const ecritures = ecrituresDuGeste(geste, lireLesRegles(courant), courant);
  const { regles, conflits } = essayerLesEcritures(moteur, courant, ecritures);
  if (conflits.length > 0) return { sorte: 'repond', effet: null, conflit: conflitVue(conflits[0]) };
  const terme = termeDeLEffet(geste, regles, base.lexique);
  if (geste.type !== 'ecriture' && !terme) return { sorte: 'repond', effet: null, conflit: null };
  return { sorte: 'recalcule', regles, terme };
}

export function conclureLaSimulation(base: Etat, geste: GesteSurLesRegles, debut: Extract<DebutDeSimulation, { readonly sorte: 'recalcule' }>, calcul: Calcul): EffetVue {
  const simulee: EntreeDeProjection = { ...base.entree, regles: debut.regles, resultat: calcul.resultat, ecriture: calcul.ecriture };
  return geste.type === 'ecriture' ? effetDEcriture(simulee) : effetDeTerme(base.entree, simulee, debut.terme!);
}

export function messageDeSimulation(demande: number, base: Etat, effet: EffetVue | null, conflit: Simulation['conflit']): Simulation {
  return { type: 'simulation', demande, generation: base.generation, effet, conflit };
}

// Les lectures paginées

/** La réponse à une lecture paginée : celle que la session rend d'un état complet, et celle que le Worker rend du sien. */
export function repondreALaLecture(lecture: DemandeDeLecture, courant: Etat): MessageDeNomenclature {
  switch (lecture.type) {
    case 'lignes': {
      const page = courant.projection.lignes(lecture.groupe, lecture.debut);
      return { type: 'lignes', demande: lecture.demande, generation: courant.generation, groupe: lecture.groupe, debut: lecture.debut, ...page };
    }
    case 'termes': {
      const { recherche, types, origines, places, tri, section, place, debut } = lecture;
      const page = courant.projection.termes({ recherche, types, origines, places, tri, section, place, debut });
      return { type: 'termes', demande: lecture.demande, generation: courant.generation, ...page };
    }
    case 'fiche':
      return { type: 'fiche', demande: lecture.demande, generation: courant.generation, fiche: courant.projection.fiche(lecture.terme) };
    case 'noms-selection':
      return { type: 'noms-selection', demande: lecture.demande, generation: courant.generation, principaux: courant.projection.principaux([...lecture.exclus, ...lecture.inclus]) };
    case 'diagnostic': {
      const texte = JSON.stringify({ version: 1, ...courant.projection.diagnostic(), regles: JSON.parse(exporterLesRegles(courant.regles)) }, null, 2);
      return { type: 'diagnostic', demande: lecture.demande, generation: courant.generation, texte };
    }
  }
}

// Les renommages d'une sélection

/** Les renommages que la sélection coche, avec leur ancien et leur nouveau nom : ce que le sandbox écrira après les avoir relus dans Figma. */
export function renommagesDeLaSelection(courant: Etat, selection: Selection): RenommageAEcrire[] {
  const renommages = new Map(courant.resultat.renommages.map((renommage) => [renommage.id, renommage]));
  return courant.projection.identifiants(selection).flatMap((id): RenommageAEcrire[] => {
    const renommage = renommages.get(id);
    return renommage ? [{ id, ancienNom: renommage.ancienNom, nouveauNom: renommage.nouveauNom }] : [];
  });
}
