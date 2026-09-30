#!/usr/bin/env node
/**
 * Écrit MAQUETTES-PROPOSITION-FINALE.html à côté de ce script :
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/03 Proposition finale/generer-maquettes-proposition-finale.mjs"
 *
 * Les écrans de PROPOSITION-FINALE.md. Chaque couleur sort
 * du moteur (`nouvellePalette`, `rampesDe`, `ancrageDe`), chaque résultat de
 * garantie de `verifierPromesses`, chaque emploi d'un cran d'`emploisDuCran`,
 * et chaque compteur des crans de la recette par défaut. Une retouche se juge
 * en recalculant le contraste des paires sur la valeur retouchée, sans toucher
 * au moteur. Les panneaux ont la largeur d'ouverture de la fenêtre, 600 px
 * (`packages/plugin-palettes/src/fenetre.ts`), et les écrans les plus chargés
 * se montrent aussi à 500 px, la largeur minimale.
 *
 * Les onglets s'appellent Système et Palette, comme le propose le flux global
 * du document : `onglet: 'Palettes'` peint l'onglet Système, `'Création'`
 * l'onglet Palette. Une rampe lue (piste 11) se juge comme des retouches sur
 * chaque nuance qui diffère de la rampe calculée.
 *
 * Le script imprime les relevés que l'annexe du document cite.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ancrageDe,
  associationDe,
  atteintLeSeuil,
  contraste,
  distanceDePalettes,
  distanceOk,
  ecrireHexa,
  emploisDuCran,
  etatDeLaPaire,
  lineaireVersRgb8,
  lireHexa,
  rampesDe,
  recetteParDefaut,
  rgb8VersLineaire,
  verifierPromesses,
} from '../../../../../../packages/couleur/src/index.ts';
import { changerReference, choisirLesIntensites, nouvellePalette, reglerClarte } from '../../../../../../packages/plugin-palettes/src/edition.ts';
import { TAILLE_MINIMALE, TAILLE_PAR_DEFAUT } from '../../../../../../packages/plugin-palettes/src/fenetre.ts';

const ICI = dirname(fileURLToPath(import.meta.url));
const R = recetteParDefaut();
const CRANS = R.crans;
const FONDS = { light: R.fonds.light, dark: R.fonds.dark };
const LARGEUR = TAILLE_PAR_DEFAUT.largeur;
const HAUTEUR = TAILLE_PAR_DEFAUT.hauteur;
const MINIMALE = TAILLE_MINIMALE.largeur;

// ---------------------------------------------------------------- vision
// Les matrices de mesurer-vision-simulee.mjs : Viénot 1999 pour la protanopie
// et la deutéranopie, Brettel 1997 pour la tritanopie (libDaltonLens).
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
const NOM_VISION = { normale: 'Normale', protanopie: 'Protanopie', deuteranopie: 'Deutéranopie', tritanopie: 'Tritanopie' };
const voir = (vision, hexa) => ecrireHexa(VISIONS[vision](lireHexa(hexa)));

// ---------------------------------------------------------------- palettes
/** Une palette de démonstration, calculée par le moteur sur la recette par défaut. */
function entreeDe(meta, palette) {
  const recette = { ...R, palettes: [palette] };
  const rampes = rampesDe(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  const parProfil = {};
  for (const [profil, parMode] of Object.entries(rampes)) {
    parProfil[profil] = { light: parMode.light.map((c) => ecrireHexa(c.couleur)), dark: parMode.dark.map((c) => ecrireHexa(c.couleur)) };
  }
  const n = palette.intensites === 1 ? 1 : 2;
  return { ...meta, n, palette, recette, hexa: palette.reference, rampes: parProfil, rangs: ancrage.rangs, porteur: n === 1 ? 'unique' : ancrage.profil };
}

const SYSTEME = [
  { cle: 'neutral', nom: 'Neutre', hexa: '#808080', n: 1, role: 'neutre', famille: 'neutral' },
  { cle: 'danger', nom: 'Rouge', hexa: '#DC2626', n: 2, role: 'utilitaire', famille: 'danger' },
  { cle: 'warning', nom: 'Ambre', hexa: '#D97706', n: 2, role: 'utilitaire', famille: 'warning' },
  { cle: 'success', nom: 'Vert', hexa: '#16A34A', n: 2, role: 'utilitaire', famille: 'success' },
  { cle: 'info', nom: 'Azur', hexa: '#2563EB', n: 2, role: 'utilitaire', famille: 'info' },
  { cle: 'aPrimary', nom: 'Bleu A', hexa: '#1E6FD9', n: 1, role: 'marque', famille: 'primary', marque: 'Marque A' },
  { cle: 'aSecondary', nom: 'Orange A', hexa: '#E08A00', n: 1, role: 'marque', famille: 'secondary', marque: 'Marque A' },
  { cle: 'bPrimary', nom: 'Violet B', hexa: '#7A1FA2', n: 1, role: 'marque', famille: 'primary', marque: 'Marque B' },
  { cle: 'essai', nom: 'Framboise', hexa: '#C2185B', n: 2, role: 'hors' },
];
const P = {};
SYSTEME.forEach((meta, i) => {
  P[meta.cle] = entreeDe(meta, nouvellePalette(R, `p-${String(i).padStart(8, '0')}`, meta.hexa, meta.n));
});
const UTILITAIRES = ['danger', 'warning', 'success', 'info'];

const rang = (cran) => CRANS.indexOf(cran);
const virgule = (x, n = 2) => x.toFixed(n).replace('.', ',');
const ratio = (a, b) => contraste(lireHexa(a), lireHexa(b));
const encreSur = (hexa) => (ratio(hexa, '#000000') >= ratio(hexa, '#FFFFFF') ? '#111111' : '#FFFFFF');
const cle = (profil, mode, cran) => `${profil}/${mode}/${cran}`;
const profils = (p) => (p.n === 1 ? ['unique'] : ['soft', 'vivid']);
const NOM_PROFIL = { soft: 'Soft', vivid: 'Vivid', unique: '' };
const NOM_MODE = { light: 'Light', dark: 'Dark' };
const ETAT = ['au repos', 'au survol', 'à l’appui'];

// ---------------------------------------------------------------- garanties
/**
 * Les promesses d'une palette, jugées sur les valeurs finales : la rampe du
 * moteur, et les retouches `surcharges` (clé `profil/mode/cran` vers un hexa).
 */
function promesses(p, surcharges = {}) {
  return verifierPromesses(p.recette, p.palette).map((x) => {
    const couleur = (d) => (d.nature === 'cran' && surcharges[cle(x.profil, x.mode, d.cran)] ? lireHexa(surcharges[cle(x.profil, x.mode, d.cran)]) : d.couleur);
    const valeur = contraste(couleur(x.premier), couleur(x.second));
    return { ...x, contraste: valeur, verdict: atteintLeSeuil(valeur, x.seuil) ? 'tenue' : 'manquee' };
  });
}
const manquees = (liste, mode, profil) => liste.filter((x) => x.mode === mode && x.profil === profil && x.verdict === 'manquee').length;
const signe = (n) => (n === 0 ? '✓' : `✗ ${n}`);

/** Le résultat d'une fiche dans un thème, comme la bascule des garanties le donne. */
function resultat(p, mode, surcharges = {}) {
  const liste = promesses(p, surcharges);
  if (p.n === 1) return `Garanties ${signe(manquees(liste, mode, 'unique'))}`;
  return `Soft ${signe(manquees(liste, mode, 'soft'))} · Vivid ${signe(manquees(liste, mode, 'vivid'))}`;
}
/** Le résultat sur les deux thèmes, pour un bilan. */
function resultatDesDeuxThemes(p, surcharges = {}) {
  const liste = promesses(p, surcharges);
  const total = liste.filter((x) => x.verdict === 'manquee').length;
  return { total, evaluees: liste.length, texte: total === 0 ? `${liste.length} garanties tenues sur ${liste.length}` : `${total} ${total === 1 ? 'garantie manquée' : 'garanties manquées'} sur ${liste.length}` };
}

const nomMembre = (m) => ('fond' in m ? 'fond' : m.emploi);
/** « text sur surface, au survol », avec les codes. */
function nomDeLaPaire(x) {
  const a = associationDe(x.paire);
  return `${code(a.premier)} sur ${a.second === 'fond' ? 'le fond' : code(a.second)}, ${ETAT[etatDeLaPaire(x.paire)]}`;
}
/** Les paires dont `emploi` avancé de `decalage` est membre, dans un profil et un thème. */
function pairesDuMembre(liste, profil, mode, emploi, decalage) {
  const vise = (m) => !('fond' in m) && m.emploi === emploi && m.decalage === decalage;
  return liste.filter((x) => x.profil === profil && x.mode === mode && (vise(x.paire.premier) || vise(x.paire.second)));
}
/** Les emplois d'un cran, en mots : `solid` au repos, `border-control` au survol. */
const emploisEnMots = (cran) => emploisDuCran(CRANS, rang(cran)).map(({ emploi, decalage }) => `${code(emploi)} ${ETAT[decalage]}`);

// ---------------------------------------------------------------- compteurs
// Trois unités : variables créées, valeurs par mode écrites, cadres dessinés.
const variablesDeLaRampe = (p) => p.n * 2 * CRANS.length;
const variablesDePalette = (p) => variablesDeLaRampe(p) + (p.role === 'marque' ? 1 : 0);
const aliasDeLaFamille = (p) => p.n * CRANS.length;
const COMPTES = {
  primitives: variablesDePalette(P.neutral) + UTILITAIRES.reduce((s, k) => s + variablesDePalette(P[k]), 0),
  brandParMarque: variablesDePalette(P.aPrimary) + variablesDePalette(P.aSecondary),
  theme: aliasDeLaFamille(P.neutral) + UTILITAIRES.reduce((s, k) => s + aliasDeLaFamille(P[k]), 0) + aliasDeLaFamille(P.aPrimary) + aliasDeLaFamille(P.aSecondary),
};
const MARQUES = 6;
const TOTAL_VARIABLES = COMPTES.primitives + COMPTES.brandParMarque + COMPTES.theme;
const TOTAL_VALEURS = COMPTES.primitives + COMPTES.brandParMarque * MARQUES + COMPTES.theme * 2;
// L'architecture actuelle garde une seule identité par marque : 45 variables dans brand au lieu de 46 (décision V5).
const VALEURS_AUJOURD_HUI = COMPTES.primitives + (COMPTES.brandParMarque - 1) * MARQUES + COMPTES.theme * 2;

// ---------------------------------------------------------------- scénarios
// Rouge, Vivid, Thème Light : un designer a collé la référence de Rouge, celle du 600, au 700.
const RETOUCHE = { profil: 'vivid', mode: 'light', cran: 700, figma: '#DC2626' };
const cleRetouche = cle(RETOUCHE.profil, RETOUCHE.mode, RETOUCHE.cran);
const calculee = P.danger.rampes.vivid.light[rang(RETOUCHE.cran)];
const avecRetouche = { [cleRetouche]: RETOUCHE.figma };
const apresAdoption = promesses(P.danger, avecRetouche);
const perdues = apresAdoption.filter((x) => x.verdict === 'manquee');

// Bleu A : la couleur de la charte a changé dans Figma, sur brand.identity.primary.
const IDENTITE_FIGMA = '#1D4ED8';
const bleuNeuf = entreeDe({ ...SYSTEME[5], nom: 'Bleu A' }, changerReference(R, P.aPrimary.palette, IDENTITE_FIGMA));
const valeursQuiChangent = (a, b, prof) => ['light', 'dark'].reduce((s, m) => s + a.rampes[prof][m].filter((h, i) => h !== b.rampes[prof][m][i]).length, 0);
const bleuValeurs = valeursQuiChangent(P.aPrimary, bleuNeuf, 'unique') + 1;

// Rouge : sa référence change, et un autre designer retouche le 800 pendant la revue.
const rougeNeuf = entreeDe(SYSTEME[1], changerReference(R, P.danger.palette, '#E11D48'));
const rougeValeurs = valeursQuiChangent(P.danger, rougeNeuf, 'soft') + valeursQuiChangent(P.danger, rougeNeuf, 'vivid');
const INVALIDEE = { cran: 800, figma: '#7F1D1D' };

// Framboise, Sur mesure à deux intensités, devient la secondaire de Marque B.
const framboiseUne = entreeDe({ ...SYSTEME[8], role: 'marque', famille: 'secondary', marque: 'Marque B' }, choisirLesIntensites(R, P.essai.palette, 1));
const porteuseInchangee = ['light', 'dark'].every((m) => P.essai.rampes[P.essai.porteur][m].every((h, i) => h === framboiseUne.rampes.unique[m][i]));

// Le neutre, luminosité réglée à −0,02, dont on lirait les fonds. Une teinte
// changée ne déplace presque pas son cran 50, qui garde la clarté de la courbe ;
// une luminosité réglée le déplace.
const DECALAGE_DU_NEUTRE = -0.02;
const neutreRegle = entreeDe(SYSTEME[0], reglerClarte(R, P.neutral.palette, 'vivid', DECALAGE_DU_NEUTRE));
const fondsChauds = { light: neutreRegle.rampes.unique.light[0], dark: neutreRegle.rampes.unique.dark[0] };
function bilanDesFonds(p) {
  const avant = resultatDesDeuxThemes(p).total;
  const recette = { ...R, fonds: fondsChauds, palettes: [p.palette] };
  const apres = verifierPromesses(recette, p.palette).filter((x) => x.verdict === 'manquee').length;
  return { avant, apres };
}

// ---------------------------------------------------------------- briques
const code = (texte) => `<code class="c">${texte}</code>`;
const pastille = (hexa) => `<i class="pastille" style="background:${hexa}"></i>`;
const puce = (texte, sorte) => `<span class="etat-puce ${sorte}">${texte}</span>`;
const bouton = (texte, sorte = '') => `<span class="b ${sorte}">${texte}</span>`;
const segment = (valeurs, active, cls = '') => `<div class="segment ${cls}">${valeurs.map((v) => `<span${v === active ? ' class="on"' : ''}>${v}</span>`).join('')}</div>`;
const champ = (valeur, cls = '') => `<div class="champ ${cls}"><span class="coupe">${valeur}</span></div>`;
const liste = (valeur, cls = '') => `<div class="champ ${cls}"><span class="coupe">${valeur}</span><span class="fleche">▾</span></div>`;
const hexaChamp = (hexa) => `<div class="champ-ligne"><i class="pipette" style="background:${hexa}"></i>${champ(hexa, 'grand')}</div>`;
const repli = (titre, resume) => `<div class="accordeon"><span class="chevron">›</span><b>${titre}</b><span class="resume">${resume}</span></div>`;
const note = (texte) => `<span class="note-maquette">${texte}</span>`;
const radio = (texte, on, aide) => `<div class="choix${on ? ' on' : ''}"><i class="radio${on ? ' on' : ''}"></i><div><b>${texte}</b><span class="sec petit">${aide}</span></div></div>`;
const caseACocher = (on, inactif = false) => `<span class="case${on ? ' on' : ''}${inactif ? ' inactif' : ''}">${on ? '✓' : ''}</span>`;

function cellule(hexa, { marque = '', pointe = false, h = 26, choisie = false } = {}) {
  return `<i class="sw${pointe ? ' pointe' : ''}${choisie ? ' choisie' : ''}" style="background:${hexa};color:${encreSur(hexa)};height:${h}px">${marque}</i>`;
}

/**
 * L'aperçu peint du fond du thème. `surcharges` peint une retouche adoptée et
 * la marque ✎ ; `attente` pointe une retouche à décider.
 */
function nuancier(p, mode, { vision = 'normale', surcharges = {}, attente = {}, h = 26, numeros = true, choisie = null, etiquettes = true } = {}) {
  const lignes = profils(p).map((profil) => {
    const cellules = p.rampes[profil][mode].map((hexa, i) => {
      const cran = CRANS[i];
      const k = cle(profil, mode, cran);
      const retouchee = surcharges[k];
      const marque = retouchee ? '✎' : profil === p.porteur && i === p.rangs[mode] ? '◆' : '';
      return cellule(voir(vision, retouchee ?? hexa), { marque, h, pointe: !!attente[k], choisie: choisie === k });
    }).join('');
    return `${etiquettes ? `<span class="prof">${NOM_PROFIL[profil]}</span>` : ''}${cellules}`;
  }).join('');
  const tete = numeros ? `${etiquettes ? '<span></span>' : ''}${CRANS.map((c) => `<span class="num">${c}</span>`).join('')}` : '';
  const encre = mode === 'light' ? '#1E1E1E' : '#EDEDED';
  return `<div class="surface" style="background:${FONDS[mode]};color:${encre}"><div class="grille${etiquettes ? '' : ' nue'}">${tete}${lignes}</div></div>`;
}

function panneau({ largeur = LARGEUR, onglet = 'Création', corps, reglages = false, voile = '', hauteur = null }) {
  const tete = reglages
    ? `<div class="fp-haut"><span class="fp-titre">Réglages communs</span>${bouton('Retour aux palettes et à la planche')}</div>`
    : `<div class="fp-haut"><span class="fp-titre">UCM Palettes</span><span class="bouton-icone">⚙</span></div>
       <div class="fp-onglets"><span${onglet === 'Palettes' ? ' class="on"' : ''}>Système</span><span${onglet === 'Création' ? ' class="on"' : ''}>Palette</span></div>`;
  const style = `width:${largeur}px${hauteur ? `;height:${hauteur}px` : ''}`;
  return `<div class="fp${hauteur ? ' borne' : ''}" style="${style}" data-largeur="${largeur}">${tete}<div class="fp-corps">${corps}</div>${voile}</div>`;
}

const barreSelecteur = (p) => `<div class="fp-select">${p
  ? `<div class="champ grand"><i class="rond" style="background:${p.hexa}"></i><span class="coupe"><b>${p.nom}</b></span><span class="fleche">▾</span></div>`
  : '<div class="champ grand"><span class="coupe sec">Sélectionner une palette</span><span class="fleche">▾</span></div>'}
  ${bouton('Nouvelle palette', 'principal grand')}${p ? '<span class="bouton-icone grand">⋯</span>' : ''}</div><div class="filet"></div>`;

const ecran = (contenu, legende) => `<div class="ecran">${contenu}${legende ? `<div class="legende-ecran">${legende}</div>` : ''}</div>`;

// ---------------------------------------------------------------- piste 1 : le rôle
const ROLES = ['Marque', 'Utilitaire', 'Neutre', 'Sur mesure'];
const COMMUNES = 'Neutre et utilitaires';
const cheminDe = (p) => {
  if (p.role === 'marque') return `${code(`brand.palette.${p.famille}.{light,dark}.{50…950}`)} et ${code(`brand.identity.${p.famille}`)}, mode « ${p.marque} »`;
  if (p.role === 'neutre') return code('primitives.neutral.{light,dark}.{50…950}');
  return code(`primitives.${p.famille}.{soft,vivid}.{light,dark}.{50…950}`);
};

function suiteDuRole(role, p) {
  if (role === 'Marque') {
    return `<div class="deux-col">
        <div><span class="libelle">Marque</span>${liste(p.marque)}<span class="aide petit">La liste finit par « Nouvelle marque… »</span></div>
        <div><span class="libelle">Famille</span>${liste(p.famille)}<span class="aide petit">La palette qui porte les actions de la marque, pas forcément sa première couleur.</span></div>
      </div>
      <span class="aide">Une intensité, comme toute rampe de marque. ${variablesDePalette(p)} variables : ${cheminDe(p)}.</span>`;
  }
  if (role === 'Utilitaire') {
    return `<div class="deux-col">
        <div><span class="libelle">Famille</span>${liste(p.famille)}<span class="aide petit">Libres : warning · success · info · Autre famille…</span></div>
        <div><span class="libelle">Référence exacte dans</span>${segment(['Auto', 'Soft', 'Vivid'], 'Auto')}<span class="aide petit">Auto a choisi ${NOM_PROFIL[p.porteur]}</span></div>
      </div>
      <span class="aide">Deux intensités, Soft et Vivid. ${variablesDePalette(p)} variables : ${cheminDe(p)}, communes aux marques.</span>`;
  }
  if (role === 'Neutre') {
    return `<span class="aide">Une intensité, famille ${code('neutral')}. ${variablesDePalette(p)} variables : ${cheminDe(p)}. Son cran 50 vaut ${p.rampes.unique.light[0]} et ${p.rampes.unique.dark[0]}, les fonds par défaut de la recette.</span>`;
  }
  return `<div class="rangee"><span class="libelle">Modèle</span>${segment(['Standard', 'Libre'], 'Standard', 'court')}</div>
    <div class="rangee"><span class="libelle">Intensités</span>${segment(['Une', 'Deux'], p.n === 1 ? 'Une' : 'Deux', 'court')}</div>
    <div class="rangee"><span class="libelle">Variables</span>${segment(['Aucune', 'Variables existantes…'], 'Aucune', 'court')}</div>
    <span class="aide">Seule la planche montre cette palette. « Variables existantes… » la relie aux variables d'un design system qui ne suit pas l'architecture (piste 12). Un rôle se choisit plus tard, avec un aperçu de ce qui change.</span>`;
}

const rangeeRole = (role) => `<div class="rangee"><span class="libelle">Rôle dans le système <span class="aide-rond">?</span></span>${segment(ROLES, role, 'role')}</div>`;

function carteCreation(role, p, { origine = 'Reprise de la sélection : « Charte / Bleu Marque A »', entete = '' } = {}) {
  return `<div class="carte">
    <div class="carte-titre">Nouvelle palette</div>
    ${entete}
    <div class="deux-col">
      <div><span class="libelle">Nom de la palette</span>${champ(p.nom)}</div>
      <div><span class="libelle">Couleur de référence</span>${hexaChamp(p.hexa)}<span class="aide petit">${origine}</span></div>
    </div>
    ${rangeeRole(role)}
    ${suiteDuRole(role, p)}
    <div class="apercu-mini">${nuancier(p, 'light', { h: 16, etiquettes: p.n === 2 })}</div>
    <div class="gestes">${bouton('Créer la palette', 'principal')}${bouton('Annuler')}</div>
  </div>`;
}

const ecranRole = panneau({ corps: `${barreSelecteur(null)}${carteCreation('Marque', P.aPrimary)}` });

const vignetteRole = (role, p) => `<div class="vignette"><span class="vignette-titre">${role}</span>
  <div class="fp" style="width:${LARGEUR}px"><div class="fp-corps"><div class="carte">${rangeeRole(role)}${suiteDuRole(role, p)}</div></div></div></div>`;

const groupeListe = (titre, collection) => `<span class="groupe-liste">${titre}${collection ? ` ${code(collection)}` : ''}</span>`;
const entreeListe = (k, on = false) => `<span class="entree-liste${on ? ' on' : ''}">${pastille(P[k].hexa)}${P[k].nom}${P[k].famille && P[k].role !== 'hors' ? `<em>${P[k].famille}</em>` : ''}</span>`;
const selecteurOuvert = `<div class="fp" style="width:360px"><div class="fp-corps"><div class="menu-liste">
  ${groupeListe(COMMUNES, 'primitives')}${['neutral', ...UTILITAIRES].map((k) => entreeListe(k)).join('')}
  ${groupeListe('Marque A', 'brand')}${entreeListe('aPrimary', true)}${entreeListe('aSecondary')}
  ${groupeListe('Marque B', 'brand')}${entreeListe('bPrimary')}
  ${groupeListe('Sur mesure')}${entreeListe('essai')}
</div></div></div>`;

// L'aperçu de conversion : Framboise devient la secondaire de Marque B.
const avantApres = (titre, contenu) => `<div class="aa"><span class="revue-sous">${titre}</span>${contenu}</div>`;
const ecranConversion = panneau({
  corps: `${barreSelecteur(P.essai)}<div class="titre-1">Palette Framboise</div>
  <div class="carte">
    <div class="carte-titre">Configuration de la palette</div>
    <div class="deux-col">
      <div><span class="libelle">Nom de la palette</span>${champ('Framboise')}</div>
      <div><span class="libelle">Couleur de référence</span>${hexaChamp(P.essai.hexa)}</div>
    </div>
    ${rangeeRole('Marque')}
    <div class="conversion">
      <div class="conversion-titre">Passer en Marque : ce qui change</div>
      <div class="deux-col">
        <div><span class="libelle">Marque</span>${liste('Marque B')}</div>
        <div><span class="libelle">Famille</span>${liste('secondary')}<span class="aide petit">Libre dans Marque B. Marque A l'a déjà.</span></div>
      </div>
      ${avantApres('Rampes, Thème Light', `<div class="deux-col">
        <div><span class="sec petit">Avant · deux intensités</span>${nuancier(P.essai, 'light', { h: 12, numeros: false })}</div>
        <div><span class="sec petit">Après · une intensité</span>${nuancier(framboiseUne, 'light', { h: 12, numeros: false, etiquettes: false })}</div>
      </div>
      <span class="aide">${porteuseInchangee
        ? `La rampe ${NOM_PROFIL[P.essai.porteur]}, qui porte votre couleur, devient la rampe unique. Ses couleurs ne changent pas. La rampe ${NOM_PROFIL[P.essai.porteur === 'vivid' ? 'soft' : 'vivid']} disparaît.`
        : 'La rampe unique diffère de la rampe qui portait votre couleur : comparez-les avant de valider.'}</span>`)}
      ${avantApres('Garanties', `<span>Avant : ${resultat(P.essai, 'light')} en Light, ${resultat(P.essai, 'dark')} en Dark.</span><span>Après : ${resultat(framboiseUne, 'light')} en Light, ${resultat(framboiseUne, 'dark')} en Dark.</span>`)}
      ${avantApres('Figma', `<span>Variables : ${variablesDePalette(framboiseUne)} valeurs à écrire dans ${code('brand')}, mode « Marque B », à la prochaine actualisation. Aucune variable n'existe pour Framboise : rien ne reste dans Figma.</span><span>Planche : le cadre passera « À actualiser ».</span>`)}
      <div class="gestes">${bouton('Passer en Marque', 'principal')}${bouton('Annuler')}</div>
    </div>
  </div>`,
});

// ---------------------------------------------------------------- piste 2 : l'onglet Système
function fiche(p, { etat, sorte, detail = '', gestes, vision = 'normale', mode = 'light', surcharges = {}, attente = {}, courte = false }) {
  const ref = p.n === 1 ? `◆ nuance ${CRANS[p.rangs[mode]]}` : `◆ ${NOM_PROFIL[p.porteur]} · nuance ${CRANS[p.rangs[mode]]}`;
  return `<div class="carte fiche">
    <div class="fiche-tete"><span><b class="fiche-nom">${p.nom}</b>${p.famille && p.role !== 'hors' ? ` ${code(p.famille)}` : ''}</span>${puce(etat, sorte)}</div>
    ${nuancier(p, mode, { vision, surcharges, attente, h: 14, numeros: false })}
    <div class="fiche-ligne"><span class="sec">${pastille(p.hexa)} ${p.hexa} ${ref}</span><span class="sec">${resultat(p, mode, surcharges)}</span></div>
    ${detail ? `<div class="fiche-detail ${sorte === 'attention' ? 'att-t' : 'sec'}">${detail}</div>` : ''}
    ${!courte && gestes ? `<div class="gestes">${gestes}</div>` : ''}
  </div>`;
}

const groupe = (titre, collection, resume, contenu, { ouvert = true, menu = false } = {}) => `<div class="groupe">
  <div class="groupe-tete"><span class="chevron">${ouvert ? '⌄' : '›'}</span><b>${titre}${collection ? ` ${code(collection)}` : ''}</b><span class="resume">${resume}</span>${menu ? '<span class="bouton-icone petit">⋯</span>' : ''}</div>
  ${ouvert ? `<div class="groupe-corps">${contenu}</div>` : ''}</div>`;

/** La case d'une famille qu'une autre marque possède et que celle-ci n'a pas. */
const caseVide = (famille, marque, autre, reprendre) => `<div class="case-vide">
  <span>${code(famille)} manque dans ${marque}. ${autre} l'a : les valeurs de ce mode resteraient sans palette.</span>
  <div class="gestes">${bouton('Créer la palette', 'compact')}${reprendre ? liste(`${pastille(reprendre.hexa)} Reprendre ${reprendre.nom}`, 'compact-liste') : ''}</div>
</div>`;

const enTetePalettes = (nombre = 9, aActualiser = 4) => `<div class="tete-onglet"><b>${nombre} palettes</b>
  <div class="onglets-theme"><span class="on">Thème Light</span><span>Thème Dark</span></div>
  ${bouton(`Actualiser sur Figma… (${aActualiser})`, 'principal')}</div>`;

// Aucune fiche ne porte de bouton principal : l'écriture part de l'en-tête de l'onglet Système, ou de la palette ouverte.
const gestesFiche = () => `${bouton('Afficher', 'compact')}${bouton('Modifier', 'compact')}`;
const attenteRetouche = { [cleRetouche]: true };
const valeursMarque = variablesDePalette(P.aPrimary);

function ecranPalettes(largeur) {
  return panneau({
    largeur,
    onglet: 'Palettes',
    corps: `${enTetePalettes()}
    ${groupe(COMMUNES, 'primitives', '5 palettes · 1 à décider', `
      ${repli('Distinguer les statuts', 'Vision normale')}
      ${fiche(P.neutral, { etat: 'À jour', sorte: 'ok', gestes: gestesFiche() })}
      ${fiche(P.danger, { etat: 'À décider', sorte: 'attention', attente: attenteRetouche, detail: 'Planche à jour · Variables : 1 retouche faite dans Figma', gestes: gestesFiche() })}
      ${note('Ambre, Vert et Azur suivent, à jour.')}`)}
    ${groupe('Marque A', 'brand', '2 palettes · pas encore sur Figma', `
      ${fiche(P.aPrimary, { etat: 'Pas encore sur Figma', sorte: 'attention', detail: `Planche : pas encore · Variables : ${valeursMarque} valeurs à écrire, les variables existent déjà`, gestes: bouton('Modifier', 'compact') })}
      ${note(`Orange A suit : ${variablesDePalette(P.aSecondary)} variables à créer.`)}`, { menu: true })}
    ${groupe('Marque B', 'brand', '1 palette · 1 famille manque', `
      ${note('Violet B suit, à jour.')}
      ${caseVide('secondary', 'Marque B', 'Marque A', P.essai)}`, { menu: true })}
    ${groupe('Marque C', 'brand', 'Mode créé hors du plugin', `<div class="case-vide"><span>Figma a un mode « Marque C » dans ${code('brand')}, qu'aucune palette ne remplit. Ses valeurs sont sans provenance.</span><div class="gestes">${bouton('Suivre ce mode…', 'compact')}</div></div>`)}
    <span class="lien">+ Ajouter une marque</span>
    ${groupe('Sur mesure', '', '1 palette · pas encore sur Figma', '', { ouvert: false })}
    ${repli('Palettes et réglages', 'Générer tout · Exporter · Importer · Rapport')}`,
  });
}

const ficheAvantRecherche = `<div class="carte fiche">
  <div class="fiche-tete"><b class="fiche-nom">Bleu A</b>${puce('À jour', 'ok')}</div>
  ${nuancier(P.aPrimary, 'light', { h: 14, numeros: false })}
  <div class="fiche-ligne"><span class="sec">${pastille(P.aPrimary.hexa)} ${P.aPrimary.hexa} ◆ nuance ${CRANS[P.aPrimary.rangs.light]}</span><span class="sec">${resultat(P.aPrimary, 'light')}</span></div>
  <div class="ligne-variables"><span class="sec">Variables</span>${puce('À écrire', 'attention')}${bouton('Écrire les variables', 'compact')}</div>
  <div class="gestes">${bouton('Afficher', 'compact')}${bouton('Modifier', 'compact')}</div>
</div>`;
const ficheApres = fiche(P.aPrimary, { etat: 'À actualiser', sorte: 'attention', detail: `Planche à jour · Variables : ${valeursMarque} valeurs à écrire`, gestes: gestesFiche() });

// L'onglet Palette dit l'état de la palette ouverte dans Figma, et la revue s'ouvre d'ici.
const ligneFigma = (etat, sorte, texte, geste) => `<div class="ligne-figma">${puce(etat, sorte)}<span class="sec">${texte}</span>${geste ? `<span class="lien">${geste}</span>` : ''}</div>`;
const apercuBleuA = `<div class="carte">
    <div class="tete-apercu"><div class="onglets-theme"><span class="on">Thème Light</span><span>Thème Dark</span></div><span class="sec">Fond ▢ ${FONDS.light}</span></div>
    ${nuancier(P.aPrimary, 'light', { etiquettes: false })}
    <span class="ref-ligne">◆ Référence : nuance ${CRANS[P.aPrimary.rangs.light]}</span>
  </div>`;
const ecranCreationEtat = panneau({
  corps: `${barreSelecteur(P.aPrimary)}<div class="titre-1">Palette Bleu A</div>
  ${ligneFigma('À écrire', 'attention', `Planche à jour · Variables : ${valeursMarque} valeurs à écrire`, 'Actualiser cette palette…')}
  ${note('La carte Configuration de la palette suit, inchangée.')}
  ${apercuBleuA}
  ${repli('Teinte, saturation, luminosité', 'Aucun réglage')}
  ${repli('Garanties de contraste', resultat(P.aPrimary, 'light'))}`,
});
const variantesLigneFigma = `<div class="fp" style="width:${LARGEUR}px"><div class="fp-corps">
  ${ligneFigma('À jour', 'ok', 'Planche et variables à jour')}
  ${ligneFigma('À décider', 'attention', 'Variables : 1 retouche faite dans Figma', 'Décider…')}
  ${ligneFigma('Pas encore sur Figma', 'attention', 'Sur mesure : la planche seule', 'Générer sur Figma')}
</div></div>`;

// ---------------------------------------------------------------- piste 3 : la revue
const ambre = P.warning;
const ambreVariables = variablesDePalette(ambre);
const ambreAlias = aliasDeLaFamille(ambre);
const ambreCrees = ambreVariables + ambreAlias;
const ambreValeurs = ambreVariables + ambreAlias * 2;
const ambreBilan = resultatDesDeuxThemes(ambre);

const sortie = (on, titre, detail, etat, sorte, inactif = false) => `<div class="sortie${inactif ? ' inactif' : ''}">${caseACocher(on, inactif)}<div><b>${titre}</b><span class="sec petit">${detail}</span></div>${puce(etat, sorte)}</div>`;
const ligneCompte = (collection, creees, valeurs, chemin) => `<div class="compte"><span>${collection}</span><span><b>${creees}</b> ${creees === 1 ? 'variable créée' : 'variables créées'}</span><span><b>${valeurs}</b> ${valeurs === 1 ? 'valeur écrite' : 'valeurs écrites'}</span>${chemin ? `<span class="sec petit chemin">${chemin}</span>` : ''}</div>`;
const ligneCadres = (n, detail) => `<div class="compte"><span>Planche</span><span><b>${n}</b> ${n === 1 ? 'cadre dessiné' : 'cadres dessinés'}</span><span></span>${detail ? `<span class="sec petit chemin">${detail}</span>` : ''}</div>`;

function modale({ titre, sousTitre, corps, pied, aide }) {
  return `<div class="voile"><div class="modale">
    <div class="modale-tete"><div class="modale-titre">${titre}</div>${sousTitre ? `<span class="sec">${sousTitre}</span>` : ''}</div>
    <div class="modale-corps">${corps}</div>
    <div class="modale-pied"><span class="sec petit">${aide ?? ''}</span><div class="gestes">${pied}</div></div>
  </div></div>`;
}

const corpsRevueAmbre = `
  <div class="revue-bloc"><span class="revue-sous">Sorties</span>
    ${sortie(true, 'Planche', '1 cadre à dessiner, page « Palettes »', 'Pas encore sur Figma', 'attention')}
    ${sortie(true, 'Variables et alias', `${ambreCrees} variables à créer, ${ambreValeurs} valeurs à écrire`, 'À écrire', 'attention')}
  </div>
  <div class="revue-bloc"><span class="revue-sous">Détail</span>
    ${ligneCompte(code('primitives'), ambreVariables, ambreVariables, `${code('primitives.warning.{soft,vivid}.{light,dark}.{50…950}')} : 2 intensités × 2 thèmes × ${CRANS.length} crans`)}
    ${ligneCompte(code('theme'), ambreAlias, ambreAlias * 2, `${code('theme.warning.{soft,vivid}.{50…950}')} : un alias en light, un en dark`)}
    ${ligneCadres(1, 'Ambre')}
  </div>
  <div class="revue-bloc"><span class="revue-sous">Décisions</span><span class="sec">Aucune valeur à décider.</span></div>
  <div class="revue-bloc"><span class="revue-sous">Garanties après écriture</span><span>${resultat(ambre, 'light')} en Thème Light · ${resultat(ambre, 'dark')} en Thème Dark</span><span class="sec petit">${ambreBilan.texte}, calculées sur les valeurs qui seront écrites.</span></div>`;

function ecranRevue(largeur) {
  return panneau({
    largeur,
    hauteur: HAUTEUR,
    onglet: 'Palettes',
    corps: enTetePalettes(),
    voile: modale({
      titre: 'Actualiser sur Figma : Ambre',
      sousTitre: `${COMMUNES} · ${code('warning')} · première écriture`,
      corps: corpsRevueAmbre,
      aide: 'Le fichier est relu au clic. S\'il a changé, rien ne s\'écrit.',
      pied: `${bouton('Annuler')}${bouton('Actualiser sur Figma', 'principal')}`,
    }),
  });
}

// La revue invalidée : Rouge change de référence, et son 800 bouge dans Figma pendant la revue.
const ancien800 = P.danger.rampes.vivid.light[rang(INVALIDEE.cran)];
const neuf800 = rougeNeuf.rampes.vivid.light[rang(INVALIDEE.cran)];
const troisValeurs = (derniere, recette, figma) => `<div class="trois-valeurs">
  <div>${cellule(derniere, { h: 22 })}<span class="sec petit">Dernière appliquée</span><span class="mono petit">${derniere}</span></div>
  <div>${cellule(recette, { h: 22 })}<span class="sec petit">Recette</span><span class="mono petit">${recette}</span></div>
  <div>${cellule(figma, { h: 22 })}<span class="sec petit">Figma</span><span class="mono petit">${figma}</span></div>
</div>`;

const ecranInvalidee = panneau({
  hauteur: HAUTEUR,
  onglet: 'Palettes',
  corps: enTetePalettes(),
  voile: modale({
    titre: 'Actualiser sur Figma : Rouge',
    sousTitre: `${COMMUNES} · ${code('danger')} · nouvelle référence ${rougeNeuf.hexa}`,
    corps: `<div class="bandeau-danger" role="alert"><b>Le fichier a changé depuis l'ouverture de cette revue. Rien n'a été écrit.</b>
      <span>${code(`primitives.danger.vivid.light.${INVALIDEE.cran}`)} vaut maintenant ${INVALIDEE.figma} dans Figma. Décidez de cette valeur, puis actualisez de nouveau.</span></div>
    <div class="revue-bloc"><span class="revue-sous">Sorties</span>
      ${sortie(true, 'Planche', '1 cadre à actualiser', 'À actualiser', 'attention')}
      ${sortie(true, 'Variables et alias', `${rougeValeurs - 1} valeurs à écrire · 1 retouche à décider`, 'À décider', 'attention')}
    </div>
    <div class="revue-bloc attention"><span class="revue-sous">Décision · nouvelle depuis la relecture</span>
      <div class="conflit-tete">${code(`primitives.danger.vivid.light.${INVALIDEE.cran}`)}<span class="sec petit">Sert à : ${emploisEnMots(INVALIDEE.cran).join(', ')}</span></div>
      ${troisValeurs(ancien800, neuf800, INVALIDEE.figma)}
      ${radio('Adopter la valeur de Figma', false, `La recette garde ${INVALIDEE.figma} comme retouche.`)}
      ${radio('Remettre la valeur de la recette', false, `Figma reprend ${neuf800}.`)}
      <span class="sec petit">Rien n'est choisi d'avance.</span>
    </div>
    <div class="revue-bloc"><span class="revue-sous">Décisions déjà prises</span><span class="sec">Aucune : les autres valeurs n'ont pas bougé.</span></div>`,
    aide: '1 valeur non décidée : elle ne s’écrira pas.',
    pied: `${bouton('Annuler')}${bouton('Actualiser sur Figma', 'principal')}`,
  }),
});

