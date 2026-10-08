/**
 * La recette : sa forme, la recette par défaut, sa validation et son
 * classement à la lecture ([REC-03] à [REC-05], section 7 de la
 * spécification).
 *
 * La validation ne rédige aucune phrase. Elle rend des refus structurés, la
 * règle et le chemin du champ fautif ; l'interface les met en mots.
 */
import { TEXTE_DES_BOUTONS_PAR_DEFAUT, cransRequis, sensDuTheme, type SensDuTheme, type TexteDesBoutons } from '@ucm-kit/core/emplois';

import { lireHexa } from './conversions';
import { PREREGLAGES, courbesParDefaut } from './nuances';
import { BORNES_DU_COLOR_SHIFT, type DecalageAuxBouts, type Derive, type Profil } from './rampe';
import { RELEVE_TAILWIND, type PaireDeDerive } from './tailwind';

/**
 * La version écrite porte le texte des boutons par thème. Le format 8 se lit
 * avec les couleurs de texte par défaut ; les formats plus anciens sont
 * illisibles et les formats plus récents sont futurs.
 */
export const FORMAT_RECETTE = 9;

export type OrigineDerive = 'tailwind' | 'constante' | 'libre';

/**
 * Le Color shift rangé d'un profil ([MOT-30]) : `saturation` et `clarte` sont
 * absents quand leurs deux bouts valent zéro, et `origine` ne mesure que la
 * teinte.
 */
export interface DeriveRangee extends Derive {
  readonly origine: OrigineDerive;
}

/** Les deux décalages facultatifs du Color shift. */
export const DECALAGES_DU_COLOR_SHIFT = ['saturation', 'clarte'] as const;

export type DecalageDuColorShift = (typeof DECALAGES_DU_COLOR_SHIFT)[number];

const DECALAGE_NUL: DecalageAuxBouts = { clair: 0, sombre: 0 };

/** Le décalage d'une grandeur du Color shift, zéro aux deux bouts quand la recette ne le range pas. */
export function decalageRange(derive: Derive, grandeur: DecalageDuColorShift): DecalageAuxBouts {
  return derive[grandeur] ?? DECALAGE_NUL;
}

/** Des parts propres viennent toujours du designer ([ENT-09]). */
export type OrigineParts = 'designer';

export interface PartsPropres {
  readonly soft: number;
  readonly vivid: number;
  readonly origine: OrigineParts;
}

/** Une valeur par profil ; une palette à une intensité range la sienne sous `vivid`, comme sa dérive. */
export interface ParProfil {
  readonly soft?: number;
  readonly vivid?: number;
}

/**
 * Teinte, saturation et luminosité réglées dans la carte (Z10.5, spécification
 * de la refonte des intensités). `teinte` se mesure depuis le départ, en
 * degrés ; `clarte` décale la rampe d'un profil ; `part` est la saturation
 * de la référence, donc celle du profil qui la porte, à une intensité comme
 * à deux. `porteur` fige le profil
 * qui porte la référence, et `depart` garde le départ d'une référence
 * ajustée avant la version 5.
 */
export interface Reglages {
  readonly teinte?: ParProfil;
  readonly clarte?: ParProfil;
  readonly part?: number;
  readonly porteur?: Profil;
  readonly depart?: string;
}

/**
 * Les bornes des réglages : la teinte en degrés, la clarté en décalage OKLCH.
 * La borne de clarté ne garde pas l'ordre des nuances : sur les courbes par
 * défaut, les nuances 50 et 100 du thème Light se confondent dès +0,05. La
 * limite dynamique (`limites.ts`) et la modale d'ajustement s'arrêtent avant.
 */
export const BORNES_DES_REGLAGES = { teinte: 30, clarte: { bas: -0.1, haut: 0.1 } } as const;

/**
 * Les couleurs figées d'une palette reprise « telle quelle » des variables
 * du fichier ([VAR-13]) : un hexa par nuance de sa liste, dans son ordre.
 * `dark` est absent quand la collection d'origine n'a pas de mode Dark : le
 * thème Dark montre alors les couleurs de `light`.
 */
export interface CouleursFigees {
  readonly light: readonly string[];
  readonly dark?: readonly string[];
}

