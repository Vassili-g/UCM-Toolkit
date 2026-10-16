/**
 * La géométrie de la carte « Roue des teintes » ([UI-43]), sans DOM : où se
 * pose une teinte, quelle teinte vise le pointeur, le tracé d'un arc, quelles
 * palettes portent un nom et à quelle hauteur dans la largeur de la carte.
 */
import { ecartAngulaire, lineaireVersRgb8, normaliserTeinte, oklchVersLineaire, type Mode, type Rgb8 } from 'ucm-couleur';

export const EPAISSEUR_DE_L_ANNEAU = 16;
/** L'écart minimal entre un nom et le bord de la plaque. */
export const MARGE_DES_NOMS = 15;
/** Une paire trop proche déborde de chaque côté de ses deux teintes de cet angle. */
export const DEBORD_DE_LA_PAIRE = 14;
/** L'écart minimal entre deux noms d'une même colonne. */
export const INTERLIGNE_DES_NOMS = 13;
/** La place réservée à un nom, de son bord à l'anneau. */
const PLACE_DES_NOMS = 88;
/** Sous ce rayon, une carte plus étroite déborde. */
const RAYON_MINIMAL = 70;

export interface PointDeLaRoue {
  readonly x: number;
  readonly y: number;
}

export interface GeometrieDeLaRoue {
  readonly largeur: number;
  readonly hauteur: number;
  readonly centre: PointDeLaRoue;
  readonly rayon: number;
}

/** La roue à la largeur `largeur` de la carte ([UI-43]). */
export function geometrieDeLaRoue(largeur: number): GeometrieDeLaRoue {
  const rayon = Math.max(RAYON_MINIMAL, Math.floor(largeur / 2 - PLACE_DES_NOMS));
  const largeurVue = Math.max(largeur, 2 * (rayon + PLACE_DES_NOMS));
  const hauteur = 2 * rayon + 48;
  return { largeur: largeurVue, hauteur, centre: { x: largeurVue / 2, y: hauteur / 2 }, rayon };
}

/** Une teinte se pose autour du centre : 0° en haut, sens horaire. */
export function pointDeLaRoue(teinte: number, rayon: number, centre: PointDeLaRoue): PointDeLaRoue {
  const angle = ((teinte - 90) * Math.PI) / 180;
  return { x: centre.x + rayon * Math.cos(angle), y: centre.y + rayon * Math.sin(angle) };
}

/** La teinte visée par un pointeur à `(dx, dy)` du centre de la roue, dans `[0, 360)`. */
export function teinteDuPointeur(dx: number, dy: number): number {
  return normaliserTeinte((Math.atan2(dy, dx) * 180) / Math.PI + 90);
}

const decimal = (valeur: number): number => Math.round(valeur * 100) / 100;

/** Le tracé SVG de l'arc de la roue qui va de la teinte `de` à la teinte `a`, dans le sens horaire. */
export function arcDeLaRoue(de: number, a: number, rayon: number, centre: PointDeLaRoue): string {
  const debut = pointDeLaRoue(de, rayon, centre);
  const fin = pointDeLaRoue(a, rayon, centre);
  return `M${decimal(debut.x)} ${decimal(debut.y)} A${rayon} ${rayon} 0 ${a - de > 180 ? 1 : 0} 1 ${decimal(fin.x)} ${decimal(fin.y)}`;
}

/**
 * L'arc d'une paire trop proche : il couvre les deux teintes par le plus court
 * chemin et déborde de 14° de chaque côté, pour que deux points presque
 * confondus laissent voir un trait.
 */
export function arcDeLaPaire(teinteA: number, teinteB: number, rayon: number, centre: PointDeLaRoue): string {
  let debut = teinteA;
  let ecart = ecartAngulaire(teinteA, teinteB);
  if (ecart < 0) {
    debut += ecart;
    ecart = -ecart;
  }
  return arcDeLaRoue(debut - DEBORD_DE_LA_PAIRE, debut + ecart + DEBORD_DE_LA_PAIRE, rayon, centre);
}

