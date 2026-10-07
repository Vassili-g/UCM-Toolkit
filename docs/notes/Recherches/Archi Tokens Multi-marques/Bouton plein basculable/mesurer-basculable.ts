/**
 * Mesures de recherche : les fonds candidats d'un bouton plein basculable,
 * activé au repos et activé survolé, sur la table en dossiers. Pour chaque
 * thème, normal et inversé, le script mesure l'écart de couleur entre deux
 * fonds voisins (ΔEok) et le contraste du texte des boutons sur chaque fond
 * candidat, sur les quatorze références de la collection usage, à une et
 * deux intensités. La nuance où la référence est ancrée se compte à part.
 * Le script écrit MESURES-BASCULABLE.json.
 *
 * Depuis la racine du dépôt :
 * npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/Bouton plein basculable/mesurer-basculable.ts"
 */
import { writeFileSync } from 'node:fs';

import {
  ancrageDe,
  boutsDe,
  contraste,
  distanceOk,
  intensitesDe,
  lireHexa,
  prereglageTailwind,
  rampeDe,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
  type Mode,
  type Palette,
  type Recette,
  type Rgb8,
} from '../../../../../packages/couleur/src/index';

const base = recetteParDefaut();
const crans = base.crans;
const rang = (cran: number): number => crans.indexOf(cran);
const BLANC: Rgb8 = [255, 255, 255];
const NOIR: Rgb8 = [0, 0, 0];

const REFERENCES = [
  '#1E6FD9', '#2563EB', '#D94635', '#DC2626', '#EAB308', '#FACC15', '#16A34A',
  '#9333EA', '#06B6D4', '#737373', '#808080', '#8B8178', '#F5F5F5', '#171717',
];

const avec = (courbe: readonly number[], valeurs: Record<number, number>) => courbe.map((L, i) => valeurs[crans[i]] ?? L);
const COURBE_INVERSEE: Record<Mode, readonly number[]> = {
  dark: avec(base.courbes.dark, { 500: 0.45, 600: 0.5, 700: 0.55, 800: 0.7 }),
  light: avec(base.courbes.light, { 500: 0.745, 600: 0.69, 700: 0.61 }),
};

/** Un thème : les trois fonds de `solid` (default, hover, pressed) et le fond suivant, candidat de l'état activé survolé. */
interface Theme {
  readonly nom: string;
  readonly mode: Mode;
  readonly courbe: readonly number[];
  readonly texteDesBoutons: Rgb8;
  readonly etats: readonly [number, number, number];
  readonly suivant: number;
}

const THEMES: Theme[] = [
  { nom: 'Light, texte blanc', mode: 'light', courbe: base.courbes.light, texteDesBoutons: BLANC, etats: [700, 800, 900], suivant: 950 },
  { nom: 'Dark, texte noir', mode: 'dark', courbe: base.courbes.dark, texteDesBoutons: NOIR, etats: [700, 800, 900], suivant: 950 },
  { nom: 'Light inversé, texte noir', mode: 'light', courbe: COURBE_INVERSEE.light, texteDesBoutons: NOIR, etats: [700, 600, 500], suivant: 400 },
  { nom: 'Dark inversé, texte blanc', mode: 'dark', courbe: COURBE_INVERSEE.dark, texteDesBoutons: BLANC, etats: [700, 600, 500], suivant: 400 },
];

function paletteDe(recette: Recette, reference: string, index: number, intensites: 1 | 2): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const rangee = { ...derive, origine: 'tailwind' as const };
  const palette: Palette = { id: `p-${index.toString(16).padStart(8, '0')}`, reference, derive: { lien: true, soft: rangee, vivid: rangee } };
  return intensites === 1 ? { ...palette, intensites: 1 } : palette;
}

interface Rampe { readonly nom: string; readonly couleurs: readonly Rgb8[]; readonly ancre: number | null }

function rampesDuTheme(theme: Theme): Rampe[] {
  const recette: Recette = { ...base, courbes: { ...base.courbes, [theme.mode]: [...theme.courbe] } };
  const rampes: Rampe[] = [];
  REFERENCES.forEach((reference, index) => {
    for (const intensites of [2, 1] as const) {
      const palette = paletteDe(recette, reference, index * 2 + (intensites === 1 ? 1 : 0), intensites);
      const toutes = rampesDe(recette, palette);
      const ancre = ancrageDe(recette, palette);
      for (const profil of intensitesDe(palette)) {
        rampes.push({
          nom: `${reference} ${intensites === 1 ? 'une intensité' : profil}`,
          couleurs: rampeDe(toutes, profil)[theme.mode].map((cran) => cran.couleur),
          ancre: profil === ancre.profil ? ancre.crans[theme.mode] : null,
        });
      }
    }
  });
  return rampes;
}

/** Le minimum d'une série de valeurs, et où il tombe. */
function minimum(valeurs: { x: number; ou: string }[]): { minimum: number; pire: string; mediane: number } {
  const triees = [...valeurs].sort((a, b) => a.x - b.x);
  return { minimum: Number(triees[0].x.toFixed(3)), pire: triees[0].ou, mediane: Number(triees[Math.floor(triees.length / 2)].x.toFixed(3)) };
}

const resultats = THEMES.map((theme) => {
  const rampes = rampesDuTheme(theme);
  const [repos, survol, appui] = theme.etats;
  const ecart = (a: number, b: number) => minimum(rampes.map((r) => ({ x: distanceOk(r.couleurs[rang(a)], r.couleurs[rang(b)]), ou: r.nom })));
  const texte = (cran: number) => {
    const hors = rampes.filter((r) => r.ancre !== cran);
    return { ...minimum(hors.map((r) => ({ x: contraste(theme.texteDesBoutons, r.couleurs[rang(cran)]), ou: r.nom }))), echecs: hors.filter((r) => contraste(theme.texteDesBoutons, r.couleurs[rang(cran)]) < 4.5).length, mesures: hors.length };
  };
  return {
    theme: theme.nom,
    ecarts: {
      [`repos ${repos} → survol ${survol}`]: ecart(repos, survol),
      [`survol ${survol} → appui ${appui}`]: ecart(survol, appui),
      [`appui ${appui} → suivant ${theme.suivant}`]: ecart(appui, theme.suivant),
      [`repos ${repos} → appui ${appui}`]: ecart(repos, appui),
      // Dans le thème inversé, la 400 colle à la 500 : le saut à la 300 est l'autre candidat.
      ...(theme.suivant === 400 ? { [`appui ${appui} → 300`]: ecart(appui, 300) } : {}),
    },
    texteDesBoutons: { [String(appui)]: texte(appui), [String(theme.suivant)]: texte(theme.suivant), ...(theme.suivant === 400 ? { '300': texte(300) } : {}) },
  };
});

const sortie = {
  protocole: 'Recette par défaut, préréglage Tailwind, quatorze références à une et deux intensités. ΔEok entre deux fonds de la même rampe ; contraste du texte des boutons, blanc ou noir purs, hors nuance ancrée. Seuil 4,5.',
  resultats,
};
writeFileSync(new URL('./MESURES-BASCULABLE.json', import.meta.url), `${JSON.stringify(sortie, null, 2)}\n`);
for (const r of resultats) {
  console.log(`\n== ${r.theme}`);
  for (const [k, v] of Object.entries(r.ecarts)) console.log(`  ΔEok ${k} : min ${v.minimum} (${v.pire}), médiane ${v.mediane}`);
  for (const [k, v] of Object.entries(r.texteDesBoutons)) console.log(`  texte des boutons sur ${k} : min ${v.minimum} (${v.pire}), échecs ${v.echecs}/${v.mesures}`);
}
