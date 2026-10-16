/** Compare les alias proposés avec les courbes du moteur ; écrit les mesures à côté du script. */
import { writeFileSync } from 'node:fs';
import {
  atteintLeSeuil, boutsDe, contraste, courbesParDefaut, distanceOk, ecrireHexa, fabriquerCran, intensitesDe,
  lireHexa, prereglageTailwind, rampeDe, rampesDe, recetteParDefaut, rgb8VersOklch,
  sensDuTheme, TABLE_DES_DOSSIERS,
  type Mode, type Palette, type Recette, type Rgb8,
} from '../../../../../packages/couleur/src/index';

const base = recetteParDefaut();
const references = ['#1E6FD9', '#2563EB', '#D94635', '#DC2626', '#EAB308', '#FACC15', '#16A34A', '#9333EA', '#06B6D4', '#737373', '#808080', '#8B8178', '#F5F5F5', '#171717'];
const options: { nom: string; carte: number; page?: string; surfaces: number[]; texte: number; focus?: number }[] = [
  { nom: 'actuel', carte: 100, surfaces: [100, 200, 300], texte: 800 },
  { nom: 'raised-50', carte: 50, surfaces: [100, 200, 300], texte: 800 },
  { nom: 'raised-200', carte: 200, surfaces: [100, 200, 300], texte: 800 },
  { nom: 'surface-200-texte-800', carte: 100, surfaces: [200, 300, 400], texte: 800 },
  { nom: 'surface-200-texte-900', carte: 100, surfaces: [200, 300, 400], texte: 900 },
  { nom: 'elevation-independante', carte: 50, page: '#000000', surfaces: [100, 200, 300], texte: 800 },
  { nom: 'elevation-page-noire-raised-200', carte: 200, page: '#000000', surfaces: [100, 200, 300], texte: 800 },
  { nom: 'elevation-page-noire-raised-300', carte: 300, page: '#000000', surfaces: [100, 200, 300], texte: 800 },
  { nom: 'systeme-sombre-separe', carte: 100, page: '#000000', surfaces: [200, 300, 400], texte: 950, focus: 800 },
];

