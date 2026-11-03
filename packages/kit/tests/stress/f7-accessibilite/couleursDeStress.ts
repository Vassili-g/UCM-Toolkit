/**
 * Les valeurs des variables de `theme` des profils de F7, par mode. Dans le composant de base de F3, le `Root` est un cadre plein
 * qui porte le texte, l'icône et l'anneau : en `Light` ses fonds sont sombres et leur encre claire, en `Dark` l'inverse. Un seul
 * anneau, un seul texte par rôle, doit se lire sur le fond de chaque style et de chaque état ; la page et la carte, elles, portent le
 * contour du `Root`. Chaque paire dépasse son seuil de 25 % au moins : 12:1 pour le texte, 3,75:1 sinon, y compris quand le fond du
 * `Root` est translucide (alpha 0,9) et se compose sur la page ou la carte.
 */
import { VARIABLES_DE_PALETTE, VARIABLES_GLOBALES } from '../../../src/emplois/dossiers.js';
import { couleurDeOctets, mesurerLaPaire, type Couleur, type Octets } from './oracleContraste.js';

export type ModeDeStress = 'light' | 'dark';
export const MODES_DE_STRESS: readonly ModeDeStress[] = ['light', 'dark'];
export const PALETTES_DE_STRESS = ['primary', 'neutral', 'danger'] as const;
export type PaletteDeStress = (typeof PALETTES_DE_STRESS)[number];

/** L'alpha des fonds du `Root` dans les profils à fond translucide. */
export const ALPHA_TRANSLUCIDE = 0.9;

type Triplet = readonly [number, number, number];
interface Palette {
  readonly solide: readonly [Triplet, Triplet, Triplet];
  readonly surface: readonly [Triplet, Triplet, Triplet];
  readonly encre: Triplet;
  readonly contour: Triplet;
  readonly anneau: Triplet;
  readonly subtil: Triplet;
}

const PALETTES: Record<ModeDeStress, Record<PaletteDeStress, Palette>> = {
  light: {
    primary: { solide: [[2, 8, 24], [6, 18, 48], [10, 26, 64]], surface: [[4, 12, 34], [8, 22, 56], [12, 30, 70]], encre: [255, 255, 255], contour: [75, 85, 99], anneau: [226, 232, 248], subtil: [8, 16, 40] },
    neutral: { solide: [[8, 8, 12], [18, 20, 26], [28, 30, 38]], surface: [[10, 12, 16], [20, 22, 28], [30, 32, 40]], encre: [255, 255, 255], contour: [75, 85, 99], anneau: [236, 238, 244], subtil: [14, 16, 20] },
    danger: { solide: [[28, 4, 4], [44, 8, 8], [58, 12, 12]], surface: [[32, 6, 8], [48, 10, 12], [60, 14, 16]], encre: [255, 255, 255], contour: [153, 27, 27], anneau: [254, 226, 226], subtil: [40, 8, 10] },
  },
  dark: {
    primary: { solide: [[248, 250, 252], [240, 245, 251], [232, 238, 248]], surface: [[240, 244, 252], [232, 238, 250], [224, 232, 247]], encre: [4, 6, 14], contour: [148, 163, 184], anneau: [4, 6, 14], subtil: [244, 247, 253] },
    neutral: { solide: [[250, 250, 250], [244, 244, 246], [238, 238, 242]], surface: [[244, 244, 246], [238, 238, 242], [232, 232, 238]], encre: [4, 6, 14], contour: [148, 163, 184], anneau: [4, 6, 14], subtil: [247, 247, 248] },
    danger: { solide: [[254, 242, 242], [253, 236, 236], [252, 230, 230]], surface: [[254, 238, 238], [252, 232, 232], [250, 226, 226]], encre: [4, 6, 14], contour: [248, 113, 113], anneau: [4, 6, 14], subtil: [254, 244, 244] },
  },
};

/** Les valeurs hors palette : texte et contour de la page, variables désactivées, page et carte. */
const COMMUN: Record<ModeDeStress, { pageEncre: Triplet; pageContour: Triplet; separateur: Triplet; desactive: readonly [Triplet, Triplet, Triplet]; page: Triplet; carte: Triplet }> = {
  light: { pageEncre: [15, 23, 42], pageContour: [100, 116, 139], separateur: [203, 213, 225], desactive: [[226, 232, 240], [148, 163, 184], [203, 213, 225]], page: [248, 250, 252], carte: [255, 255, 255] },
  dark: { pageEncre: [241, 245, 249], pageContour: [148, 163, 184], separateur: [51, 65, 85], desactive: [[30, 41, 59], [100, 116, 139], [51, 65, 85]], page: [11, 16, 32], carte: [19, 26, 46] },
};

const FONDS_DU_ROOT = new Set(['solid/default', 'solid/hover', 'solid/pressed', 'surface/default', 'surface/hover', 'surface/pressed', 'disabled/background']);

