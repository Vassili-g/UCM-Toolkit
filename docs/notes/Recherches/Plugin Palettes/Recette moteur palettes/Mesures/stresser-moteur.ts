/**
 * Test de charge du moteur retenu par le mainteneur, contre le moteur d'aujourd'hui.
 *
 * Moteur retenu : règle de Soft d'aujourd'hui, tons clairs de Soft × 0,7 en Light, borne de Soft vers
 * le noir en Dark 0,15, Vivid porte toujours la référence, courbe de teinte v2, bosse gardée hors
 * fonds sauf quand Vivid y pose la référence, clarté selon la teinte avec chroma gardée et gardée. La chaîne est celle de
 * `mesurer-troisieme-passe.ts`, compilée en mémoire jusqu'à son contrôle.
 *
 * Situations : un balayage dense des références (teinte, clarté, chroma), des références extrêmes, chaque
 * réglage que le designer peut toucher, les quatre combinaisons du texte des boutons, la grille de 13
 * nuances, les listes libres et figées, la recette du mainteneur et la galerie, et la continuité d'une
 * référence à sa voisine. Chaque contrôle est numéroté comme dans STRESS-TEST.md.
 *
 * `npx tsx stresser-moteur.ts` écrit STRESS-TEST.json.
 *
 * L'oracle du portage : `ORACLE=ecrire` range les rampes du moteur retenu de chaque situation S1 à S3
 * dans ORACLE-PORTAGE.json, avant l'implémentation. `ORACLE=verifier` compare ensuite, situation par
 * situation, les rampes que le paquet calcule (`rampesDe`) à cet oracle, et écrit VERIFICATION-PORTAGE.json.
 * L'oracle se range sur le paquet des lots 1 à 3 du plan, porteur toujours Vivid compris. Trois écarts
 * sont attendus : le paquet ajoute la clarté selon la teinte à une luminosité du Color shift déjà
 * réglée, que le banc remplaçait ; il borne la part saturée par le Color shift avant le facteur des
 * fonds Dark, le banc après ; les palettes figées du jeu S3 sont fabriquées par `rampesDe` lui-même. Trois variables d'environnement rejouent les
 * étapes écartées : `SEUIL=0.78` (Vivid ne porte la référence qu'à partir de cette part),
 * `CLARTE_GARDEE=0` (la clarté selon la teinte sans sa garde), `BOSSE_FONDS=0` (la bosse toujours hors
 * des fonds).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Cran, Mode, Palette, Recette } from '../../../../../../packages/couleur/src/index';

const dossier = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const source = readFileSync(resolve(dossier, 'mesurer-troisieme-passe.ts'), 'utf8');
const programme = `${source.slice(0, source.indexOf('// ------------------------------------------------------------ contrôle'))}
export { construire, juger, verdictsActuels, verdictsProposes, paletteTailwind, avecTexte, clarteSelonLaTeinte, avecClarteSelonLaTeinte, JEUX, MAINTENEUR, GALERIE, CLARTE_MAXIMALE };`;
const compile = buildSync({ stdin: { contents: programme, resolveDir: dossier, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.url': JSON.stringify(new URL('./mesurer-troisieme-passe.ts', import.meta.url).href) } });
const module_ = { exports: {} as Record<string, any> };
new Function('require', 'module', 'exports', compile.outputFiles[0].text)(require, module_, module_.exports);
const B = module_.exports;

type Rampes = Partial<Record<'soft' | 'vivid' | 'unique', Record<Mode, Cran[]>>>;
const MODES: Mode[] = ['light', 'dark'];
const base: Recette = M.recetteParDefaut();
const r3 = (x: number) => Math.round(x * 1000) / 1000;

const AUJOURDHUI = { id: 'A', nom: '', soft: null, bosse: null };
const RETENU = {
  id: 'RETENU', nom: '',
  // La part à partir de laquelle Vivid porte la référence : 0, toujours.
  soft: { k: 10, porteur: 'actuel', seuilPorteur: Number(process.env.SEUIL ?? 0), pales: true, clairsSoft: 0.7, teintes: true },
  // Une référence que Vivid pose dans la zone des fonds y ramène la bosse.
  bosse: { sigma: 0.1, garde: true, horsFonds: process.env.BOSSE_FONDS === '0' ? true : 'saufReference' }, clarteTeinte: 'garde', softDarkB: 0.15,
  // La clarté selon la teinte se réduit jusqu'à ne faire perdre aucune promesse.
  clarteGarde: process.env.CLARTE_GARDEE !== '0',
};

// ------------------------------------------------------------ les contrôles

interface Constat { controle: string; cas: string; detail: string }
const constats: Constat[] = [];
const compteurs: Record<string, { cas: number; ecarts: number; aujourdhui: number }> = {};
const noter = (controle: string, ecart: boolean, aujourdhui = false) => {
  const c = (compteurs[controle] ??= { cas: 0, ecarts: 0, aujourdhui: 0 });
  c.cas += 1; if (ecart) c.ecarts += 1; if (aujourdhui) c.aujourdhui += 1;
};
const ventilation: Record<string, Record<string, number>> = {};
const ventiler = (controle: string, cle: string) => { (ventilation[controle] ??= {})[cle] = (ventilation[controle][cle] ?? 0) + 1; };
const signaler = (controle: string, cas: string, detail: string) => { if (constats.filter((x) => x.controle === controle).length < 25) constats.push({ controle, cas, detail }); };

const HEXA = /^#[0-9A-F]{6}$/;
const intensites = (rr: Rampes) => (Object.keys(rr) as ('soft' | 'vivid' | 'unique')[]);

/** C2 : l'ordre des clartés, décroissant en Light, croissant en Dark, nuance par nuance (égalité tolérée aux bouts écrêtés). */
const ordreRompu = (rampe: Cran[], mode: Mode) => rampe.some((c, i) => i > 0 && (mode === 'light' ? c.L > rampe[i - 1].L + 1e-4 : c.L < rampe[i - 1].L - 1e-4));
/** C5 : un creux, une nuance intérieure sous 0,9 fois la moins vive de ses voisines, hors de la référence. */
const creux = (rampe: Cran[], ancre: number) => rampe.some((c, i) => i > 0 && i < rampe.length - 1 && i !== ancre && Math.min(rampe[i - 1].C, rampe[i + 1].C) > 0.02 && c.C < 0.9 * Math.min(rampe[i - 1].C, rampe[i + 1].C));
/** C7 : un saut de teinte de plus de 25° entre deux nuances voisines colorées. */
const sautDeTeinte = (rampe: Cran[]) => rampe.some((c, i) => i > 0 && c.C > 0.03 && rampe[i - 1].C > 0.03 && Math.abs(M.ecartAngulaire(c.H, rampe[i - 1].H)) > 25);

