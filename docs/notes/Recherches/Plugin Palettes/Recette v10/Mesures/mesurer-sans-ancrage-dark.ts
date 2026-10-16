/**
 * La piste du mainteneur : la référence n'est posée qu'en Light ; en Dark, la rampe suit sa courbe et
 * son enveloppe, sans nuance d'ancrage ni bosse de chroma. Le moteur modifié est le moteur du dépôt,
 * patché au bundle (`ancrageDe` rend un rang Dark de -1, la bosse Dark est nulle). On compare les
 * rampes Dark, les promesses tenues une à une et les paires trop proches.
 *
 * `npx tsx mesurer-sans-ancrage-dark.ts [<recette.json>] > ../MESURES-SANS-ANCRAGE-DARK.json`
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import * as A from '../../../../../../packages/couleur/src/index';
import type { Palette, Recette } from '../../../../../../packages/couleur/src/index';
import { nouvellePalette } from '../../../../../../packages/plugin-palettes/src/edition';

const ici = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const SOURCE = resolve(ici, '../../../../../../packages/couleur/src/palette.ts');
const PATCHS: [string, string][] = [
  ['const rangs = { light: rangPorteur(courbes.light, clarte), dark: rangPorteur(courbes.dark, clarte) };',
    'const rangs = { light: rangPorteur(courbes.light, clarte), dark: -1 };'],
  ["dark: bosseDeChroma(visees.dark, ancrage.rangs.dark, 'dark', lue, intensite !== 'soft'),", 'dark: null,'],
];
let patche = false;

async function principal(): Promise<void> {
const sortie = await build({
  stdin: { contents: "export * from './index';", resolveDir: dirname(SOURCE), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['esbuild'],
  plugins: [{ name: 'sans-ancrage-dark', setup(build) {
    build.onLoad({ filter: /palette\.ts$/ }, (args) => {
      if (resolve(args.path) !== SOURCE) return undefined;
      patche = true;
      let texte = readFileSync(SOURCE, 'utf8');
      for (const [avant, apres] of PATCHS) {
        if (!texte.includes(avant)) throw new Error(`motif absent : ${avant}`);
        texte = texte.replace(avant, apres);
      }
      return { contents: texte, loader: 'ts' };
    });
  } }],
});
if (!patche) throw new Error('palette.ts n’a pas été patché');
const module_ = { exports: {} as any };
new Function('require', 'module', 'exports', sortie.outputFiles[0].text)(require, module_, module_.exports);
const B = module_.exports as typeof A;

const TAILWIND: [string, string][] = [['red', '#ef4444'], ['orange', '#f97316'], ['amber', '#f59e0b'], ['yellow', '#eab308'], ['lime', '#84cc16'], ['green', '#22c55e'], ['emerald', '#10b981'], ['teal', '#14b8a6'], ['cyan', '#06b6d4'], ['sky', '#0ea5e9'], ['blue', '#3b82f6'], ['indigo', '#6366f1'], ['violet', '#8b5cf6'], ['purple', '#a855f7'], ['fuchsia', '#d946ef'], ['pink', '#ec4899'], ['rose', '#f43f5e']];
const GALERIE: [string, string][] = [['Bleu', '#1E6FD9'], ['Jaune', '#FACC15'], ['Rouge', '#D94635'], ['Violet', '#7C3AED'], ['Cyan', '#0891B2'], ['Ardoise', '#6B7280'], ['Rose', '#DB2777'], ['Indigo', '#4F46E5'], ['Lime', '#65A30D'], ['Teal', '#0D9488'], ['Fuchsia', '#C026D3'], ['Pourpre', '#9333EA'], ['Sable', '#A8A29E'], ['Marine', '#1E3A8A'], ['Cuivre', '#B25E34'], ['Moutarde', '#B2B234'], ['Sapin', '#34B25E'], ['Grenat', '#B23488'], ['Brume', '#94A3B8'], ['Mauve', '#897288']];

function recetteDe(references: [string, string][]): Recette {
  const base = A.recetteParDefaut();
  return { ...base, palettes: references.map(([nom, hexa], rang) => ({ ...nouvellePalette(base, `p${rang}`, hexa, 2)!, nom })) };
}
const nom = (palette: Palette) => (palette as { nom?: string }).nom ?? palette.id;
const L = (M: typeof A, c: A.Rgb8) => M.rgb8VersOklch(c);

function rampeDark(M: typeof A, recette: Recette, palette: Palette) {
  const { crans } = M.grilleDe(recette, palette);
  const rampe = M.rampeDe(M.rampesDe(recette, palette), M.aUneIntensite(palette) ? 'unique' : 'vivid').dark;
  return rampe.map((cran, rang) => ({ cran: crans[rang], hexa: M.ecrireHexa(cran.couleur), L: +L(M, cran.couleur).L.toFixed(3), C: +L(M, cran.couleur).C.toFixed(3) }));
}

/** Le plus grand saut de clarté entre deux crans voisins, de 500 à 950. */
const plusGrandSaut = (rampe: { cran: number; L: number }[]) => Math.max(...rampe.slice(5).map((c, i) => (i === 0 ? 0 : c.L - rampe[4 + i].L)));

function promesses(M: typeof A, recette: Recette, palette: Palette) {
  return new Map(M.verifierPromesses(recette, palette).map((p) => [M.cleDeLaPromesse(p), p.verdict]));
}

function jeu(titre: string, recette: Recette, detail: boolean) {
  let perdues = 0, gagnees = 0;
  const changements: string[] = [];
  const rampes: Record<string, unknown> = {};
  for (const palette of recette.palettes) {
    const [avant, apres] = [promesses(A, recette, palette), promesses(B, recette, palette)];
    for (const [cle, verdict] of avant) {
      const v = apres.get(cle);
      if (verdict === 'tenue' && v !== 'tenue') { perdues += 1; changements.push(`${nom(palette)} perd ${cle}`); }
      if (verdict !== 'tenue' && v === 'tenue') { gagnees += 1; changements.push(`${nom(palette)} gagne ${cle}`); }
    }
    if (detail) {
      const [ra, rb] = [rampeDark(A, recette, palette), rampeDark(B, recette, palette)];
      rampes[nom(palette)] = { sautMaxAvant: +plusGrandSaut(ra).toFixed(3), sautMaxApres: +plusGrandSaut(rb).toFixed(3), avant: ra, apres: rb };
    }
  }
  const paires = (M: typeof A) => M.pairesTropProches(recette).map((p) => p.palettes.map((id) => nom(recette.palettes.find((x) => x.id === id)!)).join(' et '));
  return { titre, perdues, gagnees, changements, pairesAvant: paires(A), pairesApres: paires(B), rampes };
}

const resultat: Record<string, unknown> = {
  tailwind: jeu('Tailwind 3.4, couleurs 500', recetteDe(TAILWIND), true),
  galerie: jeu('Les vingt palettes de la galerie', recetteDe(GALERIE), false),
};
if (process.argv[2]) {
  const recette = (A.classerRecette(readFileSync(process.argv[2], 'utf8')) as { recette?: Recette }).recette!;
  resultat.mainteneur = jeu('Recette du mainteneur', recette, true);
}
console.log(JSON.stringify(resultat, null, 1));
}

void principal();
