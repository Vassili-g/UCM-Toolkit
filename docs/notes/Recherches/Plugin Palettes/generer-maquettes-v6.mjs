#!/usr/bin/env node
/**
 * Écrit MAQUETTES-RECETTE-V6.html, les maquettes du lot Z3 du sixième plan.
 *
 *   npm run galerie --workspace ucm-palettes-plugin
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-v6.mjs"
 *
 * Les tours précédents redessinaient le panneau en HTML. Celui-ci part de la
 * galerie construite, au thème sombre de Figma : chaque écran est le DOM réel
 * de l'interface, avec sa feuille de style, que Chromium ouvre à 850 px (ou
 * 500 px), puis que la maquette réorganise. Un écran « en place » n'est donc
 * pas une copie, et une disposition proposée est un prototype de la feuille
 * que les lots Z5 et Z6 écriront. Les ratios, les propositions d'ajustement et
 * les rampes viennent du moteur, pour #1E6FD9, #16A34A, #DC2626 et #A0B599.
 *
 * Chaque écran se range dans un <template> et s'affiche dans une iframe, pour
 * que la feuille du plugin ne touche pas celle de la page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import {
  associationDe,
  classerRecette,
  fnv1a,
  jsonCanonique,
  octetsUtf8,
  recetteParDefaut,
} from '../../../../packages/couleur/src/index.ts';
import {
  changementAuPasVoisin,
  garantiesComparees,
  manqueesParIntensite,
  nuancesVisees,
  paletteAjustee,
  pasLePlusProche,
  propositionAuPas,
} from '../../../../packages/plugin-palettes/src/ajustementDeLaReference.ts';
import { analyserPalette } from '../../../../packages/plugin-palettes/src/analyse.ts';
import { ajouter, nouvellePalette, renommer } from '../../../../packages/plugin-palettes/src/edition.ts';
import { NOM_DU_PROFIL, NOM_DU_ROLE, contrasteEcrit, jugementDuSeuil, niveauEcrit } from '../../../../packages/plugin-palettes/src/ui/textes.ts';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const GALERIE = path.resolve(ICI, '../../../../packages/plugin-palettes/dist/galerie/sombre');
if (!fs.existsSync(GALERIE)) throw new Error('Galerie absente : lancer « npm run galerie --workspace ucm-palettes-plugin ».');

/* Le moteur */

const REFERENCES = [['Bleu', '#1E6FD9'], ['Vert', '#16A34A'], ['Rouge', '#DC2626'], ['Sauge', '#A0B599']];
const RECETTE = REFERENCES.reduce(
  (recette, [nom, hexa], rang) => ajouter(recette, renommer(nouvellePalette(recette, `p-0000000${rang + 1}`, hexa), nom)),
  recetteParDefaut(),
);
const NOMS_DE_MODE = { light: 'Light', dark: 'Dark' };
const esc = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const milliers = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** L'état du fichier que le sandbox enverrait pour la recette aux quatre palettes. */
const TEXTE_DE_LA_RECETTE = jsonCanonique(RECETTE);
const ETAT_A_QUATRE_PALETTES = {
  type: 'etat',
  demande: 1,
  classement: classerRecette(TEXTE_DE_LA_RECETTE),
  texte: TEXTE_DE_LA_RECETTE,
  empreinte: fnv1a(octetsUtf8(TEXTE_DE_LA_RECETTE)),
  profil: 'SRGB',
  planche: { page: null, nomDeLaPage: null, cadres: [], manquants: [], recherche: 'page', suiviFutur: false },
};

/*
 * Vert, #16A34A : Vivid porte la référence au 600, et deux garanties du thème
 * Light portent sur cette nuance. Le pas le plus proche qui les tient toutes
 * se cherche des deux côtés ; à égalité, celui qui garde la nuance visée.
 */
const VERT = RECETTE.palettes.find((palette) => palette.nom === 'Vert');
const ANALYSE_DU_VERT = analyserPalette(RECETTE, VERT);
const MANQUEES = ANALYSE_DU_VERT.promesses.filter((promesse) => promesse.verdict === 'manquee');
const CRAN_DE_LA_REFERENCE = ANALYSE_DU_VERT.ancrage.crans;
const MODE_EN_ECHEC = MANQUEES[0].mode;
const PROFIL_EN_ECHEC = MANQUEES[0].profil;

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
const GARDE_LA_NUANCE = (r) => r.visee.light === CRAN_DE_LA_REFERENCE.light && r.visee.dark === CRAN_DE_LA_REFERENCE.dark;
const PROPOSITION = REPARATIONS.find(GARDE_LA_NUANCE) ?? REPARATIONS[0];
const APRES = paletteAjustee(RECETTE, VERT, PROPOSITION.hexa);
const COMPAREES = garantiesComparees(RECETTE, VERT, APRES);
const BILANS = manqueesParIntensite(RECETTE, VERT).map(({ intensite, manquees }, rang) => ({ intensite, avant: manquees, apres: manqueesParIntensite(RECETTE, APRES)[rang].manquees }));

const sens = (pas) => (pas < 0 ? 'plus sombre' : 'plus clair');
const nombreDe = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const roleEcrit = (role) => (role === 'fond' ? 'fond de page' : NOM_DU_ROLE[role]);
/** Un rôle précédé de son article, pour une phrase : « les bordures de champ », « l’anneau de focus ». */
const ROLE_AVEC_ARTICLE = { 'border-control': 'les bordures de champ', focus: 'l’anneau de focus', text: 'le texte coloré', 'on-solid': 'le texte sur fond plein', solid: 'le fond plein', surface: 'le fond léger', 'surface-card': 'le fond de carte', fond: 'le fond de page' };
const code = (texte) => `<code class="code-du-role">${esc(texte)}</code>`;
const badge = (promesse) => {
  const niveau = niveauEcrit(promesse.contraste, jugementDuSeuil(promesse.paire.seuil));
  return `<span class="badge-de-niveau" data-atteint="${niveau.atteint}">${esc(niveau.ecrit)}</span>`;
};
const resultat = (promesse) => `<span class="${promesse.verdict === 'tenue' ? 'v6-tenue' : 'v6-manquee'}">${promesse.verdict === 'tenue' ? '✓' : '✗'} ${contrasteEcrit(promesse.contraste)}</span>`;

