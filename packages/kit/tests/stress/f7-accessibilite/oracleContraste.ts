/**
 * L'oracle numérique de F7 : le rapport de contraste WCAG 2 écrit d'après la définition (sept étapes du plan, section 2.2), sans
 * rien importer de `src/emplois/`. Les opérateurs rédigent leurs attendus avec lui ; le kit ne s'y compare qu'en test.
 *
 * Le verdict est une comparaison de doubles sans arrondi. Le kit compare à dix décimales ([MOT-22]) : les deux règles donnent le
 * même verdict sur une paire à 8 bits, dont la plus proche d'un seuil en est à 2,9e-9 (`paires.ts` refuse toute paire à moins de 1e-9).
 */

/** Trois octets de 0 à 255. */
export type Octets = readonly [number, number, number];

/** Une couleur de Figma : composantes de 0 à 1, alpha effectif compris. */
export interface Couleur { readonly r: number; readonly g: number; readonly b: number; readonly a: number }

/** Étape 1 : `clamp(round(255 × canal), 0, 255)`. */
export const octetDe = (canal: number): number => Math.min(255, Math.max(0, Math.round(255 * canal)));

export const octetsDe = (couleur: Pick<Couleur, 'r' | 'g' | 'b'>): Octets => [octetDe(couleur.r), octetDe(couleur.g), octetDe(couleur.b)];

/** Étape 2 : la table de 256 valeurs linéaires, la coupure de la partie droite à `seuilEncode` (0,03928 ou 0,04045). */
export function tableDeLuminance(seuilEncode: number): readonly number[] {
  return Array.from({ length: 256 }, (_, octet) => {
    const encode = octet / 255;
    return encode <= seuilEncode ? encode / 12.92 : ((encode + 0.055) / 1.055) ** 2.4;
  });
}

export const TABLE_SRGB = tableDeLuminance(0.04045);

/** Étape 3 : `0,2126 R + 0,7152 G + 0,0722 B`. */
export const luminanceDe = ([r, g, b]: Octets): number => 0.2126 * TABLE_SRGB[r] + 0.7152 * TABLE_SRGB[g] + 0.0722 * TABLE_SRGB[b];

/** Étape 4 : `(Y clair + 0,05) / (Y sombre + 0,05)`. */
export function rapportDeContraste(a: Octets, b: Octets): number {
  const [ya, yb] = [luminanceDe(a), luminanceDe(b)];
  return (Math.max(ya, yb) + 0.05) / (Math.min(ya, yb) + 0.05);
}

/** Étape 5 : le verdict, sans arrondi. */
export const atteintLeSeuil = (rapport: number, seuil: number): boolean => rapport >= seuil;

/** Étape 6 : le rapport tronqué à deux décimales, jamais arrondi, d'après son écriture à dix décimales (une valeur binaire 4,4999999999999996 est 4,5). */
export const tronquerA2 = (rapport: number): number => Number(rapport.toFixed(10).replace(/^(-?\d+\.\d\d)\d*$/, '$1'));

/** Étape 7 : le pire cas est le plus petit rapport. */
export const pireRapport = (rapports: readonly number[]): number => Math.min(...rapports);

// ---------------------------------------------------------------------------------------------------------------------------
// Couleurs en hexadécimal

const DEUX_CHIFFRES = (octet: number): string => octet.toString(16).padStart(2, '0').toUpperCase();

export const hexDe = (couleur: Pick<Couleur, 'r' | 'g' | 'b'>): string => `#${octetsDe(couleur).map(DEUX_CHIFFRES).join('')}`;

