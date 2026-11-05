/**
 * Propagation depuis un variant modèle (C24) : le designer lie un variant de référence, les autres
 * reprennent ses liaisons en substituant les segments d'axe du nom de la variable.
 * Elle ne recopie que les tokens du composant dont le nom se lit (Q-F3-6), sur une peinture ou un champ nu : une liaison déjà posée
 * ne se réécrit pas. Un layer qui n'existe que dans un variant ne donne rien (Q-F3-7) ; deux layers homonymes sous un même parent
 * donnent une question, `faits.homonymes` en dit le nombre. Une liaison n'est exacte que si le nom visé a un seul candidat au
 * catalogue ; sinon le constat porte une question sans réponse cochée.
 */
import { natureDuChamp } from '../referentiel/architecture.js';
import type { CatalogueDeReference, VariableDuCatalogue } from './catalogue.js';
import type { Constat, Correction } from './constat.js';
import { axesDuReleve, constatDuComposant, segmentEcritPourLaValeur, tokensDuComposant, type AxeDuComposant, type TokenDuComposant } from './nommage.js';
import { liaisonsPropres, type LayerLu, type LiaisonLue, type ReleveDeComposant, type VariantLu } from './releve.js';

/** Les noms des ancêtres depuis la racine du variant, puis celui du layer. */
function cheminDuLayer(variant: VariantLu, layer: LayerLu): string[] {
  const chemin = [layer.nom];
  const vus = new Set([layer.id]);
  let parent = layer.parent;
  while (parent !== null) {
    const ancetre = variant.layers.find(({ id }) => id === parent);
    if (!ancetre || vus.has(ancetre.id)) break;
    vus.add(ancetre.id);
    chemin.unshift(ancetre.nom);
    parent = ancetre.parent;
  }
  return chemin;
}

const cleDuChemin = (chemin: readonly string[]): string => JSON.stringify(chemin);

function memeChamp(a: { champ: string; indice?: number; plage?: { debut: number; fin: number } }, b: typeof a): boolean {
  return a.champ === b.champ && a.indice === b.indice && a.plage?.debut === b.plage?.debut && a.plage?.fin === b.plage?.fin;
}

/**
 * Le layer du variant visé qui occupe le même chemin que `layer` dans le modèle, `absent` s'il n'en a pas, ou la liste de ses homonymes
 * à ce chemin quand le modèle ou le variant visé en compte plusieurs : rien ne dit lequel suit lequel.
 */
function layerHomologue(modele: VariantLu, layer: LayerLu, vise: VariantLu): LayerLu | 'absent' | LayerLu[] {
  const cle = cleDuChemin(cheminDuLayer(modele, layer));
  const memeChemin = (variant: VariantLu) => variant.layers.filter((candidat) => cleDuChemin(cheminDuLayer(variant, candidat)) === cle);
  const duModele = memeChemin(modele);
  const duVise = memeChemin(vise);
  if (duVise.length === 0) return 'absent';
  if (duVise.length > 1 || duModele.length > 1) return duVise;
  return duVise[0];
}

/** Le nom du token que le variant visé lie : chaque segment d'axe prend l'écriture que les tokens du composant donnent à sa valeur. */
function nomVise(nom: string, token: TokenDuComposant | undefined, axes: Partial<Record<AxeDuComposant, { nom: string }>>, vise: VariantLu, tokens: readonly TokenDuComposant[]): string {
  if (!token) return nom;
  const segments = [...token.segments];
  for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, { nom: string }][]) {
    const rang = token.lecture.findIndex((segment) => segment.role === axe);
    const valeur = vise.valeurs[propriete.nom];
    if (rang >= 0 && rang < segments.length && valeur) segments[rang] = segmentEcritPourLaValeur(tokens, rang, axe, valeur);
  }
  return segments.join('/');
}

interface Proposition { layer: LayerLu; liaison: LiaisonLue; constat: Constat }

function propositions(releve: ReleveDeComposant, catalogue: CatalogueDeReference, modele: VariantLu): Proposition[] {
  const axes = axesDuReleve(releve);
  const tokens = tokensDuComposant(releve, catalogue);
  const trouvees: Proposition[] = [];
  for (const layer of modele.layers) {
    for (const liaison of liaisonsPropres(layer)) {
      const source = catalogue.variables.find(({ cle }) => cle === liaison.variable.cle);
      if (!source || source.etat !== 'presente') continue;
      const token = tokens.find((entree) => entree.variable.cle === source.cle);
      if (!token || token.lecture.length === 0) continue;
      for (const vise of releve.variants) {
        if (vise.id === modele.id) continue;
        const constat = constatDeLaPropagation(releve, catalogue, modele, layer, liaison, source, token, axes, vise);
        if (constat) trouvees.push({ layer, liaison, constat });
      }
    }
  }
  return trouvees;
}

