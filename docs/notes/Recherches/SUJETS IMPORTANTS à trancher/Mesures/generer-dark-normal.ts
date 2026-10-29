/**
 * Les données de la section 11 de la maquette : les palettes du mainteneur passées en Dark normal
 * (texte des boutons noir, courbe Dark par défaut de ce sens), sous trois versions du moteur.
 *
 * - « aujourdhui » : les rampes sans la correction des textes par teinte (lot C2).
 * - « correction » : les rampes du moteur, 700 corrigé par teinte.
 * - « courbe » : le 700 de la courbe Dark relevé à `SEPT_CENTS_RELEVE`, puis la correction par teinte.
 *
 * Depuis ce dossier : `npx tsx generer-dark-normal.ts > ../Maquettes/donnees-dark-normal.js`
 */
import * as M from '../../../../../packages/couleur/src/index';
import { rampesSansCorrection } from '../../../../../packages/couleur/src/palette';
import { courbesParDefaut } from '../../../../../packages/couleur/src/nuances';
import type { Recette } from '../../../../../packages/couleur/src/index';
import brute from './palettes-et-reglages.json';

const validee = M.validerRecette(brute);
if (!('recette' in validee)) throw new Error(`Recette refusée : ${JSON.stringify(validee.refus)}`);
const RECETTE = validee.recette;

const SEPT_CENTS_RELEVE = 0.7;
const rang = (cran: number) => RECETTE.crans.indexOf(cran);
const texteDesBoutons = { light: RECETTE.texteDesBoutons.light, dark: 'noir' as const };
const darkNormal = courbesParDefaut(11, texteDesBoutons).dark;
const NORMALE: Recette = { ...RECETTE, texteDesBoutons, courbes: { ...RECETTE.courbes, dark: darkNormal } };
const RELEVEE: Recette = { ...NORMALE, courbes: { ...NORMALE.courbes, dark: darkNormal.map((L, r) => (r === rang(700) ? SEPT_CENTS_RELEVE : L)) } };

const CRANS = [200, 300, 400, 500, 600, 700, 800, 900, 950];
const extraire = (rampe: readonly M.Cran[]) => Object.fromEntries(CRANS.map((c) => [c, { hexa: rampe[rang(c)].hexa, L: +rampe[rang(c)].L.toFixed(3) }]));

const palettes = RECETTE.palettes.map((p) => {
  const palette = { ...p };
  const versions = {
    aujourdhui: rampesSansCorrection(NORMALE, palette),
    correction: M.rampesDe(NORMALE, palette),
    courbe: M.rampesDe(RELEVEE, palette),
  };
  const intensites = Object.keys(versions.correction) as M.Intensite[];
  return {
    nom: p.nom,
    reference: p.reference,
    intensites: Object.fromEntries(intensites.map((i) => [i, Object.fromEntries(Object.entries(versions).map(([v, r]) => [v, extraire(r[i]!.dark)]))])),
  };
});

const donnees = { page: RECETTE.fonds.dark, courbe: { normale: darkNormal, relevee: SEPT_CENTS_RELEVE }, palettes };
process.stdout.write(`// Généré par Mesures/generer-dark-normal.ts ; ne pas modifier à la main.\nwindow.DARK_NORMAL = ${JSON.stringify(donnees)};\n`);