type Mesure = { minimum: number; cas: string; echecs: number; total: number; seuil: number | null };
const resultats = [];
for (const mode of ['light', 'dark'] as const) {
  for (const inverse of [false, true]) {
    const texteDesBoutons = { ...base.texteDesBoutons, [mode]: mode === 'light' ? (inverse ? 'noir' : 'blanc') : (inverse ? 'blanc' : 'noir') } as Recette['texteDesBoutons'];
    const recette = { ...base, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons) };
    const table = TABLE_DES_DOSSIERS[sensDuTheme(mode, texteDesBoutons[mode])];
    const gris = (n: number) => fabriquerCran(recette.courbes[mode][base.crans.indexOf(n)], 0, 0, 'srgb');
    for (const option of options) {
      const page = lireHexa(mode === 'dark' ? (option.page ?? base.fonds[mode]) : base.fonds[mode])!;
      const carte = mode === 'dark' ? gris(option.carte).couleur : lireHexa('#FFFFFF')!;
      const surfaces = mode === 'dark' ? option.surfaces : [100, 200, 300];
      const texte = mode === 'dark'
        ? (option.nom === 'systeme-sombre-separe' ? option.texte : inverse ? 900 : option.texte)
        : table['surface/foreground'];
      const focus = mode === 'dark' ? (option.focus ?? table['page/focus']) : table['page/focus'];
      const groupes: Record<string, Record<string, Mesure>> = { balayage: {}, references: {} };
      const juger = (groupe: string, nom: string, ratio: number, cas: string, seuil: number | null) => {
        const mesure = groupes[groupe][nom] ??= { minimum: Infinity, cas: '', echecs: 0, total: 0, seuil };
        mesure.total += 1;
        if (seuil !== null && !atteintLeSeuil(ratio, seuil)) mesure.echecs += 1;
        if (ratio < mesure.minimum) { mesure.minimum = ratio; mesure.cas = cas; }
      };
      const mesurer = (groupe: string, cas: string, c: (n: number) => Rgb8) => {
        for (const [support, fond] of [['page', page], ['carte', carte]] as const) {
          for (const [variable, seuil] of [['solid/default', 3], ['page/foreground', 4.5], ['page/border', 3], ['page/focus', 3]] as const) {
            const cran = variable === 'page/focus' ? focus : table[variable];
            juger(groupe, `${variable}/${support}`, contraste(c(cran), fond), cas, seuil);
          }
          juger(groupe, `surface/foreground/${support}`, contraste(c(texte), fond), cas, 4.5);
          juger(groupe, `surface/default/${support}`, contraste(c(surfaces[0]), fond), cas, null);
          juger(groupe, `distance-surface/${support}`, distanceOk(c(surfaces[0]), fond), cas, null);
        }
        for (const [i, n] of surfaces.entries()) {
          juger(groupe, `surface/foreground/etat-${i}`, contraste(c(texte), c(n)), cas, 4.5);
          juger(groupe, `surface/border/etat-${i}`, contraste(c(texte), c(n)), cas, 3);
        }
        juger(groupe, 'page/focus/surface-default', contraste(c(focus), c(surfaces[0])), cas, 3);
        juger(groupe, 'distance-default-hover', distanceOk(c(surfaces[0]), c(surfaces[1])), cas, null);
        juger(groupe, 'distance-hover-pressed', distanceOk(c(surfaces[1]), c(surfaces[2])), cas, null);
      };
      // Le balayage emploie la chroma entière du profil, sans ancrage ni atténuation des fonds sombres.
      for (const part of [0, 0.45, 0.95]) {
        for (let h = 0; h < (part === 0 ? 1 : 360); h += 1) {
          const couleurs = base.crans.map((_, i) => fabriquerCran(recette.courbes[mode][i], h, part, 'srgb').couleur);
          mesurer('balayage', `part=${part}, h=${h}`, (n) => couleurs[base.crans.indexOf(n)]);
        }
      }
      for (const [i, reference] of references.entries()) {
        const derive = { ...prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette)), origine: 'tailwind' as const };
        for (const intensites of [1, 2] as const) {
          const palette: Palette = { id: `p-${String(i).padStart(8, '0')}`, reference, intensites, derive: { lien: true, soft: derive, vivid: derive } };
          const rampes = rampesDe(recette, palette);
          for (const profil of intensitesDe(palette)) {
            const couleurs = rampeDe(rampes, profil)[mode];
            mesurer('references', `${reference}/${profil}`, (n) => couleurs[base.crans.indexOf(n)].couleur);
          }
        }
      }
      resultats.push({ mode, inverse, option: option.nom, neutre: {
        page: ecrireHexa(page), carte: mode === 'dark' ? gris(option.carte).hexa : '#FFFFFF',
        surfaces: surfaces.map((n) => gris(n).hexa), texte: gris(texte).hexa,
        cartePage: contraste(carte, page), surfaceCarte: contraste(gris(surfaces[0]).couleur, carte),
        distanceSurfaceCarte: distanceOk(gris(surfaces[0]).couleur, carte),
        textePressed: contraste(gris(texte).couleur, gris(surfaces[2]).couleur),
        focusSurface: contraste(gris(focus).couleur, gris(surfaces[0]).couleur),
      }, groupes });
    }
  }
}
writeFileSync(new URL('./MESURES-ELEVATION.json', import.meta.url), `${JSON.stringify({ references, options, resultats }, null, 2)}\n`);
writeFileSync(new URL('./donnees-elevation.js', import.meta.url), `window.MESURES_ELEVATION = ${JSON.stringify(resultats.map(({ mode, inverse, option, neutre }) => ({ mode, inverse, option, ...neutre })), null, 2)};\n`);
process.stdout.write('Mesures écrites dans MESURES-ELEVATION.json.\n');
