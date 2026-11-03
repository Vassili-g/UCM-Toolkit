/**
 * Le composant de base des stress tests de variants (F5) : un relevé, un catalogue et la carte d'un composant sans constat de la
 * portée (C7 à C13, C31 à C33), construits par le générateur de F3 (`portF3.ts`).
 *
 * Un token de couleur se nomme `<jeu>/color/<palette>/<style>/<taille>/<état>/<rôle>` pour les axes présents, un token de taille
 * `<jeu>/size/<taille>/<propriété>`. Le segment d'un token égale la valeur du variant, sauf pour un terme de taille ou d'état que
 * le registre connaît : le token l'écrit alors sous la forme que le registre retient pour un dossier (`sm` s'écrit `small`,
 * `Rest` s'écrit `default`), parce que `REGISTRE_TAILLES` donne `small`, `medium` et `large` aux dossiers et fait de `sm`, `md`
 * et `lg` des formes tolérées (C10). Palette et style s'écrivent comme la valeur, caractère pour caractère.
 */
import { controlerNommage, tokensDuComposant, type AxeDuComposant } from '../../../src/controles/nommage.js';
import { controlerOublis } from '../../../src/controles/oublis.js';
import type { CatalogueDeReference, Constat, ReleveDeComposant } from '../../../src/controles/index.js';
import { termeReconnu } from '../../../src/referentiel/reconnaissance.js';
import { termePourCategorie } from '../../../src/referentiel/termes.js';
import { REGISTRE_ETATS, REGISTRE_TAILLES } from '../../../src/referentiel/vocabulaire.js';
import { composantValide, type AxeDeSpec, type ComposantDeBase, type SpecDeComposant } from './portF3.js';

/** La graine de F5 et F6 (section 3.5 du plan). Elle tire l'échelle des tokens de taille et les rangs des cas tirés. */
export const GRAINE_PAR_DEFAUT = 7105;

/** Les codes que les deux contrôles de F5 émettent. */
export const CODES_DE_LA_PORTEE: readonly `C${number}`[] = ['C7', 'C8', 'C9', 'C10', 'C12', 'C13', 'C31', 'C32', 'C33'];

/** Un axe de spec dont le rôle (`segment`) est dit : l'oracle ne le déduit jamais du nom, que le kit lit mal pour `Type` ou `Tone`. */
export interface AxeDeVariants extends AxeDeSpec {
  readonly segment: AxeDuComposant | null;
}

/** Les axes de P0 : `Button`, 2 × 3 × 3 × 4 = 72 variants. */
export const AXES_DE_P0: readonly AxeDeVariants[] = [
  { nom: 'Style', valeurs: ['solid', 'outline'], segment: 'style' },
  { nom: 'Color', valeurs: ['primary', 'secondary', 'danger'], segment: 'palette' },
  { nom: 'Size', valeurs: ['sm', 'md', 'lg'], segment: 'taille' },
  { nom: 'State', valeurs: ['default', 'hover', 'pressed', 'disabled'], segment: 'etat' },
];

/**
 * Le segment qu'un token écrit pour une valeur d'axe : la forme de dossier du terme, pour un état ou une taille que le registre
 * connaît, sinon la valeur telle quelle.
 */
export function segmentDeLaValeur(role: AxeDuComposant | null, valeur: string): string {
  if (role === 'taille' || role === 'etat') {
    const terme = termeReconnu(role === 'taille' ? REGISTRE_TAILLES : REGISTRE_ETATS, valeur);
    if (terme) return termePourCategorie(terme, 'groupes').id;
  }
  return valeur;
}

export function specDeVariants(jeu: string, axes: readonly AxeDeVariants[], graine: number = GRAINE_PAR_DEFAUT): SpecDeComposant {
  const roleDe = new Map(axes.map((axe) => [axe.nom, axe.segment]));
  return {
    jeu, axes, scopes: 'larges', imbriques: true, plages: 2, modesDeTaille: 1, graine,
    ecritureDesValeurs: (propriete, valeur) => segmentDeLaValeur(roleDe.get(propriete) ?? null, valeur),
  };
}

/** Le composant de base de ces axes. Une même graine rend le même composant. */
export function composantDeBase(jeu: string, axes: readonly AxeDeVariants[], graine: number = GRAINE_PAR_DEFAUT): ComposantDeBase {
  return composantValide(specDeVariants(jeu, axes, graine));
}

/** P0 : `Button` à 72 variants. */
export const composantP0 = (graine: number = GRAINE_PAR_DEFAUT): ComposantDeBase => composantDeBase('Button', AXES_DE_P0, graine);

/** Les constats que `controlerNommage` (C7 à C13) et `controlerOublis` (C31 à C33) rendent, dans cet ordre, sans dédoublonnage. */
export function constatsDeLaPortee(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  return [...controlerNommage(releve, catalogue), ...controlerOublis(releve, catalogue)];
}

/** Les rangs que les segments d'axe occupent dans le nom d'un token de couleur : un par rôle présent, après le jeu et la famille. */
export function rangsDesRoles(composant: ComposantDeBase): [role: AxeDuComposant, rang: number][] {
  const presents = ['palette', 'style', 'taille', 'etat'].filter((role) => composant.carte.axes.some((axe) => axe.segment === role)) as AxeDuComposant[];
  return presents.map((role, rang) => [role, 2 + rang]);
}

/**
 * P1 : la lecture des tokens du composant. `sansLecture` nomme les tokens dont le chemin ne se lit pas, `malLus` ceux dont un segment
 * d'axe reçoit un autre rôle que celui de la carte. Les tokens de taille ne portent que le segment de taille.
 */
export function verifierLaLecture(composant: ComposantDeBase): { sansLecture: string[]; malLus: string[] } {
  const sansLecture: string[] = [];
  const malLus: string[] = [];
  const rangs = rangsDesRoles(composant);
  for (const token of tokensDuComposant(composant.releve, composant.catalogue)) {
    if (token.lecture.length === 0) { sansLecture.push(token.variable.nom); continue; }
    const couleur = token.segments.length === 2 + rangs.length + 1;
    const attendus = couleur ? rangs : rangs.filter(([role]) => role === 'taille').map(([role]): [AxeDuComposant, number] => [role, 2]);
    if (attendus.some(([role, rang]) => token.lecture[rang]?.role !== role)) malLus.push(token.variable.nom);
  }
  return { sansLecture, malLus };
}
