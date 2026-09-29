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

function blocDeQuestion(numero, titre, explication, ecrans, choix) {
  return `<div class="qbloc"><div class="qtete"><span class="qnum">${numero}</span><h3>${titre}</h3></div>${explication ? `<p>${explication}</p>` : ''}${ecrans ? `<div class="scene">${ecrans.startsWith('<p class="rangee-titre"') ? ecrans : `<div class="scene-rangee">${ecrans}</div>`}</div>` : ''}${choix ? `<div class="qchoix">${choix}</div>` : ''}</div>`;
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

const VERT_60 = fabriquerCran(0.62, 150, 0.6, 'srgb').hexa;
const BLEU = '#1E6FD9';
const q2 = {
  vert: { hexa: VERT_60, p: part(VERT_60), a: actuelle(VERT_60), b: calculer(palette(VERT_60, { parts: { soft: part(VERT_60), vivid: V } })) },
  bleu: { hexa: BLEU, p: part(BLEU), a: actuelle(BLEU), b: calculer(palette(BLEU, { parts: { soft: S, vivid: part(BLEU) } })) },
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
const q5 = Q5_REFS.map((hexa) => {
  const pb = partBornee(hexa);
  return {
    hexa,
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
  `<ol type="A"><li><b>Aujourd’hui.</b> Au-dessus de 0,03 de chroma, Soft garde ${virgule(S)} : la référence est plus terne que ses voisines. En dessous, Soft et Vivid sont identiques.</li><li><b>Bornes.</b> Soft prend l’intensité de la référence ; Vivid garde ${virgule(V)}. Un gris bleuté donne un Vivid bleu franc.</li><li><b>Proportion.</b> ${reco()} Soft prend l’intensité de la référence ; Vivid reste ${virgule(V / S, 1)} fois plus intense. La palette reste désaturée, et les deux profils restent distincts.</li></ol>`);

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

const sectionQ1ter = blocDeQuestion('Q1 ter', 'Ce que la nouvelle carte permet déjà, à la main',
  'Les gestes de la carte « Teinte, saturation, luminosité », appelés tels quels. Thème Light.',
  rangees([
    [`${pastille('#897288')} deux intensités : baisser Soft`, [
      vue(deux(q1ter.mauve), 'A', `Sans réglage : ${alertesEcrites(q1ter.mauve)}.`),
      vue(deux(q1ter.mauveSoft), 'B', `Curseur Soft à 16 % : ${alertesEcrites(q1ter.mauveSoft)}. Vivid garde 0,95.`),
    ].join('')],
    [`${pastille('#7C717B')} deux intensités : monter Vivid`, [
      vue(deux(q1ter.gris), 'A', 'Sans réglage : Soft et Vivid identiques.'),
      vue(deux(q1ter.grisVivid), 'B', `Curseur Vivid à 16,5 % : ${alertesEcrites(q1ter.grisVivid)}. Teinte et dérive restent verrouillées, à 0°.`),
      vue(deux(q1ter.grisR1), 'C', 'Règle « Proportion » : les mêmes intensités, avec la dérive Tailwind.'),
    ].join('')],
    [`${pastille('#897288')} une intensité : teinte +10°, puis baisser la saturation`, [
      vue(rampe(q1ter.une12, 'unique', 'light', { titre: `Saturation 12 % · ${UNE_12.reference}` }), 'A', 'Au-dessus du seuil : teinte et dérive réglables.'),
      vue(rampe(q1ter.une08, 'unique', 'light', { titre: `Saturation 8 % · ${UNE_08.reference}` }), 'B', 'Sous le seuil : la teinte, son « Rétablir » et la dérive se verrouillent, mais +10° et la dérive restent appliqués.'),
    ].join('')],
    [`${pastille('#808080')} gris neutre, deux intensités : saturer`, [
      vue(deux(q1ter.neutre), 'A', 'Sans réglage : deux rampes grises.'),
      vue(deux(q1ter.neutreVivid), 'B', 'Curseur Vivid à 30 % : une rampe rose, car la teinte d’un gris vaut 0°. La piste de teinte reste verrouillée.'),
      vue(deux(q1ter.neutreDeux), 'C', '« Les deux » à 30 % : la référence reste grise au 600, au milieu d’une rampe Soft rose.'),
    ].join('')],
  ]),
  `<ul><li>La carte répare à la main le Soft de #897288. Elle sépare aussi Soft et Vivid pour #7C717B.</li><li>Elle ne rend ni la teinte ni la dérive à une palette désaturée. R1 et R4 les rendent.</li><li>À une intensité, le curseur de saturation fait passer la référence sous le seuil en plein geste. La teinte se verrouille alors qu’elle reste appliquée. R4 lève ce verrou.</li><li>Sur un gris neutre, saturer invente une teinte que le designer ne peut pas changer. Avec R4, la piste de teinte se déverrouille dès que la rampe prend de la couleur.</li><li>L’alerte « presque grise » dit que « les deux profils reprennent son intensité ». C’est faux dès que le designer règle les parts. R6 retire cette alerte.</li></ul>`);

const sectionQ1bis = blocDeQuestion('Q1 bis', 'Le même choix, pendant un glisser',
  'Dans le sélecteur de couleur, la saturation de #897288 baisse pas à pas. Rampe Vivid, thème Light.',
  [
    vue(ligneDuGlisser(actuelle), 'A', 'Aujourd’hui : Vivid saute du magenta au gris en passant 0,03.'),
    vue(ligneDuGlisser(bornes), 'B', 'Bornes : Vivid ne bouge pas.'),
    vue(ligneDuGlisser((h) => proportion(h)), 'C', 'Proportion : Vivid baisse avec la référence, sans saut.'),
  ].join(''),
  `<p>À deux intensités, ce saut n’arrive qu’au sélecteur de couleur. Dans la carte, la saturation d’un profil ne déplace pas la référence, et la teinte comme la luminosité gardent sa chroma. C ${reco('n’a pas de seuil, donc pas de saut.')}</p>`);

const sectionQ2 = blocDeQuestion('Q2', 'Au-dessus de Soft, le profil porteur prend-il l’intensité de la référence ?',
  `Deux références entre les intensités communes. Thème Light, profil porteur seul. Les autres palettes gardent ${virgule(S)} et ${virgule(V)}.`,
  rangees([
    [`${pastille(q2.vert.hexa)} intensité ${virgule(q2.vert.p, 3)}, portée par Soft`, [
      vue(rampe(q2.vert.a, 'soft', 'light', { titre: 'Soft' }), 'A', `Soft garde ${virgule(S)}.`),
      vue(rampe(q2.vert.b, 'soft', 'light', { titre: 'Soft' }), 'B', `Soft prend ${virgule(q2.vert.p, 3)}.`),
    ].join('')],
    [`${pastille(BLEU)} intensité ${virgule(q2.bleu.p, 3)}, portée par Vivid`, [
      vue(rampe(q2.bleu.a, 'vivid', 'light', { titre: 'Vivid' }), 'A', `Vivid garde ${virgule(V)}.`),
      vue(rampe(q2.bleu.b, 'vivid', 'light', { titre: 'Vivid' }), 'B', `Vivid prend ${virgule(q2.bleu.p, 3)}.`),
    ].join('')],
  ]),
  `<ol type="A"><li><b>Garder les intensités communes.</b> ${reco('Recommandé pour ce plan.')} Tous les Soft du design system ont la même intensité. Le vert a un écart visible autour du ◆ ; le bleu, presque aucun. La nouvelle carte « Teinte, saturation, luminosité » règle déjà la saturation de Soft en un geste, et son repère montre celle de la référence.</li><li><b>Le porteur prend l’intensité de la référence</b>, comme avec une palette de base forcée. Le ◆ se fond dans sa rampe. Toutes les palettes colorées changent, et deux Soft du même fichier n’ont plus la même intensité. À rediscuter après la recette de Z10.</li></ol>`);

const sectionQ3 = blocDeQuestion('Q3', '« Profils confondus » sur une palette désaturée',
  `Règle « Proportion ». Sous chaque paire, l’écart ΔEok entre Soft et Vivid ; en couleur, sous le seuil de ${virgule(RECETTE.seuils.profilsConfondus)}.`,
  q3.map((x) => vue(deux(x.r) + ligneDesEcarts(x.ecarts), '', `${pastille(x.hexa)} ${x.ecarts.filter((e) => e < RECETTE.seuils.profilsConfondus).length} nuances sur ${CRANS.length} sous le seuil. ${x.r.alertes.includes('profils-confondus') ? 'Le moteur sonne « Profils confondus ».' : 'Le moteur se tait.'}`)).join(''),
  `<ol type="a"><li><b>Se taire</b> ${reco()} quand Soft prend l’intensité de la référence. Les profils sont proches par construction, comme avec les parts grises aujourd’hui.</li><li><b>Sonner.</b> Le point à vérifier propose alors une intensité seule, ou plus de saturation pour Vivid.</li></ol><p>Aujourd’hui, le même écart réglé à la main dans la carte (Vivid à 16,5 %, Q1 ter) sonne aussi. Avec des parts du designer, l’alerte continue de sonner dans les deux choix.</p>`);

const repere = (hexa, L) => `${pastille(hexa)} clarté ${virgule(L, 3)}`;
const sectionQ4 = blocDeQuestion('Q4', 'Une référence plus sombre que toutes les nuances',
  `${pastille(NOIR)}, clarté ${virgule(clarteDe(NOIR), 3)}. Elle remplace le ${CRANS[Q4_RANGS.light]} en Light, prévu à ${virgule(courbe.light[Q4_RANGS.light], 3)}, et le ${CRANS[Q4_RANGS.dark]} en Dark, prévu à ${virgule(courbe.dark[Q4_RANGS.dark], 3)}, plus sombre que le fond ${RECETTE.fonds.dark}.`,
  [
    vue(rampe(q4.a, 'soft', 'light', { titre: 'Light' }) + rampe(q4.a, 'soft', 'dark', { titre: 'Dark' }), '', 'Soft, aujourd’hui. Le ◆ fait une marche au bout de la rampe.'),
    vue(`<div class="message"><p class="m-t">Points à vérifier · 1</p><p>La luminosité de départ (0,121) est en dehors de la plage des nuances (0,270 à 0,975). Vous pouvez régler la teinte d’un seul côté.</p><p class="m-g">Utilisez le réglage encore disponible.</p></div><div class="desactive">Dérive de teinte · désactivée pour une couleur presque grise</div>`, '', 'Le message d’aujourd’hui, sous une carte désactivée.'),
  ].join(''),
  `<ol type="a"><li><b>Aucun message.</b> L’éditeur de dérive garde sa note sur le côté sans réglage.</li><li><b>Une notice</b> ${reco()} qui dit la marche : « Votre couleur de référence est plus sombre que la nuance 950 prévue. Elle la remplace telle quelle. » Elle n’apparaît qu’au-delà de 0,005 d’écart de clarté. « Ajuster la référence » ne la répare pas : il ne monte que de 0,02, il faudrait ${virgule(courbe.light[Q4_RANGS.light] - clarteDe(NOIR), 2)}. Le geste proposé est donc de choisir une couleur plus claire.</li></ol>`);

const tableIncertitude = `<table class="mini"><tr><th>Chroma</th>${INCERTITUDES.map((i) => `<td>${virgule(i.C, 3)}</td>`).join('')}</tr><tr><th>Teinte, écart médian</th>${INCERTITUDES.map((i) => `<td>${Math.round(i.mediane)}°</td>`).join('')}</tr><tr><th>Teinte, écart maximal</th>${INCERTITUDES.map((i) => `<td>${Math.round(i.pire)}°</td>`).join('')}</tr></table>`;
const sectionQ5 = blocDeQuestion('Q5', 'Sous quelle chroma une référence est-elle un gris neutre ?',
  `Un gris neutre n’a que des nuances grises : Soft et Vivid identiques, dérive désactivée. Le tableau dit de combien un octet déplace la teinte à chaque chroma. Les rampes : règle « Proportion », intensité mesurée à la clarté bornée (R3).`,
  rangees([
    ['Ce qu’un octet fait à la teinte', vue(tableIncertitude, '', 'Sous 0,005, un octet déplace la teinte de plus de 20°.')],
    ...q5.map((x) => [`${pastille(x.hexa)} chroma ${virgule(x.C, 4)}`, [
      vue(deux(x.actuelle), 'A', `Aujourd’hui, seuil 0,03 : intensité ${virgule(x.p, 3)} pour les deux.`),
      vue(deux(x.s005), 'B', `Seuil 0,005 : ${sousSeuil(x.hexa, 0.005) ? 'gris neutre.' : `intensité ${virgule(x.pb, 3)}.`}`),
      vue(deux(x.sans), 'C', `Aucun seuil : intensité ${virgule(x.pb, 3)}.`),
    ].join('')]),
  ]),
  `<ol type="A"><li><b>0,03, aujourd’hui.</b> #78716C, beige grisé dont la teinte est connue à 10° près, devient un gris sans dérive.</li><li><b>0,005</b> ${reco()} #7F7F80 et #060605 deviennent neutres : leur teinte ne tient qu’à un octet. #FAFAF5 garde sa teinte chaude.</li><li><b>Aucun seuil.</b> #060605 garde une teinte olive pâle, tirée d’un octet de bleu en moins.</li></ol>`);

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
  <h1>Questions Q1 à Q5, en exemples</h1>
  <p>Chaque rampe est calculée par le moteur actuel, réglages de Z10.5 compris : sans réglage, il rend les mêmes octets qu’avant. Recette par défaut, onze nuances, Soft ${virgule(S)} et Vivid ${virgule(V)}. Les choix sont ceux du <a href="./PLAN-PALETTES-DESATUREES.md#questions-au-mainteneur">plan</a>. Q1 ter appelle les gestes de la carte « Teinte, saturation, luminosité » tels qu’ils sont écrits aujourd’hui : ce que le designer obtient à la main, et ce qui bloque.</p>
  <p class="note">Page écrite par <code>generer-maquettes-palettes-desaturees.mjs</code>.</p>
  <nav class="sommaire"><a href="#q1">Q1 Vivid sous Soft</a><a href="#q2">Q2 Au-dessus de Soft</a><a href="#q3">Q3 Profils confondus</a><a href="#q4">Q4 Hors des nuances</a><a href="#q5">Q5 Gris neutre</a></nav>
</section>
<section class="bloc" id="q1">${sectionQ1}${sectionQ1ter}${sectionQ1bis}</section>
<section class="bloc" id="q2">${sectionQ2}</section>
<section class="bloc" id="q3">${sectionQ3}</section>
<section class="bloc" id="q4">${sectionQ4}</section>
<section class="bloc" id="q5">${sectionQ5}</section>
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(ICI, 'MAQUETTES-PALETTES-DESATUREES.html'), page);
process.stdout.write(`MAQUETTES-PALETTES-DESATUREES.html : ${page.length} caractères\n`);
process.stdout.write(`Glisser : ${GLISSER.join(' ')}\n`);
process.stdout.write(`Q2 : vert ${VERT_60} part ${part(VERT_60)} porteur ${q2.vert.a.ancrage.profil} ; bleu part ${part(BLEU)} porteur ${q2.bleu.a.ancrage.profil}\n`);
process.stdout.write(`Q3 : ${q3.map((x) => `${x.hexa} 600 ${x.e600.toFixed(3)} min ${Math.min(...x.ecarts).toFixed(3)} alertes ${x.r.alertes.join(', ')}`).join(' ; ')}\n`);
process.stdout.write(`Q4 : alertes ${q4.a.alertes.join(', ')} ; rangs ${JSON.stringify(Q4_RANGS)}\n`);
process.stdout.write(`Q5 : ${q5.map((x) => `${x.hexa} C ${x.C.toFixed(4)} p ${x.p} pb ${x.pb}`).join(' ; ')}\n`);
