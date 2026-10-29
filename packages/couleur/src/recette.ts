/**
 * La recette : sa forme, la recette par défaut, sa validation et son
 * classement à la lecture ([REC-03] à [REC-05], section 7 de la
 * spécification).
 *
 * La validation ne rédige aucune phrase. Elle rend des refus structurés, la
 * règle et le chemin du champ fautif ; l'interface les met en mots.
 */
import { TEXTE_DES_BOUTONS_PAR_DEFAUT, cransRequis, sensDuTheme, type SensDuTheme, type TexteDesBoutons } from '@ucm-kit/core/emplois';
import { FENETRE_DE_LA_RECETTE, classerLEnveloppeDeLaRecette } from '@ucm-kit/core/protocoles';
import { MODES, PROFILS, SEUILS_PAR_USAGE } from '@ucm-kit/core/referentiel';

import { lireHexa } from './conversions';
import { PREREGLAGES, courbesParDefaut, luminositeAuNumero, type Grille } from './nuances';
import { BORNES_DU_COLOR_SHIFT, type DecalageAuxBouts, type Derive, type Mode, type Profil } from './rampe';
import { RELEVE_TAILWIND, type RampeDeDerive } from './tailwind';

/**
 * La version écrite : chaque profil porte sa part commune et son enveloppe de
 * chroma, et `derives` relève les crans de chaque rampe Tailwind
 * ([REC-12]). Les formats 8 à 11 se lisent en format 12 par `classerRecette` ;
 * les formats plus anciens sont illisibles et les formats plus récents sont
 * futurs. La fenêtre des formats lus est celle du kit (`FENETRE_DE_LA_RECETTE`).
 */
export const FORMAT_RECETTE = FENETRE_DE_LA_RECETTE.courante;

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

export interface PartsPropres extends Readonly<Record<Profil, number>> {
  readonly origine: OrigineParts;
}

/** Une valeur par profil ; une palette à une intensité range la sienne sous `vivid`, comme sa dérive. */
export type ParProfil = Readonly<Partial<Record<Profil, number>>>;

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
export interface CouleursFigees extends Readonly<Partial<Record<Mode, readonly string[]>>> {
  readonly light: readonly string[];
}

/** Les couleurs figées d'une palette à deux intensités : celles de chaque intensité, chacune de la forme d'une intensité. */
export type CouleursFigeesParIntensite = Readonly<Record<Profil, CouleursFigees>>;

/** Vrai pour les couleurs figées de deux intensités, `{ soft, vivid }`. */
export function figeesParIntensite(figees: CouleursFigees | CouleursFigeesParIntensite): figees is CouleursFigeesParIntensite {
  return 'soft' in figees;
}