/** Les deux rôles des garanties manquées, en mots : « bordure de champ et anneau de focus sur fond léger ». */
const ROLES_MANQUES = (() => {
  const associations = MANQUEES.map((promesse) => associationDe(promesse.paire));
  const premiers = [...new Set(associations.map((a) => ROLE_AVEC_ARTICLE[a.premier]))];
  const seconds = [...new Set(associations.map((a) => roleEcrit(a.second)))];
  return `${premiers.join(' et ')} sur ${seconds.join(' et ')}`;
})();
const DONNEES = {
  hexa: VERT.reference,
  cran: CRAN_DE_LA_REFERENCE[MODE_EN_ECHEC],
  profil: NOM_DU_PROFIL[PROFIL_EN_ECHEC],
  theme: `Thème ${NOMS_DE_MODE[MODE_EN_ECHEC]}`,
  nombre: MANQUEES.length,
  ratio: contrasteEcrit(MANQUEES[0].contraste),
  minimum: `${String(MANQUEES[0].seuil).replace('.', ',')}:1`,
  roles: ROLES_MANQUES,
  deuxSens: REPARATIONS.length > 1,
};

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
    ? `<p class="v6-aa-legende">${esc(DONNEES.theme)} · ${esc(DONNEES.profil)}</p>`
    : '<div class="v6-aa-ligne v6-aa-entete"><span>Garantie</span><span>Thème</span><span>Avant</span><span></span><span>Après</span></div>';
  return `<div class="v6-aa${etroit ? ' v6-aa-etroit' : ''}">${entete}${lignes}<p class="ligne-secondaire">${esc(bilan)}</p></div>`;
}

/* Les textes proposés au designer, en plusieurs rédactions */

const EXPLICATIONS = {
  a: `Votre couleur ${DONNEES.hexa} est la nuance ${DONNEES.profil} ${DONNEES.cran}, telle quelle : le plugin ne la modifie jamais. En ${DONNEES.theme}, elle manque ${nombreDe(DONNEES.nombre, 'garantie')}. Seul un changement de votre couleur peut les tenir.`,
  b: `La nuance ${DONNEES.cran} est exactement votre couleur. En ${DONNEES.theme}, elle est trop claire pour ${DONNEES.roles} : ${DONNEES.ratio} pour un minimum de ${DONNEES.minimum}.`,
  c: `Le plugin garde votre couleur exacte en nuance ${DONNEES.cran}. Pour tenir ses ${nombreDe(DONNEES.nombre, 'garantie')} en ${DONNEES.theme}, ${DONNEES.deuxSens ? 'foncez-la ou éclaircissez-la' : 'déplacez-la'} d’un pas : le tableau dit ce que chaque pas change.`,
};
const LIENS = {
  a: { manque: '', lien: 'Ajuster la référence' },
  b: { manque: `✗ ${nombreDe(DONNEES.nombre, 'garantie')} manquée${DONNEES.nombre > 1 ? 's' : ''} en ${DONNEES.theme}`, lien: 'Ajuster la référence' },
  c: { manque: '', lien: `Ajuster la référence (${nombreDe(DONNEES.nombre, 'garantie')} manquée${DONNEES.nombre > 1 ? 's' : ''})` },
};
const EXPLICATION_RETENUE = EXPLICATIONS.b;
const LIEN_RETENU = LIENS.b;

const NOMBRE_DE_PALETTES = RECETTE.palettes.length;
const INVITATIONS = {
  a: { titre: 'Choisissez une palette', texte: 'Sélectionnez une palette dans la liste pour la régler, ou créez-en une avec « Nouvelle palette ».' },
  b: { titre: 'Aucune palette sélectionnée', texte: `Ce fichier contient ${NOMBRE_DE_PALETTES} palettes. Choisissez-en une dans la liste, ou créez-en une nouvelle.` },
  c: { titre: '', texte: 'Choisissez une palette dans la liste ci-dessus pour l’ouvrir, ou créez-en une nouvelle.' },
};
const SANS_PALETTE = {
  a: 'Créez votre première palette. Les réglages par défaut seront utilisés.',
  b: 'Aucune palette dans ce fichier. Créez la première : elle utilisera les réglages par défaut.',
};

/** Les rampes Vivid du thème Light, pour les raccourcis de D3. */
const RAMPES = Object.fromEntries(RECETTE.palettes.map((palette) => {
  const analyse = analyserPalette(RECETTE, palette);
  return [palette.nom, analyse.rampes[analyse.ancrage.profil].light.map((cran) => cran.hexa)];
}));

/* Le navigateur : outils posés dans chaque page de la galerie */

const OUTILS = String.raw`window.M = {
  html(texte) { const t = document.createElement('template'); t.innerHTML = texte.trim(); return t.content.firstElementChild; },
  /* Ne garde visibles que les cibles et leurs ancêtres ; le reste se retire de la mise en page. */
  seul(selecteurs) {
    const cibles = selecteurs.flatMap((s) => [...document.querySelectorAll(s)]);
    const gardes = new Set();
    for (const c of cibles) for (let e = c; e && e !== document.documentElement; e = e.parentElement) gardes.add(e);
    for (const e of gardes) {
      // Dans une cible, tout reste : seuls les frères de ses ancêtres se retirent.
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
  renommerLesOnglets() {
    document.querySelector('#onglet-palettes').textContent = 'Création';
    document.querySelector('#onglet-planche').textContent = 'Palettes';
  },
  hauteur(selecteur) { const e = document.querySelector(selecteur); return e ? Math.round(e.getBoundingClientRect().height) : 0; },
  fermerLeSelecteurDeCouleur() {
    for (const e of document.querySelectorAll('.selecteur-de-couleur')) e.style.display = 'none';
    for (const e of document.querySelectorAll('.pipette[aria-expanded="true"]')) e.setAttribute('aria-expanded', 'false');
  },
  figer() {
    for (const s of document.querySelectorAll('body script')) s.remove();
    // Ce que seul() a retiré de la mise en page ne s'affichera jamais : l'écran s'en passe.
    for (const e of document.querySelectorAll('body [style*="display: none"]')) e.remove();
    for (const i of document.querySelectorAll('input')) i.setAttribute('value', i.value);
    document.activeElement?.blur?.();
    return { classe: document.documentElement.className, corpsClasse: document.body.className, corps: document.body.innerHTML };
  },
};`;

/* Les transformations, jouées dans la page : elles ne voient que `M` et leurs arguments. */

/** A : le panneau « Ajuster » dans le sélecteur, réorganisé. */
function ajusterDansLeSelecteur({ pourquoi, nuances, tableau }) {
  const panneau = document.querySelector('.ajustement');
  panneau.prepend(M.html(`<p class="v6-pourquoi">${pourquoi}</p>`));
  panneau.querySelector('.ajustement-luminosite').remove();
  panneau.querySelector('.ajustement-annonces').replaceWith(M.html(`<p class="ligne-secondaire">${nuances}</p>`));
  panneau.querySelector('.ajustement-garanties').replaceWith(M.html(tableau));
  // La nuance visée entre dans la ligne des nuances.
  const visee = [...panneau.querySelectorAll(':scope > p.ligne-secondaire')].find((p) => p.textContent.startsWith('Nuance visée'));
  visee?.remove();
}

