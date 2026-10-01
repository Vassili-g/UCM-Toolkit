#!/usr/bin/env node
/**
 * Écrit MAQUETTES-RECETTE-V6.html, le second passage des maquettes du lot Z3
 * du sixième plan : Z3.4, « Ajuster la référence » en modale, et Z3.5, les
 * Garanties de contraste à 500 px sans retour à la ligne. Le premier passage,
 * répondu, reste dans l'historique git de ce fichier ; ses réponses sont
 * dans le plan.
 *
 *   npm run galerie --workspace ucm-palettes-plugin
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/2 Ergonomie/generer-maquettes-v6.mjs"
 *
 * Chaque écran part de la galerie construite, au thème sombre de Figma : le
 * DOM réel de l'interface, avec sa feuille de style, que Chromium ouvre à
 * 770 px (ou 500 px), puis que la maquette réorganise. Une disposition
 * proposée est un prototype de la feuille que les lots Z5 et Z6 écriront.
 * Les ratios, la proposition d'ajustement et les rampes viennent du moteur.
 *
 * Chaque écran se range dans un <template> et s'affiche dans une iframe, pour
 * que la feuille du plugin ne touche pas celle de la page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { associationDe, recetteParDefaut } from '../../../../../packages/couleur/src/index.ts';
import {
  changementAuPasVoisin,
  garantiesComparees,
  manqueesParIntensite,
  nuancesVisees,
  paletteAjustee,
  pasLePlusProche,
  propositionAuPas,
} from '../../../../../packages/plugin-palettes/src/ajustementDeLaReference.ts';
import { analyserPalette } from '../../../../../packages/plugin-palettes/src/analyse.ts';
import { ajouter, nouvellePalette, renommer } from '../../../../../packages/plugin-palettes/src/edition.ts';
import { NOM_DU_PROFIL, NOM_DU_ROLE, contrasteEcrit, jugementDuSeuil, niveauEcrit } from '../../../../../packages/plugin-palettes/src/ui/textes.ts';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const GALERIE = path.resolve(ICI, '../../../../../packages/plugin-palettes/dist/galerie/sombre');
if (!fs.existsSync(GALERIE)) throw new Error('Galerie absente : lancer « npm run galerie --workspace ucm-palettes-plugin ».');

/* Le moteur : Vert, #16A34A, comme la galerie « ajustement-ouvert » */

const RECETTE = ajouter(recetteParDefaut(), renommer(nouvellePalette(recetteParDefaut(), 'p-2b3c4d5e', '#16A34A'), 'Vert'));
const VERT = RECETTE.palettes[0];
const NOMS_DE_MODE = { light: 'Light', dark: 'Dark' };
const esc = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const milliers = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const ANALYSE_DU_VERT = analyserPalette(RECETTE, VERT);
const MANQUEES = ANALYSE_DU_VERT.promesses.filter((promesse) => promesse.verdict === 'manquee');
const CRAN_DE_LA_REFERENCE = ANALYSE_DU_VERT.ancrage.crans;
const MODE_EN_ECHEC = MANQUEES[0].mode;

/** Le pas le plus proche qui tient toutes les garanties ; à égalité, celui qui garde la nuance visée. */
function reparations() {
  for (let distance = 1; distance < 40; distance += 1) {
    const trouvees = [-distance, distance].flatMap((pas) => {
      const hexa = propositionAuPas(RECETTE, VERT, pas);
      const apres = hexa ? paletteAjustee(RECETTE, VERT, hexa) : null;
      if (!apres || manqueesParIntensite(RECETTE, apres).some(({ manquees }) => manquees > 0)) return [];
      return [{ pas, hexa, visee: nuancesVisees(RECETTE, apres) }];
    });
    if (trouvees.length > 0) return trouvees;
  }
  return [];
}
const REPARATIONS = reparations();
const PROPOSITION = REPARATIONS.find((r) => r.visee.light === CRAN_DE_LA_REFERENCE.light && r.visee.dark === CRAN_DE_LA_REFERENCE.dark) ?? REPARATIONS[0];
const APRES = paletteAjustee(RECETTE, VERT, PROPOSITION.hexa);
const COMPAREES = garantiesComparees(RECETTE, VERT, APRES);
const BILANS = manqueesParIntensite(RECETTE, VERT).map(({ intensite, manquees }, rang) => ({ intensite, avant: manquees, apres: manqueesParIntensite(RECETTE, APRES)[rang].manquees }));

const sens = (pas) => (pas < 0 ? 'plus sombre' : 'plus clair');
const roleEcrit = (role) => (role === 'fond' ? 'fond de page' : NOM_DU_ROLE[role]);
const ROLE_AVEC_ARTICLE = { 'border-control': 'les bordures de champ', focus: 'l’anneau de focus', text: 'le texte coloré', 'on-solid': 'le texte sur fond plein', solid: 'le fond plein', surface: 'le fond léger', 'surface-card': 'le fond de carte', fond: 'le fond de page' };
const code = (texte) => `<code class="code-du-role">${esc(texte)}</code>`;
const badge = (promesse) => {
  const niveau = niveauEcrit(promesse.contraste, jugementDuSeuil(promesse.paire.seuil));
  return `<span class="badge-de-niveau" data-atteint="${niveau.atteint}">${esc(niveau.ecrit)}</span>`;
};
const resultat = (promesse) => `<span class="${promesse.verdict === 'tenue' ? 'v6-tenue' : 'v6-manquee'}">${promesse.verdict === 'tenue' ? '✓' : '✗'} ${contrasteEcrit(promesse.contraste)}</span>`;

