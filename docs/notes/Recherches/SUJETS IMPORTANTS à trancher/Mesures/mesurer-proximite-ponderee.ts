/**
 * Mesure d'une proximité de palettes pondérée par cran, sur la configuration du mainteneur.
 * Chaque paire de palettes colorées compare toute sa rampe (Vivid, ou l'unique intensité), en Light
 * et en Dark : la distance OKLab de chaque cran, pondérée, divisée par le seuil `palettesProches`.
 * Les crans clairs du Light et sombres du Dark pèsent peu ; le milieu de la rampe pèse le plus.
 * Le score d'une paire est la moyenne pondérée des rapports ; elle est trop proche sous 1.
 *
 * Depuis ce dossier : `npx tsx mesurer-proximite-ponderee.ts`
 */
import * as M from '../../../../../packages/couleur/src/index';
import { distanceOk } from '../../../../../packages/couleur/src/contraste';
import brute from './palettes-et-reglages.json';

const validee = M.validerRecette(brute);
if (!('recette' in validee)) throw new Error('recette refusée');
const R = validee.recette;
const seuil = R.seuils.palettesProches;

/** Poids par numéro de cran, les mêmes dans les deux thèmes : en Dark aussi, les petits numéros sont les crans proches de la page. */
const JEUX: Record<string, Record<number, number>> = {
  'milieu seul (400–700)': { 50: 0, 100: 0, 200: 0, 300: 0, 400: 1, 500: 1, 600: 1, 700: 1, 800: 0, 900: 0, 950: 0 },
  'cloche douce': { 50: 0.1, 100: 0.1, 200: 0.2, 300: 0.5, 400: 1, 500: 1, 600: 1, 700: 1, 800: 0.6, 900: 0.3, 950: 0.2 },
  'cloche marquée': { 50: 0, 100: 0.05, 200: 0.1, 300: 0.3, 400: 0.8, 500: 1, 600: 1, 700: 0.8, 800: 0.4, 900: 0.2, 950: 0.1 },
};

const colorees = R.palettes.filter((p) => M.rgb8VersOklch(M.lireHexa(p.reference)!).C > 0.05);
const rampes = new Map(colorees.map((p) => {
  const r = M.rampesDe(R, p);
  return [p.nom, (r.unique ?? r.vivid)!] as const;
}));

for (const [nom, poids] of Object.entries(JEUX)) {
  const scores: { paire: string; score: number; pire: string }[] = [];
  for (let i = 0; i < colorees.length; i += 1) {
    for (let j = i + 1; j < colorees.length; j += 1) {
      const a = rampes.get(colorees[i].nom)!, b = rampes.get(colorees[j].nom)!;
      let somme = 0, total = 0, pire = { rapport: Infinity, ou: '' };
      for (const mode of ['light', 'dark'] as const) {
        R.crans.forEach((cran, rang) => {
          const w = poids[cran] ?? 0;
          if (!w) return;
          const rapport = distanceOk(a[mode][rang].couleur, b[mode][rang].couleur) / seuil;
          somme += w * rapport; total += w;
          if (rapport < pire.rapport) pire = { rapport, ou: `${mode} ${cran}` };
        });
      }
      scores.push({ paire: `${colorees[i].nom} / ${colorees[j].nom}`, score: somme / total, pire: `${pire.ou} ${pire.rapport.toFixed(2)}` });
    }
  }
  scores.sort((x, y) => x.score - y.score);
  console.log(`\n== ${nom} : les 8 paires les plus proches (score < 1 = trop proches)`);
  for (const s of scores.slice(0, 8)) console.log(`${s.paire.padEnd(22)} ${s.score.toFixed(2)}   cran le plus proche : ${s.pire}`);
}
