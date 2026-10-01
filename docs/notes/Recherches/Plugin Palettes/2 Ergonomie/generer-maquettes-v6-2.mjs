#!/usr/bin/env node
/**
 * Écrit MAQUETTES-RECETTE-V6-2.html, les maquettes du lot Z10 du sixième
 * plan (refonte de la carte « Intensités ») et la phrase de Z5.2 pour une
 * référence qui manque des garanties dans les deux thèmes.
 *
 *   npm run galerie --workspace ucm-palettes-plugin
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/2 Ergonomie/generer-maquettes-v6-2.mjs"
 *
 * Chaque écran part d'un état de la galerie construite, au thème sombre de
 * Figma, en français : le DOM réel de l'interface, que Chromium ouvre à 770
 * ou 500 px. La carte proposée remplace la carte « Intensités » ; ses règles
 * commencent par `v62-`. Les pistes peintes, les valeurs, la référence
 * tournée et les ratios viennent du moteur. Le modèle est celui de
 * RECHERCHE-REFONTE-INTENSITES.md, modèle C.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import {
  ancrageDe,
  associationDe,
  boutsDe,
  classerRecette,
  fabriquerCran,
  fnv1a,
  jsonCanonique,
  lireHexa,
  octetsUtf8,
  partDeChroma,
  partsDesProfils,
  plafond,
  prereglageTailwind,
  recetteParDefaut,
  rgb8VersOklch,
  verifierPromesses,
} from '../../../../../packages/couleur/src/index.ts';
import { ajouter, appliquerLAjustement, nouvellePalette, renommer } from '../../../../../packages/plugin-palettes/src/edition.ts';
import { contrasteEcrit, garantiesManqueesDeLaReference } from '../../../../../packages/plugin-palettes/src/i18n/fr.ts';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const GALERIE = path.resolve(ICI, '../../../../../packages/plugin-palettes/dist/galerie/sombre');
if (!fs.existsSync(GALERIE)) throw new Error('Galerie absente : lancer « npm run galerie --workspace ucm-palettes-plugin ».');

const esc = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const virgule = (x, n = 2) => x.toFixed(n).replace('.', ',').replace(/^-/, '−');
const signe = (x, n = 0) => (Math.abs(x) < 10 ** -(n + 1) ? virgule(0, n) : `${x > 0 ? '+' : ''}${virgule(x, n)}`);
const degres = (x) => `${signe(x)}°`;
const pourcent = (part) => `${Math.round(part * 100)} %`;

/* Le moteur : Bleu, la palette de la galerie, deux intensités */

const RECETTE_VIDE = recetteParDefaut();
const BLEU = renommer(nouvellePalette(RECETTE_VIDE, 'p-3fa2c91e', '#1E6FD9', 2), 'Bleu');
const RECETTE = ajouter(RECETTE_VIDE, BLEU);
const GAMUT = RECETTE.gamut;
const PIVOT = rgb8VersOklch(lireHexa(BLEU.reference));
const PARTS = partsDesProfils(RECETTE, BLEU);
const PORTEUR = ancrageDe(RECETTE, BLEU).profil;
const AUTRE = PORTEUR === 'vivid' ? 'soft' : 'vivid';
const NOM = { soft: 'Soft', vivid: 'Vivid' };

/** L'exemple montré : Soft décalée de +6°, les deux luminosités à zéro. */
const EXEMPLE = { ecart: 6, luminosite: { soft: 0, vivid: 0 } };
const teinteDu = (profil) => PIVOT.H + (profil === PORTEUR ? 0 : EXEMPLE.ecart);

/** Une piste peinte : `n` couleurs fabriquées par le moteur, en dégradé. */
function piste(couleurs) {
  return `linear-gradient(to right, ${couleurs.map((c, rang) => `${c} ${Math.round((rang / (couleurs.length - 1)) * 100)}%`).join(', ')})`;
}
const hexaDe = (L, H, part) => fabriquerCran(Math.min(1, Math.max(0, L)), H, Math.min(1, Math.max(0, part)), GAMUT).hexa;
const pisteDeTeinte = (profil) => piste(Array.from({ length: 13 }, (_, r) => hexaDe(PIVOT.L, teinteDu(profil) - 30 + r * 5, PARTS[profil])));
const pisteDeSaturation = (profil) => piste(Array.from({ length: 11 }, (_, r) => hexaDe(PIVOT.L, teinteDu(profil), r / 10)));
/** La luminosité va de −0,05 à +0,02 : au-delà, la nuance 50 devient blanche (mesure E4 bis). */
const pisteDeLuminosite = (profil) => piste(Array.from({ length: 8 }, (_, r) => hexaDe(PIVOT.L - 0.05 + r * 0.01, teinteDu(profil), PARTS[profil])));

/** La position d'une valeur sur sa piste, en pour cent. */
const surTeinte = (ecart) => ((ecart + 30) / 60) * 100;
const surLuminosite = (delta) => ((delta + 0.05) / 0.07) * 100;

/** La valeur de chaque grandeur, pour un profil : écart affiché, absolu, position. */
function valeurs(profil) {
  const ecart = profil === PORTEUR ? 0 : EXEMPLE.ecart;
  return {
    teinte: { champ: degres(ecart), absolu: `${Math.round(teinteDu(profil)) % 360}°`, position: surTeinte(ecart) },
    saturation: { champ: pourcent(PARTS[profil]), absolu: '', position: PARTS[profil] * 100 },
    luminosite: { champ: signe(EXEMPLE.luminosite[profil], 2), absolu: '', position: surLuminosite(EXEMPLE.luminosite[profil]) },
  };
}
const PISTES = { teinte: pisteDeTeinte, saturation: pisteDeSaturation, luminosite: pisteDeLuminosite };
const LIBELLES = { teinte: 'Teinte', saturation: 'Saturation', luminosite: 'Luminosité' };
const GRANDEURS = ['teinte', 'saturation', 'luminosite'];

