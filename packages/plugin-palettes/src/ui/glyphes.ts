/**
 * Le glyphe d'une carte titrée ([UI-19]) : un dessin de 44 × 28 unités,
 * affiché en 38 × 24 px, d'un trait de 1,8. Chaque forme porte un rôle, et la
 * feuille le peint d'un rôle de couleur : aucun glyphe n'écrit une couleur de
 * donnée. La planche des glyphes de la maquette du Color shift se dessine
 * depuis les mêmes formes.
 */

/**
 * Les cartes titrées qui portent un glyphe. Une fiche titrée par un nom de
 * palette n'en a pas, ni, depuis la recette v7, la configuration de la
 * palette, la création et « Palettes et réglages ».
 */
export type NomDeGlyphe =
  | 'apercu'
  | 'reglageGlobal'
  | 'colorShift'
  | 'garanties'
  | 'interfaceDeTest'
  | 'fonds'
  | 'intensites'
  | 'courbes'
  | 'minimums'
  | 'proches'
  | 'contenu';

/**
 * Le rôle d'une forme. Un trait ou un aplat est secondaire, pâle ou de marque ;
 * `point` est le rond d'une poignée, `axe` une ligne de repère, `losange` la
 * référence, `fond` un aplat du fond de la carte cerné d'un trait secondaire.
 */
export type RoleDeForme = 'trait' | 'trait-marque' | 'aplat' | 'aplat-pale' | 'aplat-marque' | 'point' | 'axe' | 'losange' | 'fond';

export interface FormeDeGlyphe {
  readonly element: 'rect' | 'line' | 'polyline' | 'circle' | 'path';
  readonly attributs: Readonly<Record<string, number | string>>;
  readonly role: RoleDeForme;
}

const rect = (x: number, y: number, width: number, height: number, role: RoleDeForme, rx = 1): FormeDeGlyphe => ({ element: 'rect', attributs: { x, y, width, height, rx }, role });
const ligne = (x1: number, y1: number, x2: number, y2: number, role: RoleDeForme): FormeDeGlyphe => ({ element: 'line', attributs: { x1, y1, x2, y2 }, role });
const trace = (points: string, role: RoleDeForme): FormeDeGlyphe => ({ element: 'polyline', attributs: { points }, role });
const rond = (cx: number, cy: number, r: number, role: RoleDeForme): FormeDeGlyphe => ({ element: 'circle', attributs: { cx, cy, r }, role });
const chemin = (d: string, role: RoleDeForme): FormeDeGlyphe => ({ element: 'path', attributs: { d }, role });

/** Six pastilles en escalier, à `y` pour la première : une rampe, du clair au sombre. */
const rampe = (y: number, role: RoleDeForme): FormeDeGlyphe[] => Array.from({ length: 6 }, (_, rang) => rect(3 + rang * 6.6, y + rang * 2.2, 4.6, 4, role));

