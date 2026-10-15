/**
 * Troisième passe sur les deux défauts du moteur, après la revue de Codex
 * (REVIEW-CODEX.md). Elle mesure des règles corrigées :
 *
 * - Soft plafonné : Soft garde sa propre enveloppe (fonds clairs, marge des
 *   jaunes, Light b) et ne dépasse pas k fois ce que Vivid aurait à la même
 *   nuance, avec la part relative, le Color shift et l'atténuation Dark de Soft.
 *   « porteur actuel » garde le classement du paquet ; « porteur k » donne la
 *   référence à Vivid dès que sa part dépasse le milieu entre k × 0,95 et 0,95.
 *   Des parts du designer désactivent le plafond : le designer a choisi.
 * - Bosse corrigée : seule la rampe porteuse se rapproche de la référence, sur
 *   la clarté fabriquée ; « gardée » réduit la bosse, thème par thème, jusqu'à
 *   ne faire perdre aucune promesse tenue sans elle.
 *
 * Les promesses se comparent une par une (palette, thème, sens, intensité,
 * garantie, fond), pas par leur nombre.
 *
 * `npx tsx mesurer-troisieme-passe.ts` écrit MESURES-TROISIEME-PASSE.json et
 * `../Maquettes/donnees-troisieme-passe.js`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Cran, Intensite, Mode, Palette, Recette, Rgb8 } from '../../../../../../packages/couleur/src/index';
import { TABLE_DES_DOSSIERS, VARIABLES_DE_PALETTE, cranDeLaVariable, sensDuTheme, COULEUR_DU_TEXTE_DES_BOUTONS } from '../../../../../../packages/kit/src/emplois/dossiers';
import { GARANTIES as G, garantieJugeable } from '../../../../../../packages/kit/src/emplois/garanties';
import { atteintLeSeuil, contraste } from '../../../../../../packages/kit/src/emplois/contraste';
import { recetteAuxReglagesCommuns } from '../../Recette CRITIQUE de qualité/Mesures/prototype';

const MODES = ['light', 'dark'] as const;
const base = M.recetteParDefaut();
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
const r3 = (x: number) => Math.round(x * 1e3) / 1e3;
const mediane = (xs: number[]) => { if (!xs.length) return NaN; const t = [...xs].sort((a, b) => a - b); return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2; };
const resume = (xs: number[]) => (xs.length ? { n: xs.length, min: r3(Math.min(...xs)), mediane: r3(mediane(xs)), max: r3(Math.max(...xs)) } : { n: 0 });

// ------------------------------------------------------------------ variantes

interface Variante {
  id: string;
  nom: string;
  soft: null | { k: number; porteur: 'actuel' | 'k'; seuilPorteur?: number; niveauCommun?: boolean; pales?: boolean; clairsSoft?: number; clairsVivid?: number; teintes?: boolean };
  bosse: null | { sigma: number; garde: boolean; horsFonds?: boolean | 'saufReference' };
  /**
   * La clarté selon la teinte, lue sur le relevé Tailwind et portée par le Color shift de luminosité.
   * `suit` : la chroma suit la clarté décalée, comme dans le moteur. `garde` : la borne de l'enveloppe
   * se lit à la clarté d'avant ce décalage ; seul le plafond de l'écran suit la nouvelle clarté.
   */
  clarteTeinte?: 'suit' | 'garde';
  /** La borne de Soft vers le noir en Dark (`profils.soft.enveloppe.dark.b`, 0,38 par défaut) : elle règle la chroma de ses fonds Dark. */
  softDarkB?: number;
  /** La clarté selon la teinte se réduit jusqu'à ne faire perdre aucune promesse tenue sans elle, comme la bosse gardée. */
  clarteGarde?: boolean;
}
const VARIANTES: Variante[] = [
  { id: 'A', nom: "Aujourd'hui", soft: null, bosse: null },
  { id: 'SC65', nom: 'Soft plafonné × 0,65, porteur actuel', soft: { k: 0.65, porteur: 'actuel' }, bosse: null },
  { id: 'SK65', nom: 'Soft plafonné × 0,65, porteur à k', soft: { k: 0.65, porteur: 'k' }, bosse: null },
  { id: 'SK75', nom: 'Soft plafonné × 0,75, porteur à k', soft: { k: 0.75, porteur: 'k' }, bosse: null },
  { id: 'SQ65', nom: 'Soft plafonné × 0,65 hors fonds pâles Light, porteur actuel', soft: { k: 0.65, porteur: 'actuel', pales: true }, bosse: null },
  { id: 'SP65', nom: 'Soft plafonné × 0,65 hors fonds pâles Light, porteur à k', soft: { k: 0.65, porteur: 'k', pales: true }, bosse: null },
  { id: 'SP50', nom: 'Soft plafonné × 0,50 hors fonds pâles Light, porteur à k', soft: { k: 0.5, porteur: 'k', pales: true }, bosse: null },
  { id: 'SK50', nom: 'Soft plafonné × 0,50 partout, porteur à k', soft: { k: 0.5, porteur: 'k' }, bosse: null },
  { id: 'SPs', nom: 'SP65, tons clairs Light de Soft × 0,6', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.6 }, bosse: null },
  { id: 'SPs70', nom: 'SP65, tons clairs Light de Soft × 0,7', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.7 }, bosse: null },
  { id: 'SPs80', nom: 'SP65, tons clairs Light de Soft × 0,8', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.8 }, bosse: null },
  { id: 'SPs85', nom: 'SP65, tons clairs Light de Soft × 0,85', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.85 }, bosse: null },
  { id: 'SPc', nom: 'SP65 et courbe de teinte de Vivid', soft: { k: 0.65, porteur: 'k', pales: true, teintes: true }, bosse: null },
  { id: 'AL', nom: "Aujourd'hui et clarté selon la teinte", soft: null, bosse: null, clarteTeinte: 'suit' },
  { id: 'AG', nom: "Aujourd'hui et clarté selon la teinte, chroma gardée", soft: null, bosse: null, clarteTeinte: 'garde' },
  { id: 'SPs85cL', nom: 'SP65, Soft clair × 0,85, courbe v2, clarté selon la teinte', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.85, teintes: true }, bosse: null, clarteTeinte: 'suit' },
  { id: 'SPs85cG', nom: 'SP65, Soft clair × 0,85, courbe v2, clarté selon la teinte, chroma gardée', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.85, teintes: true }, bosse: null, clarteTeinte: 'garde' },
  { id: 'SPs85c', nom: 'SP65, Soft clair × 0,85, courbe de teinte de Vivid', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.85, teintes: true }, bosse: null },
  { id: 'SPs80c', nom: 'SP65, Soft clair × 0,8, courbe de teinte de Vivid', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.8, teintes: true }, bosse: null },
  { id: 'SPv', nom: 'SP65, tons clairs Light de Vivid × 1,2, au plus le plafond', soft: { k: 0.65, porteur: 'k', pales: true, clairsVivid: 0.2 }, bosse: null },
  { id: 'SPsv', nom: 'SP65, tons clairs Light : Soft × 0,6, Vivid × 1,2', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.6, clairsVivid: 0.2 }, bosse: null },
  { id: 'SP75', nom: 'Soft plafonné × 0,75 hors fonds pâles Light, porteur à k', soft: { k: 0.75, porteur: 'k', pales: true }, bosse: null },
  { id: 'CHOIX', nom: 'Choix du mainteneur : Soft actuel, tons clairs × 0,7, courbe v2, bosse gardée hors fonds, clarté chroma gardée', soft: { k: 10, porteur: 'actuel', pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true }, clarteTeinte: 'garde' },
  { id: 'CHOIXSP', nom: 'Le même avec Soft plafonné × 0,65', soft: { k: 0.65, porteur: 'k', pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true }, clarteTeinte: 'garde' },
  { id: 'CHOIXB30', nom: 'Choix du mainteneur, Soft Dark b 0,30', soft: { k: 10, porteur: 'actuel', pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true }, clarteTeinte: 'garde', softDarkB: 0.3 },
  { id: 'CHOIXB25', nom: 'Choix du mainteneur, Soft Dark b 0,25', soft: { k: 10, porteur: 'actuel', pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true }, clarteTeinte: 'garde', softDarkB: 0.25 },
  { id: 'CHOIXB20', nom: 'Choix du mainteneur, Soft Dark b 0,20', soft: { k: 10, porteur: 'actuel', pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true }, clarteTeinte: 'garde', softDarkB: 0.2 },
  { id: 'CHOIXB15', nom: 'Choix du mainteneur, Soft Dark b 0,15', soft: { k: 10, porteur: 'actuel', pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true }, clarteTeinte: 'garde', softDarkB: 0.15 },
  { id: 'CHOIXB10', nom: 'Choix du mainteneur, Soft Dark b 0,10', soft: { k: 10, porteur: 'actuel', pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true }, clarteTeinte: 'garde', softDarkB: 0.1 },
  { id: 'CHOIXB15V', nom: 'Choix du mainteneur, Soft Dark b 0,15, Vivid porte dès 0,78', soft: { k: 10, porteur: 'actuel', seuilPorteur: 0.78, pales: true, clairsSoft: 0.7, teintes: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true }, clarteTeinte: 'garde', softDarkB: 0.15 },
  { id: 'B10', nom: 'Bosse σ 0,10, porteur seul', soft: null, bosse: { sigma: 0.1, garde: false } },
  { id: 'B10g', nom: 'Bosse σ 0,10 gardée', soft: null, bosse: { sigma: 0.1, garde: true } },
  { id: 'B10f', nom: 'Bosse σ 0,10 gardée, hors fonds', soft: null, bosse: { sigma: 0.1, garde: true, horsFonds: true } },
  { id: 'SP65B10f', nom: 'Soft plafonné × 0,65 hors fonds pâles, porteur à k, bosse gardée hors fonds', soft: { k: 0.65, porteur: 'k', pales: true }, bosse: { sigma: 0.1, garde: true, horsFonds: true } },
  { id: 'SP65B10g', nom: 'Soft plafonné × 0,65 hors fonds pâles, porteur à k, bosse gardée', soft: { k: 0.65, porteur: 'k', pales: true }, bosse: { sigma: 0.1, garde: true } },
];