export function octetsDeHex(hex: string): Octets {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Hexadécimal illisible : ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Une couleur opaque (ou d'alpha donné) depuis un hexadécimal : les composantes sont des octets sur 255 exactement. */
export function couleurDeHex(hex: string, alpha = 1): Couleur {
  const [r, g, b] = octetsDeHex(hex);
  return { r: r / 255, g: g / 255, b: b / 255, a: alpha };
}

export const rapportDeHex = (a: string, b: string): number => rapportDeContraste(octetsDeHex(a), octetsDeHex(b));

// ---------------------------------------------------------------------------------------------------------------------------
// Composition

/** Une couche est opaque quand son alpha effectif atteint 1. */
const estOpaque = (couche: Couleur): boolean => couche.a >= 1 - 1e-9;

/** Les couches utiles, de la plus haute à la première opaque comprise. */
export function pileJusquAuPremierOpaque(hautVersBas: readonly Couleur[]): Couleur[] {
  const pile: Couleur[] = [];
  for (const couche of hautVersBas) {
    pile.push(couche);
    if (estOpaque(couche)) break;
  }
  return pile;
}

/**
 * Étape de composition : de bas en haut, canal par canal dans l'espace encodé, comme Figma. `arrondiParCouche` arrondit à 8 bits
 * après chaque couche (le second oracle de Q-F7-1). Sans base, la dernière couche de la pile doit être opaque, sinon le rendu est
 * indéterminé (`null`).
 */
export function composer(base: Couleur | null, hautVersBas: readonly Couleur[], arrondiParCouche = false): Couleur | null {
  let rendu = base;
  for (const couche of [...pileJusquAuPremierOpaque(hautVersBas)].reverse()) {
    if (!rendu) {
      if (!estOpaque(couche)) return null;
      rendu = { ...couche, a: 1 };
      continue;
    }
    const part = couche.a;
    const mel = (haut: number, bas: number): number => haut * part + bas * (1 - part);
    const compose = { r: mel(couche.r, rendu.r), g: mel(couche.g, rendu.g), b: mel(couche.b, rendu.b), a: 1 };
    rendu = arrondiParCouche ? couleurDeOctets(octetsDe(compose)) : compose;
  }
  return rendu;
}

export const couleurDeOctets = ([r, g, b]: Octets, alpha = 1): Couleur => ({ r: r / 255, g: g / 255, b: b / 255, a: alpha });

export interface MesureAttendue { readonly rapport: number; readonly premierPlan: string; readonly fond: string }

/**
 * Le rapport d'un premier plan sur son fond : le fond est la composition de ses ancêtres sur `base`, le premier plan celle de ses
 * couches sur ce fond ; un seul arrondi à 8 bits a lieu à la fin, pour chacun. `null` quand le fond est indéterminé.
 */
export function mesurerLaPaire(
  premierPlan: readonly Couleur[], fond: readonly Couleur[], base: Couleur | null, arrondiParCouche = false,
): MesureAttendue | null {
  const fondRendu = composer(base, fond, arrondiParCouche);
  if (!fondRendu) return null;
  const premierRendu = composer(fondRendu, premierPlan, arrondiParCouche);
  if (!premierRendu) return null;
  const [o1, o2] = [octetsDe(premierRendu), octetsDe(fondRendu)];
  return { rapport: rapportDeContraste(o1, o2), premierPlan: hexDe(premierRendu), fond: hexDe(fondRendu) };
}

/** Q-F7-1 : une paire est fragile quand les deux ordres d'arrondi donnent deux verdicts au seuil. */
export function estFragile(premierPlan: readonly Couleur[], fond: readonly Couleur[], base: Couleur | null, seuil: number): boolean {
  const [un, deux] = [mesurerLaPaire(premierPlan, fond, base, false), mesurerLaPaire(premierPlan, fond, base, true)];
  return un !== null && deux !== null && atteintLeSeuil(un.rapport, seuil) !== atteintLeSeuil(deux.rapport, seuil);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Texte

export const SEUIL_DE_NON_TEXTE = 3;
const SEUILS_DU_TEXTE = { texte: { AA: 4.5, AAA: 7 }, grandTexte: { AA: 3, AAA: 4.5 } } as const;

/** Q-F7-3 : le grand texte commence à 24 px, ou à 14 pt (56/3 px) en graisse 700 ou plus. */
export const estUnGrandTexte = (taille: number, graisse: number): boolean => taille >= 24 || (taille >= 56 / 3 && graisse >= 700);

export const seuilDuTexte = (taille: number, graisse: number, niveau: 'AA' | 'AAA'): number =>
  (estUnGrandTexte(taille, graisse) ? SEUILS_DU_TEXTE.grandTexte : SEUILS_DU_TEXTE.texte)[niveau];

/** Le seuil d'un usage (`texte`, `grand-texte`, `icone`, `stroke`, `anneau`) à un niveau. */
export const seuilDeLUsage = (usage: string, niveau: 'AA' | 'AAA'): number =>
  usage === 'texte' ? SEUILS_DU_TEXTE.texte[niveau] : usage === 'grand-texte' ? SEUILS_DU_TEXTE.grandTexte[niveau] : SEUIL_DE_NON_TEXTE;
