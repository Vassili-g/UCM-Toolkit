/**
 * Le chevron du socle : un SVG de 12 × 12 px qui pointe vers le bas et tourne
 * par CSS. Sous un ancêtre `aria-expanded`, il pointe à droite replié et vers
 * le bas ouvert ; une liste déroulante (`aria-haspopup`) garde la flèche vers
 * le bas, retournée à l'ouverture. `sens` fixe une orientation que
 * `aria-expanded` ne change plus : `ouvert` vers le bas, `replie` et `suivant`
 * à droite, `retour` à gauche. Le chevron est décoratif : le bouton qui le
 * porte garde son nom.
 */
export function creerChevron(sens?: 'ouvert' | 'replie' | 'suivant' | 'retour'): SVGSVGElement {
  const espace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(espace, 'svg');
  svg.setAttribute('class', 'chevron-svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('aria-hidden', 'true');
  // Un littéral par classe : la loi des styles ne lit que les classes écrites en toutes lettres.
  if (sens === 'ouvert') svg.classList.add('ouvert');
  if (sens === 'replie') svg.classList.add('replie');
  if (sens === 'suivant') svg.classList.add('suivant');
  if (sens === 'retour') svg.classList.add('retour');
  const trait = document.createElementNS(espace, 'path');
  trait.setAttribute('d', 'M3 4.5 6 7.5 9 4.5');
  svg.append(trait);
  return svg;
}
