import { readFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
const R = JSON.parse(readFileSync(new URL('../../Recette CRITIQUE de qualité/Mesures/references/radix-colors-3.0.0.json', import.meta.url), 'utf8'));
const k = Object.keys(R); console.log(k.slice(0, 8).join(' '), '…', k.length);
const lire = (o: any) => (Array.isArray(o) ? o : Object.values(o)) as string[];
const ratios: number[] = [];
for (const [cle, ech] of Object.entries<any>(R)) {
  if (!cle.endsWith('Light')) continue; const nom = cle.slice(0, -5);
  const v = lire(ech); if (v.length < 12 || typeof v[0] !== 'string' || !String(v[0]).startsWith('#')) continue;
  const hex = v.map((h) => (h.startsWith('#') && h.length > 7 ? h.slice(0, 7) : h)); if (hex.some((h) => !lireHexa(h))) continue; const C = hex.map((h) => rgb8VersOklch(lireHexa(h)!).C);
  if (C[8] < 0.05) continue;
  ratios.push(C[7] / C[8]);
  if (['blue','pink','yellow','grass','tomato'].includes(nom)) console.log(nom, 'C8', C[7].toFixed(3), 'C9', C[8].toFixed(3), 'C10', C[9].toFixed(3), '8/9', (C[7]/C[8]).toFixed(2), '10/9', (C[9]/C[8]).toFixed(2));
}
ratios.sort((a,b)=>a-b); console.log('8/9 min', ratios[0].toFixed(2), 'med', ratios[ratios.length>>1].toFixed(2), 'max', ratios.at(-1)!.toFixed(2), 'n', ratios.length);
