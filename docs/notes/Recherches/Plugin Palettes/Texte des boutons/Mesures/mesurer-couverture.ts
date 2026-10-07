/**
 * La courbe du thème inversé tient-elle pour n'importe quelle couleur ? Le
 * script balaie un large échantillon de références (teinte, chroma, clarté),
 * calcule leurs rampes Vivid avec le préréglage Tailwind, et mesure le texte
 * des boutons, blanc ou noir purs, sur les trois états du bouton dans les
 * quatre thèmes. La nuance où la référence est ancrée se compte à part : son
 * échec est signalé par le plugin (décision 3 du dossier).
 *
 * Depuis la racine du dépôt :
 * npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/Mesures/mesurer-couverture.ts"
 */
import { writeFileSync } from 'node:fs';

import {
  ancrageDe,
  boutsDe,

  fabriquerCran,
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

/** Les courbes du thème inversé retenues. */
const COURBES_INVERSEES: Record<Mode, number[]> = {
  light: avec(base.courbes.light, { 500: 0.71, 600: 0.66, 700: 0.58 }),
  dark: avec(base.courbes.dark, { 500: 0.45, 600: 0.5, 700: 0.55, 800: 0.7 }),
};

const BLANC = '#FFFFFF';
const NOIR = '#000000';

function luminance(hexa: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hexa.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

function paletteDe(recette: Recette, reference: string): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const rangee = { ...derive, origine: 'tailwind' as const };
  return { id: 'p-00000001', reference, derive: { lien: true, soft: rangee, vivid: rangee } };
}

/** L'échantillon : teintes tous les 5°, quatre chromas relatives, trois clartés, dans le gamut sRGB. */
const references = new Set<string>();
for (let H = 0; H < 360; H += 5) {
  for (const part of [0.25, 0.5, 0.75, 1]) {
    for (const L of [0.5, 0.6, 0.7]) references.add(fabriquerCran(L, H, part, 'srgb').hexa.toUpperCase());
  }
}

const CAS = [
  { nom: 'Light, texte blanc', mode: 'light' as Mode, inverse: false, texte: BLANC, etats: [700, 800, 900] },
  { nom: 'Dark, texte noir', mode: 'dark' as Mode, inverse: false, texte: NOIR, etats: [700, 800, 900] },
  { nom: 'Light inversé, texte noir', mode: 'light' as Mode, inverse: true, texte: NOIR, etats: [700, 600, 500] },
  { nom: 'Dark inversé, texte blanc', mode: 'dark' as Mode, inverse: true, texte: BLANC, etats: [700, 600, 500] },
];

const resultats = CAS.map((cas) => {
  const recette: Recette = cas.inverse ? { ...base, courbes: { ...base.courbes, [cas.mode]: COURBES_INVERSEES[cas.mode] } } : base;
  let mesures = 0;
  let pire = Infinity;
  const echecs: { reference: string; cran: number; hexa: string; ratio: number }[] = [];
  let echecsAncres = 0;
  for (const reference of references) {
    const palette = paletteDe(recette, reference);
    const rampe = rampeDe(rampesDe(recette, palette), 'vivid')[cas.mode];
    const ancrage = ancrageDe(recette, palette);
    for (const cran of cas.etats) {
      const rang = base.crans.indexOf(cran);
      const r = ratio(cas.texte, rampe[rang].hexa);
      const ancre = ancrage.profil === 'vivid' && ancrage.rangs[cas.mode] === rang;
      if (ancre) {
        if (r < 4.5) echecsAncres += 1;
        continue;
      }
      mesures += 1;
      pire = Math.min(pire, r);
      if (r < 4.5) echecs.push({ reference, cran, hexa: rampe[rang].hexa, ratio: Math.round(r * 100) / 100 });
    }
  }
  echecs.sort((a, b) => a.ratio - b.ratio);
  return { cas: cas.nom, references: references.size, mesures, echecs: echecs.length, pire: Math.round(pire * 100) / 100, echecsAncres, pires: echecs.slice(0, 12) };
});

for (const r of resultats) console.log(`${r.cas} : ${r.echecs} échecs sur ${r.mesures} hors ancrage, pire ${r.pire}:1 ; ${r.echecsAncres} échecs sur la nuance ancrée`);
writeFileSync(new URL('./MESURES-COUVERTURE.json', import.meta.url), `${JSON.stringify({ courbes: COURBES_INVERSEES, resultats }, null, 2)}\n`);