export function proposerLaPropagation(releve: ReleveDeComposant, catalogue: CatalogueDeReference, variant: string): Constat[] {
  const modele = releve.variants.find(({ id }) => id === variant);
  return modele ? propositions(releve, catalogue, modele).map(({ constat }) => constat) : [];
}

export type SorteDeModele = 'couleurs' | 'tailles';

/** Même partage que C80 (couche.ts) : une peinture ou une variable COLOR est une couleur, une variable FLOAT hors texte est une taille. */
function sorteDeLaLiaison(champ: string, type: string): SorteDeModele | null {
  const nature = natureDuChamp(champ, type);
  if (nature === 'couleur') return 'couleurs';
  return type === 'FLOAT' && nature === 'dimension' ? 'tailles' : null;
}

/** Un layer du modèle, le champ qu'il lie et le nom de la variable qu'il porte dans le modèle. */
export interface LigneDeModele { layer: string; champ: string; token: string }

/**
 * Un variant modèle possible pour une sorte de liaison : `layers` sont ceux du modèle (ids), `variants` ceux où ils sont en dur (ids).
 * `lignes` a une entrée par couple (layer, champ) des liaisons proposables, dans l'ordre des layers du modèle.
 */
export interface CandidatDeModele { sorte: SorteDeModele; modele: string; layers: string[]; variants: string[]; liaisons: number; lignes: LigneDeModele[] }

/**
 * Par sorte, le variant qui porte le plus de liaisons de cette sorte (à égalité le premier du jeu), les layers du modèle
 * dont un homologue est en dur ailleurs, ces autres variants, et le nombre de liaisons que `proposerLaPropagation` proposerait.
 * Une sorte sans liaison proposable n'est pas rendue.
 */
export function candidatsDeModele(releve: ReleveDeComposant, catalogue: CatalogueDeReference): CandidatDeModele[] {
  const sorteDe = (liaison: LiaisonLue): SorteDeModele | null => {
    const variable = catalogue.variables.find(({ cle }) => cle === liaison.variable.cle);
    return variable && variable.etat === 'presente' ? sorteDeLaLiaison(liaison.champ, variable.type) : null;
  };
  const candidats: CandidatDeModele[] = [];
  // Les deux sortes élisent souvent le même modèle : ses propositions ne se calculent qu'une fois.
  const parModele = new Map<string, Proposition[]>();
  for (const sorte of ['couleurs', 'tailles'] as const) {
    let modele: VariantLu | undefined;
    let max = 0;
    for (const variant of releve.variants) {
      const nombre = variant.layers.reduce((somme, layer) => somme + liaisonsPropres(layer).filter((liaison) => sorteDe(liaison) === sorte).length, 0);
      if (nombre > max) { max = nombre; modele = variant; }
    }
    if (!modele) continue;
    const layers = new Set<string>();
    const variants = new Set<string>();
    const lignes = new Map<string, LigneDeModele>();
    let liaisons = 0;
    if (!parModele.has(modele.id)) parModele.set(modele.id, propositions(releve, catalogue, modele));
    for (const { layer, liaison, constat } of parModele.get(modele.id)!) {
      if (sorteDe(liaison) !== sorte || !constat.correction || constat.correction.avant !== null) continue;
      layers.add(layer.id);
      constat.variants.forEach((id) => variants.add(id));
      liaisons++;
      const cle = JSON.stringify([layer.id, liaison.champ]);
      if (!lignes.has(cle)) lignes.set(cle, { layer: layer.nom, champ: liaison.champ, token: catalogue.variables.find(({ cle: variable }) => variable === liaison.variable.cle)?.nom ?? liaison.variable.nom });
    }
    if (liaisons > 0) candidats.push({ sorte, modele: modele.id, layers: [...layers], variants: [...variants], liaisons, lignes: [...lignes.values()] });
  }
  return candidats;
}

/**
 * C81 : un variant lie déjà des layers que d'autres variants gardent en dur. Une carte par section : `liaisons` pour les couleurs,
 * `tailles` pour les tailles. Le constat n'a pas de correction ; `layers` porte les layers du modèle et `variants` le modèle seul.
 * `faits.lignes` est le texte JSON de `CandidatDeModele.lignes` : les faits n'admettent que du texte et des nombres.
 */
