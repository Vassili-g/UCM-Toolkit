#!/usr/bin/env node
/**
 * Mesure ce qui sépare quatre palettes utilitaires fabriquées par le moteur
 * avec la recette par défaut : leurs parts, puis la clarté et la chroma des
 * nuances de quatre emplois, par intensité et par thème.
 *
 *   npx tsx "docs/notes/Recherches/Plugin Palettes/Harmonisation entre palettes/mesurer-ecarts.mjs"
 *
 * Aucun test ne porte ces chiffres : le plan de recherche les cite.
 */
import {
  MODES,
  PROFILS,
  ancrageDe,
  boutsDe,
  lireHexa,
  partsDe,
  plafond,
  prereglageTailwind,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
} from '../../../../../packages/couleur/src/index.ts';

const REFERENCES = [
  ['danger', '#DC2626'],
  ['warning', '#F59E0B'],
  ['success', '#16A34A'],
  ['info', '#2563EB'],
];

/** Les nuances lues : `surface-card`, `surface`, `border-decorative` et `solid`. */
const NUANCES = [50, 100, 300, 700];

const base = recetteParDefaut();

function paletteNeuve(hexa, rang) {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(hexa)), boutsDe(base), base.derives);
  return {
    id: `p-0000000${rang}`,
    reference: hexa,
    derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
  };
}

const palettes = REFERENCES.map(([, hexa], rang) => paletteNeuve(hexa, rang + 1));
const recette = { ...base, palettes };

console.log('Parts et ancrage');
REFERENCES.forEach(([nom], rang) => {
  const palette = palettes[rang];
  const parts = partsDe(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  console.log(`  ${nom.padEnd(8)} soft ${parts.soft.toFixed(3)}  vivid ${parts.vivid.toFixed(3)}  porteur ${ancrage.profil}  nuance ${ancrage.crans.light} (Light), ${ancrage.crans.dark} (Dark)`);
});

/**
 * Le même Color shift de luminosité posé sur les quatre palettes : l'écart de
 * clarté qui reste entre elles, nuance par nuance, hors de la nuance ancrée.
 */
function ecartsSousLeMemeReglage(clarte) {
  const reglees = palettes.map((palette) => ({
    ...palette,
    derive: { lien: true, soft: { ...palette.derive.soft, clarte }, vivid: { ...palette.derive.vivid, clarte } },
  }));
  const reglee = { ...base, palettes: reglees };
  console.log(`\nMême Color shift de luminosité, clair ${clarte.clair}, sombre ${clarte.sombre} : clarté Light / Vivid par nuance`);
  const rampes = reglees.map((palette) => rampesDe(reglee, palette).vivid.light);
  const ancres = reglees.map((palette) => ancrageDe(reglee, palette).rangs.light);
  reglee.crans.forEach((nuance, rang) => {
    const clartes = rampes.map((rampe, i) => (ancres[i] === rang ? null : rampe[rang].L));
    const lues = clartes.filter((L) => L !== null);
    const texte = clartes.map((L) => (L === null ? '  ◆  ' : L.toFixed(3))).join('  ');
    console.log(`  ${String(nuance).padStart(4)}  ${texte}  écart ${(Math.max(...lues) - Math.min(...lues)).toFixed(3)}`);
  });
}

ecartsSousLeMemeReglage({ clair: -0.04, sombre: 0.04 });
ecartsSousLeMemeReglage({ clair: 0.02, sombre: -0.06 });

for (const mode of MODES) {
  for (const profil of PROFILS) {
    console.log(`\n${mode} / ${profil} : L, C, H, puis C rapportée au plafond sRGB de la nuance`);
    for (const nuance of NUANCES) {
      const rang = recette.crans.indexOf(nuance);
      const lues = REFERENCES.map(([nom], i) => {
        const cran = rampesDe(recette, palettes[i])[profil][mode][rang];
        const maximum = plafond(cran.L, cran.H, recette.gamut);
        return { nom, cran, part: maximum > 0 ? cran.C / maximum : 0 };
      });
      console.log(`  ${nuance}`);
      for (const { nom, cran, part } of lues) {
        console.log(`    ${nom.padEnd(8)} ${cran.hexa}  L ${cran.L.toFixed(3)}  C ${cran.C.toFixed(3)}  H ${cran.H.toFixed(0).padStart(3)}  part ${part.toFixed(2)}`);
      }
      const chromas = lues.map(({ cran }) => cran.C);
      const clartes = lues.map(({ cran }) => cran.L);
      console.log(`    écart de C ${(Math.max(...chromas) - Math.min(...chromas)).toFixed(3)}  rapport ${(Math.max(...chromas) / Math.min(...chromas)).toFixed(1)}  écart de L ${(Math.max(...clartes) - Math.min(...clartes)).toFixed(3)}`);
    }
  }
}
