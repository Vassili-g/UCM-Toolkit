#!/usr/bin/env node
/**
 * L'étape 3 du plan de recherche : ce que trois façons d'harmoniser la
 * luminosité d'un groupe donnent sur une recette exportée, puis deux façons
 * d'harmoniser la saturation de Soft. Chaque proposition passe par les gestes
 * du plugin (`reglerClarte`, `reglerDecalage`, `reglerSaturation`), puis se
 * juge sur les rampes finales, référence comprise.
 *
 *   npx tsx "docs/notes/Recherches/Plugin Palettes/Harmonisation entre palettes/calculer-harmonisation.mjs" recette.json [--modele Poppy] [--groupe Poppy,Orange,Grass,Sky] [--json calcul.json]
 *
 * Luminosité, pour chaque intensité :
 *   « courbe »    : le groupe entier revient aux courbes de la recette, réglages de luminosité à zéro,
 *                   hors de la luminosité globale du profil porteur, qui déplacerait la référence ;
 *   « recopie »   : chaque palette prend les valeurs de luminosité du modèle ;
 *   « recherche » : chaque palette prend les valeurs qui approchent le mieux les clartés du modèle,
 *                   au pas des réglettes, sans toucher la luminosité du profil porteur.
 * Saturation de Soft :
 *   « part »      : chaque palette prend la part de Soft du modèle ;
 *   « chroma »    : chaque palette prend la part qui approche le mieux la chroma du modèle.
 */
import { writeFileSync } from 'node:fs';

import { BORNES_DES_REGLAGES, BORNES_DU_COLOR_SHIFT, MODES, PROFILS, cleDuPorteur, partsDe } from '../../../../../packages/couleur/src/index.ts';
import { reglerClarte, reglerDecalage, reglerSaturation, remplacerPalette } from '../../../../../packages/plugin-palettes/src/edition.ts';

import { etatDe, f3, lireArguments, nuancesDe, paletteNommee } from './groupe.mjs';

const { recette, noms, modele: nomDuModele = 'Poppy', json } = lireArguments(process.argv.slice(2));
const palettes = noms.map((nom) => paletteNommee(recette, nom));
const modele = paletteNommee(recette, nomDuModele);
const PAS = 0.005;

/** Les valeurs de luminosité d'un profil : le réglage global, et le Color shift à chaque bout. */
const luminositeDe = (palette, profil) => ({
  globale: palette.reglages?.clarte?.[profil] ?? 0,
  clair: palette.derive[profil]?.clarte?.clair ?? 0,
  sombre: palette.derive[profil]?.clarte?.sombre ?? 0,
});

/** La palette aux valeurs de luminosité `valeurs` pour `profil`, par les gestes du plugin. */
function avecLuminosite(palette, profil, valeurs) {
  let suivante = palette;
  if (valeurs.globale !== luminositeDe(palette, profil).globale) suivante = reglerClarte(recette, suivante, profil, valeurs.globale);
  suivante = reglerDecalage(recette, suivante, profil, 'clarte', 'clair', valeurs.clair);
  return reglerDecalage(recette, suivante, profil, 'clarte', 'sombre', valeurs.sombre);
}

/** Les nuances des variables du thème d'une palette, pour les deux thèmes. */
const nuancesDesModes = (palette, profil) => Object.fromEntries(MODES.map((mode) => [mode, nuancesDe(recette, palette, profil, mode)]));

/**
 * L'écart de clarté d'une palette au modèle, sur les variables des deux
 * thèmes : le plus grand hors des nuances qui portent une référence, et le
 * plus grand sur ces nuances-là.
 */
function ecartAuModele(cible, reference) {
  let libre = 0;
  let ancre = 0;
  for (const mode of MODES) {
    for (const [variable, nuance] of Object.entries(cible[mode])) {
      const autre = reference[mode][variable];
      const ecart = Math.abs(nuance.L - autre.L);
      if (nuance.reference || autre.reference) ancre = Math.max(ancre, ecart);
      else libre = Math.max(libre, ecart);
    }
  }
  return { libre, ancre };
}

const pasDe = (bas, haut) => Array.from({ length: Math.round((haut - bas) / PAS) + 1 }, (_, i) => Math.round((bas + i * PAS) * 1000) / 1000);

/**
 * La recherche : une grille sur les deux bouts du Color shift, puis la
 * luminosité globale quand le profil ne porte pas la référence, trois tours,
 * depuis trois départs (les valeurs de la palette, celles du modèle, zéro).
 * Une candidate qui fait manquer une promesse tenue, ou perd l'ordre des
 * nuances, est écartée, comme la limite d'une réglette l'écarterait.
 */
function chercher(palette, profil, cible, departs) {
  const porteur = cleDuPorteur(recette, palette) === profil;
  const borne = BORNES_DU_COLOR_SHIFT.clarte;
  const tenues = etatDe(recette, palette).manquees;
  const permise = (candidate) => {
    const etat = etatDe(remplacerPalette(recette, candidate), candidate);
    return etat.ordre && etat.manquees.every((cle) => tenues.includes(cle));
  };
  const cout = (valeurs) => ecartAuModele(nuancesDesModes(avecLuminosite(palette, profil, valeurs), profil), cible).libre;
  let meilleur = Infinity;
  let meilleures = luminositeDe(palette, profil);
  const essayer = (valeurs) => {
    const valeur = cout(valeurs);
    if (valeur < meilleur - 1e-9 && permise(avecLuminosite(palette, profil, valeurs))) [meilleur, meilleures] = [valeur, valeurs];
  };
  for (const depart of departs) {
    if (porteur && depart.globale !== luminositeDe(palette, profil).globale) continue;
    essayer(depart);
    for (let tour = 0; tour < 3; tour += 1) {
      const base = meilleures;
      for (const clair of pasDe(-borne, borne)) {
        for (const sombre of pasDe(-borne, borne)) essayer({ ...base, clair, sombre });
      }
      if (porteur) break;
      const suite = meilleures;
      for (const globale of pasDe(BORNES_DES_REGLAGES.clarte.bas, BORNES_DES_REGLAGES.clarte.haut)) essayer({ ...suite, globale });
    }
  }
  return meilleures;
}