/** B : le panneau sous la rangée de la référence, pleine largeur, dans la carte de configuration. */
function ajusterSousLaReference({ pourquoi, nuances, tableau, lien }) {
  const popover = document.querySelector('.selecteur-de-couleur');
  const temoins = popover.querySelector('.ajustement-temoins').cloneNode(true);
  const reglette = popover.querySelector('.ajustement-reglette').cloneNode(true);
  const codeDeLaProposition = popover.querySelector('.ajustement .champ-hexa').value;
  M.fermerLeSelecteurDeCouleur();
  const colonnes = document.querySelector('[aria-label="Configuration de la palette"] .colonnes-de-base');
  const bloc = M.html(`<div class="v6-ajuster" role="group" aria-label="Ajuster la référence">
    <p class="v6-ajuster-titre">Ajuster la référence</p>
    <p class="v6-pourquoi">${pourquoi}</p>
    <div class="v6-ajuster-corps">
      <div class="v6-ajuster-pas"><div class="v6-place-temoins"></div><div class="v6-place-reglette"></div>
        <p class="ligne-secondaire">${nuances}</p>
        <label class="champ-colonne"><span class="libelle-de-champ">Code de la proposition</span><span class="champ-ligne"><input type="text" class="input champ-hexa" value="${codeDeLaProposition}"></span></label>
      </div>
      <div class="v6-ajuster-garanties">${tableau}</div>
    </div>
    <div class="confirmation-gestes"><button type="button" class="btn btn-primary"><span>Appliquer</span></button><button type="button" class="btn btn-secondary"><span>Annuler</span></button></div>
  </div>`);
  bloc.querySelector('.v6-place-temoins').replaceWith(temoins);
  bloc.querySelector('.v6-place-reglette').replaceWith(reglette);
  colonnes.after(bloc);
  const lienActuel = colonnes.querySelector('.lien-de-constat');
  if (lien) lienActuel.before(M.html(`<p class="v6-manque">${lien}</p>`));
  lienActuel.setAttribute('aria-expanded', 'true');
  return { panneau: Math.round(bloc.getBoundingClientRect().height) };
}

/** Le lien sous le code, selon une rédaction ; le sélecteur est refermé. */
function lienSousLeCode({ manque, lien }) {
  M.fermerLeSelecteurDeCouleur();
  const actuel = document.querySelector('[aria-label="Configuration de la palette"] .colonnes-de-base .lien-de-constat');
  actuel.textContent = lien;
  if (manque) actuel.before(M.html(`<p class="v6-manque">${manque}</p>`));
}

/** C1 : sous le code, le manque et un lien vers les garanties. */
function lienVersLesGaranties({ manque }) {
  M.fermerLeSelecteurDeCouleur();
  const actuel = document.querySelector('[aria-label="Configuration de la palette"] .colonnes-de-base .lien-de-constat');
  actuel.textContent = 'Voir les garanties';
  actuel.before(M.html(`<p class="v6-manque">${manque}</p>`));
}

/** C2 : chaque ligne en échec porte la proposition qui répare, et « Ajuster à la main ». */
function propositionDansLesGaranties({ originale, proposition, sens, apres }) {
  M.fermerLeSelecteurDeCouleur();
  const echecs = [...document.querySelectorAll('.garantie-echec')];
  for (const echec of echecs) {
    echec.querySelector('[data-cible="ajuster-reference"]')?.remove();
    echec.append(M.html(`<div class="v6-proposition">
      <span class="v6-deux-pastilles"><i style="background:${originale}"></i><i style="background:${proposition}"></i></span>
      <span>Un pas ${sens} : <b>${proposition}</b> · ${apres}</span>
      <button type="button" class="btn btn-primary btn-compact"><span>Appliquer</span></button>
      <button type="button" class="lien-de-constat">Ajuster à la main</button>
    </div>`));
  }
  echecs.at(-1).classList.add('v6-dernier');
  return { basDe: ['.v6-dernier'] };
}

/**
 * G1 et G2 : la liste des garanties refaite en tableau, un groupe par
 * minimum, les états nommés une fois en tête de colonne. Les spécimens, les
 * numéros, les ratios, les badges et les blocs d'échec sont ceux du plugin,
 * déplacés.
 */
function refaireLesGaranties({ forme }) {
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
  liste.className = `liste-des-garanties v6-${forme}`;
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
  const carte = document.querySelector('[aria-label="Garanties de contraste"]');
  const resultats = [...liste.querySelectorAll('.garantie-resultat')];
  const aLaLigne = resultats.filter((r) => { const b = r.querySelector('.badge-de-niveau'); return b && b.getBoundingClientRect().top > r.getBoundingClientRect().top + 6; }).length;
  return { carte: Math.round(carte.getBoundingClientRect().height), aLaLigne, resultats: resultats.length };
}

/** La carte telle qu'aujourd'hui : sa hauteur, et les badges passés à la ligne. */
function mesurerLesGaranties() {
  const carte = document.querySelector('[aria-label="Garanties de contraste"]');
  const resultats = [...carte.querySelectorAll('.garantie-resultat')];
  const aLaLigne = resultats.filter((r) => { const b = r.querySelector('.badge-de-niveau'); return b && b.getBoundingClientRect().top > r.getBoundingClientRect().top + 6; }).length;
  const choisie = getComputedStyle(carte.querySelector('.garantie[aria-pressed="true"]'));
  return { carte: Math.round(carte.getBoundingClientRect().height), aLaLigne, resultats: resultats.length, ombre: choisie.boxShadow, ecart: choisie.paddingLeft };
}

/** L'onglet Création sans palette choisie, avec l'invitation de la disposition demandée. */
function sansPaletteChoisie({ disposition, titre, texte, raccourcis, ouvrirLaListe }) {
  document.querySelector('.configuration-de-la-palette').style.display = 'none';
  const bouton = document.querySelector('.selecteur-bouton');
  bouton.querySelector('.pastille-reference').style.display = 'none';
  const nom = bouton.querySelector('.selecteur-nom');
  nom.textContent = 'Sélectionner une palette';
  nom.classList.add('v6-invite');
  document.querySelector('.menu-palette').style.display = 'none';
  for (const option of document.querySelectorAll('.selecteur-option')) option.setAttribute('aria-selected', 'false');
  if (ouvrirLaListe) {
    document.querySelector('.selecteur-liste').hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
  }
  const entete = titre ? `<h2 class="titre-de-premier-rang">${titre}</h2>` : '';
  const corps = {
    D1: `<div class="v6-invitation">${entete}<p>${texte}</p></div>`,
    D2: `<div class="v6-invitation v6-encart">${entete}<p>${texte}</p><div class="confirmation-gestes"><button type="button" class="btn btn-secondary"><span>Choisir une palette</span></button></div></div>`,
    D3: `<div class="v6-invitation">${entete}<p>${texte}</p><div class="v6-raccourcis">${raccourcis}</div></div>`,
  }[disposition];
  document.querySelector('.choix-de-palette').after(M.html(corps));
}

/** Le premier lancement, avec le texte de remplacement. */
function premierLancement({ texte }) {
  const ligne = document.querySelector('#panneau-palettes .etat-lecture');
  if (ligne && texte) ligne.textContent = texte;
}

