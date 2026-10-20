/**
 * Ce que l'export écrit pour une valeur Figma de mouvement ou de couleur.
 *
 * L'exporteur applique ces règles pour écrire `tokens.json`, et le comparateur
 * de `@ucm-kit/core/lecteurs` les suit pour dire si un token publié porte la
 * valeur que Figma porte. Elles vivent ici pour que les deux lisent la même
 * décision. Ce module ne dépend d'aucun typage de Figma.
 *
 * Figma compte une `TIMING` en secondes. L'export recopie ce nombre sans le
 * convertir ni l'arrondir, pour qu'un second export du même fichier rende les
 * mêmes octets.
 */
import type { CouleurDeToken, CourbeDeToken, DureeDeToken } from './tokens.js';

/** L'espace colorimétrique qu'une couleur publiée déclare. */
export type EspaceColorimetrique = CouleurDeToken['colorSpace'];

/**
 * L'espace des couleurs d'un document, d'après le nom de son profil
 * (`figma.root.documentColorProfile`). `LEGACY` désigne un fichier qui n'en
 * déclare aucun : ses couleurs sont publiées en sRGB, et l'exporteur le dit au
 * designer.
 */
export function espaceDuProfil(profil: string): EspaceColorimetrique {
  return profil === 'DISPLAY_P3' ? 'display-p3' : 'srgb';
}

/** La durée d'une valeur `TIMING`, dans l'unité que Figma emploie. */
export function dureeDeToken(valeur: number): DureeDeToken {
  return { value: valeur, unit: 's' };
}

/**
 * Pourquoi une valeur `EASING` n'a pas de courbe.
 *
 * Chaque cause est un fait observé sur la valeur que l'API rend, et non une
 * catégorie du sélecteur de Figma : un préréglage nommé se reconnaît à
 * l'absence de points, un ressort au champ que Figma joint. Les cinq causes
 * appellent cinq phrases différentes, et trois gestes différents.
 */
export type CauseSansCourbe = 'preregle' | 'ressort' | 'tenue' | 'points' | 'abscisse';

/** Les champs d'une valeur `EASING` de Figma que `courbeDeToken` lit. */
type ValeurEasing = {
  type?: string;
  easingFunctionSpring?: unknown;
  easingFunctionCubicBezier?: { x1: number; y1: number; x2: number; y2: number };
};

/** Vrai si la coordonnée est un nombre réel, donc ni `NaN` ni infinie. */
function estFini(coordonnee: unknown): coordonnee is number {
  return typeof coordonnee === 'number' && Number.isFinite(coordonnee);
}

/**
 * La courbe d'une valeur `EASING`, ou la cause de son absence.
 *
 * DTCG borne les abscisses à `[0, 1]` et laisse les ordonnées libres : une
 * courbe à dépassement, dont `y` sort de l'intervalle, est valide et passe.
 */
export function courbeDeToken(valeur: unknown): { courbe: CourbeDeToken } | { cause: CauseSansCourbe } {
  const easing = valeur as ValeurEasing | undefined;

  // Un ressort passe avant les points : la trajectoire d'un ressort n'est pas
  // cubique, et des points joints à une telle valeur ne la décriraient pas.
  if (easing?.type === 'CUSTOM_SPRING' || easing?.easingFunctionSpring) return { cause: 'ressort' };
  if (easing?.type === 'HOLD') return { cause: 'tenue' };

  // `easingFunctionCubicBezier` est optionnel sur `MotionEasing` quel que soit
  // le `type` : un préréglage dont Figma publierait les points donne donc sa
  // courbe, au lieu d'être écarté sur son seul nom.
  const points = easing?.easingFunctionCubicBezier;
  if (points) {
    const { x1, y1, x2, y2 } = points;
    if (![x1, y1, x2, y2].every(estFini)) return { cause: 'points' };
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return { cause: 'abscisse' };
    return { courbe: [x1, y1, x2, y2] };
  }

  if (easing?.type === 'LINEAR') return { courbe: [0, 0, 1, 1] };
  if (easing?.type === 'CUSTOM_CUBIC_BEZIER') return { cause: 'points' };
  return { cause: 'preregle' };
}