// ------------------------------------------------------------ jugement

interface Promesse { cle: string; contraste: number; manquee: boolean }
type Rampes = Partial<Record<Intensite, Record<Mode, Cran[]>>>;

/** Les promesses du produit (G1 à G7, page, carte pour G7), sur des rampes données. */
function juger(r: Recette, p: Palette, rr: Rampes, seulement?: { mode: Mode; intensite: Intensite }): Promesse[] {
  if (p.crans !== undefined) return [];
  const sortie: Promesse[] = [];
  for (const mode of MODES) {
    if (seulement && seulement.mode !== mode) continue;
    const sens = sensDuTheme(mode, r.texteDesBoutons[mode]);
    const table = TABLE_DES_DOSSIERS[mode][sens] as Record<string, number | 'texteDesBoutons'>;
    for (const intensite of M.intensitesDe(p)) {
      if (seulement && seulement.intensite !== intensite) continue;
      const couleur = (v: string): Rgb8 => (table[v] === 'texteDesBoutons'
        ? M.lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[r.texteDesBoutons[mode]])!
        : rr[intensite]![mode][r.crans.indexOf(table[v] as number)].couleur);
      for (const g of G) {
        if (!garantieJugeable(g, r.crans, mode, sens)) continue;
        for (const f of g.fonds) {
          const second = 'fondDeLaPage' in f ? M.lireHexa(r.fonds[mode])! : 'fondDeLaCarte' in f ? M.couleurDeLaCarte(r, mode) : couleur(f.variable);
          const fond = 'fondDeLaPage' in f ? 'page' : 'fondDeLaCarte' in f ? 'carte' : f.variable;
          const valeur = contraste(couleur(g.premier.variable), second);
          sortie.push({ cle: `${p.id}/${mode}/${sens}/${intensite}/G${g.numero}/${fond}`, contraste: valeur, manquee: !atteintLeSeuil(valeur, r.seuils[g.seuil]) });
        }
      }
    }
  }
  return sortie;
}

// ------------------------------------------------------------ la chaîne

const borner = (x: number) => Math.min(1, Math.max(0, x));
const lisse = (t: number) => { const x = borner(t); return x * x * (3 - 2 * x); };
/** Les clartés Light où le plafond de Soft commence à jouer et où il joue en entier : le 200 (0,905) n'en a pas, le 400 (0,76) l'a en entier. */
const PALES = { debut: 0.88, plein: 0.78 };
const fabriquer = (L: number, C: number, H: number): Cran => {
  const couleur = M.lineaireVersRgb8(M.oklchVersLineaire({ L, C, H }));
  const lu = M.rgb8VersOklch(couleur);
  return { couleur, hexa: M.ecrireHexa(couleur), L: lu.L, C: lu.C, H: lu.H };
};
const exact = (couleur: Rgb8): Cran => { const lu = M.rgb8VersOklch(couleur); return { couleur, hexa: M.ecrireHexa(couleur), L: lu.L, C: lu.C, H: lu.H }; };

/**
 * La courbe de teinte de Vivid, seconde version. La première (`caler-teintes.ts` : jaunes 0,3, retenue
 * −0,25 à 190°, écart type 35°) ternissait les jaunes, les limes et les verts au retour du mainteneur :
 * la marge des jaunes revient à 0,5, et la retenue, plus étroite (−0,2 à 195°, écart type 30°), vise
 * l'arc teal-cyan. Elle ne joue qu'en Light, sur Vivid et l'intensité unique.
 */
const COURBE_VIVID = { jaunes: 0.5, verts: -0.2, centre: 195, largeur: 30 };

/**
 * La clarté selon la teinte, lue sur le relevé Tailwind de la recette comme le préréglage lit la dérive
 * de teinte ([MOT-36]). Pour chaque rampe du relevé, l'écart de clarté de chaque cran à la médiane des
 * dix-sept rampes ; les deux rampes voisines de la teinte de la référence prêtent leurs écarts,
 * interpolés selon sa position angulaire. Le Color shift de luminosité ([MOT-30]) les porte : `clair`
 * est l'écart du cran 100 divisé par son poids vers le bout, puis rangé au millième. Une référence sans teinte n'a pas de dérive de clarté.
 */
function teinteALaClarte(crans: M.RampeDeDerive['crans'], L: number): number {
  const deplie = [crans[0][1]];
  for (let i = 1; i < crans.length; i += 1) deplie.push(deplie[i - 1] + M.ecartAngulaire(crans[i - 1][1], crans[i][1]));
  if (L >= crans[0][0]) return deplie[0];
  if (L <= crans[crans.length - 1][0]) return deplie[crans.length - 1];
  const i = crans.findIndex(([clarte]) => clarte < L);
  const t = (crans[i - 1][0] - L) / (crans[i - 1][0] - crans[i][0]);
  return deplie[i - 1] + t * (deplie[i] - deplie[i - 1]);
}
/**
 * Le bout sombre reste à zéro : éclaircir les tons foncés des jaunes et des verts, comme Tailwind, fait
 * passer le texte blanc sur leur plein Dark (sens inversé) sous 4,5 (balayage : 157 promesses manquées au
 * lieu de 144). Le bout clair se borne à ±0,03 : à 0,04, le jaune 100 dépasse celui de Tailwind (0,985
 * contre 0,973).
 */