const ROLES_MANQUES = (() => {
  const associations = MANQUEES.map((promesse) => associationDe(promesse.paire));
  const premiers = [...new Set(associations.map((a) => ROLE_AVEC_ARTICLE[a.premier]))];
  const seconds = [...new Set(associations.map((a) => roleEcrit(a.second)))];
  return `${premiers.join(' et ')} sur ${seconds.join(' et ')}`;
})();

/** La phrase b du premier passage, validée : la nuance, le thème, les rôles et le ratio. */
const POURQUOI = `La nuance ${CRAN_DE_LA_REFERENCE[MODE_EN_ECHEC]} est exactement votre couleur. En Thème ${NOMS_DE_MODE[MODE_EN_ECHEC]}, elle est trop claire pour ${ROLES_MANQUES} : ${contrasteEcrit(MANQUEES[0].contraste)} pour un minimum de ${String(MANQUEES[0].seuil).replace('.', ',')}:1.`;

/** La nuance visée par la proposition, puis ce que chaque pas voisin changerait. */
function ligneDesNuances() {
  const pas = pasLePlusProche(RECETTE, VERT, PROPOSITION.hexa);
  const visee = PROPOSITION.visee.light === PROPOSITION.visee.dark ? `Nuance ${PROPOSITION.visee.light} dans les deux thèmes` : `Nuance ${PROPOSITION.visee.light} en Light, ${PROPOSITION.visee.dark} en Dark`;
  const voisins = [-1, 1].flatMap((cote) => {
    const changements = changementAuPasVoisin(RECETTE, VERT, pas, cote);
    if (!changements || changements.length === 0) return [];
    return [`un pas ${sens(cote)} : ${changements.map(({ mode, numero }) => `${numero} en ${NOMS_DE_MODE[mode]}`).join(', ')}`];
  });
  return [visee, ...voisins].join(' · ');
}
const NUANCES = ligneDesNuances();

/** Le tableau avant et après ; `etroit` écrit l'association sur sa propre ligne. */
function tableauAvantApres({ etroit = false } = {}) {
  const lignes = COMPAREES.map(({ avant, apres }) => {
    const association = associationDe(avant.paire);
    const qui = `${code(association.premier)} sur ${association.second === 'fond' ? 'fond' : code(association.second)}`;
    return `<div class="v6-aa-ligne">${etroit ? '' : `<span class="v6-aa-qui">${qui}</span><span class="ligne-secondaire">${NOMS_DE_MODE[avant.mode]} · ${NOM_DU_PROFIL[avant.profil]}</span>`}${etroit ? `<span class="v6-aa-qui">${qui}</span>` : ''}<span>${resultat(avant)}</span><span class="v6-fleche">→</span><span>${resultat(apres)}${badge(apres)}</span></div>`;
  }).join('');
  const bilan = BILANS.map(({ intensite, avant, apres }) => `${NOM_DU_PROFIL[intensite]} ${avant === apres ? `${avant === 0 ? '✓' : `✗ ${avant}`} inchangé` : `${avant === 0 ? '✓' : `✗ ${avant}`} → ${apres === 0 ? '✓' : `✗ ${apres}`}`}`).join(' · ');
  const entete = etroit
    ? `<p class="v6-aa-legende">Thème ${NOMS_DE_MODE[MODE_EN_ECHEC]} · ${esc(NOM_DU_PROFIL[MANQUEES[0].profil])}</p>`
    : '<div class="v6-aa-ligne v6-aa-entete"><span>Garantie</span><span>Thème</span><span>Avant</span><span></span><span>Après</span></div>';
  return `<div class="v6-aa${etroit ? ' v6-aa-etroit' : ''}">${entete}${lignes}<p class="ligne-secondaire v6-bilan">${esc(bilan)}</p></div>`;
}

/* Le navigateur : outils posés dans chaque page de la galerie */

const OUTILS = String.raw`window.M = {
  html(texte) { const t = document.createElement('template'); t.innerHTML = texte.trim(); return t.content.firstElementChild; },
  /* Ne garde visibles que les cibles et leurs ancêtres ; le reste se retire de la mise en page. */
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
    const cibles = selecteurs.flatMap((s) => [...document.querySelectorAll(s)]);
    let bas = 0;
    for (const c of cibles) for (const e of [c, ...c.querySelectorAll('*')]) {
      if (e.offsetParent === null && getComputedStyle(e).position !== 'fixed') continue;
      bas = Math.max(bas, e.getBoundingClientRect().bottom + window.scrollY);
    }
    return Math.ceil(bas);
  },
  /* Le nombre de lignes d'un bloc de texte, à sa hauteur de ligne. */
  lignes(e) { return Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)); },
  fermerLeSelecteurDeCouleur() {
    for (const e of document.querySelectorAll('.selecteur-de-couleur')) e.style.display = 'none';
    for (const e of document.querySelectorAll('.pipette[aria-expanded="true"]')) e.setAttribute('aria-expanded', 'false');
  },
  /* Les badges passés sous leur ratio. */
  aLaLigne(racine) {
    return [...racine.querySelectorAll('.garantie-resultat')].filter((r) => { const b = r.querySelector('.badge-de-niveau'); return b && b.getBoundingClientRect().top > r.getBoundingClientRect().top + 6; }).length;
  },
  figer() {
    for (const s of document.querySelectorAll('body script')) s.remove();
    for (const e of document.querySelectorAll('body [style*="display: none"]')) e.remove();
    for (const i of document.querySelectorAll('input')) i.setAttribute('value', i.value);
    document.activeElement?.blur?.();
    return { classe: document.documentElement.className, corpsClasse: document.body.className, corps: document.body.innerHTML };
  },
};`;