export interface Palette {
  readonly id: string;
  readonly nom?: string;
  readonly reference: string;
  readonly derive: {
    readonly lien: boolean;
    readonly soft: DeriveRangee;
    readonly vivid: DeriveRangee;
  };
  readonly parts?: PartsPropres;
  /** La palette de base ([ENT-11]) : le profil porteur forcé. Absente, le classement automatique décide. */
  readonly base?: Profil;
  /** La liste d'une palette libre (W6) : ses numéros, qui suivent les courbes communes. Absente, la liste commune. */
  readonly crans?: readonly number[];
  /** La référence d'avant le premier ajustement (W7), en majuscules. Absente, aucun ajustement. */
  readonly originale?: string;
  /**
   * `1` : la palette porte une seule intensité, celle de sa référence, sans nom
   * de profil ([ENT-14]). Absent, elle porte Soft et Vivid.
   */
  readonly intensites?: 1;
  /** Teinte, saturation et luminosité de la carte (Z10.5). Absent, aucun réglage. */
  readonly reglages?: Reglages;
  /**
   * Les couleurs d'une palette figée ([VAR-13]) : ses rampes ne se calculent
   * pas, elles rendent ces couleurs. Une palette figée porte sa liste de
   * nuances et une seule intensité ; elle n'a ni rôles, ni garanties, ni
   * réglage global, ni Color shift.
   */
  readonly figees?: CouleursFigees;
}

/** Les parties d'un cadre de la planche que le designer choisit de dessiner ([PLA-28]). */
export interface ContenuDesPlanches {
  readonly note: boolean;
  readonly usages: boolean;
  readonly grilles: boolean;
  readonly light: boolean;
  readonly dark: boolean;
}

/** Tout se dessine : le contenu d'une recette qui ne l'a jamais réglé. */
export const CONTENU_COMPLET: ContenuDesPlanches = { note: true, usages: true, grilles: true, light: true, dark: true };

/** Le facteur de la part des fonds du thème Dark au numéro 50, par défaut ([MOT-28]). */
export const INTENSITE_DES_FONDS_SOMBRES = 0.3;

export interface Seuils {
  readonly texte: number;
  readonly nonTexte: number;
  readonly profilsConfondus: number;
  readonly palettesProches: number;
}

export interface Recette {
  readonly formatVersion: number;
  readonly crans: readonly number[];
  readonly courbes: { readonly light: readonly number[]; readonly dark: readonly number[] };
  readonly profils: { readonly soft: { readonly part: number }; readonly vivid: { readonly part: number } };
  readonly gamut: 'srgb';
  readonly fonds: { readonly light: string; readonly dark: string };
  readonly texteDesBoutons: { readonly light: TexteDesBoutons; readonly dark: TexteDesBoutons };
  readonly seuils: Seuils;
  readonly derives: readonly PaireDeDerive[];
  /** Le facteur de la part des fonds du thème Dark au numéro 50, entre 0 et 1 ([MOT-28]). */
  readonly intensiteDesFondsSombres: number;
  readonly contenuDesPlanches: ContenuDesPlanches;
  readonly palettes: readonly Palette[];
}

/** La recette par défaut du paquet (section 7.2), sans palette. */
export function recetteParDefaut(): Recette {
  return {
    formatVersion: FORMAT_RECETTE,
    crans: [...PREREGLAGES[11].crans],
    courbes: courbesParDefaut(11, TEXTE_DES_BOUTONS_PAR_DEFAUT),
    profils: { soft: { part: 0.45 }, vivid: { part: 0.95 } },
    gamut: 'srgb',
    fonds: { light: '#F7F7F7', dark: '#121212' },
    texteDesBoutons: { ...TEXTE_DES_BOUTONS_PAR_DEFAUT },
    seuils: { texte: 4.5, nonTexte: 3, profilsConfondus: 0.02, palettesProches: 0.05 },
    derives: RELEVE_TAILWIND.map(([nom, clair, sombre]) => [nom, clair, sombre] as PaireDeDerive),
    intensiteDesFondsSombres: INTENSITE_DES_FONDS_SOMBRES,
    contenuDesPlanches: { ...CONTENU_COMPLET },
    palettes: [],
  };
}

/** Les règles de [REC-05], une par refus possible. */
export type RegleRecette =
  | 'forme'
  | 'cle-inconnue'
  | 'crans-croissants'
  | 'courbes-longueur'
  | 'courbes-bornes'
  | 'courbe-claire-decroissante'
  | 'courbe-sombre-croissante'
  | 'parts-bornes'
  | 'parts-ordre'
  | 'gamut-inconnu'
  | 'hexa-invalide'
  | 'texte-des-boutons'
  | 'seuils-positifs'
  | 'derives-nombre'
  | 'derives-noms'
  | 'derives-teintes'
  | 'derives-teintes-claires'
  | 'derive-bornes'
  | 'derive-saturation'
  | 'derive-clarte'
  | 'derive-nulle'
  | 'derive-lien'
  | 'origine-inconnue'
  | 'identifiant-forme'
  | 'identifiants-uniques'
  | 'crans-emplois'
  | 'base-inconnue'
  | 'crans-libres-nombre'
  | 'crans-libres-numeros'
  | 'base-libre'
  | 'originale-identique'
  | 'intensites-valeur'
  | 'intensites-incompatible'
  | 'fonds-sombres-bornes'
  | 'contenu-sans-theme'
  | 'reglages-bornes'
  | 'reglage-nul'
  | 'reglages-intensites'
  | 'porteur-base'
  | 'porteur-manquant'
  | 'reglages-sans-originale'
  | 'depart-sans-reglage'
  | 'depart-identique'
  | 'figees-sans-liste'
  | 'figees-longueur'
  | 'figees-incompatible'
  | 'crans-figes';

