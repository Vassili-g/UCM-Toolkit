/**
 * Cale une courbe de teinte sur la borne vers le blanc de Vivid en Light, pour
 * que la vivacité perçue de ses tons clairs suive l'organisation de Tailwind.
 *
 * La courbe généralise la marge des jaunes du moteur :
 * `marge(H) = 1 + jaunes × g(H, 100°, 12°) + verts × g(H, centre, largeur)`,
 * où `g` est une bosse gaussienne sur le cercle des teintes. `verts` est
 * négatif : il retient l'arc vert-cyan. Soft et le thème Dark ne changent pas.
 *
 * Critère : pour chaque famille de Tailwind et chaque cran 100, 200, 300, le
 * rapport entre la vivacité perçue (CAM16-UCS M') de Vivid et celle du même
 * cran de Tailwind doit être le même d'une teinte à l'autre. La cible est la
 * médiane de ces rapports, et l'écart compte des deux côtés. Une teinte que
 * l'écran plafonne ne bouge avec aucune courbe : elle ne pèse pas sur le choix.
 *
 * `npx tsx caler-teintes.ts` écrit MESURES-TEINTES-VIVID.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Mode, Palette, Recette, Rgb8 } from '../../../../../../packages/couleur/src/index';
import { GARANTIES, garantieJugeable } from '../../../../../../packages/kit/src/emplois/garanties';
import { TABLE_DES_DOSSIERS, sensDuTheme, COULEUR_DU_TEXTE_DES_BOUTONS } from '../../../../../../packages/kit/src/emplois/dossiers';
import { atteintLeSeuil, contraste } from '../../../../../../packages/kit/src/emplois/contraste';
import { rampesDuBanc, type RegleDeChroma } from '../../Recette CRITIQUE de qualité/Mesures/prototype';
import { cam16 } from './cam16';

const base = M.recetteParDefaut();
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const mediane = (xs: number[]) => { const t = [...xs].sort((a, b) => a - b); return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2; };
const ecart = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const bosse = (H: number, centre: number, largeur: number) => Math.exp(-0.5 * (ecart(H, centre) / largeur) ** 2);
const palette = (k: number, reference: string, nom: string): Palette => {
  const derive = M.prereglageTailwind(M.rgb8VersOklch(M.lireHexa(reference)!), M.boutsDe(base));
  return { id: `p-${(k + 1).toString(16).padStart(8, '0')}`, reference, nom, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } } as Palette;
};
const TW = JSON.parse(readFileSync(new URL('../../Recette CRITIQUE de qualité/Mesures/references/tailwind-3.4.17.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>;
const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const FAMILLES = Object.entries(TW).filter(([n]) => !NEUTRES.has(n));
const Mucs = (c: Rgb8) => cam16(c).Mucs;

interface Courbe { jaunes: number; verts: number; centre: number; largeur: number }

/** La règle du moteur, avec la courbe de teinte pour Vivid (et l'intensité unique) en Light. */
const regle = (courbe: Courbe | null): RegleDeChroma => ({ L, H, part, intensite, mode }) => {
  const env = M.enveloppeDe(base, intensite, mode);
  if (!courbe || intensite === 'soft' || mode === 'dark') return M.cranVise(L, H, part, 'srgb', env).C;
  const marge = 1 + courbe.jaunes * bosse(H, 100, 12) + courbe.verts * bosse(H, courbe.centre, courbe.largeur);
  return Math.min(part * M.plafond(L, H, 'srgb'), env.p0 * Math.min(env.a * marge * (1 - L), env.b * L));
};

// Contrôle : sans courbe, la règle et la chaîne du banc rendent le paquet à l'octet près.
const recetteTW: Recette = { ...base, palettes: FAMILLES.map(([n, c], k) => palette(k, c['500'], n)) };
{
  const actuelle: Courbe = { jaunes: base.profils.vivid.enveloppe.light.jaunes, verts: 0, centre: 175, largeur: 30 };
  let ecarts = 0;
  for (const p of recetteTW.palettes) {
    const [a, b] = [M.rampesDe(recetteTW, p), rampesDuBanc(recetteTW, p, regle(actuelle))];
    for (const i of ['soft', 'vivid'] as const) for (const m of ['light', 'dark'] as Mode[]) a[i]![m].forEach((c, k) => { if (c.hexa !== b[i]![m][k].hexa) ecarts += 1; });
  }
  console.log(`Contrôle de la chaîne : ${ecarts} nuance(s) différente(s) du paquet.`);
  if (ecarts) process.exit(1);
}

const CRANS = [100, 200, 300];
/** Vivacité perçue de Vivid Light rapportée à celle de Tailwind, par famille et par cran. */
function rapports(courbe: Courbe): number[][] {
  const R = regle(courbe);
  return recetteTW.palettes.map((p) => {
    const rr = rampesDuBanc(recetteTW, p, R).vivid!.light;
    return CRANS.map((cran) => Mucs(rr[base.crans.indexOf(cran)].couleur) / Mucs(M.lireHexa(TW[p.nom!][String(cran)])!));
  });
}
/** L'excès de chaque rapport sur la cible (médiane de tous les rapports de la courbe actuelle). */
const CIBLE = mediane(rapports({ jaunes: 0.5, verts: 0, centre: 175, largeur: 30 }).flat());
const erreur = (rs: number[][]) => rs.flat().reduce((s, x) => s + Math.log(x / CIBLE) ** 2, 0);

