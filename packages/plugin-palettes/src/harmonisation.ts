/** La sélection d'Harmonisation suit les identifiants de la recette, sans DOM ni rangement. */
import { aUneIntensite, arrondir, CHROMA_DES_PALETTES_COLOREES, estLibre, partsDe, referenceDe, rgb8VersOklch, sortieLaPlusProche, validerRecette, type Mode, type Palette, type PaireTropProche, type Profil, type Recette, type Refus, type RoleDeProximite } from 'ucm-couleur';

import { remplacerPalette } from './edition';
import { GRANDEURS, valeursDesProfils, type Grandeur } from './reglagesParDefaut';

export interface EtatHarmonisation {
  readonly cochees: readonly string[];
  readonly regler: string | null;
  readonly mode: Mode;
  readonly intensite: Profil;
  readonly affichage: 'couleurs' | 'gris';
  readonly roue: boolean;
  readonly vision: 'Normale' | 'Deutéranopie' | 'Protanopie' | 'Tritanopie';
  /** Les palettes au premier réglage depuis l'entrée, indexées par identifiant. */
  readonly departs: ReadonlyMap<string, Palette>;
  readonly trop: boolean;
}

export function harmonisationInitiale(): EtatHarmonisation {
  return {
    cochees: [],
    regler: null,
    mode: 'light',
    intensite: 'vivid',
    affichage: 'couleurs',
    roue: false,
    vision: 'Normale',
    departs: new Map(),
    trop: false,
  };
}

/** Une suppression retire l'identifiant ; un import ou une synchronisation conserve ceux encore présents. */
export function synchroniserHarmonisation(etat: EtatHarmonisation, recette: Recette | null): EtatHarmonisation {
  if (!recette || recette.palettes.length < 2) return harmonisationInitiale();
  const presentes = new Set(recette.palettes.map((palette) => palette.id));
  const cochees = etat.cochees.filter((id) => presentes.has(id));
  return {
    ...etat,
    cochees,
    regler: etat.regler !== null && cochees.includes(etat.regler) ? etat.regler : cochees[0] ?? null,
    departs: new Map([...etat.departs].filter(([id]) => presentes.has(id))),
    trop: cochees.length === etat.cochees.length && etat.trop,
  };
}

/** Le cinquième cochage est refusé ; décocher la palette à régler choisit la première restante. */
export function cocherPalette(etat: EtatHarmonisation, recette: Recette, id: string): EtatHarmonisation {
  const courant = synchroniserHarmonisation(etat, recette);
  if (recette.palettes.length < 2 || !recette.palettes.some((palette) => palette.id === id)) return courant;
  const deja = courant.cochees.includes(id);
  if (!deja && courant.cochees.length >= 4) return { ...courant, trop: true };
  const cochees = deja ? courant.cochees.filter((cochee) => cochee !== id) : [...courant.cochees, id];
  return {
    ...courant,
    cochees,
    regler: courant.regler !== null && cochees.includes(courant.regler) ? courant.regler : cochees[0] ?? null,
    trop: false,
  };
}

/** Le choix de la bascule « Couleurs | Niveaux de gris » de la carte Comparaison. */
export function choisirAffichage(etat: EtatHarmonisation, affichage: EtatHarmonisation['affichage']): EtatHarmonisation {
  return etat.affichage === affichage ? etat : { ...etat, affichage };
}

export function toutDecocher(etat: EtatHarmonisation): EtatHarmonisation {
  return { ...etat, cochees: [], regler: null, trop: false };
}

/** Seule une palette cochée peut recevoir les réglages. */
export function choisirPaletteARegler(etat: EtatHarmonisation, id: string): EtatHarmonisation {
  return etat.cochees.includes(id) ? { ...etat, regler: id } : etat;
}

/** Chaque entrée renouvelle le départ de l'annulation, en conservant les choix de la session. */
export function entrerEnHarmonisation(etat: EtatHarmonisation): EtatHarmonisation {
  return { ...etat, departs: new Map() };
}

/** Le premier réglage d'une palette depuis l'entrée garde la palette d'avant lui ; les suivants la laissent. */
export function memoriserLeDepart(etat: EtatHarmonisation, palette: Palette): EtatHarmonisation {
  return etat.departs.has(palette.id) ? etat : { ...etat, departs: new Map(etat.departs).set(palette.id, palette) };
}

/** L'écart à son départ, par grandeur, à partir duquel une palette compte comme modifiée. */
export const ECARTS_DE_MODIFICATION: Readonly<Record<Grandeur, number>> = { teinte: 0.5, saturation: 0.005, luminosite: 0.0005 };

