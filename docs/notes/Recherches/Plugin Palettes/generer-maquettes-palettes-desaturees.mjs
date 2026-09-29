#!/usr/bin/env node
/**
 * Écrit MAQUETTES-PALETTES-DESATUREES.html : les exemples des questions Q1 à
 * Q5 de PLAN-PALETTES-DESATUREES.md.
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-palettes-desaturees.mjs"
 *
 * Toutes les couleurs viennent du moteur (`packages/couleur/src`). « Actuelle »
 * est le calcul du moteur tel quel. Les règles candidates passent des parts
 * propres et une dérive au moteur : `rampesDe` ancre la référence et fabrique
 * les autres nuances. Aucune page ne montre l'interface : les questions
 * portent sur les couleurs produites.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ajusterPartsGrises,
  alertesDePalette,
  ancrageDe,
  boutsDe,
  distanceOk,
  etendueDe,
  fabriquerCran,
  lireHexa,
  partDeChroma,
  plafond,
  prereglageTailwind,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
} from '../../../../packages/couleur/src/index.ts';
import { nouvellePalette, reglerSaturation, reglerTeinte } from '../../../../packages/plugin-palettes/src/edition.ts';

const ICI = path.dirname(fileURLToPath(import.meta.url));

const esc = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const virgule = (x, n = 2) => x.toFixed(n).replace('.', ',');
const pourcent = (x) => `${Math.round(x * 100)} %`;

/* Le moteur */

const RECETTE = recetteParDefaut();
const S = RECETTE.profils.soft.part;
const V = RECETTE.profils.vivid.part;
const CRANS = RECETTE.crans;
const lire = (hexa) => rgb8VersOklch(lireHexa(hexa));
const part = (hexa) => Math.round(partDeChroma(lireHexa(hexa)) * 1000) / 1000;

/** Une palette à deux intensités, dérive Tailwind liée calculée au seuil de gris `seuil`, parts propres facultatives. */
function palette(hexa, { parts, seuil = RECETTE.seuils.chromaGrise } = {}) {
  const derive = prereglageTailwind(lire(hexa), boutsDe(RECETTE), RECETTE.derives, seuil);
  const rangee = { ...derive, origine: 'tailwind' };
  return {
    id: 'p-0000000a',
    reference: hexa,
    derive: { lien: true, soft: rangee, vivid: rangee },
    ...(parts ? { parts: { soft: parts.soft, vivid: parts.vivid, origine: 'designer' } } : {}),
  };
}

/** Les rampes et l'ancrage que le moteur rend pour cette palette. */
function calculer(p) {
  const recette = { ...RECETTE, palettes: [p] };
  return { rampes: rampesDe(recette, p), ancrage: ancrageDe(recette, p), alertes: alertesDePalette(recette, p).map((a) => a.code) };
}

/** Le moteur d'aujourd'hui : parts grises sous 0,03, dérive nulle. */
const actuelle = (hexa) => calculer(ajusterPartsGrises(RECETTE, palette(hexa)));
/** Le porteur prend la part de la référence, l'autre garde sa part commune, dérive toujours calculée. */
const bornes = (hexa) => {
  const p = part(hexa);
  return calculer(palette(hexa, { parts: { soft: Math.min(S, p), vivid: Math.max(V, p) }, seuil: 0 }));
};
/** Sous la part commune de Soft : Soft prend la part de la référence, Vivid garde le rapport des parts communes. */
const proportion = (hexa, p = part(hexa)) => calculer(palette(hexa, {
  parts: p < S ? { soft: p, vivid: Math.min(1, Math.round((p * V / S) * 1000) / 1000) } : { soft: S, vivid: V },
  seuil: 0,
}));

/* Le dessin */

const nuance = (cran, numero, marque, taille = 'm') => `<div class="n ${taille}"><div class="p" style="background:${cran.hexa}">${marque ? '<span class="d">◆</span>' : ''}</div><span class="h">${numero}</span><span class="h x">${cran.hexa.slice(1)}</span></div>`;