/* La référence déplacée : Vivid, qui la porte, tournée de +8° */

const ROTATION = 8;
function referenceTournee(delta) {
  const maximum = plafond(PIVOT.L, PIVOT.H + delta, GAMUT);
  return fabriquerCran(PIVOT.L, PIVOT.H + delta, maximum > 0 ? Math.min(1, PIVOT.C / maximum) : 0, GAMUT).hexa;
}
const TOURNEE = referenceTournee(ROTATION);
const BLEU_TOURNE = appliquerLAjustement(RECETTE, BLEU, TOURNEE);

/** L'effet d'une rotation sur la dérive Tailwind ([ENT-01]) : les deux angles avant et après. */
function deriveApres(delta) {
  const avant = prereglageTailwind(PIVOT, boutsDe(RECETTE));
  const apres = prereglageTailwind({ ...PIVOT, H: PIVOT.H + delta }, boutsDe(RECETTE));
  return { avant, apres };
}
const DERIVE_BLEU = deriveApres(10);
const JAUNE = rgb8VersOklch(lireHexa('#FACC15'));
const DERIVE_JAUNE = {
  avant: prereglageTailwind(JAUNE, boutsDe(RECETTE)),
  apres: prereglageTailwind({ ...JAUNE, H: JAUNE.H - 10 }, boutsDe(RECETTE)),
};
const angles = ({ clair, sombre }) => `${degres(clair)} / ${degres(sombre)}`;

/** Le message d'état que le sandbox enverrait pour une recette : l'interface de la galerie le rend comme un vrai fichier. */
function etatDe(recette, demande) {
  const texte = jsonCanonique(recette);
  return { type: 'etat', demande, classement: classerRecette(texte), texte, empreinte: fnv1a(octetsUtf8(texte)), profil: 'SRGB', planche: { page: null, nomDeLaPage: null, cadres: [], manquants: [], recherche: 'page', suiviFutur: false } };
}

/* Z5.2 : une référence qui manque des garanties dans les deux thèmes, cherchée par le moteur */

const MODES_ECRITS = { light: 'Light', dark: 'Dark' };
const ROLE_AVEC_ARTICLE = { 'border-control': 'les bordures de champ', focus: 'l’anneau de focus', text: 'le texte coloré', 'on-solid': 'le texte sur fond plein', solid: 'le fond plein', surface: 'le fond léger', 'surface-card': 'le fond de carte', fond: 'le fond de page' };
const ROLE_SECOND = { surface: 'fond léger', 'surface-card': 'fond de carte', fond: 'fond de page', solid: 'fond plein' };

/**
 * Avec la recette par défaut, aucune couleur ne manque de garantie dans les
 * deux thèmes (10 000 essayées, 72 teintes de 0,20 à 0,95 de clarté, trois
 * parts). Le cas naît d'un minimum relevé dans les Réglages communs : ici
 * « Éléments visibles » à 3,5:1.
 */
const SEUIL_Z52 = 3.5;
const RECETTE_Z52 = { ...RECETTE_VIDE, seuils: { ...RECETTE_VIDE.seuils, nonTexte: SEUIL_Z52 } };

function deuxThemes() {
  for (let H = 0; H < 360; H += 10) {
    for (let L = 0.3; L <= 0.9; L += 0.01) {
      const hexa = hexaDe(L, H, 0.95);
      const palette = nouvellePalette(RECETTE_Z52, 'p-0000000a', hexa, 2);
      const recette = ajouter(RECETTE_Z52, palette);
      const ancrage = ancrageDe(recette, palette);
      const surLaReference = verifierPromesses(recette, palette).filter((p) => p.verdict === 'manquee' && p.profil === ancrage.profil
        && [p.premier, p.second].some((d) => d.nature === 'cran' && d.cran === ancrage.crans[p.mode]));
      const parMode = { light: surLaReference.filter((p) => p.mode === 'light'), dark: surLaReference.filter((p) => p.mode === 'dark') };
      if (parMode.light.length > 0 && parMode.dark.length > 0) return { hexa, ancrage, parMode, toutes: verifierPromesses(recette, palette).filter((p) => p.verdict === 'manquee' && p.profil === ancrage.profil) };
    }
  }
  throw new Error('Aucune référence ne manque de garantie dans les deux thèmes.');
}
const Z52 = deuxThemes();

/** Pour un thème : trop claire ou trop sombre, les rôles, le pire ratio et son minimum. */
function constatDuTheme(mode) {
  const manquees = Z52.parMode[mode];
  const sens = manquees.map((p) => {
    const reference = [p.premier, p.second].find((d) => d.nature === 'cran' && d.cran === Z52.ancrage.crans[mode]);
    const partenaire = reference === p.premier ? p.second : p.premier;
    return rgb8VersOklch(reference.couleur).L < rgb8VersOklch(partenaire.couleur).L ? 'trop claire' : 'trop sombre';
  })[0];
  const associations = manquees.map((p) => associationDe(p.paire));
  const premiers = [...new Set(associations.map((a) => ROLE_AVEC_ARTICLE[a.premier]))];
  const seconds = [...new Set(associations.map((a) => ROLE_SECOND[a.second] ?? a.second))];
  const pire = manquees.reduce((a, b) => (a.contraste < b.contraste ? a : b));
  return { sens, roles: `${premiers.join(' et ')} sur ${seconds.join(' et ')}`, ratio: contrasteEcrit(pire.contraste), minimum: String(pire.seuil).replace('.', ','), nombre: manquees.length };
}
const LIGHT = constatDuTheme('light');
const DARK = constatDuTheme('dark');
const CRANS = Z52.ancrage.crans;
const nuances = CRANS.light === CRANS.dark ? `La nuance ${CRANS.light} est exactement votre couleur.` : `Votre couleur est exactement la nuance ${CRANS.light} en Thème Light et la nuance ${CRANS.dark} en Thème Dark.`;
const LIGNE_Z52 = garantiesManqueesDeLaReference({ light: Z52.toutes.filter((p) => p.mode === 'light').length, dark: Z52.toutes.filter((p) => p.mode === 'dark').length });
const PHRASES_Z52 = {
  a: `${nuances} En Thème Light, elle est ${LIGHT.sens} pour ${LIGHT.roles} : ${LIGHT.ratio} pour un minimum de ${LIGHT.minimum}:1. En Thème Dark, elle est ${DARK.sens} pour ${DARK.roles} : ${DARK.ratio} pour un minimum de ${DARK.minimum}:1.`,
  b: `${nuances} Elle est ${LIGHT.sens} en Thème Light et ${DARK.sens} en Thème Dark pour les garanties ci-dessous.`,
  c: `${nuances} En Thème Light, elle est ${LIGHT.sens} pour ${LIGHT.roles} (${LIGHT.ratio}). En Thème Dark, elle est ${DARK.sens} pour ${DARK.roles} (${DARK.ratio}). ${LIGHT.minimum === DARK.minimum ? `Minimum : ${LIGHT.minimum}:1.` : `Minimums : ${LIGHT.minimum}:1 en Light, ${DARK.minimum}:1 en Dark.`}`,
};

