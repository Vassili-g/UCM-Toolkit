/**
 * Deux exemples pour le mainteneur, sur le moteur retenu : ce que la garde de la clarté selon la
 * teinte change sur Tailwind 500 et sur la galerie, et deux références presque identiques de part et
 * d'autre du seuil du porteur (0,78).
 *
 * `npx tsx exemples-retenu.ts`
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Recette } from '../../../../../../packages/couleur/src/index';

const dossier = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const source = readFileSync(resolve(dossier, 'mesurer-troisieme-passe.ts'), 'utf8');
const programme = `${source.slice(0, source.indexOf('// ------------------------------------------------------------ contrôle'))}
export { construire, juger, paletteTailwind, avecTexte, JEUX, GALERIE };`;
const compile = buildSync({ stdin: { contents: programme, resolveDir: dossier, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.url': JSON.stringify(new URL('./mesurer-troisieme-passe.ts', import.meta.url).href) } });
const module_ = { exports: {} as Record<string, any> };
new Function('require', 'module', 'exports', compile.outputFiles[0].text)(require, module_, module_.exports);
const B = module_.exports;

const RETENU = { id: 'R', nom: '', soft: { k: 10, porteur: 'actuel', seuilPorteur: 0.78, pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true }, clarteTeinte: 'garde', softDarkB: 0.15 };
const GARDE = { ...RETENU, clarteGarde: true };
const base = M.recetteParDefaut();

// 1. La garde : les palettes qui changent, et de combien.
for (const [nom, palettes] of [['Tailwind 500', B.JEUX[0].recette.palettes], ['Galerie', B.GALERIE]] as const) {
  for (const [clair, sombre] of [['blanc', 'blanc'], ['blanc', 'noir']] as const) {
    const r: Recette = B.avecTexte({ ...base, palettes }, clair, sombre);
    const changees: string[] = [];
    for (const p of r.palettes) {
      const [a, b] = [B.construire(r, p, RETENU).rampes, B.construire(r, p, GARDE).rampes];
      const diff: string[] = [];
      for (const i of Object.keys(a)) for (const m of ['light', 'dark']) a[i][m].forEach((c: any, k: number) => { if (c.hexa !== b[i][m][k].hexa) diff.push(`${i} ${m} ${r.crans[k]} ${c.hexa}→${b[i][m][k].hexa}`); });
      if (diff.length) changees.push(`${p.nom} : ${diff.join(', ')}`);
    }
    console.log(`Garde, ${nom}, texte ${clair}/${sombre} : ${changees.length} palette(s) changée(s)${changees.length ? `\n  ${changees.join('\n  ')}` : ''}`);
  }
}

// 2. Le seuil du porteur : deux rouges voisins.
const r = B.avecTexte({ ...base, palettes: [] }, 'blanc', 'blanc');
const H = 25, L = 0.62;
let precedent: any = null;
for (let part = 0.76; part <= 0.8; part += 0.002) {
  const hexa = M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C: part * M.plafond(L, H, 'srgb'), H })));
  const p = B.paletteTailwind(0, hexa, hexa);
  const rr = { ...r, palettes: [p] };
  const c = B.construire(rr, p, GARDE);
  const etat = { hexa, part: M.partDeLaReference(rr, p), porteur: c.porteur, c };
  if (precedent && precedent.porteur !== etat.porteur) {
    for (const e of [precedent, etat]) {
      const cr = (i: string, m: string, n: number) => e.c.rampes[i][m][rr.crans.indexOf(n)].hexa;
      console.log(`\nRéférence ${e.hexa}, saturation ${e.part}, portée par ${e.porteur}`);
      for (const i of ['soft', 'vivid']) console.log(`  ${i.padEnd(5)} Light : fond 100 ${cr(i, 'light', 100)}, plein 700 ${cr(i, 'light', 700)}, texte 800 ${cr(i, 'light', 800)} · Dark : fond 300 ${cr(i, 'dark', 300)}, plein 700 ${cr(i, 'dark', 700)}, survol 600 ${cr(i, 'dark', 600)}`);
    }
    break;
  }
  precedent = etat;
}
