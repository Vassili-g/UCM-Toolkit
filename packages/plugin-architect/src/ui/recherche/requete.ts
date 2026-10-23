/**
 * Ce que le champ de recherche de l'arbre dit : un texte libre, `terme:` suivi
 * d'un terme, ou `vise:` suivi du nom d'une variable. Les trois liens de
 * l'écran (une question, la feuille d'un terme, la fiche d'une variable)
 * écrivent leur recherche dans ce champ, exactement comme si le designer
 * l'avait tapée : aucun autre filtre n'agit sur la table.
 */
import { REGISTRES } from '@ucm-kit/core/referentiel';
import { dependantsDirects, type Index } from '../../indexation';
import type { VariableRelevee } from '../../modele';

export type Requete =
  | { readonly sorte: 'texte'; readonly terme: string }
  | { readonly sorte: 'terme'; readonly mot: string }
  | { readonly sorte: 'vise'; readonly cible: string };

export const PREFIXE_TERME = 'terme:';
export const PREFIXE_VISE = 'vise:';

/** Lit la saisie. Un préfixe sans rien derrière lui reste un texte libre : il ne filtre pas sur un terme vide. */
export function lireLaRecherche(saisie: string): Requete {
  const nu = saisie.trim();
  const bas = nu.toLocaleLowerCase('fr');
  if (bas.startsWith(PREFIXE_TERME) && nu.length > PREFIXE_TERME.length) return { sorte: 'terme', mot: nu.slice(PREFIXE_TERME.length).trim().toLocaleLowerCase('fr') };
  if (bas.startsWith(PREFIXE_VISE) && nu.length > PREFIXE_VISE.length) return { sorte: 'vise', cible: nu.slice(PREFIXE_VISE.length).trim() };
  return { sorte: 'texte', terme: bas };
}

/** Les formes que le référentiel UCM fixe pour un terme ; le terme seul quand il n'en a aucune. */
export function formesDuReferentiel(mot: string): string[] {
  const entree = REGISTRES.flatMap(({ termes }) => termes).find((terme) => terme.id === mot);
  return [mot, ...(entree?.toleres ?? [])];
}

/**
 * Les formes qu'une fiche de terme a données au bouton qui filtre le tableau : celles du fichier comprises, que le référentiel ne connaît pas.
 * Une recherche tapée à la main n'a que celles du référentiel.
 */
const formesDonnees = new Map<string, readonly string[]>();

export function retenirLesFormes(mot: string, formes: readonly string[]): void {
  formesDonnees.set(mot.toLocaleLowerCase('fr'), formes);
}

export function formesDuTerme(mot: string): readonly string[] {
  return formesDonnees.get(mot) ?? formesDuReferentiel(mot);
}

/** Les mots d'un segment de nom : `padding-x`, `paddingX` et `padding_x` donnent `padding` et `x`. */
export function motsDuSegment(segment: string): string[] {
  return segment
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .split(/[\s\-_]+/u)
    .filter((mot) => mot !== '')
    .map((mot) => mot.toLocaleLowerCase('fr'));
}

/** Vrai quand un segment du nom est l'une des formes, entier ou par l'un de ses mots. */
export function emploieUneForme(nom: string, formes: readonly string[]): boolean {
  const retenues = new Set(formes.map((forme) => forme.toLocaleLowerCase('fr')));
  return nom.split('/').some((segment) => retenues.has(segment.toLocaleLowerCase('fr')) || motsDuSegment(segment).some((mot) => retenues.has(mot)));
}

/** Les variables qui pointent directement une variable de ce nom, dans un mode quelconque. */
export function variablesQuiVisent(index: Index, cible: string): Set<string> {
  const visees = index.releve.variables.filter((variable) => variable.nom === cible);
  return new Set(visees.flatMap((variable) => dependantsDirects(index, variable.id)));
}

/**
 * Le prédicat d'une requête, sans le filtre de texte libre : il demande la
 * valeur et la collection de la variable, que l'appelant sait lire.
 */
export function correspond(requete: Requete, index: Index, formes: readonly string[]): (variable: VariableRelevee, texteCherche: () => string) => boolean {
  if (requete.sorte === 'terme') return (variable) => emploieUneForme(variable.nom, formes);
  if (requete.sorte === 'vise') {
    const ids = variablesQuiVisent(index, requete.cible);
    return (variable) => ids.has(variable.id);
  }
  return (_variable, texteCherche) => texteCherche().includes(requete.terme);
}

/** Les segments d'un nom que la recherche désigne : le texte cherché, ou une forme du terme. `vise:` ne désigne aucun segment. */
export function segmentsCherches(requete: Requete, nom: string): string[] {
  const segments = nom.split('/');
  if (requete.sorte === 'texte') return requete.terme === '' ? [] : segments.filter((segment) => segment.toLocaleLowerCase('fr').includes(requete.terme));
  if (requete.sorte === 'terme') return segments.filter((segment) => emploieUneForme(segment, formesDuTerme(requete.mot)));
  return [];
}