const CLARTE_MAXIMALE = 0.03;
function clarteSelonLaTeinte(r: Recette, p: Palette): { clair: number; sombre: number } | null {
  const reference = M.rgb8VersOklch(M.departDe(r, p));
  if (reference.C < M.CHROMA_SANS_TEINTE || M.estGrisPur(M.referenceDe(p))) return null;
  const releve = r.derives;
  const medianes = releve[0].crans.map((_, i) => mediane(releve.map((x) => x.crans[i][0])));
  const lues = releve.map(({ crans }) => ({ h: ((teinteALaClarte(crans, reference.L) % 360) + 360) % 360, ecarts: crans.map(([L], i) => L - medianes[i]) })).sort((x, y) => x.h - y.h);
  let suivante = lues.findIndex(({ h }) => h > reference.H);
  if (suivante < 0) suivante = 0;
  const [apres, avant] = [lues[suivante], lues[(suivante - 1 + lues.length) % lues.length]];
  const position = ((reference.H - avant.h + 360) % 360) / (((apres.h - avant.h + 360) % 360) || 360);
  const ecarts = avant.ecarts.map((e, i) => e + (apres.ecarts[i] - e) * position);
  const bouts = M.boutsDe(r);
  const somme = { clair: [0, 0], sombre: [0, 0] };
  r.courbes.light.forEach((Lc, i) => {
    // Seul le fond du Light, le cran 100, cale la dérive : le 200 poussait l'indigo trop loin.
    if (r.crans[i] !== 100) return;
    const { bout, poids } = M.poidsA(Lc, reference, bouts);
    if (poids < 0.2) return;
    somme[bout][0] += poids * ecarts[i];
    somme[bout][1] += poids * poids;
  });
  const clair = somme.clair[1] ? M.arrondir(Math.max(-CLARTE_MAXIMALE, Math.min(CLARTE_MAXIMALE, somme.clair[0] / somme.clair[1])), 3) : 0;
  return { clair, sombre: 0 };
}
/** La palette avec la clarté selon la teinte dans le Color shift de ses deux profils, quand il n'en porte pas déjà une. */
function avecClarteSelonLaTeinte(r: Recette, p: Palette, accepte: (q: Palette) => boolean = (q) => M.ordreTenu(r, q)): Palette {
  if (M.estFigee(p) || M.estLibre(p)) return p;
  const dc = clarteSelonLaTeinte(r, p);
  if (!dc || (dc.clair === 0 && dc.sombre === 0)) return p;
  const poser = (t: number) => {
    const valeur = { clair: M.arrondir(dc.clair * t, 3), sombre: M.arrondir(dc.sombre * t, 3) };
    const d = (x: Palette['derive']['soft']) => (x.clarte ? x : { ...x, clarte: valeur });
    return { ...p, derive: { ...p.derive, soft: d(p.derive.soft), vivid: d(p.derive.vivid) } };
  };
  // Comme les limites du Color shift ([DER-19]), la dérive se réduit jusqu'à garder l'ordre des nuances.
  if (accepte(poser(1))) return poser(1);
  let [bas, haut] = [0, 1];
  for (let i = 0; i < 12; i += 1) { const t = (bas + haut) / 2; if (accepte(poser(t))) bas = t; else haut = t; }
  return poser(bas);
}
const ecartDeTeinte = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const enCloche = (H: number, centre: number, largeur: number) => Math.exp(-0.5 * (ecartDeTeinte(H, centre) / largeur) ** 2);
/** La chroma visée : le plafond de l'écran se lit à la clarté `L`, la borne de l'enveloppe à `Lenv`. */
function vise(r: Recette, L: number, Lenv: number, H: number, part: number, intensite: Intensite, mode: Mode, teintes: boolean): number {
  const env = M.enveloppeDe(r, intensite, mode);
  const courbe = teintes && intensite !== 'soft' && mode === 'light';
  if (!courbe && Lenv === L) return M.cranVise(L, H, part, r.gamut, env).C;
  const marge = courbe
    ? 1 + COURBE_VIVID.jaunes * enCloche(H, 100, 12) + COURBE_VIVID.verts * enCloche(H, COURBE_VIVID.centre, COURBE_VIVID.largeur)
    : 1 + env.jaunes * enCloche(H, 100, 12);
  return Math.min(part * M.plafond(L, H, r.gamut), env.p0 * Math.min(env.a * marge * (1 - Lenv), env.b * Lenv));
}

interface Visee { Lc: number; L: number; H: number; part: number; facteur: number; C: number; C0: number; regle: number; plafond: number }
interface Construction { rampes: Rampes; porteur: Intensite; rangs: Record<Mode, number>; visees: Partial<Record<Intensite, Record<Mode, Visee[]>>>; force: Record<Mode, number> }

/** Le porteur et les parts de la variante ; `null` : ceux du paquet. */
function porteurEtParts(r: Recette, p: Palette, v: Variante): { porteur: Intensite; parts: Partial<Record<Intensite, number>> } {
  const parts = M.partsDe(r, p);
  const ancrage = M.ancrageDe(r, p);
  // Niveaux communs : le porteur suit la référence, l'autre profil garde sa part commune, même sous une référence terne.
  if (v.soft?.niveauCommun && !M.aUneIntensite(p) && !p.parts && !p.base && !p.reglages?.porteur) {
    const part = M.partDeLaReference(r, p);
    const [s, vv] = [r.profils.soft.part, r.profils.vivid.part];
    return part < (s + vv) / 2 ? { porteur: 'soft', parts: { soft: part, vivid: Math.max(vv, part) } } : { porteur: 'vivid', parts: { vivid: part, soft: Math.min(s, part) } };
  }
  // Seuil seul : Vivid porte toute référence de part au moins `seuilPorteur` ; sous le seuil, la règle du paquet.
  if (v.soft?.seuilPorteur !== undefined && !M.aUneIntensite(p) && !p.parts && !p.base && !p.reglages?.porteur) {
    const part = M.partDeLaReference(r, p);
    if (part >= v.soft.seuilPorteur && ancrage.profil === 'soft') {
      const [s, vv] = [r.profils.soft.part, r.profils.vivid.part];
      return { porteur: 'vivid', parts: { vivid: part, soft: part < s ? M.arrondir(part * s / vv, 3) : Math.min(s, part) } };
    }
    return { porteur: ancrage.profil, parts };
  }
  if (!v.soft || v.soft.porteur !== 'k' || M.aUneIntensite(p) || p.parts || p.base || p.reglages?.porteur) return { porteur: ancrage.profil, parts };
  const ref = M.partDeLaReference(r, p);
  const vivid = r.profils.vivid.part;
  const seuil = (v.soft.k * vivid + vivid) / 2;
  if (ref >= seuil) return { porteur: 'vivid', parts: { vivid: ref, soft: Math.min(r.profils.soft.part, ref) } };
  return { porteur: 'soft', parts: { soft: ref, vivid: Math.min(1, M.arrondir(ref / v.soft.k, 3)) } };
}

