#!/usr/bin/env node
/**
 * Écrit MAQUETTES-DIRECTION-SIMPLE.html à côté de ce script, depuis la racine
 * du dépôt, après la galerie d'UCM Palettes :
 *
 *   npm run galerie --workspace ucm-palettes-plugin
 *   node "docs/notes/Recherches/Plugin Palettes/Intégration du marché/07 Direction simple/generer-maquettes-direction-simple.mjs"
 *
 * Chaque maquette part d'un état de la galerie, donc du plugin construit : le
 * script l'ouvre dans Chromium, le transforme dans la page, puis recopie son
 * balisage et sa feuille, thème sombre de Figma compris, dans un cadre de 560 px. Les couleurs des
 * palettes du plugin sortent ainsi du moteur. Ce que la direction ajoute porte
 * une classe `m-`, stylée par `STYLES_DES_MAQUETTES` : ces règles n'existent
 * pas dans le plugin. Les palettes « du fichier » sont deux rampes de
 * Tailwind, écrites en dur.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '../../../../../../');
const DIST = path.join(RACINE, 'packages/plugin-palettes/dist');
const LARGEUR = 560;

/** Le mainteneur travaille en thème sombre : la galerie sombre, et la classe que Figma pose sur la racine. */
const THEME = 'sombre';
const CLASSE_DU_THEME = 'figma-dark';

