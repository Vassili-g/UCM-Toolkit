/**
 * Les données du panneau de VUE-ILLUSTREE-MULTIMARQUES.html (`donnees-vue-illustree.js`).
 *
 * Aujourd'hui : `theme`, `color-brands` et `color-utilities` tels que l'export du fichier Figma
 * du mainteneur les porte ; `primitives` tel que le moteur le calcule aujourd'hui sur sa recette
 * (l'export précède la courbe inversée, que la recette applique depuis).
 *
 * Demain : le même fichier après les décisions de la recette critique de qualité. `theme` suit la
 * table par thème (fonds teintés Dark 300, 400, 500, texte 950) et `ring` remplace `page/focus` ;
 * `primitives` sort de la règle retenue (`REGLE_FINALE`), sur la recette du mainteneur où « Par
 * défaut » a été choisi pour les intensités, avec le cran 50 Dark à 0,145 et la page Dark `#0A0A0A`.
 *
 * Usage : npx tsx generer-vue-illustree.ts <export tokens.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { rampesDe } from '../../../../packages/couleur/src/palette';
import type { Recette } from '../../../../packages/couleur/src/recette';
import { rampesDuBanc } from '../Plugin Palettes/Recette CRITIQUE de qualité/Mesures/prototype';
import { REGLE_FINALE, RECETTE_REELLE, valider } from '../Plugin Palettes/Recette CRITIQUE de qualité/Mesures/variantes';

const chemin = process.argv[2];
if (!chemin) throw new Error('Usage : npx tsx generer-vue-illustree.ts <export tokens.json>');
const exportFigma = JSON.parse(readFileSync(chemin, 'utf8'));

type Valeur = string | Record<string, string>;
type Collection = Record<string, Valeur>;

const hexa = (c: { components: number[] }) => `#${c.components.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const lireValeur = (v: unknown): string => (typeof v === 'string' ? v.replace(/^\{|\}$/g, '') : hexa(v as { components: number[] }));

/** Les variables de couleur d'une collection de l'export, chemin → valeur, ou valeur par mode. */
function collection(nom: string): Collection {
  const sortie: Collection = {};
  const parcourir = (noeud: Record<string, unknown>, chemin: string[]) => {
    if ('$value' in noeud) {
      if (noeud.$type !== 'color') return;
      const modes = (noeud.$extensions as { 'com.ucm.modes'?: Record<string, unknown> } | undefined)?.['com.ucm.modes'];
      sortie[chemin.join('.')] = modes && nom !== 'primitives'
        ? Object.fromEntries(Object.entries(modes).map(([m, v]) => [m, lireValeur(v)]))
        : lireValeur(noeud.$value);
      return;
    }
    for (const [cle, enfant] of Object.entries(noeud)) if (!cle.startsWith('$')) parcourir(enfant as Record<string, unknown>, [...chemin, cle]);
  };
  parcourir(exportFigma[nom], [nom]);
  return sortie;
}

/** `primitives.colors` d'une recette, aux chemins de l'export. */
function primitives(recette: Recette, rampes: (p: Recette['palettes'][number]) => Record<string, Record<'light' | 'dark', { hexa: string }[]>>): Collection {
  const sortie: Collection = {};
  for (const palette of recette.palettes) {
    const nom = palette.nom.toLowerCase();
    for (const [intensite, modes] of Object.entries(rampes(palette))) {
      for (const mode of ['light', 'dark'] as const) {
        modes[mode].forEach((cran, rang) => {
          const segments = intensite === 'unique' ? [nom, mode] : [nom, intensite, mode];
          sortie[['primitives', 'colors', ...segments, recette.crans[rang]].join('.')] = cran.hexa;
        });
      }
    }
  }
  sortie['primitives.colors.titanium.white'] = '#FFFFFF';
  sortie['primitives.colors.titanium.black'] = '#000000';
  return sortie;
}

const RECETTE_DEMAIN = valider({
  ...RECETTE_REELLE,
  profils: { soft: { part: 0.85 }, vivid: { part: 0.95 } },
  courbes: { ...RECETTE_REELLE.courbes, dark: [0.145, ...RECETTE_REELLE.courbes.dark.slice(1)] },
  fonds: { ...RECETTE_REELLE.fonds, dark: '#0A0A0A' },
});

/** La table retenue, par thème : ce qui change par rapport à celle d'aujourd'hui. */
const CRANS_DARK: Record<string, number> = {
  'surface.default': 300, 'surface.hover': 400, 'surface.pressed': 500, 'surface.foreground': 950, 'surface.border': 950,
};
const recranter = (alias: string, cran: number) => alias.replace(/\.\d+$/, `.${cran}`);

function themeDemain(theme: Collection): Collection {
  const sortie: Collection = {};
  for (const [chemin, valeur] of Object.entries(theme)) {
    const modes = valeur as Record<string, string>;
    const fin = chemin.split('.').slice(-2).join('.');
    if (fin === 'page.focus') {
      // ring remplace page/focus, à la racine de la palette, aux mêmes crans.
      sortie[chemin.replace(/\.page\.focus$/, '.ring')] = { ...modes };
      continue;
    }
    sortie[chemin] = fin in CRANS_DARK ? { ...modes, dark: recranter(modes.dark, CRANS_DARK[fin]) } : { ...modes };
  }
  return sortie;
}

const theme = collection('theme');
const donnees = {
  modes: { theme: ['light', 'dark'], 'color-brands': exportFigma.$extensions['com.ucm.axes']['color-brands'].modes },
  aujourdhui: {
    theme,
    'color-brands': collection('color-brands'),
    'color-utilities': collection('color-utilities'),
    primitives: primitives(RECETTE_REELLE, (p) => rampesDe(RECETTE_REELLE, p) as never),
  },
  demain: {
    theme: themeDemain(theme),
    'color-brands': collection('color-brands'),
    'color-utilities': collection('color-utilities'),
    primitives: primitives(RECETTE_DEMAIN, (p) => rampesDuBanc(RECETTE_DEMAIN, p, REGLE_FINALE) as never),
  },
};

writeFileSync(new URL('./donnees-vue-illustree.js', import.meta.url),
  `// Généré par generer-vue-illustree.ts ; ne pas modifier à la main.\nwindow.VUE_DONNEES = ${JSON.stringify(donnees)};\n`);
console.log(Object.fromEntries(Object.entries(donnees.demain).map(([c, v]) => [c, Object.keys(v).length])));