const MODE_ORACLE = process.env.ORACLE;
const oracle: Record<string, { porteur: string; rangs: Record<Mode, number>; rampes: Record<string, Record<Mode, string>> }> = MODE_ORACLE === 'verifier'
  ? JSON.parse(readFileSync(resolve(dossier, 'ORACLE-PORTAGE.json'), 'utf8'))
  : {};
const enTexte = (rr: Rampes) => Object.fromEntries(intensites(rr).map((i) => [i, Object.fromEntries(MODES.map((m) => [m, rr[i]![m].map((c) => c.hexa.slice(1)).join(',')]))]));
const verification = { identiques: 0, differentes: 0, attendues: 0, porteurChange: 0, pireCanal: 0, exemples: [] as string[] };
/** Le plus grand écart sur un canal, de 0 à 255, entre deux rampes rangées en texte. */
const ecartCanal = (x: string, y: string) => {
  const [a, b] = [x.split(','), y.split(',')];
  let pire = a.length === b.length ? 0 : 255;
  a.forEach((h, k) => { for (let c = 0; c < 6; c += 2) pire = Math.max(pire, Math.abs(parseInt(h.slice(c, c + 2), 16) - parseInt((b[k] ?? '000000').slice(c, c + 2), 16))); });
  return pire;
};
function verifier(cas: string, r: Recette, p: Palette) {
  const attendu = oracle[cas];
  if (!attendu) return;
  const calcule = enTexte(M.rampesDe(r, p) as Rampes);
  const ancrage = M.ancrageDe(r, p);
  if (!M.estFigee(p) && ancrage.profil !== attendu.porteur) verification.porteurChange += 1;
  let pire = 0;
  for (const i of Object.keys(attendu.rampes)) for (const m of MODES) pire = Math.max(pire, calcule[i]?.[m] === undefined ? 255 : ecartCanal(attendu.rampes[i][m], calcule[i][m]));
  // Le banc remplaçait la luminosité réglée du Color shift par la clarté selon la teinte ; le paquet les additionne.
  const luminositeReglee = (['soft', 'vivid'] as const).some((i) => p.derive[i]?.clarte !== undefined);
  const saturationReglee = (['soft', 'vivid'] as const).some((i) => p.derive[i]?.saturation !== undefined);
  if (pire === 0) verification.identiques += 1;
  else if (luminositeReglee || saturationReglee || cas.startsWith('S3 palette figée')) verification.attendues += 1;
  else {
    verification.differentes += 1;
    verification.pireCanal = Math.max(verification.pireCanal, pire);
    if (verification.exemples.length < 40) verification.exemples.push(`${cas} : écart ${pire} sur un canal`);
  }
}