/** Les règles que la direction ajoute. Leur préfixe `m-` les sépare de celles du plugin. */
const STYLES_DES_MAQUETTES = `
.m-appel { display: grid; justify-items: center; gap: var(--espace-bloc); padding: 32px var(--espace-page); border: 1px solid color-mix(in srgb, var(--fond-marque) 35%, var(--bordure)); border-radius: 12px; background: color-mix(in srgb, var(--fond-marque) 9%, var(--fond)); text-align: center; }
.m-appel h2 { margin: 0; font-size: 18px; line-height: 24px; }
.m-appel p { max-width: 380px; margin: 0; color: var(--texte-second); }
.m-appel .btn { min-height: 40px; padding: 0 24px; font-size: 13px; }
.m-appel-rampe { display: flex; gap: 3px; }
.m-appel-rampe span { width: 22px; height: 30px; border-radius: 4px; }
.m-lien-de-fichier { margin: 0; color: var(--texte-second); text-align: center; }
.m-lien-de-fichier a { color: var(--texte-marque); font-weight: 600; }
.m-marque { margin-left: auto; padding-left: var(--espace-controle); font-weight: 700; }
.selecteur-nom + .m-marque { margin-left: 0; }
.m-marque[data-ton='succes'] { color: var(--texte-succes); }
.m-marque[data-ton='avertissement'] { color: var(--texte-avertissement); }
.m-marque[data-ton='danger'] { color: var(--texte-danger); }
.m-connexion { background: none; }
.m-connexion, .m-carte-ouverte { margin-bottom: 20px; }
.m-carte-ouverte { background: none; }
.m-carte-ouverte .m-collections, .m-carte-ouverte .m-panneau { background: color-mix(in srgb, var(--fond) 84%, black); }
.m-carte-ouverte .confirmation-gestes { justify-content: flex-end; }
.m-panneau { overflow: hidden; border: 1px solid var(--bordure); border-radius: 8px; }
.m-panneau-tete, .m-panneau-ligne { display: grid; align-items: center; grid-template-columns: minmax(0, 1fr) 132px; }
.m-panneau-tete { padding: var(--espace-controle) var(--espace-bloc); border-bottom: 1px solid var(--bordure); font-weight: 600; }
.m-panneau-tete span:last-child { color: var(--texte-second); font-weight: 400; }
.m-panneau-groupe { display: flex; justify-content: space-between; gap: var(--espace-controle); padding: var(--espace-controle) var(--espace-bloc) var(--espace-serre); color: var(--texte-second); }
.m-panneau-groupe code { font-size: 11px; }
.m-panneau-groupe + .m-panneau-groupe { padding-top: var(--espace-serre); }
.m-panneau-groupe:last-child { padding-bottom: var(--espace-controle); }
.m-panneau-ligne { height: 28px; padding: 0 var(--espace-bloc) 0 28px; }
.m-panneau-ligne .m-valeur i { width: 16px; height: 16px; border-radius: 4px; }
.m-panneau-suite { padding: 2px var(--espace-bloc) var(--espace-serre) 28px; color: var(--texte-second); }
.m-collection .ligne-secondaire { white-space: nowrap; }
.m-synchroniser { display: inline-flex; height: var(--hauteur-secondaire); flex: none; align-items: center; gap: 6px; padding: 0 var(--espace-serre); border: 0; border-radius: var(--rayon); background: none; color: var(--texte-second); cursor: pointer; font-weight: 600; }
.m-synchroniser:hover { background: var(--fond-survol); color: var(--texte); }
.m-comparaison { display: grid; align-items: center; gap: var(--espace-serre) var(--espace-controle); grid-template-columns: auto minmax(0, 1fr); }
.m-comparaison .m-mini-rampe span { height: 18px; flex: 1 1 0; }
.m-page-choisie { font-weight: 600; }
.m-collections { overflow: hidden; border: 1px solid var(--bordure); border-radius: 8px; background: var(--fond); }
.m-collection { display: grid; min-height: 36px; align-items: center; gap: var(--espace-controle); padding: 0 var(--espace-bloc); border-bottom: 1px solid var(--bordure); grid-template-columns: 16px minmax(0, 1fr) auto; }
.m-collection:last-child { border-bottom: 0; }
.m-collection input[type='radio'] { margin: 0; accent-color: var(--fond-marque); }
.m-collection .input { height: var(--hauteur-secondaire); max-width: 180px; }
.m-collection-nom { display: flex; align-items: center; gap: var(--espace-controle); font-weight: 600; }
.m-collection[data-distante] { color: var(--texte-second); }
.m-collection[data-distante] .m-collection-nom { font-weight: 400; }
.m-connexion .carte-tete { flex-wrap: nowrap; }
.m-connexion .carte-titre { margin-right: auto; }
.m-connexion-ligne { display: grid; min-height: 28px; align-items: center; gap: var(--espace-controle); grid-template-columns: 92px minmax(0, 1fr) auto; }
.m-connexion-bilan { display: flex; flex-wrap: wrap; align-items: center; gap: var(--espace-serre); padding-top: var(--espace-controle); border-top: 1px solid var(--bordure); }
.m-connexion-bilan .btn { margin-left: auto; }
.m-aere { gap: var(--espace-page); }
.m-aere .colonnes-de-base { gap: var(--espace-bloc); }
.m-aere .bascule-de-base { width: 100%; justify-self: stretch; }
.m-aere .bascule-option { white-space: nowrap; }
.m-aere select.input { width: 100%; height: var(--hauteur-action); }
.m-simulation { display: grid; gap: var(--espace-controle); }
.m-simulation-tete { display: flex; align-items: baseline; justify-content: space-between; }
.m-variables { overflow: hidden; border: 1px solid var(--bordure); border-radius: 8px; background: var(--fond); }
.m-variables-collection { padding: var(--espace-controle) var(--espace-bloc); border-bottom: 1px solid var(--bordure); font-weight: 600; }
.m-variable { display: grid; height: 32px; align-items: center; gap: var(--espace-controle); padding: 0 var(--espace-bloc); border-bottom: 1px solid var(--bordure); grid-template-columns: 16px minmax(0, 1fr) auto; }
.m-variable:last-child { border-bottom: 0; }
.m-variable i { width: 16px; height: 16px; border: 1px solid var(--bordure); border-radius: 4px; }
.m-variable code { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.m-variable span { color: var(--texte-second); font-variant-numeric: tabular-nums; }
.m-variable-suite { color: var(--texte-second); text-align: center; }
.m-chemin { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; }
.m-chemin code { padding: 1px 6px; border-radius: 4px; background: var(--fond-note); font-size: 11px; }
.m-chemin .bouton-discret { margin-left: auto; }
.m-verdict { display: flex; align-items: center; gap: var(--espace-controle); padding: var(--espace-bloc); border-radius: 8px; }
.m-verdict[data-ton='succes'] { background: var(--fond-succes); }
.m-verdict[data-ton='avertissement'] { background: var(--fond-avertissement); }
.m-verdict[data-ton='danger'] { background: var(--fond-danger); }
.m-verdict strong { font-size: 13px; }
.m-verdict span { color: var(--texte-second); }
.m-verdict-icone { display: grid; width: 24px; height: 24px; flex: none; place-items: center; border-radius: 50%; background: var(--fond); font-weight: 700; }
.m-titre-de-section { margin: 0; font-size: var(--libelle); font-weight: 600; }
.m-sorties { display: grid; border-top: 1px solid var(--bordure); }
.m-sortie { display: grid; min-height: 36px; align-items: center; gap: var(--espace-controle); padding: var(--espace-serre) 0; border-bottom: 1px solid var(--bordure); grid-template-columns: 92px auto minmax(0, 1fr) auto; }
.m-sortie:last-child { border-bottom: 0; padding-bottom: 0; }
.m-sortie-nom { font-weight: 600; }
.m-sortie-detail { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m-sortie-gestes { display: flex; gap: var(--espace-serre); }
.m-tete-gestes { display: flex; align-items: center; gap: var(--espace-controle); }
.m-encart { display: grid; gap: var(--espace-controle); padding: var(--espace-controle); border-radius: var(--rayon); background: var(--fond); border: 1px solid var(--bordure); }
.m-encart[data-ton='avertissement'] { border-color: color-mix(in srgb, var(--texte-avertissement) 35%, var(--bordure)); background: color-mix(in srgb, var(--fond-avertissement) 45%, var(--fond)); }
.m-encart p { margin: 0; }
.m-encart code { font-size: 11px; }
.m-ecart { display: grid; align-items: center; gap: var(--espace-controle); grid-template-columns: minmax(0, 1fr) auto auto; }
.m-valeur { display: inline-flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; }
.m-valeur i { width: 14px; height: 14px; border: 1px solid var(--bordure); border-radius: 3px; }
.m-du-fichier { border-style: dashed; background: none; }
.m-du-fichier .fiche-apercu { background: none; border-style: dashed; }
.m-etiquette { padding: 0 var(--espace-controle); border: 1px dashed var(--bordure); border-radius: 10px; color: var(--texte-second); line-height: 20px; white-space: nowrap; }
.m-separation { display: grid; gap: 2px; margin-top: var(--espace-bloc); padding-top: var(--espace-bloc); border-top: 1px solid var(--bordure); }
.m-separation p { margin: 0; color: var(--texte-second); }
.m-table { width: 100%; border: 1px solid var(--bordure); border-radius: 8px; border-collapse: separate; border-spacing: 0; background: var(--fond-bloc); }
.m-table th { padding: var(--espace-controle); border-bottom: 1px solid var(--bordure); color: var(--texte-second); font-weight: 500; text-align: left; }
.m-table td { padding: var(--espace-controle); border-bottom: 1px solid var(--bordure); vertical-align: middle; }
.m-table tr:last-child td { border-bottom: 0; }
.m-table .m-nom { display: flex; align-items: center; gap: 6px; font-weight: 600; }
.m-table .m-nom i { width: 12px; height: 12px; border-radius: 3px; }
.m-mini-rampe { display: flex; }
.m-mini-rampe span { width: 12px; height: 12px; }
.m-pied { justify-content: space-between; }
`;

// ------------------------------------------------------------ outils posés dans la page

