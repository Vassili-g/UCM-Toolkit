/**
 * La géométrie de la carte « Roue des teintes » ([UI-43]), sans DOM : où se
 * pose une teinte, quelle teinte vise le pointeur, le tracé d'un arc, quelles
 * palettes portent un nom et à quelle hauteur. Les unités sont celles du SVG
 * de la carte, 420 × 256.
 */
import { ecartAngulaire, normaliserTeinte } from 'ucm-couleur';

export const LARGEUR_DE_LA_ROUE = 420;
export const HAUTEUR_DE_LA_ROUE = 256;
export const CENTRE_DE_LA_ROUE = { x: 210, y: 128 } as const;
export const RAYON_DE_LA_ROUE = 70;
/** Le rayon où les noms des huit familles de teinte se centrent. */
export const RAYON_DES_FAMILLES = 116;
/** Une paire trop proche déborde de chaque côté de ses deux teintes de cet angle. */
export const DEBORD_DE_LA_PAIRE = 14;
/** Le décalage d'un nom sous celui qui le précède du même côté, et la distance en dessous de laquelle ils se recouvrent. */
export const INTERLIGNE_DES_NOMS = 11;
/** Au-delà de ce nombre de palettes colorées, seuls les noms des cochées et des paires trop proches se posent. */
export const NOMBRE_DE_NOMS_COMPLETS = 8;

export interface PointDeLaRoue {
  readonly x: number;
  readonly y: number;
}

/** Une teinte H se pose à `(210 + r cos(H − 90°), 128 + r sin(H − 90°))` : 0° en haut, sens horaire. */
export function pointDeLaRoue(teinte: number, rayon: number = RAYON_DE_LA_ROUE): PointDeLaRoue {
  const angle = ((teinte - 90) * Math.PI) / 180;
  return { x: CENTRE_DE_LA_ROUE.x + rayon * Math.cos(angle), y: CENTRE_DE_LA_ROUE.y + rayon * Math.sin(angle) };
}

/** La teinte visée par un pointeur à `(dx, dy)` du centre de la roue, dans `[0, 360)`. */
export function teinteDuPointeur(dx: number, dy: number): number {
  return normaliserTeinte((Math.atan2(dy, dx) * 180) / Math.PI + 90);
}

const decimal = (valeur: number): number => Math.round(valeur * 100) / 100;

/** Le tracé SVG de l'arc de la roue qui va de la teinte `de` à la teinte `a`, dans le sens horaire. */
export function arcDeLaRoue(de: number, a: number, rayon: number = RAYON_DE_LA_ROUE): string {
  const debut = pointDeLaRoue(de, rayon);
  const fin = pointDeLaRoue(a, rayon);
  return `M${decimal(debut.x)} ${decimal(debut.y)} A${rayon} ${rayon} 0 ${a - de > 180 ? 1 : 0} 1 ${decimal(fin.x)} ${decimal(fin.y)}`;
}

/**
 * L'arc d'une paire trop proche : il couvre les deux teintes par le plus court
 * chemin et déborde de 14° de chaque côté, pour que deux points presque
 * confondus laissent voir un trait.
 */
export function arcDeLaPaire(teinteA: number, teinteB: number): string {
  let debut = teinteA;
  let ecart = ecartAngulaire(teinteA, teinteB);
  if (ecart < 0) {
    debut += ecart;
    ecart = -ecart;
  }
  return arcDeLaRoue(debut - DEBORD_DE_LA_PAIRE, debut + ecart + DEBORD_DE_LA_PAIRE);
}

/**
 * Les palettes dont le nom se pose : toutes jusqu'à huit palettes colorées,
 * au-delà les cochées et celles d'une paire trop proche.
 */
export function palettesNommees(colorees: readonly string[], cochees: readonly string[], enPaire: ReadonlySet<string>): ReadonlySet<string> {
  if (colorees.length <= NOMBRE_DE_NOMS_COMPLETS) return new Set(colorees);
  return new Set(colorees.filter((id) => cochees.includes(id) || enPaire.has(id)));
}

export interface NomPose {
  readonly x: number;
  readonly y: number;
  readonly ancre: 'start' | 'end';
}

/**
 * Le nom d'un point : à 11 px du point, à droite si le point est à droite du
 * centre, à gauche sinon, la ligne de base 3 px sous le point. Un nom à moins
 * de 11 px d'un nom déjà posé du même côté descend de 11 px, autant de fois
 * que nécessaire. L'ordre des points est l'ordre de pose.
 */
export function poserLesNoms(points: readonly PointDeLaRoue[]): NomPose[] {
  const places: { droite: boolean; y: number }[] = [];
  return points.map(({ x, y }) => {
    const droite = x > CENTRE_DE_LA_ROUE.x;
    let ligne = y + 3;
    while (places.some((place) => place.droite === droite && Math.abs(place.y - ligne) < INTERLIGNE_DES_NOMS)) ligne += INTERLIGNE_DES_NOMS;
    places.push({ droite, y: ligne });
    return { x: x + (droite ? 11 : -11), y: ligne, ancre: droite ? 'start' : 'end' };
  });
}
