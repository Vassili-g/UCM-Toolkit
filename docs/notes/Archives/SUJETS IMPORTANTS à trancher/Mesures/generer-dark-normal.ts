/**
 * Les données de la section 11 de la maquette : les palettes du mainteneur en Dark normal (texte
 * des boutons noir, courbe Dark par défaut de ce sens) et en Dark inversé (sa configuration).
 *
 * Pour chaque sens, deux rampes Dark : « aujourdhui », sans la correction des textes par teinte
 * (lot C2), et « correction », celle du moteur. La maquette y lit les crans de chaque table de
 * `surface` qu'elle compare ; les pistes A et B ne changent que la table, pas les rampes.
 * « ancrage » est la rampe de la règle « A + ancrage déplacé » (`ancrage-deplace.ts`), identique à
 * « correction » hors de sa tranche ; « ancrageInfo » dit si la rampe est dans la tranche et où la
 * référence se pose avant et après.
 *
 * Depuis ce dossier : `npx tsx generer-dark-normal.ts > ../Maquettes/donnees-dark-normal.js`
 */
import * as M from '../../../../../packages/couleur/src/index';
import { rampesSansCorrection } from '../../../../../packages/couleur/src/palette';
import { courbesParDefaut } from '../../../../../packages/couleur/src/nuances';
import type { Recette } from '../../../../../packages/couleur/src/index';
import brute from './palettes-et-reglages.json';
import { simuler } from './ancrage-deplace';

const validee = M.validerRecette(brute);
if (!('recette' in validee)) throw new Error(`Recette refusée : ${JSON.stringify(validee.refus)}`);
const RECETTE = validee.recette;

const rang = (cran: number) => RECETTE.crans.indexOf(cran);
const texteNormal = { light: RECETTE.texteDesBoutons.light, dark: 'noir' as const };
const NORMALE: Recette = { ...RECETTE, texteDesBoutons: texteNormal, courbes: { ...RECETTE.courbes, dark: courbesParDefaut(11, texteNormal).dark } };
const SENS: Record<string, Recette> = { normal: NORMALE, inverse: RECETTE };

const CRANS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const extraire = (rampe: readonly M.Cran[]) => Object.fromEntries(CRANS.map((c) => [c, { hexa: rampe[rang(c)].hexa, L: +rampe[rang(c)].L.toFixed(3) }]));

const sens = Object.fromEntries(Object.entries(SENS).map(([nom, recette]) => [nom, {
  courbe: recette.courbes.dark,
  palettes: recette.palettes.map((p) => {
    const aujourdhui = rampesSansCorrection(recette, p);
    const correction = M.rampesDe(recette, p);
    return {
      nom: p.nom,
      reference: p.reference,
      intensites: Object.fromEntries(Object.keys(correction).map((i) => {
        const s = simuler(recette, p, i as M.Intensite, correction[i as M.Intensite]!.dark, nom === 'normal' ? 700 : 800);
        return [i, {
          aujourdhui: extraire(aujourdhui[i as M.Intensite]!.dark),
          correction: extraire(correction[i as M.Intensite]!.dark),
          ancrage: extraire(s.rampe),
          ancrageInfo: { tranche: s.dansLaTranche, avant: s.referenceAvant ?? null, apres: s.referenceAu ?? null },
        }];
      })),
    };
  }),
}]));

const donnees = { page: RECETTE.fonds.dark, sens };
process.stdout.write(`// Généré par Mesures/generer-dark-normal.ts ; ne pas modifier à la main.\nwindow.DARK_NORMAL = ${JSON.stringify(donnees)};\n`);
