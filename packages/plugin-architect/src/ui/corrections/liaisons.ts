/**
 * La carte des liaisons préparées : ce que le sandbox rend à `lier-preparation`, rangé dans l'analyse, devient une carte de
 * Corrections. Une ligne cochable par correction, une ligne sans case par liaison dont la variable n'est pas encore publiée.
 * Le calcul ne touche pas au DOM et ne lit que ces données et la lecture du composant.
 */
import type { LiaisonsPreparees } from '../composant/analyse';
import { TEXTES } from '../textes';
import type { CarteDeCorrections, ContexteDeCartes, LigneDeCarte, LigneEnAttente } from './modele';

const T = TEXTES.correctionsDuComposant;

const uniques = <Type>(valeurs: readonly Type[]): Type[] => [...new Set(valeurs)];

/** Le nombre de variables, distinctes, que ces lignes attendent de la library publiée. */
export const variablesNonPublieesDeLaListe = (attente: readonly LigneEnAttente[]): number => uniques(attente.map((entree) => entree.variable)).length;

/**
 * La carte des liaisons préparées, ou `null` quand il ne reste rien à montrer. `appliquees` retire les corrections déjà écrites.
 * Le dernier segment d'un token dit le rôle que le layer reçoit : la ligne le marque.
 */
export function carteDesLiaisonsPreparees(liaisons: LiaisonsPreparees, appliquees: readonly string[], contexte: ContexteDeCartes): CarteDeCorrections | null {
  const corrections = liaisons.corrections.filter((correction) => !appliquees.includes(correction.id));
  if (corrections.length + liaisons.enAttente.length === 0) return null;

  const lignes: LigneDeCarte[] = corrections.map((correction) => ({
    id: correction.id, constat: null, correction, avant: T.enDur(correction.cible.champ ?? ''), apres: correction.apres.nom,
    marquesAvant: [], marquesApres: [correction.apres.nom.split('/').length - 1],
  }));
  const attente: LigneEnAttente[] = liaisons.enAttente.map((entree) => ({
    variable: entree.variable,
    layer: entree.nomDuLayer,
    variant: contexte.variants.find((variant) => variant.id === entree.variant)?.nom ?? null,
  }));
  const layers = uniques([...corrections.flatMap((correction) => (correction.cible.layer === undefined ? [] : [correction.cible.layer])), ...liaisons.enAttente.map((entree) => entree.layer)]);
  const nonPubliees = variablesNonPublieesDeLaListe(attente);

  return {
    cle: `preparation:${liaisons.preparation}`, origine: 'preparation', section: 'liaisons', jetons: null,
    phrase: [T.lierLesLayers(contexte.composant)],
    meta: nonPubliees === 0 ? [T.layers([], layers.length)] : [T.layers([], layers.length), '. ', T.variablesEnAttente(nonPubliees)],
    lignes, layers, constats: [], faits: [], attente,
  };
}

