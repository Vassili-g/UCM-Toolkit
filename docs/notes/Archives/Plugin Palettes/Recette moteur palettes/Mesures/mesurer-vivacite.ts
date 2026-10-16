/**
 * La vivacité perçue des rampes, teinte par teinte : CAM16-UCS M' (voir
 * `cam16.ts`) des nuances Soft et Vivid du moteur, sur un tour de 24 teintes et
 * sur les 17 couleurs 500 de Tailwind, comparée aux rampes de Tailwind 3.4.
 * Pour chaque cran, chaque teinte est rapportée à la médiane des teintes : 1
 * veut dire « aussi vive que la teinte médiane ».
 *
 * `npx tsx mesurer-vivacite.ts` écrit MESURES-VIVACITE.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Mode, Palette } from '../../../../../../packages/couleur/src/index';
import { cam16 } from './cam16';

const base = M.recetteParDefaut();
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const mediane = (xs: number[]) => { const t = [...xs].sort((a, b) => a - b); return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2; };
const palette = (k: number, reference: string, nom: string): Palette => {
  const derive = M.prereglageTailwind(M.rgb8VersOklch(M.lireHexa(reference)!), M.boutsDe(base));
  return { id: `p-${(k + 1).toString(16).padStart(8, '0')}`, reference, nom, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } } as Palette;
};
const TW = JSON.parse(readFileSync(new URL('../../Recette CRITIQUE de qualité/Mesures/references/tailwind-3.4.17.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>;
const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const FAMILLES = Object.entries(TW).filter(([n]) => !NEUTRES.has(n));
const CRANS = base.crans;
const Mucs = (hexa: string) => cam16(M.lireHexa(hexa)!).Mucs;
const Cok = (hexa: string) => M.rgb8VersOklch(M.lireHexa(hexa)!).C;

const tour = Array.from({ length: 24 }, (_, k) => {
  const H = (15 * k + 5) % 360;
  const L = 0.62;
  const C = Math.min(0.18, M.plafond(L, H, 'srgb') * 0.95);
  return palette(k, M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C, H }))), `${H}°`);
});
const jeux = { tour, tailwind: FAMILLES.map(([n, c], k) => palette(k, c['500'], n)) };

/** Par cran : la valeur de chaque palette, et son rapport à la médiane des palettes. */
function parCran(valeurs: number[][]) {
  return CRANS.map((cran, i) => {
    const xs = valeurs.map((v) => v[i]);
    const m = mediane(xs);
    return { cran, mediane: r3(m), rapports: xs.map((x) => r3(x / m)), dispersion: r3(Math.max(...xs) / Math.min(...xs)) };
  });
}

const sortie: Record<string, unknown> = { crans: CRANS };
for (const [nomJeu, palettes] of Object.entries(jeux)) {
  const r = { ...base, palettes };
  const rampes = palettes.map((p) => M.rampesDe(r, p));
  const bloc: Record<string, unknown> = { teintes: palettes.map((p) => p.nom), references: palettes.map((p) => p.reference) };
  for (const profil of ['soft', 'vivid'] as const) for (const mode of ['light', 'dark'] as Mode[]) {
    const hexas = rampes.map((rr) => rr[profil]![mode].map((c) => c.hexa));
    bloc[`${profil}/${mode}`] = { hexas, Mucs: parCran(hexas.map((h) => h.map(Mucs))), C: parCran(hexas.map((h) => h.map(Cok))) };
  }
  sortie[nomJeu] = bloc;
}
// Tailwind 3.4, rampes publiées, numéro pour numéro.
{
  const hexas = FAMILLES.map(([, c]) => CRANS.map((cran) => c[String(cran)]));
  sortie.tailwindPublie = { teintes: FAMILLES.map(([n]) => n), hexas, Mucs: parCran(hexas.map((h) => h.map(Mucs))), C: parCran(hexas.map((h) => h.map(Cok))) };
}
writeFileSync(new URL('./MESURES-VIVACITE.json', import.meta.url), `${JSON.stringify(sortie, null, 1)}\n`);

// Lecture : dispersion entre teintes (max / min), en chroma OKLCH et en vivacité perçue.
const S = sortie as any;
const ligne = (titre: string, x: any) => console.log(titre.padEnd(30), CRANS.map((c, i) => `${c}:${x.Mucs[i].dispersion}/${x.C[i].dispersion}`).join(' '));
console.log('Dispersion entre teintes, vivacité perçue / chroma OKLCH (max ÷ min), par cran :');
ligne('Tailwind publié', S.tailwindPublie);
for (const k of ['vivid/light', 'soft/light', 'vivid/dark', 'soft/dark']) ligne(`UCM ${k}, Tailwind 500`, S.tailwind[k]);
for (const k of ['vivid/light', 'soft/light', 'vivid/dark', 'soft/dark']) ligne(`UCM ${k}, tour`, S.tour[k]);

const table = (titre: string, x: any, teintes: string[], crans: number[]) => {
  console.log(`\n${titre} : vivacité perçue rapportée à la médiane des teintes`);
  console.log('teinte'.padEnd(9), crans.map((c) => String(c).padStart(5)).join(' '));
  teintes.forEach((t, j) => console.log(t.padEnd(9), crans.map((c) => x.Mucs[CRANS.indexOf(c)].rapports[j].toFixed(2).padStart(5)).join(' ')));
};
table('Tour, Vivid Light', S.tour['vivid/light'], S.tour.teintes, [100, 200, 300, 500, 700, 800]);
table('Tour, Soft Light', S.tour['soft/light'], S.tour.teintes, [100, 200, 300, 500, 700, 800]);
table('Tour, Vivid Dark', S.tour['vivid/dark'], S.tour.teintes, [300, 400, 500, 700, 900, 950]);
table('Tailwind publié', S.tailwindPublie, S.tailwindPublie.teintes, [100, 200, 300, 500, 700, 800]);
table('UCM Vivid Light, Tailwind 500', S.tailwind['vivid/light'], S.tailwind.teintes, [100, 200, 300, 500, 700, 800]);