/** Ce que chaque transformation emploie dans la page de la galerie. */
function poserLesOutils() {
  const el = (html) => {
    const gabarit = document.createElement('template');
    gabarit.innerHTML = html.trim();
    return gabarit.content.firstElementChild;
  };
  window.M = {
    el,
    /** Les trois onglets de la direction, à la place des deux du plugin. */
    onglets(actif) {
      document.querySelector('.onglets').innerHTML = ['Création', 'Vérification', 'Gestion']
        .map((nom) => `<button type="button" class="onglet" role="tab" aria-selected="${nom === actif}">${nom}</button>`).join('');
    },
    carte: (titre) => document.querySelector(`#panneau-palettes .carte[aria-label="${titre}"]`),
    /** Une ligne de sortie d'une fiche : son nom, son état, son détail, ses gestes. */
    sortie(nom, etat, libelle, detail, gestes) {
      const boutons = gestes.map(([texte, classe]) => `<button type="button" class="btn ${classe} btn-compact"><span>${texte}</span></button>`).join('');
      return `<div class="m-sortie"><span class="m-sortie-nom">${nom}</span><span class="pastille-d-etat" data-etat="${etat}">${libelle}</span><span class="ligne-secondaire m-sortie-detail">${detail}</span><span class="m-sortie-gestes">${boutons}</span></div>`;
    },
    /**
     * Le bloc « Connexion à Figma » : la synchronisation, la destination des
     * tokens, la page des planches, puis le bilan des palettes. `miseAJour`
     * pose « Tout mettre à jour » dans le bilan. « Synchroniser » est un
     * texte gris à icône, sans contour : il ne se confond pas avec « Changer ».
     */
    connexion(miseAJour) {
      const etat = (code, libelle) => `<span class="pastille-d-etat" data-etat="${code}">${libelle}</span>`;
      const geste = miseAJour ? '<button type="button" class="btn btn-primary btn-compact"><span>Tout mettre à jour (2)</span></button>' : '';
      return el(`<section class="carte m-connexion" aria-label="Connexion à Figma"><div class="carte-tete"><h3 class="carte-titre">Connexion à Figma</h3><span class="ligne-secondaire">Synchronisé il y a 2 min</span><button type="button" class="m-synchroniser"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 0 1-9.6 3.7M2.5 8a5.5 5.5 0 0 1 9.6-3.7"/><path d="M12.4 1.8v2.7H9.7M3.6 14.2v-2.7h2.7"/></svg><span>Synchroniser</span></button></div><div class="carte-corps"><div class="m-connexion-ligne"><span class="m-sortie-nom">Tokens</span><span class="m-chemin"><code>primitives</code><span>›</span><code>colors/…</code></span><button type="button" class="bouton-discret">Changer</button></div><div class="m-connexion-ligne"><span class="m-sortie-nom">Planches</span><span class="m-chemin"><span class="ligne-secondaire">page</span><code>Palettes</code></span><button type="button" class="bouton-discret">Changer</button></div><div class="m-connexion-bilan">${etat('a-jour', '1 synchronisée')}${etat('perimee', '1 à mettre à jour')}${etat('jamais-dessinee', '1 pas encore sur Figma')}${geste}</div></div></section>`);
    },
    /** La tête des listes de Gestion : le compte, puis la bascule des deux vues. */
    teteDeGestion(panneau, condensee) {
      const tete = panneau.querySelector('.planche-tete');
      panneau.querySelector('.planche-compte').textContent = 'Palettes du plugin · 3';
      tete.querySelector('.bouton-discret').remove();
      const vues = el(`<div class="bascule" role="group" aria-label="Vue"><button type="button" class="bascule-option" aria-pressed="${!condensee}">Vue complète</button><button type="button" class="bascule-option" aria-pressed="${condensee}">Vue condensée</button></div>`);
      if (condensee) tete.querySelector('.bascule').replaceWith(vues);
      else tete.querySelector('.bascule').before(vues);
      tete.before(M.connexion(!condensee));
    },
    /** La fiche d'une palette lue dans les variables du fichier : en tirets, sans geste d'écriture. */
    ficheDuFichier(nom, chemin, detail, rampe, geste, etiquette = 'Variables du fichier') {
      const pastilles = rampe.map((hexa) => `<span class="fiche-pastille" style="background:${hexa}"></span>`).join('');
      return el(`<section class="carte fiche-planche m-du-fichier" aria-label="${nom}"><div class="carte-tete"><h3 class="carte-titre">${nom}</h3><span class="m-tete-gestes"><span class="m-etiquette">${etiquette}</span>${geste ? `<button type="button" class="bouton-discret">${geste}</button>` : ''}</span></div><div class="carte-corps"><div class="fiche-apercu" style="--colonnes:${rampe.length}"><div class="fiche-rangee"><span class="fiche-profil"></span>${pastilles}</div></div><div class="fiche-information"><span class="ligne-secondaire"><code>${chemin}</code> · ${detail}</span></div></div></section>`);
    },
  };
}

// ------------------------------------------------------------ transformations

/** M1 : le fichier sans palette. */
function fichierVide() {
  M.onglets('Création');
  const rampe = ['#F1F8FE', '#E4F0FD', '#CCE2FC', '#ABD0FA', '#7EB5F7', '#4B96F4', '#1E6FD9', '#185EC1', '#10479E', '#08317B', '#041F5E'];
  const panneau = document.querySelector('#panneau-palettes');
  panneau.innerHTML = `<section class="m-appel"><div class="m-appel-rampe">${rampe.map((hexa) => `<span style="background:${hexa}"></span>`).join('')}</div><h2>Créez votre première palette</h2><p>Partez d’une couleur de référence. Le plugin calcule ses nuances et vérifie leurs contrastes.</p><button type="button" class="btn btn-primary"><span>Nouvelle palette</span></button></section><p class="m-lien-de-fichier">Ce fichier porte déjà 2 palettes dans ses variables. <a>Les voir dans Gestion</a></p>`;
}

/** M2 : l'onglet Création, sans la carte des garanties. */
function creation() {
  M.onglets('Création');
  M.carte('Garanties de contraste').remove();
  document.querySelector('.pied-de-la-palette .bouton-discret').textContent = 'Vérifier';
}

/** Création, ouverte par « Modifier dans le plugin » sur la palette « slate » du fichier. */
function reprise({ slate }) {
  M.onglets('Création');
  M.carte('Garanties de contraste').remove();
  document.querySelector('.pied-de-la-palette .bouton-discret').textContent = 'Vérifier';
  // La palette grise de la galerie tient lieu de slate recalculée.
  document.querySelector('.selecteur-nom').textContent = 'slate';
  document.querySelector('.tete-de-la-palette .titre-de-premier-rang').textContent = 'Palette slate';
  const [nom, hexa] = M.carte('Configuration de la palette').querySelectorAll('input[type="text"]');
  nom.value = 'slate';
  hexa.value = '#475569';
  const mini = (couleurs) => `<div class="m-mini-rampe">${couleurs.map((couleur) => `<span style="background:${couleur}"></span>`).join('')}</div>`;
  const calculee = [...document.querySelectorAll('#panneau-planche .fiche-planche[aria-label="Ardoise"] .fiche-rangee')].at(0);
  const duPlugin = [...calculee.querySelectorAll('.fiche-pastille')].map((pastille) => pastille.style.background);
  document.querySelector('.tete-de-la-palette').after(M.el(`<div class="m-encart"><p><strong>Reprise de « slate », lue dans les variables du fichier</strong></p><div class="m-comparaison"><span class="ligne-secondaire">Fichier</span>${mini(slate)}<span class="ligne-secondaire">Plugin</span>${mini(duPlugin)}</div><div class="champ-colonne"><span class="libelle-de-champ">Nuances</span><div class="bascule bascule-de-base" role="group"><button type="button" class="bascule-option" aria-pressed="true">Recalculées</button><button type="button" class="bascule-option" aria-pressed="false">Telles quelles</button></div></div><p class="ligne-secondaire">9 couleurs sur 11 changeront dans Figma. Rien ne s’écrit avant « Mettre à jour », dans Gestion.</p><div class="confirmation-gestes"><button type="button" class="btn btn-secondary btn-compact"><span>Annuler la reprise</span></button></div></div>`));
}