/** Un refus : la règle, le chemin du champ fautif, et la valeur lue quand elle se montre. */
export interface Refus {
  readonly regle: RegleRecette;
  readonly chemin: string;
  readonly valeur?: string | number;
}

/** L'identifiant d'une palette : `p-` et huit chiffres hexadécimaux minuscules. */
export const MOTIF_IDENTIFIANT = /^p-[0-9a-f]{8}$/;

type Objet = Record<string, unknown>;

const estObjet = (x: unknown): x is Objet => typeof x === 'object' && x !== null && !Array.isArray(x);
const estNombre = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Accumule les refus d'une validation, dans l'ordre où les champs sont lus. */
class Releve {
  readonly refus: Refus[] = [];

  refuser(regle: RegleRecette, chemin: string, valeur?: unknown): void {
    const montree = typeof valeur === 'string' || typeof valeur === 'number' ? valeur : undefined;
    this.refus.push(montree === undefined ? { regle, chemin } : { regle, chemin, valeur: montree });
  }

  /** Un objet aux clés attendues ; une clé en trop est refusée, une clé manquante aussi. */
  objet(x: unknown, chemin: string, obligatoires: readonly string[], facultatives: readonly string[] = []): x is Objet {
    if (!estObjet(x)) {
      this.refuser('forme', chemin);
      return false;
    }
    for (const cle of obligatoires) if (!(cle in x)) this.refuser('forme', joindre(chemin, cle));
    for (const cle of Object.keys(x)) {
      if (!obligatoires.includes(cle) && !facultatives.includes(cle)) this.refuser('cle-inconnue', joindre(chemin, cle));
    }
    return true;
  }

  nombre(x: unknown, chemin: string): x is number {
    if (estNombre(x)) return true;
    this.refuser('forme', chemin);
    return false;
  }

  nombres(x: unknown, chemin: string): x is number[] {
    if (!Array.isArray(x)) {
      this.refuser('forme', chemin);
      return false;
    }
    return x.map((valeur, rang) => this.nombre(valeur, `${chemin}[${rang}]`)).every(Boolean);
  }

  hexa(x: unknown, chemin: string): void {
    if (typeof x !== 'string' || lireHexa(x) === null) this.refuser('hexa-invalide', chemin, x);
  }
}

const joindre = (chemin: string, cle: string): string => (chemin ? `${chemin}.${cle}` : cle);

function validerCrans(releve: Releve, crans: unknown): number[] | null {
  if (!releve.nombres(crans, 'crans')) return null;
  if (crans.length < 2) releve.refuser('crans-croissants', 'crans');
  crans.forEach((cran, rang) => {
    if (!Number.isInteger(cran) || (rang > 0 && cran <= crans[rang - 1])) {
      releve.refuser('crans-croissants', `crans[${rang}]`, cran);
    }
  });
  return crans;
}

function validerCourbes(releve: Releve, courbes: unknown, longueur: number | null): void {
  if (!releve.objet(courbes, 'courbes', ['light', 'dark'])) return;
  for (const mode of ['light', 'dark'] as const) {
    const chemin = `courbes.${mode}`;
    const courbe = courbes[mode];
    if (!releve.nombres(courbe, chemin)) continue;
    if (longueur !== null && courbe.length !== longueur) releve.refuser('courbes-longueur', chemin, courbe.length);
    courbe.forEach((L, rang) => {
      if (L < 0 || L > 1) releve.refuser('courbes-bornes', `${chemin}[${rang}]`, L);
      if (rang === 0) return;
      if (mode === 'light' && L >= courbe[rang - 1]) releve.refuser('courbe-claire-decroissante', `${chemin}[${rang}]`, L);
      if (mode === 'dark' && L <= courbe[rang - 1]) releve.refuser('courbe-sombre-croissante', `${chemin}[${rang}]`, L);
    });
  }
}

