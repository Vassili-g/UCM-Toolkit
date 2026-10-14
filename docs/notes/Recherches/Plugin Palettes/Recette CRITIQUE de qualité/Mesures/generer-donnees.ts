/**
 * Écrit les données des maquettes (`../Maquettes/donnees-qualite.js`) et les
 * mesures des variantes (`MESURES-VARIANTES.json`).
 */
import { writeFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import { rampesDe } from '../../../../../../packages/couleur/src/palette';
import { contraste } from '../../../../../../packages/kit/src/emplois/contraste';
import { GARANTIES } from '../../../../../../packages/kit/src/emplois/garanties';
import { TABLE_DES_DOSSIERS, sensDuTheme } from '../../../../../../packages/kit/src/emplois/dossiers';
import { RECETTE_REELLE, RELEVE, UTILITAIRES, VARIANTES, lire, paletteNommee } from './variantes';

const crans = RECETTE_REELLE.crans;
const titanium = rampesDe(RECETTE_REELLE, paletteNommee(RECETTE_REELLE, 'Titanium')).unique!;
const supports = {
  light: { page: titanium.light[0].hexa, raised: '#FFFFFF' },
  dark: { page: titanium.dark[0].hexa, raised: titanium.dark[1].hexa },
};

const lch = (hexa: string) => rgb8VersOklch(lireHexa(hexa)!);
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const ct = (a: string, b: string) => contraste(lireHexa(a)!, lireHexa(b)!);

const donnees: Record<string, unknown> = { crans, supports, texteDesBoutons: RECETTE_REELLE.texteDesBoutons, table: TABLE_DES_DOSSIERS };
const variantes: Record<string, unknown> = {};
const mesures: Record<string, unknown> = {};

for (const variante of VARIANTES) {
  const palettes: Record<string, unknown> = {};
  for (const nom of UTILITAIRES) {
    const rampes = variante.rampes(paletteNommee(RECETTE_REELLE, nom));
    palettes[nom] = Object.fromEntries((['soft', 'vivid'] as const).map((i) => [i, {
      light: rampes[i]!.light.map((c) => c.hexa),
      dark: rampes[i]!.dark.map((c) => c.hexa),
    }]));
  }
  palettes.Titanium = { soft: { light: titanium.light.map((c) => c.hexa), dark: titanium.dark.map((c) => c.hexa) } };
  palettes.Titanium = { ...(palettes.Titanium as object), vivid: (palettes.Titanium as { soft: unknown }).soft };
  variantes[variante.id] = { nom: variante.nom, resume: variante.resume, palettes };

  // Mesures : écarts entre les quatre utilitaires, chroma des textes, garanties.
  const parVue: Record<string, unknown> = {};
  for (const i of ['soft', 'vivid'] as const) for (const mode of ['light', 'dark'] as const) {
    const rampes = UTILITAIRES.map((nom) => (palettes[nom] as Record<string, Record<string, string[]>>)[i][mode]);
    const parCran = crans.map((cran, rang) => {
      const pts = rampes.map((r) => lch(r[rang]));
      const Cs = pts.map((p) => p.C);
      return { cran, ecartL: r3(Math.max(...pts.map((p) => p.L)) - Math.min(...pts.map((p) => p.L))), rapportC: r3(Math.max(...Cs) / Math.max(1e-4, Math.min(...Cs))), C: Cs.map(r3) };
    });
    const sens = sensDuTheme(mode, RECETTE_REELLE.texteDesBoutons[mode]);
    const table = TABLE_DES_DOSSIERS[mode][sens] as Record<string, number | 'texteDesBoutons'>;
    const couleur = (r: string[], variable: string) => {
      const cran = table[variable];
      if (cran === 'texteDesBoutons') return RECETTE_REELLE.texteDesBoutons[mode] === 'blanc' ? '#FFFFFF' : '#000000';
      return r[crans.indexOf(cran)];
    };
    const echecs: string[] = [];
    rampes.forEach((r, k) => {
      for (const g of GARANTIES) for (const fond of g.fonds) for (const support of ['page', 'raised'] as const) {
        // Le kit sépare désormais la carte de la page dans G7 ; le banc juge la carte avec la page.
        if ('fondDeLaCarte' in fond) continue;
        const f = 'fondDeLaPage' in fond ? supports[mode][support] : couleur(r, fond.variable);
        if (!('fondDeLaPage' in fond) && support === 'raised') continue;
        const valeur = ct(couleur(r, g.premier.variable), f);
        const seuil = g.seuil === 'texte' ? 4.5 : 3;
        if (valeur < seuil) echecs.push(`${UTILITAIRES[k]} G${g.numero} ${g.premier.variable} / ${'fondDeLaPage' in fond ? support : fond.variable} ${valeur.toFixed(2)}`);
      }
    });
    const surface = (variable: string) => rampes.map((r) => ({ page: r3(ct(couleur(r, variable), supports[mode].page)), raised: r3(ct(couleur(r, variable), supports[mode].raised)) }));
    parVue[`${i}-${mode}`] = { sens, parCran, echecs, surfaceContreSupports: surface('surface/default') };
  }
  mesures[variante.id] = parVue;
}

// Distance à Tailwind en Light : la rampe de Tailwind la plus proche en teinte au cran 600.
const tailwind = lire('./references/tailwind-3.4.17.json') as Record<string, Record<string, string>>;
const plusProche = (H: number) => RELEVE.map((r) => ({ nom: r.nom, d: Math.abs(((r.points[6].H - H + 540) % 360) - 180) })).sort((a, b) => a.d - b.d)[0].nom;
const distances: Record<string, unknown> = {};
for (const variante of VARIANTES) {
  const parPalette: Record<string, unknown> = {};
  for (const nom of UTILITAIRES) for (const i of ['soft', 'vivid'] as const) {
    const r = ((variantes[variante.id] as { palettes: Record<string, Record<string, Record<string, string[]>>> }).palettes[nom])[i].light;
    const temoin = plusProche(lch(r[6]).H);
    const ecarts = crans.map((cran, rang) => r3(lch(r[rang]).C - lch(tailwind[temoin][String(cran)]).C));
    parPalette[`${nom}-${i}`] = { temoin, ecartsC: ecarts, moyenneAbsolue: r3(ecarts.reduce((s, x) => s + Math.abs(x), 0) / ecarts.length) };
  }
  distances[variante.id] = parPalette;
}

const radix = lire('./references/radix-colors-3.0.0.json') as Record<string, string[]>;
donnees.variantes = variantes;
// Le résumé que la maquette affiche : rapport de chroma et écart de clarté entre les quatre utilitaires, échecs, distance à Tailwind.
donnees.mesures = Object.fromEntries(VARIANTES.map((variante) => {
  const m = mesures[variante.id] as Record<string, { parCran: { cran: number; rapportC: number; ecartL: number }[]; echecs: string[] }>;
  const vues = Object.fromEntries(Object.entries(m).map(([vue, x]) => [vue, {
    rapportC: Math.max(...x.parCran.filter((c) => c.cran <= 300 || c.cran >= 700).map((c) => c.rapportC)),
    ecartL: Math.max(...x.parCran.map((c) => c.ecartL)),
    echecs: x.echecs.length,
  }]));
  const d = distances[variante.id] as Record<string, { moyenneAbsolue: number }>;
  return [variante.id, { vues, distanceTailwind: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.moyenneAbsolue])) }];
}));
donnees.temoins = {
  tailwind: Object.fromEntries(['red', 'amber', 'green', 'sky', 'gray'].map((n) => [n, Object.values(tailwind[n])])),
  radix: Object.fromEntries(['red', 'amber', 'grass', 'blue'].flatMap((n) => [[`${n}Dark`, radix[`${n}Dark`]], [`${n}DarkA`, radix[`${n}DarkA`]], [`${n}Light`, radix[`${n}Light`]]])),
};
writeFileSync(new URL('../Maquettes/donnees-qualite.js', import.meta.url), `// Généré par Mesures/generer-donnees.ts ; ne pas modifier à la main.\nwindow.DONNEES = ${JSON.stringify(donnees)};\n`);
writeFileSync(new URL('./MESURES-VARIANTES.json', import.meta.url), `${JSON.stringify({ supports, mesures, distances }, null, 1)}\n`);

for (const variante of VARIANTES) {
  const m = mesures[variante.id] as Record<string, { parCran: { cran: number; rapportC: number; ecartL: number }[]; echecs: string[] }>;
  const d = distances[variante.id] as Record<string, { moyenneAbsolue: number }>;
  const ligne = (vue: string) => {
    const p = m[vue].parCran;
    const pire = Math.max(...p.filter((x) => x.cran <= 300 || x.cran >= 700).map((x) => x.rapportC));
    return `${vue} rapportC max ${pire.toFixed(1)} écartL max ${Math.max(...p.map((x) => x.ecartL)).toFixed(3)} échecs ${m[vue].echecs.length}`;
  };
  console.log(`\n${variante.nom}`);
  for (const vue of ['soft-light', 'vivid-light', 'soft-dark', 'vivid-dark']) console.log('  ', ligne(vue));
  console.log('   |ΔC| moyen à Tailwind :', Object.entries(d).map(([k, v]) => `${k} ${v.moyenneAbsolue}`).join(' · '));
}