// L'échec partiel : Actualiser tout, Ambre et Bleu K ; Figma refuse le mode « Marque K ».
const bleuK = entreeDe({ cle: 'kPrimary', nom: 'Bleu K', hexa: '#1D4ED8', n: 1, role: 'marque', famille: 'primary', marque: 'Marque K' }, nouvellePalette(R, 'p-0000000c', '#1D4ED8', 1));
const ecranEchec = panneau({
  onglet: 'Palettes',
  corps: `${enTetePalettes(10)}
  <div class="bilan" role="alert">
    <b>Actualisation incomplète</b>
    <span>✓ Planche : 2 cadres dessinés, Ambre et Bleu K.</span>
    <span>✓ Variables d'Ambre : ${ambreCrees} variables créées, ${ambreValeurs} valeurs écrites.</span>
    <span class="ko-t">✗ Variables de Bleu K : rien n'a été écrit. Figma refuse de créer le mode « Marque K » : ${code('brand')} a atteint le nombre de modes que l'offre du fichier admet.</span>
    <span class="sec">Libérez un mode de ${code('brand')}, ou passez le fichier dans une offre qui en admet plus. « Réessayer » relit le fichier et n'écrit que ce qui manque : 1 mode et ${variablesDePalette(bleuK)} valeurs.</span>
    <div class="gestes">${bouton('Réessayer les variables', 'principal compact')}${bouton('Détail technique', 'compact')}</div>
    <span class="sec petit">Détail technique, replié : « in addMode: Limited to 10 modes only ».</span>
  </div>
  ${groupe('Marque K', 'brand', '1 palette · variables à écrire', `
    ${fiche(bleuK, { etat: 'À écrire', sorte: 'attention', detail: `Planche à jour · Variables : mode « Marque K » à créer, ${variablesDePalette(bleuK)} valeurs à écrire`, gestes: gestesFiche() })}`)}
  ${groupe(COMMUNES, 'primitives', '5 palettes · à jour', '', { ouvert: false })}`,
});

