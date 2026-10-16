/**
 * La retenue par teinte : Tailwind et Radix n'emploient pas la même part du
 * plafond sRGB sur tout le cercle. Ils retiennent la chroma des verts clairs
 * (du lime au turquoise) et des bleus foncés, et gardent les jaunes clairs
 * presque au plafond. Ce script cale une retenue lisse, fonction de la teinte
 * et de la clarté, sur les rampes de Tailwind, puis compare les règles de
 * chroma candidates aux deux références, famille par famille.
 *
 * `npx tsx caler-retenue.ts` écrit CALAGE-RETENUE.json.
 */
import { writeFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { facteurDeRetenue, type Retenue } from './prototype';
import { lire } from './variantes';

interface Point { source: string; famille: string; cran: string; L: number; H: number; C: number; max: number; part: number }
const point = (source: string, famille: string, cran: string, hexa: string): Point => {
  const o = rgb8VersOklch(lireHexa(hexa)!);
  const max = plafond(o.L, o.H, 'srgb');
  return { source, famille, cran, L: o.L, H: o.H, C: o.C, max, part: o.C / Math.max(1e-9, max) };
};

const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const tailwind = lire('./references/tailwind-3.4.17.json') as Record<string, Record<string, string>>;
const radix = lire('./references/radix-colors-3.0.0.json') as Record<string, string[]>;
export const POINTS_TAILWIND = Object.entries(tailwind).filter(([nom]) => !NEUTRES.has(nom))
  .flatMap(([nom, crans]) => Object.entries(crans).map(([cran, hexa]) => point('tailwind', nom, cran, hexa)));
const RADIX = ['red', 'tomato', 'orange', 'amber', 'yellow', 'lime', 'grass', 'green', 'jade', 'teal', 'cyan', 'sky', 'blue', 'iris', 'violet', 'purple', 'plum', 'pink', 'crimson'];
export const POINTS_RADIX = (theme: 'Light' | 'Dark') => RADIX.filter((nom) => radix[`${nom}${theme}`])
  .flatMap((nom) => radix[`${nom}${theme}`].map((hexa, i) => point(`radix-${theme}`, nom, String(i + 1), hexa)));

/** L'erreur d'une part prédite : le carré de l'écart des logarithmes, sur les crans entre 0,25 et 0,985 de clarté. */
const retenus = (pts: Point[]) => pts.filter((p) => p.L > 0.25 && p.L < 0.985 && p.max > 0.02);
function erreur(pts: Point[], predire: (p: Point) => number): number {
  const r = retenus(pts);
  return r.reduce((s, p) => s + Math.log(Math.max(1e-3, predire(p)) / Math.max(1e-3, p.part)) ** 2, 0) / r.length;
}

/** Nelder-Mead minimal, pour caler une dizaine de paramètres. */
function nelderMead(f: (x: number[]) => number, x0: number[], pas: number[], iterations = 4000): number[] {
  const n = x0.length;
  let simplexe = [x0, ...x0.map((_, i) => x0.map((v, j) => (i === j ? v + pas[i] : v)))].map((x) => ({ x, f: f(x) }));
  for (let it = 0; it < iterations; it += 1) {
    simplexe.sort((a, b) => a.f - b.f);
    const centre = x0.map((_, j) => simplexe.slice(0, n).reduce((s, p) => s + p.x[j], 0) / n);
    const pire = simplexe[n];
    const vers = (t: number) => centre.map((c, j) => c + t * (pire.x[j] - c));
    const r = vers(-1); const fr = f(r);
    if (fr < simplexe[0].f) { const e = vers(-2); const fe = f(e); simplexe[n] = fe < fr ? { x: e, f: fe } : { x: r, f: fr }; continue; }
    if (fr < simplexe[n - 1].f) { simplexe[n] = { x: r, f: fr }; continue; }
    const c = vers(0.5); const fc = f(c);
    if (fc < pire.f) { simplexe[n] = { x: c, f: fc }; continue; }
    simplexe = simplexe.map((p, i) => (i === 0 ? p : { x: p.x.map((v, j) => simplexe[0].x[j] + 0.5 * (v - simplexe[0].x[j])), f: 0 }));
    simplexe = simplexe.map((p, i) => (i === 0 ? p : { x: p.x, f: f(p.x) }));
  }
  simplexe.sort((a, b) => a.f - b.f);
  return simplexe[0].x;
}

const versRetenue = (x: number[]): Retenue => ({
  clairs: { k: x[0], h: x[1], s: Math.max(5, x[2]), debut: x[3], plein: Math.max(x[3] + 0.02, x[4]) },
  fonces: { k: x[5], h: x[6], s: Math.max(5, x[7]), debut: x[8], plein: Math.min(x[8] - 0.02, x[9]) },
});

/** Calage : la part d'un cran de Tailwind vaut `part × retenue(L, H)`, bornée à 1. */
export function caler(points: Point[], part: number, depart: number[]): { retenue: Retenue; erreur: number } {
  const f = (x: number[]) => {
    const r = versRetenue(x);
    if (r.clairs.k < 0 || r.clairs.k > 0.9 || r.fonces.k < 0 || r.fonces.k > 0.9) return 1e3;
    return erreur(points, (p) => Math.min(1, part * facteurDeRetenue(r, p.L, p.H)));
  };
  const x = nelderMead(f, depart, [0.1, 15, 8, 0.04, 0.04, 0.1, 15, 8, 0.05, 0.05]);
  return { retenue: versRetenue(x), erreur: f(x) };
}

// Le départ lu sur le relevé : verts clairs vers 155°, bleus foncés vers 268°.
export const DEPART = [0.3, 155, 25, 0.74, 0.86, 0.45, 268, 18, 0.7, 0.35];

if (process.argv[1]?.endsWith('caler-retenue.ts')) {
  const vivid = caler(POINTS_TAILWIND, 0.95, DEPART);
  const soft = caler(POINTS_RADIX('Light'), 0.95, DEPART);
  const fr = (x: number) => x.toFixed(3);
  console.log('Retenue calée sur Tailwind :', JSON.stringify(vivid.retenue, (_k, v) => (typeof v === 'number' ? Number(v.toFixed(3)) : v)), 'erreur', fr(vivid.erreur));
  console.log('Retenue calée sur Radix clair :', JSON.stringify(soft.retenue, (_k, v) => (typeof v === 'number' ? Number(v.toFixed(3)) : v)), 'erreur', fr(soft.erreur));

  // Les règles comparées à la part de chaque point : constante, enveloppe par clarté seule, retenue par teinte.
  const regles: Record<string, (p: Point, theme: 'light' | 'dark') => number> = {
    'part constante 0,95': () => 0.95,
    'enveloppe Vivid (a 1,1, b 0,48)': (p) => Math.min(0.95, 0.95 * Math.min(1.1 * (1 - p.L), 0.48 * p.L) / p.max),
    'retenue Tailwind': (p) => Math.min(1, 0.95 * facteurDeRetenue(vivid.retenue, p.L, p.H)),
    'retenue Radix clair': (p) => Math.min(1, 0.95 * facteurDeRetenue(soft.retenue, p.L, p.H)),
  };
  const jeux = { tailwind: POINTS_TAILWIND, 'radix clair': POINTS_RADIX('Light'), 'radix sombre': POINTS_RADIX('Dark') };
  const resultats: Record<string, unknown> = {};
  for (const [jeu, pts] of Object.entries(jeux)) {
    console.log(`\n${jeu} : écart médian et part des crans hors de ×0,8 à ×1,25, par règle et par zone de teinte`);
    const zones: [string, (H: number) => boolean][] = [
      ['rouges à jaunes 0-110°', (H) => H < 110 || H >= 345], ['lime à turquoise 110-190°', (H) => H >= 110 && H < 190],
      ['cyans et bleus 190-280°', (H) => H >= 190 && H < 280], ['violets et roses 280-345°', (H) => H >= 280 && H < 345],
    ];
    for (const [nom, regle] of Object.entries(regles)) {
      const ligne = zones.map(([zone, dedans]) => {
        const r = retenus(pts).filter((p) => dedans(p.H));
        const rapports = r.map((p) => regle(p, 'light') / p.part).sort((a, b) => a - b);
        const hors = rapports.filter((x) => x < 0.8 || x > 1.25).length;
        const mediane = rapports[Math.floor(rapports.length / 2)];
        return `${zone} ×${fr(mediane)} (${hors}/${r.length} hors)`;
      });
      const tout = retenus(pts).map((p) => regle(p, 'light') / p.part);
      const hors = tout.filter((x) => x < 0.8 || x > 1.25).length;
      console.log(`  ${nom.padEnd(32)} ${hors}/${tout.length} hors · ${ligne.join(' · ')}`);
      resultats[`${jeu} · ${nom}`] = { hors, total: tout.length };
    }
  }
  writeFileSync(new URL('./CALAGE-RETENUE.json', import.meta.url), `${JSON.stringify({ vivid, soft, resultats }, null, 2)}\n`);
}