/* Les prototypes de la carte, écrits en HTML aux classes du plugin */

const curseur = (grandeur, profil, { fantome = null } = {}) => {
  const v = valeurs(profil)[grandeur];
  const autre = fantome ? `<span class="v62-fantome" style="left:${valeurs(fantome)[grandeur].position}%" title="${NOM[fantome]}">${NOM[fantome][0]}</span>` : '';
  return `<span class="reglette-piste v62-piste" style="--piste:${PISTES[grandeur](profil)}"><input type="range" class="reglette-curseur v62-curseur" min="0" max="100" value="${v.position}" aria-label="${LIBELLES[grandeur]} de ${NOM[profil]}">${autre}</span>`;
};
const champ = (grandeur, profil) => `<input type="text" class="input champ-nombre v62-champ" value="${esc(valeurs(profil)[grandeur].champ)}" aria-label="${LIBELLES[grandeur]} de ${NOM[profil]}">`;
const absolu = (grandeur, profil) => (valeurs(profil)[grandeur].absolu ? `<span class="ligne-secondaire v62-absolu">${valeurs(profil)[grandeur].absolu}</span>` : '<span class="v62-absolu"></span>');
const retablir = '<button type="button" class="bouton-discret v62-retablir">Rétablir</button>';
const segments = (choisi) => `<div class="v62-cible"><span class="field-label">Régler</span><div class="bascule bascule-de-base" role="group" aria-label="Profil à régler">${['vivid', 'soft', 'deux'].map((c) => `<button type="button" class="bascule-option" aria-pressed="${c === choisi}">${c === 'deux' ? 'Les deux' : `${NOM[c]}${c === PORTEUR ? ' ◆' : ''}`}</button>`).join('')}</div></div>`;

const AVERTISSEMENTS = {
  a: `◆ ${NOM[PORTEUR]} porte votre couleur de référence : la teinte et la luminosité la déplacent aussi.`,
  b: `Ces réglages modifient votre couleur de référence, portée par ${NOM[PORTEUR]}.`,
  c: `◆ Référence dans ${NOM[PORTEUR]}. La teinte et la luminosité la modifient ; « Revenir à l’originale » la rend.`,
};
const avertissement = (texte) => `<p class="v62-avertissement">${esc(texte)}</p>`;

/** Forme A : la cible en segments, puis trois curseurs, le repère de l'autre profil sur chaque piste. */
function formeA({ choisi = AUTRE, texteAvertissement = null, apresGeste = null, rotation = 0 } = {}) {
  const profil = choisi === 'deux' ? PORTEUR : choisi;
  const autre = profil === 'soft' ? 'vivid' : 'soft';
  // Une rotation de la référence se lit dans la teinte : son écart à l'originale, sa valeur et sa place sur la piste.
  const tournee = (html) => (rotation === 0 ? html : html
    .replace(`value="${surTeinte(0)}"`, `value="${surTeinte(rotation)}"`)
    .replace(/value="[^"]*°"/, `value="${degres(rotation)}"`)
    .replace(/>\d+°</, `>${Math.round(PIVOT.H + rotation) % 360}°<`));
  const rangees = GRANDEURS.map((g) => {
    const rangee = `<div class="v62-reglage"><span class="field-label">${LIBELLES[g]}</span>${curseur(g, profil, { fantome: choisi === 'deux' ? null : autre })}${champ(g, profil)}${absolu(g, profil)}${retablir}</div>`;
    return `${g === 'teinte' ? tournee(rangee) : rangee}${g === 'teinte' && apresGeste ? apresGeste : ''}`;
  }).join('');
  return `<div class="v62-carte v62-a">${segments(choisi)}${texteAvertissement ? avertissement(texteAvertissement) : ''}${rangees}<p class="ligne-secondaire v62-pied">Saturation : ${pourcent(PARTS.soft)} et ${pourcent(PARTS.vivid)}, réglages communs. La dérive de teinte s’applique ensuite.</p></div>`;
}

/** Forme B : deux colonnes, Soft et Vivid, et une case qui les lie. */
function formeB() {
  const colonne = (profil) => `<div class="v62-colonne"><p class="v62-colonne-titre">${NOM[profil]}${profil === PORTEUR ? ' ◆' : ''}</p>${GRANDEURS.map((g) => `<div class="v62-reglage-b"><span class="field-label">${LIBELLES[g]}</span><div class="v62-ligne-b">${curseur(g, profil)}${champ(g, profil)}</div></div>`).join('')}</div>`;
  return `<div class="v62-carte v62-b"><label class="champ-ligne"><input type="checkbox" class="case-a-cocher"><span>Régler Soft et Vivid ensemble</span></label><div class="v62-colonnes">${colonne('soft')}${colonne('vivid')}</div><p class="ligne-secondaire v62-pied">La dérive de teinte s’applique ensuite.</p></div>`;
}