// Actualiser tout après un réglage commun : l'intensité Soft passe de 0,45 à 0,50.
const PART_SOFT = 0.5;
const recetteSoft = { ...R, profils: { ...R.profils, soft: { part: PART_SOFT } } };
/** Les rampes d'une palette de démonstration sous une autre recette commune. */
function rampesSous(recette, p) {
  const rampes = rampesDe({ ...recette, palettes: [p.palette] }, p.palette);
  const parProfil = {};
  for (const [profil, parMode] of Object.entries(rampes)) {
    parProfil[profil] = { light: parMode.light.map((c) => ecrireHexa(c.couleur)), dark: parMode.dark.map((c) => ecrireHexa(c.couleur)) };
  }
  return parProfil;
}
const lotSoft = ['neutral', ...UTILITAIRES, 'aPrimary', 'aSecondary', 'bPrimary', 'essai'].map((k) => {
  const p = P[k];
  const apres = rampesSous(recetteSoft, p);
  const changees = Object.keys(apres).reduce((s, prof) => s + ['light', 'dark'].reduce((t, m) => t + apres[prof][m].filter((h, i) => h !== p.rampes[prof][m][i]).length, 0), 0);
  const avant = resultatDesDeuxThemes(p).total;
  const apresManquees = verifierPromesses({ ...recetteSoft, palettes: [p.palette] }, p.palette).filter((x) => x.verdict === 'manquee').length;
  return { p, changees, avant, apres: apresManquees };
}).filter((x) => x.changees > 0);
const lotSoftVariables = lotSoft.filter((x) => x.p.role !== 'hors');
const valeursSoft = lotSoftVariables.reduce((s, x) => s + x.changees, 0);
const perdantes = lotSoft.filter((x) => x.apres > x.avant);
const ligneLot = ({ p, changees, avant, apres }) => `<div class="lot-ligne"><span class="chevron">›</span><span>${pastille(p.hexa)} <b>${p.nom}</b></span><span class="sec">${p.role === 'hors' ? 'planche seule' : `${changees} valeurs`}</span><span class="${apres > avant ? 'att-t' : 'sec'}">${avant} → ${apres}</span></div>`;
const ecranToutSoft = panneau({
  hauteur: HAUTEUR,
  onglet: 'Palettes',
  corps: enTetePalettes(),
  voile: modale({
    titre: `Actualiser tout : ${lotSoft.length} palettes`,
    sousTitre: `Après « Intensité Soft » : ${virgule(R.profils.soft.part)} → ${virgule(PART_SOFT)}, dans les Réglages communs`,
    corps: `${perdantes.length ? `<div class="revue-bloc attention"><b>${perdantes.length} ${perdantes.length === 1 ? 'palette perd' : 'palettes perdent'} des garanties : ${perdantes.map((x) => x.p.nom).join(', ')}.</b><span class="sec petit">Ouvrez une ligne pour voir les paires. L'écriture reste possible.</span></div>` : ''}
    <div class="revue-bloc"><span class="revue-sous">Sorties</span>
      ${sortie(true, 'Planche', `${lotSoft.length} cadres à actualiser`, 'À actualiser', 'attention')}
      ${sortie(true, 'Variables et alias', `${valeursSoft} valeurs à écrire dans ${code('primitives')}, aucune variable créée. Les alias de ${code('theme')} ne changent pas.`, 'À écrire', 'attention')}
    </div>
    <div class="revue-bloc"><span class="revue-sous">Par palette · valeurs · garanties manquées, deux thèmes</span>${lotSoft.map(ligneLot).join('')}</div>
    <div class="revue-bloc"><span class="revue-sous">Décisions</span><span class="sec">Aucune valeur à décider.</span></div>`,
    aide: 'Le fichier est relu au clic.',
    pied: `${bouton('Annuler')}${bouton('Actualiser sur Figma', 'principal')}`,
  }),
});
const carteIntensitesSoft = `<div class="fp" style="width:${LARGEUR}px"><div class="fp-corps"><div class="carte">
  <div class="carte-titre">Intensités<span class="droite"><span class="sec">${lotSoft.length} palettes · ${valeursSoft} valeurs de variables</span>${bouton('Rétablir', 'compact')}</span></div>
  <div class="rangee"><span class="libelle">Intensité Soft</span><div class="curseur"><i style="left:${PART_SOFT * 100}%"></i></div></div>
  <span class="aide">Ce réglage change ${valeursSoft} valeurs déjà écrites dans ${code('primitives')}. Elles passent « À écrire » dans l'onglet Système.</span>
</div></div></div>`;

// ---------------------------------------------------------------- piste 4 : les retouches
const surface100 = P.danger.rampes.vivid.light[rang(100)];
const lignesPerdues = perdues.map((x) => `<span class="ko-t">✗ ${nomDeLaPaire(x)} : ${virgule(x.contraste)}:1, minimum ${virgule(x.seuil, 1)}:1</span>`).join('');

function corpsConflit(choix) {
  return `<div class="revue-bloc"><span class="revue-sous">Sorties</span>
      ${sortie(false, 'Planche', 'À jour : rien à dessiner', 'À jour', 'ok', true)}
      ${sortie(true, 'Variables et alias', '1 retouche à décider', 'À décider', 'attention')}
    </div>
    <div class="revue-bloc attention"><span class="revue-sous">Décision · Rouge</span>
      <div class="conflit-tete">${code(`primitives.danger.vivid.light.${RETOUCHE.cran}`)}<span class="sec petit">Sert à : ${emploisEnMots(RETOUCHE.cran).join(', ')}</span></div>
      ${troisValeurs(calculee, calculee, RETOUCHE.figma)}
      ${radio('Adopter la valeur de Figma', choix === 'adopter', `La recette garde ${RETOUCHE.figma} comme retouche. Les garanties se jugent sur elle.`)}
      ${radio('Remettre la valeur de la recette', choix === 'remettre', `Figma reprend ${calculee}.`)}
      ${choix === 'adopter'
        ? `<div class="garanties-choix"><b>Après adoption : ${perdues.length} ${perdues.length === 1 ? 'garantie passe' : 'garanties passent'} sous leur seuil, Thème Light, Vivid</b>${lignesPerdues}<span class="sec petit">Rouge passe de « ${resultat(P.danger, 'light')} » à « ${resultat(P.danger, 'light', avecRetouche)} » en Thème Light. L'écriture reste possible.</span></div>`
        : '<span class="sec petit">Rien n\'est choisi d\'avance. Sans choix, cette valeur reste telle quelle dans Figma et dans la recette.</span>'}
    </div>`;
}

const ecranConflit = (choix) => panneau({
  hauteur: HAUTEUR,
  onglet: 'Palettes',
  corps: enTetePalettes(),
  voile: modale({
    titre: 'Actualiser sur Figma : Rouge',
    sousTitre: `${COMMUNES} · ${code('danger')}`,
    corps: corpsConflit(choix),
    aide: choix ? 'Le fichier est relu au clic.' : '1 valeur non décidée : elle ne s’écrira pas, et Rouge restera « À décider ».',
    pied: `${bouton('Annuler')}${bouton('Actualiser sur Figma', 'principal')}`,
  }),
});

// Le cran de la référence et l'identité : la charte de Marque A a changé dans Figma.
const ecranIdentite = panneau({
  hauteur: HAUTEUR,
  onglet: 'Palettes',
  corps: enTetePalettes(),
  voile: modale({
    titre: 'Actualiser sur Figma : Bleu A',
    sousTitre: `Marque A · ${code('primary')}`,
    corps: `<div class="revue-bloc attention"><span class="revue-sous">Décision · couleur de la charte</span>
      <div class="conflit-tete">${code('brand.identity.primary')}<span class="sec petit">Mode « Marque A ». Elle égale la couleur de référence, ◆ nuance ${CRANS[P.aPrimary.rangs.light]}.</span></div>
      ${troisValeurs(P.aPrimary.hexa, P.aPrimary.hexa, IDENTITE_FIGMA)}
      ${radio('Adopter comme nouvelle couleur de référence', true, 'La palette se recalcule autour d\'elle.')}
      ${radio('Remettre la valeur de la recette', false, `Figma reprend ${P.aPrimary.hexa}.`)}
      <div class="garanties-choix"><b>La palette avec ${IDENTITE_FIGMA}</b>
        ${nuancier(bleuNeuf, 'light', { h: 14, numeros: false, etiquettes: false })}
        <span>◆ nuance ${CRANS[bleuNeuf.rangs.light]} en Thème Light, ${CRANS[bleuNeuf.rangs.dark]} en Thème Dark. ${resultat(bleuNeuf, 'light')} en Light, ${resultat(bleuNeuf, 'dark')} en Dark.</span>
        <span class="sec petit">${bleuValeurs} valeurs de ${code('brand')} changent dans le mode « Marque A », identité comprise. Le cadre passera « À actualiser ».</span>
      </div>
      <span class="sec petit">Le cran ◆ n'admet pas de retouche : la référence y est toujours exacte.</span>
    </div>`,
    aide: 'Le fichier est relu au clic.',
    pied: `${bouton('Annuler')}${bouton('Actualiser sur Figma', 'principal')}`,
  }),
});

// Le détail d'une nuance retouchée, après adoption.
const pairesDu700 = emploisDuCran(CRANS, rang(RETOUCHE.cran)).map(({ emploi, decalage }) => {
  const paires = pairesDuMembre(apresAdoption, RETOUCHE.profil, RETOUCHE.mode, emploi, decalage);
  const lignes = paires.map((x) => `<span class="${x.verdict === 'manquee' ? 'ko-l' : ''}">${x.verdict === 'manquee' ? '✗' : '✓'} ${nomDeLaPaire(x)} : ${virgule(x.contraste)}:1</span>`).join('');
  return `<div class="usage"><b>${code(emploi)} ${ETAT[decalage]}</b>${lignes}</div>`;
}).join('');

const detailRetouche = `<div class="detail" style="background:${FONDS.light};color:#1E1E1E">
  <div class="d-tete">${cellule(RETOUCHE.figma, { h: 40, marque: '✎' })}<div><b class="d-titre">Vivid · ${RETOUCHE.cran}</b><br><span class="mono">${RETOUCHE.figma}</span> <span class="souligne">Copier</span></div></div>
  <div class="d-encart"><span class="d-sous">Retouche adoptée</span>
    <span>Valeur calculée : <span class="mono">${calculee}</span> ${cellule(calculee, { h: 12 })}</span>
    <span class="souligne">Rétablir la valeur calculée</span>
    <span class="sec-l">La sortie Variables passera alors « À écrire ».</span>
  </div>
  <div class="d-encart"><span class="d-sous">Sert à</span>${pairesDu700}</div>
</div>`;

const ecranRetouche = panneau({
  corps: `${barreSelecteur(P.danger)}<div class="titre-1">Palette Rouge</div>
  ${repli('Configuration de la palette', `Utilitaire · ${code('danger')}`)}
  <div class="carte">
    <div class="tete-apercu"><div class="onglets-theme"><span class="on">Thème Light</span><span>Thème Dark</span></div><span class="sec">Fond ▢ ${FONDS.light}</span></div>
    ${nuancier(P.danger, 'light', { surcharges: avecRetouche, choisie: cleRetouche })}
    ${detailRetouche}
    <span class="ref-ligne">◆ Référence : ${NOM_PROFIL[P.danger.porteur]} · nuance ${CRANS[P.danger.rangs.light]} · ✎ 1 nuance retouchée</span>
  </div>`,
});

// Trois retouches dans Rouge, Vivid, Thème Light : une décision pour toutes, et une par valeur.
const RETOUCHES_ROUGE = [[700, '#DC2626'], [800, '#991B1B'], [900, '#7F1D1D']];
const toutesAdoptees = Object.fromEntries(RETOUCHES_ROUGE.map(([c, h]) => [cle('vivid', 'light', c), h]));
const perduesToutes = promesses(P.danger, toutesAdoptees).filter((x) => x.verdict === 'manquee');
const ligneRetouche = ([cran, figma]) => {
  const recette = P.danger.rampes.vivid.light[rang(cran)];
  return `<div class="retouche-ligne">${code(`vivid.light.${cran}`)}<span class="deux-pastilles">${cellule(recette, { h: 16 })}<span class="sec">→</span>${cellule(figma, { h: 16 })}</span>${segment(['Adopter', 'Remettre'], null, 'mini')}</div>`;
};
const ecranRetouchesGroupees = panneau({
  hauteur: HAUTEUR,
  onglet: 'Palettes',
  corps: enTetePalettes(),
  voile: modale({
    titre: 'Actualiser sur Figma : Rouge',
    sousTitre: `${COMMUNES} · ${code('danger')}`,
    corps: `<div class="revue-bloc"><span class="revue-sous">Sorties</span>
      ${sortie(false, 'Planche', 'À jour : rien à dessiner', 'À jour', 'ok', true)}
      ${sortie(true, 'Variables et alias', `${RETOUCHES_ROUGE.length} retouches à décider`, 'À décider', 'attention')}
    </div>
    <div class="revue-bloc attention"><span class="revue-sous">Décisions · ${RETOUCHES_ROUGE.length} retouches faites dans Figma</span>
      <div class="gestes">${bouton(`Adopter les ${RETOUCHES_ROUGE.length}`, 'compact')}${bouton(`Remettre les ${RETOUCHES_ROUGE.length}`, 'compact')}</div>
      <span class="sec petit">Recette → Figma, par valeur. La dernière valeur appliquée égale la recette : la recette n'a pas changé depuis.</span>
      ${RETOUCHES_ROUGE.map(ligneRetouche).join('')}
      <div class="garanties-choix"><b>Si les ${RETOUCHES_ROUGE.length} sont adoptées : ${perduesToutes.length} ${perduesToutes.length === 1 ? 'garantie passe' : 'garanties passent'} sous leur seuil</b>${perduesToutes.map((x) => `<span class="ko-t">✗ ${nomDeLaPaire(x)} : ${virgule(x.contraste)}:1</span>`).join('')}</div>
    </div>`,
    aide: `${RETOUCHES_ROUGE.length} valeurs non décidées : elles ne s’écriront pas.`,
    pied: `${bouton('Annuler')}${bouton('Actualiser sur Figma', 'principal')}`,
  }),
});

// ---------------------------------------------------------------- piste 5 : le jeu de départ
const ligneCommune = (k) => `<div class="depart-ligne"><span class="case on">✓</span>${code(P[k].famille)}<i class="pipette petite" style="background:${P[k].hexa}"></i><span class="mono sec">${P[k].hexa}</span>${nuancier(P[k], 'light', { h: 8, numeros: false, etiquettes: false })}</div>`;
const caseMarque = (hexa) => (hexa
  ? `<div class="champ-ligne boite">${pastille(hexa)}<span class="mono">${hexa}</span></div>`
  : '<div class="champ-ligne boite vide"><span class="att-t">À renseigner</span></div>');
const ligneMarque = (nom, a, b) => `<div class="marque-ligne">${champ(nom)}${caseMarque(a)}${caseMarque(b)}<span class="sec">✕</span></div>`;
const PALETTES_DU_JEU = 5 + 2 * 2;
const ecranDepart = panneau({
  corps: `${barreSelecteur(null)}
  <div class="carte">
    <div class="carte-titre">Nouvelle palette</div>
    ${segment(['Une palette', 'Le jeu de départ'], 'Le jeu de départ', 'court')}
    <span class="aide">Les palettes que l'architecture multi-marques demande, chacune avec son rôle. Une ligne par marque : un design system à une marque garde la première. Chaque référence se change ici ou après création.</span>
    <div class="depart-bloc"><span class="revue-sous">${COMMUNES} ${code('primitives')}</span>
      ${['neutral', ...UTILITAIRES].map(ligneCommune).join('')}
    </div>
    <div class="depart-bloc"><span class="revue-sous">Marques ${code('brand')}</span>
      <div class="marque-ligne entete"><span class="libelle">Marque</span><span class="libelle">Primaire</span><span class="libelle">Secondaire <span class="lien">Retirer</span></span><span></span></div>
      ${ligneMarque('Marque A', P.aPrimary.hexa, P.aSecondary.hexa)}
      ${ligneMarque('Marque B', P.bPrimary.hexa, null)}
      <span class="avertissement">Une famille vaut pour toutes les marques : renseignez la secondaire de Marque B, ou retirez la colonne.</span>
      <span class="lien">+ Ajouter une marque</span>
    </div>
    <span class="aide">Crée ${PALETTES_DU_JEU} palettes dans la recette du fichier. Aucune variable ni aucun cadre avant « Actualiser sur Figma », dans l'onglet Système.</span>
    <div class="gestes">${bouton(`Créer ${PALETTES_DU_JEU} palettes`, 'principal inactif')}${bouton('Annuler')}</div>
  </div>`,
});

// La case vide de l'onglet Système ouvre la création, remplie : rôle, marque et famille.
const orB = entreeDe({ cle: 'bSecondary', nom: 'Or B', hexa: '#C99700', n: 1, role: 'marque', famille: 'secondary', marque: 'Marque B' }, nouvellePalette(R, 'p-0000000b', '#C99700', 1));
const ecranCreationPreremplie = panneau({
  corps: `${barreSelecteur(P.bPrimary)}
  ${carteCreation('Marque', orB, { origine: 'Reprise de la sélection : « Charte B / Or »', entete: `<span class="sec">Ouverte depuis la case ${code('secondary')} de Marque B, dans l'onglet Système.</span>` })}`,
});

// ---------------------------------------------------------------- piste 6 : la sélection
const pickerSelection = `<div class="picker">
  <div class="sv" style="background:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(214 76% 48%))"><i style="left:86%;top:15%"></i></div>
  <div class="hue"><i style="left:59%"></i></div>
  <div class="picker-ligne">${liste('Hex', 'etroit')}${champ('#1E6FD9', 'grand')}</div>
  <div class="picker-sep"></div>
  <span class="picker-titre">Dans la sélection · 3 couleurs</span>
  <div class="picker-pastilles">${[['#1E6FD9', 'Logo'], ['#E08A00', 'Accent'], ['#0B2545', 'Titre']].map(([h, n]) => `<span class="sel-puce"><i style="background:${h}"></i>${n}</span>`).join('')}</div>
  <span class="sec petit">2 calques ignorés : dégradé, opacité réduite.</span>
  <div class="picker-sep"></div>
  <span class="picker-titre">Nuances du Thème Light</span>
  <div class="picker-pastilles">${P.aPrimary.rampes.unique.light.map((h) => `<i style="background:${h}"></i>`).join('')}</div>
</div>`;
const ecranSelection = panneau({
  corps: `${barreSelecteur(P.aPrimary)}<div class="titre-1">Palette Bleu A</div>
  <div class="carte" style="position:relative;min-height:470px">
    <div class="carte-titre">Configuration de la palette</div>
    <div class="deux-col">
      <div><span class="libelle">Nom de la palette</span>${champ('Bleu A')}</div>
      <div><span class="libelle">Couleur de référence</span>${hexaChamp(P.aPrimary.hexa)}</div>
    </div>
    <div class="ancre-picker">${pickerSelection}</div>
  </div>`,
});

// ---------------------------------------------------------------- piste 7 : les statuts
// Les rampes vives d'une palette : Vivid pour un utilitaire, la rampe unique pour une marque.
const vive = (k) => (P[k].rampes.vivid ?? P[k].rampes.unique).light;
function distance(a, b, vision) {
  const somme = [500, 600, 700].reduce((total, cran) => total + distanceOk(
    VISIONS[vision](lireHexa(vive(a)[rang(cran)])),
    VISIONS[vision](lireHexa(vive(b)[rang(cran)])),
  ), 0);
  return somme / 3;
}
const PAIRES_UTILITAIRES = [];
for (let a = 0; a < UTILITAIRES.length; a += 1) for (let b = a + 1; b < UTILITAIRES.length; b += 1) PAIRES_UTILITAIRES.push([UTILITAIRES[a], UTILITAIRES[b]]);
// Les palettes de la marque choisie, comparées aux utilitaires : elles s'affichent ensemble.
const MARQUE_A = ['aPrimary', 'aSecondary'];
const PAIRES_MARQUE_A = MARQUE_A.flatMap((m) => UTILITAIRES.map((u) => [m, u]));
const prochesSous = (vision, paires = PAIRES_UTILITAIRES) => paires.map(([a, b]) => ({ a, b, d: distance(a, b, vision) })).filter(({ d }) => d < R.seuils.palettesProches);

const STATUTS = {
  danger: ['✕', 'Paiement refusé'],
  warning: ['!', 'Session bientôt expirée'],
  success: ['✓', 'Profil enregistré'],
  info: ['i', 'Nouvelle version disponible'],
  aPrimary: ['→', 'Action · Bleu A'],
  aSecondary: ['★', 'Mise en avant · Orange A'],
};
function specimen(k, vision) {
  const r = vive(k);
  const [icone, texte] = STATUTS[k];
  const fond = voir(vision, r[rang(100)]);
  const bord = voir(vision, r[rang(600)]);
  const encre = voir(vision, r[rang(700)]);
  return `<div class="statut" style="background:${fond};border-color:${bord};color:${encre}"><span class="statut-icone" style="border-color:${encre}">${icone}</span>${texte}</div>`;
}
const phraseProches = (proches) => proches.map(({ a, b, d }) => `${P[a].nom} et ${P[b].nom} (${virgule(d, 3)})`).join(', ');
function carteStatuts(vision) {
  const proches = prochesSous(vision, [...PAIRES_UTILITAIRES, ...PAIRES_MARQUE_A]);
  return `<div class="carte statuts">
    <div class="carte-titre">⌄ Distinguer les statuts<span class="droite"><span class="sec">Vivid · Thème Light</span></span></div>
    <div class="deux-col"><div><span class="libelle">Vision</span>${liste(NOM_VISION[vision])}</div><div><span class="libelle">Avec la marque</span>${liste('Marque A')}</div></div>
    <div class="statuts-grille" style="background:${FONDS.light}">${[...UTILITAIRES, ...MARQUE_A].map((k) => specimen(k, vision)).join('')}</div>
    <span>${proches.length
      ? `Sous cette vision, ${phraseProches(proches)} passent sous le seuil des palettes proches, ${virgule(R.seuils.palettesProches)}.`
      : 'Aucune paire ne passe sous le seuil des palettes proches.'} Un statut s'accompagne d'une icône ou d'un texte (WCAG 1.4.1).</span>
    <span class="sec petit">Simulation d'une dichromacie complète : Viénot 1999 pour la protanopie et la deutéranopie, Brettel 1997 pour la tritanopie. Elle ne prouve pas la lisibilité d'un composant. Les garanties restent jugées en vision normale.</span>
  </div>`;
}
const vignetteStatutsNormale = `<div class="fp" style="width:${LARGEUR}px"><div class="fp-corps">${carteStatuts('normale')}</div></div>`;
const ecranVision = panneau({
  onglet: 'Palettes',
  corps: `${enTetePalettes()}
  ${groupe(COMMUNES, 'primitives', '5 palettes', `${carteStatuts('deuteranopie')}
    ${UTILITAIRES.map((k) => fiche(P[k], k === 'danger' ? { etat: 'À décider', sorte: 'attention', attente: attenteRetouche, vision: 'deuteranopie', courte: true } : { etat: 'À jour', sorte: 'ok', vision: 'deuteranopie', courte: true })).join('')}`)}`,
});

function bandeVisions() {
  const tete = `<span></span>${Object.keys(VISIONS).map((v) => `<span class="bv-tete">${NOM_VISION[v]}</span>`).join('')}`;
  const lignes = UTILITAIRES.map((k) => `<span class="mono">${P[k].famille}</span>${Object.keys(VISIONS).map((v) => `<span class="bv-rampe">${[500, 600, 700].map((c) => `<i style="background:${voir(v, P[k].rampes.vivid.light[rang(c)])}"></i>`).join('')}</span>`).join('')}`).join('');
  return `<div class="bande-visions">${tete}${lignes}</div>`;
}

// ---------------------------------------------------------------- pistes 8 et 9 : réglages
const bilanFonds = [neutreRegle, ...[...UTILITAIRES, 'aPrimary', 'aSecondary', 'bPrimary', 'essai'].map((k) => P[k])].map((p) => ({ nom: p.nom, ...bilanDesFonds(p) }));
const ecranFonds = panneau({
  reglages: true,
  corps: `<div class="carte">
    <div class="carte-titre">Couleurs de fond<span class="droite"><span class="sec">9 palettes concernées</span>${bouton('Rétablir', 'compact')}</span></div>
    <div class="rangee"><span class="libelle">Source des fonds</span>${segment(['Saisis', 'Lire sur le neutre'], 'Lire sur le neutre', 'court')}</div>
    <div class="conversion">
      <div class="conversion-titre">Lire les fonds sur Neutre : ce qui change</div>
      <div class="deux-col">
        <div><span class="libelle">Fond du thème Light</span><div class="champ-ligne">${pastille(FONDS.light)}<span class="mono">${FONDS.light}</span> → ${pastille(fondsChauds.light)}<span class="mono">${fondsChauds.light}</span></div></div>
        <div><span class="libelle">Fond du thème Dark</span><div class="champ-ligne">${pastille(FONDS.dark)}<span class="mono">${FONDS.dark}</span> → ${pastille(fondsChauds.dark)}<span class="mono">${fondsChauds.dark}</span></div></div>
      </div>
      <div class="table-bilan"><span class="entete">Palette</span><span class="entete">Garanties manquées avant</span><span class="entete">Après</span>
        ${bilanFonds.map(({ nom, avant, apres }) => `<span>${nom}</span><span>${avant}</span><span class="${apres > avant ? 'att-t' : ''}">${apres}</span>`).join('')}
      </div>
      <span class="aide">Le fond de l'aperçu ouvrira la palette Neutre. Si elle disparaît ou change de rôle, les fonds gardent ces valeurs et le lien se coupe.</span>
      <div class="gestes">${bouton('Lier les fonds', 'principal')}${bouton('Annuler')}</div>
    </div>
  </div>`,
});

const ecranVariables = panneau({
  reglages: true,
  corps: `<div class="carte">
    <div class="carte-titre">⌄ Collections des variables<span class="droite"><span class="sec">8 palettes à rôle</span></span></div>
    <div class="trois">
      <div><span class="libelle">Neutre et utilitaires</span>${champ('primitives')}</div>
      <div><span class="libelle">Marques</span>${champ('brand')}</div>
      <div><span class="libelle">Alias des composants</span>${champ('theme')}</div>
    </div>
    <span class="aide">Le plugin suit chaque collection par son identifiant. Un nom changé ici se renomme dans Figma à la prochaine actualisation, après la revue. Les marques s'ajoutent, se renomment et se suivent dans l'onglet Système, sur leur groupe.</span>
    <span class="aide">Les variables de ${code('primitives')} et de ${code('brand')} n'apparaissent dans aucun sélecteur de Figma. Leur liste de portées est vide. ${code('theme')} garde les portées de remplissage et de contour. Dev Mode montre ${code('theme.danger.vivid.700')} en ${code('var(--theme-danger-vivid-700)')}.</span>
  </div>
  ${repli('Contenu des planches', 'Tout est généré · Français')}`,
});

const contenuPlanches = `<div class="fp" style="width:${LARGEUR}px"><div class="fp-corps"><div class="carte">
  <div class="carte-titre">⌄ Contenu des planches<span class="droite"><span class="sec">Tout est généré · Français</span></span></div>
  <div class="rangee"><span class="libelle">Langue des planches</span>${segment(['Français', 'English'], 'Français', 'court')}</div>
  <span class="aide">Rangée dans la recette : deux designers qui génèrent la même palette obtiennent la même planche. La langue de l'interface reste votre préférence.</span>
  ${note('Suivent les interrupteurs actuels, un par partie et par thème.')}
</div></div></div>`;

const aideVocabulaire = `<div class="fp" style="width:${LARGEUR}px"><div class="fp-corps"><div class="carte" style="position:relative;min-height:190px">
  <div class="rangee"><span class="libelle">Référence exacte dans <span class="aide-rond on">?</span></span>${segment(['Auto', 'Soft', 'Vivid'], 'Auto', 'court')}</div>
  <div class="bulle" role="tooltip">L'intensité qui contient votre couleur telle quelle ; l'autre se calcule autour d'elle. Auto choisit celle dont la saturation est la plus proche de celle de votre couleur, Vivid à égalité. Un réglage de Teinte, saturation, luminosité fige ce choix.</div>
</div></div></div>`;

// ---------------------------------------------------------------- piste 11 : une rampe existante
// Une rampe de Bleu A faite à l'œil, Thème Light seulement : le 600 est la couleur de la charte.
const OEIL = ['#E8F1FD', '#C7DCFA', '#9DC2F6', '#6FA5F0', '#4A8EEA', '#3480E6', '#1E6FD9', '#1B63C4', '#1856A9', '#134385', '#0D2E5C'];
const bleuA = P.aPrimary;
const calculeeA = bleuA.rampes.unique.light;
const surchargesOeil = Object.fromEntries(OEIL.map((h, i) => [cle('unique', 'light', CRANS[i]), h]).filter(([k, h], i) => h !== calculeeA[i] && i !== bleuA.rangs.light));
const manqueesDe = (surcharges) => promesses(bleuA, surcharges).filter((x) => x.verdict === 'manquee');
const oeilManquees = manqueesDe(surchargesOeil);
const calculeeManquees = manqueesDe({});
/**
 * Rétablit une à une les nuances reprises qui font manquer une garantie, en
 * prenant chaque fois celle qui en rend le plus, jusqu'à ne manquer que ce que
 * la rampe calculée manque déjà.
 */
function rapprocher(surcharges) {
  const courant = { ...surcharges };
  const retablies = [];
  while (manqueesDe(courant).length > calculeeManquees.length) {
    let meilleur = null;
    for (const k of Object.keys(courant)) {
      const essai = { ...courant };
      delete essai[k];
      const n = manqueesDe(essai).length;
      if (!meilleur || n < meilleur.n) meilleur = { k, n };
    }
    delete courant[meilleur.k];
    retablies.push(Number(meilleur.k.split('/')[2]));
  }
  return { gardees: courant, retablies: retablies.sort((a, b) => a - b) };
}
const rapproche = rapprocher(surchargesOeil);
const nbReprises = Object.keys(surchargesOeil).length;
const ecartsOeil = OEIL.map((h, i) => distanceOk(lireHexa(h), lireHexa(calculeeA[i])));
const listeCrans = (crans) => crans.map(String).join(', ').replace(/, (\d+)$/, ' et $1');
const rampeNue = (hexas, { h = 16, marques = [] } = {}) => `<div class="surface" style="background:${FONDS.light};color:#1E1E1E"><div class="grille nue">${hexas.map((x, i) => cellule(x, { h, marque: marques[i] ?? '' })).join('')}</div></div>`;
const numeros = `<div class="grille nue numeros">${CRANS.map((c) => `<span class="num">${c}</span>`).join('')}</div>`;

const ecranReprendre = panneau({
  corps: `${barreSelecteur(null)}
  <div class="carte">
    <div class="carte-titre">Nouvelle palette</div>
    <div class="rangee"><span class="libelle">Depuis</span>${segment(['Une couleur', 'Une rampe existante'], 'Une rampe existante', 'court')}</div>
    <span class="sec">${OEIL.length} calques lus dans la sélection, rangés du plus clair au plus foncé : « Bleu/50 » à « Bleu/950 ». Une rampe se lit aussi dans un groupe de variables (piste 12).</span>
    <div class="deux-col">
      <div><span class="libelle">Nom de la palette</span>${champ('Bleu A')}</div>
      <div><span class="libelle">Couleur de référence</span>${liste(`${pastille(OEIL[bleuA.rangs.light])} nuance ${CRANS[bleuA.rangs.light]} · ${OEIL[bleuA.rangs.light]}`)}<span class="aide petit">La couleur de la charte, gardée telle quelle.</span></div>
    </div>
    ${rangeeRole('Marque')}
    <div class="aa"><span class="revue-sous">Thème Light · la rampe lue, puis la rampe calculée</span>
      ${numeros}${rampeNue(OEIL, { marques: OEIL.map((_, i) => (i === bleuA.rangs.light ? '◆' : '')) })}${rampeNue(calculeeA, { marques: calculeeA.map((_, i) => (i === bleuA.rangs.light ? '◆' : '')) })}
      <div class="grille nue numeros">${ecartsOeil.map((d) => `<span class="num">${d < 0.0005 ? '=' : virgule(d, 3).replace(/^0/, '')}</span>`).join('')}</div>
      <span class="sec petit">Dernière ligne : l'écart de chaque nuance, en distance OKLab. Le Thème Dark n'a rien à lire : le moteur le calcule.</span>
    </div>
    <div class="deux-col">
      <div class="revue-bloc"><span class="revue-sous">Garder la rampe lue</span><span class="${oeilManquees.length ? 'att-t' : ''}">${oeilManquees.length} garanties manquées</span><span class="sec petit">${nbReprises} nuances reprises, marquées ✎</span></div>
      <div class="revue-bloc"><span class="revue-sous">Partir de la rampe calculée</span><span>${calculeeManquees.length} garanties manquées</span><span class="sec petit">Aucune nuance reprise</span></div>
    </div>
    <div class="gestes">${bouton('Créer avec la rampe lue', 'principal')}${bouton('Créer avec la rampe calculée')}${bouton('Annuler')}</div>
  </div>`,
});

const marquesAudit = (surcharges) => Object.fromEntries(Object.entries(surcharges));
const ecranAudit = panneau({
  corps: `${barreSelecteur(bleuA)}<div class="titre-1">Palette Bleu A</div>
  ${note('La carte Configuration de la palette suit, inchangée.')}
  <div class="carte">
    <div class="tete-apercu"><div class="onglets-theme"><span class="on">Thème Light</span><span>Thème Dark</span></div><span class="sec">Fond ▢ ${FONDS.light}</span></div>
    ${nuancier(bleuA, 'light', { surcharges: marquesAudit(surchargesOeil), etiquettes: false, attente: Object.fromEntries(rapproche.retablies.map((c) => [cle('unique', 'light', c), true])) })}
    <span class="ref-ligne">◆ Référence : nuance ${CRANS[bleuA.rangs.light]} · ✎ ${nbReprises} nuances reprises de la rampe lue</span>
  </div>
  <div class="avertissement"><b>${oeilManquees.length} garanties manquées en Thème Light, ${calculeeManquees.length} avec la rampe calculée.</b><br>Les nuances ${listeCrans(rapproche.retablies)}, pointées, en sont la cause. Les rétablir garde ${nbReprises - rapproche.retablies.length} nuances reprises et revient à ${manqueesDe(rapproche.gardees).length} garantie${manqueesDe(rapproche.gardees).length > 1 ? 's' : ''} manquée${manqueesDe(rapproche.gardees).length > 1 ? 's' : ''}.<div class="gestes" style="margin-top:6px">${bouton(`Rétablir ${listeCrans(rapproche.retablies)}`, 'compact')}${bouton('Tout rétablir', 'compact')}</div></div>
  ${repli('Garanties de contraste', `Garanties ✗ ${oeilManquees.length} · Thème Light`)}`,
});

// ---------------------------------------------------------------- piste 12 : des variables existantes
const ecranRelier = panneau({
  corps: `${barreSelecteur({ ...bleuA, nom: 'Bleu' })}<div class="titre-1">Palette Bleu</div>
  <div class="carte">
    <div class="carte-titre">Configuration de la palette</div>
    ${rangeeRole('Sur mesure')}
    <div class="rangee"><span class="libelle">Variables</span>${segment(['Aucune', 'Variables existantes…'], 'Variables existantes…', 'court')}</div>
    <div class="conversion">
      <div class="conversion-titre">Relier Bleu à des variables existantes</div>
      <div class="deux-col">
        <div><span class="libelle">Collection</span>${liste('Colors')}</div>
        <div><span class="libelle">Nom des variables</span>${champ('color/blue/{nuance}')}<span class="aide petit">{nuance} vaut 50, 100 … 950. {intensité} vaut soft ou vivid.</span></div>
      </div>
      <div class="deux-col">
        <div><span class="libelle">Thème Light dans le mode</span>${liste('Light')}</div>
        <div><span class="libelle">Thème Dark dans le mode</span>${liste('Dark')}</div>
      </div>
      <div class="table-marques">
        <div class="tm-ligne entete"><span>Trouvées</span><span>${CRANS.length - 1} variables sur ${CRANS.length}</span><span></span></div>
        <div class="tm-ligne"><span class="mono">color/blue/950</span><span class="att-t">Absente : cette nuance ne s'écrira pas</span><span class="lien">La créer</span></div>
        <div class="tm-ligne"><span class="mono">color/blue/25</span><span class="sec">Hors de la liste des nuances : le plugin n'y touche pas</span><span></span></div>
      </div>
      <span class="aide">Ces variables n'ont jamais été écrites par le plugin : à la première actualisation, leurs ${(CRANS.length - 1) * 2} valeurs se décident en une fois, les remplacer ou les reprendre comme rampe lue (piste 11). Une variable qui est un alias n'est jamais remplacée.</span>
      <div class="gestes">${bouton('Relier', 'principal')}${bouton('Annuler')}</div>
    </div>
  </div>`,
});

const ecranPremiereLiaison = panneau({
  hauteur: HAUTEUR,
  onglet: 'Palettes',
  corps: enTetePalettes(),
  voile: modale({
    titre: 'Actualiser sur Figma : Bleu',
    sousTitre: `Sur mesure · ${code('Colors / color/blue')} · première actualisation`,
    corps: `<div class="revue-bloc"><span class="revue-sous">Sorties</span>
      ${sortie(true, 'Planche', '1 cadre à dessiner', 'Pas encore sur Figma', 'attention')}
      ${sortie(true, 'Variables', `${(CRANS.length - 1) * 2} valeurs existantes à décider, ${CRANS.length - 1} variables par mode`, 'À décider', 'attention')}
    </div>
    <div class="revue-bloc attention"><span class="revue-sous">Décision · les valeurs présentes dans Figma</span>
      <div class="aa"><span class="sec petit">Mode Light : Figma, puis la recette</span>${rampeNue(OEIL, { h: 14 })}${rampeNue(calculeeA, { h: 14 })}</div>
      ${radio('Remplacer par la recette', false, `Figma prend la rampe calculée. ${calculeeManquees.length} garanties manquées.`)}
      ${radio('Reprendre les valeurs de Figma', false, `La recette les garde comme nuances reprises ✎. ${oeilManquees.length} garanties manquées ; l'onglet Palette propose ensuite de rétablir ${listeCrans(rapproche.retablies)}.`)}
      <span class="sec petit">Une décision pour les ${(CRANS.length - 1) * 2} valeurs. « Choisir par nuance » ouvre une ligne par valeur.</span>
    </div>`,
    aide: 'Sans choix, les valeurs de Figma restent telles quelles.',
    pied: `${bouton('Annuler')}${bouton('Actualiser sur Figma', 'principal')}`,
  }),
});

// ---------------------------------------------------------------- piste 13 : des palettes proches
const bleuKPal = bleuK;
const ecartsK = calculeeA.map((h, i) => distanceOk(lireHexa(h), lireHexa(bleuKPal.rampes.unique.light[i])));
const ecranComparer = panneau({
  corps: `${barreSelecteur(bleuA)}<div class="titre-1">Palette Bleu A</div>
  ${note('La carte Configuration de la palette suit, inchangée.')}
  <div class="carte">
    <div class="tete-apercu"><div class="onglets-theme"><span class="on">Thème Light</span><span>Thème Dark</span></div><span class="droite-apercu">${liste(`${pastille(bleuKPal.hexa)} Comparer à Bleu K`, 'compact-liste')}<span class="sec">Fond ▢ ${FONDS.light}</span></span></div>
    <div class="surface" style="background:${FONDS.light};color:#1E1E1E"><div class="grille">
      <span></span>${CRANS.map((c) => `<span class="num">${c}</span>`).join('')}
      <span class="prof">A</span>${calculeeA.map((h, i) => cellule(h, { marque: i === bleuA.rangs.light ? '◆' : '' })).join('')}
      <span class="prof">K</span>${bleuKPal.rampes.unique.light.map((h, i) => cellule(h, { marque: i === bleuKPal.rangs.light ? '◆' : '' })).join('')}
      <span class="prof">Δ</span>${ecartsK.map((d) => `<span class="num">${virgule(d, 3).replace(/^0/, '')}</span>`).join('')}
    </div></div>
    <span class="ref-ligne">◆ Référence : nuance ${CRANS[bleuA.rangs.light]} · Bleu K : nuance ${CRANS[bleuKPal.rangs.light]}</span>
    <span class="sec">Écart sur 500, 600 et 700 : ${virgule(distanceDePalettes({ ...R, palettes: [bleuA.palette, bleuKPal.palette] }, bleuA.palette, bleuKPal.palette), 3)}. Marque A et Marque K ne s'affichent jamais ensemble : aucune alerte.</span>
  </div>`,
});

/** Deux palettes s'affichent ensemble si elles partagent un mode de `brand`, ou si l'une est commune. */
function coexistent(a, b) {
  const commune = (p) => p.role === 'neutre' || p.role === 'utilitaire' || p.role === 'hors';
  if (commune(a) || commune(b)) return true;
  return a.marque === b.marque;
}
const SYSTEME_ET_K = [...SYSTEME.map((m) => P[m.cle]), bleuK];
const recetteSysteme = { ...R, palettes: SYSTEME_ET_K.map((p) => p.palette) };
const PAIRES_PROCHES = [];
SYSTEME_ET_K.forEach((a, i) => SYSTEME_ET_K.slice(i + 1).forEach((b) => {
  const d = distanceDePalettes(recetteSysteme, a.palette, b.palette);
  if (d !== null && d < R.seuils.palettesProches) PAIRES_PROCHES.push({ a, b, d, garde: coexistent(a, b) });
}));
const nomRole = (p) => (p.role === 'marque' ? p.marque : p.role === 'hors' ? 'Sur mesure' : COMMUNES);
const tableProches = `<div class="table"><table><thead><tr><th>Paire</th><th>Écart</th><th>Où</th><th>Alerte aujourd'hui</th><th>Alerte proposée</th></tr></thead><tbody>
${PAIRES_PROCHES.map(({ a, b, d, garde }) => `<tr><td>${a.nom} et ${b.nom}</td><td class="num">${virgule(d, 3)}</td><td>${nomRole(a)} · ${nomRole(b)}</td><td>Oui</td><td>${garde ? 'Oui' : 'Non : jamais dans le même mode de <code>brand</code>'}</td></tr>`).join('')}
</tbody></table></div>`;

// ---------------------------------------------------------------- piste 14 : régler en voyant
const curseur = (libelle, valeur, pos) => `<div class="rangee-curseur"><span class="libelle">${libelle}</span><div class="curseur"><i style="left:${pos}%"></i></div>${champ(valeur, 'etroit-court')}</div>`;
const ecranTemoin = panneau({
  corps: `${note('L\'aperçu est plus haut, hors de vue.')}
  <div class="carte">
    <div class="carte-titre">⌄ Teinte, saturation, luminosité<span class="droite"><span class="sec">Vivid : teinte +6°</span></span></div>
    <div class="temoin">${rampeNue(P.danger.rampes.vivid.light, { h: 10 })}</div>
    ${segment(['Vivid ◆', 'Soft', 'Les deux'], 'Vivid ◆', 'court')}
    ${curseur('Teinte', '+6°', 60)}
    ${curseur('Saturation', '95 %', 95)}
    ${curseur('Luminosité', '0,000', 71)}
  </div>
  ${repli('Dérive de teinte', 'Tailwind · synchronisée')}`,
});

// ---------------------------------------------------------------- parcours
const etape = (titre, outil, etat) => `<div class="etape ${etat}"><b>${titre}</b><span>${outil}</span></div>`;
const parcoursAvant = `<div class="parcours">
  ${etape('Composer et juger', 'Onglet Création', 'fait')}
  ${etape('Documenter', 'Onglet Palettes, planche', 'fait')}
  ${etape(`Saisir ${VALEURS_AUJOURD_HUI} valeurs`, 'Panneau des variables, à la main', 'manuel')}
  ${etape('Publier la bibliothèque', 'Figma', 'fait')}
  ${etape('Exporter les tokens', 'UCM Exporter', 'fait')}
</div>`;
const parcoursApres = `<div class="parcours">
  ${etape('Composer ou reprendre, avec un rôle', 'Onglet Palette : une couleur, une rampe lue, le jeu de départ', 'change')}
  ${etape('Juger', 'Garanties, interface de test, statuts avec la marque', 'change')}
  ${etape('Actualiser sur Figma', 'En tête de l\'onglet Système, ou depuis la palette ouverte ; revue', 'change')}
  ${etape('Publier la bibliothèque', 'Figma', 'fait')}
  ${etape('Exporter les tokens', 'UCM Exporter, inchangé', 'fait')}
</div>`;

// ---------------------------------------------------------------- scénarios du designer
const SCENARIOS = [
  ['Un design system neuf', 'Fichier vide : « Le jeu de départ », une ligne par marque, puis « Actualiser sur Figma… » en tête de l\'onglet Système', 'Le plugin s\'ouvrait sur une palette à choisir ; après la création, rien ne disait que les variables restaient à écrire', 'Flux, 2, 5'],
  ['Un système multi-marques à créer', 'Le jeu de départ, puis « + Ajouter une marque » sous les groupes de l\'onglet Système', 'Une marque se gérait en trois endroits : le jeu de départ, le menu « … » et une carte repliée des Réglages communs', '2, 5, 9'],
  ['Un système multi-marques à mettre à jour', 'Palette ouverte : nouvelle référence, puis « Actualiser sur Figma… » sous le titre', 'Il fallait changer d\'onglet et retrouver la fiche parmi dix-sept, dont chacune portait son bouton ; Bleu A et Bleu K déclenchaient « palettes proches » sans jamais s\'afficher ensemble', 'Flux, 2, 13'],
  ['Light et Dark à créer', 'Chaque palette porte ses deux thèmes ; un réglage commun dit combien de valeurs écrites il change', 'Un réglage commun réécrivait des centaines de valeurs sans le dire avant la revue', '3'],
  ['Light et Dark à mettre à jour', 'Palette Sur mesure reliée aux variables du fichier, mode par thème, puis une décision pour les valeurs présentes', 'Le plugin n\'écrivait que ses trois collections : un système existant recevait un second jeu de variables', '12'],
  ['Une structure de tokens non conventionnelle', 'La même liaison, avec un motif de nom : « color/blue/{nuance} »', 'Aucun chemin d\'écriture hors de l\'architecture', '12'],
  ['Des palettes faites à l\'œil', 'Sélectionner les pastilles, « Une rampe existante », comparer, créer, puis rétablir les nuances fautives', 'Une palette ne partait que d\'une couleur : la rampe existante ne se mesurait pas, et son dessin se perdait', '11'],
  ['Une palette pour un nouveau composant', 'Rôle Utilitaire ou Marque avec « Autre famille… », ou Sur mesure', 'Les familles étaient fermées : une palette de composant finissait sans variables', '1'],
  ['Plusieurs palettes proches', 'Dupliquer, régler, « Comparer à » dans l\'aperçu, et « Proches à dessein »', 'L\'alerte sonnait sur chaque variante voulue ; comparer demandait d\'alterner entre deux palettes', '13'],
  ['Des palettes « jolies »', 'Régler avec la rampe témoin sous les yeux ; juger avec les spécimens de la marque et des statuts', 'L\'aperçu sort de la vue pendant le réglage ; la marque n\'était jamais montrée à côté des statuts', '7, 14'],
  ['Changer le nombre de nuances', 'La revue d\'« Actualiser tout » compte les variables créées et celles qui restent sans palette', 'Rien ne disait ce que devenaient les variables des nuances retirées', '3'],
  ['Refondre la charte d\'une marque', 'Nouvelles références de la marque, puis une revue groupée par marque', 'Couvert par les pistes 3 et 4', '3, 4'],
];
const tableScenarios = `<div class="table scenarios"><table><thead><tr><th>Scénario</th><th>Parcours proposé</th><th>Friction de la version précédente</th><th>Pistes</th></tr></thead><tbody>
${SCENARIOS.map(([s, p, f, n]) => `<tr><td>${s}</td><td>${p}</td><td>${f}</td><td class="num">${n}</td></tr>`).join('')}
</tbody></table></div>`;

// ---------------------------------------------------------------- page
const MD = './PROPOSITION-FINALE.md';
const piste = ({ id, numero, titre, statut, intro, scenes, apres = '' }) => `
<section class="bloc" id="${id}">
  <div class="tete"><span class="sur">Piste ${numero} · <span class="statut ${statut.cls}">${statut.texte}</span></span><h2>${titre}</h2></div>
  ${intro}
  <div class="scene"><div class="scene-rangee">${scenes}</div></div>
  ${apres}
  <p class="renvoi"><a href="${MD}#${id}">Le texte de la piste ${numero} dans la proposition finale</a></p>
</section>`;
const RECO = { cls: 'reco', texte: 'proposée' };
const OPTION = { cls: 'adiscuter', texte: 'à discuter' };

const vert = P.success;
const vertLight = resultat(vert, 'light');
const releves = [
  ['Vert, Thème Light', `${vertLight}. La proposition 1 l'affichait « Soft ✓ · Vivid ✓ ».`],
  ['Emplois du cran 700', `${emploisEnMots(700).join(', ')}. La proposition 1 disait « solid · hover ».`],
  ['Retouche de Rouge', `${RETOUCHE.figma} au ${RETOUCHE.cran} Vivid Light, au lieu de ${calculee}, fait manquer ${perdues.map((x) => { const a = associationDe(x.paire); return `${a.premier} sur ${a.second} (${virgule(x.contraste)}:1)`; }).join(' et ')}.`],
  ['Système à six marques', `${COMPTES.primitives} variables dans primitives, ${COMPTES.brandParMarque} dans brand, ${COMPTES.theme} dans theme : ${TOTAL_VARIABLES} variables, ${TOTAL_VALEURS} valeurs par mode.`],
  ['Rampe de Bleu A faite à l\'œil', `${nbReprises} nuances reprises en Thème Light : ${oeilManquees.length} garanties manquées, ${calculeeManquees.length} pour la rampe calculée. Rétablir ${listeCrans(rapproche.retablies)} revient à ${manqueesDe(rapproche.gardees).length} et garde ${nbReprises - rapproche.retablies.length} nuances reprises.`],
  ['Intensité Soft à 0,50', `${lotSoft.length} palettes changent, dont ${lotSoftVariables.length} avec variables : ${valeursSoft} valeurs dans primitives. ${perdantes.length ? `${perdantes.map((x) => `${x.p.nom} passe de ${x.avant} à ${x.apres} garanties manquées`).join(', ')}.` : 'Aucune palette ne perd de garantie.'}`],
  ['Trois retouches de Rouge', `700, 800 et 900 Vivid Light adoptés : ${perduesToutes.length} garanties manquées.`],
  ['Palettes proches', `${PAIRES_PROCHES.map(({ a, b, d, garde }) => `${a.nom} et ${b.nom} ${virgule(d, 3)}${garde ? '' : ' (marques différentes)'}`).join(', ')}.`],
];

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Intégration du marché</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap">
<style>
:root {
  --sol: #F3F4F6; --papier: #FFFFFF; --encre: #17191E; --encre-2: #555C69; --filet: #D9DCE2;
  --accent: #A8511B; --ok: #17784A; --ko: #C7321B;
  --sans: "IBM Plex Sans", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { color-scheme: dark; --sol: #15171B; --papier: #1D2026; --encre: #ECEEF2; --encre-2: #A3AAB7; --filet: #343944; --accent: #F0A06A; --ok: #5BD08F; --ko: #FF8C78; }
}
:root[data-theme="dark"] { color-scheme: dark; --sol: #15171B; --papier: #1D2026; --encre: #ECEEF2; --encre-2: #A3AAB7; --filet: #343944; --accent: #F0A06A; --ok: #5BD08F; --ko: #FF8C78; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--sol); color: var(--encre); font: 15px/1.55 var(--sans); padding: 32px 16px 64px; }
main { max-width: 1240px; margin: 0 auto; display: grid; gap: 64px; min-width: 0; }
h1, h2, h3 { text-wrap: balance; margin: 0; line-height: 1.2; }
h1 { font-size: 30px; font-weight: 600; }
h2 { font-size: 22px; font-weight: 600; }
h3 { font-size: 16px; font-weight: 600; }
p { margin: 0; max-width: 74ch; }
ol { margin: 0; padding-left: 1.3em; max-width: 74ch; }
li + li { margin-top: 6px; }
code { font-family: var(--mono); font-size: 0.88em; overflow-wrap: anywhere; }
a { color: var(--accent); }
.intro, .bloc { display: grid; gap: 16px; min-width: 0; }
.tete { display: grid; gap: 8px; }
.sur { font: 500 12px/1.3 var(--sans); text-transform: uppercase; letter-spacing: 0.08em; color: var(--encre-2); }
.statut.reco { color: var(--ok); font-weight: 600; }
.statut.adiscuter { color: var(--accent); font-weight: 600; }
.sommaire { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px 24px; font-size: 14px; }
.sommaire a { text-decoration: none; }
.encadre { background: var(--papier); border: 1px solid var(--filet); border-radius: 12px; padding: 16px 20px; display: grid; gap: 10px; min-width: 0; }
.releves { display: grid; grid-template-columns: minmax(0, 180px) minmax(0, 1fr); gap: 6px 16px; font-size: 14px; }
.releves span:nth-child(odd) { color: var(--encre-2); }
.renvoi { font-size: 14px; }
.encadre .c, .intro .c { color: inherit; background: rgba(127,127,127,.16); font-size: .88em; }
.table { background: var(--papier); border: 1px solid var(--filet); border-radius: 12px; overflow-x: auto; }
.table table { border-collapse: collapse; width: 100%; font-size: 14px; }
.table th, .table td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--filet); vertical-align: top; }
.table tr:last-child td { border-bottom: 0; }
.table th { font-weight: 600; color: var(--encre-2); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
.table td.num { font-family: var(--mono); white-space: nowrap; }
.scene { overflow-x: auto; padding: 4px 0 12px; min-width: 0; }
.scene-rangee { display: flex; gap: 24px; align-items: flex-start; width: max-content; }
.ecran { display: grid; gap: 8px; align-content: start; }
.legende-ecran { font-size: 13px; color: var(--encre-2); max-width: ${LARGEUR}px; display: grid; gap: 4px; }
.legende-ecran b { color: var(--encre); }

.parcours { display: flex; gap: 8px; flex-wrap: wrap; }
.etape { flex: 1 1 150px; border: 1px solid var(--filet); background: var(--papier); border-radius: 10px; padding: 10px 12px; display: grid; gap: 2px; font-size: 13px; }
.etape span { color: var(--encre-2); }
.etape.manuel { border-color: var(--ko); border-style: dashed; }
.etape.manuel b { color: var(--ko); }
.etape.change { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.parcours-titre { font: 600 12px/1 var(--sans); text-transform: uppercase; letter-spacing: .08em; color: var(--encre-2); }

/* Le panneau Figma, thème sombre */
.fp {
  --f-fond: #2C2C2C; --f-bloc: #383838; --f-tertiaire: #4A4A4A; --f-bord: #5E5E5E; --f-champ: #2C2C2C; --f-onglet: #505050;
  --f-texte: #FFFFFF; --f-texte-2: #B3B3B3; --f-marque: #0D99FF; --f-lien: #7CC4F8; --f-succes: #85E0A3; --f-att: #F5B74E; --f-att-fond: #4A3714; --f-ok-fond: #1F3D2A; --f-ko: #FF9C8F; --f-ko-fond: #4A2320;
  flex: none; position: relative; background: var(--f-fond); color: var(--f-texte); font: 11px/16px Inter, system-ui, sans-serif;
  border: 1px solid #1B1B1B; border-radius: 8px; box-shadow: 0 10px 28px rgba(0,0,0,.35); overflow: hidden;
}
.fp.borne .fp-corps { overflow: hidden; }
.fp-haut { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.fp-titre { font-size: 14px; font-weight: 600; }
.fp-onglets { display: flex; gap: 4px; padding: 0 0 8px; margin: 0 16px; border-bottom: 1px solid var(--f-bord); }
.fp-onglets span, .onglets-theme span { height: 24px; padding: 0 8px; border-radius: 4px; display: grid; place-items: center; color: var(--f-texte-2); font-weight: 600; white-space: nowrap; }
.fp-onglets .on, .onglets-theme .on { background: var(--f-onglet); color: var(--f-texte); }
.onglets-theme { display: flex; gap: 4px; }
.fp-corps { padding: 12px 16px 16px; display: grid; gap: 12px; min-width: 0; }
.fp-corps > * { min-width: 0; }
.fp-select { display: flex; gap: 8px; align-items: center; }
.filet { height: 1px; background: var(--f-bord); margin: 3px 0; }
.titre-1 { font-size: 16px; line-height: 24px; font-weight: 600; }
.champ { height: 28px; border: 1px solid var(--f-bord); border-radius: 6px; display: flex; align-items: center; gap: 6px; padding: 0 8px; background: var(--f-champ); min-width: 0; }
.champ.grand { height: 32px; flex: 1; }
.champ.etroit { width: 120px; flex: none; }
.champ .coupe { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.champ .fleche { color: var(--f-texte-2); }
.rond { width: 12px; height: 12px; border-radius: 50%; flex: none; }
.pastille { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: -1px; flex: none; }
.b { height: 28px; padding: 0 10px; border: 1px solid var(--f-bord); border-radius: 6px; display: inline-grid; place-items: center; font-weight: 600; white-space: nowrap; }
.b.grand { height: 32px; padding: 0 12px; }
.b.compact { height: 24px; padding: 0 8px; border-radius: 5px; }
.b.principal { background: var(--f-marque); border-color: var(--f-marque); color: #fff; }
.b.inactif { opacity: .4; }
.bouton-icone { width: 28px; height: 28px; border: 1px solid var(--f-bord); border-radius: 6px; display: grid; place-items: center; flex: none; }
.bouton-icone.grand { width: 32px; height: 32px; }
.carte { background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 8px; padding: 12px; display: grid; gap: 10px; align-content: start; min-width: 0; }
.carte > * { min-width: 0; }
.carte-titre { font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.carte-titre .droite { display: flex; gap: 10px; align-items: center; font-size: 11px; font-weight: 400; }
.libelle, .aide, .sec { color: var(--f-texte-2); }
.libelle { display: block; margin-bottom: 4px; }
.petit { font-size: 10px; line-height: 13px; }
.aide.petit { display: block; margin-top: 4px; }
.lien { color: var(--f-lien); }
.souligne { text-decoration: underline; }
.att-t { color: var(--f-att); }
.ko-t { color: var(--f-ko); }
.deux-col { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
.trois { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.rangee { display: grid; gap: 0; justify-items: stretch; }
.champ-ligne { display: flex; gap: 6px; align-items: center; min-width: 0; }
.pipette { width: 28px; height: 28px; border-radius: 6px; border: 3px solid var(--f-champ); outline: 1px solid var(--f-bord); flex: none; }
.pipette.petite { width: 18px; height: 18px; border-width: 2px; border-radius: 4px; }
.segment { display: flex; border: 1px solid var(--f-bord); border-radius: 6px; height: 28px; padding: 2px; gap: 2px; background: var(--f-champ); min-width: 0; }
.segment span { flex: 1; display: grid; place-items: center; border-radius: 4px; color: var(--f-texte-2); white-space: nowrap; padding: 0 8px; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.segment .on { background: var(--f-tertiaire); color: var(--f-texte); font-weight: 600; }
.segment.court { max-width: 260px; }
.gestes { display: flex; gap: 8px; flex-wrap: wrap; }
.accordeon { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 12px; background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 8px; }
.accordeon b { font-size: 12px; }
.accordeon .resume, .groupe-tete .resume { margin-left: auto; color: var(--f-texte-2); text-align: right; }
.chevron { color: var(--f-texte-2); width: 10px; }
.c { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 10px; padding: 0 4px; border-radius: 3px; background: rgba(255,255,255,.08); color: var(--f-texte); overflow-wrap: anywhere; }
.note-maquette { color: var(--f-texte-2); font-style: italic; padding: 2px 4px; }
.aide-rond { display: inline-grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--f-texte-2); font-size: 9px; margin-left: 4px; color: var(--f-texte); }
.aide-rond.on { border-color: var(--f-marque); outline: 2px solid var(--f-marque); outline-offset: 1px; }
.avertissement { border-left: 3px solid var(--f-att); padding: 4px 0 4px 10px; color: var(--f-texte); display: block; }

/* Nuancier */
.surface { border-radius: 6px; padding: 8px; min-width: 0; }
.grille { display: grid; grid-template-columns: 34px repeat(${CRANS.length}, minmax(0, 1fr)); gap: 3px; align-items: center; }
.grille.nue { grid-template-columns: repeat(${CRANS.length}, minmax(0, 1fr)); }
.grille .num { text-align: center; font-size: 9.5px; line-height: 12px; opacity: .7; font-variant-numeric: tabular-nums; }
.grille .prof { font-size: 10px; font-weight: 600; }
.sw { display: grid; place-items: center; border-radius: 4px; font-style: normal; font-size: 10px; position: relative; min-width: 0; }
.sw.pointe::before { content: ""; position: absolute; top: 2px; right: 2px; width: 6px; height: 6px; border-radius: 50%; background: #F5B74E; box-shadow: 0 0 0 1.5px rgba(0,0,0,.55); }
.sw.choisie { box-shadow: 0 0 0 2px #F7F7F7, 0 0 0 4px #1E1E1E; }
.apercu-mini .surface { padding: 6px; }
.tete-apercu { display: flex; justify-content: space-between; align-items: center; }
.ref-ligne { font-weight: 600; }

/* Conversion de rôle, lien des fonds */
.conversion { border: 1px solid var(--f-marque); border-radius: 8px; padding: 10px; display: grid; gap: 10px; background: var(--f-fond); }
.conversion-titre { font-size: 12px; font-weight: 600; }
.aa { display: grid; gap: 6px; }
.aa .surface { padding: 4px; }
.aa .grille { gap: 2px; }
.table-bilan { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 2px 16px; }
.table-bilan .entete { color: var(--f-texte-2); }

/* Onglet Palettes */
.tete-onglet { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tete-onglet > b { margin-right: auto; }
.groupe { display: grid; gap: 8px; }
.groupe-tete { display: flex; align-items: center; gap: 8px; min-height: 28px; border-bottom: 1px solid var(--f-bord); padding-bottom: 4px; }
.groupe-tete b { font-size: 12px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.groupe-corps { display: grid; gap: 8px; }
.fiche { gap: 8px; }
.fiche .surface { padding: 5px; }
.fiche .grille { grid-template-columns: 30px repeat(${CRANS.length}, minmax(0, 1fr)); gap: 2px; }
.fiche-tete { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.fiche-nom { font-size: 13px; margin-right: 4px; }
.fiche-ligne { display: flex; justify-content: space-between; gap: 4px 12px; flex-wrap: wrap; }
.ligne-variables { display: flex; gap: 8px; align-items: center; }
.etat-puce { height: 20px; padding: 0 8px; border-radius: 10px; display: inline-grid; place-items: center; font-size: 10px; font-weight: 600; white-space: nowrap; }
.etat-puce.ok { background: var(--f-ok-fond); color: var(--f-succes); }
.etat-puce.attention { background: var(--f-att-fond); color: var(--f-att); }
.bilan { border-left: 3px solid var(--f-ko); background: var(--f-ko-fond); padding: 10px 12px; display: grid; gap: 4px; border-radius: 0 6px 6px 0; }
.bilan > b { font-size: 12px; }

/* Revue */
.voile { position: absolute; inset: 86px 0 0 0; background: rgba(0,0,0,.55); display: flex; justify-content: center; align-items: flex-start; padding: 16px; }
.modale { width: 100%; max-width: 520px; max-height: 100%; background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.55); display: flex; flex-direction: column; min-height: 0; }
.modale-tete { padding: 14px 16px 10px; display: grid; gap: 2px; border-bottom: 1px solid var(--f-bord); }
.modale-titre { font-size: 13px; font-weight: 600; }
.modale-corps { padding: 12px 16px; display: grid; gap: 10px; overflow-y: auto; min-height: 0; align-content: start; }
.modale-corps > * { min-width: 0; }
.modale-pied { padding: 10px 16px; border-top: 1px solid var(--f-bord); display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.modale-pied .gestes { margin-left: auto; }
.revue-bloc { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--f-bord); border-radius: 6px; background: var(--f-fond); min-width: 0; }
.revue-bloc > * { min-width: 0; }
.revue-bloc.attention { border-color: #7A5A1E; }
.revue-sous { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--f-texte-2); }
.revue-sous .c { text-transform: none; letter-spacing: 0; }
.sortie { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 8px; align-items: start; }
.sortie > div { display: grid; }
.sortie.inactif { opacity: .6; }
.case { width: 14px; height: 14px; border-radius: 3px; display: grid; place-items: center; font-size: 9px; border: 1px solid var(--f-texte-2); color: #fff; margin-top: 1px; }
.case.on { background: var(--f-marque); border-color: var(--f-marque); }
.case.inactif { opacity: .5; }
.compte { display: grid; grid-template-columns: 90px minmax(0, 1fr) minmax(0, 1fr); gap: 2px 8px; align-items: baseline; }
.compte .chemin { grid-column: 1 / -1; }
.conflit-tete { display: grid; gap: 2px; }
.trois-valeurs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.trois-valeurs > div { display: grid; gap: 2px; }
.choix { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 8px; padding: 6px 8px; border: 1px solid var(--f-bord); border-radius: 6px; }
.choix > div { display: grid; }
.choix.on { border-color: var(--f-marque); box-shadow: inset 0 0 0 1px var(--f-marque); }
.radio { width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--f-texte-2); margin-top: 1px; }
.radio.on { border: 4px solid var(--f-marque); background: #fff; }
.garanties-choix { display: grid; gap: 4px; padding: 8px; border-radius: 6px; background: var(--f-bloc); }
.garanties-choix .surface { padding: 4px; }
.bandeau-danger { border-left: 3px solid var(--f-ko); background: var(--f-ko-fond); padding: 8px 10px; display: grid; gap: 4px; border-radius: 0 6px 6px 0; }

/* Détail d'une nuance */
.detail { border-radius: 6px; padding: 10px; display: grid; gap: 8px; }
.d-tete { display: grid; grid-template-columns: 40px 1fr; gap: 10px; align-items: center; }
.d-titre { font-size: 13px; }
.d-encart { display: grid; gap: 4px; padding: 8px 10px; border: 1px solid rgba(128,128,128,.35); border-radius: 6px; }
.d-encart .sw { display: inline-grid; width: 24px; vertical-align: middle; }
.d-sous { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .72; }
.detail .c { background: rgba(0,0,0,.07); color: inherit; }
.usage { display: grid; gap: 1px; padding: 2px 0; }
.ko-l { color: #A4261A; }
.sec-l { opacity: .72; }
.mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }

/* Jeu de départ */
.depart-bloc { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--f-bord); border-radius: 6px; background: var(--f-fond); }
.depart-ligne { display: grid; grid-template-columns: 16px 64px 18px 64px minmax(0, 1fr); gap: 8px; align-items: center; }
.depart-ligne .surface { padding: 3px; }
.depart-ligne .grille { gap: 2px; }
.depart-ligne .case { color: #fff; }
.marque-ligne { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr) 16px; gap: 8px; align-items: center; }
.boite { height: 28px; border: 1px solid var(--f-bord); border-radius: 6px; padding: 0 8px; }
.boite.vide { border-style: dashed; border-color: var(--f-att); }
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

/* Statuts */
.statuts-grille { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 8px; border-radius: 6px; }
.statut { display: flex; gap: 6px; align-items: center; border: 1px solid; border-radius: 6px; padding: 6px 8px; font-weight: 600; min-width: 0; }
.statut-icone { width: 16px; height: 16px; border: 1.5px solid; border-radius: 50%; display: grid; place-items: center; font-size: 9px; flex: none; }
.vision-seg span { padding: 0 4px; }
.bande-visions { display: grid; grid-template-columns: 80px repeat(4, minmax(90px, 1fr)); gap: 6px 12px; align-items: center; background: var(--papier); border: 1px solid var(--filet); border-radius: 10px; padding: 12px 14px; font-size: 13px; width: 620px; }
.bv-tete { font-size: 12px; color: var(--encre-2); }
.bande-titre { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.bv-rampe { display: flex; gap: 2px; }
.bv-rampe i { flex: 1; height: 22px; border-radius: 3px; }

/* Réglages */
.table-marques { display: grid; border: 1px solid var(--f-bord); border-radius: 6px; }
.tm-ligne { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto; gap: 8px; padding: 6px 8px; border-top: 1px solid var(--f-bord); }
.tm-ligne:first-child { border-top: 0; }
.tm-ligne.entete { color: var(--f-texte-2); }
.bulle { position: absolute; top: 24px; left: 150px; right: 12px; background: #1E1E1E; border: 1px solid #444; border-radius: 6px; padding: 8px 10px; box-shadow: 0 8px 20px rgba(0,0,0,.5); }

/* Sélecteur de palettes ouvert */
.menu-liste { display: grid; gap: 1px; background: #1E1E1E; border: 1px solid #444; border-radius: 6px; padding: 6px; }
.groupe-liste { padding: 6px 6px 2px; color: var(--f-texte-2); font-size: 10px; }
.entree-liste { display: flex; gap: 8px; align-items: center; padding: 4px 8px; border-radius: 4px; }
.entree-liste em { margin-left: auto; font-style: normal; color: var(--f-texte-2); font-family: "IBM Plex Mono", monospace; font-size: 10px; }
.entree-liste.on { background: var(--f-marque); }
.entree-liste.on em { color: #fff; }
.vignette { display: grid; gap: 6px; align-content: start; }
.vignette-titre { font: 600 12px/1 var(--sans); color: var(--encre-2); text-transform: uppercase; letter-spacing: .06em; }

/* Ajouts de la revue par scénario */
.ligne-figma { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: -4px; }
.ligne-figma .lien { margin-left: auto; }
.case-vide { display: grid; gap: 6px; border: 1px dashed var(--f-att); border-radius: 8px; padding: 8px 10px; }
.bouton-icone.petit { width: 22px; height: 22px; border-radius: 5px; margin-left: 4px; }
.champ.compact-liste { height: 24px; }
.lot-ligne { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto auto; gap: 8px; align-items: center; padding: 3px 0; border-top: 1px solid var(--f-bord); }
.lot-ligne:nth-of-type(1) { border-top: 0; }
.retouche-ligne { display: grid; grid-template-columns: minmax(0, 1fr) auto 150px; gap: 8px; align-items: center; }
.deux-pastilles { display: inline-flex; gap: 4px; align-items: center; }
.deux-pastilles .sw { width: 28px; }
.segment.mini { height: 24px; }
.curseur { position: relative; height: 6px; border-radius: 3px; background: linear-gradient(to right, #555, #999); margin: 8px 6px; }
.curseur i { position: absolute; top: 50%; width: 12px; height: 12px; border-radius: 50%; background: #fff; transform: translate(-50%, -50%); box-shadow: 0 0 0 1px rgba(0,0,0,.4); }
.rangee-curseur { display: grid; grid-template-columns: 70px minmax(0, 1fr) 64px; gap: 8px; align-items: center; }
.rangee-curseur .libelle { margin: 0; }
.temoin .surface { padding: 3px; }
.temoin .grille { gap: 2px; }
.numeros { padding: 0 8px; }
.droite-apercu { display: flex; gap: 10px; align-items: center; }
.scenarios td:first-child { font-weight: 600; min-width: 150px; }

@media (max-width: 700px) { h1 { font-size: 24px; } body { padding: 24px 16px 48px; } }
</style>
</head>
<body>
<main>

<section class="intro">
  <div class="tete"><span class="sur">UCM Palettes · intégration du marché · version finale, revue par scénario</span><h1>Les écrans de la proposition finale</h1></div>
  <p>Ces écrans accompagnent <a href="${MD}">PROPOSITION-FINALE.md</a>, qui fait autorité sur leur contenu : chaque piste s'y explique, avec ses raisons, ses coûts et les décisions à valider. La page s'adresse au mainteneur.</p>
  <p>Cette version passe la proposition au crible de douze scénarios de travail d'un designer. La correction principale porte sur le flux global : le plugin s'ouvre sur le système entier, et un seul geste l'écrit dans Figma. Les pistes 1 à 10 sont corrigées en conséquence, et les pistes 11 à 14 s'ajoutent.</p>
  <p>Chaque couleur, chaque résultat de garantie et chaque emploi d'un cran sort du moteur, sur la recette par défaut. Les panneaux ont la taille d'ouverture de la fenêtre, ${LARGEUR} × ${HAUTEUR} px, dans le thème sombre de Figma. Les écrans les plus chargés se montrent aussi à ${MINIMALE} px, la largeur minimale. Dans une revue, le corps de la modale défile. Une ligne en italique remplace un contenu que la maquette n'a pas besoin de répéter.</p>
  <div class="encadre">
    <h3>Le principe commun</h3>
    <ol>
      <li>Le plugin s'ouvre sur le système : l'onglet Système montre les marques, leurs familles, les couleurs communes et ce qui manque. L'onglet Palette règle la palette ouverte.</li>
      <li>Un seul geste écrit dans Figma, « Actualiser sur Figma… », en tête de l'onglet Système. La palette ouverte a le même geste, limité à elle.</li>
      <li>Une palette a un rôle : Marque, Utilitaire, Neutre ou Sur mesure. Sur mesure est le rôle d'une palette neuve. Ses variables sont « Aucune », ou des variables existantes qu'elle remplit.</li>
      <li>Aucune variable ne s'écrit sans revue. La revue compare trois valeurs et ne choisit rien. Une valeur non décidée ne s'écrit pas et ne bloque pas les autres.</li>
      <li>Une retouche adoptée entre dans la recette. Une rampe existante se reprend comme une palette dont les nuances sont retouchées. Le cran de la référence n'admet pas de retouche.</li>
      <li>Une alerte de palettes proches ne compare que des palettes qui s'affichent ensemble.</li>
    </ol>
  </div>
  <div class="encadre">
    <h3>Relevés du moteur</h3>
    <div class="releves">${releves.map(([t, c]) => `<span>${t}</span><span>${c}</span>`).join('')}</div>
  </div>
  <div class="parcours-titre">Aujourd'hui</div>
  ${parcoursAvant}
  <div class="parcours-titre">Proposé</div>
  ${parcoursApres}
  <nav class="sommaire">
    <a href="#le-flux-global">Le flux global</a>
    <a href="#les-scénarios-du-designer">Les scénarios du designer</a>
    <a href="#piste-1--le-rôle-de-la-palette">1. Le rôle et sa conversion</a>
    <a href="#piste-2--deux-sorties-un-geste-longlet-système">2. Deux sorties, un geste</a>
    <a href="#piste-3--la-revue-avant-écriture">3. La revue, groupée, invalidée, en échec</a>
    <a href="#piste-4--les-retouches">4. Les retouches et le cran ◆</a>
    <a href="#piste-5--le-jeu-de-départ">5. Le jeu de départ</a>
    <a href="#piste-6--la-couleur-de-la-sélection">6. La couleur de la sélection</a>
    <a href="#piste-7--les-statuts-en-vision-simulée-avec-la-marque">7. Les statuts, avec la marque</a>
    <a href="#piste-8--les-fonds-lus-sur-le-neutre">8. Les fonds lus sur le neutre</a>
    <a href="#piste-9--les-collections-et-les-marques">9. Les collections et les marques</a>
    <a href="#piste-10--les-aides-et-la-langue-des-planches">10. Aides et langue des planches</a>
    <a href="#piste-11--reprendre-une-rampe-existante">11. Reprendre une rampe existante</a>
    <a href="#piste-12--relier-une-palette-à-des-variables-existantes">12. Relier à des variables existantes</a>
    <a href="#piste-13--les-palettes-proches">13. Les palettes proches</a>
    <a href="#piste-14--la-rampe-témoin-des-réglages">14. La rampe témoin</a>
    <a href="#lessai-par-le-mainteneur">L'essai par le mainteneur</a>
  </nav>
</section>

<section class="bloc" id="le-flux-global">
  <div class="tete"><span class="sur">Correction principale</span><h2>Le flux global</h2></div>
  <p>Le designer travaille sur un système : des marques, leurs familles, des couleurs communes. La version précédente s'ouvrait sur une palette à choisir, montrait chaque palette seule, et répartissait le système entre le jeu de départ, les groupes, les Réglages communs et le rôle de chaque palette. L'écriture se lançait fiche par fiche, dix-sept boutons principaux dans une liste, et « Actualiser tout » restait sous la liste, hors de vue.</p>
  <p>Le flux proposé tient en trois écrans. L'onglet <b>Système</b>, ouvert au lancement, est la carte du travail : chaque groupe est une collection ou une marque, chaque fiche dit son état, une famille qui manque a sa case. L'onglet <b>Palette</b> règle une palette et dit son état dans Figma. La <b>revue</b> liste ce qui change, palette par palette, avant d'écrire. Le geste « Actualiser » de l'en-tête, qui relisait le fichier, disparaît : le plugin relit à l'ouverture, au retour sur l'onglet et au clic final de la revue.</p>
  <div class="scene"><div class="scene-rangee">
    ${ecran(ecranPalettes(LARGEUR), '<b>1. Système, à l\'ouverture.</b><span>Le seul bouton principal est en tête : il compte les palettes dont une sortie n\'est pas à jour. Les fiches n\'ont plus que « Afficher » et « Modifier ».</span>')}
    ${ecran(ecranCreationEtat, '<b>2. Palette, après un réglage.</b><span>La pastille et « Actualiser cette palette… » sous le titre : régler puis écrire ne demande pas de changer d\'onglet.</span>')}
    ${ecran(ecranToutSoft, `<b>3. La revue du système.</b><span>Une ligne par palette ; chacune se décoche. Le verdict des garanties vient en tête.</span>`)}
  </div></div>
</section>

<section class="bloc" id="les-scénarios-du-designer">
  <div class="tete"><span class="sur">Revue</span><h2>Les scénarios du designer</h2></div>
  <p>Chaque scénario se joue avec les écrans de cette page. La troisième colonne dit ce qui accrochait dans la version précédente ; la dernière, les pistes qui le corrigent.</p>
  ${tableScenarios}
  <p class="renvoi"><a href="${MD}#les-scénarios-du-designer">Le détail des scénarios dans la proposition finale</a></p>
</section>

${piste({
  id: 'piste-1--le-rôle-de-la-palette', numero: 1, statut: RECO,
  titre: 'Le rôle de la palette',
  intro: `<p>La rangée « Rôle dans le système » remplace le Modèle, les Intensités et la destination. Chaque rôle fixe les intensités de l'architecture et le chemin des variables. Sur mesure garde la carte actuelle, reste le rôle d'une palette neuve, et dit où vont ses variables : nulle part, ou dans des variables existantes (piste 12). La liste des marques finit par « Nouvelle marque… », et celle des familles par « Autre famille… ».</p>`,
  scenes: `${ecran(ecranRole, '<b>Création d\'une palette de marque.</b><span>La couleur vient de la sélection (piste 6). La ligne sous les champs donne le chemin et le compte des variables.</span>')}
    ${ecran(ecranConversion, `<b>Changer de rôle : Framboise devient la secondaire de Marque B.</b><span>Rien ne change avant « Passer en Marque ». Rampes et garanties avant et après sortent du moteur.</span>`)}
    ${ecran(selecteurOuvert, '<b>Le sélecteur, rangé comme l\'onglet Système.</b>')}`,
  apres: `<div class="scene"><div class="scene-rangee">${vignetteRole('Utilitaire', P.danger)}${vignetteRole('Neutre', P.neutral)}${vignetteRole('Sur mesure', P.essai)}</div></div>`,
})}

${piste({
  id: 'piste-2--deux-sorties-un-geste-longlet-système', numero: 2, statut: RECO,
  titre: 'Deux sorties, un geste, l\'onglet Système',
  intro: `<p>La pastille montre l'état le plus urgent des deux sorties ; les variables n'ont plus que trois états : « À jour », « À écrire », « À décider ». Une marque est un groupe : une famille qui manque y a sa case, et « + Ajouter une marque » suit le dernier groupe. « Générer tout », qui redessine des cadres à jour, rejoint la section secondaire.</p>`,
  scenes: `${ecran(ecranPalettes(MINIMALE), `<b>L'onglet Système à ${MINIMALE} px.</b><span>Rouge attend une décision. Marque B n'a pas de ${code('secondary')} : la case propose de la créer ou de reprendre Framboise. Marque C est un mode créé hors du plugin.</span>`)}
    ${ecran(variantesLigneFigma, '<b>La ligne de la palette ouverte, selon l\'état.</b><span>À jour, elle ne propose rien. Une palette Sur mesure sans variables dessine directement.</span>')}
    ${ecran(`<div class="fp" style="width:${LARGEUR}px"><div class="fp-corps">${ficheAvantRecherche}${ficheApres}</div></div>`, '<b>La fiche selon la recherche, puis selon cette version.</b><span>Une pastille, une ligne qui nomme les deux sorties, aucun bouton principal.</span>')}`,
})}

${piste({
  id: 'piste-3--la-revue-avant-écriture', numero: 3, statut: RECO,
  titre: 'La revue avant écriture',
  intro: `<p>Deux sorties cochables, trois unités de compte, les décisions sans choix par défaut, les garanties après écriture, puis une relecture du fichier au clic final. Le bouton ne s'éteint plus pour une décision en attente : la valeur non décidée reste telle quelle dans Figma et dans la recette, et le pied de la modale le dit. Ambre s'écrit pour la première fois : ${ambreVariables} variables dans <code>primitives</code>, ${ambreAlias} alias dans <code>theme</code>, soit ${ambreCrees} variables créées et ${ambreValeurs} valeurs écrites.</p>`,
  scenes: `${ecran(ecranRevue(LARGEUR), `<b>La revue d'une palette, ${LARGEUR} × ${HAUTEUR}.</b><span>Ouverte depuis la palette. Décocher une sortie retire son écriture. Une police absente décoche la planche et laisse les variables possibles.</span>`)}
    ${ecran(ecranRevue(MINIMALE), `<b>La même revue à ${MINIMALE} px.</b>`)}
    ${ecran(carteIntensitesSoft, `<b>Un réglage commun compte les valeurs écrites qu'il change.</b><span>L'intensité Soft passe à ${virgule(PART_SOFT)} : ${valeursSoft} valeurs dans <code>primitives</code>, dites au moment du geste. La revue du système suit (Le flux global, écran 3).</span>`)}
    ${ecran(ecranInvalidee, `<b>La revue invalidée.</b><span>Rouge change de référence : ${rougeValeurs} valeurs à écrire. Pendant la revue, le ${INVALIDEE.cran} a bougé dans Figma. Au clic, rien ne s'écrit, et la décision nouvelle attend.</span>`)}
    ${ecran(ecranEchec, '<b>L\'échec partiel et sa reprise.</b><span>La planche a continué pendant que les variables échouaient. « Réessayer » relit le fichier et n\'écrit que ce qui manque.</span>')}`,
})}

${piste({
  id: 'piste-4--les-retouches', numero: 4, statut: RECO,
  titre: 'Les retouches',
  intro: `<p>Un designer a collé ${RETOUCHE.figma}, la couleur de référence de Rouge, au cran ${RETOUCHE.cran} de Rouge, Vivid, Thème Light. Aucun choix n'est coché. Le moteur recalcule les garanties sous le choix fait, avant l'écriture. Le cran ◆ n'admet pas de retouche : une valeur différente y devient une nouvelle référence. Plusieurs retouches d'une palette se décident d'un geste, ou une par une.</p>`,
  scenes: `${ecran(ecranConflit(null), '<b>Le conflit, sans choix par défaut.</b><span>Sans choix, la valeur ne s\'écrit pas ; les autres valeurs de la revue s\'écrivent.</span>')}
    ${ecran(ecranConflit('adopter'), `<b>Après « Adopter la valeur de Figma ».</b><span>${perdues.length} garanties passent sous leur seuil. L'écriture reste possible (<code>[VER-07]</code>).</span>`)}
    ${ecran(ecranRetouchesGroupees, `<b>Trois retouches dans Rouge.</b><span>« Adopter les ${RETOUCHES_ROUGE.length} » ou « Remettre les ${RETOUCHES_ROUGE.length} », puis un choix par ligne si besoin. Les garanties se calculent sur l'ensemble adopté.</span>`)}
    ${ecran(ecranIdentite, `<b>La couleur de la charte a changé dans Figma.</b><span>${code('brand.identity.primary')} vaut la couleur saisie avant tout ajustement. L'adopter recalcule la palette autour d'elle.</span>`)}
    ${ecran(ecranRetouche, '<b>La retouche adoptée, dans l\'onglet Palette.</b><span>Le ✎ se lit comme le ◆. Chaque emploi du cran et chaque garantie sortent du moteur.</span>')}`,
})}

${piste({
  id: 'piste-5--le-jeu-de-départ', numero: 5, statut: RECO,
  titre: 'Le jeu de départ',
  intro: `<p>Une famille vaut pour toutes les marques, parce que les variables de <code>brand</code> sont communes à ses modes. Le jeu part d'une seule ligne de marque : un système à une marque n'en ajoute pas. Le menu « … » perd « Compléter le jeu de départ » : la case vide d'une famille, dans l'onglet Système, ouvre la création déjà remplie.</p>`,
  scenes: `${ecran(ecranDepart, '<b>Premier lancement, deux marques saisies.</b><span>La secondaire de Marque B manque : la carte le dit, et la création attend.</span>')}
    ${ecran(ecranCreationPreremplie, `<b>Depuis la case ${code('secondary')} de Marque B.</b><span>Rôle, marque et famille sont remplis ; il reste la couleur, reprise ici de la sélection.</span>`)}`,
})}

${piste({
  id: 'piste-6--la-couleur-de-la-sélection', numero: 6, statut: RECO,
  titre: 'La couleur de la sélection',
  intro: '<p>Une pastille par calque à peinture unie, visible et opaque, dans l\'ordre de la sélection. Les calques ignorés se comptent. Le préremplissage de la création ne remplace jamais une saisie. La même lecture, sur plusieurs calques, sert à reprendre une rampe existante (piste 11).</p>',
  scenes: ecran(ecranSelection, '<b>Trois calques d\'une charte sélectionnés, deux ignorés.</b>'),
})}

${piste({
  id: 'piste-7--les-statuts-en-vision-simulée-avec-la-marque', numero: 7, statut: RECO,
  titre: 'Les statuts en vision simulée, avec la marque',
  intro: `<p>La carte « Distinguer les statuts » ouvre le groupe ${COMMUNES}. Elle montre aussi les palettes d'une marque, que le designer choisit : une marque s'affiche toujours à côté des statuts. En vision normale déjà, ${phraseProches(prochesSous('normale', [...PAIRES_UTILITAIRES, ...PAIRES_MARQUE_A]))} passent sous le seuil des palettes proches.</p>`,
  scenes: `${ecran(ecranVision, '<b>Deutéranopie, avec Marque A.</b><span>Les paires sous le seuil sont calculées sur les crans 500, 600 et 700 de la rampe vive, Thème Light.</span>')}
    ${ecran(vignetteStatutsNormale, '<b>Vision normale.</b><span>La secondaire de Marque A se confond avec <code>warning</code> : c\'est une décision de charte, que la carte rend visible.</span>')}`,
  apres: `<div class="scene"><div class="bande-titre">Crans 500, 600 et 700 Vivid des utilitaires, Thème Light, dans les quatre visions</div>${bandeVisions()}</div>`,
})}

${piste({
  id: 'piste-8--les-fonds-lus-sur-le-neutre', numero: 8, statut: OPTION,
  titre: 'Les fonds lus sur le neutre',
  intro: `<p>Les fonds restent saisis par défaut. Le cran 50 du neutre gris vaut ${P.neutral.rampes.unique.light[0]} et ${P.neutral.rampes.unique.dark[0]}, les fonds par défaut. Une teinte changée ne déplace presque pas ce cran, qui garde la clarté de la courbe. L'écran suppose donc le neutre réglé à une luminosité de ${virgule(DECALAGE_DU_NEUTRE)} : ses fonds deviennent ${fondsChauds.light} et ${fondsChauds.dark}, et le bilan change.</p>`,
  scenes: ecran(ecranFonds, '<b>Avant de lier, le bilan de chaque palette.</b><span>Les comptes sortent du moteur, sur les fonds actuels puis sur ceux du neutre réglé.</span>'),
})}

${piste({
  id: 'piste-9--les-collections-et-les-marques', numero: 9, statut: RECO,
  titre: 'Les collections et les marques',
  intro: '<p>La carte des Réglages communs ne garde que les noms des trois collections et la note sur les portées. Les marques vivent dans l\'onglet Système : le menu « ⋯ » d\'un groupe renomme la marque ou la retire, un mode créé hors du plugin a son groupe et « Suivre ce mode… ».</p>',
  scenes: ecran(ecranVariables, '<b>La carte, repliée en dernier dans les Réglages communs.</b>'),
})}

${piste({
  id: 'piste-10--les-aides-et-la-langue-des-planches', numero: 10, statut: RECO,
  titre: 'Les aides et la langue des planches',
  intro: '<p>Une aide d\'une phrase, ouverte au clic ou au clavier. Son texte suit l\'élection réelle du profil porteur.</p>',
  scenes: `${ecran(aideVocabulaire, '<b>L\'aide de « Référence exacte dans ».</b>')}${ecran(contenuPlanches, '<b>La langue des planches, dans la recette.</b>')}`,
})}

${piste({
  id: 'piste-11--reprendre-une-rampe-existante', numero: 11, statut: RECO,
  titre: 'Reprendre une rampe existante',
  intro: `<p>Une rampe faite à l'œil se lit dans la sélection, ou dans un groupe de variables. Le plugin la compare à la rampe calculée autour de la même référence, puis la crée telle quelle : chaque nuance qui diffère devient une retouche ✎, et les garanties se jugent sur elle. Ici, ${nbReprises} nuances reprises font manquer ${oeilManquees.length} garanties. Le moteur désigne les nuances à rétablir pour revenir au résultat de la rampe calculée : ${listeCrans(rapproche.retablies)}. Les ${nbReprises - rapproche.retablies.length} autres gardent le dessin du designer.</p>`,
  scenes: `${ecran(ecranReprendre, '<b>La création depuis une rampe existante.</b><span>La rampe lue, la rampe calculée, et l\'écart de chaque nuance. Deux gestes de création, selon la rampe gardée.</span>')}
    ${ecran(ecranAudit, `<b>La palette créée avec la rampe lue.</b><span>Les nuances ${listeCrans(rapproche.retablies)}, pointées, portent les garanties manquées. Un geste les rétablit.</span>`)}`,
})}

${piste({
  id: 'piste-12--relier-une-palette-à-des-variables-existantes', numero: 12, statut: OPTION,
  titre: 'Relier une palette à des variables existantes',
  intro: `<p>Pour un design system qui ne suit pas l'architecture, une palette Sur mesure se relie aux variables du fichier : une collection, un motif de nom, un mode par thème. Le plugin n'écrit que dans les variables trouvées, jamais dans un alias, et ne crée une variable absente que sur demande. La première actualisation demande une seule décision pour toutes les valeurs présentes : les remplacer, ou les reprendre comme rampe lue (piste 11).</p>`,
  scenes: `${ecran(ecranRelier, '<b>Relier Bleu à « color/blue/{nuance} ».</b><span>La table dit ce que le motif trouve, ce qui manque et ce qu\'il laisse.</span>')}
    ${ecran(ecranPremiereLiaison, '<b>La première actualisation.</b><span>Une décision pour les valeurs présentes, avec les garanties des deux rampes.</span>')}`,
})}

${piste({
  id: 'piste-13--les-palettes-proches', numero: 13, statut: RECO,
  titre: 'Les palettes proches',
  intro: '<p>L\'alerte « palettes proches » compare aujourd\'hui toutes les paires de la recette. Deux marques ne s\'affichent jamais dans le même mode de <code>brand</code> : leurs palettes ne se comparent plus. Une paire voulue se marque « Proches à dessein », rangée dans la recette et listée dans le rapport. « Comparer à », dans l\'en-tête de l\'aperçu, pose une seconde palette sous la première, nuance par nuance.</p>',
  scenes: ecran(ecranComparer, '<b>Bleu A comparé à Bleu K.</b><span>La ligne Δ donne l\'écart de chaque nuance, en distance OKLab.</span>'),
  apres: `<div class="bande-titre">Les paires sous le seuil de ${virgule(R.seuils.palettesProches)}, sur les palettes de cette page</div>${tableProches}`,
})}

${piste({
  id: 'piste-14--la-rampe-témoin-des-réglages', numero: 14, statut: RECO,
  titre: 'La rampe témoin des réglages',
  intro: '<p>À 720 px de haut, l\'aperçu sort de la vue quand la carte « Teinte, saturation, luminosité » est ouverte. La carte porte en tête une rampe témoin de 10 px, repeinte à chaque image du glisser, comme l\'aperçu. La Dérive de teinte a la même. Aucune barre flottante ne recouvre le contenu.</p>',
  scenes: ecran(ecranTemoin, '<b>Le réglage de la teinte de Rouge, Vivid.</b>'),
})}

<section class="bloc" id="lessai-par-le-mainteneur">
  <div class="tete"><span class="sur">À prouver</span><h2>L'essai par le mainteneur</h2></div>
  <p>Le mainteneur, designer UX/UI, essaie seul le plugin. Il joue les douze scénarios dans une copie d'un fichier réel, à la fin des lots 2, 3 et 4. Avant chaque clic qui écrit, il dit ce qui va changer dans Figma et dans la recette, puis compare avec le bilan. Chaque écart entre cette prédiction et le résultat est un défaut d'interface, même quand l'écriture est juste.</p>
  <p class="renvoi"><a href="${MD}#lessai-par-le-mainteneur">Le protocole, ses mesures et ses critères dans la proposition finale</a></p>
</section>

<section class="bloc" id="decisions">
  <div class="tete"><span class="sur">À valider</span><h2>Les décisions</h2></div>
  <p>Le tableau des décisions, leur origine et ce qui reste écarté sont dans <a href="${MD}#les-décisions">la proposition finale</a>.</p>
</section>

</main>
</body>
</html>
`;

writeFileSync(join(ICI, 'MAQUETTES-PROPOSITION-FINALE.html'), html);
console.log(`Écrit : MAQUETTES-PROPOSITION-FINALE.html (${Math.round(html.length / 1024)} Ko)`);
console.log('Relevés du moteur :');
for (const [t, c] of releves) console.log(`  ${t} : ${c.replace(/<[^>]+>/g, '')}`);
console.log(`  Ambre, première écriture : ${ambreCrees} variables créées, ${ambreValeurs} valeurs écrites, 1 cadre`);
console.log(`  Paires proches en deutéranopie : ${prochesSous('deuteranopie').map(({ a, b, d }) => `${a}/${b} ${virgule(d, 3)}`).join(', ')}`);
console.log(`  Bleu A avec ${IDENTITE_FIGMA} : ◆ ${CRANS[bleuNeuf.rangs.light]} Light, ${CRANS[bleuNeuf.rangs.dark]} Dark, ${bleuValeurs} valeurs changent`);
console.log(`  Rouge avec #E11D48 : ${rougeValeurs} valeurs changent`);
console.log(`  Framboise en Marque : rampe porteuse inchangée = ${porteuseInchangee}`);