let meilleure = { courbe: { jaunes: 0.5, verts: 0, centre: 175, largeur: 30 }, erreur: Infinity };
for (const jaunes of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) for (const verts of [0, -0.05, -0.1, -0.15, -0.2, -0.25, -0.3]) for (const centre of [150, 160, 170, 180, 190, 200]) for (const largeur of [12, 16, 20, 25, 30, 35]) {
  const courbe = { jaunes, verts, centre, largeur };
  const e = erreur(rapports(courbe));
  if (e < meilleure.erreur - 1e-9) meilleure = { courbe, erreur: e };
}
console.log(`Cible : Vivid à ${r3(CIBLE)} de la vivacité perçue de Tailwind, crans ${CRANS.join(', ')}.`);
console.log('Courbe retenue :', JSON.stringify(meilleure.courbe), 'erreur', r3(meilleure.erreur), 'contre', r3(erreur(rapports({ jaunes: 0.5, verts: 0, centre: 175, largeur: 30 }))));

const actuelle = rapports({ jaunes: 0.5, verts: 0, centre: 175, largeur: 30 });
const calee = rapports(meilleure.courbe);
console.log('\nVivacité perçue Vivid Light ÷ Tailwind, crans 100 · 200 · 300 : aujourd\'hui → courbe');
recetteTW.palettes.forEach((p, j) => console.log(`  ${p.nom!.padEnd(8)} ${actuelle[j].map((x) => x.toFixed(2)).join(' · ')}  →  ${calee[j].map((x) => x.toFixed(2)).join(' · ')}`));

// Les couleurs changées, et la marge de la courbe autour du cercle.
const marges = Array.from({ length: 24 }, (_, k) => { const H = 15 * k; return { H, marge: r3(1 + meilleure.courbe.jaunes * bosse(H, 100, 12) + meilleure.courbe.verts * bosse(H, meilleure.courbe.centre, meilleure.courbe.largeur)) }; });
console.log('\nMarge de la borne vers le blanc par teinte :', marges.map((m) => `${m.H}°:${m.marge}`).join(' '));
const exemples: Record<string, unknown> = {};
for (const nom of ['yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue']) {
  const p = recetteTW.palettes.find((x) => x.nom === nom)!;
  const [a, b] = [rampesDuBanc(recetteTW, p, regle({ jaunes: 0.5, verts: 0, centre: 175, largeur: 30 })).vivid!.light, rampesDuBanc(recetteTW, p, regle(meilleure.courbe)).vivid!.light];
  exemples[nom] = { avant: a.map((c) => c.hexa), apres: b.map((c) => c.hexa), tailwind: base.crans.map((c) => TW[nom][String(c)]) };
  console.log(`  ${nom.padEnd(8)} ${[100, 200, 300, 400].map((c) => `${c} ${a[base.crans.indexOf(c)].hexa}→${b[base.crans.indexOf(c)].hexa} (TW ${TW[nom][String(c)]})`).join('  ')}`);
}

// Les promesses une à une, sur le balayage de 72 teintes, deux clartés, quatre combinaisons.
function juger(r: Recette, p: Palette, rr: ReturnType<typeof rampesDuBanc>) {
  const sortie = new Map<string, boolean>();
  for (const mode of ['light', 'dark'] as Mode[]) {
    const sens = sensDuTheme(mode, r.texteDesBoutons[mode]);
    const table = TABLE_DES_DOSSIERS[mode][sens] as Record<string, number | 'texteDesBoutons'>;
    for (const intensite of M.intensitesDe(p)) {
      const couleur = (v: string): Rgb8 => (table[v] === 'texteDesBoutons' ? M.lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[r.texteDesBoutons[mode]])! : rr[intensite]![mode][r.crans.indexOf(table[v] as number)].couleur);
      for (const g of GARANTIES) {
        if (!garantieJugeable(g, r.crans, mode, sens)) continue;
        for (const f of g.fonds) {
          const second = 'fondDeLaPage' in f ? M.lireHexa(r.fonds[mode])! : 'fondDeLaCarte' in f ? M.couleurDeLaCarte(r, mode) : couleur(f.variable);
          sortie.set(`${p.id}/${mode}/${intensite}/G${g.numero}/${'fondDeLaPage' in f ? 'page' : 'fondDeLaCarte' in f ? 'carte' : f.variable}`, !atteintLeSeuil(contraste(couleur(g.premier.variable), second), r.seuils[g.seuil]));
        }
      }
    }
  }
  return sortie;
}
const balayage: Palette[] = [];
for (const L of [0.62, 0.75]) for (let h = 0; h < 360; h += 5) balayage.push(palette(balayage.length, M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C: Math.min(0.16, M.plafond(L, h, 'srgb') * 0.95), H: h }))), `${h}`));
let [total, plus, moins] = [0, 0, 0];
for (const [clair, sombre] of [['blanc', 'noir'], ['noir', 'blanc'], ['blanc', 'blanc'], ['noir', 'noir']] as const) {
  const r = { ...base, texteDesBoutons: { light: clair, dark: sombre }, courbes: M.courbesParDefaut(11, { light: clair, dark: sombre }), palettes: balayage } as Recette;
  for (const p of balayage) {
    const [a, b] = [juger(r, p, M.rampesDe(r, p)), juger(r, p, rampesDuBanc(r, p, regle(meilleure.courbe)))];
    for (const [k, m] of b) { if (m) total += 1; if (m && !a.get(k)) plus += 1; if (!m && a.get(k)) moins += 1; }
  }
}
console.log(`\nBalayage avec la courbe : ${total} promesses manquées, +${plus} −${moins} par rapport au moteur.`);

writeFileSync(new URL('./MESURES-TEINTES-VIVID.json', import.meta.url), `${JSON.stringify({ cible: CIBLE, courbe: meilleure.courbe, marges, rapports: { familles: recetteTW.palettes.map((p) => p.nom), crans: CRANS, actuelle, calee }, exemples, balayage: { total, plus, moins } }, null, 1)}\n`);