function controler(cas: string, r: Recette, p: Palette) {
  if (MODE_ORACLE === 'verifier') { verifier(cas, r, p); return; }
  let a: any, n: any;
  try { a = B.construire(r, p, AUJOURDHUI); } catch (e) { noter('C0 aujourd\'hui calcule', true); signaler('C0 aujourd\'hui calcule', cas, String(e)); return; }
  try { n = B.construire(r, p, RETENU); } catch (e) { noter('C0 le moteur retenu calcule', true); signaler('C0 le moteur retenu calcule', cas, String(e)); return; }
  noter('C0 le moteur retenu calcule', false);
  const [ra, rn] = [a.rampes as Rampes, n.rampes as Rampes];
  if (MODE_ORACLE === 'ecrire') oracle[cas] = { porteur: n.porteur, rangs: n.rangs, rampes: enTexte(rn) };
  const figee = M.estFigee(p);
  const reference = M.referenceDe(p);
  const refHexa = M.ecrireHexa(reference);

  // C1 : des octets valides, et le même résultat à chaque calcul.
  const valides = intensites(rn).every((i) => MODES.every((m) => rn[i]![m].every((c) => HEXA.test(c.hexa) && Number.isFinite(c.L) && Number.isFinite(c.C))));
  noter('C1 octets valides', !valides); if (!valides) signaler('C1 octets valides', cas, 'hexa ou L/C invalide');
  const encore = B.construire(r, p, RETENU).rampes as Rampes;
  const stable = intensites(rn).every((i) => MODES.every((m) => rn[i]![m].every((c, k) => c.hexa === encore[i]![m][k].hexa)));
  noter('C1 calcul déterministe', !stable); if (!stable) signaler('C1 calcul déterministe', cas, 'deux calculs diffèrent');

  // C3 : la référence exacte, au cran de l'ancrage, dans le profil porteur ([MOT-17]).
  if (!figee) {
    const exacte = MODES.every((m) => rn[n.porteur]![m][n.rangs[m]].hexa === refHexa);
    noter('C3 référence exacte à son cran', !exacte); if (!exacte) signaler('C3 référence exacte à son cran', cas, `porteur ${n.porteur}`);
  }
  if (figee) {
    const intacte = intensites(rn).every((i) => MODES.every((m) => rn[i]![m].every((c, k) => c.hexa === ra[i]![m][k].hexa)));
    noter('C4 palette figée intacte', !intacte); if (!intacte) signaler('C4 palette figée intacte', cas, 'une couleur figée change');
    return;
  }

  for (const i of intensites(rn)) for (const m of MODES) {
    const lieu = `${cas} · ${i} · ${m}`;
    const [x, y] = [rn[i]![m], ra[i]![m]];
    const ancre = i === n.porteur ? n.rangs[m] : -1;
    const ordre = ordreRompu(x, m), ordreAvant = ordreRompu(y, m);
    noter('C2 ordre des clartés', ordre && !ordreAvant, ordreAvant); if (ordre && !ordreAvant) signaler('C2 ordre des clartés', lieu, x.map((c) => r3(c.L)).join(' '));
    const cr = creux(x, ancre), crAvant = creux(y, i === a.porteur ? a.rangs[m] : -1);
    if (cr && !crAvant) {
      const voisin = x.some((c, k) => k > 0 && k < x.length - 1 && Math.min(x[k - 1].C, x[k + 1].C) > 0.02 && c.C < 0.9 * Math.min(x[k - 1].C, x[k + 1].C) && Math.abs(k - ancre) === 1);
      ventiler('C5 cause', voisin ? 'à côté de la référence' : 'ailleurs');
      ventiler('C5 situation', `${i} · ${m}`);
      // La profondeur du pire creux, en chroma, et la clarté de la référence : un creux sous 0,01 ou près du noir ne se voit guère.
      let pire = 0, ou = -1;
      x.forEach((c, k) => { if (k > 0 && k < x.length - 1 && k !== ancre) { const v = Math.min(x[k - 1].C, x[k + 1].C); if (v > 0.02 && c.C < 0.9 * v && v - c.C > pire) { pire = v - c.C; ou = k; } } });
      ventiler('C5 profondeur', pire < 0.01 ? 'moins de 0,01' : pire < 0.02 ? '0,01 à 0,02' : pire < 0.04 ? '0,02 à 0,04' : 'plus de 0,04');
      const Lref = ancre >= 0 ? x[ancre].L : NaN;
      ventiler('C5 clarté de la référence', Lref < 0.3 ? 'sous 0,30' : Lref < 0.5 ? '0,30 à 0,50' : Lref < 0.7 ? '0,50 à 0,70' : '0,70 ou plus');
      ventiler('C5 cran du creux', `${m} ${r.crans[ou]}`);
      if (pire >= 0.02) ventiler('C5 creux d\'au moins 0,02', `${i} · ${m} · réf. ${Lref < 0.3 ? 'sous 0,30' : Lref < 0.5 ? '0,30 à 0,50' : '0,50 ou plus'}`);
    }
    noter('C5 creux de chroma', cr && !crAvant, crAvant); if (cr && !crAvant) signaler('C5 creux de chroma', lieu, x.map((c) => r3(c.C)).join(' '));
    const st = sautDeTeinte(x), stAvant = sautDeTeinte(y);
    noter('C7 saut de teinte', st && !stAvant, stAvant); if (st && !stAvant) signaler('C7 saut de teinte', lieu, x.map((c) => Math.round(c.H)).join(' '));
    // C8 : une référence sans teinte donne des rampes sans teinte.
    const lue = M.rgb8VersOklch(reference);
    if (lue.C < M.CHROMA_SANS_TEINTE || M.estGrisPur(reference)) {
      const grise = x.every((c, k) => k === ancre || c.C < 0.012);
      const griseAvant = y.every((c, k) => k === (i === a.porteur ? a.rangs[m] : -1) || c.C < 0.012);
      noter('C8 référence grise, rampes grises', !grise && griseAvant, !griseAvant); if (!grise) signaler('C8 référence grise, rampes grises', lieu, x.map((c) => r3(c.C)).join(' '));
    }
  }
  // C6 : Soft ne dépasse pas Vivid, hors de la référence et des parts réglées par le designer.
  if (rn.soft && rn.vivid && !p.parts) {
    for (const m of MODES) {
      const ancre = n.rangs[m];
      const depasse = rn.soft[m].some((c, k) => k !== ancre && rn.vivid![m][k].C > 0.02 && c.C > 1.02 * rn.vivid![m][k].C);
      const avant = ra.soft![m].some((c, k) => k !== a.rangs[m] && ra.vivid![m][k].C > 0.02 && c.C > 1.02 * ra.vivid![m][k].C);
      if (depasse) {
        const pire = Math.max(...rn.soft[m].map((c, k) => (k !== ancre && rn.vivid![m][k].C > 0.02 ? c.C / rn.vivid![m][k].C : 0)));
        ventiler('C6 ampleur', pire > 1.15 ? 'plus de 15 %' : pire > 1.05 ? '5 à 15 %' : 'moins de 5 %');
        ventiler('C6 situation', cas.startsWith('S2') ? `S2 · ${cas.split(' · ').at(-1)}` : cas.split(' ')[0]);
      }
      noter('C6 Soft pas plus vif que Vivid', depasse, avant); if (depasse) signaler('C6 Soft pas plus vif que Vivid', `${cas} · ${m}`, rn.soft[m].map((c, k) => `${r3(c.C)}/${r3(rn.vivid![m][k].C)}`).join(' '));
    }
  }
  // C9 : les promesses, une à une ; une promesse tenue aujourd'hui et manquée par le moteur retenu.
  const [pa, pn] = [B.juger(r, p, ra), B.juger(r, p, rn)];
  const avant = new Map(pa.map((x: any) => [x.cle, x]));
  let perdues = 0, gagnees = 0;
  for (const x of pn) {
    const y: any = avant.get(x.cle);
    if (x.manquee && y && !y.manquee) {
      perdues += 1;
      const prof = x.cle.split('/')[3];
      const cause = a.porteur !== n.porteur && (prof === n.porteur || prof === a.porteur) ? 'la référence change de profil' : x.cle.includes('/dark/') ? 'Dark, autre cause' : 'Light, autre cause';
      ventiler('C9 cause', cause);
      ventiler('C9 situation', cas.startsWith('S2') ? `S2 · ${cas.split(' · ').at(-1)}` : cas.split(' ')[0]);
      signaler('C9 promesse perdue', cas, `${x.cle.split('/').slice(1).join('/')} ${r3(y.contraste)} → ${r3(x.contraste)} (${cause})`);
    }
    if (!x.manquee && y?.manquee) gagnees += 1;
  }
  noter('C9 promesse perdue', perdues > 0); (compteurs['C9 promesse perdue'] as any).perdues = ((compteurs['C9 promesse perdue'] as any).perdues ?? 0) + perdues;
  (compteurs['C9 promesse perdue'] as any).gagnees = ((compteurs['C9 promesse perdue'] as any).gagnees ?? 0) + gagnees;
  // C10 : la dérive de clarté du préréglage reste dans ±0,03 et respecte une clarté déjà réglée par le designer.
  const dc = B.clarteSelonLaTeinte(r, p);
  if (dc) noter('C10 clarté du préréglage bornée', Math.abs(dc.clair) > B.CLARTE_MAXIMALE + 1e-9 || dc.sombre !== 0);
  if (p.derive.vivid.clarte) {
    const q = B.avecClarteSelonLaTeinte(r, p);
    const garde = JSON.stringify(q.derive.vivid.clarte) === JSON.stringify(p.derive.vivid.clarte);
    noter('C10 clarté du designer conservée', !garde); if (!garde) signaler('C10 clarté du designer conservée', cas, JSON.stringify(q.derive.vivid.clarte));
  }
  // C11 : la carte Dark reste distincte du fond teinté (Q5), mesurée au contraste.
  if (r.crans.includes(300)) {
    const t = (rr: Rampes, i: 'soft' | 'vivid' | 'unique') => M.contraste(rr[i]!.dark[r.crans.indexOf(300)].couleur, M.couleurDeLaCarte(r, 'dark'));
    for (const i of intensites(rn)) {
      const [x, y] = [t(rn, i), t(ra, i)];
      noter('C11 fond Dark contre la carte', x < 1.1 && y >= 1.1, y < 1.1); if (x < 1.1 && y >= 1.1) signaler('C11 fond Dark contre la carte', `${cas} · ${i}`, `${r3(y)} → ${r3(x)}`);
    }
  }
}

