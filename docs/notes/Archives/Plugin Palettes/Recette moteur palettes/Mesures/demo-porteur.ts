/**
 * Données de la démo du porteur (`Maquettes/DEMO-PORTEUR.html`) : les palettes de la galerie sous
 * trois règles du moteur retenu, le seuil 0,78, « Vivid porte toujours la référence » et les niveaux
 * communs, puis l'harmonisation à la main d'un groupe sous la deuxième règle.
 *
 * `npx tsx demo-porteur.ts`
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Palette, Recette } from '../../../../../../packages/couleur/src/index';
import { TABLE_DES_DOSSIERS, sensDuTheme, COULEUR_DU_TEXTE_DES_BOUTONS } from '../../../../../../packages/kit/src/emplois/dossiers';

const dossier = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const source = readFileSync(resolve(dossier, 'mesurer-troisieme-passe.ts'), 'utf8');
const programme = `${source.slice(0, source.indexOf('// ------------------------------------------------------------ contrôle'))}
export { construire, juger, porteurEtParts, avecTexte, GALERIE };`;
const compile = buildSync({ stdin: { contents: programme, resolveDir: dossier, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.url': JSON.stringify(new URL('./mesurer-troisieme-passe.ts', import.meta.url).href) } });
const module_ = { exports: {} as Record<string, any> };
new Function('require', 'module', 'exports', compile.outputFiles[0].text)(require, module_, module_.exports);
const B = module_.exports;

const RETENU = { id: 'R', nom: '', soft: { k: 10, porteur: 'actuel', seuilPorteur: 0.78, pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: 'saufReference' }, clarteTeinte: 'garde', softDarkB: 0.15, clarteGarde: true };
const REGLES = [
  { id: 'seuil', titre: 'Seuil 0,78', v: RETENU },
  { id: 'toujours', titre: 'Vivid porte toujours', v: { ...RETENU, soft: { ...RETENU.soft, seuilPorteur: 0 } } },
  { id: 'commun', titre: 'Niveaux communs', v: { ...RETENU, soft: { ...RETENU.soft, seuilPorteur: undefined, niveauCommun: true } } },
];
const MODES = ['light', 'dark'] as const;
const r: Recette = B.avecTexte({ ...M.recetteParDefaut(), palettes: B.GALERIE }, 'blanc', 'blanc');
const hexas = (rampe: { hexa: string }[]) => rampe.map((c) => c.hexa.slice(1)).join(',');

function calculer(p: Palette, v: any) {
  const c = B.construire(r, p, v);
  const { parts } = B.porteurEtParts(r, p, v);
  const manquees = B.juger(r, p, c.rampes).filter((x: any) => x.manquee).length;
  return {
    s: Object.fromEntries(MODES.map((m) => [m, hexas(c.rampes.soft[m])])),
    v: Object.fromEntries(MODES.map((m) => [m, hexas(c.rampes.vivid[m])])),
    p: c.porteur, r: c.rangs, ps: M.arrondir(parts.soft, 3), pv: M.arrondir(parts.vivid, 3), m: manquees,
  };
}

// Rose et Indigo ont des saturations réglées à la main dans la galerie : aucune règle ne les touche.
const palettes = B.GALERIE.filter((p: Palette) => !p.parts).map((p: Palette) => ({ id: p.id, nom: p.nom, reference: p.reference, part: M.partDeLaReference(r, p), regles: Object.fromEntries(REGLES.map((g) => [g.id, calculer(p, g.v)])) }))
  .sort((a: any, b: any) => b.part - a.part);

// L'harmonisation sous « Vivid porte toujours » : la référence passe dans Soft, et Vivid monte à la part commune (0,95).
const HARMONISEES = ['Rouge', 'Grenat', 'Cuivre', 'Marine'];
const harmonisation = HARMONISEES.map((nom) => {
  const p = B.GALERIE.find((x: Palette) => x.nom === nom) as Palette;
  const part = M.partDeLaReference(r, p);
  const reglee = { ...p, reglages: { ...(p.reglages ?? {}), porteur: 'soft' }, parts: { soft: part, vivid: r.profils.vivid.part, origine: 'designer' } } as Palette;
  return { nom, reference: p.reference, part, avant: calculer(p, REGLES[1].v), apres: calculer(reglee, REGLES[1].v) };
});

const donnees = {
  crans: r.crans, regles: REGLES.map(({ id, titre }) => ({ id, titre })), palettes, harmonisation,
  fonds: r.fonds, cartes: { light: M.ecrireHexa(M.couleurDeLaCarte(r, 'light')), dark: M.ecrireHexa(M.couleurDeLaCarte(r, 'dark')) },
  table: Object.fromEntries(MODES.map((m) => [m, TABLE_DES_DOSSIERS[m][sensDuTheme(m, r.texteDesBoutons[m])]])),
  texteDesBoutons: { light: COULEUR_DU_TEXTE_DES_BOUTONS.blanc, dark: COULEUR_DU_TEXTE_DES_BOUTONS.blanc },
};
writeFileSync(resolve(dossier, '../Maquettes/donnees-porteur.js'), `window.PORTEUR = ${JSON.stringify(donnees)};\n`);
for (const p of palettes) console.log(`${p.nom.padEnd(9)} ${p.reference} ${p.part.toFixed(3)} ${REGLES.map((g) => `${g.id} ${p.regles[g.id].p} ${p.regles[g.id].ps}/${p.regles[g.id].pv} m${p.regles[g.id].m}`).join(' | ')}`);
for (const h of harmonisation) console.log(`harmonisée ${h.nom} : avant ${h.avant.p} ${h.avant.ps}/${h.avant.pv} m${h.avant.m}, après ${h.apres.p} ${h.apres.ps}/${h.apres.pv} m${h.apres.m}`);