function construire(recette: Recette, palette: Palette, v: Variante, imposee?: Palette): Construction {
  const r: Recette = v.softDarkB === undefined ? recette : { ...recette, profils: { ...recette.profils, soft: { ...recette.profils.soft, enveloppe: { ...recette.profils.soft.enveloppe, dark: { ...recette.profils.soft.enveloppe.dark, b: v.softDarkB } } } } };
  let p = imposee ?? (v.clarteTeinte && !v.clarteGarde ? avecClarteSelonLaTeinte(r, palette) : palette);
  if (!imposee && v.clarteTeinte && v.clarteGarde) {
    const sansClarte = construire(recette, palette, { ...v, clarteTeinte: undefined, clarteGarde: false }).rampes;
    const tenues = new Set(juger(r, palette, sansClarte).filter((x) => !x.manquee).map((x) => x.cle));
    const accepte = (q: Palette) => M.ordreTenu(r, q) && !juger(r, q, construire(recette, palette, { ...v, clarteGarde: false }, q).rampes).some((x) => x.manquee && tenues.has(x.cle));
    p = avecClarteSelonLaTeinte(r, palette, accepte);
  }
  const ancrage = M.ancrageDe(r, p);
  if (M.estFigee(p) || (!v.soft && !v.bosse && v.clarteTeinte !== 'garde')) {
    // La clarté selon la teinte passe par le Color shift du paquet : `rampesDe` la lit sur la palette modifiée.
    return { rampes: M.rampesDe(r, p), porteur: ancrage.profil, rangs: ancrage.rangs, visees: {}, force: { light: 0, dark: 0 } };
  }
  const { courbes } = M.grilleDe(r, p);
  const bouts = M.boutsDe(r);
  const sombre = M.fondsSombresDe(r);
  const reference = M.referenceDe(p);
  const lue = M.rgb8VersOklch(reference);
  const { porteur, parts } = porteurEtParts(r, p, v);
  const plafonne = v.soft && !p.parts && !M.aUneIntensite(p) && (v.soft.porteur === 'k' || porteur === 'vivid');
  const visees: Partial<Record<Intensite, Record<Mode, Visee[]>>> = {};
  for (const intensite of M.intensitesDe(p)) {
    const derive = p.derive[intensite === 'unique' ? 'vivid' : intensite];
    const deriveDAvant = palette.derive[intensite === 'unique' ? 'vivid' : intensite];
    const pivot = M.pivotDe(r, p, intensite);
    const decalage = M.decalageDe(p, intensite);
    const partDuProfil = parts[intensite] ?? 0;
    const parMode = (mode: Mode): Visee[] => courbes[mode].map((Lc, rang) => {
      const poids = M.poidsA(Lc, pivot, bouts);
      const L = borner(Lc + decalage + (derive.clarte?.[poids.bout] ?? 0) * poids.poids);
      const Lenv = v.clarteTeinte === 'garde' ? borner(Lc + decalage + (deriveDAvant.clarte?.[poids.bout] ?? 0) * poids.poids) : L;
      const H = M.normaliserTeinte(pivot.H + derive[poids.bout] * poids.poids);
      const facteur = (1 + (derive.saturation?.[poids.bout] ?? 0) * poids.poids) * (mode === 'dark' ? M.facteurSombre(Lc, sombre) : 1);
      const part = borner(partDuProfil * facteur);
      const regle = vise(r, L, Lenv, H, part, intensite, mode, v.soft?.teintes === true);
      let C = regle;
      if (plafonne && intensite === 'soft' && !(porteur === 'soft' && rang === ancrage.rangs[mode])) {
        const partVivid = borner((parts.vivid ?? 0) * facteur);
        // Sur les fonds pâles du Light, l'écran ne laisse pas d'écart visible entre les profils : le plafond s'y efface, et Soft garde l'uniformité de son enveloppe.
        const poids = v.soft!.pales && mode === 'light' ? lisse((PALES.debut - Lc) / (PALES.debut - PALES.plein)) : 1;
        // Soft porteur : le plafond suit le rapport réel des deux parts, pour ne pas creuser la rampe autour de la référence.
        const kBase = porteur === 'soft' ? Math.max(v.soft!.k, (parts.soft ?? 0) / Math.max(1e-6, parts.vivid ?? 1)) : v.soft!.k;
        const k = 1 - (1 - kBase) * poids;
        C = Math.min(C, k * vise(r, L, Lenv, H, partVivid, 'vivid', mode, v.soft?.teintes === true));
      }
      // Les tons clairs du Light (clarté de courbe au-dessus de 0,78, entiers au-dessus de 0,88) : Soft baisse, Vivid monte, au plus le plafond de l'écran.
      const clair = mode === 'light' ? 1 - lisse((PALES.debut - Lc) / (PALES.debut - PALES.plein)) : 0;
      if (v.soft?.clairsSoft !== undefined && intensite === 'soft') C *= 1 - (1 - v.soft.clairsSoft) * clair;
      if (v.soft?.clairsVivid !== undefined && intensite === 'vivid') C = Math.min(M.plafond(L, H, r.gamut), C * (1 + v.soft.clairsVivid * clair));
      return { Lc, L, H, part, facteur, C, C0: C, regle, plafond: M.plafond(L, H, r.gamut) };
    });
    visees[intensite] = { light: parMode('light'), dark: parMode('dark') };
  }
  const assembler = (forces: Record<Mode, number>): Rampes => {
    const rr: Rampes = {};
    for (const intensite of M.intensitesDe(p)) {
      const parMode = (mode: Mode) => visees[intensite]![mode].map((x, rang) => {
        if (intensite === porteur && rang === ancrage.rangs[mode]) return exact(reference);
        const C = x.C0 + (x.C - x.C0) * forces[mode];
        return fabriquer(x.L, C, x.H);
      });
      rr[intensite] = { light: parMode('light'), dark: parMode('dark') };
    }
    return rr;
  };
  const force = { light: 0, dark: 0 };
  if (v.bosse) {
    for (const mode of MODES) {
      const a = ancrage.rangs[mode];
      const rampe = visees[porteur]![mode];
      const rho = lue.C / Math.max(1e-6, rampe[a].C0);
      if (rho <= 1) continue;
      // Hors fonds : en Light, les crans plus clairs que 0,88 ; en Dark, ceux sous 0,50, la zone des fonds 300 à 500.
      const zoneDesFonds = (Lc: number) => (mode === 'light' ? 1 - lisse((PALES.debut - Lc) / (PALES.debut - PALES.plein)) : 1 - lisse((Lc - 0.5) / 0.06));
      // « Sauf la référence » : une référence que Vivid (ou l'intensité unique) pose dans la zone des fonds y ramène la bosse, à
      // proportion de sa place dans la zone. Soft garde ses fonds calmes, même quand le designer lui confie la référence.
      const ouverte = v.bosse.horsFonds === 'saufReference' && porteur !== 'soft' ? zoneDesFonds(rampe[a].Lc) : 0;
      rampe.forEach((x, rang) => {
        if (rang === a) return;
        const fond = !v.bosse!.horsFonds ? 0 : zoneDesFonds(x.Lc) * (1 - ouverte);
        const w = (1 - fond) * Math.exp(-0.5 * ((x.L - lue.L) / v.bosse!.sigma) ** 2);
        x.C = Math.max(x.C0, Math.min(x.part * x.plafond, lue.C, x.C0 * (1 + (rho - 1) * w)));
      });
      force[mode] = 1;
    }
    if (v.bosse.garde) {
      for (const mode of MODES) {
        if (!force[mode]) continue;
        const cle = { mode, intensite: porteur };
        const tenuesSans = new Set(juger(r, p, assembler({ ...force, [mode]: 0 }), cle).filter((x) => !x.manquee).map((x) => x.cle));
        const perd = (t: number) => juger(r, p, assembler({ ...force, [mode]: t }), cle).some((x) => x.manquee && tenuesSans.has(x.cle));
        if (!perd(1)) continue;
        let [bas, haut] = [0, 1];
        for (let i = 0; i < 14; i += 1) { const t = (bas + haut) / 2; if (perd(t)) haut = t; else bas = t; }
        force[mode] = bas;
      }
    }
  }
  return { rampes: assembler(force), porteur, rangs: ancrage.rangs, visees, force };
}

// ------------------------------------------------------------ alertes

/** Les nuances jugées par l'alerte actuelle et leur verdict, ternes compris ([VER-11]). */
function verdictsActuels(r: Recette, p: Palette, rr: Rampes, ternes = M.aDesProfilsTernes(r, p)): Record<Mode, (boolean | null)[]> | null {
  if (M.estLibre(p) || M.aUneIntensite(p) || ternes) return null;
  const visees = new Set(M.rangsDesVariables(r).map((rang) => r.crans[rang]));
  const fonds = M.fondsSombresDe(r);
  const parMode = (mode: Mode) => r.crans.map((cran, rang) => {
    if (!visees.has(cran) || (mode === 'dark' && M.facteurSombre(r.courbes.dark[rang], fonds) < 1)) return null;
    return M.distanceOk(rr.soft![mode][rang].couleur, rr.vivid![mode][rang].couleur) < r.seuils.profilsConfondus;
  });
  return { light: parMode('light'), dark: parMode('dark') };
}
const CHROMA_JUGEABLE = 0.06;
/** L'alerte proposée : les nuances de chaque thème, Vivid d'au moins 0,06 de chroma. */
function verdictsProposes(r: Recette, p: Palette, rr: Rampes, ternes = M.aDesProfilsTernes(r, p)): Record<Mode, (boolean | null)[]> | null {
  if (M.estLibre(p) || M.aUneIntensite(p) || ternes) return null;
  const fonds = M.fondsSombresDe(r);
  const parMode = (mode: Mode) => {
    const sens = sensDuTheme(mode, r.texteDesBoutons[mode]);
    const crans = new Set(VARIABLES_DE_PALETTE.map((x) => cranDeLaVariable(x, mode, sens)).filter((c): c is number => typeof c === 'number'));
    return r.crans.map((cran, rang) => {
      if (!crans.has(cran) || (mode === 'dark' && M.facteurSombre(r.courbes.dark[rang], fonds) < 1)) return null;
      if (rr.vivid![mode][rang].C < CHROMA_JUGEABLE) return null;
      return M.distanceOk(rr.soft![mode][rang].couleur, rr.vivid![mode][rang].couleur) < r.seuils.profilsConfondus;
    });
  };
  return { light: parMode('light'), dark: parMode('dark') };
}
/** Avec le porteur à k, une référence terne donne Vivid = part / k : les profils ne sont plus ternes par construction, l'alerte juge toutes les palettes. */
const ternesDe = (r: Recette, p: Palette, v: Variante) => (v.soft?.porteur === 'k' ? false : M.aDesProfilsTernes(r, p));
const compte = (v: Record<Mode, (boolean | null)[]> | null) => (v ? MODES.reduce((n, m) => n + v[m].filter((x) => x === true).length, 0) : 0);

