/**
 * Mesure du survol du bouton texte en Dark : texte de `page` sur `surface/hover`, pour les
 * palettes du mainteneur, en Dark normal (courbe par défaut de ce sens) et en Dark inversé (sa
 * configuration). Pistes mesurées sur les rampes du moteur :
 * - actuelle : table d'aujourd'hui ;
 * - 400 foncé par teinte : le 400 s'assombrit par pas de 0,001 vers le 300 jusqu'au seuil ;
 * - 400 de courbe abaissé : le 400 de la courbe Dark descend à une valeur commune ;
 * - table 200/300/400 : les fonds teintés Dark descendent d'un cran.
 *
 * Depuis ce dossier : `npx tsx mesurer-survol-dark.ts`
 */
import * as M from '../../../../../packages/couleur/src/index';
import { courbesParDefaut } from '../../../../../packages/couleur/src/nuances';
import type { Recette } from '../../../../../packages/couleur/src/index';
import brute from './palettes-et-reglages.json';

const validee = M.validerRecette(brute);
if (!('recette' in validee)) throw new Error('recette refusée');
const BASE = validee.recette;
const rang = (c: number) => BASE.crans.indexOf(c);
const ct = (a: M.Cran, b: M.Cran) => M.contraste(a.couleur, b.couleur);

const NORMALE: Recette = { ...BASE, texteDesBoutons: { ...BASE.texteDesBoutons, dark: 'noir' }, courbes: { ...BASE.courbes, dark: courbesParDefaut(11, { light: BASE.texteDesBoutons.light, dark: 'noir' }).dark } };
const SENS = { normal: { recette: NORMALE, texte: 700 }, inverse: { recette: BASE, texte: 800 } } as const;

function foncerVers(fond: M.Cran, plancher: M.Cran, texte: M.Cran, recette: Recette): { L: number; ok: boolean } {
  const part = fond.C / Math.max(M.plafond(fond.L, fond.H, recette.gamut), 1e-4);
  for (let L = fond.L; L >= plancher.L; L -= 0.001) {
    const c = M.cranDeLaVisee({ L, C: Math.min(1, part) * M.plafond(L, fond.H, recette.gamut), H: fond.H });
    if (M.contraste(texte.couleur, c.couleur) >= 4.5) return { L, ok: true };
  }
  return { L: plancher.L, ok: false };
}

for (const [sens, { recette, texte }] of Object.entries(SENS)) {
  console.log(`\n=== Dark ${sens} : texte ${texte}, courbe 300 ${recette.courbes.dark[rang(300)]} 400 ${recette.courbes.dark[rang(400)]} 500 ${recette.courbes.dark[rang(500)]}`);
  const lignes: string[] = [];
  let minActuel = 9, minRepos = 9, ecartMin = 9, ecartMax = 0, echecsFonce = 0;
  for (const p of recette.palettes) {
    for (const [i, r] of Object.entries(M.rampesDe(recette, p))) {
      const d = r!.dark, t = d[rang(texte)];
      const survol = ct(t, d[rang(400)]), repos = ct(t, d[rang(300)]);
      minActuel = Math.min(minActuel, survol); minRepos = Math.min(minRepos, repos);
      const f = foncerVers(d[rang(400)], d[rang(300)], t, recette);
      if (!f.ok) echecsFonce += 1;
      const ecart = f.L - d[rang(300)].L; ecartMin = Math.min(ecartMin, ecart); ecartMax = Math.max(ecartMax, ecart);
      const t200 = ct(t, d[rang(200)]), t300 = repos;
      lignes.push(`${p.nom.padEnd(10)} ${i.padEnd(6)} survol ${survol.toFixed(2)} · 400 foncé à ${f.L.toFixed(3)} (300 à ${d[rang(300)].L.toFixed(3)}, 400 à ${d[rang(400)].L.toFixed(3)})${f.ok ? '' : ' ÉCHEC'} · table 200/300/400 : repos ${t200.toFixed(2)} survol ${t300.toFixed(2)} appui ${ct(t, d[rang(400)]).toFixed(2)}`);
    }
  }
  console.log(lignes.join('\n'));
  console.log(`survol actuel min ${minActuel.toFixed(2)} ; repos min ${minRepos.toFixed(2)} ; 400 foncé : écart au 300 de ${ecartMin.toFixed(3)} à ${ecartMax.toFixed(3)}, ${echecsFonce} échecs`);
  for (const L of [0.38, 0.37, 0.36, 0.35]) {
    const dark = recette.courbes.dark.map((v, k) => (k === rang(400) ? L : v));
    const r2: Recette = { ...recette, courbes: { ...recette.courbes, dark } };
    let min = 9;
    for (const p of r2.palettes) for (const r of Object.values(M.rampesDe(r2, p))) min = Math.min(min, ct(r!.dark[rang(texte)], r!.dark[rang(400)]));
    console.log(`400 de courbe à ${L} : survol min ${min.toFixed(2)} (300 à ${recette.courbes.dark[rang(300)]})`);
  }
}