/* Les transformations, jouées dans la page : elles ne voient que `M` et leurs arguments. */

/** Les mesures d'un panneau d'ajustement : largeur, lignes de la phrase, lignes du tableau et ce qu'il couvre. */
function mesurerLAjustement(panneau) {
  const phrase = panneau.querySelector('.v6-pourquoi');
  const lignes = [...panneau.querySelectorAll('.v6-aa-ligne:not(.v6-aa-entete)')];
  const simple = lignes.length ? Math.min(...lignes.map((l) => l.getBoundingClientRect().height)) : 0;
  const cadre = panneau.getBoundingClientRect();
  const hors = (selecteur) => {
    const e = document.querySelector(selecteur);
    if (!e) return false;
    const r = e.getBoundingClientRect();
    return r.bottom <= cadre.top || r.top >= cadre.bottom || r.right <= cadre.left || r.left >= cadre.right;
  };
  return {
    largeur: Math.round(cadre.width),
    hauteur: Math.round(cadre.height),
    phrase: M.lignes(phrase),
    rangees: lignes.length,
    rangeesSurDeux: lignes.filter((l) => l.getBoundingClientRect().height > simple * 1.5).length,
    depasse: Math.max(0, Math.round(cadre.bottom - window.innerHeight)),
    voit: {
      code: hors('[aria-label="Configuration de la palette"] .colonnes-de-base'),
      apercu: hors('.nuancier-surface'),
      titre: hors('.tete-de-la-palette'),
    },
  };
}

/** M1 : le panneau d'aujourd'hui sous la pastille, à 232 px, réorganisé selon la forme A. */
function ajusterDansLeSelecteur({ pourquoi, nuances, tableau }) {
  const panneau = document.querySelector('.ajustement');
  panneau.prepend(M.html(`<p class="v6-pourquoi">${pourquoi}</p>`));
  panneau.querySelector('.ajustement-luminosite')?.remove();
  panneau.querySelector('.ajustement-annonces').replaceWith(M.html(`<p class="ligne-secondaire">${nuances}</p>`));
  panneau.querySelector('.ajustement-garanties').replaceWith(M.html(tableau));
  [...panneau.querySelectorAll(':scope > p.ligne-secondaire')].find((p) => p.textContent.startsWith('Nuance visée'))?.remove();
  return mesurerLAjustement(document.querySelector('.selecteur-de-couleur'));
}

/**
 * M2 : la même forme A dans une modale posée au-dessus du panneau, le fond
 * assombri. Les témoins et la piste des pas sont ceux du sélecteur, déplacés.
 */
function ajusterEnModale({ pourquoi, nuances, tableau, largeur }) {
  const selecteur = document.querySelector('.selecteur-de-couleur');
  const temoins = selecteur.querySelector('.ajustement-temoins').cloneNode(true);
  const reglette = selecteur.querySelector('.ajustement-reglette').cloneNode(true);
  const codeDeLaProposition = selecteur.querySelector('.ajustement .champ-hexa').value;
  M.fermerLeSelecteurDeCouleur();
  const voile = M.html(`<div class="v6-voile">
    <div class="v6-modale" role="dialog" aria-modal="true" aria-label="Ajuster la référence" style="width:${largeur}">
      <h2 class="v6-modale-titre">Ajuster la référence</h2>
      <p class="v6-pourquoi">${pourquoi}</p>
      <div class="v6-place-temoins"></div>
      <div class="v6-place-reglette"></div>
      <p class="ligne-secondaire">${nuances}</p>
      <label class="champ-colonne"><span class="libelle-de-champ">Code de la proposition</span><span class="champ-ligne"><input type="text" class="input champ-hexa v6-code" value="${codeDeLaProposition}"></span></label>
      ${tableau}
      <div class="confirmation-gestes"><button type="button" class="btn btn-secondary"><span>Annuler</span></button><button type="button" class="btn btn-primary"><span>Appliquer</span></button></div>
    </div>
  </div>`);
  voile.querySelector('.v6-place-temoins').replaceWith(temoins);
  voile.querySelector('.v6-place-reglette').replaceWith(reglette);
  document.body.append(voile);
  return mesurerLAjustement(voile.querySelector('.v6-modale'));
}