/** Une rampe : ses onze nuances, le ◆ sur le cran de l'ancrage quand le profil porte la référence. */
function rampe(resultat, intensite, mode = 'light', { taille = 'm', titre = '' } = {}) {
  const crans = resultat.rampes[intensite][mode];
  const porteur = resultat.ancrage.profil === intensite;
  return `<div class="rampe">${titre ? `<span class="t">${titre}</span>` : ''}<div class="nuances">${crans.map((cran, rang) => nuance(cran, CRANS[rang], porteur && rang === resultat.ancrage.rangs[mode], taille)).join('')}</div></div>`;
}

const deux = (resultat, mode = 'light') => rampe(resultat, 'soft', mode, { titre: 'Soft' }) + rampe(resultat, 'vivid', mode, { titre: 'Vivid' });
const pastille = (hexa) => `<span class="pastille" style="background:${hexa}"></span><code>${hexa}</code>`;

function blocDeQuestion(numero, titre, explication, ecrans, choix, reponse) {
  return `<div class="qbloc${reponse ? ' repondu' : ''}"><div class="qtete"><span class="qnum">${numero}</span><h3>${titre}</h3>${reponse ? `<span class="reponse">Ta réponse : ${reponse}</span>` : ''}</div>${explication ? `<p>${explication}</p>` : ''}${ecrans ? `<div class="scene">${ecrans.startsWith('<p class="rangee-titre"') ? ecrans : `<div class="scene-rangee">${ecrans}</div>`}</div>` : ''}${choix ? `<div class="qchoix">${choix}</div>` : ''}</div>`;
}
const vue = (contenu, lettre, legende) => `<div class="qecran">${lettre ? `<span class="qlettre">${lettre}</span>` : ''}<div class="carton">${contenu}</div>${legende ? `<p class="legende">${legende}</p>` : ''}</div>`;
/** Des rangées d'écrans, chacune sous son titre. */
const rangees = (liste) => liste.map(([titre, vues]) => `<p class="rangee-titre">${titre}</p><div class="scene-rangee">${vues}</div>`).join('');
const reco = (texte = 'Recommandé.') => `<span class="reco">${texte}</span>`;

/* Q1 : sous la part commune de Soft */

const Q1_REFS = ['#897288', '#7C717B', '#6B7280'];
const q1 = Q1_REFS.map((hexa) => ({
  hexa,
  p: part(hexa),
  C: lire(hexa).C,
  actuelle: actuelle(hexa),
  bornes: bornes(hexa),
  proportion: proportion(hexa),
}));

/** Le glisser du sélecteur : la chroma de #897288 baisse, sa clarté et sa teinte restent. */
const DEPART = lire('#897288');
const GLISSER = [0.043, 0.036, 0.032, 0.029, 0.025, 0.02].map((C) => fabriquerCran(DEPART.L, DEPART.H, C / plafond(DEPART.L, DEPART.H), 'srgb').hexa);
const ligneDuGlisser = (regle) => GLISSER.map((hexa) => {
  const r = regle(hexa);
  return `<div class="glisser"><span class="t">${pastille(hexa)} C ${virgule(lire(hexa).C, 3)}</span>${rampe(r, 'vivid', 'light', { taille: 's' })}</div>`;
}).join('');

/* Q2 : au-dessus de la part commune de Soft */

const q2 = {
  palettes: [
    { nom: 'Vert', hexa: fabriquerCran(0.62, 150, 0.6, 'srgb').hexa },
    { nom: 'Orange', hexa: fabriquerCran(0.7, 55, 0.52, 'srgb').hexa },
    { nom: 'Bleu', hexa: '#1E6FD9' },
  ].map((x) => {
    const p = part(x.hexa);
    const a = actuelle(x.hexa);
    const porteur = a.ancrage.profil;
    const b = calculer(palette(x.hexa, { parts: porteur === 'soft' ? { soft: p, vivid: V } : { soft: S, vivid: p } }));
    return { ...x, p, a, b, porteur };
  }),
};

/* Q3 : profils confondus */

const Q3_REFS = ['#78716C', '#7C717B'];
const ecartsDes = (resultat) => resultat.rampes.soft.light.map((cran, rang) => distanceOk(cran.couleur, resultat.rampes.vivid.light[rang].couleur));
const q3 = Q3_REFS.map((hexa) => {
  const r = proportion(hexa);
  const ecarts = ecartsDes(r);
  const rang600 = CRANS.indexOf(600);
  return { hexa, r, ecarts, e600: ecarts[rang600] };
});
const ligneDesEcarts = (ecarts) => `<div class="ecarts">${ecarts.map((e, rang) => `<span class="${e < RECETTE.seuils.profilsConfondus ? 'bas' : ''}">${CRANS[rang]}<br>${virgule(e, 3)}</span>`).join('')}</div>`;

