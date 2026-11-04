/**
 * Le glyphe d'une carte titrée ([UI-19]) : un pictogramme de la famille
 * `pictogramme-palettes` du kit, sur une grille de 44 × 28, affiché en
 * 38 × 24 px. Le kit porte le tracé ; chaque forme y porte un rôle (`class`),
 * et la feuille le peint d'un rôle de couleur : aucun glyphe n'écrit une
 * couleur de donnée. La planche des glyphes de la maquette du Color shift se
 * dessine depuis les mêmes tracés.
 */
import { creerSvgDuSigne } from 'ucm-plugin-socle/src/ui/Signe';

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

/** Le signe du kit que chaque carte porte. */
const SIGNE_DU_GLYPHE: Readonly<Record<NomDeGlyphe, string>> = {
  apercu: 'carte-apercu',
  reglageGlobal: 'carte-reglage-global',
  colorShift: 'carte-color-shift',
  garanties: 'carte-garanties',
  interfaceDeTest: 'carte-interface-de-test',
  fonds: 'carte-fonds',
  intensites: 'carte-intensites',
  courbes: 'carte-courbes',
  minimums: 'carte-minimums',
  proches: 'carte-proches',
  contenu: 'carte-contenu',
};

/** Les identifiants du kit, dans l'ordre des noms : la planche et les tests lisent le même dessin. */
export const SIGNES_DES_GLYPHES: readonly string[] = Object.values(SIGNE_DU_GLYPHE);

/**
 * Les rôles de couleur que les tracés du kit posent par `class`, et que la feuille peint. La loi des styles ne lit que les
 * classes des sources du plugin : `tests/stylesUi.test.ts` reçoit cette liste comme classes posées par le kit, et
 * `tests/glyphes.test.ts` la compare aux classes des tracés.
 */
export const CLASSES_DES_ROLES = [
  'glyphe-trait',
  'glyphe-trait-marque',
  'glyphe-aplat-pale',
  'glyphe-aplat-marque',
  'glyphe-point',
  'glyphe-axe',
  'glyphe-losange',
  'glyphe-fond',
] as const;

/** Le glyphe d'une carte, décoratif pour l'assistance technique. */
export function creerGlyphe(nom: NomDeGlyphe): SVGSVGElement {
  // La taille de 38 × 24 px vient de `.glyphe` ; le trait et la couleur de chaque forme, de la classe de son rôle.
  const svg = creerSvgDuSigne(SIGNE_DU_GLYPHE[nom], 38);
  svg.setAttribute('class', 'glyphe');
  svg.dataset.glyphe = nom;
  return svg;
}
