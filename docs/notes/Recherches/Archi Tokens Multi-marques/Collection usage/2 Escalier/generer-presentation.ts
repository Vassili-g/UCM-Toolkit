/**
 * Écrit les rampes du moteur dans PRESENTATION-NIVEAUX-ET-TEXTE-DES-BOUTONS.html, pour que
 * les maquettes peignent les couleurs calculées et non des valeurs recopiées.
 *
 * npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/2 Escalier/generer-presentation.ts"
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  ancrageDe, boutsDe, ecrireHexa, fabriquerCran, lireHexa, prereglageTailwind, rampesDe,
  recetteParDefaut, rgb8VersOklch, type Mode, type Palette,
} from '../../../../../../packages/couleur/src/index';

const recette = recetteParDefaut();
const modes: Mode[] = ['light', 'dark'];

/** Les couleurs de marque du Playground, puis deux statuts qui éprouvent la règle. */
const references = [
  { id: 'intencial-primaire', role: 'primary', nom: 'Intencial, primaire', reference: '#B15152' },
  { id: 'intencial-secondaire', role: 'secondary', nom: 'Intencial, secondaire', reference: '#4C3EBA' },
  { id: 'marque2-primaire', role: 'primary', nom: 'Marque 2, primaire', reference: '#0EA5E9' },
  { id: 'marque2-secondaire', role: 'secondary', nom: 'Marque 2, secondaire', reference: '#F43F5E' },
  { id: 'succes', role: 'success', nom: 'Statut succès, vert', reference: '#16A34A' },
  { id: 'avertissement', role: 'warning', nom: 'Statut avertissement, jaune', reference: '#EAB308' },
];

const palettes = references.map(({ id, role, nom, reference }) => {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const palette: Palette = {
    id, reference, intensites: 1,
    derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
  };
  const rampe = rampesDe(recette, palette).unique!;
  return {
    id, role, nom, reference,
    ancrage: ancrageDe(recette, palette).crans,
    light: rampe.light.map((cran) => cran.hexa),
    dark: rampe.dark.map((cran) => cran.hexa),
  };
});

const neutre = Object.fromEntries(modes.map((mode) =>
  [mode, recette.courbes[mode].map((L) => ecrireHexa(fabriquerCran(L, 0, 0, recette.gamut).couleur))]));

const donnees = { crans: recette.crans, fonds: recette.fonds, neutre, palettes };
const page = new URL('./PRESENTATION-NIVEAUX-ET-TEXTE-DES-BOUTONS.html', import.meta.url);
const html = readFileSync(page, 'utf8');
const ouverture = '<script id="donnees" type="application/json">';
const debut = html.indexOf(ouverture) + ouverture.length;
const fin = html.indexOf('</script>', debut);
if (debut < ouverture.length || fin < 0) throw new Error('Bloc de données introuvable dans la présentation.');
writeFileSync(page, `${html.slice(0, debut)}${JSON.stringify(donnees)}${html.slice(fin)}`);
console.log(palettes.map((p) => `${p.nom} ${p.reference} ancrée ${p.ancrage.light}/${p.ancrage.dark}`).join('\n'));
