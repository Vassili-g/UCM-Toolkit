/**
 * Une proposition de couleur garde-t-elle le dessin ? C25 (liaison manquante) et C59 (texte de surface) la posent avant de proposer un
 * token : sans elle, un token qui change la couleur d'un calque, jusqu'à le rendre invisible, serait proposé comme une correction (D19).
 */
import { atteintLeSeuil, contraste } from '../emplois/contraste.js';
import { composer, versOctet, versRgb8, type Rgba } from '../emplois/couleur.js';
import { SEUILS_PAR_ROLE } from '../referentiel/contraste.js';
import { estUneIconeMesureeParSurcharge } from '../referentiel/layers.js';
import { collectionDuCatalogue, variableDuCatalogue, type CatalogueDeReference, type CollectionDuCatalogue, type VariableDuCatalogue } from './catalogue.js';
import { combinaisonDuLayer, couleurDeLiaison, fondEffectif, fondsPeintsSous, pileDePeintures, seuilDeLaPlage, SEUILS_D_ACCESSIBILITE, type Combinaison } from './accessibilite.js';
import { liaisonsPropres, type LayerLu, type LiaisonLue, type PeintureLue, type VariantLu } from './releve.js';

/**
 * `garde` : dans chaque combinaison de modes, le candidat a la couleur actuelle ou garde le contraste avec le fond prouvé.
 * `change` : une combinaison montre une autre couleur sans contraste suffisant. `inconnu` : une valeur, un fond ou le produit des modes ne se lit pas.
 */
export type GardeDuDessin = 'garde' | 'change' | 'inconnu';

/** Au-delà, le produit des modes n'est pas parcouru : le verdict est `inconnu`. */
const COMBINAISONS_MAXIMALES = 256;

export interface PropositionDeCouleur {
  readonly variant: VariantLu;
  readonly layer: LayerLu;
  readonly champ: 'fills' | 'strokes';
  /** La peinture visée : son indice, ou la plage d'un texte. */
  readonly indice?: number;
  readonly plage?: { readonly debut: number; readonly fin: number };
  /** La liaison actuelle de cette peinture ; absente, la couleur actuelle est celle que le calque écrit en dur. */
  readonly liaison?: LiaisonLue;
  readonly candidat: VariableDuCatalogue;
}

/**
 * La couleur résolue du candidat égale la couleur actuelle dans chaque combinaison de modes des collections que leurs alias atteignent
 * (à 8 bits par canal, la précision à laquelle le kit mesure le contraste), ou son contraste avec le fond de `fondsPeintsSous` atteint
 * le seuil du calque. Le seuil d'une plage de texte est celui de C49 au niveau AA (`seuilDeLaPlage` : le grand texte selon sa taille et sa
 * graisse) ; un texte sans plage nommée garde le plus strict (4,5). Celui d'une icône mesurée (`estUneIconeMesuree` : certaine, ou faite d'un seul dessin) vient de `SEUILS_PAR_ROLE`, celui des
 * autres calques est le non-texte. Le niveau est AA : ni `proposerLesCorrections` ni `controlerLeTheme`, qui appellent cette fonction,
 * ne reçoivent le niveau que lit `controlerLAccessibilite`.
 *
 * Quand la liaison est celle d'une surcharge, la peinture jugée est celle du calque que la surcharge peint (`liaison.surcharge.peintures`),
 * pas celle de l'hôte ; sans elle, le verdict est `inconnu`.
 */
export function gardeLeDessin(catalogue: CatalogueDeReference, proposition: PropositionDeCouleur): GardeDuDessin {
  const { variant, layer, liaison, candidat } = proposition;
  const peintures = peinturesVisees(layer, proposition);
  const peinture = peintures?.find((entree) => entree.indice === indiceVise(proposition));
  if (!peintures || !peinture || peinture.type !== 'SOLID' || liaison?.illisible) return 'inconnu';
  if (liaison?.variable.cle === candidat.cle) return 'garde';
  const fonds = fondsPeintsSous(variant, layer);
  const cles = [candidat.cle, ...(liaison ? [liaison.variable.cle] : [])];
  for (const fond of fonds) for (const l of liaisonsPropres(fond.layer)) if (l.champ === 'fills') cles.push(l.variable.cle);
  const combinaisons = combinaisonsDeModes(catalogue, cles);
  if (!combinaisons) return 'inconnu';
  let verdict: GardeDuDessin = 'garde';
  for (const combinaison of combinaisons) {
    const une = gardeDansLaCombinaison(catalogue, proposition, peinture, combinaison);
    if (une === 'change') return 'change';
    if (une === 'inconnu') verdict = 'inconnu';
  }
  return verdict;
}

