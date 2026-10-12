/** Mesure l'export fourni et des changements d'alias simulés ; le fichier source reste intact. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { indexerTokensDtcg } from '../../../../../packages/kit/src/lecteurs/tokens-dtcg.mjs';
import { atteintLeSeuil, contraste, distanceOk, ecrireHexa, type Rgb8 } from '../../../../../packages/couleur/src/index';

const source = readFileSync(new URL('./tokens-source.json', import.meta.url), 'utf8');
const tokens = JSON.parse(source);
const index = indexerTokensDtcg(tokens);
const palettes = [...index.keys()].filter((p) => /^theme\..+\.surface\.default$/.test(p)).map((p) => p.slice(0, -'.surface.default'.length));
const options = [
  'actuel', 'raised-50', 'raised-200', 'neutre-200', 'toutes-surfaces-200',
  'elevation-independante', 'elevation-page-noire-raised-200', 'elevation-page-noire-raised-300',
  'systeme-sombre-separe',
] as const;
type Option = typeof options[number];
type Contexte = { theme: string; 'color-brands': string };
type Paire = { nom: string; ratio: number; seuil: number; tenue: boolean };

function valeur(chemin: string, contexte: Contexte, option: Option, vus = new Set<string>()): Rgb8 {
  if (vus.has(chemin)) throw new Error(`Cycle : ${chemin}`);
  vus.add(chemin);
  const feuille = index.get(chemin);
  if (!feuille) throw new Error(`Token absent : ${chemin}`);
  const ext = feuille.$extensions ?? {};
  const mode = contexte[ext['com.ucm.axis'] as keyof Contexte];
  let lue = ext['com.ucm.modes']?.[mode] ?? feuille.$value;
  if (contexte.theme === 'dark') {
    if (option === 'systeme-sombre-separe' && chemin === 'theme.elevation.page') {
      lue = '{primitives.colors.titanium.black}';
    }
    if (option === 'systeme-sombre-separe' && chemin === 'theme.elevation.raised') {
      lue = '{color-utilities.neutral.dark.100}';
    }
    if (option.startsWith('elevation-page-noire-') && chemin === 'theme.elevation.page') {
      lue = '{primitives.colors.titanium.black}';
    }
    if (option.startsWith('elevation-page-noire-raised-') && chemin === 'theme.elevation.raised') {
      lue = `{color-utilities.neutral.dark.${option.endsWith('200') ? '200' : '300'}}`;
    }
    if (option === 'elevation-independante' && chemin === 'theme.elevation.page') {
      lue = '{primitives.colors.titanium.black}';
    }
    if (option === 'elevation-independante' && chemin === 'theme.elevation.raised') {
      lue = '{color-utilities.neutral.dark.50}';
    }
    if (chemin === 'theme.elevation.raised' && option.startsWith('raised-')) {
      lue = `{color-utilities.neutral.dark.${option.slice('raised-'.length)}}`;
    }
    const surface = /^theme\.(.+)\.surface\.(default|hover|pressed|foreground|border)$/.exec(chemin);
    if (surface && option === 'systeme-sombre-separe') {
      const cran = { default: 200, hover: 300, pressed: 400, foreground: 950, border: 950 }[surface[2]];
      if (typeof lue !== 'string' || !/\.\d+\}$/.test(lue)) throw new Error(`Alias de surface inattendu : ${chemin}`);
      lue = lue.replace(/\.\d+\}$/, `.${cran}}`);
    }
    if (chemin.startsWith('theme.') && chemin.endsWith('.page.focus') && option === 'systeme-sombre-separe') {
      if (typeof lue !== 'string' || !/\.\d+\}$/.test(lue)) throw new Error(`Alias de focus inattendu : ${chemin}`);
      lue = lue.replace(/\.\d+\}$/, '.800}');
    }
    if (surface && (option === 'toutes-surfaces-200' || (option === 'neutre-200' && surface[1] === 'neutral'))) {
      const cran = { default: 200, hover: 300, pressed: 400, foreground: 900, border: 900 }[surface[2]];
      if (typeof lue !== 'string' || !/\.\d+\}$/.test(lue)) throw new Error(`Alias de surface inattendu : ${chemin}`);
      lue = lue.replace(/\.\d+\}$/, `.${cran}}`);
    }
  }
  if (typeof lue === 'string' && /^\{.+\}$/.test(lue)) return valeur(lue.slice(1, -1), contexte, option, vus);
  if (lue?.colorSpace !== 'srgb' || lue.alpha !== 1 || lue.components.length !== 3) throw new Error(`Couleur opaque sRGB attendue : ${chemin}`);
  return lue.components.map((x: number) => Math.round(x * 255)) as Rgb8;
}

const resultats = [];
const vues = [];
for (const marque of tokens.$extensions['com.ucm.axes']['color-brands'].modes) {
  for (const theme of tokens.$extensions['com.ucm.axes'].theme.modes) {
    const contexte = { theme, 'color-brands': marque };
    for (const option of options) {
      const c = (p: string) => valeur(p, contexte, option);
      const page = c('theme.elevation.page');
      const carte = c('theme.elevation.raised');
      for (const palette of palettes) {
        const paires: Paire[] = [];
        const mesurer = (nom: string, a: Rgb8, b: Rgb8, seuil: number) => {
          const ratio = contraste(a, b);
          paires.push({ nom, ratio, seuil, tenue: atteintLeSeuil(ratio, seuil) });
        };
        for (const etat of ['default', 'hover', 'pressed']) {
          mesurer(`G1/${etat}`, c(`${palette}.solid.foreground`), c(`${palette}.solid.${etat}`), 4.5);
          mesurer(`G3/${etat}`, c(`${palette}.surface.foreground`), c(`${palette}.surface.${etat}`), 4.5);
          mesurer(`G4/${etat}`, c(`${palette}.surface.border`), c(`${palette}.surface.${etat}`), 3);
        }
        for (const [support, fond] of [['page', page], ['carte', carte]] as const) {
          mesurer(`G2/${support}`, c(`${palette}.solid.default`), fond, 3);
          mesurer(`G3/${support}`, c(`${palette}.surface.foreground`), fond, 4.5);
          mesurer(`G4/${support}`, c(`${palette}.surface.border`), fond, 3);
          const texte = palette === 'theme.neutral' ? 'foreground-subtle' : 'foreground';
          mesurer(`G5/${support}`, c(`${palette}.page.${texte}`), fond, 4.5);
          mesurer(`G6/${support}`, c(`${palette}.page.border`), fond, 3);
          mesurer(`G7/${support}`, c(`${palette}.page.focus`), fond, 3);
        }
        mesurer('G7/surface-default', c(`${palette}.page.focus`), c(`${palette}.surface.default`), 3);
        resultats.push({ marque, theme, option, palette, paires,
          fondCarte: contraste(c(`${palette}.surface.default`), carte),
          distanceFondCarte: distanceOk(c(`${palette}.surface.default`), carte),
        });
      }
      vues.push({ marque, mode: theme, option,
        page: ecrireHexa(page), carte: ecrireHexa(carte),
        surfaces: ['default', 'hover', 'pressed'].map((etat) => ecrireHexa(c(`theme.neutral.surface.${etat}`))),
        texte: ecrireHexa(c('theme.neutral.surface.foreground')),
        focus: ecrireHexa(c('theme.neutral.page.focus')),
        cartePage: contraste(carte, page), surfaceCarte: contraste(c('theme.neutral.surface.default'), carte),
        distanceSurfaceCarte: distanceOk(c('theme.neutral.surface.default'), carte),
        textePressed: contraste(c('theme.neutral.surface.foreground'), c('theme.neutral.surface.pressed')),
        focusSurface: contraste(c('theme.neutral.page.focus'), c('theme.neutral.surface.default')),
      });
    }
  }
}
const bilan = options.map((option) => {
  const lignes = resultats.filter((r) => r.option === option);
  const echecs = lignes.flatMap((r) => r.paires.filter((p) => !p.tenue).map((p) => ({ marque: r.marque, theme: r.theme, palette: r.palette, ...p })));
  const nouveaux = echecs.filter((e) => resultats.find((r) => r.option === 'actuel' && r.marque === e.marque && r.theme === e.theme && r.palette === e.palette)!.paires.find((p) => p.nom === e.nom)!.tenue);
  return { option, paires: lignes.reduce((s, r) => s + r.paires.length, 0), echecs, nouveaux };
});
const provenance = { fichier: 'tokens-source.json', sha256: createHash('sha256').update(source).digest('hex'), axes: tokens.$extensions['com.ucm.axes'], palettes };
writeFileSync(new URL('./MESURES-TOKENS-REELS.json', import.meta.url), `${JSON.stringify({ provenance, bilan, vues, resultats }, null, 2)}\n`);
writeFileSync(new URL('./donnees-tokens-reels.js', import.meta.url), `window.TOKENS_REELS = ${JSON.stringify({ provenance, bilan: bilan.map(({ option, paires, echecs, nouveaux }) => ({ option, paires, echecs: echecs.length, nouveaux: nouveaux.length })), vues }, null, 2)};\n`);
process.stdout.write(`${JSON.stringify(bilan.map(({ option, paires, echecs, nouveaux }) => ({ option, paires, echecs: echecs.length, nouveaux: nouveaux.length })), null, 2)}\n`);
