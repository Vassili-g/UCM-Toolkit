/**
 * L'alerte « palettes trop proches » si elle comparait les fonds teintés au lieu du texte posé dessus :
 * combien de paires chaque jeu de couleurs signale, au seuil de la recette (0,05), sur les dix-sept
 * familles Tailwind 3.4 prises à leur 500 et sur les vingt palettes de la galerie.
 *
 * `npx tsx mesurer-paires.ts > ../MESURES-PAIRES.json`
 */
import { cranDeLaVariable, sensDuTheme } from '@ucm-kit/core/emplois';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Mode, Palette, Recette } from '../../../../../../packages/couleur/src/index';
import { nouvellePalette } from '../../../../../../packages/plugin-palettes/src/edition';

const TAILWIND: [string, string][] = [
  ['red', '#ef4444'], ['orange', '#f97316'], ['amber', '#f59e0b'], ['yellow', '#eab308'], ['lime', '#84cc16'],
  ['green', '#22c55e'], ['emerald', '#10b981'], ['teal', '#14b8a6'], ['cyan', '#06b6d4'], ['sky', '#0ea5e9'],
  ['blue', '#3b82f6'], ['indigo', '#6366f1'], ['violet', '#8b5cf6'], ['purple', '#a855f7'], ['fuchsia', '#d946ef'],
  ['pink', '#ec4899'], ['rose', '#f43f5e'],
];
const GALERIE: [string, string][] = [
  ['Bleu', '#1E6FD9'], ['Jaune', '#FACC15'], ['Rouge', '#D94635'], ['Violet', '#7C3AED'], ['Cyan', '#0891B2'],
  ['Ardoise', '#6B7280'], ['Rose', '#DB2777'], ['Indigo', '#4F46E5'], ['Lime', '#65A30D'], ['Teal', '#0D9488'],
  ['Fuchsia', '#C026D3'], ['Pourpre', '#9333EA'], ['Sable', '#A8A29E'], ['Marine', '#1E3A8A'], ['Cuivre', '#B25E34'],
  ['Moutarde', '#B2B234'], ['Sapin', '#34B25E'], ['Grenat', '#B23488'], ['Brume', '#94A3B8'], ['Mauve', '#897288'],
];

const MESURES = [
  { cle: 'pleinLight', variable: 'solid/default', mode: 'light' },
  { cle: 'pleinDark', variable: 'solid/default', mode: 'dark' },
  { cle: 'texteLight', variable: 'surface/foreground', mode: 'light' },
  { cle: 'fondLight', variable: 'surface/default', mode: 'light' },
  { cle: 'fondDark', variable: 'surface/default', mode: 'dark' },
  { cle: 'survolLight', variable: 'surface/hover', mode: 'light' },
  { cle: 'survolDark', variable: 'surface/hover', mode: 'dark' },
] as const;
type Cle = (typeof MESURES)[number]['cle'];

const REGLES: Record<string, readonly Cle[]> = {
  aujourdhui: ['pleinLight', 'pleinDark', 'texteLight'],
  pleinsSeuls: ['pleinLight', 'pleinDark'],
  pleinsEtFonds: ['pleinLight', 'pleinDark', 'fondLight', 'fondDark'],
  fondsSeuls: ['fondLight', 'fondDark'],
};

function couleurs(recette: Recette, palette: Palette): Record<Cle, M.Rgb8> | null {
  if (!M.nuancesDeProximite(recette, palette)) return null;
  const rampes = M.rampesDe(recette, palette);
  const { crans } = M.grilleDe(recette, palette);
  const rampe = M.rampeDe(rampes, M.aUneIntensite(palette) ? 'unique' : 'vivid');
  const sortie = {} as Record<Cle, M.Rgb8>;
  for (const { cle, variable, mode } of MESURES) {
    const cran = cranDeLaVariable(variable, mode as Mode, sensDuTheme(mode as Mode, recette.texteDesBoutons[mode as Mode]));
    const rang = typeof cran === 'number' ? crans.indexOf(cran) : -1;
    if (rang < 0) return null;
    sortie[cle] = rampe[mode as Mode][rang].couleur;
  }
  return sortie;
}