// ------------------------------------------------------------ les situations

const recettes = (nombre: 11 | 13 = 11): Record<string, Recette> => Object.fromEntries(([['blanc', 'blanc'], ['blanc', 'noir'], ['noir', 'blanc'], ['noir', 'noir']] as const).map(([c, s]) => {
  const g = M.PREREGLAGES[nombre];
  return [`${nombre} nuances, texte ${c}/${s}`, { ...base, crans: g.crans, texteDesBoutons: { light: c, dark: s }, courbes: M.courbesParDefaut(nombre, { light: c, dark: s }) } as Recette];
}));

// S1 : le balayage dense des références, dans deux combinaisons du texte des boutons.
const balayage: string[] = [];
for (let H = 0; H < 360; H += 5) for (const L of [0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95]) for (const C of [0.03, 0.08, 0.15, 1]) {
  const Cmax = M.plafond(L, H, 'srgb') * 0.98;
  balayage.push(M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C: Math.min(C, Cmax), H }))));
}
const uniques = [...new Set(balayage)];
const R11 = recettes(11);
let n = 0;
for (const nomRecette of ['11 nuances, texte blanc/blanc', '11 nuances, texte blanc/noir']) {
  const r0 = R11[nomRecette];
  for (const hexa of uniques) {
    const p = B.paletteTailwind(n++ % 999, hexa, hexa);
    controler(`S1 ${nomRecette} · ${hexa}`, { ...r0, palettes: [p] }, p);
  }
}
console.log(`S1 balayage : ${uniques.length} références × 2 combinaisons`);