/** Les formes de chaque glyphe, dans l'ordre où elles se peignent. */
export const GLYPHES: { readonly [N in NomDeGlyphe]: readonly FormeDeGlyphe[] } = {
  // Une surface, une rangée de pastilles dont la troisième, de marque, porte le losange de la référence.
  apercu: [
    rect(4, 3, 36, 22, 'fond', 2),
    ...[0, 1, 2, 3, 4].map((rang) => rect(8 + rang * 6, 7, 4.6, 8, rang === 2 ? 'aplat-marque' : 'aplat-pale', 1)),
    chemin('M22.3 17.5 L24.8 20 L22.3 22.5 L19.8 20 Z', 'losange'),
  ],
  // Validé : une rampe pâle, puis la même translatée, de marque.
  reglageGlobal: [...rampe(6, 'aplat-pale'), ...rampe(13, 'aplat-marque')],
  // Validé : deux bouts qui pivotent autour du losange de la référence.
  colorShift: [
    ligne(4, 14, 40, 14, 'axe'),
    trace('4,5 22,14 40,22', 'trait-marque'),
    rond(4, 5, 2.6, 'point'),
    rond(40, 22, 2.6, 'point'),
    chemin('M22 10 L26 14 L22 18 L18 14 Z', 'losange'),
  ],
  // Un texte posé sur un fond plein, et la coche de la garantie tenue.
  garanties: [rect(4, 6, 20, 16, 'aplat-marque', 2), ligne(9, 14, 19, 14, 'fond'), trace('28,14 32,19 40,8', 'trait')],
  // Une fenêtre : sa barre, une ligne de texte et un bouton plein.
  interfaceDeTest: [rect(4, 4, 36, 20, 'fond', 2), ligne(4, 9, 40, 9, 'trait'), ligne(9, 14, 25, 14, 'trait'), rect(9, 17, 14, 4, 'aplat-marque', 2)],
  // Une page, et la pastille de son fond dans un coin.
  fonds: [rect(4, 4, 36, 20, 'fond', 2), rect(27, 13, 10, 8, 'aplat-marque', 1.5)],
  // Soft et Vivid : un rond cerné, un rond plein.
  intensites: [rond(14, 14, 7, 'trait-marque'), rond(30, 14, 7, 'aplat-marque')],
  // La courbe de luminosité qui descend du clair au sombre, au-dessus de sa base.
  courbes: [ligne(4, 24, 40, 24, 'axe'), chemin('M4 5 C 16 6, 26 20, 40 21', 'trait-marque'), rond(4, 5, 2, 'aplat-marque'), rond(40, 21, 2, 'aplat-marque')],
  // Des contrastes en barres, et le minimum en ligne tiretée.
  minimums: [rect(7, 10, 5, 14, 'aplat-marque'), rect(15, 14, 5, 10, 'aplat-marque'), rect(23, 7, 5, 17, 'aplat-marque'), rect(31, 17, 5, 7, 'aplat-pale'), { element: 'line', attributs: { x1: 4, y1: 13, x2: 40, y2: 13, 'stroke-dasharray': '3 2' }, role: 'trait' }],
  // Deux couleurs proches : deux ronds qui se recouvrent.
  proches: [rond(17, 14, 8, 'trait'), rond(27, 14, 8, 'trait-marque')],
  // Un cadre de la planche : une rangée de pastilles, puis deux lignes de texte.
  contenu: [rect(4, 3, 36, 22, 'fond', 2), ...[0, 1, 2, 3, 4].map((rang) => rect(8 + rang * 6, 7, 4.6, 5, 'aplat-marque')), ligne(8, 16, 36, 16, 'trait'), ligne(8, 21, 28, 21, 'trait')],
};

const SVG = 'http://www.w3.org/2000/svg';

/** Pose la classe d'un rôle. Une classe littérale par rôle : la loi des styles lit les classes posées dans le texte. */
function poserLeRole(forme: SVGElement, role: RoleDeForme): void {
  switch (role) {
    case 'trait': forme.setAttribute('class', 'glyphe-trait'); break;
    case 'trait-marque': forme.setAttribute('class', 'glyphe-trait-marque'); break;
    case 'aplat': forme.setAttribute('class', 'glyphe-aplat'); break;
    case 'aplat-pale': forme.setAttribute('class', 'glyphe-aplat-pale'); break;
    case 'aplat-marque': forme.setAttribute('class', 'glyphe-aplat-marque'); break;
    case 'point': forme.setAttribute('class', 'glyphe-point'); break;
    case 'axe': forme.setAttribute('class', 'glyphe-axe'); break;
    case 'losange': forme.setAttribute('class', 'glyphe-losange'); break;
    case 'fond': forme.setAttribute('class', 'glyphe-fond'); break;
  }
}

/** Le glyphe d'une carte, décoratif pour l'assistance technique. */
export function creerGlyphe(nom: NomDeGlyphe): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 44 28');
  svg.setAttribute('class', 'glyphe');
  svg.setAttribute('aria-hidden', 'true');
  svg.dataset.glyphe = nom;
  for (const { element, attributs, role } of GLYPHES[nom]) {
    const forme = document.createElementNS(SVG, element);
    for (const [cle, valeur] of Object.entries(attributs)) forme.setAttribute(cle, String(valeur));
    poserLeRole(forme, role);
    svg.append(forme);
  }
  return svg;
}