/** Vérification : la carte des garanties dépliée, les messages du volet, et la liste déroulante avec ses verdicts. */
function verification(verdicts) {
  const signes = { succes: '✓', avertissement: '!', danger: '✗' };
  M.onglets('Vérification');
  const configuration = document.querySelector('.configuration-de-la-palette');
  const pied = configuration.querySelector('.pied-de-la-palette');
  const [bilan, alertes] = pied.querySelector('.pied-texte').textContent.split(' · ');
  const ton = pied.dataset.ton;
  const messages = pied.querySelector('.volet-corps').firstElementChild;
  const garanties = M.carte('Garanties de contraste');
  const tete = configuration.querySelector('.tete-de-la-palette');

  // La barre de Création reste : chaque option de la liste porte le verdict de sa palette, et le bouton celui de la palette ouverte.
  const marque = (verdict) => M.el(`<b class="m-marque" data-ton="${verdict}">${signes[verdict]}</b>`);
  document.querySelectorAll('.selecteur-option').forEach((option, rang) => option.append(marque(rang === 0 ? ton : (verdicts[rang] ?? 'succes'))));
  document.querySelector('.selecteur-nom').after(marque(ton));

  // Un point à vérifier ne donne plus ses mesures : où, quoi, le geste, le lien.
  for (const mesures of messages?.querySelectorAll('.constat-alerte .constat-mesures') ?? []) mesures.remove();

  // Un lien nomme le geste et ouvre la carte où il se fait. Des profils presque identiques se règlent par la saturation, dans « Réglage global ».
  const gestes = { 'Réglage global': 'Ajuster le réglage global', 'Color shift': 'Ajuster le Color shift', 'Luminosité des nuances': 'Ajuster la luminosité des nuances', 'Intensités communes': 'Ajuster la saturation', 'Couleur de référence': 'Changer la couleur de référence', 'Couleurs de fond': 'Changer les couleurs de fond' };
  for (const lien of document.querySelectorAll('.lien-de-constat')) lien.textContent = gestes[lien.textContent] ?? lien.textContent;

  // La carte des garanties reste ouverte : son en-tête n'est plus un bouton.
  const bascule = garanties.querySelector('.carte-bascule');
  bascule.querySelector('.carte-chevron').remove();
  bascule.querySelector('.carte-resume').remove();
  bascule.style.cursor = 'default';

  const points = alertes === 'aucune alerte' ? 'Aucun point à vérifier' : alertes.replace('alertes', 'points à vérifier').replace('alerte', 'point à vérifier');
  const verdict = M.el(`<div class="m-verdict" data-ton="${ton}"><span class="m-verdict-icone">${signes[ton]}</span><div><strong>${bilan}</strong><br><span>${points}</span></div></div>`);
  const suite = ton === 'danger'
    ? '<span class="pied-texte">Corrigez la palette dans Création, ou écrivez-la telle quelle dans Gestion.</span><button type="button" class="btn btn-secondary btn-compact"><span>Retour à Création</span></button>'
    : '<span class="pied-texte">La palette tient ses garanties.</span><button type="button" class="btn btn-primary btn-compact"><span>Passer à Gestion</span></button>';
  configuration.replaceChildren(tete, verdict, ...(messages ? [messages] : []), garanties, M.el(`<div class="pied-de-la-palette m-pied">${suite}</div>`));
}

/**
 * Gestion, vue complète : les fiches de l'onglet Palettes, deux lignes de
 * sortie par fiche. `destination` et `planches` ouvrent leur carte à la place
 * du bloc de la connexion ; `modifiee` ne garde que la fiche dont Figma a
 * changé des couleurs ; `reprise` montre « slate » après « Modifier dans le
 * plugin ».
 */