// S2 : références extrêmes × réglages du designer × les quatre combinaisons × 11 et 13 nuances.
const EXTREMES = ['#000000', '#FFFFFF', '#808080', '#7F8081', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#161046', '#FFF8E1', '#0013FF', '#FF0076', '#FFD300', '#EF4444', '#6366F1', '#22C55E', '#EAB308', '#C59735', '#1E6FD9', '#B15152', '#697586', '#0A0A0A', '#F7F7F7'];
const REGLAGES: Record<string, (r: Recette, p: Palette) => Palette> = {
  'préréglage Tailwind': (_, p) => p,
  'dérive constante': (_, p) => ({ ...p, derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } } } as Palette),
  'dérive non liée': (_, p) => ({ ...p, derive: { ...p.derive, lien: false, soft: { clair: 12, sombre: -12, origine: 'libre' } } } as Palette),
  'parts 0,9 / 0,95': (_, p) => ({ ...p, parts: { soft: 0.9, vivid: 0.95, origine: 'designer' } } as Palette),
  'parts 0 / 1': (_, p) => ({ ...p, parts: { soft: 0, vivid: 1, origine: 'designer' } } as Palette),
  'parts 0,2 / 0,3': (_, p) => ({ ...p, parts: { soft: 0.2, vivid: 0.3, origine: 'designer' } } as Palette),
  'saturation réglée 0,3': (r, p) => M.appliquerLesReglages(r, p, { teinte: {}, clarte: {}, part: 0.3 }),
  'saturation réglée 1': (r, p) => M.appliquerLesReglages(r, p, { teinte: {}, clarte: {}, part: 1 }),
  'luminosité réglée +0,08': (r, p) => M.appliquerLesReglages(r, p, { teinte: {}, clarte: { [M.cleDuPorteur(r, p)]: 0.08 } }),
  'luminosité réglée −0,08': (r, p) => M.appliquerLesReglages(r, p, { teinte: {}, clarte: { [M.cleDuPorteur(r, p)]: -0.08 } }),
  'Color shift saturation −1 / +1': (_, p) => ({ ...p, derive: { ...p.derive, soft: { ...p.derive.soft, saturation: { clair: -1, sombre: 1 } }, vivid: { ...p.derive.vivid, saturation: { clair: -1, sombre: 1 } } } } as Palette),
  'Color shift luminosité +0,15 / −0,15': (_, p) => ({ ...p, derive: { ...p.derive, soft: { ...p.derive.soft, clarte: { clair: 0.15, sombre: -0.15 } }, vivid: { ...p.derive.vivid, clarte: { clair: 0.15, sombre: -0.15 } } } } as Palette),
  'Color shift luminosité −0,15 / +0,15': (_, p) => ({ ...p, derive: { ...p.derive, soft: { ...p.derive.soft, clarte: { clair: -0.15, sombre: 0.15 } }, vivid: { ...p.derive.vivid, clarte: { clair: -0.15, sombre: 0.15 } } } } as Palette),
  'référence dans Soft (base)': (_, p) => ({ ...p, base: 'soft' } as Palette),
  'référence dans Vivid (base)': (_, p) => ({ ...p, base: 'vivid' } as Palette),
  'une intensité': (_, p) => ({ ...p, intensites: 1 } as Palette),
};
let s2 = 0;
for (const [nomRecette, r0] of [...Object.entries(R11), ...Object.entries(recettes(13))]) for (const hexa of EXTREMES) for (const [nomReglage, regler] of Object.entries(REGLAGES)) {
  const p0 = B.paletteTailwind(1, hexa, hexa);
  let p: Palette;
  try { p = regler({ ...r0, palettes: [p0] }, p0); } catch (e) { noter('C0 réglage applicable', true); signaler('C0 réglage applicable', `${hexa} · ${nomReglage}`, String(e)); continue; }
  controler(`S2 ${nomRecette} · ${hexa} · ${nomReglage}`, { ...r0, palettes: [p] }, p);
  s2 += 1;
}
console.log(`S2 extrêmes : ${s2} cas`);