// ------------------------------------------------------------ jeux

const idDe = (k: number) => `p-${(k + 1).toString(16).padStart(8, '0')}`;
function paletteTailwind(k: number, reference: string, nom?: string, intensites?: 1): Palette {
  const derive = M.prereglageTailwind(M.rgb8VersOklch(M.lireHexa(reference)!), M.boutsDe(base));
  return { id: idDe(k), reference, ...(nom ? { nom } : {}), ...(intensites ? { intensites } : {}), derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } } as Palette;
}
const tour = (L: number, C: number, H0: number) => Array.from({ length: 24 }, (_, k) => {
  const H = (H0 + 15 * k) % 360;
  return { H, hexa: M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C: Math.min(C, M.plafond(L, H, 'srgb')), H }))) };
});
const TW = JSON.parse(readFileSync(new URL('../../Recette CRITIQUE de qualité/Mesures/references/tailwind-3.4.17.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>;
const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const TW500 = Object.entries(TW).filter(([n]) => !NEUTRES.has(n)).map(([n, c]) => [n, c['500']] as [string, string]);
const C59735 = M.rgb8VersOklch(M.lireHexa('#C59735')!);
const SATUREES: [string, string][] = [['Bleu électrique', '#0013FF'], ['Rose vif', '#FF0076'], ['Jaune vif', '#FFD300'], ['Vert vif', '#00E676'], ['Orange vif', '#FF6D00']];
const charger = (nom: string): Recette => {
  const c = M.classerRecette(readFileSync(new URL(`../../Recette CRITIQUE de qualité/Mesures/references/${nom}`, import.meta.url), 'utf8'));
  if (!('recette' in c) || !c.recette) throw new Error(JSON.stringify(c));
  return c.recette as Recette;
};
const MAINTENEUR = charger('recette-mainteneur.json');
const galerieSource = readFileSync(new URL('../../../../../../packages/plugin-palettes/galerie/etats.cjs', import.meta.url), 'utf8');
const debut = galerieSource.indexOf('const VINGT_PALETTES_CONFORMES =');
const GALERIE = new Function('palette', `${galerieSource.slice(debut, galerieSource.indexOf('\nETATS.push(', debut))}\nreturn VINGT_PALETTES_A_VERIFIER;`)(
  (id: string, nom: string, reference: string) => ({ ...paletteTailwind(0, reference, nom), id }),
) as Palette[];

interface Jeu { nom: string; recette: Recette; tailwind?: boolean }
const avec = (palettes: Palette[]): Recette => ({ ...base, palettes });
const JEUX: Jeu[] = [
  { nom: 'Tailwind 500', recette: avec(TW500.map(([n, h], k) => paletteTailwind(k, h, n))), tailwind: true },
  { nom: 'Tour #C59735', recette: avec(tour(C59735.L, C59735.C, C59735.H).map((t, k) => paletteTailwind(k, t.hexa, `${Math.round(t.H)}°`))) },
  { nom: 'Tour vif', recette: avec(tour(0.6, 0.18, C59735.H).map((t, k) => paletteTailwind(k, t.hexa, `${Math.round(t.H)}°`))) },
  { nom: 'Tour doux', recette: avec(tour(0.75, 0.07, C59735.H).map((t, k) => paletteTailwind(k, t.hexa, `${Math.round(t.H)}°`))) },
  { nom: 'Références saturées', recette: avec(SATUREES.map(([n, h], k) => paletteTailwind(k, h, n))) },
  { nom: 'Références saturées, une intensité', recette: avec(SATUREES.map(([n, h], k) => paletteTailwind(k, h, n, 1))) },
  { nom: 'Recette du mainteneur', recette: MAINTENEUR },
  { nom: 'Galerie, défauts du format 11', recette: avec(GALERIE) },
];
const COMBINAISONS = [['blanc', 'noir'], ['noir', 'blanc'], ['blanc', 'blanc'], ['noir', 'noir']] as const;
const avecTexte = (r: Recette, clair: 'blanc' | 'noir', sombre: 'blanc' | 'noir'): Recette =>
  ({ ...r, texteDesBoutons: { light: clair, dark: sombre }, courbes: M.courbesParDefaut(11, { light: clair, dark: sombre }) } as Recette);

// ------------------------------------------------------------ contrôle

{
  let ecarts = 0;
  for (const jeu of JEUX) for (const p of jeu.recette.palettes) {
    const a = M.rampesDe(jeu.recette, p);
    const b = construire(jeu.recette, p, { id: 'x', nom: '', soft: { k: 10, porteur: 'actuel' }, bosse: null }).rampes;
    for (const i of M.intensitesDe(p)) for (const m of MODES) a[i]![m].forEach((c, k) => { if (c.hexa !== b[i]![m][k].hexa) ecarts += 1; });
  }
  console.log(`Contrôle de la chaîne (plafond k = 10, sans effet) : ${ecarts} nuance(s) différente(s) du paquet.`);
  if (ecarts) process.exit(1);
}

// ------------------------------------------------------------ mesures

const ROLES: Record<string, string[]> = { fond: ['surface/default', 'surface/hover', 'surface/pressed'], plein: ['solid/default', 'solid/hover', 'solid/pressed'], texte: ['surface/foreground', 'page/foreground'] };

function mesurer(jeu: Jeu, v: Variante) {
  const changes: Record<string, { n: number; total: number; dC: number[] }> = {};
  const rapports: Record<string, number[]> = {};
  let softPlusVif = 0;
  let creux = 0;
  const alertes = { actuelle: 0, proposee: 0 };
  const saillies: number[] = [];
  const forces: number[] = [];
  const promesses = { manquees: 0, nouvelles: [] as { cle: string; avant: number; apres: number }[], resolues: 0 };
  for (const [clair, sombre] of jeu.recette === MAINTENEUR ? [[MAINTENEUR.texteDesBoutons.light, MAINTENEUR.texteDesBoutons.dark]] as const : COMBINAISONS) {
    const r = jeu.recette === MAINTENEUR ? MAINTENEUR : avecTexte(jeu.recette, clair, sombre);
    for (const p of r.palettes) {
      const avant = construire(r, p, VARIANTES[0]).rampes;
      const c = construire(r, p, v);
      const [pa, pb] = [juger(r, p, avant), juger(r, p, c.rampes)];
      const tenue = new Map(pa.map((x) => [x.cle, x]));
      for (const x of pb) {
        if (x.manquee) promesses.manquees += 1;
        const y = tenue.get(x.cle)!;
        if (x.manquee && !y.manquee) promesses.nouvelles.push({ cle: `${p.nom ?? p.reference} ${x.cle.split('/').slice(1).join('/')}`, avant: r6(y.contraste), apres: r6(x.contraste) });
        if (!x.manquee && y.manquee) promesses.resolues += 1;
      }
      if (clair !== COMBINAISONS[0][0] || sombre !== COMBINAISONS[0][1]) { if (jeu.recette !== MAINTENEUR) continue; }
      // Le reste se mesure dans le sens par défaut (Light blanc, Dark noir), ou tel que la recette du mainteneur le porte.
      for (const i of M.intensitesDe(p)) for (const m of MODES) {
        const cle = `${i}/${m}`;
        const s = (changes[cle] ??= { n: 0, total: 0, dC: [] });
        c.rampes[i]![m].forEach((x, k) => { s.total += 1; if (x.hexa !== avant[i]![m][k].hexa) { s.n += 1; s.dC.push(x.C - avant[i]![m][k].C); } });
        const rampe = c.rampes[i]![m];
        for (let k = 1; k < rampe.length - 1; k += 1) if (rampe[k].C < 0.95 * Math.min(rampe[k - 1].C, rampe[k + 1].C) && !(i === c.porteur && k === c.rangs[m])) { creux += 1; if (process.env.CREUX) console.log('  creux', v.id, p.nom, p.reference, i, m, r.crans[k], rampe.map((x) => r3(x.C)).join(' '), 'porteur', c.porteur, r.crans[c.rangs[m]]); }
      }
      for (const m of MODES) {
        const a = c.rangs[m];
        const rampe = c.rampes[c.porteur]![m];
        for (const k of [a - 1, a + 1]) if (rampe[k]) saillies.push(rampe[a].C / Math.max(1e-6, rampe[k].C));
        forces.push(c.force[m]);
      }
      if (M.aUneIntensite(p)) continue;
      alertes.actuelle += compte(verdictsActuels(r, p, c.rampes, ternesDe(r, p, v))) >= 3 ? 1 : 0;
      alertes.proposee += compte(verdictsProposes(r, p, c.rampes, ternesDe(r, p, v))) >= 3 ? 1 : 0;
      for (const m of MODES) {
        const sens = sensDuTheme(m, r.texteDesBoutons[m]);
        for (const [role, variables] of Object.entries(ROLES)) for (const variable of variables) {
          const cran = cranDeLaVariable(variable as never, m, sens);
          const k = typeof cran === 'number' ? r.crans.indexOf(cran) : -1;
          if (k < 0 || (k === c.rangs[m])) continue;
          const [s, vv] = [c.rampes.soft![m][k].C, c.rampes.vivid![m][k].C];
          if (vv < 0.03) continue;
          (rapports[`${m}/${role}`] ??= []).push(s / vv);
          if (s > vv * 1.02) softPlusVif += 1;
        }
      }
    }
  }
  return {
    alertes,
    deuxIntensites: jeu.recette.palettes.filter((p) => !M.aUneIntensite(p) && !M.estLibre(p)).length,
    changes: Object.fromEntries(Object.entries(changes).map(([k, s]) => [k, { changees: s.n, sur: s.total, dC: resume(s.dC) }])),
    rapports: Object.fromEntries(Object.entries(rapports).map(([k, xs]) => [k, resume(xs)])),
    softPlusVif,
    creux,
    saillieLaterale: resume(saillies),
    forceDeLaBosse: resume(forces.filter((f) => f > 0)),
    promesses: { manquees: promesses.manquees, nouvelles: promesses.nouvelles.length, exemples: promesses.nouvelles.slice(0, 8), resolues: promesses.resolues },
  };
}

const resultats: Record<string, Record<string, ReturnType<typeof mesurer>>> = {};
for (const jeu of JEUX) {
  resultats[jeu.nom] = {};
  console.log(`\n== ${jeu.nom}`);
  console.log('variante  | alertes act./prop. | promesses manquées (+nouvelles −résolues) | Soft>Vivid | creux | saillie latérale méd/max | Vivid L/D changées | S/V Light fond·plein·texte | S/V Dark fond·plein·texte');
  for (const v of VARIANTES) {
    const m = mesurer(jeu, v);
    resultats[jeu.nom][v.id] = m;
    const ch = (k: string) => (m.changes[k] ? `${m.changes[k].changees}` : '-');
    const rp = (mode: Mode) => ['fond', 'plein', 'texte'].map((x) => m.rapports[`${mode}/${x}`]?.mediane ?? '-').join('·');
    console.log([
      v.id.padEnd(9),
      `${m.alertes.actuelle}/${m.alertes.proposee} sur ${m.deuxIntensites}`,
      `${m.promesses.manquees} (+${m.promesses.nouvelles} −${m.promesses.resolues})`,
      m.softPlusVif, m.creux,
      `${m.saillieLaterale.mediane}/${m.saillieLaterale.max}`,
      `${ch('vivid/light')}/${ch('vivid/dark')}${m.changes['unique/light'] ? ` u ${ch('unique/light')}/${ch('unique/dark')}` : ''}`,
      rp('light'), rp('dark'),
    ].join(' | '));
  }
}

// L'uniformité des fonds Soft Light des quatre utilitaires, aux réglages communs (banc de la recette critique).
const COMMUNE = recetteAuxReglagesCommuns(MAINTENEUR);
const UTILITAIRES = ['Poppy', 'Orange', 'Grass', 'Sky'];
const uniformite = Object.fromEntries(VARIANTES.filter((v) => !v.bosse).map((v) => [v.id, [50, 100, 200, 300].map((cran) => {
  const Cs = COMMUNE.palettes.filter((p) => UTILITAIRES.includes(p.nom!)).map((p) => construire(COMMUNE, p, v).rampes.soft!.light[COMMUNE.crans.indexOf(cran)].C);
  return { cran, rapport: r3(Math.max(...Cs) / Math.min(...Cs)) };
})]));
console.log('\nUniformité des fonds Soft Light, utilitaires aux réglages communs :', JSON.stringify(uniformite));

// Le balayage des garanties : 72 teintes, deux clartés, quatre combinaisons, promesses comparées une à une.
const balayage: Record<string, { manquees: number; nouvelles: number; resolues: number; exemples: unknown[] }> = {};
{
  const palettes: Palette[] = [];
  for (const L of [0.62, 0.75]) for (let h = 0; h < 360; h += 5) {
    const C = Math.min(0.16, M.plafond(L, h, 'srgb') * 0.95);
    palettes.push(paletteTailwind(palettes.length, M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C, H: h }))), `${h}° L${L}`));
  }
  for (const v of VARIANTES) {
    const b = { manquees: 0, nouvelles: 0, resolues: 0, exemples: [] as unknown[] };
    for (const [clair, sombre] of COMBINAISONS) {
      const r = avecTexte(avec(palettes), clair, sombre);
      for (const p of r.palettes) {
        const pa = new Map(juger(r, p, construire(r, p, VARIANTES[0]).rampes).map((x) => [x.cle, x]));
        for (const x of juger(r, p, construire(r, p, v).rampes)) {
          const y = pa.get(x.cle)!;
          if (x.manquee) b.manquees += 1;
          if (x.manquee && !y.manquee) { b.nouvelles += 1; if (b.exemples.length < 6) b.exemples.push({ palette: p.nom, cle: x.cle, avant: r6(y.contraste), apres: r6(x.contraste) }); }
          if (!x.manquee && y.manquee) b.resolues += 1;
        }
      }
    }
    balayage[v.id] = b;
  }
  console.log('\nBalayage 72 teintes × 2 clartés × 4 combinaisons :', JSON.stringify(Object.fromEntries(Object.entries(balayage).map(([k, x]) => [k, `${x.manquees} (+${x.nouvelles} −${x.resolues})`]))));
}

