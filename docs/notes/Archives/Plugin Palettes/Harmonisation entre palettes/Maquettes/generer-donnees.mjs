#!/usr/bin/env node
/**
 * Les données des maquettes : les nuances du groupe sur les variables du
 * thème, avant et après deux propositions d'harmonisation de la luminosité,
 * et les promesses que chacune ferait manquer. Écrit `donnees.js` à côté.
 *
 *   npx tsx "docs/notes/Recherches/Plugin Palettes/Harmonisation entre palettes/Maquettes/generer-donnees.mjs" recette.json
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ancrageDe, cleDuPorteur, partsDe, rampesDe } from '../../../../../../packages/couleur/src/index.ts';
import { reglerClarte, reglerDecalage, remplacerPalette } from '../../../../../../packages/plugin-palettes/src/edition.ts';

import { MODES, PROFILS, etatDe, lireArguments, nuancesDe, paletteNommee } from '../groupe.mjs';

const { recette, noms } = lireArguments(process.argv.slice(2));
const palettes = noms.map((nom) => paletteNommee(recette, nom));

/** La palette dont la luminosité de `profil` prend `valeurs`, par les gestes du plugin. */
function avecLuminosite(palette, profil, valeurs) {
  let suivante = palette;
  if ((palette.reglages?.clarte?.[profil] ?? 0) !== valeurs.globale) suivante = reglerClarte(recette, suivante, profil, valeurs.globale);
  suivante = reglerDecalage(recette, suivante, profil, 'clarte', 'clair', valeurs.clair);
  return reglerDecalage(recette, suivante, profil, 'clarte', 'sombre', valeurs.sombre);
}

const luminositeDe = (palette, profil) => ({
  globale: palette.reglages?.clarte?.[profil] ?? 0,
  clair: palette.derive[profil]?.clarte?.clair ?? 0,
  sombre: palette.derive[profil]?.clarte?.sombre ?? 0,
});

/** Une proposition : chaque palette, chaque profil, reçoit les valeurs que `valeursDe` lui donne. */
function proposition(valeursDe) {
  return palettes.map((palette) => {
    let apres = palette;
    for (const profil of PROFILS) apres = avecLuminosite(apres, profil, valeursDe(palette, profil));
    const avant = etatDe(recette, palette);
    const etat = etatDe(remplacerPalette(recette, apres), apres);
    return {
      nom: palette.nom,
      reference: apres.reference,
      valeurs: Object.fromEntries(PROFILS.map((profil) => [profil, luminositeDe(apres, profil)])),
      manquees: etat.details.filter((_, i) => !avant.manquees.includes(etat.manquees[i])),
      vues: vuesDe(apres),
    };
  });
}

/** Les nuances des variables, par thème et intensité, plus la rampe entière pour les aplats. */
function vuesDe(palette) {
  const vues = {};
  for (const mode of MODES) {
    for (const profil of PROFILS) {
      vues[`${mode}/${profil}`] = {
        variables: nuancesDe(recette, palette, profil, mode),
        rampe: rampesDe(recette, palette)[profil][mode].map((cran) => ({ hexa: cran.hexa, L: cran.L, C: cran.C })),
      };
    }
  }
  return vues;
}

const modele = palettes[0];
const donnees = {
  source: process.argv[2].split(/[\\/]/).pop(),
  crans: recette.crans,
  texteDesBoutons: recette.texteDesBoutons,
  // Les aplats des cartes du nuancier, comme `aplatsDeLaCarte` : 200, la référence et 800, en Light.
  nuancier: recette.palettes.map((palette) => {
    const rampes = rampesDe(recette, palette);
    const rampe = (rampes.vivid ?? rampes.unique).light;
    const rang = (numero, repli) => (recette.crans.indexOf(numero) >= 0 ? recette.crans.indexOf(numero) : repli);
    return { nom: palette.nom, aplats: [rampe[rang(200, 1)].hexa, rampe[ancrageDe(recette, palette).rangs.light].hexa, rampe[rang(800, rampe.length - 2)].hexa] };
  }),
  avant: palettes.map((palette) => ({
    nom: palette.nom,
    reference: palette.reference,
    parts: partsDe(recette, palette),
    valeurs: Object.fromEntries(PROFILS.map((profil) => [profil, luminositeDe(palette, profil)])),
    vues: vuesDe(palette),
  })),
  // La luminosité globale du profil porteur reste : la changer déplacerait la référence (H5).
  courbe: proposition((palette, profil) => ({ globale: cleDuPorteur(recette, palette) === profil ? luminositeDe(palette, profil).globale : 0, clair: 0, sombre: 0 })),
  recopie: proposition((palette, profil) => (palette === modele ? luminositeDe(palette, profil) : luminositeDe(modele, profil))),
};

const ici = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(ici, 'donnees.js'), `// Produit par generer-donnees.mjs depuis ${donnees.source}. Ne pas modifier à la main.\nwindow.DONNEES = ${JSON.stringify(donnees)};\n`);
console.log('donnees.js écrit');
