/**
 * Les tons clairs de Vivid sur les verts : chroma contre Tailwind 3.4, et ce que
 * change la borne vers le blanc de Vivid en Light (`a`, aujourd'hui 1,1). Le
 * moteur est celui du paquet ; seule la valeur de `a` change. Les promesses se
 * comparent une à une sur le balayage de 72 teintes, deux clartés, quatre
 * combinaisons du texte des boutons.
 *
 * `npx tsx mesurer-verts-vivid.ts`
 */
import { readFileSync } from 'node:fs';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Palette, Recette } from '../../../../../../packages/couleur/src/index';

const base = M.recetteParDefaut();
const TW = JSON.parse(readFileSync(new URL('../../Recette CRITIQUE de qualité/Mesures/references/tailwind-3.4.17.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>;
const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const palette = (k: number, reference: string, nom: string): Palette => {
  const derive = M.prereglageTailwind(M.rgb8VersOklch(M.lireHexa(reference)!), M.boutsDe(base));
  return { id: `p-${(k + 1).toString(16).padStart(8, '0')}`, reference, nom, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } } as Palette;
};
const avecA = (r: Recette, a: number): Recette => ({ ...r, profils: { ...r.profils, vivid: { ...r.profils.vivid, enveloppe: { ...r.profils.vivid.enveloppe, light: { ...r.profils.vivid.enveloppe.light, a } } } } });
const C = (hexa: string) => M.rgb8VersOklch(M.lireHexa(hexa)!).C;
const familles = Object.entries(TW).filter(([n]) => !NEUTRES.has(n));
const recette = { ...base, palettes: familles.map(([n, c], k) => palette(k, c['500'], n)) };
const CRANS = [100, 200, 300, 400, 500];

for (const a of [1.1, 1.0, 0.9, 0.8]) {
  const r = avecA(recette, a);
  console.log(`\nVivid Light a = ${a} : chroma Vivid / Tailwind, crans ${CRANS.join(', ')}`);
  for (const p of r.palettes) {
    const rr = M.rampesDe(r, p).vivid!.light;
    const ratios = CRANS.map((c) => r3(rr[r.crans.indexOf(c)].C / C(TW[p.nom!][String(c)])));
    if (['lime', 'green', 'emerald', 'teal', 'cyan', 'yellow', 'amber', 'blue', 'red'].includes(p.nom!)) console.log(`  ${p.nom!.padEnd(8)} ${ratios.join('  ')}   (${CRANS.map((c) => rr[r.crans.indexOf(c)].hexa).join(' ')})`);
  }
}

// Les promesses, une à une, sur le balayage.
const COMBINAISONS = [['blanc', 'noir'], ['noir', 'blanc'], ['blanc', 'blanc'], ['noir', 'noir']] as const;
const balayage: Palette[] = [];
for (const L of [0.62, 0.75]) for (let h = 0; h < 360; h += 5) {
  const Cv = Math.min(0.16, M.plafond(L, h, 'srgb') * 0.95);
  balayage.push(palette(balayage.length, M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C: Cv, H: h }))), `${h}`));
}
const cles = (r: Recette) => new Map(r.palettes.flatMap((p) => M.verifierPromesses(r, p).map((x) => [`${p.id}/${x.mode}/${x.profil}/G${x.garantie.numero}/${x.second.nature === 'fond' ? x.second.fond : x.second.nature === 'cran' ? x.second.cran : 'texte'}/${x.premier.nature === 'cran' ? x.premier.cran : 't'}`, x.verdict === 'manquee'] as const)));
for (const a of [1.0, 0.9, 0.8]) {
  let [plus, moins, total] = [0, 0, 0];
  for (const [clair, sombre] of COMBINAISONS) {
    const r0 = { ...base, texteDesBoutons: { light: clair, dark: sombre }, courbes: M.courbesParDefaut(11, { light: clair, dark: sombre }), palettes: balayage } as Recette;
    const [k0, k1] = [cles(r0), cles(avecA(r0, a))];
    for (const [k, m] of k1) { if (m) total += 1; if (m && !k0.get(k)) plus += 1; if (!m && k0.get(k)) moins += 1; }
  }
  console.log(`\nBalayage, Vivid Light a = ${a} : ${total} promesses manquées, +${plus} −${moins} par rapport à a = 1,1`);
}