/** L'indice de la peinture visée ; une plage de texte sans indice vise la première. */
function indiceVise({ indice, liaison }: PropositionDeCouleur): number { return indice ?? liaison?.indice ?? 0; }

/** Les peintures du champ visé : celles du calque peint par la surcharge de la liaison (absentes : non lues), sinon celles du layer ou de la plage. */
function peinturesVisees(layer: LayerLu, { champ, plage, liaison }: PropositionDeCouleur): PeintureLue[] | undefined {
  if (liaison?.surcharge) return liaison.surcharge.peintures?.filter((peinture) => peinture.champ === champ);
  if (!plage) return layer.peintures.filter((peinture) => peinture.champ === champ);
  return layer.texte?.plages.find((entree) => entree.debut === plage.debut && entree.fin === plage.fin)?.peintures.filter((peinture) => peinture.champ === champ);
}

function gardeDansLaCombinaison(catalogue: CatalogueDeReference, proposition: PropositionDeCouleur, peinture: PeintureLue, combinaison: Combinaison): GardeDuDessin {
  const { variant, layer, liaison, candidat } = proposition;
  // Le calque subit les modes qu'il force, comme dans la mesure de C49 (D18) : le produit des modes ne les remplace pas. Son fond, lui, lit
  // la combinaison du produit : chaque calque qui le peint applique ses propres modes forcés.
  const vue = combinaisonDuLayer(variant, layer, combinaison, catalogue);
  const proposee = couleurDeLiaison(catalogue, variant, vue, candidat.cle);
  const actuelle = liaison ? couleurDeLiaison(catalogue, variant, vue, liaison.variable.cle) : peinture.couleur;
  if (proposee === 'mode-illisible' || actuelle === 'mode-illisible' || !actuelle) return 'inconnu';
  if (memeCouleur(proposee, actuelle)) return 'garde';
  return contrasteTenu(catalogue, proposition, combinaison, vue);
}

/** Les canaux et l'alpha égaux à 8 bits près. */
function memeCouleur(a: { r: number; g: number; b: number; a?: number }, b: { r: number; g: number; b: number; a?: number }): boolean {
  const [ar, ag, ab] = versRgb8(a);
  const [br, bg, bb] = versRgb8(b);
  return ar === br && ag === bg && ab === bb && versOctet(a.a ?? 1) === versOctet(b.a ?? 1);
}

/**
 * Le candidat posé sur le calque, composé sur son fond prouvé : opaque, et au seuil du calque. `produit` est la combinaison du produit des
 * modes, celle que le fond lit ; `vue` celle que le calque subit.
 */
function contrasteTenu(catalogue: CatalogueDeReference, proposition: PropositionDeCouleur, produit: Combinaison, vue: Combinaison): GardeDuDessin {
  const { variant, layer, champ, plage, liaison, candidat } = proposition;
  const indice = indiceVise(proposition);
  if ((layer.blendMode !== undefined && layer.blendMode !== 'NORMAL' && layer.blendMode !== 'PASS_THROUGH') || layer.flouArrierePlan) return 'inconnu';
  const fond = fondEffectif(variant, layer, catalogue, produit);
  if ('limite' in fond || fond.a < 1 - 1e-9) return 'inconnu';
  const peintures = peinturesVisees(layer, proposition) ?? [];
  const liaisons = liaison?.surcharge
    ? layer.liaisons.filter((entree) => entree.surcharge?.id === liaison.surcharge!.id)
    : plage ? (layer.texte?.plages.find((entree) => entree.debut === plage.debut && entree.fin === plage.fin)?.liaisons ?? []) : liaisonsPropres(layer);
  const posee: LiaisonLue = { champ, indice, porteur: layer.id, variable: { id: '', cle: candidat.cle, nom: candidat.nom, collection: candidat.collection, distante: false } };
  const autres = liaisons.filter((entree) => entree !== liaison && !(entree.champ === champ && (entree.indice ?? 0) === indice));
  const pile = pileDePeintures(peintures, [...autres, posee], opaciteDuLayer(variant, layer), catalogue, variant, vue);
  if ('limite' in pile || pile.couches.length === 0) return 'inconnu';
  const premier = composer(pile.couches, fond as Rgba);
  if (!premier) return 'inconnu';
  return atteintLeSeuil(contraste(versRgb8(premier), versRgb8(fond)), seuilDuCalque(layer, plage, liaison?.surcharge)) ? 'garde' : 'change';
}