// S3 : listes libres et figées, recette du mainteneur, galerie.
{
  const r0 = R11['11 nuances, texte blanc/blanc'];
  for (const hexa of ['#3B82F6', '#EAB308', '#EF4444']) {
    const libre = { ...B.paletteTailwind(2, hexa, 'libre'), crans: [50, 200, 400, 600, 800, 950] } as Palette;
    controler(`S3 liste libre ${hexa}`, { ...r0, palettes: [libre] }, libre);
    const rr = M.rampesDe(r0, B.paletteTailwind(3, hexa, 'x'));
    const figee = { id: 'p-00000004', nom: 'figée', reference: rr.vivid!.light[6].hexa, crans: r0.crans, intensites: 1, figees: { light: rr.vivid!.light.map((c) => c.hexa), dark: rr.vivid!.dark.map((c) => c.hexa) }, derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } } } as unknown as Palette;
    controler(`S3 palette figée ${hexa}`, { ...r0, palettes: [figee] }, figee);
  }
  for (const p of B.MAINTENEUR.palettes) controler(`S3 recette du mainteneur · ${p.nom}`, B.MAINTENEUR, p);
  const rg = { ...base, palettes: B.GALERIE } as Recette;
  for (const p of B.GALERIE) controler(`S3 galerie · ${p.nom}`, rg, p);
}
console.log('S3 libres, figées, mainteneur, galerie : faits');