function jeu(nom: string, references: [string, string][]) {
  let recette = M.recetteParDefaut();
  const palettes = references.map(([n, hexa], rang) => ({ ...nouvellePalette(recette, `p${rang}`, hexa, 2)!, nom: n }));
  recette = { ...recette, palettes };
  const seuil = recette.seuils.palettesProches;
  const lues = palettes.map((palette) => ({ nom: palette.nom as string, couleurs: couleurs(recette, palette) }));
  const paires: { a: string; b: string; distances: Record<Cle, number>; hexas: Record<string, [string, string]> }[] = [];
  lues.forEach((a, i) => lues.slice(i + 1).forEach((b) => {
    if (!a.couleurs || !b.couleurs) return;
    const distances = Object.fromEntries(MESURES.map(({ cle }) => [cle, +M.distanceOk(a.couleurs![cle], b.couleurs![cle]).toFixed(4)])) as Record<Cle, number>;
    const hexa = (cle: Cle, c: Record<Cle, M.Rgb8>) => M.ecrireHexa(c[cle]);
    const hexas = Object.fromEntries((['fondLight', 'fondDark', 'texteLight', 'pleinLight'] as const).map((cle) => [cle, [hexa(cle, a.couleurs!), hexa(cle, b.couleurs!)]]));
    paires.push({ a: a.nom, b: b.nom, distances, hexas });
  }));
  const parRegle = Object.fromEntries(Object.entries(REGLES).map(([regle, cles]) => {
    const signalees = paires.filter((p) => Math.min(...cles.map((c) => p.distances[c])) < seuil)
      .map((p) => { const c = cles.reduce((x, y) => (p.distances[x] <= p.distances[y] ? x : y)); return `${p.a}–${p.b} (${c} ${p.distances[c]})`; });
    return [regle, { nombre: signalees.length, signalees }];
  }));
  // Le seuil qui rendrait sur les fonds autant de paires que les pleins seuls.
  const quantiles = (cle: Cle) => paires.map((p) => p.distances[cle]).sort((x, y) => x - y).slice(0, 12);
  // Les pleins au seuil de la recette, les fonds à un seuil propre : combien de paires chaque seuil de fonds ajoute.
  const seuilsDesFonds = Object.fromEntries([0.008, 0.01, 0.012, 0.015, 0.02].map((s) => {
    const signalees = paires.filter((p) => Math.min(p.distances.pleinLight, p.distances.pleinDark) < seuil || Math.min(p.distances.fondLight, p.distances.fondDark) < s);
    const parFonds = signalees.filter((p) => Math.min(p.distances.pleinLight, p.distances.pleinDark) >= seuil);
    return [s, { nombre: signalees.length, ajouteesParLesFonds: parFonds.map((p) => `${p.a}–${p.b} (${p.distances.fondLight <= p.distances.fondDark ? 'fondLight ' + p.distances.fondLight : 'fondDark ' + p.distances.fondDark})`) }];
  }));
  // Les paires dont un fond tombe sous 0,025 : la maquette les montre côte à côte pour juger le seuil à l'œil.
  const fondsProches = paires.filter((p) => Math.min(p.distances.fondLight, p.distances.fondDark) < 0.025)
    .map(({ a, b, distances: d, hexas }) => ({ a, b, fondLight: d.fondLight, fondDark: d.fondDark, plein: Math.min(d.pleinLight, d.pleinDark), hexas }))
    .sort((x, y) => Math.min(x.fondLight, x.fondDark) - Math.min(y.fondLight, y.fondDark));
  return { nom, fondsProches, comparees: lues.filter((l) => l.couleurs).length, paires: paires.length, seuil, parRegle, seuilsDesFonds, plusPetites: { pleinLight: quantiles('pleinLight'), fondLight: quantiles('fondLight'), fondDark: quantiles('fondDark'), survolLight: quantiles('survolLight') } };
}

console.log(JSON.stringify({ tailwind: jeu('Tailwind 3.4, 500', TAILWIND), galerie: jeu('Galerie, vingt palettes', GALERIE) }, null, 2));