// Les réglages de luminosité aux bornes permises (le contre-exemple de la revue).
const bornes: Record<string, number> = {};
for (const v of VARIANTES.filter((x) => x.bosse)) {
  let pertes = 0;
  for (const p of JEUX[0].recette.palettes) for (const i of ['soft', 'vivid'] as const) {
    const candidate = (clarte: number) => M.appliquerLesReglages(base, p, { teinte: {}, clarte: { [i]: clarte } });
    const limite = M.limiteDynamique({ recette: base, palette: p, candidate, valeur: 0, bornes: { bas: -0.1, haut: 0.1 }, pas: 0.005, ordre: true });
    for (const borne of [limite.bas.valeur, limite.haut.valeur]) {
      const q = candidate(borne);
      const sans = new Map(juger(base, q, construire(base, q, { ...v, bosse: null }).rampes).map((x) => [x.cle, x]));
      for (const x of juger(base, q, construire(base, q, v).rampes)) if (x.manquee && !sans.get(x.cle)!.manquee) pertes += 1;
    }
  }
  bornes[v.id] = pertes;
}
console.log('\nPromesses perdues par la bosse aux bornes de luminosité, Tailwind 500 :', JSON.stringify(bornes));

// Les fonds Dark contre la carte, pour la bosse.
const fondsDark: Record<string, unknown> = {};
for (const v of VARIANTES) {
  const r = JEUX[4].recette;
  fondsDark[v.id] = Object.fromEntries(r.palettes.map((p) => {
    const c = construire(r, p, v);
    return [p.nom, [300, 400, 500].map((cran) => { const x = c.rampes[c.porteur]!.dark[r.crans.indexOf(cran)]; return { cran, C: r3(x.C), carte: r3(contraste(x.couleur, M.couleurDeLaCarte(r, 'dark'))) }; })];
  }));
}