/** Forme C : une piste par grandeur, deux poignées lettrées, S et V. */
function formeC() {
  const rangee = (g) => {
    const [s, v] = [valeurs('soft')[g], valeurs('vivid')[g]];
    return `<div class="v62-reglage v62-reglage-c"><span class="field-label">${LIBELLES[g]}</span><span class="reglette-piste v62-piste v62-piste-c" style="--piste:${PISTES[g](PORTEUR)}"><span class="v62-poignee" data-profil="soft" style="left:${s.position}%">S</span><span class="v62-poignee" data-profil="vivid" style="left:${v.position}%">V</span></span><span class="v62-deux-champs"><input type="text" class="input champ-nombre v62-champ" value="${esc(s.champ)}" aria-label="${LIBELLES[g]} de Soft"><input type="text" class="input champ-nombre v62-champ" value="${esc(v.champ)}" aria-label="${LIBELLES[g]} de Vivid"></span></div>`;
  };
  return `<div class="v62-carte v62-c"><label class="champ-ligne"><input type="checkbox" class="case-a-cocher"><span>Déplacer Soft et Vivid ensemble</span></label>${GRANDEURS.map(rangee).join('')}<p class="ligne-secondaire v62-pied">S : Soft, V : Vivid ◆. La dérive de teinte s’applique ensuite.</p></div>`;
}

/** Palette à une intensité : ni segments ni repère, l'avertissement toujours visible. */
function formeUne(texte) {
  // La rampe unique prend la part de la référence ([ENT-14]), pas celle de Vivid.
  const part = partDeChroma(lireHexa(BLEU.reference), GAMUT);
  const saturation = (html) => html
    .replace(`value="${PARTS[PORTEUR] * 100}"`, `value="${part * 100}"`)
    .replace(`value="${pourcent(PARTS[PORTEUR])}"`, `value="${pourcent(part)}"`);
  const rangees = GRANDEURS.map((g) => {
    const rangee = `<div class="v62-reglage"><span class="field-label">${LIBELLES[g]}</span>${curseur(g, PORTEUR)}${champ(g, PORTEUR)}${absolu(g, PORTEUR)}${retablir}</div>`;
    return g === 'saturation' ? saturation(rangee) : rangee;
  }).join('');
  return `<div class="v62-carte v62-a">${avertissement(texte)}${rangees}<p class="ligne-secondaire v62-pied">La dérive de teinte s’applique ensuite.</p></div>`;
}

const RESUMES = {
  exemple: `Soft ${degres(EXEMPLE.ecart)} · saturation ${pourcent(PARTS.soft)} et ${pourcent(PARTS.vivid)}`,
  une: 'Référence d’origine',
};

/* Le navigateur */

const CSS_V62 = `
.v62-carte { display: grid; gap: var(--espace-serre); }
.v62-cible .bascule { flex: none; }
.v62-cible .bascule-option { white-space: nowrap; }
.v62-cible { display: flex; align-items: center; gap: var(--espace-controle); margin-bottom: 4px; }
.v62-cible .field-label, .v62-reglage .field-label { width: 72px; flex-shrink: 0; }
.v62-reglage { display: flex; align-items: center; gap: var(--espace-controle); min-height: 28px; }
.v62-piste { height: 22px; }
.v62-piste::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 8px; transform: translateY(-50%); border-radius: 4px; background: var(--piste); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12); }
.v62-curseur { position: relative; -webkit-appearance: none; appearance: none; background: transparent; height: 22px; }
.v62-curseur::-webkit-slider-runnable-track { height: 22px; background: transparent; }
.v62-curseur::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; margin-top: 4px; border-radius: 50%; background: #fff; border: 2px solid #1e1e1e; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6); }
.v62-fantome { position: absolute; top: -3px; transform: translateX(-50%); font-size: 9px; line-height: 1; color: var(--texte-second); pointer-events: none; }
.v62-fantome::after { content: ''; position: absolute; left: 50%; top: 10px; width: 2px; height: 10px; margin-left: -1px; background: var(--texte-second); opacity: 0.8; }
.v62-champ { flex: 0 0 56px; width: 56px; text-align: right; font-variant-numeric: tabular-nums; }
.v62-absolu { flex: 0 0 36px; width: 36px; font-variant-numeric: tabular-nums; }
.v62-retablir { flex-shrink: 0; }
.v62-pied { margin: 4px 0 0; }
.v62-avertissement { margin: 0 0 4px; padding: 6px var(--espace-controle); border-left: 2px solid var(--texte-avertissement); background: var(--fond-avertissement); color: var(--texte); border-radius: 0 var(--rayon) var(--rayon) 0; }
.v62-apres { margin: -2px 0 2px 80px; }
.v62-apres .v62-code { font-family: var(--police-code, monospace); }
.v62-colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: var(--espace-bloc); }
.v62-colonne { display: grid; gap: var(--espace-serre); align-content: start; }
.v62-colonne-titre { margin: 0; font-weight: 600; }
.v62-reglage-b { display: grid; gap: 2px; }
.v62-ligne-b { display: flex; gap: var(--espace-controle); align-items: center; }
.v62-piste-c { height: 26px; }
.v62-poignee { position: absolute; top: 50%; width: 16px; height: 16px; transform: translate(-50%, -50%); border-radius: 50%; background: #fff; color: #1e1e1e; border: 1.5px solid #1e1e1e; font-size: 9px; font-weight: 600; line-height: 13px; text-align: center; }
.v62-poignee[data-profil='soft'] { transform: translate(-50%, -85%); }
.v62-poignee[data-profil='vivid'] { transform: translate(-50%, -15%); }
.v62-deux-champs { display: flex; gap: 4px; }
.v62-deux-champs .v62-champ { flex-basis: 50px; width: 50px; }
.v62-titre-seul { padding: 8px 12px; }
.v62-phrase { margin: 0; padding: var(--espace-controle); border-radius: var(--rayon); background: var(--fond-note); color: var(--texte); }
.v62-modale { display: grid; gap: var(--espace-controle); width: 520px; max-width: calc(100vw - 32px); margin: 16px; padding: var(--espace-bloc) 16px 16px; border: 1px solid var(--bordure); border-radius: 8px; background: var(--fond); }
.v62-modale h2 { margin: 0; font-size: var(--libelle); font-weight: 600; }
.v62-ligne-danger { margin: 0; color: var(--texte-danger); }
`;