/* Q4 : une référence hors de l'étendue */

const NOIR = '#060605';
const q4 = { a: actuelle(NOIR), sans: proportion(NOIR, 0) };
const clarteDe = (hexa) => lire(hexa).L;
const courbe = { light: RECETTE.courbes.light, dark: RECETTE.courbes.dark };
const Q4_RANGS = q4.a.ancrage.rangs;

/* Q5 : le seuil du gris neutre */

const Q5_REFS = ['#7F7F80', '#060605', '#FAFAF5', '#78716C'];
const etendue = etendueDe(RECETTE);
/** La part d'une référence mesurée à sa clarté bornée à l'étendue de la liste (R3). */
const partBornee = (hexa) => {
  const lu = lire(hexa);
  const L = Math.min(etendue.clair, Math.max(etendue.sombre, lu.L));
  return lu.C < 1e-4 ? 0 : Math.min(1, Math.round((lu.C / plafond(L, lu.H)) * 1000) / 1000);
};
const sousSeuil = (hexa, seuil) => lire(hexa).C < seuil;
const DESCRIPTIONS = {
  '#7F7F80': 'gris moyen, une unité de bleu en trop',
  '#060605': 'presque noir, une unité de bleu en moins',
  '#FAFAF5': 'blanc cassé, légèrement chaud',
  '#78716C': 'gris beige',
};
const q5 = Q5_REFS.map((hexa) => {
  const pb = partBornee(hexa);
  return {
    hexa,
    description: DESCRIPTIONS[hexa],
    C: lire(hexa).C,
    p: part(hexa),
    pb,
    actuelle: actuelle(hexa),
    s005: proportion(hexa, sousSeuil(hexa, 0.005) ? 0 : pb),
    sans: proportion(hexa, pb),
  };
});

/** Écart de teinte maximal entre une couleur de chroma `C` et ses voisines à un octet près, sur 24 teintes et 4 clartés. */
function incertitude(C) {
  let pire = 0;
  const medianes = [];
  for (let H = 0; H < 360; H += 15) for (const L of [0.3, 0.5, 0.7, 0.9]) {
    const base = fabriquerCran(L, H, C / plafond(L, H), 'srgb');
    if (base.C < 1e-3) continue;
    let max = 0;
    for (let k = 0; k < 3; k += 1) for (const d of [-1, 1]) {
      const voisin = [...base.couleur];
      voisin[k] = Math.min(255, Math.max(0, voisin[k] + d));
      const lu = rgb8VersOklch(voisin);
      max = Math.max(max, Math.abs(((lu.H - base.H + 540) % 360) - 180));
    }
    medianes.push(max);
    pire = Math.max(pire, max);
  }
  medianes.sort((a, b) => a - b);
  return { mediane: medianes[medianes.length >> 1], pire };
}
const INCERTITUDES = [0.003, 0.005, 0.01, 0.02, 0.03].map((C) => ({ C, ...incertitude(C) }));

/* La page */

const sectionQ1 = blocDeQuestion('Q1', 'Sous l’intensité commune de Soft, que fait Vivid ?',
  `Trois références moins saturées que Soft (${virgule(S)}). Thème Light. ◆ : la référence, telle quelle.`,
  rangees(q1.map((x) => [`${pastille(x.hexa)} chroma ${virgule(x.C, 3)}, intensité ${virgule(x.p, 3)}`, [
    vue(deux(x.actuelle), 'A', `Aujourd’hui : Soft ${virgule(x.C < 0.03 ? x.p : S, 3)}, Vivid ${virgule(x.C < 0.03 ? x.p : V, 3)}.`),
    vue(deux(x.bornes), 'B', `Bornes : Soft ${virgule(x.p, 3)}, Vivid ${virgule(V)}.`),
    vue(deux(x.proportion), 'C', `Proportion : Soft ${virgule(x.p, 3)}, Vivid ${virgule(Math.min(1, x.p * V / S), 3)}.`),
  ].join('')])),
  `<ol type="A"><li><b>Aujourd’hui.</b> Au-dessus de 0,03 de chroma, Soft garde ${virgule(S)} : la référence est plus terne que ses voisines. En dessous, Soft et Vivid sont identiques.</li><li><b>Bornes.</b> Soft prend l’intensité de la référence ; Vivid garde ${virgule(V)}. Un gris bleuté donne un Vivid bleu franc.</li><li><b>Proportion.</b> ${reco()} Soft prend l’intensité de la référence ; Vivid reste ${virgule(V / S, 1)} fois plus intense. La palette reste désaturée, et les deux profils restent distincts.</li></ol>`,
  'C');