/** Q6.2 et Q6.5 : les intensités en segments, le code hexa sur toute sa colonne. */
function segmentsDesIntensites({ libelles }) {
  const carte = document.querySelector('[aria-label="Configuration de la palette"]');
  const reglage = carte.querySelector('.interrupteur-des-intensites > .reglage');
  const modele = carte.querySelector('.bascule-de-base');
  const segments = modele.cloneNode(true);
  segments.setAttribute('aria-label', 'Intensités');
  const [une, deux] = segments.querySelectorAll('.bascule-option');
  une.textContent = libelles[0];
  deux.textContent = libelles[1];
  une.setAttribute('aria-pressed', 'false');
  deux.setAttribute('aria-pressed', 'true');
  const aide = reglage.querySelector('.field-help');
  aide.className = 'ligne-secondaire';
  reglage.replaceWith(segments, aide);
  document.body.classList.add('v6-hexa-large');
}

/* La feuille des propositions, posée dans chaque écran ; ses classes commencent par v6-. */

const CSS_V6 = `
.v6-pourquoi { margin: 0; padding: var(--espace-controle); border-radius: var(--rayon); background: var(--fond-note); color: var(--texte); }
.v6-manque { margin: 0; color: var(--texte-danger); }
.v6-tenue { color: var(--texte-succes); font-variant-numeric: tabular-nums; white-space: nowrap; }
.v6-manquee { color: var(--texte-danger); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.v6-fleche { color: var(--texte-second); }
.v6-aa { display: grid; gap: 2px; }
.v6-aa-ligne { display: grid; grid-template-columns: minmax(0, 1fr) 76px 64px 12px 96px; column-gap: var(--espace-controle); align-items: baseline; padding: 3px 0; border-top: 1px solid var(--bordure); }
.v6-aa-entete { color: var(--texte-second); border-top: 0; }
.v6-aa-etroit .v6-aa-ligne { grid-template-columns: auto auto minmax(0, 1fr); row-gap: 2px; }
.v6-aa-etroit .v6-aa-qui { grid-column: 1 / -1; }
.v6-aa-legende { margin: 0; font-weight: 600; }
.v6-aa .code-du-role, .v6-g1 .code-du-role, .v6-g2 .code-du-role, .v6-g1 ~ .garantie-decorative .code-du-role { font-size: 11px; padding: 0 4px; border-radius: 3px; background: var(--fond-note); }
.v6-ajuster { display: grid; gap: var(--espace-controle); padding: var(--espace-bloc); border: 1px solid var(--bordure); border-radius: var(--rayon); }
.v6-ajuster-titre { margin: 0; font-weight: 600; font-size: var(--libelle); }
.v6-ajuster-corps { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: var(--espace-bloc); align-items: start; }
.v6-ajuster-pas { display: grid; gap: var(--espace-controle); }
.v6-ajuster .confirmation-gestes { justify-content: flex-start; }
@media (max-width: 700px) { .v6-ajuster-corps { grid-template-columns: minmax(0, 1fr); } }
.v6-proposition { display: flex; flex-wrap: wrap; align-items: center; gap: var(--espace-controle); padding: var(--espace-controle); border-radius: var(--rayon); background: var(--fond-note); color: var(--texte); }
.v6-deux-pastilles { display: inline-flex; gap: 2px; }
.v6-deux-pastilles i { width: 14px; height: 14px; border-radius: 3px; }
.v6-invite { color: var(--texte-second); }
.v6-invitation { display: grid; gap: var(--espace-controle); justify-items: start; }
.v6-invitation p { margin: 0; }
.v6-encart { padding: var(--espace-bloc); border: 1px solid var(--bordure); border-radius: var(--rayon); justify-items: stretch; }
.v6-encart .confirmation-gestes { justify-content: flex-start; }
.v6-raccourcis { display: grid; gap: 2px; width: 100%; }
.v6-raccourci { display: grid; grid-template-columns: 14px minmax(0, 1fr) 220px; gap: var(--espace-controle); align-items: center; padding: 6px var(--espace-controle); border-radius: var(--rayon); background: transparent; border: 0; color: var(--texte); font: inherit; text-align: left; }
.v6-raccourci:first-child { background: var(--fond-survol); }
.v6-raccourci .pastille { width: 14px; height: 14px; border-radius: 50%; }
.v6-raccourci .rampe { display: grid; grid-template-columns: repeat(11, 1fr); gap: 1px; }
.v6-raccourci .rampe i { height: 12px; border-radius: 2px; }
.v6-hexa-large .champ-ligne .champ-hexa { flex: 1 1 auto; width: auto; }

/* G1 : un tableau par groupe, les états en tête de colonne, la rangée choisie sur fond. */
.v6-g1, .v6-g2 { gap: var(--espace-bloc); }
.v6-g1 .v6-groupe, .v6-g2 .v6-groupe { display: grid; }
.v6-g1 .v6-groupe-tete { display: flex; justify-content: space-between; padding: var(--espace-serre) var(--espace-controle); border-radius: var(--rayon); background: var(--fond-note); font-weight: 600; font-size: var(--libelle); }
.v6-g1 .v6-colonnes, .v6-g1 .v6-ligne, .v6-g1 .garantie-echec { display: grid; grid-template-columns: minmax(0, 280px) repeat(3, 104px); column-gap: var(--espace-controle); }
.v6-g1 .v6-colonnes { padding: var(--espace-controle) var(--espace-controle) 2px; color: var(--texte-second); }
.v6-g1 .v6-colonnes span { text-align: center; }
.v6-g1 .v6-ligne { padding: var(--espace-controle); border-top: 1px solid var(--bordure); border-radius: 6px; box-shadow: none; }
.v6-g1 .v6-colonnes + .v6-ligne { border-top-color: transparent; }
.v6-g1 .v6-ligne[aria-pressed='true'] { background: var(--fond-survol); box-shadow: inset 0 0 0 1px var(--bordure); border-top-color: transparent; }
.v6-g1 .v6-ligne[aria-pressed='true'] + * { border-top-color: transparent; }
.v6-g1 .v6-etat { width: auto; }
.v6-g1 .garantie-echec { padding: 0 var(--espace-controle) var(--espace-controle); }
.v6-g1 .garantie-echec > * { grid-column: 2 / -1; }
@media (max-width: 600px) { .v6-g1 .v6-colonnes, .v6-g1 .v6-ligne, .v6-g1 .garantie-echec { grid-template-columns: minmax(0, 1fr) repeat(3, 90px); } }

/* G2 : un encadré par groupe, chaque état sur une ligne, la rangée choisie marquée d'une barre écartée du texte. */
.v6-g2 .v6-groupe { border: 1px solid var(--bordure); border-radius: var(--rayon); overflow: hidden; }
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
.v6-g2 .garantie-echec { padding: 0 var(--espace-bloc) var(--espace-controle) 18px; background: var(--fond-survol); }
.v6-g2 .garantie-echec > * { grid-column: 2 / -1; }
@media (max-width: 700px) {
  .v6-g2 .v6-colonnes, .v6-g2 .v6-ligne, .v6-g2 .garantie-echec { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 4px; }
  .v6-g2 .v6-colonnes > span:first-child { display: none; }
  .v6-g2 .garantie-qui, .v6-g2 .garantie-echec > * { grid-column: 1 / -1; }
  .v6-g2 .v6-colonnes > [data-rang='0'], .v6-g2 .v6-etat[data-rang='0'] { grid-column: 1; }
  .v6-g2 .v6-colonnes > [data-rang='1'], .v6-g2 .v6-etat[data-rang='1'] { grid-column: 2; }
  .v6-g2 .v6-colonnes > [data-rang='2'], .v6-g2 .v6-etat[data-rang='2'] { grid-column: 3; }
}
@media (min-width: 701px) {
  .v6-g2 .v6-colonnes > [data-rang='0'], .v6-g2 .v6-etat[data-rang='0'] { grid-column: 2; }
  .v6-g2 .v6-colonnes > [data-rang='1'], .v6-g2 .v6-etat[data-rang='1'] { grid-column: 3; }
  .v6-g2 .v6-colonnes > [data-rang='2'], .v6-g2 .v6-etat[data-rang='2'] { grid-column: 4; }
}
.v6-g1 .v6-colonnes > [data-rang='0'], .v6-g1 .v6-etat[data-rang='0'] { grid-column: 2; }
.v6-g1 .v6-colonnes > [data-rang='1'], .v6-g1 .v6-etat[data-rang='1'] { grid-column: 3; }
.v6-g1 .v6-colonnes > [data-rang='2'], .v6-g1 .v6-etat[data-rang='2'] { grid-column: 4; }
.v6-g1 .v6-ligne > .garantie-qui, .v6-g2 .v6-ligne > .garantie-qui { grid-row: 1; }
.v6-g1 .v6-etat, .v6-g2 .v6-etat { grid-row: 1; }
@media (max-width: 700px) { .v6-g2 .v6-etat { grid-row: 2; } }
`;

