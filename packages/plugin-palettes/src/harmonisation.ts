/** La sélection d'Harmonisation suit les identifiants de la recette, sans DOM ni rangement. */
import { sortieLaPlusProche, type Mode, type Palette, type PaireTropProche, type Profil, type Recette } from 'ucm-couleur';

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