const OUTILS = String.raw`window.M = {
  html(texte) { const t = document.createElement('template'); t.innerHTML = texte.trim(); return t.content.firstElementChild; },
  seul(selecteurs) {
    const cibles = selecteurs.flatMap((s) => [...document.querySelectorAll(s)]);
    const gardes = new Set();
    for (const c of cibles) for (let e = c; e && e !== document.documentElement; e = e.parentElement) gardes.add(e);
    for (const e of gardes) {
      if (!e.parentElement || cibles.some((c) => c !== e && c.contains(e))) continue;
      for (const frere of e.parentElement.children) if (!gardes.has(frere) && frere.tagName !== 'SCRIPT' && frere.tagName !== 'STYLE') frere.style.display = 'none';
    }
  },
  bas(selecteurs) {
    let bas = 0;
    for (const c of selecteurs.flatMap((s) => [...document.querySelectorAll(s)])) for (const e of [c, ...c.querySelectorAll('*')]) {
      if (e.offsetParent === null && getComputedStyle(e).position !== 'fixed') continue;
      bas = Math.max(bas, e.getBoundingClientRect().bottom + window.scrollY);
    }
    return Math.ceil(bas);
  },
  figer() {
    for (const s of document.querySelectorAll('body script')) s.remove();
    for (const e of document.querySelectorAll('body [style*="display: none"]')) e.remove();
    for (const i of document.querySelectorAll('input')) i.setAttribute('value', i.value);
    document.activeElement?.blur?.();
    return { classe: document.documentElement.className, corpsClasse: document.body.className, corps: document.body.innerHTML };
  },
};`;

/**
 * Pose la carte proposée à la place de la carte « Intensités », dépliée, sous
 * son nouveau titre ; une palette à une intensité, qui n'a pas de carte, la
 * reçoit avant la Dérive de teinte. Rend la hauteur de la carte.
 */
function poserLaCarte({ titre, resume, corps, ouverte = true }) {
  let carte = document.querySelector('section[aria-label="Intensités"]');
  if (!carte) {
    carte = M.html('<section class="carte" data-ouverte="false"><button type="button" class="carte-tete carte-bascule" aria-expanded="false"><span class="carte-chevron" aria-hidden="true"></span><h3 class="carte-titre"></h3><span class="carte-resume"></span></button><div class="carte-corps" hidden><div class="intensites"></div></div></section>');
    const derive = document.querySelector('section[aria-label="Dérive de teinte"]');
    derive.parentElement.insertBefore(carte, derive);
  }
  carte.hidden = false;
  carte.setAttribute('aria-label', titre);
  carte.querySelector('.carte-titre').textContent = titre;
  carte.querySelector('.carte-resume').textContent = resume;
  carte.dataset.ouverte = String(ouverte);
  carte.querySelector('.carte-bascule').setAttribute('aria-expanded', String(ouverte));
  const contenu = carte.querySelector('.carte-corps');
  contenu.hidden = !ouverte;
  contenu.replaceChildren(M.html(corps));
  carte.classList.add('v62-cible-de-l-ecran');
  return { carte: Math.round(carte.getBoundingClientRect().height) };
}

/** Un cadre nu, peint comme le panneau, qui ne porte que `corps`. */
function poserSeul({ corps }) {
  const app = document.querySelector('#app');
  app.replaceChildren(M.html(`<div class="v62-seul">${corps}</div>`));
  return {};
}

const navigateur = await chromium.launch();
let CSS_DU_PLUGIN = '';
const ECRANS = [];

async function ecran(id, { etat = 'palette-deux-intensites', largeur = 770, hauteur = 720, messages = [], transformer = poserLaCarte, args = {}, montrer = ['.v62-cible-de-l-ecran'] }) {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur } });
  await page.goto(`file:///${path.join(GALERIE, `${etat}.html`).replace(/\\/g, '/')}`);
  await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  if (!CSS_DU_PLUGIN) CSS_DU_PLUGIN = await page.evaluate(() => [...document.head.querySelectorAll('style')].map((s) => s.textContent).join('\n'));
  for (const message of messages) {
    await page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), message);
    await page.waitForTimeout(120);
  }
  await page.addScriptTag({ content: OUTILS });
  await page.addStyleTag({ content: CSS_V62 });
  const mesures = (await page.evaluate(transformer, args)) ?? {};
  await page.evaluate((s) => M.seul(s), montrer);
  const bas = (await page.evaluate((s) => M.bas(s), montrer)) + 16;
  const fige = await page.evaluate(() => M.figer());
  await page.close();
  ECRANS.push({ id, largeur, hauteur: bas, ...fige });
  return { html: `<iframe class="plugin" data-ecran="${id}" style="width:${largeur}px;height:${bas}px" scrolling="no" title="${esc(id)}"></iframe>`, mesures };
}

const TITRE = 'Teinte, saturation, luminosité';
const carte = (corps, { titre = TITRE, resume = RESUMES.exemple, ouverte = true } = {}) => ({ titre, resume, corps, ouverte });
const AVEC_L_APERCU = ['.nuancier-surface', '.v62-cible-de-l-ecran'];

/* Question 1 : le nom */

