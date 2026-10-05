import { writeFileSync } from 'node:fs';
import {
  recetteParDefaut, verifierPromesses, contraste, atteintLeSeuil, lireHexa,
  validerRecette,
} from '../../../../../packages/couleur/src/index.ts';

const references = ['#FACC15', '#2563EB', '#DC2626', '#16A34A', '#9333EA', '#06B6D4', '#F5F5F5', '#171717', '#808080', '#8B8178'];
const lignes = [];
for (const reference of references) {
  const palette = {
    id: 'mesure', reference,
    derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } },
  };
  const recette = { ...recetteParDefaut(), palettes: [palette] };
  const validation = validerRecette(recette);
  if ('refus' in validation) throw new Error(JSON.stringify(validation.refus));
  for (const promesse of verifierPromesses(recette, palette).filter((p) => [5, 6, 7, 18].includes(p.paire.numero))) {
    const fond = promesse.second.couleur;
    const encres = {
      actuelle: promesse.premier.couleur,
      claire: lireHexa(recette.fonds.light),
      sombre: lireHexa(recette.fonds.dark),
      blanche: [255, 255, 255],
      noire: [0, 0, 0],
    };
    const ratios = Object.fromEntries(Object.entries(encres).map(([nom, encre]) => [nom, contraste(encre, fond)]));
    ratios.autoParEtat = Math.max(ratios.blanche, ratios.noire);
    lignes.push({ reference, mode: promesse.mode, profil: promesse.profil, paire: promesse.paire.numero, cran: promesse.second.cran, fond, encres, seuil: promesse.seuil, ratios });
  }
}

const resume = [];
for (const mode of ['light', 'dark']) {
  const groupe = lignes.filter((ligne) => ligne.mode === mode);
  for (const option of Object.keys(groupe[0].ratios)) {
    const valeurs = groupe.map((ligne) => ligne.ratios[option]);
    resume.push({ mode, option, paires: groupe.length, conformes: groupe.filter((ligne) => atteintLeSeuil(ligne.ratios[option], ligne.seuil)).length, minimum: Math.min(...valeurs) });
  }
}
const familles = [];
for (const reference of references) {
  for (const mode of ['light', 'dark']) {
    for (const profil of ['soft', 'vivid']) {
      const groupe = lignes.filter((ligne) => ligne.reference === reference && ligne.mode === mode && ligne.profil === profil);
      const minimumBlanc = Math.min(...groupe.map((ligne) => ligne.ratios.blanche));
      const minimumNoir = Math.min(...groupe.map((ligne) => ligne.ratios.noire));
      familles.push({ reference, mode, profil, minimumBlanc, minimumNoir, encreStable: minimumBlanc >= minimumNoir ? 'blanche' : 'noire', conforme: atteintLeSeuil(Math.max(minimumBlanc, minimumNoir), 4.5) });
    }
  }
}
const resultat = { protocole: 'Dix références sRGB, recette par défaut, deux intensités, dérive constante nulle, paires 5/6/7/18. Les encres alternatives ne changent pas les rampes.', resume, familles, lignes };
writeFileSync(new URL('./MESURES-ENCRES.json', import.meta.url), `${JSON.stringify(resultat, null, 2)}\n`);
console.log(JSON.stringify({ resume, famillesSansEncreStable: familles.filter((famille) => !famille.conforme) }, null, 2));
