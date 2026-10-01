/**
 * Le rendu d'une valeur : pastille de couleur, texte exact et statut d'une
 * chaîne qui n'aboutit pas. Les noms et valeurs externes passent par
 * `textContent`, jamais par du HTML. Une couleur n'entre dans une propriété
 * CSS qu'après validation de ses composantes.
 */
import { nomComplet } from '../copie';
import type { Index } from '../indexation';
import { hexaDeCouleur, texteDeValeur, type Couleur, type ValeurSource, type ValeurTerminale } from '../modele';
import type { Resultat } from '../resolution';
import { TEXTES } from './textes';

const composanteValide = (composante: number): boolean => Number.isFinite(composante) && composante >= 0 && composante <= 1;

/** La couleur CSS d'une couleur rangée, ou `null` quand une composante sort de [0, 1]. */
export function couleurCss(couleur: Couleur): string | null {
  if (![couleur.r, couleur.g, couleur.b, couleur.a].every(composanteValide)) return null;
  const canal = (composante: number) => Math.round(composante * 255);
  return `rgba(${canal(couleur.r)}, ${canal(couleur.g)}, ${canal(couleur.b)}, ${couleur.a})`;
}

/** La pastille d'une couleur, sur un damier quand elle est transparente. */
export function pastille(couleur: Couleur): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'pastille';
  element.setAttribute('aria-hidden', 'true');
  const remplissage = document.createElement('span');
  remplissage.className = 'pastille-remplissage';
  const css = couleurCss(couleur);
  if (css) remplissage.style.background = css;
  element.append(remplissage);
  return element;
}

/** Le texte affiché d'une valeur terminale : la chaîne vide se nomme, rien n'est omis. */
export function texteAffiche(valeur: ValeurTerminale): string {
  if (valeur.nature === 'texte' && valeur.texte === '') return TEXTES.chaineVide;
  if (valeur.nature === 'couleur') {
    const { hexa } = hexaDeCouleur(valeur.couleur);
    return hexa;
  }
  return texteDeValeur(valeur);
}

/** Une valeur terminale : pastille éventuelle et texte. */
export function rendreValeur(valeur: ValeurTerminale): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'valeur';
  if (valeur.nature === 'couleur') element.append(pastille(valeur.couleur));
  const texte = document.createElement('span');
  texte.className = 'valeur-texte';
  texte.classList.toggle('valeur-vide', valeur.nature === 'texte' && valeur.texte === '');
  texte.textContent = valeur.nature === 'non-prise-en-charge' ? TEXTES.nonPrisEnCharge : texteAffiche(valeur);
  element.append(texte);
  return element;
}

/** Le résultat d'une chaîne : sa valeur, ou le nom de son statut. */
export function rendreResultat(resultat: Resultat): HTMLSpanElement {
  if (resultat.statut === 'resolu') return rendreValeur(resultat.valeur);
  const element = document.createElement('span');
  element.className = 'statut-echec';
  element.textContent = TEXTES.statut[resultat.statut];
  return element;
}

/** Le nom lisible d'une cible : `Collection / nom`, ou l'identifiant d'une cible non lue. */
export function nomDeCible(index: Index, id: string): string {
  return index.variables.has(id) ? nomComplet(index, id) : TEXTES.cibleInconnue(id);
}

/**
 * Une valeur rangée : un alias devient un bouton qui suit la cible ; une
 * valeur directe s'affiche telle quelle. `data-chaine` désigne la variable
 * dont le survol montre la chaîne.
 */
export function rendreSource(index: Index, source: ValeurSource, suivre: (cible: string) => void, survol?: { variable: string; mode: string }): HTMLElement {
  if (source.nature !== 'alias') return rendreValeur(source);
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'alias';
  const nom = nomDeCible(index, source.cible);
  bouton.textContent = `→ ${index.variables.get(source.cible)?.nom ?? nom}`;
  bouton.setAttribute('aria-label', TEXTES.suivreAlias(nom));
  if (survol) {
    bouton.dataset.chaine = survol.variable;
    bouton.dataset.mode = survol.mode;
  }
  bouton.addEventListener('click', () => suivre(source.cible));
  return bouton;
}