function gestion({ slate, emeraude, destination = false, modifiee = false, planches = false, reprise = false }) {
  M.onglets('Gestion');
  const panneau = document.querySelector('#panneau-planche');
  M.teteDeGestion(panneau, false);
  const fiche = (nom) => panneau.querySelector(`.fiche-planche[aria-label="${nom}"]`);
  const poser = (nom, pastille, tokens, planche, encart) => {
    const cible = fiche(nom);
    const etat = cible.querySelector('.etat-du-cadre');
    etat.dataset.etat = pastille[0];
    etat.textContent = pastille[1];
    // « Modifier » rejoint l'état dans l'en-tête : il ramène à Création.
    const gestes = M.el('<span class="m-tete-gestes"></span>');
    etat.replaceWith(gestes);
    gestes.append(etat, M.el('<button type="button" class="bouton-discret">Modifier</button>'));
    cible.querySelector('.fiche-gestes').replaceWith(M.el(`<div class="m-sorties">${M.sortie('Tokens Figma', ...tokens)}${M.sortie('Planche', ...planche)}</div>`), ...(encart ? [M.el(encart)] : []));
  };
  const premiereEcriture = '<div class="m-encart"><p><strong>Écrire Ardoise dans les tokens Figma ?</strong></p><p class="ligne-secondaire">44 variables de couleur seront créées dans la collection <code>primitives</code>, de <code>colors/ardoise/soft/light/50</code> à <code>colors/ardoise/vivid/dark/950</code>. Aucune variable existante n’est modifiée.</p><div class="confirmation-gestes"><button type="button" class="btn btn-secondary btn-compact"><span>Annuler</span></button><button type="button" class="btn btn-primary btn-compact"><span>Écrire 44 variables</span></button></div></div>';
  const ecart = (chemin, figma, plugin) => `<div class="m-ecart"><code>${chemin}</code><span class="m-valeur"><i style="background:${figma}"></i>${figma} dans Figma</span><span class="m-valeur"><i style="background:${plugin}"></i>${plugin} dans le plugin</span></div>`;
  const changees = `<div class="m-encart" data-ton="avertissement"><p><strong>2 couleurs de Jaune ne sont plus celles du plugin.</strong></p>${ecart('colors/jaune/vivid/light/700', '#8A5A00', '#845925')}${ecart('colors/jaune/vivid/light/800', '#6E4500', '#6B431B')}<div class="confirmation-gestes"><button type="button" class="btn btn-secondary btn-compact"><span>Laisser les couleurs de Figma</span></button><button type="button" class="btn btn-primary btn-compact"><span>Remettre les couleurs du plugin</span></button></div></div>`;

  poser('Bleu', ['a-jour', 'Synchronisée'], ['a-jour', 'À jour', '44 variables', []], ['a-jour', 'À jour', 'page Palettes', [['Afficher', 'btn-secondary']]]);
  if (modifiee) poser('Jaune', ['perimee', 'Modifiée dans Figma'], ['perimee', 'Modifiés dans Figma', '2 couleurs changées à la main', []], ['a-jour', 'À jour', 'page Palettes', [['Afficher', 'btn-secondary']]], changees);
  else poser('Jaune', ['perimee', 'À mettre à jour'], ['perimee', 'À mettre à jour', '6 couleurs ont changé dans le plugin', [['Mettre à jour', 'btn-primary']]], ['perimee', 'À actualiser', 'page Palettes', [['Actualiser', 'btn-secondary'], ['Afficher', 'btn-secondary']]]);
  poser('Ardoise', ['jamais-dessinee', 'Pas encore sur Figma'],
    ['jamais-dessinee', 'Pas encore écrits', '44 variables à créer', destination ? [] : [['Écrire dans les tokens', 'btn-primary']]],
    ['jamais-dessinee', 'Pas encore créée', '', [['Créer la planche', 'btn-secondary']]],
    destination ? premiereEcriture : null);

  const liste = panneau.querySelector('.liste-planche');
  const globaux = panneau.querySelector('.gestes-globaux');
  const recette = panneau.querySelector('.carte[aria-label="Palettes et réglages"]');

  if (destination) {
    // La destination, ouverte sous la connexion : trois choix, puis ce qu'ils donnent dans le panneau des variables de Figma.
    const hexa = (pastille) => `#${pastille.style.background.match(/\d+/g).map((octet) => Number(octet).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    const [soft, vivid] = [...fiche('Ardoise').querySelectorAll('.fiche-rangee')].map((rangee) => [...rangee.querySelectorAll('.fiche-pastille')]);
    const valeur = (nuance, pastille) => `<div class="m-panneau-ligne"><span>${nuance}</span><span class="m-valeur"><i style="background:${pastille.style.background}"></i>${hexa(pastille).slice(1)}</span></div>`;
    const groupe = (chemin, compte) => `<div class="m-panneau-groupe"><code>${chemin}</code>${compte ? `<span>${compte}</span>` : ''}</div>`;
    const simulation = `<div class="m-simulation"><div class="m-simulation-tete"><span class="libelle-de-champ">Simulation</span><span class="ligne-secondaire">44 variables · 1 mode</span></div><div class="m-panneau"><div class="m-panneau-tete"><span>primitives</span><span>Valeur</span></div>${groupe('colors / ardoise / soft / light', '')}${valeur(50, soft[0])}${valeur(100, soft[1])}${valeur(200, soft[2])}<div class="m-panneau-suite">8 autres nuances</div>${groupe('colors / ardoise / soft / dark', '11')}${groupe('colors / ardoise / vivid / light', '11')}${groupe('colors / ardoise / vivid / dark', '11')}</div></div>`;
    panneau.querySelector('.m-connexion').replaceWith(M.el(`<section class="carte m-carte-ouverte" aria-label="Destination des tokens"><div class="carte-tete"><h3 class="carte-titre">Destination des tokens</h3></div><div class="carte-corps m-aere"><div class="champ-colonne"><span class="libelle-de-champ">Collection</span><div class="m-collections" role="radiogroup"><label class="m-collection"><input type="radio" name="collection" checked><span class="m-collection-nom">Nouvelle collection<input type="text" class="input" value="primitives"></span><span></span></label><label class="m-collection"><input type="radio" name="collection"><span class="m-collection-nom">Primitives</span><span class="ligne-secondaire">48 variables</span></label><label class="m-collection" data-distante><input type="radio" name="collection" disabled><span class="m-collection-nom">primitive base<span class="m-etiquette">Bibliothèque</span></span><span>323 variables · lecture seule</span></label><label class="m-collection" data-distante><input type="radio" name="collection" disabled><span class="m-collection-nom">primitive base<span class="m-etiquette">Bibliothèque</span></span><span>6 variables · lecture seule</span></label></div></div><div class="colonnes-de-base"><label class="champ-colonne"><span class="libelle-de-champ">Groupe</span><input type="text" class="input" value="colors"></label><div class="champ-colonne"><span class="libelle-de-champ">Thèmes Light et Dark</span><div class="bascule bascule-de-base" role="group"><button type="button" class="bascule-option" aria-pressed="true">Dans le chemin</button><button type="button" class="bascule-option" aria-pressed="false">En modes</button></div></div></div>${simulation}<div class="confirmation-gestes"><button type="button" class="btn btn-secondary btn-compact"><span>Annuler</span></button><button type="button" class="btn btn-primary btn-compact"><span>Enregistrer</span></button></div></div></section>`));
    fiche('Bleu').remove();
    fiche('Jaune').remove();
    globaux.remove();
    recette.remove();
    return;
  }
  if (planches) {
    // La page des planches, ouverte à la place du bloc : une page du fichier, ou une nouvelle.
    const page = (nom, detail, choisie) => `<label class="m-collection"><input type="radio" name="page"${choisie ? ' checked' : ''}><span class="m-collection-nom">${nom}</span><span class="ligne-secondaire">${detail}</span></label>`;
    panneau.querySelector('.m-connexion').replaceWith(M.el(`<section class="carte m-carte-ouverte" aria-label="Page des planches"><div class="carte-tete"><h3 class="carte-titre">Page des planches</h3></div><div class="carte-corps m-aere"><div class="champ-colonne"><span class="libelle-de-champ">Page</span><div class="m-collections" role="radiogroup">${page('Palettes', '2 planches', true)}${page('Cover', '', false)}${page('Design system', '', false)}<label class="m-collection"><input type="radio" name="page"><span class="m-collection-nom">Nouvelle page<input type="text" class="input" placeholder="Nom"></span><span></span></label></div></div><div class="confirmation-gestes"><button type="button" class="btn btn-secondary btn-compact"><span>Annuler</span></button><button type="button" class="btn btn-primary btn-compact"><span>Enregistrer</span></button></div></div></section>`));
    globaux.remove();
    recette.remove();
    return;
  }
  if (reprise) {
    // Après « Modifier dans le plugin » : slate est une palette du plugin, et ses variables attendent la mise à jour.
    fiche('Bleu').remove();
    fiche('Jaune').remove();
    const reprise_ = fiche('Ardoise');
    reprise_.querySelector('.carte-titre').textContent = 'slate';
    reprise_.querySelector('.etat-du-cadre').dataset.etat = 'perimee';
    reprise_.querySelector('.etat-du-cadre').textContent = 'À mettre à jour';
    reprise_.querySelector('.m-sorties').replaceWith(
      M.el(`<div class="m-sorties">${M.sortie('Tokens Figma', 'perimee', 'À mettre à jour', 'Primitives / slate · 9 couleurs sur 11 changent', [])}${M.sortie('Planche', 'jamais-dessinee', 'Pas encore créée', '', [['Créer la planche', 'btn-secondary']])}</div>`),
      M.el(`<div class="m-encart" data-ton="avertissement"><p><strong>Remplacer 9 couleurs de slate dans Figma ?</strong></p>${ecart('slate/700', '#334155', '#3B4660')}${ecart('slate/800', '#1E293B', '#2D3649')}<p class="ligne-secondaire">Et 7 autres. Les variables gardent leur nom et leurs liaisons.</p><div class="confirmation-gestes"><button type="button" class="btn btn-secondary btn-compact"><span>Annuler</span></button><button type="button" class="btn btn-primary btn-compact"><span>Remplacer 9 couleurs</span></button></div></div>`),
    );
    const restantes = M.el('<div class="liste-planche"></div>');
    restantes.append(M.ficheDuFichier('brand/emerald', 'Brand / brand / emerald / 50 … 950', '11 couleurs · modes Light, Dark', emeraude, 'Modifier dans le plugin'));
    globaux.replaceWith(M.el('<div class="m-separation"><h3 class="m-titre-de-section">Déjà dans le fichier · 1</h3><p>Lues dans les variables du fichier, hors du plugin.</p></div>'), restantes);
    recette.remove();
    return;
  }
  if (modifiee) {
    fiche('Bleu').remove();
    fiche('Ardoise').remove();
    globaux.remove();
    recette.remove();
    return;
  }
  const duFichier = M.el('<div class="liste-planche"></div>');
  duFichier.append(
    M.ficheDuFichier('slate', 'Primitives / slate / 50 … 950', '11 couleurs · 1 mode', slate, 'Modifier dans le plugin'),
    M.ficheDuFichier('brand/emerald', 'Brand / brand / emerald / 50 … 950', '11 couleurs · modes Light, Dark', emeraude, 'Modifier dans le plugin'),
    M.ficheDuFichier('gray', 'primitive base (323 variables) / gray / 50 … 950', '11 couleurs', ['#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827', '#030712'], 'Copier dans le plugin', 'Bibliothèque'),
  );
  globaux.replaceWith(M.el('<div class="m-separation"><h3 class="m-titre-de-section">Déjà dans le fichier · 3</h3><p>Lues dans les variables du fichier, hors du plugin.</p></div>'));
  panneau.querySelector('.m-separation').after(duFichier);
  panneau.append(recette);
}

/** Gestion, vue condensée : une ligne par palette, un état par sortie, aucun geste. */
function gestionCondensee({ slate, emeraude }) {
  M.onglets('Gestion');
  const panneau = document.querySelector('#panneau-planche');
  M.teteDeGestion(panneau, true);
  const etat = (code, libelle) => `<span class="pastille-d-etat" data-etat="${code}">${libelle}</span>`;
  const etats = {
    Bleu: [etat('a-jour', 'À jour'), etat('a-jour', 'À jour')],
    Jaune: [etat('perimee', 'À mettre à jour'), etat('perimee', 'À actualiser')],
    Ardoise: [etat('jamais-dessinee', 'Pas encore écrits'), etat('jamais-dessinee', 'Pas encore créée')],
  };
  const mini = (rampe) => `<div class="m-mini-rampe">${rampe.map((couleur) => `<span style="background:${couleur}"></span>`).join('')}</div>`;
  const lignes = [...panneau.querySelectorAll('.fiche-planche')].map((fiche) => {
    const nom = fiche.getAttribute('aria-label');
    const rangee = [...fiche.querySelectorAll('.fiche-rangee')].at(-1);
    const rampe = [...rangee.querySelectorAll('.fiche-pastille')].map((pastille) => pastille.style.background);
    return `<tr><td><span class="m-nom"><i style="background:${fiche.querySelector('.fiche-teinte').style.background}"></i>${nom}</span></td><td>${mini(rampe)}</td><td>${etats[nom][0]}</td><td>${etats[nom][1]}</td></tr>`;
  }).join('');
  const duFichier = [['slate', slate], ['brand/emerald', emeraude]].map(([nom, rampe]) => `<tr><td><span class="m-nom">${nom}</span></td><td>${mini(rampe)}</td><td colspan="2"><span class="m-etiquette">Variables du fichier</span></td></tr>`).join('');
  panneau.querySelector('.liste-planche').replaceWith(M.el(`<table class="m-table"><thead><tr><th>Palette</th><th></th><th>Tokens Figma</th><th>Planche</th></tr></thead><tbody>${lignes}${duFichier}</tbody></table>`));
  panneau.querySelector('.gestes-globaux').remove();
  panneau.querySelector('.carte[aria-label="Palettes et réglages"]').remove();
}

// ------------------------------------------------------------ les maquettes

const VERS_CREATION = '#onglet-palettes';
const DEPLIER_LES_GARANTIES = '#panneau-palettes .carte[aria-label="Garanties de contraste"] .carte-bascule';
const OUVRIR_LE_VOLET = '.pied-de-la-palette .bouton-discret';
const OUVRIR_LA_LISTE = '.selecteur-bouton';
/** Les deux palettes « du fichier » : slate et emerald de Tailwind. */
const RAMPES_DU_FICHIER = {
  slate: ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'],
  emeraude: ['#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46', '#064E3B', '#022C22'],
};

/** Les maquettes qui attendent une réponse, puis celles que le mainteneur a validées. */
const MAQUETTES = [
  {
    id: 'M9',
    validee: true,
    titre: 'Gestion, vue complète',
    etat: 'planche-perimee',
    transformer: gestion,
    argument: RAMPES_DU_FICHIER,
    hauteur: 1460,
    change: [
      '« Synchroniser » est un texte gris, sans contour, avec l’icône des deux flèches en cercle : il se distingue des boutons « Changer ».',
      'Le bloc « Connexion à Figma » est à 20 px de plus de la barre « Palettes du plugin ».',
    ],
    questions: ['S18, S19 et S22.'],
  },
  {
    id: 'M11',
    titre: 'Gestion : où les variables s’écrivent',
    etat: 'planche-perimee',
    transformer: gestion,
    argument: { ...RAMPES_DU_FICHIER, destination: true },
    hauteur: 1100,
    change: [
      '« Changer », sur la ligne « Tokens », ouvre la carte à la place du bloc « Connexion à Figma ». « Enregistrer » ou « Annuler » rend le bloc.',
      'Les collections se choisissent dans une liste visible, à la place de la liste déroulante : chacune dit son origine et son nombre de variables. Deux « primitive base » de bibliothèque se distinguent par leur compte, et ne se choisissent pas : une bibliothèque ne s’écrit que depuis son propre fichier.',
      'La carte reste grise, sans fond, comme le bloc qu’elle remplace. La liste des collections et la simulation ont un fond gris plus foncé.',
      'La simulation reprend le panneau des variables de Figma : la collection, ses quatre groupes avec leur compte, et les premières nuances avec leur couleur.',
    ],
    questions: ['Le fond de la carte.'],
  },
  {
    id: 'M15',
    titre: 'Gestion : la page des planches',
    etat: 'planche-perimee',
    transformer: gestion,
    argument: { ...RAMPES_DU_FICHIER, planches: true },
    hauteur: 900,
    change: [
      'Aujourd’hui, le plugin crée une page « Palettes » au premier dessin, sans rien demander.',
      '« Changer », sur la ligne « Planches », ouvre cette carte à la place du bloc : une page du fichier, ou une nouvelle.',
      'La simulation montre la page choisie parmi celles du fichier, et ce que le choix déplace.',
      'La carte reste grise, sans fond. La page se choisit dans une liste, comme la collection : les pages du fichier, ou une nouvelle.',
      'Aucune simulation : la liste suffit.',
    ],
    questions: ['Le fond de la carte.'],
  },
  {
    id: 'M13',
    validee: true,
    titre: '« Modifier dans le plugin » : Création s’ouvre sur la palette reprise',
    etat: 'planche-perimee',
    gestes: [VERS_CREATION, OUVRIR_LA_LISTE, '.selecteur-option:nth-child(3)'],
    transformer: reprise,
    argument: RAMPES_DU_FICHIER,
    hauteur: 760,
    change: [
      'Le geste crée une palette du plugin au nom de celle du fichier, avec sa nuance 600 pour référence, et ouvre Création dessus.',
      'Un encart compare la rampe du fichier à celle que le plugin calcule, et laisse choisir : « Recalculées », avec rôles et garanties, ou « Telles quelles », en palette libre sans garanties.',
      'Rien ne s’écrit dans Figma à ce stade. « Annuler la reprise » supprime la palette du plugin et rend celle du fichier à sa liste.',
    ],
    questions: ['S13.'],
  },
  {
    id: 'M14',
    validee: true,
    titre: '« Modifier dans le plugin » : la palette reprise dans Gestion',
    etat: 'planche-perimee',
    transformer: gestion,
    argument: { ...RAMPES_DU_FICHIER, reprise: true },
    hauteur: 900,
    change: [
      'La palette passe de « Déjà dans le fichier » aux palettes du plugin. Ses tokens sont ses variables d’origine, à leur place : ni collection ni nom ne changent.',
      '« Mettre à jour » liste les couleurs qui changent avant de les remplacer. Les calques liés à ces variables suivent.',
    ],
    questions: ['S13.'],
  },
  {
    id: 'M8',
    validee: true,
    titre: 'Vérification : la liste déroulante et ses verdicts',
    etat: 'planche-perimee',
    gestes: [VERS_CREATION, DEPLIER_LES_GARANTIES, OUVRIR_LE_VOLET, OUVRIR_LA_LISTE],
    transformer: verification,
    argument: { 1: 'avertissement', 2: 'succes' },
    hauteur: 760,
    change: ['La liste déroulante de Création, avec le verdict de chaque palette.', 'Le lien d’un message nomme le geste, et ouvre la carte où il se fait.'],
    questions: ['S5, S6 et S17.'],
  },
  {
    id: 'M10',
    validee: true,
    titre: 'Gestion, vue condensée',
    etat: 'planche-perimee',
    transformer: gestionCondensee,
    argument: RAMPES_DU_FICHIER,
    hauteur: 560,
    change: ['Une ligne par palette, ses deux états, aucun geste.'],
    questions: ['S8 et S16.'],
  },
  {
    id: 'M12',
    validee: true,
    titre: 'Gestion : des couleurs changées dans Figma',
    etat: 'planche-perimee',
    transformer: gestion,
    argument: { ...RAMPES_DU_FICHIER, modifiee: true },
    hauteur: 700,
    change: ['La fiche liste les couleurs changées à la main et propose deux choix pour la palette entière.'],
    questions: ['S11.'],
  },
  {
    id: 'M1',
    titre: 'Fichier vide',
    validee: true,
    etat: 'premier-lancement',
    transformer: fichierVide,
    hauteur: 420,
    change: ['Un encart au fond bleuté, et « Nouvelle palette » qui ouvre la carte de création à sa place.'],
    questions: ['S1 et S2.'],
  },
  {
    id: 'M2',
    titre: 'Création',
    validee: true,
    etat: 'cartes-repliees',
    transformer: creation,
    hauteur: 760,
    change: ['L’onglet actuel sans la carte « Garanties de contraste » ; le pied mène à Vérification.'],
    questions: ['S3 et S4.'],
  },
  {
    id: 'M4',
    titre: 'Vérification, des garanties manquées',
    validee: true,
    etat: 'promesses-manquees',
    gestes: [DEPLIER_LES_GARANTIES, OUVRIR_LE_VOLET],
    transformer: verification,
    argument: { 1: 'avertissement' },
    hauteur: 760,
    change: ['Le verdict passe au rouge, les contrastes à corriger viennent en premier.'],
    questions: ['S7.'],
  },
];

// ------------------------------------------------------------ la page

/** Un texte posé dans un `<script type="text/plain">` : seule sa balise fermante se neutralise, et la page la rétablit. */
const enTexte = (texte) => texte.replace(/<\/script/gi, '<\\/script');

/** La feuille de la page de galerie, variables du thème de Figma comprises : la même pour chaque état. */
let feuilleDuPlugin = '';

async function rendre(navigateur, maquette) {
  const page = await navigateur.newPage({ viewport: { width: LARGEUR, height: 720 } });
  await page.goto(pathToFileURL(path.join(DIST, 'galerie', THEME, `${maquette.etat}.html`)).href);
  await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  for (const geste of maquette.gestes ?? []) await page.locator(geste).first().click();
  await page.evaluate(poserLesOutils);
  await page.evaluate(maquette.transformer, maquette.argument);
  feuilleDuPlugin ||= await page.evaluate(() => [...document.querySelectorAll('style')].map((style) => style.textContent).join('\n'));
  const corps = await page.evaluate(() => {
    for (const script of document.querySelectorAll('script')) script.remove();
    for (const banc of document.querySelectorAll('.resize-grip, .largeur-fenetre')) banc.remove();
    // Une valeur saisie vit dans la propriété du champ : l'attribut la porte dans la copie.
    for (const champ of document.querySelectorAll('input')) champ.setAttribute('value', champ.value);
    // Ce que l'écran cache ne se recopie pas : l'autre onglet, les modales, les listes fermées.
    for (const cache of document.querySelectorAll('[hidden]')) cache.remove();
    return document.body.innerHTML;
  });
  await page.close();
  const liste = (lignes) => `<ul>${lignes.map((ligne) => `<li>${ligne}</li>`).join('')}</ul>`;
  return `<section class="maquette" id="${maquette.id}"><h2>${maquette.id} · ${maquette.titre}</h2><div class="rangee"><iframe title="${maquette.id}" width="${LARGEUR}" height="${maquette.hauteur}"></iframe><script type="text/plain" class="corps">${enTexte(corps)}</script><div class="notes"><h3>Ce qui change</h3>${liste(maquette.change)}<h3>${maquette.validee ? 'Validé' : 'À valider'}</h3>${liste(maquette.questions)}</div></div></section>`;
}

const navigateur = await chromium.launch();
const sections = { attente: [], validees: [] };
for (const maquette of MAQUETTES) sections[maquette.validee ? 'validees' : 'attente'].push(await rendre(navigateur, maquette));
await navigateur.close();

const lien = (maquette) => `<a href="#${maquette.id}">${maquette.id} · ${maquette.titre}</a>`;
const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UCM Palettes : maquettes de la direction simple</title>
<style>
  body { max-width: 1120px; margin: 0 auto; padding: 32px 24px 80px; background: #17181c; color: #e5e7eb; font: 14px/1.5 system-ui, sans-serif; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  h2 { margin: 48px 0 12px; font-size: 18px; }
  h2.partie { margin-top: 64px; padding-top: 24px; border-top: 1px solid #3f4350; font-size: 21px; }
  h3 { margin: 0 0 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }
  a { color: #7cc4ff; }
  nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  nav a { padding: 4px 10px; border: 1px solid #3f4350; border-radius: 14px; background: #23252b; text-decoration: none; }
  .rangee { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 24px; }
  iframe { flex: none; border: 1px solid #4b5060; border-radius: 8px; background: #2c2c2c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
  .notes { min-width: 260px; flex: 1 1 260px; }
  .notes ul { margin: 0 0 20px; padding-left: 18px; }
  .notes li { margin-bottom: 6px; }
  .legende { margin: 12px 0 0; color: #9ca3af; }
</style>
</head>
<body>
<h1>UCM Palettes : maquettes de la direction simple</h1>
<p>Cinquième passage, en thème sombre. Les questions sont dans <a href="./PLAN-DIRECTION-SIMPLE.md">PLAN-DIRECTION-SIMPLE.md</a>.</p>
<p class="legende">Chaque cadre fait 560 px de large et défile comme le plugin. Il est statique : aucun bouton ne répond. Les écrans partent du plugin construit ; les couleurs des palettes du plugin sortent du moteur.</p>
<h2 class="partie">À valider</h2>
<nav>${MAQUETTES.filter((maquette) => !maquette.validee).map(lien).join('')}</nav>
${sections.attente.join('\n')}
<h2 class="partie">Validées, en thème sombre</h2>
<nav>${MAQUETTES.filter((maquette) => maquette.validee).map(lien).join('')}</nav>
${sections.validees.join('\n')}
<script type="text/plain" id="feuille">${enTexte(`${feuilleDuPlugin}\n${STYLES_DES_MAQUETTES}`)}</script>
<script>
  // La feuille du plugin n'est écrite qu'une fois : chaque cadre la reçoit avec son balisage.
  const retablir = (texte) => texte.replace(/<\\\\\\/script/gi, '</' + 'script');
  const feuille = retablir(document.getElementById('feuille').textContent);
  for (const maquette of document.querySelectorAll('.maquette')) {
    const corps = retablir(maquette.querySelector('.corps').textContent);
    maquette.querySelector('iframe').srcdoc = '<!doctype html><html lang="fr" class="${CLASSE_DU_THEME}"><head><meta charset="utf-8"><style>' + feuille + '</style></head><body>' + corps + '</body></html>';
  }
</script>
</body>
</html>
`;
writeFileSync(path.join(ICI, 'MAQUETTES-DIRECTION-SIMPLE.html'), page);
console.log(`MAQUETTES-DIRECTION-SIMPLE.html : ${MAQUETTES.length} maquettes, ${Math.round(page.length / 1024)} ko`);