export interface Palette {
  readonly id: string;
  readonly nom?: string;
  readonly reference: string;
  readonly derive: Readonly<Record<Profil, DeriveRangee>> & {
    readonly lien: boolean;
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
   * nuances ; elle n'a ni rôles, ni garanties, ni réglage global, ni Color
   * shift. Avec `intensites: 1`, `figees` est `{ light, dark? }` ; sans lui,
   * c'est `{ soft, vivid }`, chacun de cette forme (format 10).
   */
  readonly figees?: CouleursFigees | CouleursFigeesParIntensite;
}

/** Les parties d'un cadre de la planche que le designer choisit de dessiner ([PLA-28]). */
export interface ContenuDesPlanches extends Readonly<Record<Mode, boolean>> {
  readonly note: boolean;
  readonly usages: boolean;
  readonly grilles: boolean;
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

/** Les bornes de chroma d'un thème dans l'enveloppe d'un profil ; `cyans` est l'amplitude de la bosse centrée à 195°, dans `[−1 ; 1]`. */
export interface BornesDeChroma {
  readonly a: number;
  readonly b: number;
  readonly jaunes: number;
  readonly cyans: number;
}

/** L'enveloppe de chroma d'un profil : `p0` et les bornes de chaque thème. */
export interface EnveloppeDeProfil extends Readonly<Record<Mode, BornesDeChroma>> {
  readonly p0: number;
}

/**
 * Un profil de la recette : sa part commune, le facteur de chroma `clairs` des
 * tons clairs du thème Light (dans `]0 ; 1]`) et son enveloppe, tous
 * obligatoires. `p0` ne suit pas la part commune.
 */
export interface ProfilDeRecette {
  readonly part: number;
  readonly clairs: number;
  readonly enveloppe: EnveloppeDeProfil;
}

/** Les deux profils de la recette par défaut. Les bornes de chroma ne paraissent pas dans l'interface. */
export const PROFILS_PAR_DEFAUT: Readonly<Record<Profil, ProfilDeRecette>> = {
  soft: {
    part: 0.85,
    clairs: 0.7,
    enveloppe: { p0: 0.85, light: { a: 0.6, b: 0.38, jaunes: 1, cyans: 0 }, dark: { a: 1.1, b: 0.15, jaunes: 0, cyans: 0 } },
  },
  vivid: {
    part: 0.95,
    clairs: 1,
    enveloppe: { p0: 0.95, light: { a: 1.1, b: 0.48, jaunes: 0.5, cyans: -0.2 }, dark: { a: 1.1, b: 0.3, jaunes: 0, cyans: 0 } },
  },
};

/** Une copie des profils par défaut : la recette ne partage aucun objet avec la constante. */
function copierLesProfils(profils: Recette['profils']): Recette['profils'] {
  const copie = (profil: ProfilDeRecette): ProfilDeRecette => ({
    part: profil.part,
    clairs: profil.clairs,
    enveloppe: { p0: profil.enveloppe.p0, light: { ...profil.enveloppe.light }, dark: { ...profil.enveloppe.dark } },
  });
  return { soft: copie(profils.soft), vivid: copie(profils.vivid) };
}

export interface Recette {
  readonly formatVersion: number;
  readonly crans: readonly number[];
  readonly courbes: Readonly<Record<Mode, readonly number[]>>;
  readonly profils: Readonly<Record<Profil, ProfilDeRecette>>;
  readonly gamut: 'srgb';
  readonly fonds: Readonly<Record<Mode, string>>;
  readonly texteDesBoutons: Readonly<Record<Mode, TexteDesBoutons>>;
  readonly seuils: Seuils;
  readonly derives: readonly RampeDeDerive[];
  /** Le facteur de la part des fonds du thème Dark au numéro 50, entre 0 et 1 ([MOT-28]). */
  readonly intensiteDesFondsSombres: number;
  readonly contenuDesPlanches: ContenuDesPlanches;
  readonly palettes: readonly Palette[];
}

/** Une copie du relevé : la recette ne partage aucun objet avec `RELEVE_TAILWIND`. */
function copierLeReleve(releve: readonly RampeDeDerive[]): RampeDeDerive[] {
  return releve.map(({ nom, crans }) => ({ nom, crans: crans.map(([L, H]) => [L, H] as const) }));
}

/** La recette par défaut du paquet (section 7.2), sans palette. */
export function recetteParDefaut(): Recette {
  return {
    formatVersion: FORMAT_RECETTE,
    crans: [...PREREGLAGES[11].crans],
    courbes: courbesParDefaut(11, TEXTE_DES_BOUTONS_PAR_DEFAUT),
    profils: copierLesProfils(PROFILS_PAR_DEFAUT),
    gamut: 'srgb',
    fonds: { light: '#F7F7F7', dark: '#0A0A0A' },
    texteDesBoutons: { ...TEXTE_DES_BOUTONS_PAR_DEFAUT },
    seuils: { ...SEUILS_PAR_USAGE, profilsConfondus: 0.02, palettesProches: 0.05 },
    derives: copierLeReleve(RELEVE_TAILWIND),
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
  | 'derives-crans'
  | 'enveloppe'
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
  if (!releve.objet(courbes, 'courbes', MODES)) return;
  for (const mode of MODES) {
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

/** Les bornes d'un cran relevé : `L` dans `]0 ; 1[`, `H` dans `[0 ; 360[`. */
function validerCranDeDerive(releve: Releve, cran: unknown, chemin: string, precedent: number | null): number | null {
  if (!Array.isArray(cran) || cran.length !== 2 || !estNombre(cran[0]) || !estNombre(cran[1])) {
    releve.refuser('forme', chemin);
    return null;
  }
  const [L, H] = cran as [number, number];
  if (L <= 0 || L >= 1) releve.refuser('derives-crans', chemin, L);
  else if (H < 0 || H >= 360) releve.refuser('derives-crans', chemin, H);
  else if (precedent !== null && L >= precedent) releve.refuser('derives-crans', chemin, L);
  return L;
}

/**
 * Les bornes de l'enveloppe d'un profil : `p0` dans `]0 ; 1]`, `a` et `b` dans
 * `]0 ; 2]`, `jaunes` dans `[0 ; 2]`, `cyans` dans `[−1 ; 1]`. Le `clairs` du
 * profil est dans `]0 ; 1]`.
 */
function validerEnveloppe(releve: Releve, profil: Objet, cheminDuProfil: string): void {
  const chemin = `${cheminDuProfil}.enveloppe`;
  const enveloppe = profil.enveloppe;
  if (releve.nombre(profil.clairs, `${cheminDuProfil}.clairs`) && (profil.clairs <= 0 || profil.clairs > 1)) {
    releve.refuser('enveloppe', `${cheminDuProfil}.clairs`, profil.clairs);
  }
  if (!releve.objet(enveloppe, chemin, ['p0', 'light', 'dark'])) return;
  const dans = (valeur: unknown, ici: string, bas: number, haut: number, basInclus: boolean): void => {
    if (!releve.nombre(valeur, ici)) return;
    if ((basInclus ? valeur < bas : valeur <= bas) || valeur > haut) releve.refuser('enveloppe', ici, valeur);
  };
  dans(enveloppe.p0, `${chemin}.p0`, 0, 1, false);
  for (const mode of MODES) {
    const ici = `${chemin}.${mode}`;
    const bornes = enveloppe[mode];
    if (!releve.objet(bornes, ici, ['a', 'b', 'jaunes', 'cyans'])) continue;
    dans(bornes.a, `${ici}.a`, 0, 2, false);
    dans(bornes.b, `${ici}.b`, 0, 2, false);
    dans(bornes.jaunes, `${ici}.jaunes`, 0, 2, true);
    dans(bornes.cyans, `${ici}.cyans`, -1, 1, true);
  }
}

function validerDerives(releve: Releve, derives: unknown): void {
  if (!Array.isArray(derives)) {
    releve.refuser('forme', 'derives');
    return;
  }
  if (derives.length < 2) releve.refuser('derives-nombre', 'derives', derives.length);
  const noms = new Set<string>();
  derives.forEach((rampe, rang) => {
    const chemin = `derives[${rang}]`;
    if (!releve.objet(rampe, chemin, ['nom', 'crans'])) return;
    if (typeof rampe.nom !== 'string') releve.refuser('forme', `${chemin}.nom`);
    else {
      if (rampe.nom === '' || noms.has(rampe.nom)) releve.refuser('derives-noms', chemin, rampe.nom);
      noms.add(rampe.nom);
    }
    const crans = rampe.crans;
    if (!Array.isArray(crans)) {
      releve.refuser('forme', `${chemin}.crans`);
      return;
    }
    if (crans.length < 2) releve.refuser('derives-crans', `${chemin}.crans`, crans.length);
    let precedent: number | null = null;
    crans.forEach((cran, place) => {
      precedent = validerCranDeDerive(releve, cran, `${chemin}.crans[${place}]`, precedent);
    });
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

/** Les couleurs d'une intensité figée : `light`, et `dark` facultatif, un hexa par nuance de la liste. */
function validerCouleursFigees(releve: Releve, figees: unknown, ici: string, nombre: number | null): void {
  if (!releve.objet(figees, ici, ['light'], ['dark'])) return;
  for (const mode of MODES) {
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

/**
 * Les couleurs figées ([VAR-13]) : la palette porte sa liste, chaque thème a
 * un hexa par nuance, et rien de ce qui règle une rampe calculée ne les
 * accompagne. Avec `intensites: 1`, `figees` porte `light` et `dark` ; sans
 * lui, `soft` et `vivid`, chacun avec `light` et `dark`. Les deux formes ne
 * se mélangent pas.
 */
function validerFigees(releve: Releve, palette: Objet, chemin: string): void {
  if (!('figees' in palette)) return;
  const ici = `${chemin}.figees`;
  const figees = palette.figees;
  const parIntensite = estObjet(figees) && ('soft' in figees || 'vivid' in figees);
  if (!Array.isArray(palette.crans)) releve.refuser('figees-sans-liste', ici);
  else if (!parIntensite && palette.intensites !== 1) releve.refuser('figees-sans-liste', ici);
  if (parIntensite && palette.intensites === 1) releve.refuser('figees-incompatible', `${chemin}.intensites`);
  for (const cle of ['base', 'parts', 'reglages', 'originale']) {
    if (cle in palette) releve.refuser('figees-incompatible', `${chemin}.${cle}`);
  }
  const nombre = Array.isArray(palette.crans) ? palette.crans.length : null;
  if (parIntensite) {
    if (!releve.objet(figees, ici, PROFILS)) return;
    for (const profil of PROFILS) {
      if (profil in figees) validerCouleursFigees(releve, figees[profil], `${ici}.${profil}`, nombre);
    }
    return;
  }
  validerCouleursFigees(releve, figees, ici, nombre);
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
  if (!releve.objet(valeurs, chemin, [], PROFILS)) return;
  if (Object.keys(valeurs).length === 0) releve.refuser('reglage-nul', chemin);
  for (const profil of PROFILS) {
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
  // Les crans requis sont la réunion des crans de la table de chaque thème, dans son sens (S2, P7,
  // [REC-13]) : le 50 y entre par `surface/subtle`, aucun cran n'est facultatif. Un texte illisible est
  // déjà refusé plus bas ; sans texte lisible, le thème se juge dans le sens normal.
  const sens: Record<Mode, SensDuTheme> = { light: 'normal', dark: 'normal' };
  if (releve.objet(entree.texteDesBoutons, 'texteDesBoutons', MODES)) {
    for (const mode of MODES) {
      const texte = entree.texteDesBoutons[mode];
      if (texte !== 'blanc' && texte !== 'noir') releve.refuser('texte-des-boutons', `texteDesBoutons.${mode}`, texte);
      else sens[mode] = sensDuTheme(mode, texte);
    }
  }
  if (crans !== null) {
    const requis = [...new Set(MODES.flatMap((mode) => cransRequis(mode, sens[mode])))].sort((a, b) => a - b);
    for (const cran of requis) if (!crans.includes(cran)) releve.refuser('crans-emplois', 'crans', cran);
  }
  validerCourbes(releve, entree.courbes, crans?.length ?? null);

  const profils = entree.profils;
  if (releve.objet(profils, 'profils', PROFILS)) {
    const soft = releve.objet(profils.soft, 'profils.soft', ['part', 'clairs', 'enveloppe']) ? profils.soft : null;
    const vivid = releve.objet(profils.vivid, 'profils.vivid', ['part', 'clairs', 'enveloppe']) ? profils.vivid : null;
    if (soft && vivid) validerParts(releve, soft.part, vivid.part, 'profils', '.part');
    if (soft) validerEnveloppe(releve, soft, 'profils.soft');
    if (vivid) validerEnveloppe(releve, vivid, 'profils.vivid');
  }

  if (entree.gamut !== 'srgb') releve.refuser('gamut-inconnu', 'gamut', entree.gamut);

  if (releve.objet(entree.fonds, 'fonds', MODES)) {
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
 * Le premier refus d'une forme ancienne, avant toute transformation : le
 * texte des boutons déjà présent au format 8, `crans` ou `courbes` absents,
 * un champ du format 11 (`enveloppe`, une rampe de `derives` en objet) dans
 * une recette plus ancienne, un champ du format 12 (`clairs`, `cyans`) dans une
 * recette 11.
 */
function refusDeLaFormeAncienne(objet: Objet, version: number): Refus | null {
  if (version === 8 && 'texteDesBoutons' in objet) return { regle: 'forme', chemin: 'texteDesBoutons' };
  for (const cle of ['crans', 'courbes']) {
    if (!(cle in objet)) return { regle: 'forme', chemin: cle };
  }
  if (estObjet(objet.profils)) {
    for (const profil of PROFILS) {
      const lu = objet.profils[profil];
      if (!estObjet(lu)) continue;
      if (version <= 10 && 'enveloppe' in lu) return { regle: 'forme', chemin: `profils.${profil}.enveloppe` };
      if (version !== 11) continue;
      if ('clairs' in lu) return { regle: 'forme', chemin: `profils.${profil}.clairs` };
      for (const mode of MODES) {
        const bornes = estObjet(lu.enveloppe) ? lu.enveloppe[mode] : undefined;
        if (estObjet(bornes) && 'cyans' in bornes) return { regle: 'forme', chemin: `profils.${profil}.enveloppe.${mode}.cyans` };
      }
    }
  }
  if (version <= 10 && Array.isArray(objet.derives)) {
    const rang = objet.derives.findIndex(estObjet);
    if (rang >= 0) return { regle: 'forme', chemin: `derives[${rang}]` };
  }
  return null;
}

/** Le format 8 reçoit le texte des boutons par défaut ; le reste est celui du format 9. */
function depuisLeFormat8(objet: Objet): Objet {
  return { ...objet, formatVersion: 9, texteDesBoutons: { ...TEXTE_DES_BOUTONS_PAR_DEFAUT } };
}

/** Le format 10 ajoute la forme à deux intensités de `figees` : rien ne change de sens pour une recette 9. */
function depuisLeFormat9(objet: Objet): Objet {
  return { ...objet, formatVersion: 10 };
}

/**
 * La liste de nuances et les deux courbes d'une recette ancienne, quand
 * `luminositeAuNumero` sait les lire : des nombres, deux numéros croissants au
 * moins, une luminosité par numéro. Sinon `null`, et la validation du format 11
 * en refuse la forme.
 */
function grilleLisible(objet: Objet): Grille | null {
  const { crans, courbes } = objet;
  const nombres = (x: unknown): x is number[] => Array.isArray(x) && x.every(estNombre);
  if (!nombres(crans) || crans.length < 2 || !crans.every((cran, rang) => rang === 0 || cran > crans[rang - 1])) return null;
  if (!estObjet(courbes) || !nombres(courbes.light) || !nombres(courbes.dark)) return null;
  if (courbes.light.length !== crans.length || courbes.dark.length !== crans.length) return null;
  return { crans, courbes: { light: courbes.light, dark: courbes.dark } };
}

/** Les profils par défaut du format 11, sans `clairs` ni `cyans` : ce que `depuisLeFormat10` écrit et ce que `depuisLeFormat11` reconnaît. */
const PROFILS_PAR_DEFAUT_DU_FORMAT_11 = {
  soft: {
    part: 0.85,
    enveloppe: { p0: 0.85, light: { a: 0.6, b: 0.38, jaunes: 1 }, dark: { a: 1.1, b: 0.38, jaunes: 0 } },
  },
  vivid: {
    part: 0.95,
    enveloppe: { p0: 0.95, light: { a: 1.1, b: 0.48, jaunes: 0.5 }, dark: { a: 1.1, b: 0.3, jaunes: 0 } },
  },
} as const;

function copierLesProfilsDuFormat11(): Objet {
  return JSON.parse(JSON.stringify(PROFILS_PAR_DEFAUT_DU_FORMAT_11)) as Objet;
}

/** Les crans que la table des deux thèmes exige et que le format 10 laissait facultatifs ([REC-13]). */
const CRANS_AJOUTES_AU_FORMAT_11 = [400, 500, 950];

/**
 * Le cran que `surface/subtle` exige depuis le kit 0.13.34, sans changement de
 * format : une recette de tout format peut ne pas le porter ([REC-13]).
 */
const CRANS_DU_FOND_LEGER = [50];

/**
 * Les crans de `ajoutes` que la liste de l'objet ne porte pas s'y ajoutent,
 * triés, avec la luminosité que `luminositeAuNumero` donne sur la grille
 * d'origine, au millième comme `grilleAuPrereglage` ([REC-13]). Une grille
 * illisible reste telle quelle : la validation en refuse la forme.
 */
function avecLesCransAjoutes(objet: Objet, ajoutes: readonly number[]): Objet {
  const grille = grilleLisible(objet);
  const manquants = grille ? ajoutes.filter((cran) => !grille.crans.includes(cran)) : [];
  if (!grille || manquants.length === 0) return objet;
  const crans = [...grille.crans, ...manquants].sort((a, b) => a - b);
  const courbe = (mode: Mode): number[] => crans.map((cran) => {
    const rang = grille.crans.indexOf(cran);
    return rang >= 0 ? grille.courbes[mode][rang] : Math.round(luminositeAuNumero(grille, mode, cran) * 1000) / 1000;
  });
  return { ...objet, crans, courbes: { light: courbe('light'), dark: courbe('dark') } };
}

/**
 * Le format 11 : les profils et le relevé `derives` du paquet ([REC-12]). Les
 * crans 400, 500 et 950 manquants s'ajoutent à la liste ([REC-13]). Le reste
 * est tel quel.
 */
function depuisLeFormat10(objet: Objet): Objet {
  return {
    ...avecLesCransAjoutes(objet, CRANS_AJOUTES_AU_FORMAT_11),
    formatVersion: 11,
    profils: copierLesProfilsDuFormat11(),
    derives: copierLeReleve(RELEVE_TAILWIND),
  };
}

/** Vrai quand les deux bornes d'un thème portent les mêmes `a`, `b` et `jaunes`. */
function memesBornesDuFormat11(lues: unknown, defaut: { readonly a: number; readonly b: number; readonly jaunes: number }): boolean {
  return estObjet(lues) && lues.a === defaut.a && lues.b === defaut.b && lues.jaunes === defaut.jaunes;
}

/**
 * Le format 12 ajoute `clairs` à chaque profil et `cyans` à chaque thème de
 * son enveloppe. Une enveloppe égale à celle du format 11 par défaut prend
 * l'enveloppe et le `clairs` du format 12 par défaut, profil par profil ; une
 * enveloppe modifiée garde ses valeurs, avec `cyans` 0 et `clairs` 1. Les
 * parts ne changent pas.
 */
function depuisLeFormat11(objet: Objet): Objet {
  if (!estObjet(objet.profils)) return { ...objet, formatVersion: 12 };
  const lus = objet.profils;
  const profils: Objet = { ...lus };
  for (const nom of PROFILS) {
    const profil = lus[nom];
    if (!estObjet(profil) || !estObjet(profil.enveloppe)) continue;
    const { enveloppe } = profil;
    const defaut11 = PROFILS_PAR_DEFAUT_DU_FORMAT_11[nom].enveloppe;
    const parDefaut = enveloppe.p0 === defaut11.p0
      && memesBornesDuFormat11(enveloppe.light, defaut11.light)
      && memesBornesDuFormat11(enveloppe.dark, defaut11.dark);
    if (parDefaut) {
      const { clairs, enveloppe: neuve } = copierLesProfils(PROFILS_PAR_DEFAUT)[nom];
      profils[nom] = { ...profil, clairs, enveloppe: neuve };
      continue;
    }
    const avecCyans = (bornes: unknown): unknown => (estObjet(bornes) ? { ...bornes, cyans: 0 } : bornes);
    profils[nom] = {
      ...profil,
      clairs: 1,
      enveloppe: { ...enveloppe, light: avecCyans(enveloppe.light), dark: avecCyans(enveloppe.dark) },
    };
  }
  return { ...objet, formatVersion: 12, profils };
}

/**
 * Classe le texte rangé sous la clé de la recette avant tout emploi
 * ([REC-03]). Absent ou vide, la recette par défaut est proposée. Une version
 * supérieure est `future`, une version inférieure à 8 est illisible. Les
 * formats 8 à 11 se lisent en format 12, une étape par format ; une forme
 * ancienne qui ne se convertit pas est illisible ([REC-12]). Le 50 manquant
 * s'ajoute à toute recette, courante comme ancienne. La lecture laisse la
 * recette rangée intacte ([REC-04]).
 */
export function classerRecette(texte: string | undefined): Classement {
  const enveloppe = classerLEnveloppeDeLaRecette(texte);
  switch (enveloppe.etat) {
    case 'absente':
      return { etat: 'absente', recette: recetteParDefaut() };
    case 'illisible':
      return {
        etat: 'illisible',
        refus: [enveloppe.cause === 'version'
          ? { regle: 'forme', chemin: 'formatVersion', ...(enveloppe.version === undefined ? {} : { valeur: enveloppe.version }) }
          : { regle: 'forme', chemin: '' }],
      };
    case 'future':
      return { etat: 'future', version: enveloppe.version };
    case 'refusee':
      // classerLEnveloppeDeLaRecette classe un texte : seule une lecture de Figma refuse.
      return { etat: 'illisible', refus: [{ regle: 'forme', chemin: '' }] };
    case 'ancienne':
    case 'courante':
      break;
  }

  const { valeur: objet, version } = enveloppe;
  let lue: Objet = objet;
  if (enveloppe.etat === 'ancienne') {
    const refus = refusDeLaFormeAncienne(objet, version);
    if (refus) return { etat: 'illisible', refus: [refus] };
    if (version === 8) lue = depuisLeFormat8(lue);
    if (version <= 9) lue = depuisLeFormat9(lue);
    if (version <= 10) lue = depuisLeFormat10(lue);
    lue = depuisLeFormat11(lue);
  }
  lue = avecLesCransAjoutes(lue, CRANS_DU_FOND_LEGER);

  const validee = validerRecette(lue);
  return 'refus' in validee ? { etat: 'illisible', refus: validee.refus } : { etat: 'courante', recette: validee.recette };
}
