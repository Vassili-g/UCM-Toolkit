#!/usr/bin/env node
/**
 * Écrit MAQUETTES-PROPOSITION-INITIALE.html à côté de ce script :
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/01 Proposition initiale/generer-maquettes-proposition-initiale.mjs"
 *
 * Chaque couleur des maquettes sort du moteur : `nouvellePalette` dans la
 * recette par défaut, puis `rampesDe` et `ancrageDe`. La vision simulée reprend
 * les matrices de `mesurer-vision-simulee.mjs`, et les distances sont celles de
 * l'alerte « Palettes proches ».
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ancrageDe,
  contraste,
  distanceOk,
  ecrireHexa,
  lineaireVersRgb8,
  lireHexa,
  rampesDe,
  recetteParDefaut,
  rgb8VersLineaire,
} from '../../../../../../packages/couleur/src/index.ts';
import { nouvellePalette } from '../../../../../../packages/plugin-palettes/src/edition.ts';

const ICI = dirname(fileURLToPath(import.meta.url));
const R = recetteParDefaut();
const CRANS = R.crans;
const FONDS = { light: R.fonds.light, dark: R.fonds.dark };

// ---------------------------------------------------------------- vision
const PROTAN = [0.11238, 0.88762, 0.0, 0.11238, 0.88762, 0.0, 0.00401, -0.00401, 1.0];
const DEUTAN = [0.29275, 0.70725, 0.0, 0.29275, 0.70725, 0.0, -0.02234, 0.02234, 1.0];
const TRITAN_1 = [1.01277, 0.13548, -0.14826, -0.01243, 0.86812, 0.14431, 0.07589, 0.805, 0.11911];
const TRITAN_2 = [0.93678, 0.18979, -0.12657, 0.06154, 0.81526, 0.1232, -0.37562, 1.12767, 0.24796];
const TRITAN_PLAN = [0.0345, -0.02354, -0.01096];
const appliquer = (m, [r, g, b]) => [m[0] * r + m[1] * g + m[2] * b, m[3] * r + m[4] * g + m[5] * b, m[6] * r + m[7] * g + m[8] * b];
const borner = (t) => t.map((x) => Math.min(1, Math.max(0, x)));
const VISIONS = {
  normale: (rgb) => rgb,
  protanopie: (rgb) => lineaireVersRgb8(borner(appliquer(PROTAN, rgb8VersLineaire(rgb)))),
  deuteranopie: (rgb) => lineaireVersRgb8(borner(appliquer(DEUTAN, rgb8VersLineaire(rgb)))),
  tritanopie: (rgb) => {
    const lin = rgb8VersLineaire(rgb);
    const cote = lin[0] * TRITAN_PLAN[0] + lin[1] * TRITAN_PLAN[1] + lin[2] * TRITAN_PLAN[2];
    return lineaireVersRgb8(borner(appliquer(cote >= 0 ? TRITAN_1 : TRITAN_2, lin)));
  },
};
const voir = (vision, hexa) => ecrireHexa(VISIONS[vision](lireHexa(hexa)));

// ---------------------------------------------------------------- palettes
/** Le système de démonstration : les palettes que les maquettes montrent. */
const SYSTEME = [
  { cle: 'neutral', nom: 'Neutre', hexa: '#808080', n: 1, role: 'neutre', famille: 'neutral' },
  { cle: 'danger', nom: 'Rouge', hexa: '#DC2626', n: 2, role: 'utilitaire', famille: 'danger' },
  { cle: 'warning', nom: 'Ambre', hexa: '#D97706', n: 2, role: 'utilitaire', famille: 'warning' },
  { cle: 'success', nom: 'Vert', hexa: '#16A34A', n: 2, role: 'utilitaire', famille: 'success' },
  { cle: 'info', nom: 'Azur', hexa: '#2563EB', n: 2, role: 'utilitaire', famille: 'info' },
  { cle: 'aPrimary', nom: 'Bleu A', hexa: '#1E6FD9', n: 1, role: 'marque', famille: 'primary', marque: 'Marque A' },
  { cle: 'aSecondary', nom: 'Orange A', hexa: '#E08A00', n: 1, role: 'marque', famille: 'secondary', marque: 'Marque A' },
  { cle: 'bPrimary', nom: 'Violet B', hexa: '#7A1FA2', n: 1, role: 'marque', famille: 'primary', marque: 'Marque B' },
  { cle: 'bSecondary', nom: 'Sarcelle B', hexa: '#00A389', n: 1, role: 'marque', famille: 'secondary', marque: 'Marque B' },
  { cle: 'essai', nom: 'Framboise', hexa: '#C2185B', n: 2, role: 'autre' },
];

