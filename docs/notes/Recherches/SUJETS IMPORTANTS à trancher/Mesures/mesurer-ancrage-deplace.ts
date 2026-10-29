/**
 * Mesure de la règle « A + ancrage déplacé » (voir `ancrage-deplace.ts`) en Dark normal et en Dark
 * inversé : d'abord sur la configuration du mainteneur, puis sur 360 teintes dont la référence est
 * posée aux niveaux 500, 600 et 700 de la courbe Light, la palette de base étant Soft ou Vivid.
 *
 * Depuis ce dossier : `npx tsx mesurer-ancrage-deplace.ts`
 */
import * as M from '../../../../../packages/couleur/src/index';
import { courbesParDefaut } from '../../../../../packages/couleur/src/nuances';
import type { Palette, Recette } from '../../../../../packages/couleur/src/index';
import brute from './palettes-et-reglages.json';
import { simuler } from './ancrage-deplace';

const validee = M.validerRecette(brute);
if (!('recette' in validee)) throw new Error('recette refusée');
const BASE = validee.recette;
const texteNormal = { light: BASE.texteDesBoutons.light, dark: 'noir' as const };
const NORMALE: Recette = { ...BASE, texteDesBoutons: texteNormal, courbes: { ...BASE.courbes, dark: courbesParDefaut(11, texteNormal).dark } };
const SENS = { normal: { recette: NORMALE, texte: 700 }, inverse: { recette: BASE, texte: 800 } } as const;

const f = (x: number, n = 2) => x.toFixed(n);
const mediane = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// 1. La configuration du mainteneur.
for (const [sens, { recette, texte }] of Object.entries(SENS)) {
  const rang = (n: number) => recette.crans.indexOf(n);
  const page = M.lireHexa(recette.fonds.dark)!;
  console.log(`\n=== Configuration du mainteneur, Dark ${sens} : texte ${texte}, courbe Dark ${recette.courbes.dark.join(' ')}`);
  let total = 0, tranche = 0;
  for (const p of recette.palettes) {
    for (const [i, r] of Object.entries(M.rampesDe(recette, p))) {
      total += 1;
      const s = simuler(recette, p, i as M.Intensite, r!.dark, texte);
      if (!s.dansLaTranche) continue;
      tranche += 1;
      const av = r!.dark, ap = s.rampe;
      const ct = (c: M.Cran, fond: M.Cran) => M.contraste(c.couleur, fond.couleur);
      const ligne = (nom: string, rampe: readonly M.Cran[], ref: number | undefined) => {
        const t = rampe[rang(texte)];
        const claires = [300, 400, 500, 600, 700, 800, 900].map((n) => `${n}:${f(rampe[rang(n)].L, 3)}`).join(' ');
        return `  ${nom.padEnd(6)} réf. au ${ref} · L ${claires} · texte ${texte} sur 200 ${f(ct(t, rampe[rang(200)]))} · 300 ${f(ct(t, rampe[rang(300)]))} · 400 ${f(ct(t, rampe[rang(400)]))} (seuil 3) · page ${f(M.contraste(t.couleur, page))}`;
      };
      console.log(`${p.nom} ${i} (${p.reference}) : texte tient ${s.texteTient}, ordre tenu ${s.ordreTenu}`);
      console.log(ligne('avant', av, s.referenceAvant));
      console.log(ligne('après', ap, s.referenceAu));
      const plein = ap[rang(700)];
      console.log(`  plein 700 : avant ${f(M.contraste(av[rang(700)].couleur, M.lireHexa(texte === 700 ? '#000000' : '#FFFFFF')!))} après ${f(M.contraste(plein.couleur, M.lireHexa(texte === 700 ? '#000000' : '#FFFFFF')!))} (texte des boutons ${texte === 700 ? 'noir' : 'blanc'})`);
    }
  }
  console.log(`${tranche} rampes dans la tranche sur ${total}`);
}