/**
 * G2 : la liste des garanties refaite en encadrés, un par minimum, les états
 * nommés une fois en tête de colonne. `etroite` pose N1 ou N2 sous 700 px.
 * `pire` écrit dans chaque case le résultat le plus large : « ✗ 21,00 » et
 * le badge donné. Les spécimens, numéros, ratios, badges et blocs d'échec
 * sont ceux du plugin, déplacés.
 */
function refaireLesGaranties({ etroite = '', pire = '' }) {
  const ETATS = ['default', 'hover', 'active'];
  const liste = document.querySelector('.liste-des-garanties');
  const groupes = [];
  let decoratif = null;
  for (const e of [...liste.children]) {
    if (e.matches('.garanties-groupe')) groupes.push({ titre: e.childNodes[0].textContent.trim(), minimum: e.querySelector('.ligne-secondaire').textContent, lignes: [] });
    else if (e.matches('.garantie')) groupes.at(-1).lignes.push({ ligne: e, echec: null });
    else if (e.matches('.garantie-echec')) groupes.at(-1).lignes.at(-1).echec = e;
    else if (e.matches('.garantie-decorative')) decoratif = e;
  }
  liste.className = `liste-des-garanties v6-g2${etroite ? ` v6-${etroite}` : ''}`;
  liste.replaceChildren();
  for (const groupe of groupes) {
    const bloc = M.html(`<section class="v6-groupe"><div class="v6-groupe-tete"><span>${groupe.titre}</span><span class="ligne-secondaire">${groupe.minimum}</span></div><div class="v6-colonnes"><span></span>${ETATS.map((nom, rang) => `<span data-rang="${rang}">${nom}</span>`).join('')}</div></section>`);
    for (const { ligne, echec } of groupe.lignes) {
      const qui = ligne.querySelector('.garantie-qui');
      const cellules = [...ligne.querySelectorAll('.garantie-etat')].map((etat) => {
        const nom = etat.children.length > 3 ? etat.lastElementChild : null;
        etat.dataset.rang = String(nom ? ETATS.indexOf(nom.textContent.trim()) : 0);
        nom?.remove();
        etat.classList.add('v6-etat');
        return etat;
      });
      ligne.classList.add('v6-ligne');
      ligne.replaceChildren(qui, ...cellules);
      bloc.append(ligne);
      if (echec) bloc.append(echec);
    }
    liste.append(bloc);
  }
  if (decoratif) liste.append(decoratif);
  if (pire) {
    for (const r of liste.querySelectorAll('.garantie-resultat')) {
      r.dataset.verdict = 'manquee';
      r.innerHTML = `✗ 21,00<span class="badge-de-niveau" data-atteint="${pire === 'AAA'}">${pire}</span>`;
    }
  }
  const carte = document.querySelector('[aria-label="Garanties de contraste"]');
  return { carte: Math.round(carte.getBoundingClientRect().height), aLaLigne: M.aLaLigne(liste), resultats: liste.querySelectorAll('.garantie-resultat').length };
}

/** La carte telle qu'aujourd'hui : sa hauteur, et les badges passés à la ligne. */
function mesurerLesGaranties() {
  const carte = document.querySelector('[aria-label="Garanties de contraste"]');
  return { carte: Math.round(carte.getBoundingClientRect().height), aLaLigne: M.aLaLigne(carte), resultats: carte.querySelectorAll('.garantie-resultat').length };
}

/* La feuille des propositions, posée dans chaque écran ; ses classes commencent par v6-. */