/* Les écrans */

const navigateur = await chromium.launch();
let CSS_DU_PLUGIN = '';
const ECRANS = [];

/**
 * Ouvre un état de la galerie, joue les gestes demandés, applique la
 * transformation, ne garde que `montrer`, puis range l'écran. Rend l'écran
 * et ce que la transformation a mesuré.
 */
async function ecran(id, { etat, largeur = 850, hauteur = 720, message = null, gestes = [], transformer = null, args = {}, montrer = ['#app'], enPlace = false }) {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur } });
  await page.goto(`file:///${path.join(GALERIE, `${etat}.html`).replace(/\\/g, '/')}`);
  await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  if (!CSS_DU_PLUGIN) CSS_DU_PLUGIN = await page.evaluate(() => [...document.head.querySelectorAll('style')].map((s) => s.textContent).join('\n'));
  if (message) {
    await page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), message);
    await page.waitForTimeout(150);
  }
  for (const geste of gestes) {
    if (geste === 'Escape') await page.keyboard.press('Escape');
    else await page.click(geste);
    await page.waitForTimeout(60);
  }
  await page.addScriptTag({ content: OUTILS });
  await page.addStyleTag({ content: CSS_V6 });
  // Une proposition montre déjà les onglets renommés de Z1.3 ; un écran en place, ceux d'aujourd'hui.
  if (!enPlace) await page.evaluate(() => M.renommerLesOnglets());
  const mesures = transformer ? (await page.evaluate(transformer, args)) ?? {} : {};
  await page.evaluate((s) => M.seul(s), montrer);
  const bas = (await page.evaluate((s) => M.bas(s), mesures.basDe ?? montrer)) + (mesures.basDe ? 24 : 16);
  const fige = await page.evaluate(() => M.figer());
  await page.close();
  ECRANS.push({ id, largeur, hauteur: bas, ...fige });
  return { html: `<iframe class="plugin" data-ecran="${id}" style="width:${largeur}px;height:${bas}px" scrolling="no" title="${esc(id)}"></iframe>`, mesures };
}

const CONFIGURATION = '[aria-label="Configuration de la palette"]';
const GARANTIES = '[aria-label="Garanties de contraste"]';
const DEPLIER_LES_GARANTIES = `${GARANTIES} .carte-bascule`;
const HAUT_DU_PANNEAU = ['.header', '.onglets', '.choix-de-palette', '.tete-de-la-palette', CONFIGURATION];

/* Z3.1 : ajuster la référence */

const tableauLarge = tableauAvantApres();
const tableauEtroit = tableauAvantApres({ etroit: true });
const apresEnMots = COMPAREES.every(({ apres }) => apres.verdict === 'tenue') ? `${nombreDe(COMPAREES.length, 'garantie')} tenue${COMPAREES.length > 1 ? 's' : ''}` : '';

const z31 = {
  lien: await ecran('z31-lien', { enPlace: true, etat: 'ajustement-ouvert', transformer: lienSousLeCode, args: LIENS.a, montrer: HAUT_DU_PANNEAU }),
  panneau: await ecran('z31-panneau', { enPlace: true, etat: 'ajustement-ouvert', gestes: ['[aria-label="Un pas plus clair"]'], montrer: [...HAUT_DU_PANNEAU, '.selecteur-de-couleur'] }),
  A: await ecran('z31-A', { etat: 'ajustement-ouvert', transformer: ajusterDansLeSelecteur, args: { pourquoi: EXPLICATION_RETENUE, nuances: NUANCES, tableau: tableauEtroit }, montrer: [...HAUT_DU_PANNEAU, '.selecteur-de-couleur'] }),
  B: await ecran('z31-B', { etat: 'ajustement-ouvert', transformer: ajusterSousLaReference, args: { pourquoi: EXPLICATION_RETENUE, nuances: NUANCES, tableau: tableauLarge, lien: LIEN_RETENU.manque }, montrer: HAUT_DU_PANNEAU }),
  C1: await ecran('z31-C1', { etat: 'ajustement-ouvert', transformer: lienVersLesGaranties, args: { manque: LIENS.b.manque }, montrer: [CONFIGURATION] }),
  C2: await ecran('z31-C2', { etat: 'ajustement-ouvert', gestes: ['Escape', DEPLIER_LES_GARANTIES], transformer: propositionDansLesGaranties, args: { originale: VERT.reference, proposition: PROPOSITION.hexa, sens: sens(PROPOSITION.pas), apres: apresEnMots }, montrer: [GARANTIES] }),
  apres: await ecran('z31-apres', { enPlace: true, etat: 'reference-ajustee', montrer: [CONFIGURATION] }),
  liens: await Promise.all(['a', 'b', 'c'].map(async (cle) => [cle, await ecran(`z31-lien-${cle}`, { enPlace: cle === 'a', etat: 'ajustement-ouvert', transformer: lienSousLeCode, args: LIENS[cle], montrer: [`${CONFIGURATION} .colonnes-de-base`] })])),
  explications: [],
};
for (const cle of ['a', 'b', 'c']) {
  z31.explications.push([cle, await ecran(`z31-explication-${cle}`, { etat: 'ajustement-ouvert', transformer: ajusterSousLaReference, args: { pourquoi: EXPLICATIONS[cle], nuances: NUANCES, tableau: tableauLarge, lien: '' }, montrer: ['.v6-ajuster'] })]);
}

