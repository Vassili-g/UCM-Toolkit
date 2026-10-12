/**
 * Calibration de la règle de chroma sur Tailwind 3.4.17 et Radix Colors 3.0.0.
 * À clarté et teinte relues sur chaque cran de référence, on compare la chroma
 * réelle à deux règles : la part constante du plafond (moteur actuel) et la
 * part d'un plafond borné par une enveloppe indépendante de la teinte.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import { plafond } from '../../../../../../packages/couleur/src/plafond';

const lire = (chemin: string) => JSON.parse(readFileSync(new URL(chemin, import.meta.url), 'utf8'));
const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);

interface Point { source: string; teinte: string; cran: string; L: number; C: number; H: number; max: number }
const point = (source: string, teinte: string, cran: string, hexa: string): Point => {
  const o = rgb8VersOklch(lireHexa(hexa)!);
  return { source, teinte, cran, L: o.L, C: o.C, H: o.H, max: plafond(o.L, o.H, 'srgb') };
};

const tailwind = lire('./references/tailwind-3.4.17.json') as Record<string, Record<string, string>>;
const radix = lire('./references/radix-colors-3.0.0.json') as Record<string, string[]>;
const pointsTailwind = Object.entries(tailwind).filter(([nom]) => !NEUTRES.has(nom))
  .flatMap(([nom, crans]) => Object.entries(crans).map(([cran, hexa]) => point('tailwind', nom, cran, hexa)));
const pointsRadix = (suffixe: 'Light' | 'Dark') => ['red', 'tomato', 'amber', 'orange', 'yellow', 'grass', 'green', 'jade', 'sky', 'blue', 'iris', 'violet']
  .flatMap((nom) => radix[`${nom}${suffixe}`].map((hexa, i) => point(`radix-${suffixe}`, nom, String(i + 1), hexa)));

export const enveloppe = (L: number, a: number, b: number) => Math.min(a * (1 - L), b * L);
const predire = (p: Point, part: number, a?: number, b?: number) =>
  part * (a === undefined ? p.max : Math.min(p.max, enveloppe(p.L, a, b!)));

const erreur = (points: Point[], f: (p: Point) => number) => {
  const ecarts = points.map((p) => Math.abs(f(p) - p.C));
  ecarts.sort((x, y) => x - y);
  return { moyenne: ecarts.reduce((s, x) => s + x, 0) / ecarts.length, p90: ecarts[Math.floor(ecarts.length * 0.9)] };
};

const ajuster = (points: Point[]) => {
  let meilleurPart = { part: 0, ...erreur(points, () => 0) };
  for (let part = 0.3; part <= 1.0001; part += 0.01) {
    const e = erreur(points, (p) => predire(p, part));
    if (e.moyenne < meilleurPart.moyenne) meilleurPart = { part, ...e };
  }
  let meilleureEnveloppe = { part: 0, a: 0, b: 0, ...erreur(points, () => 0) };
  for (let part = 0.6; part <= 1.0001; part += 0.02)
    for (let a = 0.3; a <= 2.0001; a += 0.05)
      for (let b = 0.2; b <= 1.0001; b += 0.025) {
        const e = erreur(points, (p) => predire(p, part, a, b));
        if (e.moyenne < meilleureEnveloppe.moyenne) meilleureEnveloppe = { part, a, b, ...e };
      }
  return { partConstante: meilleurPart, enveloppe: meilleureEnveloppe };
};

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const arrondi = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r3(v)]));
const resultats = {
  tailwind: ajuster(pointsTailwind),
  radixClair: ajuster(pointsRadix('Light')),
  radixSombre: ajuster(pointsRadix('Dark')),
};
for (const [nom, r] of Object.entries(resultats)) {
  console.log(nom.padEnd(12), 'part constante', JSON.stringify(arrondi(r.partConstante)), '| enveloppe', JSON.stringify(arrondi(r.enveloppe)));
}

// Détail Tailwind : chroma réelle contre les deux règles, par cran, médiane des teintes.
const { partConstante: pc, enveloppe: ev } = resultats.tailwind;
const parCran = Object.keys(tailwind.red).map((cran) => {
  const pts = pointsTailwind.filter((p) => p.cran === cran);
  const med = (xs: number[]) => xs.sort((x, y) => x - y)[Math.floor(xs.length / 2)];
  return {
    cran,
    L: r3(med(pts.map((p) => p.L))),
    C: r3(med(pts.map((p) => p.C))),
    ecartPartConstante: r3(med(pts.map((p) => Math.abs(predire(p, pc.part) - p.C)))),
    ecartEnveloppe: r3(med(pts.map((p) => Math.abs(predire(p, ev.part, ev.a, ev.b) - p.C)))),
  };
});
console.table(parCran);
writeFileSync(new URL('./CALIBRATION-ENVELOPPE.json', import.meta.url), `${JSON.stringify({ resultats, parCran }, null, 1)}\n`);
