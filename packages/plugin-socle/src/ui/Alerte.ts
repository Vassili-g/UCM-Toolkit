/**
 * Les cinq types d'alerte du langage visuel : une couleur, une icône et un mot
 * par type, un liseré à gauche, un fond neutre. Le kit nomme les types et leurs
 * mots (`TYPES_D_ALERTE`) ; ce fichier n'écrit aucun libellé. Les classes
 * viennent de `langage.css`.
 */
import { TYPES_D_ALERTE, type TypeDAlerte } from '@ucm-kit/core/referentiel';

export type { TypeDAlerte };

/** Un texte, ou un nœud quand le texte porte un chemin ou un lien. */
export type Contenu = string | Node;

/** Le mot du type, tel que le kit le donne. */
export function libelleDuType(type: TypeDAlerte): string {
  const trouve = TYPES_D_ALERTE.find((entree) => entree.id === type);
  if (!trouve) throw new Error(`type d'alerte inconnu : ${type}`);
  return trouve.libelle;
}

/** Donne à un élément la couleur de son type : la classe lui pose `--ton`. */
export function poserTon(element: Element, type: TypeDAlerte): void {
  // Un littéral par classe : la loi des styles ne lit que les classes écrites en toutes lettres.
  if (type === 'bloquant') element.classList.add('ton-bloquant');
  if (type === 'corriger') element.classList.add('ton-corriger');
  if (type === 'verifier') element.classList.add('ton-verifier');
  if (type === 'info') element.classList.add('ton-info');
  if (type === 'tenu') element.classList.add('ton-tenu');
}

/** Le liseré d'un type sur une carte de constat. */
export function marquerDuTon(element: Element, type: TypeDAlerte): void {
  element.classList.add('a-ton');
  poserTon(element, type);
}

interface Forme {
  readonly balise: 'path' | 'circle';
  readonly attributs: Readonly<Record<string, string>>;
  /** Une forme à l'encre : le trait ou le plein prend `--texte-sur-ton`. Sans encre, elle prend la couleur du type. */
  readonly encre?: 'trait' | 'plein';
}