export function constatsDeModele(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  return candidatsDeModele(releve, catalogue).map((candidat) => constatDuComposant(
    'C81', candidat.sorte === 'couleurs' ? 'liaisons' : 'tailles', 'corriger', `${candidat.sorte}:${candidat.modele}`,
    { modele: candidat.modele, layers: candidat.layers.length, variants: candidat.variants.length, liaisons: candidat.liaisons, lignes: JSON.stringify(candidat.lignes) },
    [candidat.modele], candidat.layers,
  ));
}

function constatDeLaPropagation(
  releve: ReleveDeComposant, catalogue: CatalogueDeReference, modele: VariantLu, layer: LayerLu, liaison: LiaisonLue,
  source: VariableDuCatalogue, token: TokenDuComposant, axes: Partial<Record<AxeDuComposant, { nom: string }>>, vise: VariantLu,
): Constat | undefined {
  const homologue = layerHomologue(modele, layer, vise);
  if (homologue === 'absent') return undefined;
  const indiceDansLId = liaison.plage ? `p${liaison.plage.debut}-${liaison.plage.fin}` : liaison.indice === undefined ? '' : String(liaison.indice);
  const constat: Constat = {
    id: `C24:modele:${vise.id}:${Array.isArray(homologue) ? layer.id : homologue.id}:${liaison.champ}:${indiceDansLId}`,
    code: 'C24', type: 'corriger', famille: 'liaisons', variants: [vise.id], layers: Array.isArray(homologue) ? homologue.map(({ id }) => id) : [homologue.id],
    faits: {
      modele: modele.nom, calque: Array.isArray(homologue) ? layer.nom : homologue.nom, champ: liaison.champ,
      ...(liaison.indice === undefined ? {} : { indice: liaison.indice }),
      ...(liaison.plage ? { plageDebut: liaison.plage.debut, plageFin: liaison.plage.fin } : {}),
      ...(Array.isArray(homologue) ? { homonymes: homologue.length } : {}),
    },
  };
  const question = (candidats: readonly VariableDuCatalogue[]): Constat => ({
    ...constat, question: { id: constat.id, candidats: candidats.map(({ cle, nom }) => ({ cle, nom })) },
  });
  if (Array.isArray(homologue)) return question([]);
  // Une liaison déjà posée, sur le bon token ou sur un autre, n'est pas une peinture nue : la propagation ne la réécrit pas (Q-F3-6).
  if (homologue.liaisons.some((entree) => !entree.surcharge && memeChamp(entree, liaison))) return undefined;
  const peinture = liaison.champ === 'fills' || liaison.champ === 'strokes';
  // Le variant visé n'a pas cette peinture : elle est propre au modèle (Q-F3-7). Celle d'une plage de texte vit dans la plage.
  if (peinture && !peintureDuLayer(homologue, liaison.champ, liaison.plage !== undefined, liaison.indice)) return undefined;
  const nom = nomVise(source.nom, token, axes, vise, tokensDuComposant(releve, catalogue));
  const candidats = catalogue.variables.filter((variable) => variable.nom === nom && variable.collection === source.collection && variable.etat === 'presente');
  if (candidats.length !== 1) return question(candidats);
  const correction: Correction = {
    id: constat.id, sorte: 'liaison',
    cible: {
      layer: homologue.id, champ: liaison.champ,
      ...(liaison.indice === undefined ? {} : { indice: liaison.indice }), ...(liaison.plage ? { plage: liaison.plage } : {}),
    },
    avant: null, apres: { cle: candidats[0].cle, nom: candidats[0].nom },
    aRelire: { axes: vise.valeurs, regle: `Le variant modèle ${modele.nom} lie ce champ à ${source.nom} ; les segments d’axe prennent les valeurs de ce variant.`, avant: null },
  };
  return { ...constat, correction };
}

/** Le layer porte une peinture de ce champ : la sienne, ou celle d'une de ses plages de texte quand la liaison vise une plage. */
function peintureDuLayer(layer: LayerLu, champ: string, deLaPlage: boolean, indice: number | undefined): boolean {
  if (deLaPlage) return (layer.texte?.plages ?? []).some((plage) => plage.peintures.some((entree) => entree.champ === champ));
  return layer.peintures.some((entree) => entree.champ === champ && entree.indice === indice);
}