function validerParts(releve: Releve, soft: unknown, vivid: unknown, chemin: string, suffixe: string): void {
  const lues: number[] = [];
  for (const [profil, part] of [['soft', soft], ['vivid', vivid]] as const) {
    const ici = `${chemin}.${profil}${suffixe}`;
    if (!releve.nombre(part, ici)) continue;
    if (part < 0 || part > 1) releve.refuser('parts-bornes', ici, part);
    lues.push(part);
  }
  if (lues.length === 2 && lues[0] > lues[1]) releve.refuser('parts-ordre', chemin);
}

function validerDerives(releve: Releve, derives: unknown): void {
  if (!Array.isArray(derives)) {
    releve.refuser('forme', 'derives');
    return;
  }
  if (derives.length < 2) releve.refuser('derives-nombre', 'derives', derives.length);
  const noms = new Set<string>();
  const teintesClaires = new Set<number>();
  derives.forEach((paire, rang) => {
    const chemin = `derives[${rang}]`;
    if (!Array.isArray(paire) || paire.length !== 3 || typeof paire[0] !== 'string'
      || !estNombre(paire[1]) || !estNombre(paire[2])) {
      releve.refuser('forme', chemin);
      return;
    }
    const [nom, clair, sombre] = paire as [string, number, number];
    if (noms.has(nom)) releve.refuser('derives-noms', chemin, nom);
    noms.add(nom);
    for (const teinte of [clair, sombre]) {
      if (teinte < 0 || teinte >= 360) releve.refuser('derives-teintes', chemin, teinte);
    }
    if (teintesClaires.has(clair)) releve.refuser('derives-teintes-claires', chemin, clair);
    teintesClaires.add(clair);
  });
}

/** Les bornes d'une liste libre (W6) : 4 à 13 numéros, multiples de 50, de 50 à 1050. */
export const BORNES_DES_CRANS_LIBRES = { nombre: [4, 13], pas: 50, premier: 50, dernier: 1050 } as const;

function validerCransLibres(releve: Releve, crans: unknown, chemin: string): void {
  if (!releve.nombres(crans, chemin)) return;
  const { nombre, pas, premier, dernier } = BORNES_DES_CRANS_LIBRES;
  if (crans.length < nombre[0] || crans.length > nombre[1]) releve.refuser('crans-libres-nombre', chemin, crans.length);
  crans.forEach((cran, rang) => {
    const horsPas = !Number.isInteger(cran) || cran % pas !== 0 || cran < premier || cran > dernier;
    if (horsPas || (rang > 0 && cran <= crans[rang - 1])) releve.refuser('crans-libres-numeros', `${chemin}[${rang}]`, cran);
  });
}

/**
 * La liste d'une palette figée : les nuances lues dans les noms des
 * variables, des entiers positifs ou nuls, strictement croissants. Elle
 * n'obéit pas aux bornes d'une liste libre : rien ne se calcule sur elle.
 */
function validerCransFiges(releve: Releve, crans: unknown, chemin: string): void {
  if (!releve.nombres(crans, chemin)) return;
  if (crans.length === 0) releve.refuser('crans-figes', chemin, 0);
  crans.forEach((cran, rang) => {
    if (!Number.isInteger(cran) || cran < 0 || (rang > 0 && cran <= crans[rang - 1])) releve.refuser('crans-figes', `${chemin}[${rang}]`, cran);
  });
}

/**
 * Les couleurs figées ([VAR-13]) : la palette porte sa liste et une seule
 * intensité, chaque thème a un hexa par nuance, et rien de ce qui règle une
 * rampe calculée ne les accompagne.
 */
function validerFigees(releve: Releve, palette: Objet, chemin: string): void {
  if (!('figees' in palette)) return;
  const ici = `${chemin}.figees`;
  const figees = palette.figees;
  if (!Array.isArray(palette.crans) || palette.intensites !== 1) releve.refuser('figees-sans-liste', ici);
  for (const cle of ['base', 'parts', 'reglages', 'originale']) {
    if (cle in palette) releve.refuser('figees-incompatible', `${chemin}.${cle}`);
  }
  if (!releve.objet(figees, ici, ['light'], ['dark'])) return;
  const nombre = Array.isArray(palette.crans) ? palette.crans.length : null;
  for (const mode of ['light', 'dark'] as const) {
    if (!(mode in figees)) continue;
    const couleurs = figees[mode];
    if (!Array.isArray(couleurs)) {
      releve.refuser('forme', `${ici}.${mode}`);
      continue;
    }
    if (nombre !== null && couleurs.length !== nombre) releve.refuser('figees-longueur', `${ici}.${mode}`, couleurs.length);
    couleurs.forEach((couleur, rang) => releve.hexa(couleur, `${ici}.${mode}[${rang}]`));
  }
}

