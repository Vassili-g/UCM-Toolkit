/**
 * Écrit les rampes du moteur dans ARCHITECTURE-PROPOSEE.html : les palettes de
 * la vue illustrée (VUE-ILLUSTREE-MULTIMARQUES.html), avec la courbe normale
 * et la courbe du thème inversé que propose le dossier du texte des boutons,
 * section 5.2.
 *
 * npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/generer-vue-architecture.ts"
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  boutsDe, ecrireHexa, fabriquerCran, lireHexa, prereglageTailwind, rampesDe,
  recetteParDefaut, rgb8VersOklch, type Palette, type Recette,
} from '../../../../../packages/couleur/src/index';

const base = recetteParDefaut();
const crans = base.crans;
const avec = (courbe: readonly number[], valeurs: Record<number, number>) => courbe.map((L, i) => valeurs[crans[i]] ?? L);
const inverse: Recette = {
  ...base,
  courbes: {
    light: avec(base.courbes.light, { 500: 0.71, 600: 0.66, 700: 0.58 }),
    dark: avec(base.courbes.dark, { 500: 0.45, 600: 0.5, 700: 0.55, 800: 0.7 }),
  },
};

/** Les palettes de la vue illustrée : deux par marque, puis les quatre statuts. */
const references: { nom: string; reference: string; intensites: 1 | 2 }[] = [
  { nom: 'terracota', reference: '#B15152', intensites: 1 },
  { nom: 'deep', reference: '#4C3EBA', intensites: 1 },
  { nom: 'sky', reference: '#0EA5E9', intensites: 1 },
  { nom: 'rose', reference: '#F43F5E', intensites: 1 },
  { nom: 'mimosa', reference: '#F2CF4A', intensites: 1 },
  { nom: 'ardoise', reference: '#2F3E5C', intensites: 1 },
  { nom: 'grass', reference: '#22C55E', intensites: 2 },
  { nom: 'orange', reference: '#F97316', intensites: 2 },
  { nom: 'blue', reference: '#3B82F6', intensites: 2 },
  { nom: 'poppy', reference: '#EF4444', intensites: 2 },
];

function rampes(recette: Recette, nom: string, reference: string, intensites: 1 | 2) {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const rangee = { ...derive, origine: 'tailwind' as const };
  const palette: Palette = { id: nom, reference, derive: { lien: true, soft: rangee, vivid: rangee } };
  const toutes = rampesDe(recette, intensites === 1 ? { ...palette, intensites: 1 } : palette);
  return Object.fromEntries(Object.entries(toutes).map(([intensite, r]) =>
    [intensite, { light: r!.light.map((c) => c.hexa), dark: r!.dark.map((c) => c.hexa) }]));
}

const palettes: Record<string, Record<string, unknown>> = Object.fromEntries(references.map(({ nom, reference, intensites }) => {
  const normale = rampes(base, nom, reference, intensites);
  const inversee = rampes(inverse, nom, reference, intensites);
  const parIntensite = Object.fromEntries(Object.keys(normale).map((i) => [i, {
    light: normale[i].light, dark: normale[i].dark, lightInverse: inversee[i].light, darkInverse: inversee[i].dark,
  }]));
  return [nom, { reference, ...parIntensite }];
}));

const gris = (courbe: readonly number[]) => courbe.map((L) => ecrireHexa(fabriquerCran(L, 0, 0, base.gamut).couleur));
palettes.titanium = {
  reference: '#808080',
  unique: { light: gris(base.courbes.light), dark: gris(base.courbes.dark), lightInverse: gris(inverse.courbes.light), darkInverse: gris(inverse.courbes.dark) },
};

const page = new URL('./ARCHITECTURE-PROPOSEE.html', import.meta.url);
const html = readFileSync(page, 'utf8');
const ouverture = '<script id="donnees" type="application/json">';
const debut = html.indexOf(ouverture) + ouverture.length;
const fin = html.indexOf('</script>', debut);
if (debut < ouverture.length || fin < 0) throw new Error('Bloc de données introuvable dans la page.');
writeFileSync(page, `${html.slice(0, debut)}${JSON.stringify({ crans, palettes })}${html.slice(fin)}`);
console.log(Object.entries(palettes).map(([nom, p]) => `${nom} : ${Object.keys(p).filter((k) => k !== 'reference').join(', ')}`).join('\n'));