// 2. Le balayage des 360 teintes.
const COURBE_LIGHT = BASE.courbes.light;
const rangLight = (n: number) => BASE.crans.indexOf(n);
console.log('\n=== 360 teintes, référence au niveau de la courbe Light, base Soft ou Vivid');
console.log('sens     base  niv | tranche | 400 max/méd | 500 max/méd | 600 max/méd | texte max/méd | ordre cassé | texte < seuil');
for (const [sens, { recette: R, texte }] of Object.entries(SENS)) {
  const rang = (n: number) => R.crans.indexOf(n);
  for (const base of ['soft', 'vivid'] as const) {
    for (const niveau of [500, 600, 700]) {
      const d400: number[] = [], d500: number[] = [], d600: number[] = [], dTexte: number[] = [];
      let tranche = 0, casse = 0, butee = 0;
      const casses: string[] = [], butees: string[] = [];
      for (let teinte = 0; teinte < 360; teinte += 1) {
        const reference = M.ecrireHexa(M.fabriquerCran(COURBE_LIGHT[rangLight(niveau)], teinte, 1, R.gamut).couleur);
        const derive = M.prereglageTailwind(M.rgb8VersOklch(M.lireHexa(reference)!), M.boutsDe(R));
        const palette: Palette = { id: `t${teinte}`, reference, base, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } };
        const recette = { ...R, palettes: [palette] };
        for (const [i, r] of Object.entries(M.rampesDe(recette, palette))) {
          const s = simuler(recette, palette, i as M.Intensite, r!.dark, texte);
          if (!s.dansLaTranche) continue;
          tranche += 1;
          const delta = (n: number) => Math.abs(s.rampe[rang(n)].L - r!.dark[rang(n)].L);
          d400.push(delta(400)); d500.push(delta(500)); d600.push(delta(600)); dTexte.push(delta(texte));
          if (!s.ordreTenu) { casse += 1; casses.push(`${teinte}`); }
          if (!s.texteTient) { butee += 1; butees.push(`${teinte}`); }
        }
      }
      const mm = (v: number[]) => `${f(Math.max(0, ...v), 3)}/${f(mediane(v), 3)}`;
      console.log(`${sens.padEnd(8)} ${base.padEnd(5)} ${niveau} | ${String(tranche).padStart(7)} | ${mm(d400).padEnd(11)} | ${mm(d500).padEnd(11)} | ${mm(d600).padEnd(11)} | ${mm(dTexte).padEnd(13)} | ${casse}${casses.length ? ' (' + casses.slice(0, 12).join(',') + (casses.length > 12 ? '…' : '') + ')' : ''} | ${butee}${butees.length ? ' (' + butees.slice(0, 12).join(',') + (butees.length > 12 ? '…' : '') + ')' : ''}`);
    }
  }
}

// 3. La limite de la tranche : la clarté de la référence, 36 teintes (une sur dix), base Vivid.
console.log('\n=== Limite de la tranche selon la clarté de la référence (36 teintes, base Vivid)');
console.log('sens     L réf. | ancrée sur le texte | dans la tranche | ordre cassé | texte < seuil');
for (const [sens, { recette: R, texte }] of Object.entries(SENS)) {
  for (let L = 0.6; L <= 0.801; L += 0.02) {
    let ancree = 0, tranche = 0, casse = 0, butee = 0;
    for (let teinte = 0; teinte < 360; teinte += 10) {
      const reference = M.ecrireHexa(M.fabriquerCran(L, teinte, 1, R.gamut).couleur);
      const derive = M.prereglageTailwind(M.rgb8VersOklch(M.lireHexa(reference)!), M.boutsDe(R));
      const palette: Palette = { id: `t${teinte}`, reference, base: 'vivid', derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } };
      const recette = { ...R, palettes: [palette] };
      if (M.ancrageDe(recette, palette).crans.dark === texte) ancree += 1;
      const s = simuler(recette, palette, 'vivid', M.rampesDe(recette, palette).vivid!.dark, texte);
      if (!s.dansLaTranche) continue;
      tranche += 1;
      if (!s.ordreTenu) casse += 1;
      if (!s.texteTient) butee += 1;
    }
    console.log(`${sens.padEnd(8)} ${f(L)} | ${String(ancree).padStart(19)} | ${String(tranche).padStart(15)} | ${String(casse).padStart(11)} | ${butee}`);
  }
}
