/**
 * L'alerte « Soft et Vivid se confondent » sur le moteur retenu : à quel point Soft et Vivid se
 * séparent sur les nuances que visent les variables, rôle par rôle, et combien de palettes l'alerte
 * d'aujourd'hui et une alerte sur les fonds seuls signaleraient.
 *
 * `npx tsx mesurer-alerte-fonds.ts`
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Palette, Recette } from '../../../../../../packages/couleur/src/index';
import { TABLE_DES_DOSSIERS, sensDuTheme } from '../../../../../../packages/kit/src/emplois/dossiers';

const dossier = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const source = readFileSync(resolve(dossier, 'mesurer-troisieme-passe.ts'), 'utf8');
const programme = `${source.slice(0, source.indexOf('// ------------------------------------------------------------ contrôle'))}
export { construire, paletteTailwind, avecTexte, JEUX, GALERIE };`;
const compile = buildSync({ stdin: { contents: programme, resolveDir: dossier, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.url': JSON.stringify(new URL('./mesurer-troisieme-passe.ts', import.meta.url).href) } });
const module_ = { exports: {} as Record<string, any> };
new Function('require', 'module', 'exports', compile.outputFiles[0].text)(require, module_, module_.exports);
const B = module_.exports;

const RETENU = { id: 'R', nom: '', soft: { k: 10, porteur: 'actuel', seuilPorteur: 0, pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: 'saufReference' }, clarteTeinte: 'garde', softDarkB: 0.15, clarteGarde: true };
const AUJOURDHUI = { id: 'A', nom: '', soft: null, bosse: null };
const MODES = ['light', 'dark'] as const;
const SEUIL = 0.02;
const base = M.recetteParDefaut();

// Les palettes : Tailwind 500, la galerie sans ses parts réglées, et un balayage de références assez saturées pour que l'alerte les juge.
const balayage: Palette[] = [];
for (let H = 0; H < 360; H += 10) for (const L of [0.35, 0.45, 0.55, 0.65, 0.75, 0.85]) for (const part of [0.85, 0.92, 1]) {
  balayage.push(B.paletteTailwind(balayage.length, M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C: part * M.plafond(L, H, 'srgb'), H })))));
}
const JEUX_MESURES: [string, Palette[]][] = [['Tailwind 500', B.JEUX[0].recette.palettes], ['Galerie', B.GALERIE.filter((p: Palette) => !p.parts)], ['Balayage', balayage]];

for (const [clair, sombre] of [['blanc', 'blanc'], ['blanc', 'noir']] as const) {
  const r0: Recette = B.avecTexte({ ...base, palettes: [] }, clair, sombre);
  const fonds = M.fondsSombresDe(r0);
  console.log(`\n=== Texte des boutons ${clair} en Light, ${sombre} en Dark`);
  for (const [nom, palettes] of JEUX_MESURES) {
    for (const [moteur, v] of [['aujourd\'hui', AUJOURDHUI], ['retenu', RETENU]] as const) {
      const parRole: Record<string, number[]> = {};
      let alerteAujourdhui = 0, alerteFondsLight = 0, alerteFondsDeux = 0, alerteFondsSans100 = 0, ternes = 0;
      const signalees: string[] = [];
      for (const p0 of palettes) {
        const r = { ...r0, palettes: [p0] };
        const p = r.palettes[0];
        if (M.aDesProfilsTernes(r, p)) { ternes += 1; continue; }
        const rampes = B.construire(r, p, v).rampes;
        const confondus = { variables: 0, fondsLight: 0, fondsDark: 0, sans100: 0 };
        for (const m of MODES) {
          const table = TABLE_DES_DOSSIERS[m][sensDuTheme(m, r.texteDesBoutons[m])] as Record<string, number | string>;
          // Une nuance porte souvent plusieurs rôles : on la juge une fois, sous le nom de tous ses rôles.
          const roles = new Map<number, string[]>();
          for (const [role, cran] of Object.entries(table)) if (typeof cran === 'number') roles.set(cran, [...(roles.get(cran) ?? []), role]);
          for (const [cran, noms] of roles) {
            const role = noms.join(' ');
            const fond = noms.some((n) => ['surface/default', 'surface/hover', 'surface/pressed'].includes(n));
            const k = r.crans.indexOf(cran as never);
            const d = M.distanceOk(M.lireHexa(rampes.soft[m][k].hexa)!, M.lireHexa(rampes.vivid[m][k].hexa)!);
            (parRole[`${m} ${cran} ${role}`] ??= []).push(d);
            const attenue = m === 'dark' && M.facteurSombre(r.courbes.dark[k], fonds) < 1;
            if (d < SEUIL && !attenue) confondus.variables += 1;
            if (d < SEUIL && fond) confondus[m === 'light' ? 'fondsLight' : 'fondsDark'] += 1;
            if (d < SEUIL && fond && !(m === 'light' && cran === 100)) confondus.sans100 += 1;
          }
        }
        if (confondus.variables >= 3) alerteAujourdhui += 1;
        if (confondus.fondsLight >= 2) { alerteFondsLight += 1; signalees.push(p.reference); }
        if (confondus.fondsLight + confondus.fondsDark >= 3) alerteFondsDeux += 1;
        if (confondus.sans100 >= 3) alerteFondsSans100 += 1;
      }
      const jugees = palettes.length - ternes;
      console.log(`${nom}, moteur ${moteur} : ${jugees} palettes jugées (${ternes} ternes laissées) · alerte d'aujourd'hui ${alerteAujourdhui} · fonds Light (2 sur 3) ${alerteFondsLight} · fonds des deux thèmes (3 sur 6) ${alerteFondsDeux} · sans le 100 Light (3 sur 5) ${alerteFondsSans100}${signalees.length && signalees.length <= 12 ? ` · ${signalees.join(' ')}` : ''}`);
      if (moteur === 'retenu' && nom !== 'Galerie') {
        const lignes = Object.entries(parRole).map(([cle, ds]) => { const t = [...ds].sort((a, b) => a - b); return `${cle.padEnd(70)} min ${t[0].toFixed(3)} médiane ${t[Math.floor(t.length / 2)].toFixed(3)} sous ${SEUIL} : ${ds.filter((d) => d < SEUIL).length}`; });
        console.log(`  écart Soft/Vivid par nuance visée :\n  ${lignes.join('\n  ')}`);
      }
    }
  }
}
