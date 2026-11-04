/**
 * Mesure de la règle « référence ajustée en Dark inversé » : un cran de texte qui porte la
 * référence exacte et manque le seuil est corrigé comme les autres textes, au lieu de rester tel
 * quel. La règle est simulée hors du moteur : la rampe Dark de `rampesSansCorrection`, puis
 * `corrigerLesTextes` sans `rangDeLaReference`, puis `jugerLesRampes`. Avant = `rampesDe`. La
 * simulation ne rejoue pas la garde de la bosse de chroma de `rampesDe`.
 *
 * D'abord la configuration du mainteneur, puis 360 teintes en base Soft et Vivid, la référence
 * posée sur chaque cran de texte du Dark inversé, sa clarté parcourant par pas de 0,02
 * l'intervalle que `rangPorteur` rattache à ce cran, enfin Light et Dark normal.
 *
 * Depuis ce dossier : `npx tsx mesurer-reference-ajustee.ts`
 */
import * as M from '../../../../../packages/couleur/src/index';
import { courbesParDefaut } from '../../../../../packages/couleur/src/nuances';
import { ECART_MINIMAL_DES_CLARTES } from '../../../../../packages/couleur/src/ordre';
import type { Cran, Palette, Recette } from '../../../../../packages/couleur/src/index';
import brute from './palettes-et-reglages.json';

const validee = M.validerRecette(brute);
if (!('recette' in validee)) throw new Error('recette refusée');
const BASE = validee.recette;
if (M.sensDuTheme('dark', BASE.texteDesBoutons.dark) !== 'inverse') throw new Error("la recette n'est pas en Dark inversé");
const texteNormal = { light: BASE.texteDesBoutons.light, dark: 'noir' as const };
const NORMALE: Recette = { ...BASE, texteDesBoutons: texteNormal, courbes: { ...BASE.courbes, dark: courbesParDefaut(11, texteNormal).dark } };

const f = (x: number, n = 3) => x.toFixed(n);
const mediane = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const octets = (r: readonly Cran[]) => r.map((c) => c.hexa).join(',');

/** La rampe Dark après la règle : les textes corrigés sans cran protégé. */
const apresLaRegle = (recette: Recette, dark: readonly Cran[]) => M.corrigerLesTextes(recette, 'dark', dark);

/** Les promesses manquées d'une rampe Dark, par clé, dans l'intensité donnée. */
function manquees(recette: Recette, intensite: M.Intensite, rampe: readonly Cran[]): Map<string, M.Promesse> {
  const jugees = M.jugerLesRampes(recette, [intensite], { [intensite]: { light: [], dark: [...rampe] } } as M.Rampes, { mode: 'dark', intensite });
  return new Map(jugees.filter((p) => p.verdict === 'manquee').map((p) => [M.cleDeLaPromesse(p), p]));
}
const numeros = (m: Map<string, M.Promesse>) => [...new Set([...m.values()].map((p) => p.garantie.numero))].sort().join(',') || '-';

const rangsTextes = [...M.rangsDesTextes(BASE, 'dark')].sort((a, b) => a - b);
console.log(`Crans de texte du Dark inversé : ${rangsTextes.map((r) => BASE.crans[r]).join(', ')} ; seuil texte ${BASE.seuils.texte} ; écart minimal des clartés ${ECART_MINIMAL_DES_CLARTES}`);

// 1. La configuration du mainteneur.
console.log('\n=== Configuration du mainteneur, Dark inversé');
{
  const changees: string[] = [];
  let total = 0;
  for (const p of BASE.palettes) {
    const reelles = M.rampesDe(BASE, p);
    const brutes = M.rampesSansCorrection(BASE, p);
    for (const i of M.intensitesDe(p)) {
      total += 1;
      const avant = reelles[i]!.dark;
      const { rampe: apres } = apresLaRegle(BASE, brutes[i]!.dark);
      const mAvant = manquees(BASE, i, avant), mApres = manquees(BASE, i, apres);
      const cran = rangsTextes.map((rang) => {
        const a = avant[rang], b = apres[rang];
        if (a.hexa === b.hexa) return `${BASE.crans[rang]} ${a.hexa} =`;
        const ab = (c: Cran) => [c.C * Math.cos(c.H * Math.PI / 180), c.C * Math.sin(c.H * Math.PI / 180)];
        const dE = Math.hypot(a.L - b.L, ab(a)[0] - ab(b)[0], ab(a)[1] - ab(b)[1]);
        return `${BASE.crans[rang]} ${a.hexa}→${b.hexa} ΔL ${b.L - a.L >= 0 ? '+' : ''}${f(b.L - a.L)} ΔEok ${f(dE)}`;
      });
      const diff = octets(avant) !== octets(apres);
      if (diff) changees.push(`${p.nom ?? p.id} ${i}`);
      console.log(`${(p.nom ?? p.id).padEnd(12)} ${i.padEnd(6)} réf ${p.reference} | ${cran.join(' | ')} | manquées avant [${numeros(mAvant)}] (${mAvant.size}) après [${numeros(mApres)}] (${mApres.size})${diff ? ' | OCTETS CHANGÉS' : ''}`);
    }
  }
  console.log(`${total} rampes ; rampes dont un octet change : ${changees.join(', ') || 'aucune'}`);
}

