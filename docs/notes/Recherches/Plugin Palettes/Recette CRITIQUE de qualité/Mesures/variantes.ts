/**
 * Les variantes comparées : le moteur actuel sur la recette du mainteneur et
 * sur ses réglages communs, puis trois règles de chroma sur les réglages
 * communs. Partagé par le générateur des maquettes et la vérification des
 * garanties.
 */
import { readFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { rampesDe } from '../../../../../../packages/couleur/src/palette';
import { validerRecette, type Palette, type Recette } from '../../../../../../packages/couleur/src/recette';
import type { Cran, Intensite, Mode } from '../../../../../../packages/couleur/src/rampe';
import {
  deuxZones, enveloppeAvecJaunes, enveloppesParTheme, rampesDuBanc, recetteAuxReglagesCommuns, releveTailwind, type RampeRelevee, type RegleDeChroma,
} from './prototype';

export const lire = (chemin: string) => JSON.parse(readFileSync(new URL(chemin, import.meta.url), 'utf8'));
export const valider = (brute: unknown): Recette => {
  const v = validerRecette(brute);
  if ('refus' in v) throw new Error(JSON.stringify(v.refus));
  return v.recette;
};

export const RECETTE_REELLE = valider(lire('./references/recette-mainteneur.json'));
export const RECETTE_COMMUNE = valider(recetteAuxReglagesCommuns(RECETTE_REELLE));
/** Les réglages communs, parts communes portées au préréglage de l'enveloppe : le moteur calcule les parts de chaque palette. */
export const RECETTE_ENVELOPPE = valider({ ...RECETTE_COMMUNE, profils: { soft: { part: 0.85 }, vivid: { part: 0.95 } } });
const BORNES_LIGHT = { soft: { p0: 0.85, a: 0.6, b: 0.38 }, vivid: { p0: 0.95, a: 1.1, b: 0.48 }, unique: { p0: 0.95, a: 1.1, b: 0.48 } };
// En Dark, les crans clairs sont des textes : la borne vers le blanc de Soft s'ouvre comme celle de Vivid.
export const REGLE_ENVELOPPE = enveloppesParTheme({ light: BORNES_LIGHT, dark: { ...BORNES_LIGHT, soft: { p0: 0.85, a: 1.1, b: 0.38 } } });
/**
 * La règle retenue au banc visuel : l'enveloppe par thème, une marge pour les jaunes clairs
 * (+100 % en Soft, +50 % en Vivid) et une borne de 0,30 pour les fonds Dark de Vivid.
 */
export const REGLE_FINALE = enveloppeAvecJaunes(
  { light: BORNES_LIGHT, dark: { soft: { p0: 0.85, a: 1.1, b: 0.38 }, vivid: { p0: 0.95, a: 1.1, b: 0.3 }, unique: { p0: 0.95, a: 1.1, b: 0.3 } } },
  { soft: 1, vivid: 0.5, unique: 0.5 },
);
export const UTILITAIRES = ['Poppy', 'Orange', 'Grass', 'Sky'] as const;

const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const tailwind = lire('./references/tailwind-3.4.17.json') as Record<string, Record<string, string>>;
export const RELEVE: RampeRelevee[] = Object.entries(tailwind).filter(([nom]) => !NEUTRES.has(nom)).map(([nom, crans]) => ({
  nom,
  points: Object.values(crans).map((hexa) => {
    const o = rgb8VersOklch(lireHexa(hexa)!);
    return { L: o.L, H: o.H, part: o.C / plafond(o.L, o.H, 'srgb') };
  }),
}));

type Rampes = Partial<Record<Intensite, Record<Mode, Cran[]>>>;
export interface Variante {
  id: string;
  nom: string;
  resume: string;
  rampes: (palette: Palette) => Rampes;
}

const banc = (regle: RegleDeChroma, parts: { soft: number; vivid: number }) => (palette: Palette) =>
  rampesDuBanc(RECETTE_COMMUNE, RECETTE_COMMUNE.palettes.find((p) => p.id === palette.id)!, regle, { parts });

export const VARIANTES: Variante[] = [
  {
    id: 'actuel',
    nom: 'Actuel',
    resume: 'Le moteur et la recette du mainteneur, réglages propres compris.',
    rampes: (palette) => rampesDe(RECETTE_REELLE, palette),
  },
  {
    id: 'communs',
    nom: 'Actuel, réglages communs',
    resume: 'Le moteur actuel ; chaque palette perd ses parts, sa luminosité et son Color shift de luminosité. Soft 0,45, Vivid 0,95.',
    rampes: (palette) => rampesDe(RECETTE_COMMUNE, RECETTE_COMMUNE.palettes.find((p) => p.id === palette.id)!),
  },
  {
    id: 'zones',
    nom: 'Deux zones',
    resume: 'Une part pour les fonds, une pour les accents. Soft 0,45 · 0,85 ; Vivid 0,75 · 0,95.',
    rampes: banc(deuxZones({ soft: { fonds: 0.45, accents: 0.85 }, vivid: { fonds: 0.75, accents: 0.95 }, unique: { fonds: 0.6, accents: 0.9 } }), { soft: 0.85, vivid: 0.95 }),
  },
  {
    id: 'enveloppe',
    nom: 'Enveloppe',
    resume: 'La part donne la chroma ; une borne qui ne dépend que de la clarté la plafonne, élargie pour les jaunes clairs (+100 % en Soft, +50 % en Vivid). Parts communes Soft 0,85 et Vivid 0,95 ; bornes a 0,6 et 1,1 en Light, 1,1 en Dark ; fonds Dark de Vivid bornés à 0,30.',
    rampes: (palette) => rampesDuBanc(RECETTE_ENVELOPPE, RECETTE_ENVELOPPE.palettes.find((p) => p.id === palette.id)!, REGLE_FINALE),
  },
  {
    id: 'tailwind',
    nom: 'Relevé Tailwind',
    resume: 'La part de chaque cran suit celle que Tailwind emploie à cette clarté et cette teinte. Soft : fonds 0,5 · accents 0,9 ; Vivid : 1 · 1.',
    rampes: banc(releveTailwind(RELEVE, { soft: { fonds: 0.5, accents: 0.9 }, vivid: { fonds: 1, accents: 1 }, unique: { fonds: 0.7, accents: 0.95 } }), { soft: 0.9, vivid: 1 }),
  },
];

export const paletteNommee = (recette: Recette, nom: string) => recette.palettes.find((p) => p.nom === nom)!;