const CSS_V6 = `
.v6-pourquoi { margin: 0; padding: var(--espace-controle); border-radius: var(--rayon); background: var(--fond-note); color: var(--texte); }
.v6-tenue { color: var(--texte-succes); font-variant-numeric: tabular-nums; white-space: nowrap; }
.v6-manquee { color: var(--texte-danger); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.v6-fleche { color: var(--texte-second); }
.v6-aa { display: grid; gap: 2px; }
.v6-aa-ligne { display: grid; grid-template-columns: minmax(0, 1fr) 76px 64px 12px 96px; column-gap: var(--espace-controle); align-items: baseline; padding: 3px 0; border-top: 1px solid var(--bordure); }
.v6-aa-entete { color: var(--texte-second); border-top: 0; }
.v6-aa-etroit .v6-aa-ligne { grid-template-columns: auto auto minmax(0, 1fr); row-gap: 2px; }
.v6-aa-etroit .v6-aa-qui { grid-column: 1 / -1; }
.v6-aa-legende { margin: 0; font-weight: 600; }
.v6-bilan { margin: 4px 0 0; }
.v6-aa .code-du-role, .v6-g2 .code-du-role, .v6-g2 ~ .garantie-decorative .code-du-role { font-size: 11px; padding: 0 4px; border-radius: 3px; background: var(--fond-note); }

/* M2 : la modale, au-dessus du panneau, le fond assombri. */
.v6-voile { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; padding: 16px; background: rgba(0, 0, 0, 0.55); }
.v6-modale { display: grid; gap: var(--espace-controle); max-width: 100%; max-height: calc(100vh - 32px); overflow: auto; padding: var(--espace-bloc) 16px 16px; border: 1px solid var(--bordure); border-radius: 8px; background: var(--fond); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
.v6-modale-titre { margin: 0; font-size: var(--libelle); font-weight: 600; }
.v6-modale .champ-ligne .v6-code { flex: 0 0 120px; }
.v6-modale .confirmation-gestes { justify-content: flex-start; }

/* G2 : un encadré par groupe, chaque état sur une ligne, la rangée choisie marquée d'une barre écartée du texte. */
.v6-g2 { gap: var(--espace-bloc); }
.v6-g2 .v6-groupe { display: grid; border: 1px solid var(--bordure); border-radius: var(--rayon); overflow: hidden; }
.v6-g2 .v6-groupe-tete { display: flex; justify-content: space-between; padding: 6px var(--espace-bloc); background: var(--fond-note); font-weight: 600; font-size: var(--libelle); }
.v6-g2 .v6-colonnes, .v6-g2 .v6-ligne, .v6-g2 .garantie-echec { display: grid; grid-template-columns: minmax(0, 1fr) repeat(3, 146px); column-gap: var(--espace-controle); }
.v6-g2 .v6-colonnes { padding: 6px var(--espace-bloc) 2px 18px; color: var(--texte-second); }
.v6-g2 .v6-ligne { position: relative; padding: 6px var(--espace-bloc) 6px 18px; border: 0; border-top: 1px solid var(--bordure); border-radius: 0; box-shadow: none; align-items: center; }
.v6-g2 .v6-colonnes + .v6-ligne { border-top: 0; }
.v6-g2 .v6-ligne[aria-pressed='true'] { background: var(--fond-survol); box-shadow: none; }
.v6-g2 .v6-ligne[aria-pressed='true']::before { content: ''; position: absolute; left: 6px; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: var(--bordure-marque); }
.v6-g2 .garantie-qui { display: flex; flex-wrap: wrap; column-gap: var(--espace-controle); align-items: baseline; }
.v6-g2 .v6-etat { width: auto; grid-template-columns: 64px auto; grid-template-rows: auto auto; column-gap: 6px; row-gap: 0; justify-items: start; align-items: center; }
.v6-g2 .v6-etat .specimen-cadre { grid-row: 1 / span 2; }
.v6-g2 .garantie-resultat { white-space: nowrap; }
.v6-g2 .garantie-echec { padding: 0 var(--espace-bloc) var(--espace-controle) 18px; background: var(--fond-survol); }
.v6-g2 .garantie-echec > * { grid-column: 2 / -1; }
.v6-g2 .v6-colonnes > [data-rang='0'], .v6-g2 .v6-etat[data-rang='0'] { grid-column: 2; }
.v6-g2 .v6-colonnes > [data-rang='1'], .v6-g2 .v6-etat[data-rang='1'] { grid-column: 3; }
.v6-g2 .v6-colonnes > [data-rang='2'], .v6-g2 .v6-etat[data-rang='2'] { grid-column: 4; }
.v6-g2 .v6-ligne > .garantie-qui, .v6-g2 .v6-etat { grid-row: 1; }

/* N1 : le nom français sous le code, un spécimen réduit à gauche des chiffres, des cases plus étroites. */
.v6-n1 .v6-colonnes, .v6-n1 .v6-ligne, .v6-n1 .garantie-echec { grid-template-columns: minmax(0, 1fr) repeat(3, 108px); column-gap: 6px; }
.v6-n1 .v6-colonnes { padding-left: 14px; padding-right: 8px; }
.v6-n1 .v6-ligne { padding: 6px 8px 6px 14px; }
.v6-n1 .v6-ligne[aria-pressed='true']::before { left: 4px; }
.v6-n1 .garantie-echec { padding-left: 14px; padding-right: 8px; }
.v6-n1 .garantie-echec > * { grid-column: 1 / -1; }
.v6-n1 .garantie-qui { display: grid; }
.v6-n1 .v6-etat { grid-template-columns: 22px auto; column-gap: 4px; }
.v6-n1 .v6-etat .specimen-cadre { width: 22px; height: 22px; overflow: hidden; }
.v6-n1 .v6-etat .specimen-forme { transform: scale(0.5); }

/* N2 : le spécimen au-dessus des numéros et du ratio, comme G1, dans des cases étroites. */
.v6-n2 .v6-colonnes, .v6-n2 .v6-ligne, .v6-n2 .garantie-echec { grid-template-columns: minmax(0, 1fr) repeat(3, 92px); column-gap: 6px; }
.v6-n2 .v6-colonnes { padding-left: 14px; padding-right: 8px; }
.v6-n2 .v6-colonnes > [data-rang] { text-align: center; }
.v6-n2 .v6-ligne { padding: 6px 8px 6px 14px; align-items: start; }
.v6-n2 .v6-ligne[aria-pressed='true']::before { left: 4px; }
.v6-n2 .garantie-echec { padding-left: 14px; padding-right: 8px; }
.v6-n2 .garantie-echec > * { grid-column: 1 / -1; }
.v6-n2 .garantie-qui { display: grid; }
.v6-n2 .v6-etat { grid-template-columns: auto; grid-template-rows: auto; justify-items: center; row-gap: 2px; }
.v6-n2 .v6-etat .specimen-cadre { grid-row: auto; width: 56px; height: 22px; }
`;

/* Les écrans */

const navigateur = await chromium.launch();
let CSS_DU_PLUGIN = '';
const ECRANS = [];

