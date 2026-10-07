/**
 * Données de TEXTE-DES-BOUTONS.html : les rampes du moteur pour six palettes,
 * avec la courbe actuelle et la courbe du thème inversé de chaque thème. La
 * page ne calcule aucune rampe ; elle lit ce bloc.
 *
 * Depuis la racine du dépôt :
 * npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/Mesures/generer-texte-des-boutons.ts"
 */
import { readFileSync, writeFileSync } from 'node:fs';

import {
  ancrageDe,
  boutsDe,
  lireHexa,
  prereglageTailwind,
  rampeDe,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
  type Mode,
  type Palette,
  type Recette,
} from '../../../../../../packages/couleur/src/index';

const base = recetteParDefaut();
const avec = (courbe: readonly number[], valeurs: Record<number, number>) => courbe.map((L, i) => valeurs[base.crans[i]] ?? L);

/** Les courbes du thème inversé, celles de MESURES-COURBE-DU-TEXTE.json. */
const COURBES_INVERSEES: Record<Mode, number[]> = {
  light: avec(base.courbes.light, { 500: 0.71, 600: 0.66, 700: 0.58 }),
  dark: avec(base.courbes.dark, { 500: 0.45, 600: 0.5, 700: 0.55, 800: 0.7 }),
};

const PALETTES = [
  ['#2563EB', 'Bleu'],
  ['#9333EA', 'Violet'],
  ['#16A34A', 'Vert'],
  ['#EAB308', 'Jaune'],
  ['#D94635', 'Rouge'],
  ['#737373', 'Gris'],
] as const;

function paletteDe(recette: Recette, reference: string): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const rangee = { ...derive, origine: 'tailwind' as const };
  return { id: 'p-00000001', reference, derive: { lien: true, soft: rangee, vivid: rangee } };
}

/** Les rampes d'un thème, sous la courbe actuelle ou inversée, et la nuance ancrée. */
function rampes(reference: string, mode: Mode, inverse: boolean) {
  const recette: Recette = inverse ? { ...base, courbes: { ...base.courbes, [mode]: COURBES_INVERSEES[mode] } } : base;
  const palette = paletteDe(recette, reference);
  const calculees = rampesDe(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  return {
    soft: rampeDe(calculees, 'soft')[mode].map((cran) => cran.hexa),
    vivid: rampeDe(calculees, 'vivid')[mode].map((cran) => cran.hexa),
    ancre: { profil: ancrage.profil, cran: ancrage.crans[mode] },
  };
}

const donnees = {
  crans: base.crans,
  fonds: base.fonds,
  courbes: { actuelles: base.courbes, inversees: COURBES_INVERSEES },
  palettes: PALETTES.map(([reference, nom]) => ({
    reference,
    nom,
    light: { actuelle: rampes(reference, 'light', false), inversee: rampes(reference, 'light', true) },
    dark: { actuelle: rampes(reference, 'dark', false), inversee: rampes(reference, 'dark', true) },
  })),
};

const maquette = new URL('../TEXTE-DES-BOUTONS.html', import.meta.url);
const html = readFileSync(maquette, 'utf8');
const motif = /(<script id="donnees" type="application\/json">)[\s\S]*?(<\/script>)/;
if (!motif.test(html)) throw new Error('Bloc de données introuvable dans la page.');
writeFileSync(maquette, html.replace(motif, (_tout, ouverture: string, fermeture: string) => `${ouverture}${JSON.stringify(donnees)}${fermeture}`));
console.log(`${donnees.palettes.length} palettes écrites dans la page.`);