/* Z3.2 : garanties de contraste */

const z32 = {
  A0: await ecran('z32-A0', { enPlace: true, etat: 'garantie-en-echec', gestes: [DEPLIER_LES_GARANTIES], transformer: mesurerLesGaranties, montrer: [GARANTIES] }),
  G1: await ecran('z32-G1', { etat: 'garantie-en-echec', gestes: [DEPLIER_LES_GARANTIES], transformer: refaireLesGaranties, args: { forme: 'g1' }, montrer: [GARANTIES] }),
  G2: await ecran('z32-G2', { etat: 'garantie-en-echec', gestes: [DEPLIER_LES_GARANTIES], transformer: refaireLesGaranties, args: { forme: 'g2' }, montrer: [GARANTIES] }),
  A0etroit: await ecran('z32-A0-500', { enPlace: true, etat: 'garantie-en-echec', largeur: 500, hauteur: 520, gestes: [DEPLIER_LES_GARANTIES], transformer: mesurerLesGaranties, montrer: [GARANTIES] }),
  G1etroit: await ecran('z32-G1-500', { etat: 'garantie-en-echec', largeur: 500, hauteur: 520, gestes: [DEPLIER_LES_GARANTIES], transformer: refaireLesGaranties, args: { forme: 'g1' }, montrer: [GARANTIES] }),
  G2etroit: await ecran('z32-G2-500', { etat: 'garantie-en-echec', largeur: 500, hauteur: 520, gestes: [DEPLIER_LES_GARANTIES], transformer: refaireLesGaranties, args: { forme: 'g2' }, montrer: [GARANTIES] }),
};
/** Hauteurs d'une palette sans échec, sans écran : le critère de Z6. */
const sansEchec = {
  A0: (await ecran('z32-sans-A0', { enPlace: true, etat: 'garanties-respectees', gestes: [DEPLIER_LES_GARANTIES], transformer: mesurerLesGaranties, montrer: [GARANTIES] })).mesures.carte,
  G1: (await ecran('z32-sans-G1', { etat: 'garanties-respectees', gestes: [DEPLIER_LES_GARANTIES], transformer: refaireLesGaranties, args: { forme: 'g1' }, montrer: [GARANTIES] })).mesures.carte,
  G2: (await ecran('z32-sans-G2', { etat: 'garanties-respectees', gestes: [DEPLIER_LES_GARANTIES], transformer: refaireLesGaranties, args: { forme: 'g2' }, montrer: [GARANTIES] })).mesures.carte,
};
for (const id of ['z32-sans-A0', 'z32-sans-G1', 'z32-sans-G2']) ECRANS.splice(ECRANS.findIndex((e) => e.id === id), 1);

/* Z3.3 : l'onglet Création sans palette choisie */

const raccourcis = RECETTE.palettes.map((palette) => `<button type="button" class="v6-raccourci"><span class="pastille" style="background:${palette.reference}"></span><span>${esc(palette.nom)}</span><span class="rampe">${RAMPES[palette.nom].map((hexa) => `<i style="background:${hexa}"></i>`).join('')}</span></button>`).join('');
const QUATRE = { etat: 'premier-lancement', message: ETAT_A_QUATRE_PALETTES };
const HAUT_DE_LA_CREATION = ['.header', '.onglets', '#panneau-palettes > :not([hidden])'];
const HAUT_SANS_PALETTE = ['.header', '.onglets', '.choix-de-palette', '.v6-invitation'];
const z33 = {
  avantAvec: await ecran('z33-avant-avec', { ...QUATRE, enPlace: true, montrer: HAUT_DU_PANNEAU }),
  avantSans: await ecran('z33-avant-sans', { enPlace: true, etat: 'premier-lancement', montrer: HAUT_DE_LA_CREATION }),
  D1: await ecran('z33-D1', { ...QUATRE, transformer: sansPaletteChoisie, args: { disposition: 'D1', ...INVITATIONS.a }, montrer: HAUT_SANS_PALETTE }),
  D2: await ecran('z33-D2', { ...QUATRE, transformer: sansPaletteChoisie, args: { disposition: 'D2', ...INVITATIONS.a }, montrer: HAUT_SANS_PALETTE }),
  D3: await ecran('z33-D3', { ...QUATRE, transformer: sansPaletteChoisie, args: { disposition: 'D3', ...INVITATIONS.a, raccourcis }, montrer: HAUT_SANS_PALETTE }),
  liste: await ecran('z33-liste', { ...QUATRE, transformer: sansPaletteChoisie, args: { disposition: 'D1', ...INVITATIONS.a, ouvrirLaListe: true }, montrer: [...HAUT_SANS_PALETTE, '.selecteur-liste'] }),
  textes: [],
  sans: [],
};
for (const cle of ['a', 'b', 'c']) z33.textes.push([cle, await ecran(`z33-texte-${cle}`, { ...QUATRE, transformer: sansPaletteChoisie, args: { disposition: 'D1', ...INVITATIONS[cle] }, montrer: HAUT_SANS_PALETTE })]);
for (const cle of ['a', 'b']) z33.sans.push([cle, await ecran(`z33-sans-${cle}`, { enPlace: cle === 'a', etat: 'premier-lancement', transformer: premierLancement, args: { texte: SANS_PALETTE[cle] }, montrer: HAUT_DE_LA_CREATION })]);

/* Questions du plan : Q6.2 et Q6.5 */

const q62 = {
  a: await ecran('q62-a', { etat: 'garanties-respectees', transformer: segmentsDesIntensites, args: { libelles: ['Une', 'Deux'] }, montrer: [CONFIGURATION] }),
  b: await ecran('q62-b', { etat: 'garanties-respectees', transformer: segmentsDesIntensites, args: { libelles: ['Une intensité', 'Deux intensités'] }, montrer: [CONFIGURATION] }),
  aEtroit: await ecran('q62-a-500', { etat: 'garanties-respectees', largeur: 500, hauteur: 520, transformer: segmentsDesIntensites, args: { libelles: ['Une', 'Deux'] }, montrer: [CONFIGURATION] }),
  avant: await ecran('q62-avant', { enPlace: true, etat: 'garanties-respectees', montrer: [CONFIGURATION] }),
};

await navigateur.close();

/* La page */

function blocDeQuestion(numero, titre, explication, ecrans, choix) {
  return `<div class="qbloc"><div class="qtete"><span class="qnum">${numero}</span><h3>${titre}</h3></div>${explication ? `<p>${explication}</p>` : ''}${ecrans ? `<div class="scene"><div class="scene-rangee">${ecrans}</div></div>` : ''}${choix ? `<div class="qchoix">${choix}</div>` : ''}</div>`;
}
const vue = (contenu, lettre, legende) => `<div class="qecran">${lettre ? `<span class="qlettre">${lettre}</span>` : ''}${contenu}<p class="legende">${legende}</p></div>`;
const reco = (texte = 'Recommandé.') => `<span class="reco">${texte}</span>`;
const ecart = (hauteur, reference) => `${milliers(hauteur)} px (${hauteur <= reference ? '−' : '+'}${milliers(Math.abs(reference - hauteur))})`;

