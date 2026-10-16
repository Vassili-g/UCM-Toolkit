#!/usr/bin/env node
/**
 * Mesure ce qui sépare un groupe de palettes d'une recette exportée du
 * plugin, sur les variables du thème en dossiers : clarté, chroma et part de
 * chaque nuance, par thème et par intensité, la référence comprise et
 * signalée ◆. Puis les deux contrastes qu'un composant montre.
 *
 *   npx tsx "docs/notes/Recherches/Plugin Palettes/Harmonisation entre palettes/mesurer-ecarts.mjs" recette.json [--groupe Poppy,Orange,Grass,Sky] [--json mesures.json]
 *
 * La version du 2 octobre fabriquait quatre palettes avec la recette par
 * défaut et lisait les emplois d'avant les dossiers (commit 21850ab).
 */
import { writeFileSync } from 'node:fs';

import { MODES, PROFILS, VARIABLES, contrastesDe, etendue, f3, lireArguments, nuancesDe, paletteNommee } from './groupe.mjs';

const { recette, noms, json } = lireArguments(process.argv.slice(2));
const palettes = noms.map((nom) => paletteNommee(recette, nom));
const sortie = { groupe: noms, vues: [] };

for (const mode of MODES) {
  for (const profil of PROFILS) {
    const parPalette = palettes.map((palette) => nuancesDe(recette, palette, profil, mode));
    if (parPalette.some((nuances) => nuances === null)) continue;
    console.log(`\n== ${mode} / ${profil}   ${noms.join(' | ')}   ◆ référence`);
    const lignes = [];
    for (const variable of VARIABLES) {
      const lues = parPalette.map((nuances) => nuances[variable]);
      if (lues.some((lue) => !lue)) continue;
      const L = etendue(lues.map((lue) => ({ v: lue.L, reference: lue.reference })));
      const C = lues.map((lue) => lue.C);
      const cellules = lues.map((lue) => `${lue.reference ? '◆' : ' '}${lue.hexa} L${lue.L.toFixed(3)} C${lue.C.toFixed(3)} p${lue.part.toFixed(2)}`).join(' | ');
      console.log(`${variable.padEnd(19)}${String(lues[0].cran).padStart(4)}  ${cellules}   ΔL ${f3(L.toutes)} (hors ◆ ${f3(L.libres)}, n=${L.n})  C×${(Math.max(...C) / Math.min(...C)).toFixed(1)}`);
      lignes.push({ variable, cran: lues[0].cran, nuances: lues, ecartL: L, rapportC: Math.max(...C) / Math.min(...C) });
    }
    const contrastes = parPalette.map((nuances) => contrastesDe(recette, nuances, mode));
    console.log(`contraste surface/foreground sur surface/default : ${contrastes.map((c) => c.surface.toFixed(2)).join(' | ')}`);
    console.log(`contraste texte des boutons sur solid/default    : ${contrastes.map((c) => c.solid.toFixed(2)).join(' | ')}`);
    sortie.vues.push({ mode, profil, lignes, contrastes });
  }
}

if (json) writeFileSync(json, `${JSON.stringify(sortie, null, 2)}\n`);
