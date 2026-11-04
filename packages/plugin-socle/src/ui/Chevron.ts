/**
 * Le chevron du socle : le signe `chevron` du kit, un SVG de 12 × 12 px qui
 * pointe vers le bas et tourne par CSS. Sous un ancêtre `aria-expanded`, il
 * pointe à droite replié et vers le bas ouvert ; une liste déroulante
 * (`aria-haspopup`) garde la flèche vers le bas, retournée à l'ouverture.
 * `sens` fixe une orientation que `aria-expanded` ne change plus : `ouvert`
 * vers le bas, `replie` et `suivant` à droite, `retour` à gauche. Le chevron
 * est décoratif : le bouton qui le porte garde son nom. Le trait de 2 sur la
 * grille de 16 (`socle.css`) rend les 1,5 px de l'ancien tracé sur 12.
 */
import { creerSvgDuSigne } from './Signe';

export function creerChevron(sens?: 'ouvert' | 'replie' | 'suivant' | 'retour'): SVGSVGElement {
  const svg = creerSvgDuSigne('chevron', 12);
  svg.setAttribute('class', 'chevron-svg');
  // Un littéral par classe : la loi des styles ne lit que les classes écrites en toutes lettres.
  if (sens === 'ouvert') svg.classList.add('ouvert');
  if (sens === 'replie') svg.classList.add('replie');
  if (sens === 'suivant') svg.classList.add('suivant');
  if (sens === 'retour') svg.classList.add('retour');
  return svg;
}