const mesuresA0 = z32.A0.mesures;
const panneauB = z31.B.mesures.panneau;

const sectionConstats = `<section class="bloc" id="z0">
  <div class="tete"><span class="sur">Z0.1 · Constats</span><h2>Ce que la galerie montre à 850 px</h2></div>
  <ul>
    <li><b>Le trait de la rangée choisie</b> est une ombre intérieure de 2 px, à gauche, à ${mesuresA0.ecart} du texte (<code>${esc(mesuresA0.ombre)}</code>). Aucun bord droit dans la carte.</li>
    <li><b>Badges à la ligne</b> : ${mesuresA0.aLaLigne} ratios sur ${mesuresA0.resultats} à 850 px, ${z32.A0etroit.mesures.aLaLigne} à 500 px. La case d’état mesure 64 px.</li>
    <li><b>Hauteur de la carte</b> ouverte, Bleu avec un échec : ${milliers(mesuresA0.carte)} px. Sans échec : ${milliers(sansEchec.A0)} px.</li>
    <li><b>« Ajuster »</b> tient dans le sélecteur, 232 px de large, par-dessus l’aperçu.</li>
  </ul>
</section>`;

const sectionZ31 = `<section class="bloc" id="z3-1">
  <div class="tete"><span class="sur">Z3.1 · Ajuster la référence</span><h2>Dire pourquoi, puis proposer</h2></div>
  <p>Vert, ${VERT.reference}. Vivid porte la référence au ${DONNEES.cran}. En ${DONNEES.theme}, ${DONNEES.roles} sur cette nuance : ${DONNEES.ratio}, pour ${DONNEES.minimum}. Un pas plus sombre (${REPARATIONS.map((r) => r.hexa).join(', un pas plus clair ')}) les répare.</p>
  ${blocDeQuestion('Aujourd’hui', 'Le parcours en place',
    '',
    [vue(z31.lien.html, '1', 'Le lien, sous le code. Rien ne dit ce qui manque.'), vue(z31.panneau.html, '2', 'Le panneau, à l’ouverture : neuf blocs de texte dans 232 px.')].join(''),
    '')}
  ${blocDeQuestion('Question 1', 'Où ajuster',
    `Même rédaction dans les trois formes (b ci-dessous), après un pas ${sens(PROPOSITION.pas)}.`,
    [
      vue(z31.A.html, 'A', 'Dans le sélecteur : pourquoi en tête, tableau avant/après, luminosité retirée.'),
      vue(z31.B.html, 'B', `Sous la référence, pleine largeur. L’onglet « Ajuster » du sélecteur se retire.`),
      vue(z31.C1.html, 'C', 'Sous le code : le manque, et un lien vers les garanties.'),
      vue(z31.C2.html, 'C', 'Dans la ligne en échec : la proposition, appliquée d’un clic.'),
      vue(z31.apres.html, 'Après', 'Après « Appliquer », dans les trois formes : le lien disparaît, l’originale se garde.'),
    ].join(''),
    `<ol><li><b>A</b> garde le geste où il est ; à 232 px, chaque ligne du tableau passe sur deux.</li><li><b>B</b> ${reco()} La place de dire pourquoi et de comparer ; pendant l’ajustement, l’aperçu descend de ${panneauB} px.</li><li><b>C</b> est le plus court, un clic, mais la carte Garanties est repliée à l’ouverture, loin sous le code. « Ajuster à la main » y ouvrirait A.</li></ol>`)}
  ${blocDeQuestion('Question 2', 'Le texte sous le code',
    'Il ne paraît qu’avec une garantie manquée.',
    z31.liens.map(([cle, e]) => vue(e.html, cle, cle === 'a' ? 'Aujourd’hui.' : cle === 'b' ? 'Le manque en rouge, puis le lien.' : 'Le manque dans le lien.')).join(''),
    `<ol><li><b>a</b> ne dit pas pourquoi.</li><li><b>b</b> ${reco()} Le manque se lit sans cliquer.</li><li><b>c</b> tient sur une ligne, mais le lien s’allonge.</li></ol>`)}
  ${blocDeQuestion('Question 3', 'La phrase qui explique',
    'En tête du panneau, dans la forme B. Elle vient de [MOT-17] : la référence garde ses octets.',
    z31.explications.map(([cle, e]) => vue(e.html, cle, cle === 'a' ? 'Le principe.' : cle === 'b' ? 'Le cas : quelle nuance, quels rôles, quel ratio.' : 'Le geste.')).join(''),
    `<ol><li><b>a</b> dit la règle, pas ce qui échoue.</li><li><b>b</b> ${reco()} Le tableau dessous donne le reste.</li><li><b>c</b> décrit l’écran plutôt que la cause.</li></ol>`)}
</section>`;

const sectionZ32 = `<section class="bloc" id="z3-2">
  <div class="tete"><span class="sur">Z3.2 · Garanties de contraste</span><h2>Un tableau par groupe</h2></div>
  <p>Bleu, deux intensités, la courbe claire au cran 700 à 0,55 : text sur surface manque en Light, et la ligne est choisie. Le contenu ne change pas ; la mise en page, si.</p>
  ${blocDeQuestion('Question 1', 'La disposition',
    'À 850 px. Les hauteurs sont celles de la carte ouverte.',
    [
      vue(z32.A0.html, 'A0', `Aujourd’hui : ${milliers(mesuresA0.carte)} px, ${mesuresA0.aLaLigne} badges à la ligne.`),
      vue(z32.G1.html, 'G1', `Tableau : ${ecart(z32.G1.mesures.carte, mesuresA0.carte)}, ${z32.G1.mesures.aLaLigne} badge à la ligne.`),
      vue(z32.G2.html, 'G2', `Tableau compact : ${ecart(z32.G2.mesures.carte, mesuresA0.carte)}, ${z32.G2.mesures.aLaLigne} badge à la ligne.`),
    ].join(''),
    `<p>Communs à G1 et G2 : codes des rôles en 11 px sur fond ; états nommés une fois en tête de colonne ; ratio et badge sans retour à la ligne ; groupes séparés.</p>
    <ol><li><b>G1</b> garde les spécimens au-dessus des chiffres. Groupes en bandeaux ; rangée choisie sur fond, cerclée.</li><li><b>G2</b> ${reco()} Spécimen à gauche des chiffres : une rangée tient sur une ligne. Groupes en encadrés ; rangée choisie sur fond, barre bleue écartée du texte.</li></ol>
    <p>Sans échec : A0 ${milliers(sansEchec.A0)} px, G1 ${ecart(sansEchec.G1, sansEchec.A0)}, G2 ${ecart(sansEchec.G2, sansEchec.A0)}.</p>`)}
  ${blocDeQuestion('Question 1 bis', 'Les mêmes à 500 px',
    'La largeur minimale de la fenêtre.',
    [
      vue(z32.A0etroit.html, 'A0', `${z32.A0etroit.mesures.aLaLigne} badges à la ligne.`),
      vue(z32.G1etroit.html, 'G1', `${z32.G1etroit.mesures.aLaLigne} badge à la ligne.`),
      vue(z32.G2etroit.html, 'G2', `${z32.G2etroit.mesures.aLaLigne} badge à la ligne. Les états passent sous le nom.`),
    ].join(''),
    '')}
</section>`;