const ORIGINES_DERIVE: readonly string[] = ['tailwind', 'constante', 'libre'];
const ORIGINES_PARTS: readonly string[] = ['designer'];

const REGLE_DE_LA_BORNE: { readonly [G in DecalageDuColorShift]: RegleRecette } = {
  saturation: 'derive-saturation',
  clarte: 'derive-clarte',
};

/** Un décalage aux deux bouts : deux nombres dans leur borne, pas tous deux nuls ([REC-05]). */
function validerDecalage(releve: Releve, decalage: unknown, chemin: string, grandeur: DecalageDuColorShift): void {
  if (!releve.objet(decalage, chemin, ['clair', 'sombre'])) return;
  const borne = BORNES_DU_COLOR_SHIFT[grandeur];
  const lus = (['clair', 'sombre'] as const).filter((bout) => {
    const valeur = decalage[bout];
    if (!releve.nombre(valeur, `${chemin}.${bout}`)) return false;
    if (Math.abs(valeur) > borne) releve.refuser(REGLE_DE_LA_BORNE[grandeur], `${chemin}.${bout}`, valeur);
    return true;
  });
  if (lus.length === 2 && decalage.clair === 0 && decalage.sombre === 0) releve.refuser('derive-nulle', chemin);
}

function validerDerivePalette(releve: Releve, derive: unknown, chemin: string): void {
  if (!releve.objet(derive, chemin, ['clair', 'sombre', 'origine'], DECALAGES_DU_COLOR_SHIFT)) return;
  for (const bout of ['clair', 'sombre'] as const) {
    const angle = derive[bout];
    if (releve.nombre(angle, `${chemin}.${bout}`) && Math.abs(angle) > BORNES_DU_COLOR_SHIFT.teinte) {
      releve.refuser('derive-bornes', `${chemin}.${bout}`, angle);
    }
  }
  if (!ORIGINES_DERIVE.includes(derive.origine as string)) {
    releve.refuser('origine-inconnue', `${chemin}.origine`, derive.origine);
  }
  for (const grandeur of DECALAGES_DU_COLOR_SHIFT) {
    if (grandeur in derive) validerDecalage(releve, derive[grandeur], `${chemin}.${grandeur}`, grandeur);
  }
}

/** Le Color shift d'un profil en sept valeurs, un décalage absent valant zéro aux deux bouts. */
function valeursDuColorShift(derive: Objet): unknown[] {
  const bouts = (decalage: unknown): unknown[] => (estObjet(decalage) ? [decalage.clair, decalage.sombre] : [0, 0]);
  return [derive.clair, derive.sombre, derive.origine, ...bouts(derive.saturation), ...bouts(derive.clarte)];
}

/**
 * Une palette à une intensité ([ENT-14]) : `intensites` ne vaut que 1, sans
 * quoi deux textes décriraient la même palette. Sa part est celle de la
 * référence et sa rampe n'a pas de profil : ni `base`, ni `parts`, ni une
 * dérive déliée. Une palette libre n'en porte pas.
 */
function validerIntensites(releve: Releve, palette: Objet, chemin: string): void {
  if (!('intensites' in palette)) return;
  if (palette.intensites !== 1) releve.refuser('intensites-valeur', `${chemin}.intensites`, palette.intensites);
  // Une palette à une intensité porte sa liste de nuances : une palette reprise du fichier garde les siennes ([VAR-13]).
  for (const cle of ['base', 'parts']) {
    if (cle in palette) releve.refuser('intensites-incompatible', `${chemin}.${cle}`);
  }
  if (estObjet(palette.derive) && palette.derive.lien === false) releve.refuser('intensites-incompatible', `${chemin}.derive.lien`);
}

/**
 * Le profil dont les réglages déplacent la référence : la palette de base, le
 * porteur figé, `vivid` pour une palette à une intensité. Absent quand le
 * classement automatique décide encore, faute de réglage.
 */
function porteurRange(palette: Objet): Profil | undefined {
  if (palette.intensites === 1) return 'vivid';
  if (palette.base === 'soft' || palette.base === 'vivid') return palette.base;
  const reglages = palette.reglages;
  return estObjet(reglages) && (reglages.porteur === 'soft' || reglages.porteur === 'vivid') ? reglages.porteur : undefined;
}

/** Vrai quand la palette porte un réglage du porteur : sa teinte, sa clarté ou la part de la référence. */
function aUnReglageDuPorteur(palette: Objet): boolean {
  const reglages = palette.reglages;
  const porteur = porteurRange(palette);
  if (!estObjet(reglages)) return false;
  if ('part' in reglages) return true;
  if (!porteur) return false;
  return [reglages.teinte, reglages.clarte].some((valeurs) => estObjet(valeurs) && porteur in valeurs);
}