/** La teinte de l'anneau en sRGB, à chroma constante dans chaque thème. */
export function couleurDeLAnneau(teinte: number, mode: Mode): Rgb8 {
  return lineaireVersRgb8(oklchVersLineaire({ L: mode === 'light' ? 0.78 : 0.62, C: 0.12, H: teinte }));
}

/**
 * Les palettes dont le nom se pose : toutes jusqu'à huit palettes colorées,
 * au-delà les cochées et celles d'une paire trop proche.
 */
export function palettesNommees(colorees: readonly string[], cochees: readonly string[], enPaire: ReadonlySet<string>): ReadonlySet<string> {
  if (colorees.length <= 8) return new Set(colorees);
  return new Set(colorees.filter((id) => cochees.includes(id) || enPaire.has(id)));
}

export interface NomPose {
  readonly x: number;
  readonly y: number;
  readonly ancre: 'start' | 'end';
  readonly trait: string;
}

/**
 * Les noms en deux colonnes espacées, reliés à l'anneau, dans l'ordre d'entrée.
 * L'appelant vérifie leur capacité avec `colonnesTiennent` avant la pose.
 */
export function poserLesNoms(points: readonly { teinte: number; largeurDuNom: number }[], geometrie: GeometrieDeLaRoue): NomPose[] {
  const { rayon, centre, largeur, hauteur } = geometrie;
  const coudes = points.map(({ teinte, largeurDuNom }, rang) => {
    const coude = pointDeLaRoue(teinte, rayon + EPAISSEUR_DE_L_ANNEAU / 2 + 14, centre);
    return { rang, teinte, largeurDuNom, coude, ligne: coude.y };
  });
  const poses: NomPose[] = [];
  for (const droite of [true, false]) {
    const colonne = coudes.filter(({ teinte }) => (teinte < 180) === droite).sort((a, b) => a.coude.y - b.coude.y);
    if (!colonne.length) continue;
    colonne[0].ligne = Math.max(colonne[0].ligne, MARGE_DES_NOMS + 6);
    for (let rang = 1; rang < colonne.length; rang += 1) colonne[rang].ligne = Math.max(colonne[rang].ligne, colonne[rang - 1].ligne + INTERLIGNE_DES_NOMS);
    const exces = colonne[colonne.length - 1].ligne - (hauteur - MARGE_DES_NOMS - 6);
    if (exces > 0) for (const nom of colonne) nom.ligne -= exces;
    for (let rang = colonne.length - 2; rang >= 0; rang -= 1) colonne[rang].ligne = Math.min(colonne[rang].ligne, colonne[rang + 1].ligne - INTERLIGNE_DES_NOMS);
    // La remontée d'une colonne répartie aux deux pôles peut dépasser la marge haute.
    colonne[0].ligne = Math.max(colonne[0].ligne, MARGE_DES_NOMS + 6);
    for (let rang = 1; rang < colonne.length; rang += 1) colonne[rang].ligne = Math.max(colonne[rang].ligne, colonne[rang - 1].ligne + INTERLIGNE_DES_NOMS);
    for (const { rang, teinte, largeurDuNom, coude, ligne } of colonne) {
      const x = droite ? largeur - MARGE_DES_NOMS : MARGE_DES_NOMS;
      const depart = pointDeLaRoue(teinte, rayon + EPAISSEUR_DE_L_ANNEAU / 2 + 1, centre);
      const fin = droite ? Math.max(x - largeurDuNom - 4, coude.x) : Math.min(x + largeurDuNom + 4, coude.x);
      const trait = [[depart.x, depart.y], [coude.x, ligne], [fin, ligne]].map((point) => point.map((nombre) => nombre.toFixed(1)).join(',')).join(' ');
      poses[rang] = { x, y: ligne + 4, ancre: droite ? 'end' : 'start', trait };
    }
  }
  return poses;
}

/** La colonne la plus chargée tient entre les marges verticales de la plaque. */
export function colonnesTiennent(nombreParColonne: number, geometrie: GeometrieDeLaRoue): boolean {
  return (nombreParColonne - 1) * INTERLIGNE_DES_NOMS <= geometrie.hauteur - 2 * (MARGE_DES_NOMS + 6);
}