/* Q1 ter : les gestes de la carte « Teinte, saturation, luminosité » (Z10.5), appelés tels quels */

const avecPalette = (p) => ({ ...RECETTE, palettes: [p] });
const MAUVE = nouvellePalette(RECETTE, 'p-0000000a', '#897288', 2);
const MAUVE_SOFT = reglerSaturation(avecPalette(MAUVE), MAUVE, 'soft', 0.16);
const GRIS = nouvellePalette(RECETTE, 'p-0000000a', '#7C717B', 2);
const GRIS_VIVID = reglerSaturation(avecPalette(GRIS), GRIS, 'vivid', 0.165);
const UNE = nouvellePalette(RECETTE, 'p-0000000a', '#897288', 1);
const UNE_TOURNEE = reglerTeinte(avecPalette(UNE), UNE, 'vivid', 10);
const UNE_12 = reglerSaturation(avecPalette(UNE_TOURNEE), UNE_TOURNEE, 'vivid', 0.12);
const UNE_08 = reglerSaturation(avecPalette(UNE_TOURNEE), UNE_TOURNEE, 'vivid', 0.08);
const NEUTRE = nouvellePalette(RECETTE, 'p-0000000a', '#808080', 2);
const NEUTRE_VIVID = reglerSaturation(avecPalette(NEUTRE), NEUTRE, 'vivid', 0.3);
const NEUTRE_DEUX = reglerSaturation(avecPalette(NEUTRE), NEUTRE, 'deux', 0.3);
const alertesEcrites = (r) => (r.alertes.length ? r.alertes.map((code) => `« ${code} »`).join(', ') : 'aucune alerte');
const q1ter = {
  mauve: calculer(MAUVE), mauveSoft: calculer(MAUVE_SOFT),
  gris: calculer(GRIS), grisVivid: calculer(GRIS_VIVID), grisR1: proportion('#7C717B'),
  une12: calculer(UNE_12), une08: calculer(UNE_08),
  neutre: calculer(NEUTRE), neutreVivid: calculer(NEUTRE_VIVID), neutreDeux: calculer(NEUTRE_DEUX),
};

const sectionQ1ter = blocDeQuestion('Constat', 'Ce que le plugin fait aujourd’hui, à la main',
  'Rien à choisir ici. Ce bloc montre le plugin tel qu’il est, avec la carte « Teinte, saturation, luminosité ». La colonne de droite montre le même cas une fois le plan appliqué.',
  rangees([
    [`${pastille('#897288')} Baisser la saturation de Soft`, [
      vue(deux(q1ter.mauve), 'Aujourd’hui', 'Sans réglage, Soft est trop vif autour de ta couleur.'),
      vue(deux(q1ter.mauveSoft), 'Aujourd’hui', 'Soft à 16 % à la main : les voisines lui ressemblent.'),
      vue(deux(proportion('#897288')), 'Avec le plan', 'Le même résultat, sans geste. Vivid baisse aussi.'),
    ].join('')],
    [`${pastille('#7C717B')} Séparer Soft et Vivid`, [
      vue(deux(q1ter.gris), 'Aujourd’hui', 'Sans réglage, Soft et Vivid sont identiques.'),
      vue(deux(q1ter.grisVivid), 'Aujourd’hui', 'Vivid à 16,5 % à la main. La teinte et la dérive restent bloquées.'),
      vue(deux(q1ter.grisR1), 'Avec le plan', 'Le même écart, sans geste, avec la dérive.'),
    ].join('')],
    [`${pastille('#897288')} Une intensité : teinte +10°, puis moins de saturation`, [
      vue(rampe(q1ter.une12, 'unique', 'light', { titre: `Saturation 12 % · ${UNE_12.reference}` }), 'Aujourd’hui', 'La teinte se règle.'),
      vue(rampe(q1ter.une08, 'unique', 'light', { titre: `Saturation 8 % · ${UNE_08.reference}` }), 'Aujourd’hui', 'La teinte se bloque. Les +10° restent appliqués.'),
      vue('<div class="texte-seul">La teinte reste réglable. Elle ne se bloque que si toutes les nuances sont grises.</div>', 'Avec le plan', ''),
    ].join('')],
    [`${pastille('#808080')} Gris pur : ajouter de la saturation`, [
      vue(deux(q1ter.neutre), 'Aujourd’hui', 'Deux rampes grises.'),
      vue(deux(q1ter.neutreVivid), 'Aujourd’hui', 'Vivid à 30 % devient rose. La teinte reste bloquée.'),
      vue('<div class="texte-seul">La teinte se débloque dès que Vivid a de la couleur. Tu choisis la teinte.</div>', 'Avec le plan', ''),
    ].join('')],
  ]),
  '');