/**
 * Ouvre un état de la galerie, joue les gestes demandés, applique la
 * transformation, ne garde que `montrer`, puis range l'écran. `fenetre`
 * donne à l'écran la hauteur de la fenêtre, pour une modale. Rend l'écran et
 * ce que la transformation a mesuré.
 */
async function ecran(id, { etat, largeur = 770, hauteur = 720, gestes = [], transformer = null, args = {}, montrer = ['#app'], fenetre = false }) {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur } });
  await page.goto(`file:///${path.join(GALERIE, `${etat}.html`).replace(/\\/g, '/')}`);
  await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  if (!CSS_DU_PLUGIN) CSS_DU_PLUGIN = await page.evaluate(() => [...document.head.querySelectorAll('style')].map((s) => s.textContent).join('\n'));
  for (const geste of gestes) {
    if (geste === 'Escape') await page.keyboard.press('Escape');
    else await page.click(geste);
    await page.waitForTimeout(60);
  }
  await page.addScriptTag({ content: OUTILS });
  // Les deux présentations d'ajustement se mesurent par la même fonction, posée dans la page.
  await page.addScriptTag({ content: mesurerLAjustement.toString() });
  await page.addStyleTag({ content: CSS_V6 });
  const mesures = transformer ? (await page.evaluate(transformer, args)) ?? {} : {};
  await page.evaluate((s) => M.seul(s), montrer);
  const bas = fenetre ? hauteur : (await page.evaluate((s) => M.bas(s), montrer)) + 16;
  const fige = await page.evaluate(() => M.figer());
  await page.close();
  ECRANS.push({ id, largeur, hauteur: bas, ...fige });
  return { html: `<iframe class="plugin" data-ecran="${id}" style="width:${largeur}px;height:${bas}px" scrolling="no" title="${esc(id)}"></iframe>`, mesures };
}

const GARANTIES = '[aria-label="Garanties de contraste"]';
const DEPLIER_LES_GARANTIES = `${GARANTIES} .carte-bascule`;
const HAUT_DU_PANNEAU = ['.header', '.onglets', '.choix-de-palette', '.tete-de-la-palette', '[aria-label="Configuration de la palette"]', '.nuancier-tete', '.nuancier-surface'];

/* Z3.4 : ajuster la référence, M1 contre M2 */

const tableauLarge = tableauAvantApres();
const tableauEtroit = tableauAvantApres({ etroit: true });
const z34 = {
  M1: await ecran('z34-M1', { etat: 'ajustement-ouvert', transformer: ajusterDansLeSelecteur, args: { pourquoi: POURQUOI, nuances: NUANCES, tableau: tableauEtroit }, montrer: [...HAUT_DU_PANNEAU, '.selecteur-de-couleur'] }),
  M2: await ecran('z34-M2', { etat: 'ajustement-ouvert', transformer: ajusterEnModale, args: { pourquoi: POURQUOI, nuances: NUANCES, tableau: tableauLarge, largeur: '520px' }, montrer: ['#app', '.v6-voile'], fenetre: true }),
  M2etroit: await ecran('z34-M2-500', { etat: 'ajustement-ouvert', largeur: 500, hauteur: 520, transformer: ajusterEnModale, args: { pourquoi: POURQUOI, nuances: NUANCES, tableau: tableauEtroit, largeur: 'calc(100vw - 32px)' }, montrer: ['#app', '.v6-voile'], fenetre: true }),
  M1etroit: await ecran('z34-M1-500', { etat: 'ajustement-ouvert', largeur: 500, hauteur: 520, transformer: ajusterDansLeSelecteur, args: { pourquoi: POURQUOI, nuances: NUANCES, tableau: tableauEtroit }, montrer: [...HAUT_DU_PANNEAU, '.selecteur-de-couleur'] }),
  apres: await ecran('z34-apres', { etat: 'reference-ajustee', montrer: ['[aria-label="Configuration de la palette"]'] }),
};

/* Z3.5 : garanties à 500 px, N1 contre N2 */

const garanties = (id, largeur, args) => ecran(id, { etat: 'garantie-en-echec', largeur, hauteur: largeur === 500 ? 520 : 720, gestes: [DEPLIER_LES_GARANTIES], transformer: args ? refaireLesGaranties : mesurerLesGaranties, args: args ?? {}, montrer: [GARANTIES] });
const z35 = {
  A0: await garanties('z35-A0-500', 500, null),
  N1: await garanties('z35-N1', 500, { etroite: 'n1' }),
  N2: await garanties('z35-N2', 500, { etroite: 'n2' }),
  N1pire: await garanties('z35-N1-pire', 500, { etroite: 'n1', pire: 'AAA' }),
  N2pire: await garanties('z35-N2-pire', 500, { etroite: 'n2', pire: 'AAA' }),
  G2: await garanties('z35-G2-770', 770, {}),
  G2pire: await garanties('z35-G2-770-pire', 770, { pire: 'AAA' }),
};
/** Le badge le plus large, « AA ✗ », se mesure sans écran. */
const pireEchec = {};
for (const [cle, args, largeur] of [['N1', { etroite: 'n1', pire: 'AA ✗' }, 500], ['N2', { etroite: 'n2', pire: 'AA ✗' }, 500], ['G2', { pire: 'AA ✗' }, 770]]) {
  const id = `z35-${cle}-echec`;
  pireEchec[cle] = (await garanties(id, largeur, args)).mesures.aLaLigne;
  ECRANS.splice(ECRANS.findIndex((e) => e.id === id), 1);
}