if (MODE_ORACLE === 'ecrire') {
  writeFileSync(resolve(dossier, 'ORACLE-PORTAGE.json'), `${JSON.stringify(oracle)}
`);
  console.log(`Oracle : ${Object.keys(oracle).length} situations rangées dans ORACLE-PORTAGE.json`);
  process.exit(0);
}
if (MODE_ORACLE === 'verifier') {
  writeFileSync(resolve(dossier, 'VERIFICATION-PORTAGE.json'), `${JSON.stringify(verification, null, 1)}
`);
  console.log(`Portage : ${verification.identiques} situations identiques à l'octet, ${verification.attendues} écarts attendus (Color shift réglé, palettes figées), ${verification.differentes} écarts inattendus (pire canal ${verification.pireCanal}), ${verification.porteurChange} porteurs différents`);
  for (const x of verification.exemples) console.log(`  ${x}`);
  process.exit(verification.differentes === 0 && verification.porteurChange === 0 ? 0 : 1);
}

// S4 : la continuité. Deux références voisines doivent donner deux palettes voisines.
const continuite: Record<string, unknown> = {};
{
  const r0 = R11['11 nuances, texte blanc/blanc'];
  const ecartMax = (x: Rampes, y: Rampes) => {
    let max = 0;
    for (const i of intensites(x)) for (const m of MODES) x[i]![m].forEach((c, k) => { max = Math.max(max, M.distanceOk(c.couleur, y[i]![m][k].couleur)); });
    return max;
  };
  const suite = (nom: string, refs: string[]) => {
    const resultat: Record<string, { pire: number; ou: string }> = {};
    for (const v of [AUJOURDHUI, RETENU]) {
      let pire = 0, ou = '';
      let prec: Rampes | null = null;
      refs.forEach((hexa, k) => {
        const p = B.paletteTailwind(k, hexa, hexa);
        const rr = B.construire({ ...r0, palettes: [p] }, p, v).rampes as Rampes;
        if (prec) { const e = ecartMax(rr, prec); if (e > pire) { pire = e; ou = `${refs[k - 1]} → ${hexa}`; } }
        prec = rr;
      });
      resultat[v.id] = { pire: r3(pire), ou };
    }
    continuite[nom] = resultat;
    console.log(`S4 ${nom} : pire saut entre deux références voisines, aujourd'hui ${resultat.A.pire} (${resultat.A.ou}), retenu ${resultat.RETENU.pire} (${resultat.RETENU.ou})`);
  };
  for (const H of [25, 145, 270, 330]) {
    const refs: string[] = [];
    for (let part = 0.6; part <= 0.99; part += 0.005) {
      const L = 0.62;
      refs.push(M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C: part * M.plafond(L, H, 'srgb'), H }))));
    }
    suite(`saturation 0,60 → 0,99 à ${H}°`, [...new Set(refs)]);
  }
  for (const [L, C] of [[0.62, 0.16], [0.8, 0.12], [0.45, 0.2], [0.9, 0.08]]) {
    const refs: string[] = [];
    for (let H = 0; H < 360; H += 1) refs.push(M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C: Math.min(C, M.plafond(L, H, 'srgb') * 0.98), H }))));
    suite(`teinte 0 → 359° à L ${L}, C ${C}`, [...new Set(refs)]);
  }
  for (const H of [60, 250]) {
    const refs: string[] = [];
    for (let L = 0.15; L <= 0.95; L += 0.005) refs.push(M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C: Math.min(0.12, M.plafond(L, H, 'srgb') * 0.95), H }))));
    suite(`clarté 0,15 → 0,95 à ${H}°`, [...new Set(refs)]);
  }
}