const NOMS = [
  ['a', 'Teinte, saturation, luminosité', 'Hue, saturation, lightness'],
  ['b', 'Réglages de Soft et Vivid', 'Soft and Vivid adjustments'],
  ['c', 'Couleur des intensités', 'Intensity color'],
  ['d', 'Affiner la palette', 'Fine-tune palette'],
  ['e', 'Teinte et saturation', 'Hue and saturation'],
];
const q1 = [];
for (const [lettre, fr] of NOMS) q1.push({ lettre, ...(await ecran(`q1-${lettre}`, { args: carte('<div></div>', { titre: fr, ouverte: false }) })) });

/* Question 2 : la disposition, à 770 puis 500 px */

const q2 = {
  A: await ecran('q2-A', { args: carte(formeA()), montrer: AVEC_L_APERCU }),
  B: await ecran('q2-B', { args: carte(formeB()) }),
  C: await ecran('q2-C', { args: carte(formeC()) }),
  A5: await ecran('q2-A-500', { largeur: 500, hauteur: 520, args: carte(formeA()) }),
  B5: await ecran('q2-B-500', { largeur: 500, hauteur: 520, args: carte(formeB()) }),
  C5: await ecran('q2-C-500', { largeur: 500, hauteur: 520, args: carte(formeC()) }),
};

/* Question 3 : l'avertissement */

const LIEN_APRES = `<p class="ligne-secondaire v62-apres">Référence : <span class="v62-code">${BLEU.reference}</span> → <span class="v62-code">${TOURNEE}</span> · <button type="button" class="lien-de-constat">Revenir à l’originale</button></p>`;
const RECETTE_TOURNEE = { ...RECETTE, palettes: [BLEU_TOURNE] };
const q3 = {
  W1: await ecran('q3-W1', { args: carte(formeA({ choisi: PORTEUR, texteAvertissement: AVERTISSEMENTS.a })) }),
  W2: await ecran('q3-W2', { messages: [etatDe(RECETTE_TOURNEE, 1)], args: carte(formeA({ choisi: 'deux', apresGeste: LIEN_APRES, rotation: ROTATION }), { resume: `Référence ${degres(ROTATION)} · Soft ${degres(EXEMPLE.ecart)}` }), montrer: AVEC_L_APERCU }),
  W3: await ecran('q3-W3', { messages: [etatDe(RECETTE_TOURNEE, 1)], transformer: () => ({}), montrer: ['[aria-label="Configuration de la palette"]'] }),
  a: await ecran('q3-a', { transformer: poserSeul, args: { corps: avertissement(AVERTISSEMENTS.a) }, montrer: ['.v62-seul'] }),
  b: await ecran('q3-b', { transformer: poserSeul, args: { corps: avertissement(AVERTISSEMENTS.b) }, montrer: ['.v62-seul'] }),
  c: await ecran('q3-c', { transformer: poserSeul, args: { corps: avertissement(AVERTISSEMENTS.c) }, montrer: ['.v62-seul'] }),
};

/* Question 4 : une intensité */

const q4 = {
  U: await ecran('q4-U', { etat: 'palette-une-intensite', args: carte(formeUne('Ces réglages modifient votre couleur de référence : « Revenir à l’originale » la rend.'), { resume: RESUMES.une }), montrer: AVEC_L_APERCU }),
  U5: await ecran('q4-U-500', { etat: 'palette-une-intensite', largeur: 500, hauteur: 520, args: carte(formeUne('Ces réglages modifient votre couleur de référence : « Revenir à l’originale » la rend.'), { resume: RESUMES.une }) }),
};

/* Z5.2 : la phrase à deux thèmes, dans la modale */

const modale = (phrase) => `<div class="v62-modale"><h2>Ajuster la référence</h2><p class="v62-phrase">${esc(phrase)}</p></div>`;
const z52 = {};
for (const lettre of ['a', 'b', 'c']) z52[lettre] = await ecran(`z52-${lettre}`, { transformer: poserSeul, args: { corps: modale(PHRASES_Z52[lettre]) }, montrer: ['.v62-seul'] });

await navigateur.close();

/* La page */

function blocDeQuestion(numero, titre, explication, ecrans, choix) {
  return `<div class="qbloc"><div class="qtete"><span class="qnum">${numero}</span><h3>${titre}</h3></div>${explication ? `<p>${explication}</p>` : ''}${ecrans ? `<div class="scene"><div class="scene-rangee">${ecrans}</div></div>` : ''}${choix ? `<div class="qchoix">${choix}</div>` : ''}</div>`;
}
const vue = (contenu, lettre, legende) => `<div class="qecran">${lettre ? `<span class="qlettre">${lettre}</span>` : ''}${contenu}<p class="legende">${legende}</p></div>`;
const reco = (texte = 'Recommandé.') => `<span class="reco">${texte}</span>`;
const hauteur = (e) => `carte dépliée : ${e.mesures.carte} px`;

