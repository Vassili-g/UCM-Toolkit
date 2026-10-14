/**
 * Trois contrôles de l'enveloppe : les palettes ternes et à une intensité avec
 * la vraie logique des parts, une calibration hors échantillon sur Tailwind,
 * et la dérive de teinte du préréglage Tailwind appliquée à Orange.
 */
import { writeFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { boutsDe } from '../../../../../../packages/couleur/src/nuances';
import { partsDe, rampesDe } from '../../../../../../packages/couleur/src/palette';
import { prereglageTailwind } from '../../../../../../packages/couleur/src/tailwind';
import type { Palette } from '../../../../../../packages/couleur/src/recette';
import { enveloppes, rampesDuBanc } from './prototype';
import { RECETTE_COMMUNE, lire, valider } from './variantes';

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const C = (hexa: string) => rgb8VersOklch(lireHexa(hexa)!).C;
const resultats: Record<string, unknown> = {};

// 1. Les parts du moteur, communes portées à 0,85 et 0,95 : une référence terne garde des parts basses.
const recette = valider({ ...RECETTE_COMMUNE, profils: { soft: { ...RECETTE_COMMUNE.profils.soft, part: 0.85 }, vivid: { ...RECETTE_COMMUNE.profils.vivid, part: 0.95 } } });
const regle = enveloppes({ soft: { p0: 0.85, a: 0.6, b: 0.38 }, vivid: { p0: 0.95, a: 1.1, b: 0.48 }, unique: { p0: 0.95, a: 1.1, b: 0.48 } });
const ternes: Record<string, unknown> = {};
for (const p of recette.palettes) {
  const avant = rampesDe(RECETTE_COMMUNE, RECETTE_COMMUNE.palettes.find((q) => q.id === p.id)!);
  const apres = rampesDuBanc(recette, p, regle);
  const parts = partsDe(recette, p);
  const ligne: Record<string, unknown> = { parts };
  for (const i of Object.keys(avant) as (keyof typeof avant)[]) {
    ligne[i] = Object.fromEntries([100, 700].map((cran) => {
      const k = recette.crans.indexOf(cran);
      return [cran, { avant: r3(C(avant[i]!.light[k].hexa)), apres: r3(C(apres[i]!.light[k].hexa)) }];
    }));
  }
  ternes[p.nom ?? p.id] = ligne;
  console.log((p.nom ?? '').padEnd(10), JSON.stringify(parts), Object.keys(avant).map((i) => `${i} 100 ${(ligne[i] as Record<number, { avant: number; apres: number }>)[100].avant}→${(ligne[i] as Record<number, { avant: number; apres: number }>)[100].apres} 700 ${(ligne[i] as Record<number, { avant: number; apres: number }>)[700].avant}→${(ligne[i] as Record<number, { avant: number; apres: number }>)[700].apres}`).join(' · '));
}
resultats.ternes = ternes;

// 2. Hors échantillon : calibrer sur une teinte de Tailwind sur deux, juger sur les autres.
const tailwind = lire('./references/tailwind-3.4.17.json') as Record<string, Record<string, string>>;
const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const noms = Object.keys(tailwind).filter((n) => !NEUTRES.has(n));
const points = (liste: string[]) => liste.flatMap((n) => Object.values(tailwind[n]).map((h) => { const o = rgb8VersOklch(lireHexa(h)!); return { ...o, max: plafond(o.L, o.H, 'srgb') }; }));
const erreur = (pts: ReturnType<typeof points>, f: (p: (typeof pts)[number]) => number) => pts.reduce((s, p) => s + Math.abs(f(p) - p.C), 0) / pts.length;
const calibration = points(noms.filter((_, i) => i % 2 === 0));
const controle = points(noms.filter((_, i) => i % 2 === 1));
let meilleurePart = { part: 0, e: Infinity };
for (let part = 0.5; part <= 1.0001; part += 0.01) { const e = erreur(calibration, (p) => part * p.max); if (e < meilleurePart.e) meilleurePart = { part, e }; }
let meilleure = { part: 0, a: 0, b: 0, e: Infinity };
for (let part = 0.6; part <= 1.0001; part += 0.02) for (let a = 0.5; a <= 2.0001; a += 0.05) for (let b = 0.2; b <= 1.0001; b += 0.025) {
  const e = erreur(calibration, (p) => part * Math.min(p.max, a * (1 - p.L), b * p.L));
  if (e < meilleure.e) meilleure = { part, a, b, e };
}
const horsEchantillon = {
  calibration: noms.filter((_, i) => i % 2 === 0),
  partConstante: { part: r3(meilleurePart.part), erreurControle: r3(erreur(controle, (p) => meilleurePart.part * p.max)) },
  enveloppe: { part: r3(meilleure.part), a: r3(meilleure.a), b: r3(meilleure.b), erreurControle: r3(erreur(controle, (p) => meilleure.part * Math.min(p.max, meilleure.a * (1 - p.L), meilleure.b * p.L))) },
  enveloppeProposee: { erreurControle: r3(erreur(controle, (p) => 0.95 * Math.min(p.max, 1.1 * (1 - p.L), 0.48 * p.L))) },
};
resultats.horsEchantillon = horsEchantillon;
console.log('Hors échantillon', JSON.stringify(horsEchantillon));

// 3. Orange avec la dérive du préréglage Tailwind, toutes choses égales par ailleurs.
const orange = RECETTE_COMMUNE.palettes.find((p) => p.nom === 'Orange')!;
const derive = prereglageTailwind(rgb8VersOklch(lireHexa(orange.reference)!), boutsDe(RECETTE_COMMUNE));
const avecDerive = { ...orange, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } } as Palette;
const recetteOrange = valider({ ...recette, palettes: recette.palettes.map((p) => (p.id === orange.id ? avecDerive : p)) });
const orangeAvant = rampesDuBanc(recette, recette.palettes.find((p) => p.id === orange.id)!, regle);
const orangeApres = rampesDuBanc(recetteOrange, recetteOrange.palettes.find((p) => p.id === orange.id)!, regle);
const k = recette.crans.indexOf(700);
const lu = (h: string) => { const o = rgb8VersOklch(lireHexa(h)!); return { hexa: h, H: r3(o.H), C: r3(o.C) }; };
resultats.orange = {
  derive,
  soft700: { avant: lu(orangeAvant.soft!.light[k].hexa), apres: lu(orangeApres.soft!.light[k].hexa) },
  vivid700: { avant: lu(orangeAvant.vivid!.light[k].hexa), apres: lu(orangeApres.vivid!.light[k].hexa) },
  amber700: lu(tailwind.amber['700']),
};
console.log('Orange', JSON.stringify(resultats.orange));
writeFileSync(new URL('./MESURES-REPASSE.json', import.meta.url), `${JSON.stringify(resultats, null, 1)}\n`);