// ------------------------------------------------------------ résultat

console.log('\nContrôle | cas | écarts du moteur retenu | déjà présents aujourd\'hui');
for (const [k, c] of Object.entries(compteurs).sort()) console.log(`${k.padEnd(38)} ${String(c.cas).padStart(7)} ${String(c.ecarts).padStart(7)} ${String(c.aujourdhui).padStart(7)}${(c as any).perdues !== undefined ? `   (promesses perdues ${(c as any).perdues}, gagnées ${(c as any).gagnees})` : ''}`);
console.log('\nVentilations :');
for (const [k, v] of Object.entries(ventilation)) console.log(`  ${k} : ${Object.entries(v).sort((x, y) => y[1] - x[1]).map(([c, nb]) => `${c} ${nb}`).join(' · ')}`);
console.log('\nExemples :');
for (const x of constats) console.log(`  ${x.controle} | ${x.cas} | ${x.detail}`);
writeFileSync(resolve(dossier, `STRESS-TEST${process.env.CLARTE_GARDEE === '0' ? '-SANS-GARDE' : ''}${process.env.BOSSE_FONDS === '0' ? '-BOSSE-HORS-FONDS' : ''}${process.env.SEUIL ? `-SEUIL-${process.env.SEUIL}` : ''}.json`), `${JSON.stringify({ compteurs, ventilation, constats, continuite }, null, 1)}\n`);
