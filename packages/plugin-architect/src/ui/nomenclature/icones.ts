/**
 * Les icônes des types de terme de la liste des règles, reprises de la maquette du vocabulaire (tour 2). Le gris dit ce qu'est un
 * terme ; seule l'icône de « À trancher » est ambre.
 */
import type { TypeDeTerme } from '../../nomenclature/messages';

type Trait = readonly [balise: 'path' | 'circle', attributs: Readonly<Record<string, string>>];

const TRAITS: Readonly<Record<TypeDeTerme, readonly Trait[]>> = {
  'a-trancher': [
    ['circle', { cx: '8', cy: '8', r: '6.2' }],
    ['path', { d: 'M6.3 6.2a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.4' }],
    ['circle', { cx: '8', cy: '11.6', r: '.4', fill: 'currentColor' }],
  ],
  remplace: [['path', { d: 'M2.5 4.5h7M2.5 11.5h7M9.5 4.5 13 8l-3.5 3.5M13 8H6' }]],
  conforme: [['path', { d: 'm3.5 8.5 3 3 6-7' }]],
  'sans-regle': [['circle', { cx: '8', cy: '8', r: '5.5', 'stroke-dasharray': '2.2 2' }]],
  composant: [['path', { d: 'M8 1.8 10.2 4 8 6.2 5.8 4zM4 5.8 6.2 8 4 10.2 1.8 8zM12 5.8 14.2 8 12 10.2 9.8 8zM8 9.8 10.2 12 8 14.2 5.8 12z' }]],
  palette: [
    ['circle', { cx: '8', cy: '8', r: '6.2' }],
    ['path', { d: 'M8 1.8v12.4M1.8 8h12.4' }],
  ],
};

const ESPACE_SVG = 'http://www.w3.org/2000/svg';

/**
 * L'icône d'un type dans son cadre de 16 px. Elle est décorative : le texte à côté, ou le titre de la section, nomme le type.
 * `titre`, quand il est donné, devient l'infobulle de l'icône.
 */
export function creerIconeDeType(type: TypeDeTerme, titre?: string): HTMLElement {
  const svg = document.createElementNS(ESPACE_SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.4');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const [balise, attributs] of TRAITS[type]) {
    const trait = document.createElementNS(ESPACE_SVG, balise);
    for (const [nom, valeur] of Object.entries(attributs)) trait.setAttribute(nom, valeur);
    svg.append(trait);
  }
  const cadre = document.createElement('span');
  cadre.className = 'icone-type';
  cadre.classList.toggle('ambre', type === 'a-trancher');
  if (titre) cadre.title = titre;
  cadre.append(svg);
  return cadre;
}