const sectionQ1bis = blocDeQuestion('Q1 bis', 'Le même choix, pendant un glisser',
  'Dans le sélecteur de couleur, la saturation de #897288 baisse pas à pas. Rampe Vivid, thème Light.',
  [
    vue(ligneDuGlisser(actuelle), 'A', 'Aujourd’hui : Vivid saute du magenta au gris en passant 0,03.'),
    vue(ligneDuGlisser(bornes), 'B', 'Bornes : Vivid ne bouge pas.'),
    vue(ligneDuGlisser((h) => proportion(h)), 'C', 'Proportion : Vivid baisse avec la référence, sans saut.'),
  ].join(''),
  `<p>À deux intensités, ce saut n’arrive qu’au sélecteur de couleur. Dans la carte, la saturation d’un profil ne déplace pas la référence, et la teinte comme la luminosité gardent sa chroma. C ${reco('n’a pas de seuil, donc pas de saut.')}</p>`,
  'très bien');

const sectionQ2 = blocDeQuestion('Q2', 'Une couleur entre Soft et Vivid',
  `Tous les Soft du fichier ont la même saturation, ${pourcent(S)}. Tous les Vivid ont ${pourcent(V)}. Ta couleur va dans le plus proche des deux. Si elle est plus vive que Soft, elle ressort de sa rampe. Faut-il aligner la rampe sur ta couleur ?`,
  rangees([
    ['Les rampes Soft de trois palettes du même fichier', [
      vue(q2.palettes.map((x) => rampe(x.a, 'soft', 'light', { titre: `${pastille(x.hexa)} ${x.nom}, saturation ${pourcent(x.p)}${x.porteur === 'soft' ? ', dans Soft' : ', dans Vivid'}` })).join(''), 'A', `Tous les Soft restent à ${pourcent(S)}.`),
      vue(q2.palettes.map((x) => rampe(x.b, 'soft', 'light', { titre: `${pastille(x.hexa)} ${x.nom}, Soft à ${pourcent(x.porteur === 'soft' ? x.p : S)}` })).join(''), 'B', 'Chaque Soft prend la saturation de sa couleur.'),
    ].join('')],
  ]),
  `<ol type="A"><li><b>Garder la même saturation pour tous les Soft.</b> ${reco()} Tes Soft restent homogènes d’une palette à l’autre. Ta couleur ressort un peu de sa rampe. Tu peux l’y fondre à la main, avec le curseur de saturation.</li><li><b>Aligner la rampe sur ta couleur.</b> Ta couleur se fond dans sa rampe. Tes Soft n’ont plus la même saturation d’une palette à l’autre.</li></ol><p>Ce choix ne touche que les couleurs entre ${pourcent(S)} et ${pourcent(V)}. En dessous, Q1 a déjà tranché.</p>`);