/** Une valeur de teinte, de saturation ou de luminosité, de l'un des profils, diffère de celle du départ. */
export function modifieeDepuisLeDepart(recette: Recette, palette: Palette, depart: Palette): boolean {
  const [courantes, anciennes] = [valeursDesProfils(recette, palette), valeursDesProfils(recette, depart)];
  const profils: readonly Profil[] = aUneIntensite(palette) ? ['vivid'] : ['soft', 'vivid'];
  return profils.some((profil) => GRANDEURS.some((grandeur) => arrondir(Math.abs(courantes[profil][grandeur] - anciennes[profil][grandeur]), 6) >= ECARTS_DE_MODIFICATION[grandeur]));
}

/**
 * La palette courante avec les réglages du départ : la référence, `originale`,
 * `base`, `reglages` et `parts` que les gestes de teinte, de saturation et de
 * luminosité peuvent changer. Le reste (nom, nuances, dérive) est celui de
 * la palette courante.
 */
export function restaurerLesReglages(courante: Palette, depart: Palette): Palette {
  const { reference: _reference, originale: _originale, base: _base, reglages: _reglages, parts: _parts, ...reste } = courante;
  return {
    ...reste,
    reference: depart.reference,
    ...(depart.originale === undefined ? {} : { originale: depart.originale }),
    ...(depart.base === undefined ? {} : { base: depart.base }),
    ...(depart.reglages === undefined ? {} : { reglages: depart.reglages }),
    ...(depart.parts === undefined ? {} : { parts: depart.parts }),
  };
}

/** Ce que « Annuler les modifications » range : la recette dont la palette a repris son départ, ou le refus qui l'en empêche. */
export type AnnulationDesModifications = { readonly recette: Recette } | { readonly refus: Refus };

/**
 * « Annuler les modifications » de la palette `id` : ses réglages reprennent
 * ceux de son départ, elle seule. `null` quand elle n'a pas de départ, ou
 * quand elle n'en diffère pas. Un refus laisse l'état tel quel : la recette
 * et les départs ne changent que par ce que l'appelant adopte.
 */
export function annulerLaPalette(recette: Recette, etat: EtatHarmonisation, id: string): AnnulationDesModifications | null {
  const courante = recette.palettes.find((palette) => palette.id === id);
  const depart = etat.departs.get(id);
  if (!courante || !depart || !modifieeDepuisLeDepart(recette, courante, depart)) return null;
  const suivante = remplacerPalette(recette, restaurerLesReglages(courante, depart));
  const jugee = validerRecette(suivante);
  return 'refus' in jugee ? { refus: jugee.refus[0] } : { recette: suivante };
}

/** La palette des réglettes d'une paire, et vrai quand aucune des deux ne sort de la zone trop proche. */
export interface PaletteARegler {
  readonly id: string;
  readonly sansSortie: boolean;
}

/**
 * La palette de la paire qui sort de la zone trop proche par le plus petit
 * écart de teinte (`sortieLaPlusProche`), A à égalité. Une palette sans sortie
 * laisse l'autre ; sans sortie ni de l'une ni de l'autre, A.
 */
export function paletteARegler(recette: Recette, [idA, idB]: readonly [string, string]): PaletteARegler {
  const [a, b] = [idA, idB].map((id) => recette.palettes.find((palette) => palette.id === id));
  if (!a || !b) return { id: idA, sansSortie: true };
  const [sortieA, sortieB] = [sortieLaPlusProche(recette, a, b), sortieLaPlusProche(recette, b, a)];
  if (sortieA === null && sortieB === null) return { id: idA, sansSortie: true };
  if (sortieA === null) return { id: idB, sansSortie: false };
  if (sortieB === null) return { id: idA, sansSortie: false };
  return { id: Math.abs(sortieB) < Math.abs(sortieA) ? idB : idA, sansSortie: false };
}

/**
 * « Comparer » une paire : elle seule est cochée, l'aperçu passe au thème du
 * constat et `regler` reçoit `paletteARegler`. L'intensité, l'affichage et les
 * réglages restent.
 */
export function comparerLaPaire(etat: EtatHarmonisation, recette: Recette, paire: PaireTropProche): EtatHarmonisation {
  const courant = synchroniserHarmonisation(etat, recette);
  if (recette.palettes.length < 2 || !paire.palettes.every((id) => recette.palettes.some((palette) => palette.id === id))) return courant;
  return {
    ...courant,
    cochees: [...paire.palettes],
    regler: paletteARegler(recette, paire.palettes).id,
    mode: paire.proximite.mode,
    trop: false,
  };
}