function validerParProfil(releve: Releve, valeurs: unknown, chemin: string, bas: number, haut: number): void {
  if (!releve.objet(valeurs, chemin, [], ['soft', 'vivid'])) return;
  if (Object.keys(valeurs).length === 0) releve.refuser('reglage-nul', chemin);
  for (const profil of ['soft', 'vivid'] as const) {
    if (!(profil in valeurs)) continue;
    const valeur = valeurs[profil];
    if (!releve.nombre(valeur, `${chemin}.${profil}`)) continue;
    if (valeur === 0) releve.refuser('reglage-nul', `${chemin}.${profil}`);
    else if (valeur < bas || valeur > haut) releve.refuser('reglages-bornes', `${chemin}.${profil}`, valeur);
  }
}

/**
 * Les réglages de la carte (Z10.5) : bornés, jamais nuls, une clé par
 * intensité présente ; le porteur figé à deux intensités sans palette de
 * base ; l'originale et le départ seulement quand un réglage du porteur
 * déplace la référence.
 */
function validerReglages(releve: Releve, palette: Objet, chemin: string): void {
  if (!('reglages' in palette)) return;
  const ici = `${chemin}.reglages`;
  const reglages = palette.reglages;
  if (!releve.objet(reglages, ici, [], ['teinte', 'clarte', 'part', 'porteur', 'depart'])) return;
  const une = palette.intensites === 1;
  const { teinte, clarte } = BORNES_DES_REGLAGES;
  if ('teinte' in reglages) validerParProfil(releve, reglages.teinte, `${ici}.teinte`, -teinte, teinte);
  if ('clarte' in reglages) validerParProfil(releve, reglages.clarte, `${ici}.clarte`, clarte.bas, clarte.haut);
  if ('part' in reglages && releve.nombre(reglages.part, `${ici}.part`) && (reglages.part < 0 || reglages.part > 1)) {
    releve.refuser('reglages-bornes', `${ici}.part`, reglages.part);
  }
  if (!['teinte', 'clarte', 'part'].some((cle) => cle in reglages)) releve.refuser('reglage-nul', ici);
  if ('porteur' in reglages && reglages.porteur !== 'soft' && reglages.porteur !== 'vivid') releve.refuser('base-inconnue', `${ici}.porteur`, reglages.porteur);
  if ('depart' in reglages) releve.hexa(reglages.depart, `${ici}.depart`);

  if (une) {
    for (const cle of ['teinte', 'clarte'] as const) {
      const valeurs = reglages[cle];
      if (estObjet(valeurs) && 'soft' in valeurs) releve.refuser('reglages-intensites', `${ici}.${cle}.soft`);
    }
    if ('porteur' in reglages) releve.refuser('reglages-intensites', `${ici}.porteur`);
  } else {
    if ('base' in palette && 'porteur' in reglages) releve.refuser('porteur-base', `${ici}.porteur`);
    if (!('base' in palette) && !('porteur' in reglages)) releve.refuser('porteur-manquant', ici);
  }

  const duPorteur = aUnReglageDuPorteur(palette);
  if (duPorteur && !('originale' in palette)) releve.refuser('reglages-sans-originale', ici);
  if ('depart' in reglages) {
    if (!duPorteur) releve.refuser('depart-sans-reglage', `${ici}.depart`);
    const identique = typeof reglages.depart === 'string' && typeof palette.originale === 'string'
      && reglages.depart.toUpperCase() === palette.originale.toUpperCase();
    if (identique) releve.refuser('depart-identique', `${ici}.depart`, reglages.depart as string);
  }
}