await navigateur.close();

/* La page */

function blocDeQuestion(numero, titre, explication, ecrans, choix) {
  return `<div class="qbloc"><div class="qtete"><span class="qnum">${numero}</span><h3>${titre}</h3></div>${explication ? `<p>${explication}</p>` : ''}${ecrans ? `<div class="scene"><div class="scene-rangee">${ecrans}</div></div>` : ''}${choix ? `<div class="qchoix">${choix}</div>` : ''}</div>`;
}
const vue = (contenu, lettre, legende) => `<div class="qecran">${lettre ? `<span class="qlettre">${lettre}</span>` : ''}${contenu}<p class="legende">${legende}</p></div>`;
const reco = (texte = 'Recommandé.') => `<span class="reco">${texte}</span>`;
const lignesEcrites = (n) => `${n} ligne${n > 1 ? 's' : ''}`;
const surDeux = (m) => (m.rangeesSurDeux === 0 ? `${m.rangees} rangées sur une ligne` : `${m.rangeesSurDeux} rangée${m.rangeesSurDeux > 1 ? 's' : ''} sur ${m.rangees} passent sur deux lignes`);
const couvreEcrit = (m) => {
  const couverts = [!m.voit.titre && 'le titre', !m.voit.code && 'le code et la ligne des garanties manquées', !m.voit.apercu && 'l’aperçu'].filter(Boolean);
  return couverts.length ? `Couvre ${couverts.join(', ')}.` : 'Ne couvre ni le code ni l’aperçu.';
};
const legendeDAjustement = (m, prefixe) => `${prefixe} ${m.largeur} px de large, ${milliers(m.hauteur)} px de haut${m.depasse ? `, dont ${m.depasse} px sous la fenêtre` : ', dans la fenêtre'}. Phrase : ${lignesEcrites(m.phrase)} ; tableau : ${surDeux(m)}. ${couvreEcrit(m)}`;
const hauteurEcrite = (m, reference) => `${milliers(m.carte)} px${reference ? ` (${m.carte <= reference ? '−' : '+'}${milliers(Math.abs(reference - m.carte))} contre aujourd’hui)` : ''}`;
const badgesEcrits = (n) => (n === 0 ? 'aucun badge à la ligne' : `${n} badge${n > 1 ? 's' : ''} à la ligne`);

const [m1, m2, m2e, m1e] = [z34.M1.mesures, z34.M2.mesures, z34.M2etroit.mesures, z34.M1etroit.mesures];
const sectionZ34 = `<section class="bloc" id="z3-4">
  <div class="tete"><span class="sur">Z3.4 · Ajuster la référence</span><h2>Une modale, ou le panneau d’aujourd’hui</h2></div>
  <p>Vert, ${VERT.reference}, après un pas ${sens(PROPOSITION.pas)} (${PROPOSITION.hexa}). Forme A et phrase b, validées au premier passage : la phrase en tête, les témoins et les pas, une ligne pour la nuance visée, le code, le tableau avant et après, le bilan. Sans luminosité. Sous le code, « ✗ 2 garanties manquées en Thème Light » et le lien sont déjà dans le plugin.</p>
  ${blocDeQuestion('Question 1', 'La présentation',
    'À 770 px, puis à 500 px.',
    [
      vue(z34.M1.html, 'M1', legendeDAjustement(m1, 'Sous la pastille :')),
      vue(z34.M2.html, 'M2', legendeDAjustement(m2, 'Modale :')),
      vue(z34.M1etroit.html, 'M1', legendeDAjustement(m1e, 'À 500 px :')),
      vue(z34.M2etroit.html, 'M2', legendeDAjustement(m2e, 'À 500 px :')),
    ].join(''),
    `<ol><li><b>M1</b> garde le geste sous la pastille. À 232 px, la phrase prend ${lignesEcrites(m1.phrase)}, chaque garantie deux lignes, et le panneau descend de ${m1.depasse} px sous la fenêtre (${m1e.depasse} px à 500 px) : « Appliquer » s’atteint en défilant.</li><li><b>M2</b> ${reco()} ${m2.largeur} px de large ; la phrase tient en ${lignesEcrites(m2.phrase)}, le tableau garde ses colonnes, et tout tient dans la fenêtre, à 500 px aussi. À 770 px, l’en-tête, les onglets et la barre restent visibles, assombris ; à 500 px, la modale prend presque toute la fenêtre. Le fond assombri dit qu’on ajuste la référence et rien d’autre. « Annuler », Échap et « Appliquer » la referment et rendent le focus à la pastille ; un clic sur le voile vaut « Annuler ».</li></ol>
    <p>Si « modal » désignait autre chose, le dire sur ces écrans.</p>`)}
  ${blocDeQuestion('Après', '« Appliquer »',
    '',
    vue(z34.apres.html, '', 'La modale se referme. Plus de garantie manquée : la ligne et le lien disparaissent, « Ajustée depuis #16A34A · Revenir à l’originale » reste.'),
    '')}
</section>`;