/** Un écart de saturation de cette taille, entre deux palettes cochées, se dit. */
export const ECART_DE_SATURATION_DIT = 0.2;
/** Un écart de luminosité de cette taille, entre deux palettes cochées, se dit. */
export const ECART_DE_LUMINOSITE_DIT = 0.01;

/** Ce que la carte Comparaison dit des palettes cochées, avec le ton qui l'affiche. */
export type ConstatDeComparaison =
  | { readonly ton: 'avertissement'; readonly genre: 'paire'; readonly palettes: readonly [string, string]; readonly role: RoleDeProximite; readonly mode: Mode; readonly sansSortie: boolean }
  | { readonly ton: 'succes'; readonly genre: 'distinctes' }
  | { readonly ton: 'info'; readonly genre: 'saturation'; readonly intensite: Profil; readonly terne: string; readonly vive: string }
  | { readonly ton: 'info'; readonly genre: 'luminosite'; readonly intensite: Profil; readonly palette: string; readonly sens: 'claire' | 'foncee' };

const sansSortieParRecette = new WeakMap<Recette, Map<string, boolean>>();

/** `paletteARegler(...).sansSortie` d'une paire, calculé une fois par recette : il balaie toute la course de la teinte. */
function paireSansSortie(recette: Recette, paire: PaireTropProche): boolean {
  let parPaire = sansSortieParRecette.get(recette);
  if (!parPaire) {
    parPaire = new Map();
    sansSortieParRecette.set(recette, parPaire);
  }
  const cle = paire.palettes.join(' ');
  let sans = parPaire.get(cle);
  if (sans === undefined) {
    sans = paletteARegler(recette, paire.palettes).sansSortie;
    parPaire.set(cle, sans);
  }
  return sans;
}

/**
 * Les constats de la carte Comparaison, dans l'ordre de l'écran : une ligne
 * par paire cochée trop proche, ou « elles se distinguent » quand aucune ne
 * l'est ; puis, parmi les cochées colorées, la saturation et la luminosité de
 * l'intensité vue quand elles s'étalent. Une palette à une intensité y est
 * lue sous `vivid` pour la luminosité et sous `unique` pour la saturation.
 */
export function constatsDeLaComparaison(recette: Recette, etat: EtatHarmonisation, paires: readonly PaireTropProche[]): ConstatDeComparaison[] {
  const cochees = etat.cochees.flatMap((id) => recette.palettes.find((palette) => palette.id === id) ?? []);
  const constats: ConstatDeComparaison[] = [];
  cochees.forEach((a, rang) => {
    for (const b of cochees.slice(rang + 1)) {
      const paire = paires.find(({ palettes }) => palettes.includes(a.id) && palettes.includes(b.id));
      if (paire) constats.push({ ton: 'avertissement', genre: 'paire', palettes: paire.palettes, role: paire.proximite.role, mode: paire.proximite.mode, sansSortie: paireSansSortie(recette, paire) });
    }
  });
  if (constats.length === 0 && cochees.length > 1) constats.push({ ton: 'succes', genre: 'distinctes' });

  const colorees = cochees.filter((palette) => !estLibre(palette) && rgb8VersOklch(referenceDe(palette)).C > CHROMA_DES_PALETTES_COLOREES);
  if (colorees.length < 2) return constats;
  const saturation = (palette: Palette): number => partsDe(recette, palette)[aUneIntensite(palette) ? 'unique' : etat.intensite] ?? 0;
  const luminosite = (palette: Palette): number => palette.reglages?.clarte?.[aUneIntensite(palette) ? 'vivid' : etat.intensite] ?? 0;
  const parSaturation = [...colorees].sort((x, y) => saturation(x) - saturation(y));
  const [terne, vive] = [parSaturation[0], parSaturation[parSaturation.length - 1]];
  if (arrondir(saturation(vive) - saturation(terne), 3) >= ECART_DE_SATURATION_DIT) {
    constats.push({ ton: 'info', genre: 'saturation', intensite: etat.intensite, terne: terne.id, vive: vive.id });
  }
  const parLuminosite = [...colorees].sort((x, y) => luminosite(x) - luminosite(y));
  const [basse, haute] = [parLuminosite[0], parLuminosite[parLuminosite.length - 1]];
  if (arrondir(luminosite(haute) - luminosite(basse), 3) >= ECART_DE_LUMINOSITE_DIT) {
    const claire = luminosite(haute) > 0;
    constats.push({ ton: 'info', genre: 'luminosite', intensite: etat.intensite, palette: (claire ? haute : basse).id, sens: claire ? 'claire' : 'foncee' });
  }
  return constats;
}
