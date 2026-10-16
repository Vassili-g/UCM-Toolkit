#!/usr/bin/env node
/**
 * Rejoue les mesures de REVUE-CRITIQUE-TROIS-ETAPES.md, sur la recette par
 * défaut et avec les données de generer-proposition-trois-etapes.mjs :
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/05 Revue critique/mesurer-revue-critique.mjs"
 *
 * Une nuance reprise se juge comme une retouche : le contraste des paires est
 * recalculé sur sa valeur, sans toucher au moteur.
 */
import {
  atteintLeSeuil,
  contraste,
  ecrireHexa,
  lireHexa,
  rampesDe,
  recetteParDefaut,
  verifierPromesses,
} from '../../../../../../packages/couleur/src/index.ts';
import { nouvellePalette } from '../../../../../../packages/plugin-palettes/src/edition.ts';

const R = recetteParDefaut();
const CRANS = R.crans;
const cle = (profil, mode, cran) => `${profil}/${mode}/${cran}`;
const palette = (hexa, intensites, id) => {
  const p = nouvellePalette(R, id, hexa, intensites);
  return { p, recette: { ...R, palettes: [p] } };
};
const manquees = (pal, reprises = {}) =>
  verifierPromesses(pal.recette, pal.p).filter((x) => {
    const couleur = (m) => (m.nature === 'cran' && reprises[cle(x.profil, x.mode, m.cran)] ? lireHexa(reprises[cle(x.profil, x.mode, m.cran)]) : m.couleur);
    return !atteintLeSeuil(contraste(couleur(x.premier), couleur(x.second)), x.seuil);
  });
const voisines = (hexas) => hexas.slice(1).map((h, i) => contraste(lireHexa(hexas[i]), lireHexa(h)).toFixed(2)).join(' ');

// La rampe de Bleu A faite à l'œil, Thème Light, celle de la proposition d'expérience.
const OEIL = ['#E8F1FD', '#C7DCFA', '#9DC2F6', '#6FA5F0', '#4A8EEA', '#3480E6', '#1E6FD9', '#1B63C4', '#1856A9', '#134385', '#0D2E5C'];
const bleu = palette('#1E6FD9', 1, 'p-00000001');
const calculee = rampesDe(bleu.recette, bleu.p).unique.light.map((c) => ecrireHexa(c.couleur));
const reprises = Object.fromEntries(OEIL.map((h, i) => [cle('unique', 'light', CRANS[i]), h]).filter(([, h], i) => h !== calculee[i]));
const cles = Object.keys(reprises);

// Recherche exhaustive : 2^10 ensembles de nuances à rétablir.
let minimum = null;
for (let masque = 0; masque < 1 << cles.length; masque++) {
  const essai = { ...reprises };
  const retablies = cles.filter((_, i) => masque & (1 << i));
  for (const k of retablies) delete essai[k];
  if (manquees(bleu, essai).length === 0 && (!minimum || retablies.length < minimum.length)) minimum = retablies;
}
const retablies = minimum.map((k) => Number(k.split('/')[2]));
const corrigee = OEIL.map((h, i) => (retablies.includes(CRANS[i]) ? calculee[i] : h));

console.log(`Bleu A à l'œil : ${manquees(bleu, reprises).length} garanties manquées, ${manquees(bleu).length} pour la rampe calculée`);
console.log(`Plus petite correction exacte : ${retablies.join(', ')}`);
console.log('Contraste entre nuances voisines, de 50/100 à 900/950 :');
console.log(`  à l'œil    ${voisines(OEIL)}`);
console.log(`  corrigée   ${voisines(corrigee)}`);
console.log(`  calculée   ${voisines(calculee)}`);

const vert = palette('#16A34A', 2, 'p-00000004');
console.log(`Vert calculé : ${manquees(vert).length} garanties manquées, ${[...new Set(manquees(vert).map((x) => `${x.profil} ${x.mode}`))].join(', ')}`);

// Les valeurs que l'intensité Soft à 0,50 change, palette par palette.
const hexas = (recette, p) => Object.values(rampesDe({ ...recette, palettes: [p] }, p)).flatMap((m) => [...m.light, ...m.dark].map((c) => ecrireHexa(c.couleur)));
const soft = { ...R, profils: { ...R.profils, soft: { part: 0.5 } } };
for (const [nom, hexa, n] of [['Rouge', '#DC2626', 2], ['Ambre', '#D97706', 2], ['Vert', '#16A34A', 2], ['Azur', '#2563EB', 2], ['Bleu A', '#1E6FD9', 1]]) {
  const p = nouvellePalette(R, 'p-0000000a', hexa, n);
  const avant = hexas(R, p);
  const apres = hexas(soft, p);
  console.log(`Soft à 0,50, ${nom} : ${avant.filter((h, i) => h !== apres[i]).length} valeurs changent`);
}