/** Octogone, triangle, rond à « ? », rond à « i », rond coché : la forme dit le type sans la couleur. */
const FORMES: Readonly<Record<TypeDAlerte, readonly Forme[]>> = {
  bloquant: [
    { balise: 'path', attributs: { d: 'M4 .5h4L11.5 4v4L8 11.5H4L.5 8V4z', fill: 'currentColor' } },
    { balise: 'path', attributs: { d: 'M3.3 6h5.4', 'stroke-width': '1.6' }, encre: 'trait' },
  ],
  corriger: [
    { balise: 'path', attributs: { d: 'M6 .6l5.6 10.4H.4z', fill: 'currentColor' } },
    { balise: 'path', attributs: { d: 'M6 4.2v3.3', 'stroke-width': '1.4' }, encre: 'trait' },
    { balise: 'circle', attributs: { cx: '6', cy: '9.1', r: '.8' }, encre: 'plein' },
  ],
  verifier: [
    { balise: 'circle', attributs: { cx: '6', cy: '6', r: '5.1', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' } },
    { balise: 'path', attributs: { d: 'M4.5 4.7a1.6 1.6 0 1 1 2.3 1.4c-.5.3-.8.6-.8 1.1', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' } },
    { balise: 'circle', attributs: { cx: '6', cy: '8.9', r: '.75', fill: 'currentColor' } },
  ],
  info: [
    { balise: 'circle', attributs: { cx: '6', cy: '6', r: '5.6', fill: 'currentColor' } },
    { balise: 'path', attributs: { d: 'M6 5.2v3.6', 'stroke-width': '1.5' }, encre: 'trait' },
    { balise: 'circle', attributs: { cx: '6', cy: '3.4', r: '.85' }, encre: 'plein' },
  ],
  tenu: [
    { balise: 'circle', attributs: { cx: '6', cy: '6', r: '5.6', fill: 'currentColor' } },
    { balise: 'path', attributs: { d: 'M3.4 6.1l1.8 1.8 3.5-3.7', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, encre: 'trait' },
  ],
};

const ESPACE_SVG = 'http://www.w3.org/2000/svg';

/** L'icône d'un type, décorative : le mot qui l'accompagne porte le sens. */
export function creerIcone(type: TypeDAlerte): HTMLSpanElement {
  const enveloppe = document.createElement('span');
  enveloppe.className = 'ico';
  enveloppe.setAttribute('aria-hidden', 'true');
  poserTon(enveloppe, type);
  const svg = document.createElementNS(ESPACE_SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  for (const forme of FORMES[type]) {
    const noeud = document.createElementNS(ESPACE_SVG, forme.balise);
    for (const [nom, valeur] of Object.entries(forme.attributs)) noeud.setAttribute(nom, valeur);
    if (forme.encre === 'trait') noeud.setAttribute('style', 'stroke:var(--texte-sur-ton);fill:none');
    if (forme.encre === 'plein') noeud.setAttribute('style', 'fill:var(--texte-sur-ton)');
    svg.append(noeud);
  }
  enveloppe.append(svg);
  return enveloppe;
}

/** L'icône et le mot d'un type, de sa couleur. */
export function creerGravite(type: TypeDAlerte): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'gravite';
  poserTon(element, type);
  element.append(creerIcone(type), libelleDuType(type));
  return element;
}

export interface OptionsDAlerte {
  readonly titre?: Contenu;
  readonly texte?: Contenu;
  readonly meta?: Contenu;
  /** Les boutons ou liens qui suivent le texte. */
  readonly actions?: readonly Node[];
}

function paragraphe(classe: 'alerte-titre' | 'alerte-meta' | null, contenu: Contenu): HTMLParagraphElement {
  const element = document.createElement('p');
  if (classe === 'alerte-titre') element.className = 'alerte-titre';
  if (classe === 'alerte-meta') element.className = 'alerte-meta';
  element.append(contenu);
  return element;
}

/** Une alerte : l'icône du type, un titre, un texte, ce qui reste à savoir, des actions. */
export function creerAlerte(type: TypeDAlerte, { titre, texte, meta, actions = [] }: OptionsDAlerte = {}): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'alerte';
  element.setAttribute('role', 'status');
  poserTon(element, type);
  const corps = document.createElement('div');
  corps.className = 'alerte-corps';
  if (titre !== undefined) corps.append(paragraphe('alerte-titre', titre));
  if (texte !== undefined) corps.append(paragraphe(null, texte));
  if (meta !== undefined) corps.append(paragraphe('alerte-meta', meta));
  if (actions.length > 0) {
    const rangee = document.createElement('div');
    rangee.className = 'alerte-actions';
    rangee.append(...actions);
    corps.append(rangee);
  }
  element.append(creerIcone(type), corps);
  return element;
}

/** La pastille qui compte les constats d'un type, de la couleur du type. */
export function creerPastilleDeCompte(compte: number, type: TypeDAlerte): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'pastille-compte';
  poserTon(element, type);
  element.textContent = String(compte);
  return element;
}

/** Un lien qui ouvre une page hors du plugin : le libellé, puis la flèche qui sort du cadre. */
export function creerLienExterne(libelle: string, onClick?: (event: MouseEvent) => void): HTMLButtonElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'lien-externe';
  bouton.append(libelle);
  const svg = document.createElementNS(ESPACE_SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('width', '11');
  svg.setAttribute('height', '11');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.3');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const trait = document.createElementNS(ESPACE_SVG, 'path');
  trait.setAttribute('d', 'M5 2H2v8h8V7M7 1.5h3.5V5M10.5 1.5 5.5 6.5');
  svg.append(trait);
  bouton.append(svg);
  if (onClick) bouton.addEventListener('click', onClick);
  return bouton;
}