const sectionQ3 = blocDeQuestion('Q3', '« Profils confondus » sur une palette désaturée',
  `Règle C de Q1. Sous chaque paire, l’écart entre Soft et Vivid ; en couleur, sous le seuil de ${virgule(RECETTE.seuils.profilsConfondus)}.`,
  q3.map((x) => vue(deux(x.r) + ligneDesEcarts(x.ecarts), '', `${pastille(x.hexa)} ${x.ecarts.filter((e) => e < RECETTE.seuils.profilsConfondus).length} nuances sur ${CRANS.length} sous le seuil.`)).join(''),
  `<ol type="a"><li><b>Se taire</b> quand Soft prend la saturation de ta couleur.</li><li><b>Sonner.</b></li></ol>`,
  'a');

const sectionQ4 = blocDeQuestion('Q4', 'Une couleur plus sombre que toutes les nuances',
  `${pastille(NOIR)} remplace la nuance 950 en Light et la 50 en Dark.`,
  [
    vue(rampe(q4.a, 'soft', 'light', { titre: 'Light' }) + rampe(q4.a, 'soft', 'dark', { titre: 'Dark' }), '', 'Soft, aujourd’hui.'),
    vue(`<div class="message"><p class="m-t">Points à vérifier · 1</p><p>La luminosité de départ (0,121) est en dehors de la plage des nuances (0,270 à 0,975). Vous pouvez régler la teinte d’un seul côté.</p><p class="m-g">Utilisez le réglage encore disponible.</p></div>`, '', 'Le message d’aujourd’hui disparaît.'),
  ].join(''),
  `<ol type="a"><li><b>Aucun message.</b> Une palette peut partir de #000000 ou de #FFFFFF.</li><li><b>Une notice.</b></li></ol>`,
  'a, pas de message');

const sectionQ5 = blocDeQuestion('Q5', 'Quand une couleur est-elle un gris pur ?',
  'Un gris saisi en hexa est rarement pur. #7F7F80 a une unité de bleu en trop. Si le plugin garde cette trace, toutes les nuances la reprennent. S’il l’ignore, la palette est grise, sans teinte. #000000 et #FFFFFF restent des gris purs dans les deux cas.',
  rangees(q5.map((x) => [`${pastille(x.hexa)} · ${x.description}`, [
    vue(deux(x.s005), 'A', sousSeuil(x.hexa, 0.005) ? 'Gris pur.' : 'La teinte est gardée.'),
    vue(deux(x.sans), 'B', 'La teinte est gardée.'),
  ].join('')])),
  `<ol type="A"><li><b>Ignorer une trace trop faible pour avoir une teinte stable.</b> ${reco()} Une seule unité RGB peut y faire tourner la teinte de plus de 30°. #7F7F80 et #060605 deviennent des gris purs. #FAFAF5 et #78716C gardent leur teinte.</li><li><b>Tout garder.</b> #060605, un presque noir, donne des nuances claires vert olive.</li></ol>`);