const sectionQ = `<section class="bloc" id="z10-4">
  <div class="tete"><span class="sur">Z10.4 · Refonte des intensités</span><h2>Teinte, saturation et luminosité, par profil</h2></div>
  <p>Bleu, ${BLEU.reference}, deux intensités, ◆ dans ${NOM[PORTEUR]}. Exemple réglé : Soft décalée de ${degres(EXEMPLE.ecart)}. Le modèle vient de la <a href="./RECHERCHE-REFONTE-INTENSITES.md">recherche</a> : régler le profil qui porte la référence la déplace, comme « Ajuster la référence » ; régler l’autre ne la touche pas. La saturation est l’intensité d’aujourd’hui, en pour cent.</p>
  ${blocDeQuestion('Question 1', 'Le nom de la carte',
    'La carte repliée, en français ; l’anglais dans les choix.',
    q1.map((e) => vue(e.html, e.lettre, '')).join(''),
    `<ol type="a">${NOMS.map(([lettre, fr, en]) => `<li>« ${fr} » · “${en}”${lettre === 'a' ? ` ${reco('Recommandé : il nomme les trois curseurs, comme « Dérive de teinte » nomme le sien.')}` : ''}${lettre === 'e' ? ' : si la luminosité reste à « Ajuster la référence » (question 6).' : ''}</li>`).join('')}</ol>`)}
  ${blocDeQuestion('Question 2', 'La disposition',
    'Chaque piste est peinte par le moteur. Flèches : 1°, 1 %, 0,005 ; Maj : 5°, 5 %, 0,02. Double-clic sur une poignée ou « Rétablir » : la valeur de départ.',
    [
      vue(q2.A.html, 'A', `Segments, puis trois curseurs ; la lettre au-dessus d’une piste situe l’autre profil. ${hauteur(q2.A)}.`),
      vue(q2.B.html, 'B', `Deux colonnes et une case qui les lie. ${hauteur(q2.B)}.`),
      vue(q2.C.html, 'C', `Une piste à deux poignées par grandeur. ${hauteur(q2.C)}.`),
      vue(q2.A5.html, 'A', `À 500 px : ${hauteur(q2.A5)}.`),
      vue(q2.B5.html, 'B', `À 500 px : ${hauteur(q2.B5)}.`),
      vue(q2.C5.html, 'C', `À 500 px : ${hauteur(q2.C5)}.`),
    ].join(''),
    `<ol><li><b>A</b> ${reco()} Le geste du retour : choisir Vivid, Soft ou les deux, puis régler. La valeur absolue de la teinte suit le champ. Repliée : « ${esc(RESUMES.exemple)} ».</li><li><b>B</b> montre tout d’un coup, mais les pistes n’ont plus que la moitié de la largeur, et « ensemble » se cache dans une case.</li><li><b>C</b> montre l’écart entre les profils sur la piste même. Deux poignées confondues à 0° se superposent, et chaque piste a deux champs.</li></ol>`)}
  ${blocDeQuestion('Question 3', 'L’avertissement quand la référence bouge',
    `W1 avant le geste, dès que ${NOM[PORTEUR]} ou « Les deux » est choisi. W2 pendant et après, sous le curseur. W3 existe déjà : la ligne sous le code, après un geste (ici teinte ${degres(ROTATION)}, ${BLEU.reference} → ${TOURNEE}).`,
    [
      vue(q3.W1.html, 'W1', 'Avant le geste.'),
      vue(q3.W2.html, 'W2', `« Les deux » pressé, la teinte glissée de ${degres(ROTATION)} : l’aperçu est réel, sa dérive Tailwind recalculée (question 6).`),
      vue(q3.W3.html, 'W3', 'La configuration, réelle, après le même geste.'),
    ].join(''),
    `<p>Moment : <b>W1 et W3</b> ${reco()} Le designer le sait avant le geste, et W3 garde « Revenir à l’originale ». W2 répète W3 plus bas.</p>`)}
  ${blocDeQuestion('Question 3 bis', 'La rédaction de W1',
    '',
    [vue(q3.a.html, 'a', ''), vue(q3.b.html, 'b', ''), vue(q3.c.html, 'c', '')].join(''),
    `<ol type="a"><li>${esc(AVERTISSEMENTS.a)} ${reco()}</li><li>${esc(AVERTISSEMENTS.b)}</li><li>${esc(AVERTISSEMENTS.c)}</li></ol>`)}
  ${blocDeQuestion('Question 4', 'Une palette à une intensité (Q6.9)',
    'Elle a la carte, sans segments. La teinte et la luminosité déplacent la rampe et la référence, comme pour le profil porteur ; la saturation est celle de la référence, qu’elle récrit. L’avertissement reste affiché.',
    [vue(q4.U.html, 'U', `${hauteur(q4.U)}.`), vue(q4.U5.html, 'U', `À 500 px : ${hauteur(q4.U5)}.`)].join(''),
    `<ol><li><b>Oui</b> ${reco()} C’est là qu’affiner la référence sert le plus.</li><li><b>Non</b> : la palette garde « Ajuster la référence » seul.</li></ol>`)}
  ${blocDeQuestion('Question 5', '« Ajuster la référence » et « Revenir à l’originale »',
    `Dans la carte, la luminosité de ${NOM[PORTEUR]} déplace toute sa rampe, la référence avec elle : le ◆ garde sa nuance. Aujourd’hui, « Ajuster la référence » déplace la référence seule, et le ◆ peut changer de nuance. Garder les deux ferait deux luminosités.`,
    '',
    `<ol><li><b>R1</b> ${reco()} Un seul réglage : la modale « Ajuster la référence » propose la luminosité de ${NOM[PORTEUR]} qui répare la garantie, et « Appliquer » la pose dans la carte. Sur Vert, −0,02 répare ses deux garanties. « Revenir à l’originale » remet à zéro la teinte et la luminosité de ${NOM[PORTEUR]} ; ${NOM[AUTRE]} garde sa couleur.</li><li><b>R2</b> Deux réglages : la modale garde la référence seule, en plus de la carte. « Revenir à l’originale » défait les deux.</li></ol>`)}
  ${blocDeQuestion('Question 6', 'Trois points du modèle',
    '',
    '',
    `<ol><li><b>Bornes de la luminosité.</b> Mesurées sur cinq couleurs, la référence déplacée avec sa rampe. À +0,05, la nuance 50 devient blanche et se confond avec la 100, sur les cinq ; Vert et Sauge perdent des garanties. Jusqu’à +0,02, aucune nuance ne se confond ; Vert perd quatre garanties à +0,02 et répare les deux siennes à −0,02. De −0,05 à 0, aucune garantie perdue. <b>De −0,05 à +0,02</b> ${reco()} Ou ±0,02.</li><li><b>La dérive Tailwind pendant le geste.</b> Tourner la référence recalcule aujourd’hui la dérive, comme un code saisi : Bleu à +10° passe de ${angles(DERIVE_BLEU.avant)} à ${angles(DERIVE_BLEU.apres)} (clair / sombre), Jaune ${'#FACC15'} à −10° de ${angles(DERIVE_JAUNE.avant)} à ${angles(DERIVE_JAUNE.apres)}. Les poignées de ${NOM[AUTRE]} sauteraient alors en plein geste. <b>Calculée sur l’originale</b> ${reco()} La dérive ne bouge pas pendant les réglages de la carte ; un code saisi la recalcule, comme aujourd’hui. Ou recalculée à chaque geste.</li><li><b>Le profil qui porte la référence.</b> En Auto, il se choisit par la saturation de la référence, que la teinte et la luminosité changent. Sur une grille de 1 080 couleurs, une rotation de 10° le fait changer pour 189 d’entre elles, 30° pour 294 ; les deux profils tournent alors de l’écart. <b>Figé dès le premier réglage de la carte</b> ${reco()} « Auto a choisi ${NOM[PORTEUR]} » devient « Référence dans ${NOM[PORTEUR]}, fixée par les réglages ». Choisir l’autre profil sous « Référence exacte dans » le dit avant d’agir.</li></ol>`)}
</section>`;