const sectionZ33 = `<section class="bloc" id="z3-3">
  <div class="tete"><span class="sur">Z3.3 · Onglet Création sans palette choisie</span><h2>Une invitation, et le choix au designer</h2></div>
  <p>Le fichier contient ${NOMBRE_DE_PALETTES} palettes : ${REFERENCES.map(([nom]) => nom).join(', ')}.</p>
  ${blocDeQuestion('Aujourd’hui', 'À l’ouverture',
    '',
    [vue(z33.avantAvec.html, '1', 'Avec des palettes : la première s’ouvre.'), vue(z33.avantSans.html, '2', 'Sans palette : la création.')].join(''),
    '')}
  ${blocDeQuestion('Question 1', 'La disposition',
    'Le sélecteur dit « Sélectionner une palette » ; « … » se cache. Même texte partout (a).',
    [
      vue(z33.D1.html, 'D1', 'Le texte seul : les gestes sont dans la barre.'),
      vue(z33.D2.html, 'D2', 'Un encart et « Choisir une palette », qui ouvre la liste.'),
      vue(z33.D3.html, 'D3', 'Les palettes en raccourcis : un clic ouvre la palette.'),
      vue(z33.liste.html, 'D1', 'La liste ouverte, aucune palette cochée.'),
    ].join(''),
    `<ol><li><b>D1</b> ${reco()} Le plus simple ; deux gestes mènent à une palette.</li><li><b>D2</b> double le sélecteur par un bouton.</li><li><b>D3</b> ouvre en un geste, mais refait la liste de l’onglet Palettes.</li></ol>`)}
  ${blocDeQuestion('Question 2', 'Le texte de l’invitation',
    'Dans D1.',
    z33.textes.map(([cle, e]) => vue(e.html, cle, `« ${INVITATIONS[cle].titre ? `${INVITATIONS[cle].titre} » · « ` : ''}${INVITATIONS[cle].texte} »`)).join(''),
    `<ol><li><b>a</b> ${reco()} Un titre qui dit quoi faire, une phrase qui dit comment.</li><li><b>b</b> compte les palettes, mais son titre constate au lieu d’inviter.</li><li><b>c</b> sans titre : la zone paraît vide.</li></ol>`)}
  ${blocDeQuestion('Question 3', 'Sans aucune palette',
    'La création reste. Faut-il accorder sa phrase à l’invitation ?',
    z33.sans.map(([cle, e]) => vue(e.html, cle, cle === 'a' ? 'Aujourd’hui.' : `« ${SANS_PALETTE.b} »`)).join(''),
    `<ol><li><b>a</b> ${reco()} Déjà claire ; elle ne change pas.</li><li><b>b</b> reprend le ton de l’invitation.</li></ol>`)}
</section>`;

const sectionQuestions = `<section class="bloc" id="questions">
  <div class="tete"><span class="sur">Questions du plan</span><h2>Q6.1 à Q6.5</h2></div>
  ${blocDeQuestion('Q6.2 et Q6.5', 'Intensités en segments, code hexa sur toute sa colonne',
    'La configuration de Bleu, deux intensités.',
    [
      vue(q62.avant.html, 'Avant', 'Aujourd’hui : interrupteur, code à 88 px.'),
      vue(q62.a.html, 'a', '« Une · Deux », comme « Standard · Libre ».'),
      vue(q62.b.html, 'b', '« Une intensité · Deux intensités ».'),
      vue(q62.aEtroit.html, 'a', 'À 500 px.'),
    ].join(''),
    `<ol><li><b>Q6.2</b> a ${reco()} Le libellé « Intensités » est au-dessus.</li><li><b>Q6.5</b> Le code prend aussi toute sa colonne dans la création. ${reco()}</li></ol>`)}
  ${blocDeQuestion('Q6.1, Q6.3, Q6.4', 'Sans maquette',
    '',
    '',
    `<ol><li><b>Q6.1</b> Les fichiers gardent leurs noms (<code>ongletPalettes.ts</code> pour Création, <code>ongletPlanche.ts</code> pour Palettes), avec la correspondance dans AGENTS.md et CONTRIBUTING.md. ${reco()}</li><li><b>Q6.3</b> Après suppression de la palette ouverte, la suivante s’ouvre. ${reco()}</li><li><b>Q6.4</b> « Actualiser tout » génère aussi les palettes « Pas encore sur Figma ». ${reco()}</li></ol>`)}
</section>`;

const lireStyle = (fichier) => /<style>([\s\S]*?)<\/style>/.exec(fs.readFileSync(path.join(ICI, fichier), 'utf8'))[1];
const STYLE = `${lireStyle('MAQUETTES-RECETTE-V5.html')}
main { max-width: 1840px; }
iframe.plugin { display: block; border: 1px solid var(--filet); border-radius: 8px; background: #2c2c2c; }
.qbloc .scene-rangee { align-items: flex-start; }
.qecran { max-width: 100%; }
.qecran .legende { max-width: 850px; }
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
  <span class="sur">UCM Palettes · plan d’ergonomie, sixième tour · lot Z3</span>
  <h1>Maquettes à valider</h1>
  <p>Premier passage. Chaque écran est l’interface réelle, tirée de la galerie au thème sombre de Figma, à 850 px, puis réorganisée. Couleurs et ratios : le moteur, pour Bleu #1E6FD9, Vert #16A34A, Rouge #DC2626 et Sauge #A0B599.</p>
  <p>Une question par bloc, ses écrans au-dessus de ses choix. « Recommandé » vaut accord si la question reste sans réponse. Les textes entreront dans l’inventaire « À valider ».</p>
  <p class="note">Page écrite par <code>generer-maquettes-v6.mjs</code>, après <code>npm run galerie --workspace ucm-palettes-plugin</code> : <code>node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-v6.mjs"</code>.</p>
  <nav class="sommaire"><a href="#z0">Z0.1 Constats</a><a href="#z3-1">Z3.1 Ajuster la référence</a><a href="#z3-2">Z3.2 Garanties de contraste</a><a href="#z3-3">Z3.3 Sans palette choisie</a><a href="#questions">Q6.1 à Q6.5</a></nav>
</section>
${sectionConstats}
${sectionZ31}
${sectionZ32}
${sectionZ33}
${sectionQuestions}
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
process.stdout.write(`Garanties, hauteurs : A0 ${mesuresA0.carte}, G1 ${z32.G1.mesures.carte}, G2 ${z32.G2.mesures.carte} ; sans échec A0 ${sansEchec.A0}, G1 ${sansEchec.G1}, G2 ${sansEchec.G2}\n`);