function validerPalette(releve: Releve, palette: unknown, chemin: string): void {
  if (!releve.objet(palette, chemin, ['id', 'reference', 'derive'], ['nom', 'parts', 'base', 'crans', 'originale', 'intensites', 'reglages', 'figees'])) return;
  if (typeof palette.id !== 'string' || !MOTIF_IDENTIFIANT.test(palette.id)) {
    releve.refuser('identifiant-forme', `${chemin}.id`, palette.id);
  }
  if ('nom' in palette && typeof palette.nom !== 'string') releve.refuser('forme', `${chemin}.nom`);
  if ('base' in palette && palette.base !== 'soft' && palette.base !== 'vivid') releve.refuser('base-inconnue', `${chemin}.base`, palette.base);
  releve.hexa(palette.reference, `${chemin}.reference`);
  if ('crans' in palette) {
    if ('figees' in palette) validerCransFiges(releve, palette.crans, `${chemin}.crans`);
    else validerCransLibres(releve, palette.crans, `${chemin}.crans`);
    if ('base' in palette) releve.refuser('base-libre', `${chemin}.base`, palette.base as string);
  }
  validerFigees(releve, palette, chemin);
  if ('originale' in palette) {
    releve.hexa(palette.originale, `${chemin}.originale`);
    // Un réglage fin du porteur rend souvent les octets de l'originale : elle reste alors, comme départ (Z10.5).
    const identique = typeof palette.originale === 'string' && typeof palette.reference === 'string'
      && palette.originale.toUpperCase() === palette.reference.toUpperCase();
    if (identique && !aUnReglageDuPorteur(palette)) releve.refuser('originale-identique', `${chemin}.originale`, palette.originale as string);
  }

  validerIntensites(releve, palette, chemin);
  validerReglages(releve, palette, chemin);

  const derive = palette.derive;
  if (releve.objet(derive, `${chemin}.derive`, ['lien', 'soft', 'vivid'])) {
    if (typeof derive.lien !== 'boolean') releve.refuser('forme', `${chemin}.derive.lien`);
    validerDerivePalette(releve, derive.soft, `${chemin}.derive.soft`);
    validerDerivePalette(releve, derive.vivid, `${chemin}.derive.vivid`);
    const soft = derive.soft;
    const vivid = derive.vivid;
    const identiques = estObjet(soft) && estObjet(vivid)
      && valeursDuColorShift(soft).every((valeur, rang) => valeur === valeursDuColorShift(vivid)[rang]);
    if (derive.lien === true && !identiques) releve.refuser('derive-lien', `${chemin}.derive`);
  }

  if ('parts' in palette) {
    const parts = palette.parts;
    if (releve.objet(parts, `${chemin}.parts`, ['soft', 'vivid', 'origine'])) {
      validerParts(releve, parts.soft, parts.vivid, `${chemin}.parts`, '');
      if (!ORIGINES_PARTS.includes(parts.origine as string)) {
        releve.refuser('origine-inconnue', `${chemin}.parts.origine`, parts.origine);
      }
    }
  }
}

const CLES_RECETTE = [
  'formatVersion',
  'crans',
  'courbes',
  'profils',
  'gamut',
  'fonds',
  'texteDesBoutons',
  'seuils',
  'derives',
  'intensiteDesFondsSombres',
  'contenuDesPlanches',
  'palettes',
] as const;

const PARTIES_DU_CONTENU = ['note', 'usages', 'grilles', 'light', 'dark'] as const;

function validerContenu(releve: Releve, contenu: unknown): void {
  if (!releve.objet(contenu, 'contenuDesPlanches', PARTIES_DU_CONTENU)) return;
  for (const partie of PARTIES_DU_CONTENU) {
    if (typeof contenu[partie] !== 'boolean') releve.refuser('forme', `contenuDesPlanches.${partie}`);
  }
  // Un cadre dessine au moins un thème ([PLA-28]).
  if (contenu.light === false && contenu.dark === false) releve.refuser('contenu-sans-theme', 'contenuDesPlanches');
}

/**
 * Valide la forme d'une recette de la version courante ([REC-05]). Rend la
 * recette, ou la liste de tous les refus, dans l'ordre des champs.
 */