// L'écart visible entre Soft et Vivid, rôle par rôle, sur Tailwind 500 (sens par défaut).
const ecarts: Record<string, Record<string, unknown>> = {};
{
  const r = JEUX[0].recette;
  const VARIABLES = ['surface/default', 'surface/hover', 'surface/pressed', 'surface/foreground', 'solid/default', 'page/foreground'];
  for (const v of VARIANTES.filter((x) => !x.bosse || ['SP65B10f', 'CHOIX', 'CHOIXSP', 'CHOIXB30', 'CHOIXB25', 'CHOIXB20', 'CHOIXB15', 'CHOIXB10', 'CHOIXB15V'].includes(x.id))) {
    ecarts[v.id] = {};
    for (const m of MODES) for (const variable of VARIABLES) {
      const cran = cranDeLaVariable(variable as never, m, sensDuTheme(m, r.texteDesBoutons[m])) as number;
      const d = r.palettes.map((p) => { const c = construire(r, p, v).rampes; const k = r.crans.indexOf(cran); return M.distanceOk(c.soft![m][k].couleur, c.vivid![m][k].couleur); });
      ecarts[v.id][`${m} ${variable} (${cran})`] = { mediane: r3(mediane(d)), min: r3(Math.min(...d)), sousLeSeuil: d.filter((x) => x < 0.02).length };
    }
  }
  const chromaTW = (nom: string, cran: number) => M.rgb8VersOklch(M.lireHexa(TW[nom][String(cran)])!).C;
  for (const id of ['A', 'SP65', 'SPs70', 'SPs80', 'SPs85']) {
    const v = VARIANTES.find((x) => x.id === id)!;
    const lignes = r.palettes.map((p) => {
      const c = construire(r, p, v).rampes;
      return `${p.nom}: ${[100, 200, 300].map((cran) => { const k = r.crans.indexOf(cran); const [s, vv] = [c.soft!.light[k], c.vivid!.light[k]]; return `${cran} S${r3(s.C)} V${r3(vv.C)}/TW${r3(chromaTW(p.nom!, cran))} Δ${r3(M.distanceOk(s.couleur, vv.couleur))}`; }).join(' ')}`;
    });
    console.log(`\n${id}, fonds Light par teinte :\n  ${lignes.join('\n  ')}`);
  }
  console.log('\nÉcart Soft / Vivid (ΔEok), Tailwind 500, médiane [min] (nombre sous 0,02 sur 17) :');
  for (const [id, e] of Object.entries(ecarts)) console.log(id.padEnd(9), Object.entries(e).map(([k, x]: [string, any]) => `${k}: ${x.mediane} [${x.min}] (${x.sousLeSeuil})`).join(' | '));
}

writeFileSync(new URL('./MESURES-TROISIEME-PASSE.json', import.meta.url), `${JSON.stringify({ variantes: VARIANTES, resultats, uniformite, balayage, bornes, fondsDark, ecarts }, null, 1)}\n`);

// ------------------------------------------------------------ clarté selon la teinte : effets

const effetsClarte: Record<string, unknown> = {};
{
  const r = JEUX[0].recette;
  const variante = (clarteTeinte?: 'suit' | 'garde'): Variante => ({ id: '', nom: '', soft: null, bosse: null, ...(clarteTeinte ? { clarteTeinte } : {}) });
  const lignes = r.palettes.map((p) => {
    const dc = clarteSelonLaTeinte(r, p);
    const [sans, suit, garde] = [undefined, 'suit', 'garde'].map((x) => construire(r, p, variante(x as 'suit' | 'garde' | undefined)).rampes.vivid!.light);
    const lire = (rr: Cran[], cran: number) => ({ L: r3(rr[r.crans.indexOf(cran)].L), C: r3(rr[r.crans.indexOf(cran)].C) });
    const tw = (cran: number) => { const o = M.rgb8VersOklch(M.lireHexa(TW[p.nom!][String(cran)])!); return { L: r3(o.L), C: r3(o.C) }; };
    return { nom: p.nom, clarte: dc, ordre: M.ordreTenu(r, avecClarteSelonLaTeinte(r, p)), crans: Object.fromEntries([100, 200, 300].map((c) => [c, { sans: lire(sans, c), suit: lire(suit, c), garde: lire(garde, c), tailwind: tw(c) }])) };
  });
  console.log('\nClarté selon la teinte, Tailwind 500, Vivid Light : bout clair, puis L et C sans → suit / garde (Tailwind)');
  for (const l of lignes) console.log(`  ${String(l.nom).padEnd(8)} ${l.clarte ? l.clarte.clair : '-'}${l.ordre ? '' : ' ORDRE ROMPU'}  ${[100, 200].map((c) => { const x = l.crans[c]; return `${c}: L ${x.sans.L}→${x.suit.L} (${x.tailwind.L}) C ${x.sans.C}→${x.suit.C}/${x.garde.C} (${x.tailwind.C})`; }).join('  ')}`);
  // Les crans de même numéro de deux palettes n'ont plus la même clarté : l'écart le plus grand, par cran.
  const ecartsParCran = r.crans.map((cran, i) => {
    const ecart = (avec: boolean) => {
      const Ls = r.palettes.filter((p) => M.ancrageDe(r, p).rangs.light !== i).map((p) => M.clartesDe(r, avec ? avecClarteSelonLaTeinte(r, p) : p).vivid!.light[i]);
      return r3(Math.max(...Ls) - Math.min(...Ls));
    };
    return { cran, sans: ecart(false), avec: ecart(true) };
  });
  console.log('Écart de clarté entre palettes au même cran (Light, hors cran de la référence), sans → avec :', ecartsParCran.map((e) => `${e.cran}:${e.sans}→${e.avec}`).join(' '));
  // L'ordre des nuances sur les tours de teinte.
  const ruptures = [JEUX[1], JEUX[2], JEUX[3], JEUX[7]].flatMap((j) => j.recette.palettes.filter((p) => !M.ordreTenu(j.recette, avecClarteSelonLaTeinte(j.recette, p))).map((p) => `${j.nom} ${p.nom}${M.ordreTenu(j.recette, p) ? '' : ' (déjà rompu sans la dérive)'}`));
  console.log('Ordre des nuances rompu :', ruptures.length ? ruptures.join(', ') : 'aucun');
  for (const jeu of ['Références saturées', 'Galerie, défauts du format 11', 'Tailwind 500']) for (const id of ['AL', 'SPs85cL']) console.log(`  promesses nouvelles, ${jeu}, ${id} :`, JSON.stringify(resultats[jeu][id].promesses.exemples));
  Object.assign(effetsClarte, { lignes, ecartsParCran, ruptures });
}
writeFileSync(new URL('./MESURES-CLARTE-TEINTE.json', import.meta.url), `${JSON.stringify(effetsClarte, null, 1)}\n`);

// ------------------------------------------------------------ données de la maquette

const EXEMPLES: [string, string][] = [
  ['Bleu', '#3B82F6'], ['Rouge', '#EF4444'], ['Vert', '#22C55E'], ['Ambre', '#F59E0B'], ['Violet', '#8B5CF6'], ['Rose', '#EC4899'],
  ['Vert terne', '#7DB05F'], ...SATUREES,
];
const SENS = [['blanc', 'blanc'], ['blanc', 'noir'], ['noir', 'blanc']] as const;

/**
 * La maquette règle six axes indépendants ; chaque combinaison est une variante, de clé
 * `clairs|courbe|bosse|clarte|b|porteur`. Soft garde la règle du paquet (plafond sans effet, k = 10,
 * que le contrôle de la chaîne vérifie) : le mainteneur a écarté le plafond × 0,65. `b` est la borne de
 * Soft vers le noir en Dark, qui règle la chroma de ses fonds Dark. `porteur` : Vivid porte toujours la
 * référence, pour que Soft ne garde pas une référence vive parmi des voisines calmées. La bosse reste hors
 * des fonds, sauf autour d'une référence que Vivid pose dans la zone des fonds.
 */