/** Une couleur de `theme` par nom (`primary/solid/default`, `disabled/border`, `elevation/page`). L'alpha n'y est pas : voir `alphaDe`. */
export function couleurDeTheme(nom: string, mode: ModeDeStress): Triplet {
  const commun = COMMUN[mode];
  if (nom === 'elevation/page') return commun.page;
  if (nom === 'elevation/raised') return commun.carte;
  if (nom === 'disabled/background') return commun.desactive[0];
  if (nom === 'disabled/foreground') return commun.desactive[1];
  if (nom === 'disabled/border') return commun.desactive[2];
  const [palette, ...reste] = nom.split('/');
  const p = PALETTES[mode][palette as PaletteDeStress];
  const variable = reste.join('/');
  const rang = (etat: string): number => ['default', 'hover', 'pressed'].indexOf(etat);
  if (variable.startsWith('solid/') && rang(variable.slice(6)) >= 0) return p.solide[rang(variable.slice(6))];
  if (variable.startsWith('surface/') && rang(variable.slice(8)) >= 0) return p.surface[rang(variable.slice(8))];
  switch (variable) {
    case 'solid/foreground': case 'surface/foreground': return p.encre;
    case 'surface/subtle': return p.subtil;
    case 'surface/border': return p.contour;
    case 'surface/divider': case 'page/divider': return commun.separateur;
    case 'page/foreground': return commun.pageEncre;
    case 'page/border': return commun.pageContour;
    case 'ring': return p.anneau;
    default: throw new Error(`Variable du thème inconnue : ${nom}`);
  }
}

/** L'alpha d'une variable de `theme` : 0,9 pour les fonds du `Root` d'un profil translucide, 1 sinon. */
export function alphaDe(nom: string, translucide: boolean): number {
  const variable = nom.split('/').slice(-2).join('/');
  return translucide && (FONDS_DU_ROOT.has(variable) || nom === 'disabled/background') ? ALPHA_TRANSLUCIDE : 1;
}

/** Tous les noms de variables de `theme` que le générateur de F3 fabrique. */
export const NOMS_DU_THEME: readonly string[] = [
  ...PALETTES_DE_STRESS.flatMap((palette) => VARIABLES_DE_PALETTE.map((variable) => `${palette}/${variable}`)),
  ...VARIABLES_GLOBALES, 'elevation/page', 'elevation/raised',
];

export const couleurDeStress = (nom: string, mode: ModeDeStress, translucide: boolean): { r: number; g: number; b: number; a: number } => {
  const [r, g, b] = couleurDeTheme(nom, mode);
  return { r: r / 255, g: g / 255, b: b / 255, a: alphaDe(nom, translucide) };
};

export const pageEtCarte = (mode: ModeDeStress): { page: Couleur; carte: Couleur } =>
  ({ page: couleurDeOctets(COMMUN[mode].page as Octets), carte: couleurDeOctets(COMMUN[mode].carte as Octets) });

// ---------------------------------------------------------------------------------------------------------------------------
// Les paires de base dépassent leur seuil de 25 %

export const MARGE_DE_BASE = 1.25;

/** Les paires qui ne dépassent pas leur seuil de 25 % (12 pour le texte), pour les deux modes et les deux fonds ; vide si tout tient. */
export function pairesTropJustes(): string[] {
  const trop: string[] = [];
  const verifier = (nom: string, mesure: { rapport: number } | null, minimum: number): void => {
    if (!mesure) trop.push(`${nom} : fond indéterminé`);
    else if (mesure.rapport < minimum) trop.push(`${nom} : ${mesure.rapport.toFixed(2)} sous ${minimum}`);
  };
  for (const mode of MODES_DE_STRESS) {
    for (const translucide of [false, true]) {
      const c = (nom: string): Couleur => { const v = couleurDeStress(nom, mode, translucide); return v; };
      const { page, carte } = pageEtCarte(mode);
      for (const palette of PALETTES_DE_STRESS) {
        for (const [style, etats] of [['solid', ['default', 'hover', 'pressed']], ['surface', ['default', 'hover', 'pressed']]] as const) {
          for (const etat of etats) {
            const fond = c(`${palette}/${style}/${etat}`);
            const contexte = `${mode}${translucide ? ' translucide' : ''} ${palette}/${style}/${etat}`;
            for (const [socle, nomDuSocle] of [[page, 'page'], [carte, 'carte']] as const) {
              verifier(`${contexte} : texte sur ${nomDuSocle}`, mesurerLaPaire([c(`${palette}/${style}/foreground`)], [fond], socle), 12);
              verifier(`${contexte} : anneau sur ${nomDuSocle}`, mesurerLaPaire([c(`${palette}/ring`)], [fond], socle), 3 * MARGE_DE_BASE);
              // Le contour du `Root` d'un style plein reprend son fond ; celui d'un style de surface est `surface/border`.
              const contour = style === 'solid' ? fond : c(`${palette}/surface/border`);
              verifier(`${contexte} : contour sur ${nomDuSocle}`, mesurerLaPaire([contour], [], socle), 3 * MARGE_DE_BASE);
            }
          }
        }
      }
    }
  }
  return trop;
}