/** Ce qu'une proposition change sur une palette, jugé sur la recette où elle s'applique. */
function bilan(avant, apres, profil, cible) {
  const recetteApres = remplacerPalette(recette, apres);
  const etatAvant = etatDe(recette, avant);
  const etatApres = etatDe(recetteApres, apres);
  return {
    valeurs: luminositeDe(apres, profil),
    ecart: ecartAuModele(nuancesDesModes(apres, profil), cible),
    referenceDeplacee: apres.reference.toUpperCase() !== avant.reference.toUpperCase() ? `${avant.reference} → ${apres.reference}` : null,
    nouvellesManquees: etatApres.details.filter((_, i) => !etatAvant.manquees.includes(etatApres.manquees[i])),
    ordre: etatApres.ordre,
  };
}

const sortie = { modele: nomDuModele, groupe: noms, luminosite: [], saturation: [] };
const v = ({ globale, clair, sombre }) => `globale ${f3(globale)}  clair ${f3(clair)}  sombre ${f3(sombre)}`;

for (const profil of PROFILS) {
  console.log(`\n== Luminosité, ${profil}, modèle ${nomDuModele} (${v(luminositeDe(modele, profil))})`);
  const zero = { globale: 0, clair: 0, sombre: 0 };
  // « courbe » : la luminosité globale du profil porteur reste, la changer déplacerait la référence (H5).
  const surLaCourbe = (palette) => ({ ...zero, globale: cleDuPorteur(recette, palette) === profil ? luminositeDe(palette, profil).globale : 0 });
  // Le modèle lui-même revient aux courbes, et les autres se jugent contre lui.
  const modeleSurLaCourbe = avecLuminosite(modele, profil, surLaCourbe(modele));
  const cibles = { courbe: nuancesDesModes(modeleSurLaCourbe, profil), autres: nuancesDesModes(modele, profil) };
  for (const palette of palettes) {
    const avant = bilan(palette, palette, profil, cibles.autres);
    const lignes = {
      avant,
      courbe: bilan(palette, avecLuminosite(palette, profil, surLaCourbe(palette)), profil, cibles.courbe),
    };
    if (palette !== modele) {
      lignes.recopie = bilan(palette, avecLuminosite(palette, profil, luminositeDe(modele, profil)), profil, cibles.autres);
      const departs = [luminositeDe(palette, profil), luminositeDe(modele, profil), zero];
      lignes.recherche = bilan(palette, avecLuminosite(palette, profil, chercher(palette, profil, cibles.autres, departs)), profil, cibles.autres);
    }
    console.log(`  ${palette.nom}`);
    for (const [nom, ligne] of Object.entries(lignes)) {
      const notes = [
        ligne.referenceDeplacee && `référence ${ligne.referenceDeplacee}`,
        ligne.nouvellesManquees.length > 0 && `manque ${ligne.nouvellesManquees.join(', ')}`,
        !ligne.ordre && 'ordre perdu',
      ].filter(Boolean).join(' ; ');
      console.log(`    ${nom.padEnd(10)} ${v(ligne.valeurs)}   écart hors ◆ ${f3(ligne.ecart.libre)}  sur ◆ ${f3(ligne.ecart.ancre)}  ${notes}`);
    }
    sortie.luminosite.push({ profil, palette: palette.nom, ...lignes });
  }
}

/**
 * Le plus grand rapport de chroma, toujours ≥ 1, entre une palette et le
 * modèle sur les variables des deux thèmes. Le millième ajouté aux deux
 * chromas évite qu'un gris passe pour un accord parfait.
 */
function rapportDeChroma(cible, reference) {
  let pire = 1;
  for (const mode of MODES) {
    for (const [variable, nuance] of Object.entries(cible[mode])) {
      if (nuance.reference || reference[mode][variable].reference) continue;
      const a = nuance.C + 0.001;
      const b = reference[mode][variable].C + 0.001;
      pire = Math.max(pire, a / b, b / a);
    }
  }
  return pire;
}

console.log(`\n== Saturation de Soft, modèle ${nomDuModele} (part ${partsDe(recette, modele).soft})`);
const cibleSoft = nuancesDesModes(modele, 'soft');
for (const palette of palettes) {
  if (palette === modele) continue;
  const juger = (candidate) => ({ part: partsDe(recette, candidate).soft, rapport: rapportDeChroma(nuancesDesModes(candidate, 'soft'), cibleSoft) });
  const avant = juger(palette);
  const part = juger(reglerSaturation(recette, palette, 'soft', partsDe(recette, modele).soft));
  let chroma = avant;
  for (let valeur = 0; valeur <= 1.0001; valeur += 0.01) {
    const essai = juger(reglerSaturation(recette, palette, 'soft', valeur));
    if (essai.rapport < chroma.rapport) chroma = essai;
  }
  console.log(`  ${palette.nom.padEnd(8)} avant part ${avant.part.toFixed(2)} ×${avant.rapport.toFixed(2)}   part du modèle → ${part.part.toFixed(2)} ×${part.rapport.toFixed(2)}   chroma du modèle → ${chroma.part.toFixed(2)} ×${chroma.rapport.toFixed(2)}`);
  sortie.saturation.push({ palette: palette.nom, avant, part, chroma });
}

if (json) writeFileSync(json, `${JSON.stringify(sortie, null, 2)}\n`);