const AXES = { clairs: [1, 0.85, 0.7], courbe: [0, 1], bosse: [0, 1], clarte: [0, 2], b: [0.38, 0.2, 0.15, 0.1], porteur: [0, 1] } as const;
const COMBINAISONS_MAQUETTE: Variante[] = [];
for (const clairs of AXES.clairs) for (const courbe of AXES.courbe) for (const bosse of AXES.bosse) for (const clarte of AXES.clarte) for (const b of AXES.b) for (const porteur of AXES.porteur) {
  COMBINAISONS_MAQUETTE.push({
    id: `${clairs}|${courbe}|${bosse}|${clarte}|${b}|${porteur}`,
    nom: '',
    soft: clairs !== 1 || courbe || porteur ? { k: 10, porteur: 'actuel', pales: true, ...(porteur ? { seuilPorteur: 0 } : {}), ...(clairs !== 1 ? { clairsSoft: clairs } : {}), ...(courbe ? { teintes: true } : {}) } : null,
    bosse: bosse ? { sigma: 0.1, garde: true, horsFonds: 'saufReference' } : null,
    ...(clarte ? { clarteTeinte: 'garde' as const } : {}),
    ...(b !== 0.38 ? { softDarkB: b } : {}),
  });
}
const donnees: Record<string, unknown> = { crans: base.crans, axes: AXES, exemples: EXEMPLES.map(([nom, reference]) => ({ nom, reference })), sens: {} };
for (const [clair, sombre] of SENS) {
  const r = avecTexte(avec(EXEMPLES.map(([n, h], k) => paletteTailwind(k, h, n))), clair, sombre);
  const parVariante: Record<string, unknown> = {};
  for (const v of COMBINAISONS_MAQUETTE) parVariante[v.id] = r.palettes.map((p) => {
    const c = construire(r, p, v);
    const rr = c.rampes;
    // La maquette ne trace la règle et le plafond que pour Vivid et pour le profil qui porte la référence.
    const decrire = (i: Intensite) => Object.fromEntries(MODES.map((m) => [m, {
      hexa: rr[i]![m].map((x) => x.hexa), C: rr[i]![m].map((x) => r3(x.C)),
      ...(i === 'vivid' || i === c.porteur ? {
        regle: c.visees[i]?.[m].map((x) => r3(x.regle)) ?? rr[i]![m].map((x) => r3(x.C)),
        plafond: c.visees[i]?.[m].map((x) => r3(x.plafond)) ?? rr[i]![m].map((x) => r3(M.plafond(x.L, x.H, 'srgb'))),
      } : {}),
    }]));
    const manquees = juger(r, p, rr).filter((x) => x.manquee).map((x) => x.cle.split('/').slice(1).join('/'));
    return {
      porteur: c.porteur, rangs: c.rangs, force: c.force, soft: decrire('soft'), vivid: decrire('vivid'),
      alerteActuelle: verdictsActuels(r, p, rr, ternesDe(r, p, v)), alerteProposee: verdictsProposes(r, p, rr, ternesDe(r, p, v)), ternes: ternesDe(r, p, v), manquees,
    };
  });
  (donnees.sens as Record<string, unknown>)[`${clair}-${sombre}`] = {
    fonds: r.fonds, cartes: { light: M.ecrireHexa(M.couleurDeLaCarte(r, 'light')), dark: M.ecrireHexa(M.couleurDeLaCarte(r, 'dark')) },
    table: Object.fromEntries(MODES.map((m) => [m, TABLE_DES_DOSSIERS[m][sensDuTheme(m, r.texteDesBoutons[m])]])),
    texteDesBoutons: { light: COULEUR_DU_TEXTE_DES_BOUTONS[clair], dark: COULEUR_DU_TEXTE_DES_BOUTONS[sombre] },
    variantes: parVariante,
  };
}
writeFileSync(new URL('../Maquettes/donnees-troisieme-passe.js', import.meta.url), `// Généré par Mesures/mesurer-troisieme-passe.ts : ne pas modifier à la main.\nwindow.DONNEES = ${JSON.stringify(donnees)};\n`);
console.log('\nÉcrit MESURES-TROISIEME-PASSE.json et Maquettes/donnees-troisieme-passe.js');

// ------------------------------------------------------------ comparaison avec Tailwind

/**
 * Les 17 familles colorées de Tailwind 3.4 et la palette que le moteur fabrique depuis leur 500, dans
 * chaque combinaison de la maquette. Côté Tailwind, le Light suit ses numéros ; Tailwind n'a pas de
 * thème Dark : chaque cran Dark prend la nuance de Tailwind de clarté la plus proche de la courbe Dark.
 */
{
  const familles = JEUX[0].recette.palettes;
  const hex = (x: string) => x.replace('#', '');
  const comparaison: Record<string, unknown> = { crans: base.crans, familles: familles.map((p) => ({ nom: p.nom, reference: p.reference })), sens: {} };
  for (const [clair, sombre] of SENS) {
    const r = avecTexte(avec(familles), clair, sombre);
    const proche = (nom: string, L: number) => {
      const crans = Object.keys(TW[nom]).map(Number).filter((c) => c >= 50);
      return TW[nom][String(crans.sort((a, b) => Math.abs(M.rgb8VersOklch(M.lireHexa(TW[nom][String(a)])!).L - L) - Math.abs(M.rgb8VersOklch(M.lireHexa(TW[nom][String(b)])!).L - L))[0])];
    };
    const tailwind = familles.map((p) => ({
      light: base.crans.map((c) => hex(TW[p.nom!][String(c)])).join(','),
      dark: r.courbes.dark.map((L) => hex(proche(p.nom!, L))).join(','),
    }));
    const variantes: Record<string, unknown> = {};
    for (const v of COMBINAISONS_MAQUETTE) variantes[v.id] = familles.map((p) => {
      const c = construire(r, p, v);
      const ligne = (i: Intensite, m: Mode) => c.rampes[i]![m].map((x) => hex(x.hexa)).join(',');
      return { p: c.porteur, r: c.rangs, s: { light: ligne('soft', 'light'), dark: ligne('soft', 'dark') }, v: { light: ligne('vivid', 'light'), dark: ligne('vivid', 'dark') }, m: juger(r, p, c.rampes).filter((x) => x.manquee).length };
    });
    (comparaison.sens as Record<string, unknown>)[`${clair}-${sombre}`] = {
      fonds: r.fonds, cartes: { light: M.ecrireHexa(M.couleurDeLaCarte(r, 'light')), dark: M.ecrireHexa(M.couleurDeLaCarte(r, 'dark')) },
      table: Object.fromEntries(MODES.map((m) => [m, TABLE_DES_DOSSIERS[m][sensDuTheme(m, r.texteDesBoutons[m])]])),
      texteDesBoutons: { light: COULEUR_DU_TEXTE_DES_BOUTONS[clair], dark: COULEUR_DU_TEXTE_DES_BOUTONS[sombre] },
      tailwind, variantes,
    };
  }
  writeFileSync(new URL('../Maquettes/donnees-comparaison.js', import.meta.url), `// Généré par Mesures/mesurer-troisieme-passe.ts : ne pas modifier à la main.\nwindow.COMPARAISON = ${JSON.stringify(comparaison)};\n`);
  console.log('Écrit Maquettes/donnees-comparaison.js');
}

// ------------------------------------------------------------ clarté selon la teinte : Dark et paires proches
{
  for (const jeu of [JEUX[0], JEUX[7]]) {
    const r = jeu.recette;
    const avecL = { ...r, palettes: r.palettes.map((p) => avecClarteSelonLaTeinte(r, p)) };
    const paires = (x: Recette) => M.pairesTropProches(x).map((q) => q.palettes.map((id) => x.palettes.find((p) => p.id === id)!.nom).join('/'));
    console.log(`Paires trop proches, ${jeu.nom} : ${paires(r).length} → ${paires(avecL).length}`, JSON.stringify(paires(avecL)));
  }
  const r = JEUX[0].recette;
  for (const nom of ['yellow', 'lime', 'red', 'indigo']) {
    const p = r.palettes.find((x) => x.nom === nom)!;
    const [a, b] = [M.rampesDe(r, p).vivid!.dark, M.rampesDe(r, avecClarteSelonLaTeinte(r, p)).vivid!.dark];
    console.log(`Dark ${nom} : ${[700, 800, 900, 950].map((c) => `${c} ${r3(a[r.crans.indexOf(c)].L)}→${r3(b[r.crans.indexOf(c)].L)}`).join('  ')}`);
  }
}