const P = {};
SYSTEME.forEach((entree, i) => {
  const palette = nouvellePalette(R, `p-${String(i).padStart(8, '0')}`, entree.hexa, entree.n);
  const recette = { ...R, palettes: [palette] };
  const rampes = rampesDe(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  const parProfil = {};
  for (const [profil, parMode] of Object.entries(rampes)) {
    parProfil[profil] = { light: parMode.light.map((c) => ecrireHexa(c.couleur)), dark: parMode.dark.map((c) => ecrireHexa(c.couleur)) };
  }
  P[entree.cle] = { ...entree, rampes: parProfil, rangs: ancrage.rangs, porteur: entree.n === 1 ? 'unique' : ancrage.profil ?? 'vivid' };
});

const rang = (cran) => CRANS.indexOf(cran);
const virgule = (x, n = 2) => x.toFixed(n).replace('.', ',');
const ratio = (a, b) => contraste(lireHexa(a), lireHexa(b));
const encreSur = (hexa) => (ratio(hexa, '#000000') >= ratio(hexa, '#FFFFFF') ? '#111111' : '#FFFFFF');

/** Distance de l'alerte « Palettes proches » : ΔEok moyen des crans 500 à 700, Vivid, Thème Light. */
function distance(a, b, vision) {
  const somme = [500, 600, 700].reduce((total, cran) => total + distanceOk(
    VISIONS[vision](lireHexa(P[a].rampes.vivid.light[rang(cran)])),
    VISIONS[vision](lireHexa(P[b].rampes.vivid.light[rang(cran)])),
  ), 0);
  return somme / 3;
}

// Les retouches de la démonstration : trois crans de Rouge, Vivid, Thème Light,
// recollés dans Figma depuis les valeurs de Tailwind.
const RETOUCHES = { 700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D' };
const calculee = (cran) => P.danger.rampes.vivid.light[rang(cran)];

// ---------------------------------------------------------------- briques
const profils = (p) => (p.n === 1 ? ['unique'] : ['soft', 'vivid']);
const NOM_PROFIL = { soft: 'Soft', vivid: 'Vivid', unique: '' };

/** Une cellule de rampe ; `marque` ajoute ◆ ou ✎ ; `pointe` signale une retouche en attente. */
function cellule(hexa, { marque = '', pointe = false, h = 26, choisie = false } = {}) {
  const style = `background:${hexa};color:${encreSur(hexa)};height:${h}px`;
  return `<i class="sw${pointe ? ' pointe' : ''}${choisie ? ' choisie' : ''}" style="${style}">${marque}</i>`;
}

/** L'aperçu peint du fond du thème : numéros, rangées de profils, repère ◆. */
function nuancier(p, mode, { vision = 'normale', retouches = null, h = 26, numeros = true, choisie = null, etiquettes = true } = {}) {
  const fond = FONDS[mode];
  const encre = mode === 'light' ? '#1E1E1E' : '#EDEDED';
  const lignes = profils(p).map((profil) => {
    const cellules = p.rampes[profil][mode].map((hexa, i) => {
      const cran = CRANS[i];
      let valeur = hexa;
      let marque = profil === p.porteur && i === p.rangs[mode] ? '◆' : '';
      if (retouches && profil === 'vivid' && mode === 'light' && RETOUCHES[cran]) {
        valeur = retouches === 'gardees' ? RETOUCHES[cran] : hexa;
        marque = retouches === 'gardees' ? '✎' : marque;
      }
      return cellule(voir(vision, valeur), {
        marque,
        h,
        pointe: retouches === 'attente' && profil === 'vivid' && mode === 'light' && !!RETOUCHES[cran],
        choisie: choisie && choisie.profil === profil && choisie.cran === cran,
      });
    }).join('');
    return `${etiquettes ? `<span class="prof">${NOM_PROFIL[profil]}</span>` : ''}${cellules}`;
  }).join('');
  const tete = numeros ? `${etiquettes ? '<span></span>' : ''}${CRANS.map((c) => `<span class="num">${c}</span>`).join('')}` : '';
  return `<div class="surface" style="background:${fond};color:${encre}"><div class="grille${etiquettes ? '' : ' nue'}">${tete}${lignes}</div></div>`;
}

const pastille = (hexa) => `<i class="pastille" style="background:${hexa}"></i>`;
const code = (texte) => `<code class="c">${texte}</code>`;
const puce = (texte, sorte) => `<span class="etat-puce ${sorte}">${texte}</span>`;
const bouton = (texte, sorte = '') => `<span class="b ${sorte}">${texte}</span>`;
const segment = (valeurs, active, cls = '') => `<div class="segment ${cls}">${valeurs.map((v) => `<span${v === active ? ' class="on"' : ''}>${v}</span>`).join('')}</div>`;
const champ = (valeur, cls = '') => `<div class="champ ${cls}"><span class="coupe">${valeur}</span></div>`;
const liste = (valeur, cls = '') => `<div class="champ ${cls}"><span class="coupe">${valeur}</span><span class="fleche">▾</span></div>`;
const hexaChamp = (hexa) => `<div class="champ-ligne"><i class="pipette" style="background:${hexa}"></i>${champ(hexa, 'grand')}</div>`;
const repli = (titre, resume) => `<div class="accordeon"><span class="chevron">›</span><b>${titre}</b><span class="resume">${resume}</span></div>`;

function panneau({ largeur = 770, onglet = 'Création', corps, reglages = false, voile = '' }) {
  const tete = reglages
    ? `<div class="fp-haut"><span class="fp-titre">Réglages communs</span>${bouton('Retour aux palettes et à la planche')}</div>`
    : `<div class="fp-haut"><span class="fp-titre">UCM Palettes</span><span class="bouton-icone">⚙</span></div>
       <div class="fp-onglets"><span${onglet === 'Création' ? ' class="on"' : ''}>Création</span><span${onglet === 'Palettes' ? ' class="on"' : ''}>Palettes</span></div>`;
  return `<div class="fp" style="width:${largeur}px">${tete}<div class="fp-corps">${corps}</div>${voile}</div>`;
}

const barreSelecteur = (p) => `<div class="fp-select">${p
  ? `<div class="champ grand"><i class="rond" style="background:${p.hexa}"></i><span class="coupe"><b>${p.nom}</b></span><span class="fleche">▾</span></div>`
  : '<div class="champ grand"><span class="coupe sec">Sélectionner une palette</span><span class="fleche">▾</span></div>'}
  ${bouton('Nouvelle palette', 'principal grand')}${p ? '<span class="bouton-icone grand">⋯</span>' : ''}</div><div class="filet"></div>`;

const note = (texte) => `<span class="note-maquette">${texte}</span>`;

// ---------------------------------------------------------------- piste 1 : le rôle
const LIBELLES_ROLE = ['Marque', 'Utilitaire', 'Neutre', 'Autre'];

function suiteDuRole(role, p) {
  if (role === 'Marque') {
    return `<div class="deux-col">
        <div><span class="libelle">Marque</span>${liste(p.marque)}</div>
        <div><span class="libelle">Famille</span>${champ(p.famille)}<span class="aide petit">Proposées : primary · secondary</span></div>
      </div>
      <span class="aide">Une intensité, comme toute rampe de marque. Variables : ${code(`brand.palette.${p.famille}.{light,dark}.{50…950}`)} et ${code(`brand.identity.${p.famille}`)}, dans le mode « ${p.marque} ».</span>`;
  }
  if (role === 'Utilitaire') {
    return `<div class="deux-col">
        <div><span class="libelle">Famille</span>${champ(p.famille)}<span class="aide petit">Libres : warning · success · info</span></div>
        <div><span class="libelle">Référence exacte dans</span>${segment(['Auto', 'Soft', 'Vivid'], 'Auto')}<span class="aide petit">Auto choisira Vivid</span></div>
      </div>
      <span class="aide">Deux intensités, Soft et Vivid. Variables : ${code(`primitives.${p.famille}.{soft,vivid}.{light,dark}.{50…950}`)}, communes aux marques.</span>`;
  }
  if (role === 'Neutre') {
    return `<span class="aide">Une intensité, famille ${code('neutral')}. Variables : ${code('primitives.neutral.{light,dark}.{50…950}')}. Son cran 50 est le fond de page des deux thèmes.</span>`;
  }
  return `<div class="rangee"><span class="libelle">Modèle</span>${segment(['Standard', 'Libre'], 'Standard', 'court')}</div>
    <div class="choix-cartes">
      <div class="choix-carte on"><div class="choix-tete"><i class="radio on"></i><b>Une intensité</b></div><span class="aide">Une seule variante, à l'intensité de la couleur de référence.</span></div>
      <div class="choix-carte"><div class="choix-tete"><i class="radio"></i><b>Deux intensités</b></div><span class="aide">Une variante douce « Soft » et une variante vive « Vivid ».</span></div>
    </div>
    <span class="aide">Palette hors des variables : essai, illustration, données. Seule la planche la montre.</span>`;
}

function carteCreation(role, p, { selection = true } = {}) {
  return `<div class="carte">
    <div class="carte-titre">Nouvelle palette</div>
    <div class="deux-col">
      <div><span class="libelle">Nom de la palette</span>${champ(p.nom)}</div>
      <div><span class="libelle">Couleur de référence</span>${hexaChamp(p.hexa)}${selection ? '<span class="aide petit">Reprise de la sélection : « Charte / Bleu Marque A »</span>' : ''}</div>
    </div>
    <div class="rangee"><span class="libelle">Rôle dans le système</span>${segment(LIBELLES_ROLE, role, 'role')}</div>
    ${suiteDuRole(role, p)}
    <div class="apercu-mini">${nuancier(p, 'light', { h: 16, etiquettes: p.n === 2 })}</div>
    <div class="gestes">${bouton('Créer la palette', 'principal')}${bouton('Annuler')}</div>
  </div>`;
}

const ecranRole = panneau({
  corps: `${barreSelecteur(P.aSecondary)}${carteCreation('Marque', P.aPrimary)}
    <div class="titre-1">Palette Orange A</div>
    ${repli('Configuration de la palette', `Marque A · ${code('secondary')}`)}`,
});

function varianteRole(role, p) {
  return `<div class="vignette"><span class="vignette-titre">${role}</span>
    <div class="fp vignette-fp"><div class="fp-corps"><div class="carte">
      <div class="rangee"><span class="libelle">Rôle dans le système</span>${segment(LIBELLES_ROLE, role, 'role')}</div>
      ${suiteDuRole(role, p)}
    </div></div></div></div>`;
}

const selecteurOuvert = `<div class="fp" style="width:360px"><div class="fp-corps">
  <div class="menu-liste">
    <span class="groupe-liste">${code('primitives')}</span>
    ${['neutral', 'danger', 'warning', 'success', 'info'].map((k) => `<span class="entree-liste">${pastille(P[k].hexa)}${P[k].nom}<em>${P[k].famille}</em></span>`).join('')}
    <span class="groupe-liste">${code('brand')} · Marque A</span>
    ${['aPrimary', 'aSecondary'].map((k) => `<span class="entree-liste${k === 'aSecondary' ? ' on' : ''}">${pastille(P[k].hexa)}${P[k].nom}<em>${P[k].famille}</em></span>`).join('')}
    <span class="groupe-liste">${code('brand')} · Marque B</span>
    ${['bPrimary', 'bSecondary'].map((k) => `<span class="entree-liste">${pastille(P[k].hexa)}${P[k].nom}<em>${P[k].famille}</em></span>`).join('')}
    <span class="groupe-liste">Hors variables</span>
    <span class="entree-liste">${pastille(P.essai.hexa)}${P.essai.nom}</span>
  </div></div></div>`;

// ---------------------------------------------------------------- piste 2 : l'onglet Palettes
function fiche(p, { etat, sorte, detail, gestes, vision = 'normale', mode = 'light', retouches = null, garanties }) {
  const ref = p.n === 1 ? `◆ nuance ${CRANS[p.rangs[mode]]}` : `◆ ${p.porteur === 'soft' ? 'Soft' : 'Vivid'} · nuance ${CRANS[p.rangs[mode]]}`;
  const gar = garanties ?? (p.n === 1 ? 'Garanties ✓' : 'Soft ✓ · Vivid ✓');
  return `<div class="carte fiche">
    <div class="fiche-tete"><span><b class="fiche-nom">${p.nom}</b>${p.famille && p.role !== 'autre' ? ` ${code(p.famille)}` : ''}</span>${puce(etat, sorte)}</div>
    ${nuancier(p, mode, { vision, retouches, h: 14, numeros: false })}
    <div class="fiche-ligne"><span class="sec">${pastille(p.hexa)} ${p.hexa} ${ref}${detail ? ` · <span class="${sorte === 'attention' ? 'att-t' : ''}">${detail}</span>` : ''}</span><span class="sec">${gar}</span></div>
    ${gestes ? `<div class="gestes">${gestes}</div>` : ''}
  </div>`;
}

const groupe = (titre, resume, contenu, { ouvert = true } = {}) => `<div class="groupe">
  <div class="groupe-tete"><span class="chevron">${ouvert ? '⌄' : '›'}</span><b>${titre}</b><span class="resume">${resume}</span></div>
  ${ouvert ? `<div class="groupe-corps">${contenu}</div>` : ''}</div>`;

const enTetePalettes = (vision = 'Normale') => `<div class="tete-onglet"><b>10 palettes</b>
  <div class="onglets-theme"><span class="on">Thème Light</span><span>Thème Dark</span></div>
  <div class="vision"><span class="sec">Vision</span>${liste(vision, 'etroit')}</div>
  ${bouton('Actualiser')}</div>`;

const ecranPalettes = panneau({
  onglet: 'Palettes',
  corps: `${enTetePalettes()}
  ${groupe(`${code('primitives')} Neutre et utilitaires`, '5 palettes · 1 à actualiser', `
    ${fiche(P.neutral, { etat: 'À jour', sorte: 'ok', gestes: `${bouton('Afficher', 'compact')}${bouton('Modifier', 'compact')}` })}
    ${fiche(P.danger, { etat: 'Retouches (3)', sorte: 'attention', detail: 'Cadre à jour · 3 variables retouchées dans Figma', retouches: 'attente', gestes: `${bouton('Actualiser sur Figma', 'principal compact')}${bouton('Afficher', 'compact')}${bouton('Modifier', 'compact')}` })}
    ${note('Ambre, Vert et Azur suivent, à jour.')}`)}
  ${groupe(`${code('brand')} Marque A`, '2 palettes · 1 pas encore sur Figma', `
    ${fiche(P.aPrimary, { etat: 'Pas encore sur Figma', sorte: 'attention', detail: 'Cadre et 23 variables à créer', gestes: `${bouton('Générer sur Figma', 'principal compact')}${bouton('Modifier', 'compact')}` })}
    ${note('Orange A suit, à jour.')}`)}
  ${groupe(`${code('brand')} Marque B`, '2 palettes · à jour', '', { ouvert: false })}
  <div class="information">Mode « Marque C » ajouté dans Figma : ses 46 valeurs sont celles de Marque A, recopiées par Figma. Aucune palette ne l'alimente. <span class="lien">Créer ses palettes</span></div>
  ${groupe(`${code('theme')} Alias des composants`, '121 alias · 23 à créer avec Bleu A', '', { ouvert: false })}
  ${groupe('Hors variables', '1 palette · à jour', '', { ouvert: false })}
  <div class="gestes">${bouton('Actualiser tout (2 palettes)', 'principal grand')}${bouton('Générer tout (10 palettes)', 'grand')}</div>
  ${repli('Palettes et réglages', 'Exporter · Importer · Rapport')}`,
});

const ficheAvant = `<div class="carte fiche">
  <div class="fiche-tete"><b class="fiche-nom">Bleu A</b>${puce('À jour', 'ok')}</div>
  ${nuancier(P.aPrimary, 'light', { h: 14, numeros: false })}
  <div class="fiche-ligne"><span class="sec">${pastille(P.aPrimary.hexa)} ${P.aPrimary.hexa} ◆ nuance 600</span><span class="sec">Garanties ✓</span></div>
  <div class="ligne-variables"><span class="sec">Variables</span>${puce('À écrire', 'attention')}${bouton('Écrire les variables', 'compact')}</div>
  <div class="gestes">${bouton('Afficher', 'compact')}${bouton('Modifier', 'compact')}</div>
</div>`;
const ficheApres = fiche(P.aPrimary, { etat: 'À actualiser', sorte: 'attention', detail: 'Cadre à jour · 23 variables à écrire', gestes: `${bouton('Actualiser sur Figma', 'principal compact')}${bouton('Afficher', 'compact')}${bouton('Modifier', 'compact')}` });

// ---------------------------------------------------------------- piste 3 : la revue
const ligneRevue = (quoi, combien, detail = '') => `<div class="revue-ligne"><span>${quoi}</span><b>${combien}</b>${detail ? `<span class="sec petit">${detail}</span>` : ''}</div>`;
const retoucheRevue = (cran) => `<div class="revue-retouche">
  ${code(`primitives.danger.vivid.light.${cran}`)}
  <span class="duo">${cellule(RETOUCHES[cran], { h: 18 })}<span class="sec petit">Figma ${RETOUCHES[cran]}</span></span>
  <span class="duo">${cellule(calculee(cran), { h: 18 })}<span class="sec petit">Recette ${calculee(cran)}</span></span>
  ${segment(['Garder', 'Remplacer'], 'Garder', 'petit')}
</div>`;

const modaleRevue = `<div class="modale">
  <div class="modale-titre">Actualiser sur Figma : 2 palettes</div>
  <span class="aide">Rouge et Bleu A. Un seul « Annuler » de Figma défait toute l'écriture.</span>
  <div class="revue-bloc"><span class="revue-sous">Planche</span>
    ${ligneRevue('Cadre de Bleu A', 'créé', 'page « UCM Palettes »')}
  </div>
  <div class="revue-bloc"><span class="revue-sous">${code('brand')} · mode « Marque A »</span>
    ${ligneRevue('Variables créées', '23', `${code('brand.palette.primary.…')} et ${code('brand.identity.primary')}`)}
  </div>
  <div class="revue-bloc"><span class="revue-sous">${code('theme')}</span>
    ${ligneRevue('Alias créés', '22', `${code('theme.primary.50')} à ${code('theme.primary.950')}, deux colonnes`)}
  </div>
  <div class="revue-bloc attention"><span class="revue-sous">Retouches dans Figma · Rouge</span>
    <span class="aide petit">Ces valeurs ne sont plus celles que la recette a écrites. Garder les inscrit dans la recette, et les garanties se jugent sur elles.</span>
    ${[700, 800, 900].map(retoucheRevue).join('')}
  </div>
  <div class="gestes a-droite">${bouton('Annuler')}${bouton('Actualiser (2 palettes)', 'principal')}</div>
</div>`;

const ecranRevue = panneau({
  onglet: 'Palettes',
  corps: `${enTetePalettes()}<div style="height:640px"></div>`,
  voile: `<div class="voile">${modaleRevue}</div>`,
});

// ---------------------------------------------------------------- piste 4 : les retouches
const surface100 = P.danger.rampes.vivid.light[rang(100)];
const detailRetouche = `<div class="detail" style="background:${FONDS.light};color:#1E1E1E">
  <div class="d-tete">${cellule(RETOUCHES[700], { h: 40, marque: '✎' })}<div><b class="d-titre">Vivid · 700</b><br><span class="mono">${RETOUCHES[700]}</span> <span class="souligne">Copier</span></div></div>
  <div class="d-encart"><span class="d-sous">Retouchée dans Figma</span>
    <span>Valeur calculée : <span class="mono">${calculee(700)}</span> ${cellule(calculee(700), { h: 12 })}</span>
    <span class="souligne">Rétablir la valeur calculée</span>
    <span class="sec-l">La prochaine actualisation écrira alors la valeur calculée.</span>
  </div>
  <div class="d-encart"><span class="d-sous">Sert à</span>
    <span>${code('text')} · default, texte coloré : ✓ sur ${code('surface')} 100 : ${virgule(ratio(RETOUCHES[700], surface100))}:1 <span class="bdg">AA</span></span>
    <span>${code('solid')} · hover, fond plein au survol : ✓ sous ${code('on-solid')} : ${virgule(ratio(RETOUCHES[700], FONDS.light))}:1 <span class="bdg">AA</span></span>
  </div>
</div>`;

const ecranRetouches = panneau({
  corps: `${barreSelecteur(P.danger)}<div class="titre-1">Palette Rouge</div>
  ${repli('Configuration de la palette', `Utilitaire · ${code('danger')}`)}
  <div class="carte">
    <div class="tete-apercu"><div class="onglets-theme"><span class="on">Thème Light</span><span>Thème Dark</span></div><span class="sec">Fond ▢ ${FONDS.light}</span></div>
    ${nuancier(P.danger, 'light', { retouches: 'gardees', choisie: { profil: 'vivid', cran: 700 } })}
    ${detailRetouche}
    <span class="ref-ligne">◆ Référence : Vivid · nuance 600 · ✎ 3 nuances retouchées dans Figma</span>
  </div>`,
});

// ---------------------------------------------------------------- piste 5 : le jeu de départ
const ligneUtilitaire = (k) => `<div class="depart-ligne"><span class="case on">✓</span>${code(P[k].famille)}<i class="pipette petite" style="background:${P[k].hexa}"></i><span class="mono sec">${P[k].hexa}</span>${nuancier(P[k], 'light', { h: 8, numeros: false, etiquettes: false })}</div>`;
const ligneMarque = (nom, a, b) => `<div class="marque-ligne">${champ(nom)}<div class="champ-ligne">${pastille(a)}<span class="mono">${a}</span></div><div class="champ-ligne">${b ? `${pastille(b)}<span class="mono">${b}</span>` : '<span class="sec">Secondaire, facultative</span>'}</div><span class="sec">✕</span></div>`;
const ecranDepart = panneau({
  corps: `${barreSelecteur(null)}
  <div class="carte">
    <div class="carte-titre">Nouvelle palette</div>
    ${segment(['Une palette', 'Le jeu de départ'], 'Le jeu de départ', 'court')}
    <span class="aide">Les palettes que l'architecture multi-marques demande, chacune avec son rôle. Chaque référence se change ici ou après création.</span>
    <div class="depart-bloc"><span class="revue-sous">${code('primitives')} · communes aux marques</span>
      ${['neutral', 'danger', 'warning', 'success', 'info'].map(ligneUtilitaire).join('')}
    </div>
    <div class="depart-bloc"><span class="revue-sous">${code('brand')} · une rangée par marque</span>
      <div class="marque-ligne entete"><span class="libelle">Marque</span><span class="libelle">Primaire</span><span class="libelle">Secondaire</span><span></span></div>
      ${ligneMarque('Marque A', P.aPrimary.hexa, P.aSecondary.hexa)}
      ${ligneMarque('Marque B', P.bPrimary.hexa, null)}
      <span class="lien">+ Ajouter une marque</span>
    </div>
    <span class="aide">Crée 8 palettes. Rien n'est écrit dans Figma avant « Générer sur Figma », dans l'onglet Palettes.</span>
    <div class="gestes">${bouton('Créer 8 palettes', 'principal')}${bouton('Annuler')}</div>
  </div>`,
});

// ---------------------------------------------------------------- piste 6 : la sélection
const pickerSelection = `<div class="picker">
  <div class="sv" style="background:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(214 76% 48%))"><i style="left:86%;top:15%"></i></div>
  <div class="hue"><i style="left:59%"></i></div>
  <div class="picker-ligne">${liste('Hex', 'etroit')}${champ('#1E6FD9', 'grand')}</div>
  <div class="picker-sep"></div>
  <span class="picker-titre">Dans la sélection · 3 calques</span>
  <div class="picker-pastilles">${[['#1E6FD9', 'Logo'], ['#E08A00', 'Accent'], ['#0B2545', 'Titre']].map(([h, n]) => `<span class="sel-puce"><i style="background:${h}"></i>${n}</span>`).join('')}</div>
  <div class="picker-sep"></div>
  <span class="picker-titre">Nuances Vivid du Thème Light</span>
  <div class="picker-pastilles">${P.aPrimary.rampes.unique.light.map((h) => `<i style="background:${h}"></i>`).join('')}</div>
</div>`;
const ecranSelection = panneau({
  largeur: 520,
  corps: `${barreSelecteur(P.aPrimary)}
  <div class="carte" style="position:relative;min-height:470px">
    <div class="carte-titre">Configuration de la palette</div>
    <div class="deux-col">
      <div><span class="libelle">Nom de la palette</span>${champ('Bleu A')}</div>
      <div><span class="libelle">Couleur de référence</span>${hexaChamp(P.aPrimary.hexa)}</div>
    </div>
    <div class="ancre-picker">${pickerSelection}</div>
  </div>`,
});

// ---------------------------------------------------------------- piste 7 : la vision simulée
const UTILITAIRES = ['danger', 'warning', 'success', 'info'];
const PAIRES = [];
for (let a = 0; a < UTILITAIRES.length; a += 1) for (let b = a + 1; b < UTILITAIRES.length; b += 1) PAIRES.push([UTILITAIRES[a], UTILITAIRES[b]]);
const prochesSous = (vision) => PAIRES
  .map(([a, b]) => ({ a, b, d: distance(a, b, vision) }))
  .filter(({ d }) => d < R.seuils.palettesProches);

const proches = prochesSous('deuteranopie');
const ecranVision = panneau({
  onglet: 'Palettes',
  corps: `${enTetePalettes('Deutéranopie')}
  <div class="information">Vision simulée : deutéranopie, dichromacie complète (Viénot 1999). Les garanties restent jugées en vision normale.
    Sous cette vision, ${proches.map(({ a, b, d }) => `${P[a].nom} et ${P[b].nom} (${virgule(d, 3)})`).join(', ')} passent sous le seuil des palettes proches, ${virgule(R.seuils.palettesProches)}. Un composant qui porte un statut l'accompagne d'une icône ou d'un texte (WCAG 1.4.1).</div>
  ${groupe(`${code('primitives')} Neutre et utilitaires`, '5 palettes', UTILITAIRES.map((k) => fiche(P[k], { etat: 'À jour', sorte: 'ok', vision: 'deuteranopie' })).join(''))}`,
});

function bandeVisions() {
  const tete = `<span></span>${Object.keys(VISIONS).map((v) => `<span class="bv-tete">${{ normale: 'Normale', protanopie: 'Protanopie', deuteranopie: 'Deutéranopie', tritanopie: 'Tritanopie' }[v]}</span>`).join('')}`;
  const lignes = UTILITAIRES.map((k) => `<span class="mono">${P[k].famille}</span>${Object.keys(VISIONS).map((v) => `<span class="bv-rampe">${[500, 600, 700].map((c) => `<i style="background:${voir(v, P[k].rampes.vivid.light[rang(c)])}"></i>`).join('')}</span>`).join('')}`).join('');
  return `<div class="bande-visions">${tete}${lignes}</div>`;
}

// ---------------------------------------------------------------- pistes 8 et 9 : réglages
const ecranReglages = panneau({
  reglages: true,
  corps: `<div class="carte">
    <div class="carte-titre">Couleurs de fond<span class="droite"><span class="sec">10 palettes concernées</span>${bouton('Rétablir', 'compact')}</span></div>
    <div class="rangee"><span class="libelle">Source</span>${segment(['Saisies', 'Cran 50 du neutre'], 'Cran 50 du neutre', 'court')}</div>
    <div class="deux-col">
      <div><span class="libelle">Fond du thème Light</span><div class="champ-ligne"><i class="pipette" style="background:${P.neutral.rampes.unique.light[0]}"></i>${champ(`${P.neutral.rampes.unique.light[0]} · ${code('neutral.light.50')}`, 'grand inactif')}</div></div>
      <div><span class="libelle">Fond du thème Dark</span><div class="champ-ligne"><i class="pipette" style="background:${P.neutral.rampes.unique.dark[0]}"></i>${champ(`${P.neutral.rampes.unique.dark[0]} · ${code('neutral.dark.50')}`, 'grand inactif')}</div></div>
    </div>
    <span class="aide">Les contrastes se mesurent contre le fond de page que les composants peignent. Pour changer les fonds, régler la palette Neutre.</span>
  </div>
  <div class="carte">
    <div class="carte-titre">Variables<span class="droite"><span class="sec">9 palettes à rôle</span></span></div>
    <div class="trois">
      <div><span class="libelle">Collection des primitives</span>${champ('primitives')}</div>
      <div><span class="libelle">Collection des marques</span>${champ('brand')}</div>
      <div><span class="libelle">Collection des alias</span>${champ('theme')}</div>
    </div>
    <div class="ligne-inter"><span class="inter on"><b></b></span><span>Écrire les alias de ${code('theme')}</span></div>
    <span class="aide">Dev Mode montre la propriété de ${code('ucm tokens css')} : ${code('theme.danger.vivid.700')} s'affiche ${code('var(--theme-danger-vivid-700)')}. Les variables de ${code('primitives')} et ${code('brand')} n'apparaissent dans aucun sélecteur de Figma.</span>
    <span class="libelle">Marques, une par mode de ${code('brand')}</span>
    <div class="table-marques">
      <div class="tm-ligne entete"><span>Mode</span><span>Palettes</span><span></span></div>
      <div class="tm-ligne"><span>Marque A</span><span class="sec">primary · secondary</span><span class="lien">Renommer</span></div>
      <div class="tm-ligne"><span>Marque B</span><span class="sec">primary · secondary</span><span class="lien">Renommer</span></div>
      <div class="tm-ligne"><span>Marque C</span><span class="att-t">aucune : 46 valeurs recopiées par Figma</span><span class="lien">Renommer</span></div>
    </div>
  </div>
  ${repli('Contenu des planches', 'Tout est généré · Français')}`,
});

const contenuPlanches = `<div class="fp" style="width:520px"><div class="fp-corps"><div class="carte">
  <div class="carte-titre">⌄ Contenu des planches<span class="droite"><span class="sec">Tout est généré · Français</span></span></div>
  <div class="rangee"><span class="libelle">Langue des planches</span>${segment(['Français', 'English'], 'Français', 'court')}</div>
  <span class="aide">Rangée dans la recette : deux designers qui génèrent la même palette obtiennent la même planche, quelle que soit la langue de leur interface.</span>
  <span class="sec petit">Suivent les interrupteurs actuels, un par partie et par thème.</span>
</div></div></div>`;

const aideVocabulaire = `<div class="fp" style="width:420px"><div class="fp-corps"><div class="carte" style="position:relative;min-height:170px">
  <div class="rangee"><span class="libelle">Référence exacte dans <span class="aide-rond">?</span></span>${segment(['Auto', 'Soft', 'Vivid'], 'Auto', 'court')}</div>
  <div class="bulle">L'intensité qui contient votre couleur telle quelle. L'autre intensité se calcule autour d'elle. Auto choisit celle dont la saturation est la plus proche.</div>
</div></div></div>`;

// ---------------------------------------------------------------- parcours
const etape = (titre, outil, etat) => `<div class="etape ${etat}"><b>${titre}</b><span>${outil}</span></div>`;
const parcoursAvant = `<div class="parcours">
  ${etape('Composer et juger', 'Onglet Création', 'fait')}
  ${etape('Documenter', 'Onglet Palettes, planche', 'fait')}
  ${etape('Créer 710 variables', 'Panneau des variables, à la main', 'manuel')}
  ${etape('Publier la bibliothèque', 'Figma', 'fait')}
  ${etape('Exporter les tokens', 'UCM Exporter', 'fait')}
</div>`;
const parcoursApres = `<div class="parcours">
  ${etape('Composer, avec un rôle', 'Onglet Création', 'change')}
  ${etape('Juger', 'Garanties, vision simulée', 'change')}
  ${etape('Actualiser sur Figma', 'Planche et variables, un geste, une revue', 'change')}
  ${etape('Publier la bibliothèque', 'Figma', 'fait')}
  ${etape('Exporter les tokens', 'UCM Exporter, inchangé', 'fait')}
</div>`;

// ---------------------------------------------------------------- page
const piste = ({ id, numero, famille, statut, titre, intro, scene, apres = '', faits, variantes = '' }) => `
<section class="bloc" id="${id}">
  <div class="tete"><span class="sur">Piste ${numero} · ${famille} · <span class="statut ${statut.cls}">${statut.texte}</span></span><h2>${titre}</h2></div>
  ${intro}
  <div class="scene"><div class="scene-rangee">${scene}</div></div>
  ${apres}
  <div class="faits">${faits.map(([t, c]) => `<div><b>${t}</b><span>${c}</span></div>`).join('')}</div>
  ${variantes}
</section>`;

const RECO = { cls: 'reco', texte: 'recommandée' };
const OPTION = { cls: 'adiscuter', texte: 'à discuter' };

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Intégrer le marché</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap">
<style>
:root {
  --sol: #F3F4F6; --papier: #FFFFFF; --encre: #17191E; --encre-2: #555C69; --filet: #D9DCE2;
  --accent: #A8511B; --accent-fond: #FBEDE3; --ok: #17784A; --ko: #C7321B; --att: #9A5B00;
  --sans: "IBM Plex Sans", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark; --sol: #15171B; --papier: #1D2026; --encre: #ECEEF2; --encre-2: #A3AAB7;
    --filet: #343944; --accent: #F0A06A; --accent-fond: #3A2618; --ok: #5BD08F; --ko: #FF8C78; --att: #F2B35B;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark; --sol: #15171B; --papier: #1D2026; --encre: #ECEEF2; --encre-2: #A3AAB7;
  --filet: #343944; --accent: #F0A06A; --accent-fond: #3A2618; --ok: #5BD08F; --ko: #FF8C78; --att: #F2B35B;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--sol); color: var(--encre); font: 15px/1.55 var(--sans); padding: 32px 16px 64px; }
main { max-width: 1200px; margin: 0 auto; display: grid; gap: 64px; }
h1, h2, h3 { text-wrap: balance; margin: 0; line-height: 1.2; }
h1 { font-size: 30px; font-weight: 600; letter-spacing: -0.01em; }
h2 { font-size: 22px; font-weight: 600; }
h3 { font-size: 16px; font-weight: 600; }
p { margin: 0; max-width: 74ch; }
ul, ol { margin: 0; padding-left: 1.3em; max-width: 74ch; }
li + li { margin-top: 6px; }
code { font-family: var(--mono); font-size: 0.88em; }
a { color: var(--accent); }
.intro, .bloc { display: grid; gap: 16px; min-width: 0; }
.tete { display: grid; gap: 8px; }
.sur { font: 500 12px/1.3 var(--sans); text-transform: uppercase; letter-spacing: 0.08em; color: var(--encre-2); }
.statut.reco { color: var(--ok); font-weight: 600; }
.statut.adiscuter { color: var(--accent); font-weight: 600; }
.sommaire { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 8px 24px; font-size: 14px; }
.sommaire a { text-decoration: none; }
.sommaire span { color: var(--encre-2); }
.encadre { background: var(--papier); border: 1px solid var(--filet); border-radius: 12px; padding: 16px 20px; display: grid; gap: 10px; }
.faits { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.faits > div, .option { background: var(--papier); border: 1px solid var(--filet); border-radius: 10px; padding: 14px 16px; display: grid; gap: 6px; align-content: start; }
.faits b { font-size: 14px; }
.faits span, .option p { font-size: 14px; color: var(--encre-2); }
.options { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.option.choisie { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.option h3 { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; font-size: 15px; }
.chip { font: 600 11px/1 var(--sans); color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
.table { background: var(--papier); border: 1px solid var(--filet); border-radius: 12px; overflow-x: auto; }
.table table { border-collapse: collapse; width: 100%; font-size: 14px; }
.table th, .table td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--filet); vertical-align: top; }
.table tr:last-child td { border-bottom: 0; }
.table th { font-weight: 600; color: var(--encre-2); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
.table td.num { font-family: var(--mono); white-space: nowrap; }
.scene { overflow-x: auto; padding: 4px 0 12px; }
.scene-rangee { display: flex; gap: 24px; align-items: flex-start; width: max-content; }
.legende { font-size: 13px; color: var(--encre-2); width: 370px; display: grid; gap: 8px; }
.legende > b { color: var(--encre); }

/* Le parcours */
.parcours { display: flex; gap: 8px; flex-wrap: wrap; }
.etape { flex: 1 1 150px; border: 1px solid var(--filet); background: var(--papier); border-radius: 10px; padding: 10px 12px; display: grid; gap: 2px; font-size: 13px; position: relative; }
.etape span { color: var(--encre-2); }
.etape.manuel { border-color: var(--ko); border-style: dashed; }
.etape.manuel b { color: var(--ko); }
.etape.change { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.parcours-titre { font: 600 12px/1 var(--sans); text-transform: uppercase; letter-spacing: .08em; color: var(--encre-2); }

/* Le panneau Figma, thème sombre */
.fp {
  --f-fond: #2C2C2C; --f-bloc: #383838; --f-tertiaire: #4A4A4A; --f-bord: #5E5E5E; --f-champ: #2C2C2C; --f-onglet: #505050;
  --f-texte: #FFFFFF; --f-texte-2: #B3B3B3; --f-marque: #0D99FF; --f-lien: #7CC4F8; --f-succes: #85E0A3; --f-att: #F5B74E; --f-att-fond: #4A3714; --f-ok-fond: #1F3D2A;
  flex: none; position: relative; background: var(--f-fond); color: var(--f-texte); font: 11px/16px Inter, system-ui, sans-serif;
  border: 1px solid #1B1B1B; border-radius: 8px; box-shadow: 0 10px 28px rgba(0,0,0,.35); overflow: hidden;
}
.fp-haut { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.fp-titre { font-size: 14px; font-weight: 600; }
.fp-onglets { display: flex; gap: 4px; padding: 0 0 8px; margin: 0 16px; border-bottom: 1px solid var(--f-bord); }
.fp-onglets span, .onglets-theme span { height: 24px; padding: 0 8px; border-radius: 4px; display: grid; place-items: center; color: var(--f-texte-2); font-weight: 600; white-space: nowrap; }
.fp-onglets .on, .onglets-theme .on { background: var(--f-onglet); color: var(--f-texte); }
.onglets-theme { display: flex; gap: 4px; }
.fp-corps { padding: 12px 16px 16px; display: grid; gap: 12px; }
.fp-select { display: flex; gap: 8px; align-items: center; }
.filet { height: 1px; background: var(--f-bord); margin: 3px 0; }
.titre-1 { font-size: 16px; line-height: 24px; font-weight: 600; }
.champ { height: 28px; border: 1px solid var(--f-bord); border-radius: 6px; display: flex; align-items: center; gap: 6px; padding: 0 8px; background: var(--f-champ); min-width: 0; }
.champ.grand { height: 32px; flex: 1; }
.champ.etroit { width: 120px; flex: none; }
.champ.inactif { color: var(--f-texte-2); border-style: dashed; }
.champ .coupe { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.champ .fleche { color: var(--f-texte-2); }
.rond { width: 12px; height: 12px; border-radius: 50%; flex: none; }
.pastille { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: -1px; flex: none; }
.b { height: 28px; padding: 0 10px; border: 1px solid var(--f-bord); border-radius: 6px; display: inline-grid; place-items: center; font-weight: 600; white-space: nowrap; }
.b.grand { height: 32px; padding: 0 12px; }
.b.compact { height: 24px; padding: 0 8px; border-radius: 5px; }
.b.principal { background: var(--f-marque); border-color: var(--f-marque); color: #fff; }
.bouton-icone { width: 28px; height: 28px; border: 1px solid var(--f-bord); border-radius: 6px; display: grid; place-items: center; flex: none; }
.bouton-icone.grand { width: 32px; height: 32px; }
.carte { background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 8px; padding: 12px; display: grid; gap: 10px; align-content: start; }
.carte-titre { font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.carte-titre .droite { display: flex; gap: 10px; align-items: center; font-size: 11px; font-weight: 400; }
.libelle, .aide, .sec { color: var(--f-texte-2); }
.libelle { display: block; margin-bottom: 4px; }
.aide.petit, .petit { font-size: 10px; line-height: 13px; }
.aide.petit { display: block; margin-top: 4px; }
.lien { color: var(--f-lien); }
.souligne { text-decoration: underline; }
.att-t { color: var(--f-att); }
.deux-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.trois { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.rangee { display: grid; gap: 0; justify-items: start; }
.champ-ligne { display: flex; gap: 6px; align-items: center; }
.pipette { width: 28px; height: 28px; border-radius: 6px; border: 3px solid var(--f-champ); outline: 1px solid var(--f-bord); flex: none; }
.pipette.petite { width: 18px; height: 18px; border-width: 2px; border-radius: 4px; }
.segment { display: flex; border: 1px solid var(--f-bord); border-radius: 6px; height: 28px; padding: 2px; gap: 2px; background: var(--f-champ); }
.segment span { flex: 1; display: grid; place-items: center; border-radius: 4px; color: var(--f-texte-2); white-space: nowrap; padding: 0 10px; }
.segment .on { background: var(--f-tertiaire); color: var(--f-texte); font-weight: 600; }
.segment.court { min-width: 220px; }
.segment.role { min-width: 380px; }
.segment.petit { height: 22px; }
.segment.petit span { padding: 0 6px; font-size: 10px; }
.gestes { display: flex; gap: 8px; flex-wrap: wrap; }
.gestes.a-droite { justify-content: flex-end; }
.accordeon { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 12px; background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 8px; }
.accordeon b { font-size: 12px; }
.accordeon .resume, .groupe-tete .resume { margin-left: auto; color: var(--f-texte-2); }
.chevron { color: var(--f-texte-2); width: 10px; }
.c { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 10px; padding: 0 4px; border-radius: 3px; background: rgba(255,255,255,.08); color: var(--f-texte); }
.note-maquette { color: var(--f-texte-2); font-style: italic; padding: 2px 4px; }
.choix-cartes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.choix-carte { display: grid; gap: 6px; align-content: start; padding: 10px; border: 1px solid var(--f-bord); border-radius: 8px; background: var(--f-fond); }
.choix-carte.on { border-color: var(--f-marque); box-shadow: inset 0 0 0 1px var(--f-marque); }
.choix-tete { display: flex; gap: 8px; align-items: center; }
.radio { width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--f-texte-2); }
.radio.on { border: 4px solid var(--f-marque); background: #fff; }

/* Nuancier */
.surface { border-radius: 6px; padding: 8px; }
.grille { display: grid; grid-template-columns: 34px repeat(11, 1fr); gap: 3px; align-items: center; }
.grille.nue { grid-template-columns: repeat(11, 1fr); }
.grille .num { text-align: center; font-size: 9.5px; line-height: 12px; opacity: .7; font-variant-numeric: tabular-nums; }
.grille .prof { font-size: 10px; font-weight: 600; }
.sw { display: grid; place-items: center; border-radius: 4px; font-style: normal; font-size: 10px; position: relative; min-width: 0; }
.sw.pointe::before { content: ""; position: absolute; top: 2px; right: 2px; width: 6px; height: 6px; border-radius: 50%; background: #F5B74E; box-shadow: 0 0 0 1.5px rgba(0,0,0,.55); }
.sw.choisie { box-shadow: 0 0 0 2px #F7F7F7, 0 0 0 4px #1E1E1E; }
.apercu-mini .surface { padding: 6px; }
.tete-apercu { display: flex; justify-content: space-between; align-items: center; }
.ref-ligne { font-weight: 600; }

/* Onglet Palettes */
.tete-onglet { display: flex; align-items: center; gap: 10px; }
.tete-onglet > b { margin-right: auto; }
.vision { display: flex; gap: 6px; align-items: center; }
.groupe { display: grid; gap: 8px; }
.groupe-tete { display: flex; align-items: center; gap: 8px; min-height: 28px; border-bottom: 1px solid var(--f-bord); padding-bottom: 4px; }
.groupe-tete b { font-size: 12px; display: flex; gap: 6px; align-items: center; }
.groupe-corps { display: grid; gap: 8px; }
.fiche { gap: 8px; }
.fiche .surface { padding: 5px; }
.fiche .grille { grid-template-columns: 30px repeat(11, 1fr); gap: 2px; }
.fiche-tete { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.fiche-nom { font-size: 13px; margin-right: 4px; }
.fiche-ligne { display: flex; justify-content: space-between; gap: 12px; }
.ligne-variables { display: flex; gap: 8px; align-items: center; }
.etat-puce { height: 20px; padding: 0 8px; border-radius: 10px; display: inline-grid; place-items: center; font-size: 10px; font-weight: 600; white-space: nowrap; }
.etat-puce.ok { background: var(--f-ok-fond); color: var(--f-succes); }
.etat-puce.attention { background: var(--f-att-fond); color: var(--f-att); }
.information { border-left: 3px solid var(--f-texte-2); padding: 4px 0 4px 10px; color: var(--f-texte-2); }

/* Revue */
.voile { position: absolute; inset: 0; top: 86px; background: rgba(0,0,0,.55); display: grid; justify-items: center; align-items: start; padding: 24px 16px; }
.modale { width: 520px; background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.55); padding: 16px; display: grid; gap: 10px; }
.modale-titre { font-size: 13px; font-weight: 600; }
.revue-bloc { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--f-bord); border-radius: 6px; background: var(--f-fond); }
.revue-bloc.attention { border-color: #7A5A1E; }
.revue-sous { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--f-texte-2); }
.revue-sous .c, .groupe-liste .c { text-transform: none; letter-spacing: 0; }
.modale > *, .revue-bloc > * { min-width: 0; }
.revue-retouche .c { overflow-wrap: anywhere; }
.revue-ligne { display: grid; grid-template-columns: 1fr auto; gap: 0 8px; }
.revue-ligne .petit { grid-column: 1 / -1; }
.revue-retouche { display: grid; grid-template-columns: minmax(0, 1fr) 88px 88px auto; gap: 8px; align-items: center; }
.duo { display: grid; grid-template-columns: 22px 1fr; gap: 4px; align-items: center; }

/* Détail d'une nuance */
.detail { border-radius: 6px; padding: 10px; display: grid; gap: 8px; }
.d-tete { display: grid; grid-template-columns: 40px 1fr; gap: 10px; align-items: center; }
.d-titre { font-size: 13px; }
.d-encart { display: grid; gap: 4px; padding: 8px 10px; border: 1px solid rgba(128,128,128,.35); border-radius: 6px; }
.d-encart .sw { display: inline-grid; width: 24px; vertical-align: middle; }
.d-sous { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .72; }
.detail .c { background: rgba(0,0,0,.07); color: inherit; }
.sec-l { opacity: .72; }
.mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }
.bdg { display: inline-block; padding: 0 3px; border: 1px solid currentColor; border-radius: 3px; font: 600 9px/12px Inter, sans-serif; }

/* Jeu de départ */
.depart-bloc { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--f-bord); border-radius: 6px; background: var(--f-fond); }
.depart-ligne { display: grid; grid-template-columns: 16px 90px 18px 64px 1fr; gap: 8px; align-items: center; }
.depart-ligne .surface { padding: 3px; }
.depart-ligne .grille { gap: 2px; }
.case { width: 14px; height: 14px; border-radius: 3px; display: grid; place-items: center; font-size: 9px; background: var(--f-marque); color: #fff; }
.marque-ligne { display: grid; grid-template-columns: 1.2fr 1fr 1fr 16px; gap: 8px; align-items: center; }
.marque-ligne .champ-ligne { height: 28px; border: 1px solid var(--f-bord); border-radius: 6px; padding: 0 8px; }
.marque-ligne.entete .libelle { margin: 0; }

/* Sélecteur de couleur */
.ancre-picker { position: absolute; top: 96px; right: 12px; z-index: 2; }
.picker { width: 232px; background: #2C2C2C; border: 1px solid #444; border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.55); padding: 10px; display: grid; gap: 10px; }
.sv { position: relative; height: 130px; border-radius: 6px; }
.sv i, .hue i { position: absolute; width: 12px; height: 12px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgba(0,0,0,.4); transform: translate(-50%, -50%); }
.hue { position: relative; height: 10px; border-radius: 5px; background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
.hue i { top: 50%; }
.picker-ligne { display: flex; gap: 6px; }
.picker-ligne .champ.etroit { width: 64px; }
.picker-sep { height: 1px; background: #444; margin: 0 -10px; }
.picker-titre { color: var(--f-texte-2); }
.picker-pastilles { display: flex; flex-wrap: wrap; gap: 3px; }
.picker-pastilles > i { width: 16px; height: 16px; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.15); }
.sel-puce { display: inline-flex; gap: 4px; align-items: center; height: 22px; padding: 0 6px 0 3px; border: 1px solid var(--f-bord); border-radius: 11px; }
.sel-puce i { width: 16px; height: 16px; border-radius: 50%; }

/* Vision */
.bande-visions { display: grid; grid-template-columns: 80px repeat(4, 1fr); gap: 6px 12px; align-items: center; background: var(--papier); border: 1px solid var(--filet); border-radius: 10px; padding: 12px 14px; font-size: 13px; min-width: 520px; }
.bv-tete { font-size: 12px; color: var(--encre-2); }
.bande-titre { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.bande-visions { max-width: 900px; }
.bv-rampe { display: flex; gap: 2px; }
.bv-rampe i { flex: 1; height: 22px; border-radius: 3px; }

/* Réglages */
.table-marques { display: grid; border: 1px solid var(--f-bord); border-radius: 6px; }
.tm-ligne { display: grid; grid-template-columns: 1fr 2fr auto; gap: 8px; padding: 6px 8px; border-top: 1px solid var(--f-bord); }
.tm-ligne:first-child { border-top: 0; }
.tm-ligne.entete { color: var(--f-texte-2); }
.ligne-inter { display: flex; gap: 8px; align-items: center; }
.inter { width: 28px; height: 16px; border-radius: 8px; background: var(--f-bord); display: inline-flex; align-items: center; padding: 2px; flex: none; }
.inter b { width: 12px; height: 12px; border-radius: 50%; background: #fff; }
.inter.on { background: var(--f-marque); justify-content: flex-end; }
.aide-rond { display: inline-grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--f-texte-2); font-size: 9px; margin-left: 4px; color: var(--f-texte); }
.bulle { position: absolute; top: 20px; left: 150px; width: 240px; background: #1E1E1E; border: 1px solid #444; border-radius: 6px; padding: 8px 10px; box-shadow: 0 8px 20px rgba(0,0,0,.5); }

/* Sélecteur de palettes ouvert */
.menu-liste { display: grid; gap: 1px; background: #1E1E1E; border: 1px solid #444; border-radius: 6px; padding: 6px; }
.groupe-liste { padding: 6px 6px 2px; color: var(--f-texte-2); font-size: 10px; }
.entree-liste { display: flex; gap: 8px; align-items: center; padding: 4px 8px; border-radius: 4px; }
.entree-liste em { margin-left: auto; font-style: normal; color: var(--f-texte-2); font-family: "IBM Plex Mono", monospace; font-size: 10px; }
.entree-liste.on { background: var(--f-marque); }
.entree-liste.on em { color: #fff; }

/* Vignettes des rôles */
.vignettes { display: grid; grid-template-columns: repeat(3, 380px); gap: 16px; align-items: start; max-width: 100%; overflow-x: auto; padding-bottom: 8px; }
.vignette { display: grid; gap: 6px; align-content: start; }
.vignette-titre { font: 600 12px/1 var(--sans); color: var(--encre-2); text-transform: uppercase; letter-spacing: .06em; }
.vignette-fp { width: 380px; }
.vignette-fp .segment.role { min-width: 0; width: 100%; }

@media (max-width: 700px) {
  h1 { font-size: 24px; }
  .vignettes { grid-template-columns: 380px; }
}
</style>
</head>
<body>
<main>

<section class="intro">
  <div class="tete"><span class="sur">UCM Palettes · propositions d'intégration</span><h1>Intégrer au plugin ce que le marché fait mieux</h1></div>
  <p>Ce document traduit en écrans les propositions de <a href="../../RECHERCHE-CONCURRENCE-PALETTES.md">la comparaison avec les outils du marché</a>. Il s'adresse au mainteneur, qui valide ou écarte chaque piste avant qu'un plan d'implémentation ne soit écrit. Le texte des décisions et l'ordre des lots sont dans <a href="./PROPOSITION-INITIALE.md">PROPOSITION-INITIALE.md</a>.</p>
  <p>Les couleurs sortent du moteur, dans la recette par défaut. Les panneaux ont la largeur par défaut de la fenêtre, 770 px, dans le thème sombre de Figma. Une ligne en italique dans un panneau remplace un contenu que la maquette n'a pas besoin de répéter.</p>
  <div class="encadre">
    <h3>Le principe commun</h3>
    <p>Une palette a un rôle dans le système : marque, utilitaire, neutre, ou autre. Ce rôle fixe ses intensités et le nom de ses variables. Chaque palette a ensuite un seul état face à Figma, qui couvre son cadre et ses variables, et un seul geste pour le mettre à jour : « Actualiser sur Figma ». Toute écriture de variables passe par une revue, qui montre ce qui change et les valeurs retouchées à la main.</p>
  </div>
  <div class="parcours-titre">Aujourd'hui</div>
  ${parcoursAvant}
  <div class="parcours-titre">Proposé</div>
  ${parcoursApres}
  <nav class="sommaire">
    <a href="#p1">1. Le rôle de la palette <span>· structure</span></a>
    <a href="#p2">2. Un état Figma par palette <span>· structure</span></a>
    <a href="#p3">3. La revue avant écriture <span>· structure</span></a>
    <a href="#p4">4. Les retouches dans la recette <span>· structure</span></a>
    <a href="#p5">5. Le jeu de départ <span>· prise en main</span></a>
    <a href="#p6">6. La couleur de la sélection <span>· prise en main</span></a>
    <a href="#p7">7. La vision simulée <span>· vérification</span></a>
    <a href="#p8">8. Les fonds lus sur le neutre <span>· vérification</span></a>
    <a href="#p9">9. La carte Variables <span>· réglages</span></a>
    <a href="#p10">10. Aides et langue des planches <span>· textes</span></a>
    <a href="#ecartes">Ce qui reste écarté</a>
    <a href="#decisions">Les décisions à valider</a>
  </nav>
</section>

${piste({
  id: 'p1', numero: 1, famille: 'Structure', statut: RECO,
  titre: 'Le rôle de la palette remplace le Modèle, les Intensités et la destination',
  intro: `<p>La recherche ajoute une rangée « Variables » sous les Intensités : un segment « Aucune · Primitives · Marque », un champ de famille et une liste de marques. La carte compterait alors trois choix liés entre eux, et une combinaison sur deux serait refusée à la saisie : une palette de marque à deux intensités, un utilitaire à une intensité.</p>
  <p>La piste remplace ces trois choix par un seul, « Rôle dans le système ». Chaque rôle fixe les intensités que l'architecture lui donne, et la carte ne montre que les champs qui manquent : la marque et la famille pour une rampe de marque, la famille et « Référence exacte dans » pour un utilitaire, rien pour le neutre. « Autre » rend la carte actuelle, Modèle et intensités compris, sans variables. Une combinaison refusée ne peut plus se saisir.</p>`,
  scene: `${ecranRole}<div class="legende"><b>Création d'une palette de marque.</b><span>La couleur et le nom viennent de la sélection (piste 6). La ligne sous les champs donne le chemin des variables, que le plugin assemble sans choisir de nom.</span><span>L'aperçu garde la rampe que les cartes d'intensité montraient.</span><b>Le sélecteur, rangé par rôle.</b>${selecteurOuvert}</div>`,
  faits: [
    ['Ce qui change', 'Création et Configuration de la palette : la rangée Rôle en tête, la suite du choix dessous. Le sélecteur de palette range ses entrées par collection et par marque.'],
    ['Recette', 'Format 7 : un rôle par palette, sa famille et sa marque ; la liste des marques. Une recette au format 6 migre en rôle « Autre » : aucune variable ne s\'écrit sans un geste du designer.'],
    ['Règles modifiées', 'D3 : le plugin connaît la marque et la famille que le designer saisit, et ne nomme toujours rien seul. [ENT-14] : le choix des intensités ne reste libre que pour le rôle « Autre ».'],
    ['Changer de rôle', 'Passer d\'utilitaire à marque retire une intensité, comme « Une · Deux » aujourd\'hui. Les variables déjà écrites restent dans Figma, comme un cadre de palette supprimée ([PLA-27]).'],
  ],
  variantes: `<div class="vignettes">${varianteRole('Utilitaire', P.danger)}${varianteRole('Neutre', P.neutral)}${varianteRole('Autre', P.essai)}</div>
  <div class="options">
    <div class="option choisie"><h3>A. Le rôle <span class="chip">recommandée</span></h3><p>Un choix, qui porte les intensités et la destination. Il enseigne l'architecture au designer à la création même.</p></div>
    <div class="option"><h3>B. La rangée « Variables » de la recherche</h3><p>Moins de changements dans l'écran actuel. Les combinaisons interdites se refusent après coup, avec un message à écrire et un état de galerie par refus.</p></div>
  </div>`,
})}

${piste({
  id: 'p2', numero: 2, famille: 'Structure', statut: RECO,
  titre: 'Un état Figma par palette, et l\'onglet Palettes rangé par collection',
  intro: `<p>La recherche donne à chaque fiche une seconde ligne : une pastille pour les variables et un geste « Écrire les variables », à côté de la pastille et du geste du cadre. La fiche porterait deux états et deux boutons principaux. « Écrire toutes les variables » s'ajouterait à « Actualiser tout ».</p>
  <p>La piste garde une pastille et un geste. La pastille prend l'état le plus grave du cadre et des variables, et la ligne de la référence dit ce qui manque : « Cadre à jour · 23 variables à écrire ». « Générer sur Figma » et « Actualiser sur Figma » écrivent le cadre et les variables de la palette, puis ses alias de <code>theme</code>. Les fiches se rangent sous leur collection, comme dans le panneau des variables de Figma. Le groupe <code>theme</code> n'a pas de fiche : ses alias se déduisent des palettes et suivent leurs gestes.</p>`,
  scene: `${ecranPalettes}<div class="legende"><b>Avant, selon la recherche.</b><div class="fp" style="width:370px"><div class="fp-corps">${ficheAvant}</div></div><b>Après.</b><div class="fp" style="width:370px"><div class="fp-corps">${ficheApres}</div></div><span>La fiche garde le compte d'objets d'aujourd'hui : le nom, la famille en code, une pastille, l'aperçu, une ligne et ses gestes.</span></div>`,
  faits: [
    ['États de la pastille', '« À jour », « À actualiser », « Pas encore sur Figma », « Retouches (n) » en avertissement ; « Cadre introuvable » et « Lecture impossible » en danger. Une palette « Autre » ne montre que l\'état de son cadre.'],
    ['Groupes', 'primitives, une marque par groupe sous brand, theme, puis « Hors variables ». Chaque en-tête se replie et résume son état. L\'ordre de la recette tient à l\'intérieur d\'un groupe.'],
    ['Marque ajoutée dans Figma', 'Figma recopie la première colonne dans un mode ajouté à la main. Une information sous les groupes de marque le dit, avec « Créer ses palettes », qui ouvre le jeu de départ sur cette marque.'],
    ['Règles modifiées', 'D2 et la section 5 : le plugin écrit des variables. [UI-05] : le premier geste dit l\'état du cadre et des variables. Surfaces d\'UCM Palettes : la fiche décrite dans CONTRIBUTING prend la famille et le détail de sa ligne.'],
  ],
})}

${piste({
  id: 'p3', numero: 3, famille: 'Structure', statut: RECO,
  titre: 'La revue avant écriture',
  intro: `<p>Un geste qui écrit des variables passe par une modale, sur le modèle de l'écart d'un import (<code>[REC-08]</code>) et de la modale « Ajuster la référence » (<code>[UI-15]</code>). Elle compte ce qui sera créé, modifié et renommé, par collection et par mode, et liste chaque retouche avec deux choix. Un redessin de cadre seul reste direct, comme aujourd'hui.</p>`,
  scene: `${ecranRevue}<div class="legende"><b>Deux palettes actualisées ensemble.</b><span>Le cadre et les variables de Bleu A sont créés ; Rouge porte trois valeurs retouchées dans Figma.</span><span>« Garder » est choisi par défaut : il ne détruit rien dans Figma, et « Rétablir la valeur calculée » le défait dans l'onglet Création (piste 4).</span><span>La modale suit <code>[UI-15]</code> : 520 px au plus, voile, Tab retenu, Échap et le voile referment sans rien écrire.</span></div>`,
  faits: [
    ['Ce qui se liste', 'Cadres créés ou redessinés ; variables créées, modifiées, renommées ; modes créés ; alias de theme ; retouches. Une ligne sans changement ne s\'affiche pas.'],
    ['Annuler', 'Un seul commitUndo clôt l\'écriture, comme le dessin d\'une planche. Annuler dans la modale ne touche à rien.'],
    ['Écriture interrompue', 'Même traitement que la génération interrompue : ce qui est écrit est nommé, la reprise est possible, la marque posée sur chaque valeur permet de reprendre sans doublon.'],
    ['Coût', 'Un écran, ses états de galerie (création, retouches, renommage, mode créé, interruption) et les textes, à relire.'],
  ],
})}

${piste({
  id: 'p4', numero: 4, famille: 'Structure', statut: RECO,
  titre: 'Les retouches entrent dans la recette',
  intro: `<p>Une retouche gardée entre dans la recette, sous la liste des crans retouchés que l'architecture prévoit (section 3.5). L'aperçu la peint et la marque d'un ✎ ; les garanties se jugent sur elle ; la planche la montre, marquée. Le détail de la nuance dit la valeur calculée et propose « Rétablir la valeur calculée ». Sans cette liste, la recette ne décrirait plus le document, et D10 ne tiendrait plus.</p>`,
  scene: `${ecranRetouches}<div class="legende"><b>Trois crans de Rouge recollés depuis Tailwind, puis gardés.</b><span>Dans l'onglet Palettes, avant la revue, les mêmes crans portent une pastille orange : la retouche attend une décision (voir la fiche de Rouge, piste 2).</span><span>Le ✎ se lit comme le ◆ : un repère fixe, sans couleur sémantique.</span></div>`,
  faits: [
    ['Recette', 'Une entrée par cran retouché : profil, thème, cran, hexa gardé. L\'empreinte en tient compte. Un changement de référence ou de courbe garde la retouche et la signale dans la revue suivante.'],
    ['Garanties', 'Une retouche qui rompt une garantie la fait échouer comme un réglage, avec le lien « Rétablir la valeur calculée » parmi les réglages qui agissent.'],
    ['Rapport', 'Chaque cran dit sa valeur calculée et sa valeur gardée.'],
  ],
})}

${piste({
  id: 'p5', numero: 5, famille: 'Prise en main', statut: RECO,
  titre: 'Le jeu de départ',
  intro: `<p>Dans un fichier sans palette, la carte de création propose « Une palette » ou « Le jeu de départ ». Le jeu crée le neutre et les quatre utilitaires, avec leur rôle, puis deux palettes par marque saisie. Les références des utilitaires sont les 600 de Tailwind ; chacune se change dans la carte. Le menu « … » du sélecteur propose « Compléter le jeu de départ » : la même carte, où les palettes déjà présentes sont cochées et figées.</p>`,
  scene: `${ecranDepart}<div class="legende"><b>Premier lancement, deux marques saisies.</b><span>La carte reste une carte de création : aucune invitation ne reçoit de geste propre, et la règle des surfaces tient.</span><span>La rangée d'une marque accepte la couleur de la sélection (piste 6), prise sur la charte posée dans le document.</span></div>`,
  faits: [
    ['Ce qui se crée', 'Neutre et quatre utilitaires : 5 palettes et 198 variables dans primitives. Par marque : 2 palettes et 46 variables dans brand. Rien n\'est écrit dans Figma avant « Générer sur Figma ».'],
    ['Dépend de', 'Piste 1 : sans rôle, le jeu épargne cinq créations et ne prépare aucune variable.'],
    ['Références proposées', 'Les 600 de Tailwind. Danger et warning restent proches en deutéranopie quelles que soient les teintes mesurées (piste 7) : la réponse est dans les composants, et le jeu ne cherche pas à la corriger.'],
  ],
})}

${piste({
  id: 'p6', numero: 6, famille: 'Prise en main', statut: RECO,
  titre: 'La couleur de la sélection, partout où une couleur se saisit',
  intro: `<p>La recherche préremplit « Nouvelle palette » depuis un calque sélectionné. La piste place la même source dans le sélecteur de couleur embarqué : une rangée « Dans la sélection » liste les remplissages unis des calques choisis, jusqu'à huit, chacun avec le nom de son calque. Elle sert à la référence, aux fonds, et aux rangées du jeu de départ. Un seul calque à remplissage uni préremplit aussi la création, avec une ligne qui dit d'où vient la couleur.</p>`,
  scene: `${ecranSelection}<div class="legende"><b>Trois calques d'une charte sélectionnés.</b><span>Le sandbox suit <code>selectionchange</code> et lit la couleur résolue, variable liée comprise. Un dégradé, une image ou un calque à plusieurs remplissages ne donne rien.</span><span>La rangée se cache quand la sélection ne porte aucune couleur unie.</span></div>`,
  faits: [
    ['Ce qui change', 'Le sélecteur de couleur gagne une rangée ; la création se préremplit. [UI-13] : la création propose des pastilles quand la sélection en porte.'],
    ['Messages', 'Le sandbox envoie la liste des couleurs de la sélection à chaque changement. Un message de plus dans messages.ts, et son état de galerie.'],
    ['Coût', 'Faible. Aucune écriture dans le document.'],
  ],
})}

${piste({
  id: 'p7', numero: 7, famille: 'Vérification', statut: RECO,
  titre: 'La vision simulée',
  intro: `<p>Une liste « Vision » rejoint le choix du thème en tête de l'onglet Palettes : normale, protanopie, deutéranopie, tritanopie. Elle repeint l'aperçu de chaque fiche. Sous une vision simulée, une information nomme les paires d'utilitaires qui passent sous le seuil des palettes proches, et rappelle le critère 1.4.1. Aucune alerte ne sonne : aucun réglage ne sépare danger et warning sans rompre la règle « un numéro de cran vaut un contraste ».</p>`,
  scene: `${ecranVision}<div class="legende"><b>Deutéranopie choisie.</b><span>Les rampes de chaque fiche sont repeintes ; le texte, les pastilles d'état et les garanties ne changent pas.</span><span>La liste ne dure que la session et ne se range pas. Le rapport gagne les distances de chaque paire, par vision.</span><span>Le neutre, gris, se lit de même dans les quatre visions.</span></div>`,
  apres: `<div class="scene"><div class="bande-titre">Crans 500, 600 et 700 Vivid des utilitaires, Thème Light, dans les quatre visions</div>${bandeVisions()}</div>`,
  faits: [
    ['Moteur', 'Un module pur, vision.ts, dans ucm-couleur. Ses tests comparent ses sorties aux vecteurs de libDaltonLens.'],
    ['Garanties', 'Inchangées : elles se jugent en vision normale. La vision simulée ne repeint que les pastilles.'],
    ['Question ouverte', 'L\'information sous la liste est un message de rang 3, sans filet de sévérité. La recherche écartait l\'alerte ; elle ne disait rien d\'une information.'],
  ],
})}

${piste({
  id: 'p8', numero: 8, famille: 'Vérification', statut: OPTION,
  titre: 'Les fonds lus sur le neutre',
  intro: `<p>Le cran 50 du neutre gris vaut ${P.neutral.rampes.unique.light[0]} en Thème Light et ${P.neutral.rampes.unique.dark[0]} en Thème Dark : ce sont les deux fonds par défaut de la recette. L'architecture fait du cran 50 le fond de page. Quand une palette porte le rôle Neutre, la carte « Couleurs de fond » peut lire ses fonds sur elle. Un neutre réchauffé déplace alors le fond contre lequel toutes les garanties se jugent, au lieu de laisser deux valeurs du même fond diverger.</p>`,
  scene: `${ecranReglages}<div class="legende"><b>Réglages communs.</b><span>« Saisies » garde le fonctionnement actuel, et reste le défaut sans palette Neutre.</span><span>La carte Variables (piste 9) suit la carte des fonds.</span></div>`,
  faits: [
    ['Règles modifiées', 'D8 : le plugin fabrique une rampe neutre dès que le rôle existe. [UI-04] : la pastille du fond de l\'aperçu ouvre le neutre au lieu du sélecteur quand les fonds sont liés.'],
    ['Risque', 'Régler la référence du neutre change toutes les garanties d\'un coup. La revue et la carte des garanties le montrent, sans alerte nouvelle.'],
    ['Proposition', 'À discuter, après les pistes 1 à 3.'],
  ],
})}

${piste({
  id: 'p9', numero: 9, famille: 'Réglages', statut: RECO,
  titre: 'La carte Variables et les marques',
  intro: `<p>Les Réglages communs gagnent une carte « Variables », repliée à l'ouverture : les noms des trois collections, l'écriture des alias de <code>theme</code>, et la liste des marques, une par mode de <code>brand</code>. Renommer une marque renomme son mode dans Figma à la prochaine actualisation. Une marque sans palette, créée à la main dans Figma, se lit dans la liste avec ses valeurs recopiées.</p>`,
  scene: `<div class="legende" style="max-width:640px"><b>Voir le panneau de la piste 8</b><span>La carte Variables y suit la carte des fonds. Chaque réglage passe par la revue avant d'agir sur Figma.</span><span>Portées : les variables de primitives et de brand prennent scopes = [] et n'apparaissent dans aucun sélecteur ; theme garde les portées de remplissage et de contour. La syntaxe de code Web vient de tokenCssVariable du kit.</span></div>`,
  faits: [
    ['Ce qui change', 'Une carte des Réglages communs. Le compte de palettes concernées devient « 9 palettes à rôle ».'],
    ['Limite Figma', 'Dix modes par collection en Professional, vingt en Organization : six marques tiennent dans les deux offres.'],
  ],
})}

${piste({
  id: 'p10', numero: 10, famille: 'Textes', statut: RECO,
  titre: 'Les aides de vocabulaire et la langue des planches',
  intro: `<p>Soft, Vivid, « Référence exacte dans » et « Dérive de teinte » reçoivent une aide d'une phrase, derrière un ? à côté du libellé. La langue des planches devient un réglage de « Contenu des planches », rangé dans la recette. Les textes suivent le circuit de TEXTES-A-VALIDER.md.</p>`,
  scene: `${aideVocabulaire}${contenuPlanches}`,
  faits: [
    ['Règle modifiée', '[UI-16] : les planches suivent la langue de la recette, français par défaut, et non plus toujours le français.'],
    ['Coût', 'Faible pour les aides. La langue des planches demande le catalogue anglais de planche/textes.ts.'],
  ],
})}

<section class="bloc" id="ecartes">
  <div class="tete"><span class="sur">Hors des pistes</span><h2>Ce qui reste écarté</h2></div>
  <div class="table"><table>
    <tr><th>Idée</th><th>Raison</th></tr>
    <tr><td>Exporter du CSS, du Tailwind ou du DTCG depuis Palettes</td><td>La chaîne passe par les variables, UCM Exporter et <code>ucm tokens css</code>. Une seconde route contournerait les alias de <code>theme</code> (recherche, section 4).</td></tr>
    <tr><td>Afficher APCA</td><td>Aucune obligation d'Apicil ne se mesure en APCA ; deux nombres côte à côte poseraient la question de celui qui compte (section 5).</td></tr>
    <tr><td>Fabriquer en Display P3</td><td>Toutes les valeurs changeraient, et chaque promesse se jugerait deux fois (section 6).</td></tr>
    <tr><td>Rendre la table des emplois réglable</td><td>La garantie « un numéro de cran vaut un contraste » vaut pour toutes les marques parce que la table ne change pas (section 9).</td></tr>
    <tr><td>Une liste des palettes à gauche et l'éditeur à droite, sans onglets</td><td>L'aperçu demande la largeur du panneau pour ses onze colonnes, et la vision simulée demande les rampes côte à côte. À 500 px, la liste devrait se replier, et le sélecteur reviendrait.</td></tr>
    <tr><td>Renommer l'onglet Palettes en « Figma »</td><td>Le rangement par collection suffit à dire ce que l'onglet montre, sans nouveau nom à apprendre.</td></tr>
    <tr><td>Une association sémantique par modèle de langage</td><td>Les alias de <code>theme</code> se déduisent d'une règle fixe (section 3.4).</td></tr>
  </table></div>
</section>

<section class="bloc" id="decisions">
  <div class="tete"><span class="sur">À valider</span><h2>Les décisions</h2></div>
  <p>Répondre par numéro : « oui », « non », ou la variante choisie. Les décisions V1 à V4 conditionnent le plan ; les autres se prennent séparément.</p>
  <div class="table"><table>
    <tr><th>#</th><th>Décision</th><th>Proposition</th></tr>
    <tr><td class="num">V1</td><td>Le rôle de la palette remplace Modèle, Intensités et destination (piste 1)</td><td>Oui, variante A</td></tr>
    <tr><td class="num">V2</td><td>Une pastille et un geste par palette, cadre et variables ensemble (piste 2)</td><td>Oui</td></tr>
    <tr><td class="num">V3</td><td>L'onglet Palettes se range par collection et par marque (piste 2)</td><td>Oui</td></tr>
    <tr><td class="num">V4</td><td>Toute écriture de variables passe par la revue ; une retouche est gardée par défaut (piste 3)</td><td>Oui</td></tr>
    <tr><td class="num">V5</td><td><code>brand.identity.{famille}</code> reçoit l'hexa de la référence, en valeur, une par palette de marque : 46 variables par marque au lieu des 45 de l'architecture</td><td>Oui</td></tr>
    <tr><td class="num">V6</td><td>Une retouche gardée entre dans la recette, et les garanties se jugent sur elle (piste 4)</td><td>Oui</td></tr>
    <tr><td class="num">V7</td><td>Le jeu de départ dans la carte de création d'un fichier vide, et « Compléter le jeu de départ » dans « … » (piste 5)</td><td>Oui</td></tr>
    <tr><td class="num">V8</td><td>Les couleurs de la sélection dans le sélecteur de couleur, et le préremplissage de la création (piste 6)</td><td>Oui</td></tr>
    <tr><td class="num">V9</td><td>La vision simulée dans l'onglet Palettes, avec une information sur les paires proches (piste 7)</td><td>Oui</td></tr>
    <tr><td class="num">V10</td><td>Les fonds lus sur le cran 50 du neutre (piste 8)</td><td>À discuter</td></tr>
    <tr><td class="num">V11</td><td>La carte Variables des Réglages communs, marques comprises (piste 9)</td><td>Oui</td></tr>
    <tr><td class="num">V12</td><td>Les aides de vocabulaire et la langue des planches dans la recette (piste 10)</td><td>Oui</td></tr>
    <tr><td class="num">V13</td><td>Écrire <code>primitives</code> et <code>brand</code> dans un premier lot, <code>theme</code> dans un second</td><td>Oui, comme la recherche</td></tr>
  </table></div>
</section>

</main>
</body>
</html>
`;

writeFileSync(join(ICI, 'MAQUETTES-PROPOSITION-INITIALE.html'), html);
console.log(`Écrit : MAQUETTES-PROPOSITION-INITIALE.html (${Math.round(html.length / 1024)} Ko)`);
console.log(`Paires proches en deutéranopie : ${proches.map(({ a, b, d }) => `${a}/${b} ${virgule(d, 3)}`).join(', ')}`);