/** Le seuil du calque que la proposition peint : celui de la surcharge quand la liaison en est une, sinon celui du layer. */
function seuilDuCalque(layer: LayerLu, plage?: PropositionDeCouleur['plage'], surcharge?: LiaisonLue['surcharge']): number {
  if ((surcharge ?? layer).type === 'TEXT') {
    const lue = !surcharge && plage && layer.texte?.plages.find((entree) => entree.debut === plage.debut && entree.fin === plage.fin);
    return lue ? seuilDeLaPlage(lue, 'AA').seuil : SEUILS_D_ACCESSIBILITE.texte.AA;
  }
  if (estUneIconeMesureeParSurcharge(layer, surcharge)) return SEUILS_PAR_ROLE.icon ?? SEUILS_D_ACCESSIBILITE.texte.AA;
  return SEUILS_D_ACCESSIBILITE.nonTexte;
}

/** Le produit des opacités du layer et de ses ancêtres ; un cycle de `parent` s'arrête au premier layer revu. */
function opaciteDuLayer(variant: VariantLu, layer: LayerLu): number {
  const parId = new Map(variant.layers.map((entree) => [entree.id, entree]));
  const vus = new Set<string>();
  let produit = 1;
  for (let courant: LayerLu | undefined = layer; courant && !vus.has(courant.id); courant = courant.parent ? parId.get(courant.parent) : undefined) {
    vus.add(courant.id);
    produit *= courant.opacite;
  }
  return produit;
}

/** Les collections que les chaînes d'alias de ces variables atteignent, tous modes confondus. */
function collectionsAtteintes(catalogue: CatalogueDeReference, cles: readonly string[]): CollectionDuCatalogue[] | undefined {
  const collections = new Map<string, CollectionDuCatalogue>();
  const vues = new Set<string>();
  const file = [...cles];
  while (file.length > 0) {
    const cle = file.pop()!;
    if (vues.has(cle)) continue;
    vues.add(cle);
    const variable = variableDuCatalogue(catalogue, cle);
    if (variable === 'absente') return undefined;
    const collection = collectionDuCatalogue(catalogue, variable.collection);
    if (collection === 'absente') return undefined;
    collections.set(collection.cle, collection);
    for (const valeur of Object.values(variable.valeurs ?? {})) if ('alias' in valeur) file.push(valeur.alias);
  }
  return [...collections.values()];
}

/** Le produit des modes de ces collections, ou `undefined` quand une collection ne se lit pas ou que le produit passe la borne. */
function combinaisonsDeModes(catalogue: CatalogueDeReference, cles: readonly string[]): Combinaison[] | undefined {
  const collections = collectionsAtteintes(catalogue, cles);
  if (!collections || collections.some((collection) => collection.etat !== 'lue' || collection.modes.length === 0)) return undefined;
  let total = 1;
  for (const collection of collections) total *= collection.modes.length;
  if (total > COMBINAISONS_MAXIMALES) return undefined;
  const resultat: Combinaison[] = [];
  for (let n = 0; n < total; n++) {
    const modes = new Map<string, string>();
    let reste = n;
    for (const collection of collections) {
      modes.set(collection.cle, collection.modes[reste % collection.modes.length].id);
      reste = Math.floor(reste / collection.modes.length);
    }
    resultat.push({ modes, etiquette: '' });
  }
  return resultat;
}