const sectionZ52 = `<section class="bloc" id="z5-2">
  <div class="tete"><span class="sur">Z5.2 · Ajuster la référence</span><h2>La phrase quand les deux thèmes manquent</h2></div>
  <p>Avec la recette par défaut, aucune couleur ne manque de garantie dans les deux thèmes : 10 000 essayées. Le cas naît d’un minimum relevé dans les Réglages communs, ici « Éléments visibles » à ${virgule(SEUIL_Z52, 1)}:1. ${Z52.hexa}, trouvée par le moteur : ◆ dans ${NOM[Z52.ancrage.profil]}, ${CRANS.light} en Light, ${CRANS.dark} en Dark. Sous le code : « ${esc(LIGNE_Z52)} ». La phrase b validée ne couvre qu’un thème.</p>
  ${blocDeQuestion('Question 1', 'La rédaction',
    'En tête de la modale, au-dessus des témoins.',
    ['a', 'b', 'c'].map((l) => vue(z52[l].html, l, '')).join(''),
    `<ol type="a"><li>La phrase b répétée, une par thème.</li><li>Un sens par thème, les rôles et les ratios dans le tableau dessous.</li><li>Les rôles et les ratios, les minimums à la fin. ${reco()} Plus courte que a, et le tableau garde le détail des états.</li></ol>`)}
</section>`;

const lireStyle = (fichier) => /<style>([\s\S]*?)<\/style>/.exec(fs.readFileSync(path.join(ICI, fichier), 'utf8'))[1];
const STYLE = `${lireStyle('MAQUETTES-RECETTE-V5.html')}
main { max-width: 1840px; }
iframe.plugin { display: block; border: 1px solid var(--filet); border-radius: 8px; background: #2c2c2c; }
.qbloc .scene-rangee { align-items: flex-start; }
.qecran { max-width: 100%; }
.qecran .legende { max-width: 770px; }
`;

const modeles = ECRANS.map((e) => `<template id="${e.id}" data-classe="${esc(e.classe)}" data-corps-classe="${esc(e.corpsClasse)}">${e.corps}</template>`).join('\n');
const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maquettes Z10 et Z5.2</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap">
<style>
${STYLE}</style>
</head>
<body>
<main>
<section class="intro">
  <span class="sur">UCM Palettes · plan d’ergonomie, sixième tour · lots Z10 et Z5.2</span>
  <h1>Maquettes à valider</h1>
  <p>La carte « Intensités » refaite, puis la phrase de la modale quand les deux thèmes manquent. Chaque écran est l’interface réelle, tirée de la galerie au thème sombre de Figma, puis la carte proposée posée à sa place. Couleurs, pistes et ratios : le moteur.</p>
  <p class="note">Page écrite par <code>generer-maquettes-v6-2.mjs</code>, après <code>npm run galerie --workspace ucm-palettes-plugin</code>. Mesures : <code>mesurer-refonte-intensites.mjs</code>.</p>
  <nav class="sommaire"><a href="#z10-4">Z10.4 Refonte des intensités</a><a href="#z5-2">Z5.2 Phrase à deux thèmes</a></nav>
</section>
${sectionQ}
${sectionZ52}
</main>
<script type="text/plain" id="css-plugin">${CSS_DU_PLUGIN}\n${CSS_V62}</script>
${modeles}
<script>
  const css = document.getElementById('css-plugin').textContent;
  const police = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">';
  for (const cadre of document.querySelectorAll('iframe[data-ecran]')) {
    const modele = document.getElementById(cadre.dataset.ecran);
    cadre.srcdoc = '<!doctype html><html lang="fr" class="' + modele.dataset.classe + '"><head><meta charset="utf-8">' + police + '<style>' + css + '</style></head><body class="' + modele.dataset.corpsClasse + '">' + modele.innerHTML + '</body></html>';
  }
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ICI, 'MAQUETTES-RECETTE-V6-2.html'), page);
process.stdout.write(`MAQUETTES-RECETTE-V6-2.html : ${page.length} caractères, ${ECRANS.length} écrans\n`);
process.stdout.write(`Porteur ${PORTEUR}, parts ${JSON.stringify(PARTS)}, part de la référence ${partDeChroma(lireHexa(BLEU.reference)).toFixed(3)}, tournée ${TOURNEE}\n`);
process.stdout.write(`Z5.2 : ${Z52.hexa}, ${JSON.stringify(CRANS)}, ${LIGNE_Z52}\n  a : ${PHRASES_Z52.a}\n  b : ${PHRASES_Z52.b}\n  c : ${PHRASES_Z52.c}\n`);
process.stdout.write(`Hauteurs : ${JSON.stringify(Object.fromEntries(Object.entries({ ...q2, ...q4 }).map(([k, v]) => [k, v.mesures.carte])))}\n`);
