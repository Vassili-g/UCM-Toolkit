/** La sélection d'Harmonisation suit les identifiants de la recette, sans DOM ni rangement. */
import type { Mode, Palette, Profil, Recette } from 'ucm-couleur';

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
