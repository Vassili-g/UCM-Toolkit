/**
 * Propagation depuis un variant modèle (C24) : le designer lie un variant de référence, les autres
 * reprennent ses liaisons en substituant les segments d'axe du nom de la variable.
 * Une liaison n'est exacte que si le layer visé est unique et le nom visé a un seul candidat au
 * catalogue ; sinon le constat porte une question sans réponse cochée.
 */
import type { CatalogueDeReference, VariableDuCatalogue } from './catalogue.js';
import type { Constat, Correction } from './constat.js';
import { axesDuReleve, tokensDuComposant, type AxeDuComposant, type TokenDuComposant } from './nommage.js';
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

/** Le layer du variant visé qui occupe le même chemin et le même rang que `layer` dans le modèle, ou la raison de son absence. */
function layerHomologue(modele: VariantLu, layer: LayerLu, vise: VariantLu): LayerLu | 'absent' | 'ambigu' {
  const cle = cleDuChemin(cheminDuLayer(modele, layer));
  const memeChemin = (variant: VariantLu) => variant.layers.filter((candidat) => cleDuChemin(cheminDuLayer(variant, candidat)) === cle);
  const duModele = memeChemin(modele);
  const duVise = memeChemin(vise);
  if (duVise.length === 0) return 'absent';
  if (duVise.length !== duModele.length) return 'ambigu';
  return duVise[duModele.findIndex(({ id }) => id === layer.id)] ?? 'absent';
}

function nomVise(nom: string, token: TokenDuComposant | undefined, axes: Partial<Record<AxeDuComposant, { nom: string }>>, vise: VariantLu): string {
  if (!token) return nom;
  const segments = [...token.segments];
  for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, { nom: string }][]) {
    const rang = token.lecture.findIndex((segment) => segment.role === axe);
    const valeur = vise.valeurs[propriete.nom];
    if (rang >= 0 && rang < segments.length && valeur) segments[rang] = valeur;
  }
  return segments.join('/');
}

export function proposerLaPropagation(releve: ReleveDeComposant, catalogue: CatalogueDeReference, variant: string): Constat[] {
  const modele = releve.variants.find(({ id }) => id === variant);
  if (!modele) return [];
  const axes = axesDuReleve(releve);
  const tokens = tokensDuComposant(releve, catalogue);
  const constats: Constat[] = [];
  for (const layer of modele.layers) {
    for (const liaison of liaisonsPropres(layer)) {
      const source = catalogue.variables.find(({ cle }) => cle === liaison.variable.cle);
      if (!source || source.etat !== 'presente') continue;
      const token = tokens.find((entree) => entree.variable.cle === source.cle);
      for (const vise of releve.variants) {
        if (vise.id === modele.id) continue;
        const constat = constatDeLaPropagation(releve, catalogue, modele, layer, liaison, source, token, axes, vise);
        if (constat) constats.push(constat);
      }
    }
  }
  return constats;
}

function constatDeLaPropagation(
  releve: ReleveDeComposant, catalogue: CatalogueDeReference, modele: VariantLu, layer: LayerLu, liaison: LiaisonLue,
  source: VariableDuCatalogue, token: TokenDuComposant | undefined, axes: Partial<Record<AxeDuComposant, { nom: string }>>, vise: VariantLu,
): Constat | undefined {
  const homologue = layerHomologue(modele, layer, vise);
  const indiceDansLId = liaison.plage ? `p${liaison.plage.debut}-${liaison.plage.fin}` : liaison.indice === undefined ? '' : String(liaison.indice);
  const constat: Constat = {
    id: `C24:modele:${vise.id}:${typeof homologue === 'string' ? layer.id : homologue.id}:${liaison.champ}:${indiceDansLId}`,
    code: 'C24', type: 'corriger', famille: 'liaisons', variants: [vise.id], layers: typeof homologue === 'string' ? [] : [homologue.id],
    faits: {
      modele: modele.nom, calque: typeof homologue === 'string' ? layer.nom : homologue.nom, champ: liaison.champ,
      ...(liaison.indice === undefined ? {} : { indice: liaison.indice }),
      ...(liaison.plage ? { plageDebut: liaison.plage.debut, plageFin: liaison.plage.fin } : {}),
    },
  };
  const question = (candidats: readonly VariableDuCatalogue[]): Constat => ({
    ...constat, question: { id: constat.id, candidats: candidats.map(({ cle, nom }) => ({ cle, nom })) },
  });
  if (typeof homologue === 'string') return question([]);
  const peinture = liaison.champ === 'fills' || liaison.champ === 'strokes';
  if (peinture && !homologue.peintures.some((entree) => entree.champ === liaison.champ && entree.indice === liaison.indice)) return question([]);
  const nom = nomVise(source.nom, token, axes, vise);
  const candidats = catalogue.variables.filter((variable) => variable.nom === nom && variable.collection === source.collection && variable.etat === 'presente');
  if (candidats.length !== 1) return question(candidats);
  const lie = homologue.liaisons.find((entree) => memeChamp(entree, liaison));
  if (lie && lie.variable.cle === candidats[0].cle) return undefined;
  const correction: Correction = {
    id: constat.id, sorte: 'liaison',
    cible: {
      layer: homologue.id, champ: liaison.champ,
      ...(liaison.indice === undefined ? {} : { indice: liaison.indice }), ...(liaison.plage ? { plage: liaison.plage } : {}),
      ...(lie ? { variable: lie.variable.cle } : {}),
    },
    avant: lie?.variable.nom ?? null, apres: { cle: candidats[0].cle, nom: candidats[0].nom },
    aRelire: { axes: vise.valeurs, regle: `Le variant modèle ${modele.nom} lie ce champ à ${source.nom} ; les segments d’axe prennent les valeurs de ce variant.`, avant: lie?.variable.nom ?? null },
  };
  return { ...constat, correction };
}