// 2. Le balayage.
console.log('\n=== Balayage : 360 teintes, base Soft et Vivid, référence posée sur chaque cran de texte');
const COURBE = BASE.courbes.dark;
interface Mesure { teinte: number; base: string; numero: number; L: number; dL: number; etat: string; ecartVoisin: number | undefined; ordre: boolean; nouvelles: string[] }
const mesures: Mesure[] = [];
const rampesPosees = { n: 0 };
const intervalles: string[] = [];
for (const rang of rangsTextes) {
  const clartes: number[] = [];
  for (let k = 0; k <= 50; k += 1) {
    const L = k * 0.02;
    if (M.rangPorteur(COURBE, L) === rang) clartes.push(Math.round(L * 1000) / 1000);
  }
  intervalles.push(`${BASE.crans[rang]} : ${clartes.length ? `${clartes[0]} à ${clartes[clartes.length - 1]} (${clartes.length} pas)` : 'aucun pas'}`);
  for (const base of ['soft', 'vivid'] as const) {
    for (const L of clartes) {
      for (let teinte = 0; teinte < 360; teinte += 1) {
        const reference = M.ecrireHexa(M.fabriquerCran(L, teinte, 1, BASE.gamut).couleur);
        const derive = M.prereglageTailwind(M.rgb8VersOklch(M.lireHexa(reference)!), M.boutsDe(BASE));
        const palette: Palette = { id: `t${teinte}`, reference, base, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } };
        const recette = { ...BASE, palettes: [palette] };
        const ancrage = M.ancrageDe(recette, palette);
        if (ancrage.rangs.dark !== rang) continue;
        rampesPosees.n += 1;
        const i = ancrage.profil;
        const avant = M.rampesDe(recette, palette)[i]!.dark;
        const brutePal = M.rampesSansCorrection(recette, palette)[i]!.dark;
        // Dans la tranche : le cran porte la référence et manque le seuil (état `reference` quand le cran est protégé).
        const protegee = M.corrigerLesTextes(recette, 'dark', brutePal, rang).corrections.find((c) => c.rang === rang);
        if (!protegee || protegee.etat !== 'reference') continue;
        const { rampe: apres, corrections } = apresLaRegle(recette, brutePal);
        const c = corrections.find((x) => x.rang === rang)!;
        const mAvant = manquees(recette, i, avant), mApres = manquees(recette, i, apres);
        const nouvelles = [...mApres.keys()].filter((k) => !mAvant.has(k)).map((k) => `G${mApres.get(k)!.garantie.numero}(${k.split('/').slice(3).join('/')})`);
        const voisin = apres[rang + 1];
        mesures.push({
          teinte, base, numero: BASE.crans[rang], L,
          dL: c.apres.L - c.avant.L, etat: c.etat,
          ecartVoisin: voisin ? voisin.L - apres[rang].L : undefined,
          ordre: apres.every((x, k) => k === 0 || x.L > apres[k - 1].L),
          nouvelles,
        });
      }
    }
  }
}
console.log(`intervalles de clarté (courbe Dark) : ${intervalles.join(' ; ')}`);
console.log(`${rampesPosees.n} rampes dont la référence porte un cran de texte ; ${mesures.length} dans la tranche (référence qui manque le seuil)`);
for (const rang of rangsTextes) {
  const numero = BASE.crans[rang];
  const sous = mesures.filter((m) => m.numero === numero);
  if (!sous.length) { console.log(`cran ${numero} : aucune rampe dans la tranche${numero === 950 ? ' (le 950 ne se présente pas)' : ''}`); continue; }
  const dl = sous.map((m) => m.dL);
  const max = sous.reduce((a, b) => (b.dL > a.dL ? b : a));
  const butees = sous.filter((m) => m.etat === 'voisin');
  const ecarts = sous.filter((m) => m.ecartVoisin !== undefined);
  const mini = ecarts.length ? ecarts.reduce((a, b) => (b.ecartVoisin! < a.ecartVoisin! ? b : a)) : undefined;
  const sousEcart = ecarts.filter((m) => m.ecartVoisin! < ECART_MINIMAL_DES_CLARTES - 1e-6);
  const cassees = sous.filter((m) => !m.ordre);
  const nouvelles = sous.filter((m) => m.nouvelles.length);
  const parGarantie = new Map<string, number>();
  for (const m of nouvelles) for (const n of m.nouvelles) { const g = n.split('(')[0]; parGarantie.set(g, (parGarantie.get(g) ?? 0) + 1); }
  console.log(`cran ${numero} : ${sous.length} rampes`);
  console.log(`  correction ΔL : médiane ${f(mediane(dl))}, maximale ${f(max.dL)} (teinte ${max.teinte}, ${max.base}, L réf ${f(max.L, 2)}) ; teintes à 0,001 du maximum : ${[...new Set(sous.filter((m) => m.dL >= max.dL - 0.001).map((m) => m.teinte))].sort((a, b) => a - b).slice(0, 20).join(',')}`);
  console.log(`  crans qui butent sur le voisin (garantie encore manquée) : ${butees.length}${butees.length ? ` (teintes ${[...new Set(butees.map((m) => `${m.teinte}/${m.base}`))].slice(0, 12).join(', ')})` : ''}`);
  console.log(`  ordre des nuances cassé : ${cassees.length}${cassees.length ? ` (${cassees.slice(0, 8).map((m) => `${m.teinte}/${m.base}/${f(m.L, 2)}`).join(', ')})` : ''}`);
  console.log(`  plus petit écart au voisin plus clair : ${mini ? `${f(mini.ecartVoisin!)} (teinte ${mini.teinte}, ${mini.base}, L réf ${f(mini.L, 2)})` : 'sans voisin plus clair'} ; sous ${ECART_MINIMAL_DES_CLARTES} : ${sousEcart.length}`);
  console.log(`  garanties nouvellement manquées : ${nouvelles.length} rampes${parGarantie.size ? ` (${[...parGarantie].map(([g, n]) => `${g}: ${n}`).join(', ')})` : ''}`);
  for (const m of nouvelles.slice(0, 10)) console.log(`    teinte ${m.teinte} ${m.base} L ${f(m.L, 2)} : ${m.nouvelles.join(', ')}`);
}