const a0 = z35.A0.mesures;
const sectionZ35 = `<section class="bloc" id="z3-5">
  <div class="tete"><span class="sur">Z3.5 · Garanties de contraste</span><h2>À 500 px, chaque rangée sur une ligne</h2></div>
  <p>Bleu, deux intensités, la courbe claire au cran 700 à 0,55 : text sur fond manque en Light, la ligne est choisie. G2, validée, garde ses encadrés et ses états nommés une fois ; seule la rangée change sous 700 px. Aujourd’hui à 500 px : ${hauteurEcrite(a0)}, ${badgesEcrits(a0.aLaLigne)}.</p>
  ${blocDeQuestion('Question 1', 'La disposition étroite',
    'À 500 px, la largeur minimale de la fenêtre.',
    [
      vue(z35.N1.html, 'N1', `Nom sous le code, spécimen réduit à gauche : ${hauteurEcrite(z35.N1.mesures, a0.carte)}, ${badgesEcrits(z35.N1.mesures.aLaLigne)}.`),
      vue(z35.N2.html, 'N2', `Spécimen au-dessus des chiffres : ${hauteurEcrite(z35.N2.mesures, a0.carte)}, ${badgesEcrits(z35.N2.mesures.aLaLigne)}.`),
    ].join(''),
    `<ol><li><b>N1</b> est la plus basse, mais le spécimen réduit à 22 px ne montre plus la forme du rôle, et le nom se serre.</li><li><b>N2</b> ${reco()} Le spécimen reste lisible, comme dans la carte d’aujourd’hui ; la rangée est plus haute.</li></ol>`)}
  ${blocDeQuestion('Question 1 bis', 'Au résultat le plus long',
    'Chaque case réécrite « ✗ 21,00 » et « AAA ». Avec « AA ✗ », plus large encore : N1 ' + badgesEcrits(pireEchec.N1) + ', N2 ' + badgesEcrits(pireEchec.N2) + ', G2 à 770 px ' + badgesEcrits(pireEchec.G2) + '.',
    [
      vue(z35.N1pire.html, 'N1', badgesEcrits(z35.N1pire.mesures.aLaLigne) + '.'),
      vue(z35.N2pire.html, 'N2', badgesEcrits(z35.N2pire.mesures.aLaLigne) + '.'),
    ].join(''),
    '')}
  ${blocDeQuestion('Rappel', 'G2 à 770 px',
    'La fenêtre passe de 850 à 770 px : G2 garde sa disposition validée.',
    [
      vue(z35.G2.html, 'G2', `${hauteurEcrite(z35.G2.mesures)}, ${badgesEcrits(z35.G2.mesures.aLaLigne)}.`),
      vue(z35.G2pire.html, 'G2', `Au résultat le plus long : ${badgesEcrits(z35.G2pire.mesures.aLaLigne)}.`),
    ].join(''),
    '')}
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
<title>Maquettes du sixième tour</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap">
<style>
${STYLE}</style>
</head>
<body>
<main>
<section class="intro">
  <span class="sur">UCM Palettes · plan d’ergonomie, sixième tour · lot Z3, second passage</span>
  <h1>Maquettes à valider</h1>
  <p>Deux questions restent du premier passage. Chaque écran est l’interface réelle, tirée de la galerie au thème sombre de Figma, à 770 px, la largeur que le plugin a désormais, puis réorganisée. Couleurs et ratios : le moteur.</p>
  <p>Déjà validé au premier passage, et construit depuis : onglets Création et Palettes, aucune palette choisie à l’ouverture (D1, texte a), pastilles et libellés de l’onglet Palettes, code hexa et intensités en segments, la ligne sous le code (lien b). Les réponses sont dans le plan.</p>
  <p class="note">Page écrite par <code>generer-maquettes-v6.mjs</code>, après <code>npm run galerie --workspace ucm-palettes-plugin</code> : <code>node --import tsx "docs/notes/Recherches/Plugin Palettes/2 Ergonomie/generer-maquettes-v6.mjs"</code>. Le premier passage est dans l’historique git de ce fichier.</p>
  <nav class="sommaire"><a href="#z3-4">Z3.4 Ajuster la référence</a><a href="#z3-5">Z3.5 Garanties à 500 px</a></nav>
</section>
${sectionZ34}
${sectionZ35}
</main>
<script type="text/plain" id="css-plugin">${CSS_DU_PLUGIN}\n${CSS_V6}</script>
${modeles}
<script>
  // Chaque écran s'ouvre dans son iframe, avec la feuille du plugin.
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

fs.writeFileSync(path.join(ICI, 'MAQUETTES-RECETTE-V6.html'), page);
process.stdout.write(`MAQUETTES-RECETTE-V6.html : ${milliers(page.length)} caractères, ${ECRANS.length} écrans\n`);
process.stdout.write(`Z3.4 : ${JSON.stringify({ M1: m1, M2: m2, M1etroit: m1e, M2etroit: m2e })}\n`);
process.stdout.write(`Z3.5 : ${JSON.stringify(Object.fromEntries(Object.entries(z35).map(([k, v]) => [k, v.mesures])))} ; AA ✗ : ${JSON.stringify(pireEchec)}\n`);
