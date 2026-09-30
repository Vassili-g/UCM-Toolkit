#!/usr/bin/env node
/**
 * Mesure de l'étude Color shift : les limites dynamiques du modèle candidat
 * sur six références, seules puis croisées, et leur durée de calcul.
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/Color shift/mesurer-color-shift.mjs"
 *
 * Le modèle vient de `modele-color-shift.mjs`, que la maquette recopie. Le
 * témoin compare son jugement à celui de `verifierPromesses` sur chaque
 * palette sans décalage, à une et deux intensités : un écart arrête le script.
 */
import * as M from '../../../../../packages/couleur/src/index.ts';
import { ajouter, nouvellePalette } from '../../../../../packages/plugin-palettes/src/edition.ts';
import { GRANDEURS, decalageNul, limiteDe, promessesDecalees, rampesDecalees } from './modele-color-shift.mjs';

const REFERENCES = [
  ['Bleu', '#1E6FD9'],
  ['Vert', '#16A34A'],
  ['Rouge', '#DC2626'],
  ['Jaune', '#EAB308'],
  ['Sauge', '#A0B599'],
  ['Gris', '#6B7280'],
];
const BOUTS = ['clair', 'sombre'];
const LIES = ['soft', 'vivid'];
const RECETTE_VIDE = M.recetteParDefaut();

const ecrire = (texte) => process.stdout.write(`${texte}\n`);
const virgule = (x, n) => x.toFixed(n).replace('.', ',').replace(/^-/, '−');

function paletteDe(hexa, intensites = 2) {
  const palette = nouvellePalette(RECETTE_VIDE, 'p-00000001', hexa, intensites);
  return { recette: ajouter(RECETTE_VIDE, palette), palette };
}

/** Les décalages de départ : la dérive de teinte rangée, saturation et luminosité à zéro. */
function decalagesDeDepart(palette) {
  const de = (profil) => ({ ...decalageNul(), teinte: { clair: palette.derive[profil].clair, sombre: palette.derive[profil].sombre } });
  return { soft: de('soft'), vivid: de('vivid') };
}

// Témoin : sans décalage, le jugement du modèle égale verifierPromesses.
for (const [, hexa] of REFERENCES) {
  for (const intensites of [1, 2]) {
    const { recette, palette } = paletteDe(hexa, intensites);
    const moteur = M.verifierPromesses(recette, palette).map((p) => `${p.mode}/${p.profil}/${p.paire.numero}:${p.verdict === 'tenue'}`).sort();
    const modele = promessesDecalees(M, recette, palette, rampesDecalees(M, recette, palette, decalagesDeDepart(palette)))
      .map((p) => `${p.cle}:${p.tenue}`).sort();
    if (moteur.join() !== modele.join()) throw new Error(`Témoin en échec pour ${hexa} à ${intensites} intensité(s).`);
  }
}
ecrire('Témoin : sans décalage, le modèle juge comme verifierPromesses sur les six références, à une et deux intensités.\n');

const { courbes } = M.grilleDe(RECETTE_VIDE, paletteDe('#1E6FD9').palette);
ecrire(`Courbe Light : ${courbes.light.map((L) => virgule(L, 3)).join(' ')}`);
ecrire(`Courbe Dark  : ${courbes.dark.map((L) => virgule(L, 3)).join(' ')}\n`);

const ecrireCause = (cause) => {
  if (!cause) return '';
  if (cause.ordre) return ' (ordre des nuances)';
  const p = cause.promesse;
  return ` (${p.libelle}, ${p.intensite}, ${p.mode}, ${virgule(Math.floor(p.contraste * 100) / 100, 2)} < ${virgule(p.seuil, 1)})`;
};
const ecrireBorne = (grandeur, { borne, cause }) => {
  const texte = grandeur === 'teinte' ? `${virgule(borne, 0)}°` : grandeur === 'saturation' ? `${virgule(borne * 100, 0)} %` : virgule(borne, 3);
  return `${texte}${ecrireCause(cause)}`;
};
const ecrireLimite = (grandeur, { bas, haut }) => `[${ecrireBorne(grandeur, bas)} ; ${ecrireBorne(grandeur, haut)}]`;

ecrire('Limites dynamiques, deux intensités synchronisées, dérive Tailwind, saturation et luminosité à zéro');
let duree = 0;
let mesures = 0;
for (const [nom, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  const decalages = decalagesDeDepart(palette);
  const ancrage = M.ancrageDe(recette, palette);
  ecrire(`\n${nom} ${hexa} · porteur ${ancrage.profil} · ◆ ${ancrage.crans.light} Light, ${ancrage.crans.dark} Dark · Tailwind ${virgule(decalages.vivid.teinte.clair, 1)}° / ${virgule(decalages.vivid.teinte.sombre, 1)}°`);
  for (const grandeur of Object.keys(GRANDEURS)) {
    for (const bout of BOUTS) {
      const debut = performance.now();
      const limite = limiteDe(M, recette, palette, decalages, LIES, grandeur, bout);
      duree += performance.now() - debut;
      mesures += 1;
      ecrire(`  ${grandeur.padEnd(10)} ${bout.padEnd(6)} ${ecrireLimite(grandeur, limite)}`);
    }
  }
}
ecrire(`\nDurée moyenne d'une limite, deux bornes, balayage au pas : ${virgule(duree / mesures, 1)} ms.`);

ecrire('\nLimites croisées : luminosité posée à sa borne haute, puis teinte et saturation du même bout');
for (const [nom, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  const depart = decalagesDeDepart(palette);
  for (const bout of BOUTS) {
    const haut = limiteDe(M, recette, palette, depart, LIES, 'clarte', bout).haut.borne;
    const decalages = {
      soft: { ...depart.soft, clarte: { ...depart.soft.clarte, [bout]: haut } },
      vivid: { ...depart.vivid, clarte: { ...depart.vivid.clarte, [bout]: haut } },
    };
    const teinte = limiteDe(M, recette, palette, decalages, LIES, 'teinte', bout);
    const saturation = limiteDe(M, recette, palette, decalages, LIES, 'saturation', bout);
    ecrire(`  ${nom.padEnd(6)} ${bout.padEnd(6)} L ${virgule(haut, 3)} · teinte ${ecrireLimite('teinte', teinte)} · saturation ${ecrireLimite('saturation', saturation)}`);
  }
}