// 3. Light et Dark normal.
console.log('\n=== Light et Dark normal intacts (la règle ne s\'applique qu\'au Dark inversé)');
for (const [nom, recette] of [['inversé', BASE], ['normal', NORMALE]] as const) {
  let total = 0, differentes = 0;
  for (const p of recette.palettes) {
    const reelles = M.rampesDe(recette, p);
    const brutes = M.rampesSansCorrection(recette, p);
    const ancrage = M.ancrageDe(recette, p);
    for (const i of M.intensitesDe(p)) {
      total += 1;
      const apres = M.corrigerLesTextes(recette, 'light', brutes[i]!.light, i === ancrage.profil ? ancrage.rangs.light : undefined).rampe;
      if (octets(reelles[i]!.light) !== octets(apres)) differentes += 1;
    }
  }
  console.log(`Light (Dark ${nom}) : ${total - differentes}/${total} rampes identiques avant et après`);
}
{
  let total = 0, differentes = 0;
  for (const p of NORMALE.palettes) {
    const reelles = M.rampesDe(NORMALE, p);
    const brutes = M.rampesSansCorrection(NORMALE, p);
    const ancrage = M.ancrageDe(NORMALE, p);
    for (const i of M.intensitesDe(p)) {
      total += 1;
      // En Dark normal la règle n'est pas appliquée : `rampesDe` garde le glissement de la référence.
      const sansRegle = M.corrigerLesTextes(NORMALE, 'dark', brutes[i]!.dark, i === ancrage.profil ? ancrage.rangs.dark : undefined).rampe;
      if (octets(sansRegle) !== octets(reelles[i]!.dark)) differentes += 1;
    }
  }
  console.log(`Dark normal : ${total - differentes}/${total} rampes égales à la correction avec cran protégé (écart attendu : références glissées, hors règle)`);
}