const lireStyle = (fichier) => /<style>([\s\S]*?)<\/style>/.exec(fs.readFileSync(path.join(ICI, fichier), 'utf8'))[1];
const STYLE = `${lireStyle('MAQUETTES-RECETTE-V5.html')}
main { max-width: 1840px; }
.qbloc .scene { gap: 16px; }
.qbloc .scene-rangee { align-items: flex-start; }
.carton { background: var(--papier); border: 1px solid var(--filet); border-radius: 10px; padding: 12px; display: grid; gap: 8px; }
.rampe { display: grid; gap: 4px; }
.rampe .t, .glisser .t { font: 500 12px/1.2 var(--sans); color: var(--encre-2); display: flex; gap: 6px; align-items: center; }
.nuances { display: flex; gap: 2px; }
.n { display: grid; justify-items: center; gap: 1px; }
.rangee-titre { font: 600 13px/1.3 var(--sans); display: flex; gap: 4px; align-items: center; }
.n .p { width: 30px; height: 30px; border-radius: 4px; display: grid; place-items: center; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
.n.s .p { width: 22px; height: 18px; border-radius: 3px; }
.n.s .h { display: none; }
.n .h { font: 9px/1.2 var(--mono); color: var(--encre-2); }
.n .h.x { font-size: 7.5px; }
.n .d { font-size: 13px; color: #fff; text-shadow: 0 0 2px #000, 0 0 1px #000; }
.glisser { display: grid; grid-template-columns: 170px auto; gap: 8px; align-items: center; }
.pastille { width: 12px; height: 12px; border-radius: 50%; display: inline-block; box-shadow: inset 0 0 0 1px rgba(0,0,0,.2); vertical-align: -1px; margin-right: 4px; }
.ecarts { display: flex; gap: 2px; }
.ecarts span { width: 30px; text-align: center; font: 9px/1.25 var(--mono); color: var(--encre-2); }
.ecarts span.bas { color: var(--ko); font-weight: 500; }
.message { background: #383838; color: #fff; border-radius: 8px; padding: 10px 12px; max-width: 380px; font: 11px/16px Inter, system-ui, sans-serif; display: grid; gap: 6px; }
.message .m-t { font-weight: 600; }
.message .m-g { color: #b3b3b3; }
.desactive { max-width: 380px; border: 1px dashed var(--filet); border-radius: 8px; padding: 8px 12px; font-size: 13px; color: var(--encre-2); }
table.mini { border-collapse: collapse; font-size: 13px; }
table.mini th, table.mini td { padding: 4px 10px; border-bottom: 1px solid var(--filet); text-align: left; }
table.mini th { color: var(--encre-2); font-weight: 500; }
.reponse { margin-left: auto; font: 600 12px/1 var(--sans); padding: 5px 9px; border-radius: 6px; background: var(--accent-fond); color: var(--accent); }
.qbloc.repondu { opacity: .8; }
.qchoix p { margin-top: 10px; }
.qtete { display: flex; align-items: baseline; gap: 10px; }
.texte-seul { width: 350px; min-height: 60px; display: grid; align-items: center; font-size: 14px; }
`;

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Palettes désaturées</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap">
<style>
${STYLE}</style>
</head>
<body>
<main>
<section class="intro">
  <span class="sur">UCM Palettes · palettes désaturées et grises</span>
  <h1>Palettes désaturées, second passage</h1>
  <p>Deux questions restent ouvertes, Q2 et Q5. Elles sont réécrites plus simplement. Tes réponses aux autres suivent, pour mémoire.</p>
  <p>Chaque rampe va de la nuance 50 à la 950, en thème Light. Le losange ◆ marque ta couleur de référence, posée telle quelle. Les couleurs sont calculées par le moteur du plugin.</p>
  <p class="note">Page écrite par <code>generer-maquettes-palettes-desaturees.mjs</code>.</p>
  <nav class="sommaire"><a href="#q2">Q2 Entre Soft et Vivid</a><a href="#q5">Q5 Gris pur</a><a href="#constat">Constat</a><a href="#reponses">Déjà répondu</a></nav>
</section>
<section class="bloc" id="q2">${sectionQ2}</section>
<section class="bloc" id="q5">${sectionQ5}</section>
<section class="bloc" id="constat">${sectionQ1ter}</section>
<section class="bloc" id="reponses"><div class="tete"><span class="sur">Déjà répondu</span></div>${sectionQ1}${sectionQ1bis}${sectionQ3}${sectionQ4}</section>
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(ICI, 'MAQUETTES-PALETTES-DESATUREES.html'), page);
process.stdout.write(`MAQUETTES-PALETTES-DESATUREES.html : ${page.length} caractères\n`);
process.stdout.write(`Glisser : ${GLISSER.join(' ')}\n`);
process.stdout.write(`Q2 : ${q2.palettes.map((x) => `${x.nom} ${x.hexa} part ${x.p} porteur ${x.porteur}`).join(" ; ")}
`);
process.stdout.write(`Teinte, écart maximal pour un octet : ${INCERTITUDES.map((x) => `C ${x.C} ${Math.round(x.pire)}°`).join(" ; ")}
`);
process.stdout.write(`Q3 : ${q3.map((x) => `${x.hexa} 600 ${x.e600.toFixed(3)} min ${Math.min(...x.ecarts).toFixed(3)} alertes ${x.r.alertes.join(', ')}`).join(' ; ')}\n`);
process.stdout.write(`Q4 : alertes ${q4.a.alertes.join(', ')} ; rangs ${JSON.stringify(Q4_RANGS)}\n`);
process.stdout.write(`Q5 : ${q5.map((x) => `${x.hexa} C ${x.C.toFixed(4)} p ${x.p} pb ${x.pb}`).join(' ; ')}\n`);
