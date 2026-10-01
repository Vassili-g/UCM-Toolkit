/**
 * La simulation d'une substitution : une valeur ou une cible remplacée dans
 * une copie du relevé, en mémoire. Le relevé d'origine, Figma, les fichiers
 * importés et le presse-papiers restent intacts ; réinitialiser rend le
 * relevé d'origine lui-même, pas une copie reconstruite.
 */
import { dependantsTransitifs, indexer, type Index } from './indexation';
import { natureAttendue, valeursEgales, type Releve, type TypeDeVariable, type ValeurSource } from './modele';
import { contexteDeColonne, resoudre, type Contexte, type Resultat } from './resolution';

export type IssueDeSimulation =
  | { readonly statut: 'simule'; readonly releve: Releve }
  | { readonly statut: 'refuse'; readonly raison: 'type' | 'cycle' | 'cible' | 'valeur' };

/**
 * Lit ce que le designer saisit : le nom exact d'une variable, avec ou sans
 * `Collection / `, devient un alias ; sinon la saisie se lit selon le type.
 */
export function lireSaisie(index: Index, type: TypeDeVariable, saisie: string): ValeurSource | { refus: 'cible' | 'valeur' } {
  const texte = saisie.trim();
  const parNomComplet = index.releve.variables.filter((variable) => `${index.collections.get(variable.collection)?.nom ?? ''} / ${variable.nom}` === texte);
  const parNom = parNomComplet.length > 0 ? parNomComplet : index.releve.variables.filter((variable) => variable.nom === texte);
  if (parNom.length === 1) return { nature: 'alias', cible: parNom[0].id };
  if (parNom.length > 1) return { refus: 'cible' };
  switch (type) {
    case 'COLOR': {
      const hexa = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(texte);
      if (!hexa) return { refus: 'valeur' };
      const octet = (rang: number) => parseInt(hexa[1].slice(rang * 2, rang * 2 + 2), 16) / 255;
      return { nature: 'couleur', couleur: { r: octet(0), g: octet(1), b: octet(2), a: hexa[2] ? parseInt(hexa[2], 16) / 255 : 1 } };
    }
    case 'FLOAT':
    case 'TIMING': {
      const nombre = Number(texte.replace(',', '.'));
      return texte !== '' && Number.isFinite(nombre) ? { nature: 'nombre', nombre } : { refus: 'valeur' };
    }
    case 'BOOLEAN':
      return texte === 'true' || texte === 'false' ? { nature: 'booleen', booleen: texte === 'true' } : { refus: 'valeur' };
    case 'STRING':
      return { nature: 'texte', texte: saisie };
    case 'EASING':
      return { refus: 'valeur' };
  }
}

/**
 * Remplace la valeur d'une variable pour un mode, dans une copie. Refuse une
 * valeur d'un autre type, une cible inconnue, et un alias qui ferme un cycle
 * dans le contexte de la colonne.
 */
export function simuler(releve: Releve, variable: string, mode: string, nouvelle: ValeurSource, contexte: Contexte): IssueDeSimulation {
  const avant = indexer(releve);
  const cible = avant.variables.get(variable);
  if (!cible) return { statut: 'refuse', raison: 'cible' };
  if (nouvelle.nature === 'alias') {
    const visee = avant.variables.get(nouvelle.cible);
    if (!visee) return { statut: 'refuse', raison: 'cible' };
    if (visee.type !== cible.type) return { statut: 'refuse', raison: 'type' };
  } else if (nouvelle.nature !== natureAttendue(cible.type)) {
    return { statut: 'refuse', raison: 'type' };
  }
  const copie: Releve = {
    ...releve,
    variables: releve.variables.map((candidate) => (candidate.id === variable ? { ...candidate, valeurs: { ...candidate.valeurs, [mode]: nouvelle } } : candidate)),
  };
  const apres = indexer(copie);
  if (nouvelle.nature === 'alias' && resoudre(apres, variable, contexteDeColonne(apres, contexte, mode)).statut === 'cycle') {
    return { statut: 'refuse', raison: 'cycle' };
  }
  return { statut: 'simule', releve: copie };
}

/** Deux résultats qui rendent la même valeur, ou échouent de la même façon. */
function memeResultat(a: Resultat, b: Resultat): boolean {
  if (a.statut === 'resolu' && b.statut === 'resolu') return valeursEgales(a.valeur, b.valeur);
  return a.statut === b.statut;
}

/** Les variables dont le résultat change dans le contexte : la variable simulée et ses dépendants du relevé. */
export function effetsDeLaSimulation(avant: Index, apres: Index, variable: string, contexte: Contexte): Array<{ id: string; avant: Resultat; apres: Resultat }> {
  const candidates = [variable, ...dependantsTransitifs(apres, variable).map((entree) => entree.id)];
  return candidates.flatMap((id) => {
    const resultatAvant = resoudre(avant, id, contexte);
    const resultatApres = resoudre(apres, id, contexte);
    return memeResultat(resultatAvant, resultatApres) ? [] : [{ id, avant: resultatAvant, apres: resultatApres }];
  });
}