export function validerRecette(entree: unknown): { recette: Recette } | { refus: Refus[] } {
  const releve = new Releve();
  if (!releve.objet(entree, '', CLES_RECETTE)) return { refus: releve.refus };

  if (entree.formatVersion !== FORMAT_RECETTE) releve.refuser('forme', 'formatVersion', entree.formatVersion as number);
  const crans = validerCrans(releve, entree.crans);
  // Les crans requis sont ceux de la table de chaque sens en usage (S2, P7) : 50, 400 et 950 sont
  // facultatifs, et 500 n'est exigé que si un thème est inversé. Un texte illisible est déjà
  // refusé plus bas ; sans texte lisible, la liste se juge dans le sens normal.
  const sens = new Set<SensDuTheme>();
  if (releve.objet(entree.texteDesBoutons, 'texteDesBoutons', ['light', 'dark'])) {
    for (const mode of ['light', 'dark'] as const) {
      const texte = entree.texteDesBoutons[mode];
      if (texte !== 'blanc' && texte !== 'noir') releve.refuser('texte-des-boutons', `texteDesBoutons.${mode}`, texte);
      else sens.add(sensDuTheme(mode, texte));
    }
  }
  if (sens.size === 0) sens.add('normal');
  if (crans !== null) {
    const requis = [...new Set([...sens].flatMap(cransRequis))].sort((a, b) => a - b);
    for (const cran of requis) if (!crans.includes(cran)) releve.refuser('crans-emplois', 'crans', cran);
  }
  validerCourbes(releve, entree.courbes, crans?.length ?? null);

  const profils = entree.profils;
  if (releve.objet(profils, 'profils', ['soft', 'vivid'])) {
    const soft = profils.soft;
    const vivid = profils.vivid;
    if (releve.objet(soft, 'profils.soft', ['part']) && releve.objet(vivid, 'profils.vivid', ['part'])) {
      validerParts(releve, soft.part, vivid.part, 'profils', '.part');
    }
  }

  if (entree.gamut !== 'srgb') releve.refuser('gamut-inconnu', 'gamut', entree.gamut);

  if (releve.objet(entree.fonds, 'fonds', ['light', 'dark'])) {
    releve.hexa(entree.fonds.light, 'fonds.light');
    releve.hexa(entree.fonds.dark, 'fonds.dark');
  }

  const seuils = entree.seuils;
  const nomsSeuils = ['texte', 'nonTexte', 'profilsConfondus', 'palettesProches'];
  if (releve.objet(seuils, 'seuils', nomsSeuils)) {
    for (const nom of nomsSeuils) {
      const valeur = seuils[nom];
      if (releve.nombre(valeur, `seuils.${nom}`) && valeur <= 0) releve.refuser('seuils-positifs', `seuils.${nom}`, valeur);
    }
  }

  validerDerives(releve, entree.derives);

  const fondsSombres = entree.intensiteDesFondsSombres;
  if (releve.nombre(fondsSombres, 'intensiteDesFondsSombres') && (fondsSombres < 0 || fondsSombres > 1)) {
    releve.refuser('fonds-sombres-bornes', 'intensiteDesFondsSombres', fondsSombres);
  }
  validerContenu(releve, entree.contenuDesPlanches);

  if (!Array.isArray(entree.palettes)) {
    releve.refuser('forme', 'palettes');
  } else {
    const identifiants = new Set<unknown>();
    entree.palettes.forEach((palette, rang) => {
      const chemin = `palettes[${rang}]`;
      validerPalette(releve, palette, chemin);
      const id = estObjet(palette) ? palette.id : undefined;
      if (identifiants.has(id)) releve.refuser('identifiants-uniques', `${chemin}.id`, id as string);
      identifiants.add(id);
    });
  }

  return releve.refus.length > 0 ? { refus: releve.refus } : { recette: entree as unknown as Recette };
}

/** Ce que la lecture conclut d'une recette rangée ([REC-03]). */
export type Classement =
  | { readonly etat: 'absente'; readonly recette: Recette }
  | { readonly etat: 'courante'; readonly recette: Recette }
  | { readonly etat: 'future'; readonly version: number }
  | { readonly etat: 'illisible'; readonly refus: readonly Refus[] };

/**
 * Classe le texte rangé sous la clé de la recette avant tout emploi
 * ([REC-03]). Absent ou vide, la recette par défaut est proposée. Une version
 * supérieure est `future`. Le format 8 reçoit le texte des boutons par défaut
 * avant validation au format courant. Une version inférieure à 8 est
 * illisible. La lecture laisse la recette rangée intacte ([REC-04]).
 */
export function classerRecette(texte: string | undefined): Classement {
  if (texte === undefined || texte === '') return { etat: 'absente', recette: recetteParDefaut() };

  let objet: unknown;
  try {
    objet = JSON.parse(texte);
  } catch {
    return { etat: 'illisible', refus: [{ regle: 'forme', chemin: '' }] };
  }
  if (!estObjet(objet)) return { etat: 'illisible', refus: [{ regle: 'forme', chemin: '' }] };

  const version = objet.formatVersion;
  if (!Number.isInteger(version) || (version as number) < 0) {
    return { etat: 'illisible', refus: [{ regle: 'forme', chemin: 'formatVersion' }] };
  }
  if ((version as number) > FORMAT_RECETTE) return { etat: 'future', version: version as number };
  if ((version as number) < 8) {
    return { etat: 'illisible', refus: [{ regle: 'forme', chemin: 'formatVersion', valeur: version as number }] };
  }

  if (version === 8) {
    if ('texteDesBoutons' in objet) return { etat: 'illisible', refus: [{ regle: 'forme', chemin: 'texteDesBoutons' }] };
    objet = { ...objet, formatVersion: FORMAT_RECETTE, texteDesBoutons: { ...TEXTE_DES_BOUTONS_PAR_DEFAUT } };
  }

  const lue = validerRecette(objet);
  return 'refus' in lue ? { etat: 'illisible', refus: lue.refus } : { etat: 'courante', recette: lue.recette };
}
