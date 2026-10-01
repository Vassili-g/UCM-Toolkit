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
 * balisage et la feuille du plugin dans un cadre de 560 px. Les couleurs des
 * palettes du plugin sortent ainsi du moteur. Ce que la direction ajoute porte
 * une classe `m-`, stylée par `STYLES_DES_MAQUETTES` : ces règles n'existent
 * pas dans le plugin. Les palettes « du fichier » sont deux rampes de
 * Tailwind, écrites en dur.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '../../../../../../');
const DIST = path.join(RACINE, 'packages/plugin-palettes/dist');
const LARGEUR = 560;

/** La feuille du plugin construit : le socle, puis celle d'UCM Palettes. */
const FEUILLE_DU_PLUGIN = [...readFileSync(path.join(DIST, 'ui.html'), 'utf8').matchAll(/<style>([\s\S]*?)<\/style>/g)].map((bloc) => bloc[1]).join('\n');

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
.m-puces { display: flex; flex-wrap: wrap; gap: var(--espace-serre); }
.m-puce { display: inline-flex; height: var(--hauteur-secondaire); align-items: center; gap: 6px; padding: 0 10px; border: 1px solid var(--bordure); border-radius: 14px; background: var(--fond); color: var(--texte); font: inherit; }
.m-puce[aria-pressed='true'] { border-color: var(--bordure-marque); box-shadow: inset 0 0 0 1px var(--bordure-marque); font-weight: 600; }
.m-puce i { width: 10px; height: 10px; border-radius: 50%; }
.m-puce b[data-ton='succes'] { color: var(--texte-succes); }
.m-puce b[data-ton='avertissement'] { color: var(--texte-avertissement); }
.m-puce b[data-ton='danger'] { color: var(--texte-danger); }
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
.m-mini-rampe { display: flex; margin-top: 4px; }
.m-mini-rampe span { width: 9px; height: 9px; }
.m-cellule { display: flex; flex-wrap: wrap; align-items: center; gap: var(--espace-serre); }
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
    /** La fiche d'une palette lue dans les variables du fichier : en tirets, sans geste d'écriture. */
    ficheDuFichier(nom, chemin, detail, rampe, geste) {
      const pastilles = rampe.map((hexa) => `<span class="fiche-pastille" style="background:${hexa}"></span>`).join('');
      return el(`<section class="carte fiche-planche m-du-fichier" aria-label="${nom}"><div class="carte-tete"><h3 class="carte-titre">${nom}</h3><span class="m-etiquette">Variables du fichier</span></div><div class="carte-corps"><div class="fiche-apercu" style="--colonnes:${rampe.length}"><div class="fiche-rangee"><span class="fiche-profil"></span>${pastilles}</div></div><div class="fiche-information"><span class="ligne-secondaire"><code>${chemin}</code> · ${detail}</span>${geste ? `<button type="button" class="btn btn-secondary btn-compact"><span>${geste}</span></button>` : ''}</div></div></section>`);
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

/** M3 : l'onglet Vérification, bâti sur la carte des garanties dépliée et sur les messages du volet. */
function verification(verdicts) {
  M.onglets('Vérification');
  const configuration = document.querySelector('.configuration-de-la-palette');
  const pied = configuration.querySelector('.pied-de-la-palette');
  const [bilan, alertes] = pied.querySelector('.pied-texte').textContent.split(' · ');
  const ton = pied.dataset.ton;
  const messages = pied.querySelector('.volet-corps').firstElementChild;
  const garanties = M.carte('Garanties de contraste');
  const tete = configuration.querySelector('.tete-de-la-palette');

  // Une puce par palette, avec son verdict : elle choisit la palette et montre l'état des autres.
  const options = [...document.querySelectorAll('.selecteur-option')];
  const signes = { succes: '✓', avertissement: '!', danger: '✗' };
  const puces = options.map((option, rang) => {
    const verdict = rang === 0 ? ton : (verdicts[rang] ?? 'succes');
    return `<button type="button" class="m-puce" aria-pressed="${rang === 0}"><i style="background:${option.querySelector('.pastille-reference').style.background}"></i>${option.textContent}<b data-ton="${verdict}">${signes[verdict]}</b></button>`;
  }).join('');
  document.querySelector('.choix-de-palette').innerHTML = `<div class="m-puces" role="group" aria-label="Palette vérifiée">${puces}</div>`;

  // La carte des garanties reste ouverte : son en-tête n'est plus un bouton.
  const bascule = garanties.querySelector('.carte-bascule');
  bascule.querySelector('.carte-chevron').remove();
  bascule.querySelector('.carte-resume').remove();
  bascule.style.cursor = 'default';

  const verdict = M.el(`<div class="m-verdict" data-ton="${ton}"><span class="m-verdict-icone">${signes[ton]}</span><div><strong>${bilan}</strong><br><span>${alertes === 'aucune alerte' ? 'Aucun point à vérifier' : alertes.replace('alerte', 'point à vérifier').replace('alertes', 'points à vérifier')}</span></div></div>`);
  const suite = ton === 'danger'
    ? '<span class="pied-texte">Corrigez la palette dans Création avant de l’écrire dans Figma.</span><button type="button" class="btn btn-secondary btn-compact"><span>Retour à Création</span></button>'
    : '<span class="pied-texte">La palette tient ses garanties.</span><button type="button" class="btn btn-primary btn-compact"><span>Passer à Gestion</span></button>';
  configuration.replaceChildren(tete, verdict, ...(messages ? [messages] : []), garanties, M.el(`<div class="pied-de-la-palette m-pied">${suite}</div>`));
}

/** M4 : l'onglet Gestion, bâti sur les fiches de l'onglet Palettes. */
function gestion() {
  M.onglets('Gestion');
  const panneau = document.querySelector('#panneau-planche');
  const etats = {
    Bleu: { pastille: ['a-jour', 'Synchronisée'], tokens: ['a-jour', 'À jour', '44 variables · collection primitives', []], planche: ['a-jour', 'À jour', 'page Palettes', [['Afficher', 'btn-secondary']]] },
    Jaune: { pastille: ['perimee', 'À mettre à jour'], tokens: ['perimee', 'À mettre à jour', '6 couleurs ont changé dans le plugin', [['Mettre à jour', 'btn-primary']]], planche: ['perimee', 'À actualiser', 'page Palettes', [['Actualiser', 'btn-secondary'], ['Afficher', 'btn-secondary']]] },
    Ardoise: { pastille: ['jamais-dessinee', 'Pas encore sur Figma'], tokens: ['jamais-dessinee', 'Pas encore écrits', '44 variables à créer', [['Écrire dans les tokens', 'btn-primary']]], planche: ['jamais-dessinee', 'Pas encore créée', '', [['Créer la planche', 'btn-secondary']]] },
  };
  panneau.querySelector('.planche-compte').textContent = 'Palettes du plugin · 3';
  panneau.querySelector('.planche-tete .bouton-discret').textContent = 'Relire le fichier';
  for (const fiche of panneau.querySelectorAll('.fiche-planche')) {
    const etat = etats[fiche.getAttribute('aria-label')];
    const pastille = fiche.querySelector('.etat-du-cadre');
    pastille.dataset.etat = etat.pastille[0];
    pastille.textContent = etat.pastille[1];
    // « Modifier » rejoint l'état dans l'en-tête : il ramène à Création.
    const tete = M.el('<span class="m-tete-gestes"></span>');
    pastille.replaceWith(tete);
    tete.append(pastille, M.el('<button type="button" class="bouton-discret">Modifier</button>'));
    fiche.querySelector('.fiche-gestes').replaceWith(M.el(`<div class="m-sorties">${M.sortie('Tokens Figma', ...etat.tokens)}${M.sortie('Planche', ...etat.planche)}</div>`));
  }
  const globaux = panneau.querySelector('.gestes-globaux');
  globaux.innerHTML = '<button type="button" class="btn btn-primary"><span>Tout mettre à jour (2 palettes)</span></button>';

  const separation = M.el('<div class="m-separation"><h3 class="m-titre-de-section">Déjà dans le fichier · 2</h3><p>Lues dans les variables du fichier. Le plugin ne les modifie jamais.</p></div>');
  const slate = ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'];
  const emeraude = ['#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46', '#064E3B', '#022C22'];
  const duFichier = M.el('<div class="liste-planche"></div>');
  duFichier.append(
    M.ficheDuFichier('slate', 'Primitives / slate / 50 … 950', '11 couleurs · 1 mode', slate, 'Reprendre dans le plugin'),
    M.ficheDuFichier('brand/emerald', 'Brand / brand / emerald / 50 … 950', '11 couleurs · modes Light, Dark', emeraude, 'Reprendre dans le plugin'),
  );
  globaux.after(separation, duFichier);
  // La carte « Palettes et réglages » ferme l'onglet, sous les deux listes.
  panneau.append(panneau.querySelector('.carte[aria-label="Palettes et réglages"]'));
}

/** M5 : les deux moments où Gestion demande une décision. */
function gestionDecisions() {
  M.onglets('Gestion');
  const panneau = document.querySelector('#panneau-planche');
  panneau.querySelector('.planche-compte').textContent = 'Palettes du plugin · 3';
  panneau.querySelector('.planche-tete .bouton-discret').textContent = 'Relire le fichier';
  const fiche = (nom) => panneau.querySelector(`.fiche-planche[aria-label="${nom}"]`);
  fiche('Bleu').remove();
  panneau.querySelector('.gestes-globaux').remove();
  panneau.querySelector('.carte[aria-label="Palettes et réglages"]').remove();
  const poser = (nom, pastille, sorties, encart) => {
    const cible = fiche(nom);
    const etat = cible.querySelector('.etat-du-cadre');
    etat.dataset.etat = pastille[0];
    etat.textContent = pastille[1];
    cible.querySelector('.fiche-gestes').replaceWith(M.el(`<div class="m-sorties">${sorties}</div>`), M.el(encart));
  };
  poser('Ardoise', ['jamais-dessinee', 'Pas encore sur Figma'],
    M.sortie('Tokens Figma', 'jamais-dessinee', 'Pas encore écrits', '44 variables à créer', []) + M.sortie('Planche', 'jamais-dessinee', 'Pas encore créée', '', [['Créer la planche', 'btn-secondary']]),
    '<div class="m-encart"><p><strong>Écrire Ardoise dans les tokens Figma ?</strong></p><p class="ligne-secondaire">44 variables de couleur seront créées dans la collection <code>primitives</code>, de <code>colors/ardoise/soft/light/50</code> à <code>colors/ardoise/vivid/dark/950</code>. Aucune variable existante n’est modifiée.</p><div class="confirmation-gestes"><button type="button" class="btn btn-secondary btn-compact"><span>Annuler</span></button><button type="button" class="btn btn-primary btn-compact"><span>Écrire 44 variables</span></button></div></div>');
  const ecart = (chemin, figma, plugin) => `<div class="m-ecart"><code>${chemin}</code><span class="m-valeur"><i style="background:${figma}"></i>${figma} dans Figma</span><span class="m-valeur"><i style="background:${plugin}"></i>${plugin} dans le plugin</span></div>`;
  poser('Jaune', ['perimee', 'Modifiée dans Figma'],
    M.sortie('Tokens Figma', 'perimee', 'Modifiés dans Figma', '2 couleurs changées à la main', []) + M.sortie('Planche', 'a-jour', 'À jour', 'page Palettes', [['Afficher', 'btn-secondary']]),
    `<div class="m-encart" data-ton="avertissement"><p><strong>2 couleurs de Jaune ne sont plus celles du plugin.</strong></p>${ecart('colors/jaune/vivid/light/700', '#8A5A00', '#845925')}${ecart('colors/jaune/vivid/light/800', '#6E4500', '#6B431B')}<div class="confirmation-gestes"><button type="button" class="btn btn-secondary btn-compact"><span>Laisser les couleurs de Figma</span></button><button type="button" class="btn btn-primary btn-compact"><span>Remettre les couleurs du plugin</span></button></div></div>`);
  panneau.querySelector('.liste-planche').prepend(fiche('Ardoise'));
}

/** M6 : la variante en tableau de l'onglet Gestion. */
function gestionEnTableau() {
  M.onglets('Gestion');
  const panneau = document.querySelector('#panneau-planche');
  panneau.querySelector('.planche-compte').textContent = 'Palettes du plugin · 3';
  panneau.querySelector('.planche-tete .bouton-discret').textContent = 'Relire le fichier';
  panneau.querySelector('.planche-tete .bascule').remove();
  const etat = (code, libelle) => `<span class="pastille-d-etat" data-etat="${code}">${libelle}</span>`;
  const geste = (texte, classe = 'btn-secondary') => `<button type="button" class="btn ${classe} btn-compact"><span>${texte}</span></button>`;
  const cellules = {
    Bleu: [etat('a-jour', 'À jour'), etat('a-jour', 'À jour') + geste('Afficher')],
    Jaune: [etat('perimee', 'À mettre à jour') + geste('Mettre à jour'), etat('perimee', 'À actualiser') + geste('Actualiser')],
    Ardoise: [etat('jamais-dessinee', 'Pas encore écrits') + geste('Écrire'), etat('jamais-dessinee', 'Pas encore créée') + geste('Créer')],
  };
  const lignes = [...panneau.querySelectorAll('.fiche-planche')].map((fiche) => {
    const nom = fiche.getAttribute('aria-label');
    const rangee = [...fiche.querySelectorAll('.fiche-rangee')].at(-1);
    const rampe = [...rangee.querySelectorAll('.fiche-pastille')].map((pastille) => `<span style="background:${pastille.style.background}"></span>`).join('');
    return `<tr><td><span class="m-nom"><i style="background:${fiche.querySelector('.fiche-teinte').style.background}"></i>${nom}</span><div class="m-mini-rampe">${rampe}</div></td><td><div class="m-cellule">${cellules[nom][0]}</div></td><td><div class="m-cellule">${cellules[nom][1]}</div></td></tr>`;
  }).join('');
  const slate = ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'];
  const duFichier = `<tr><td><span class="m-nom">slate <span class="m-etiquette">Variables du fichier</span></span><div class="m-mini-rampe">${slate.map((hexa) => `<span style="background:${hexa}"></span>`).join('')}</div></td><td><span class="ligne-secondaire">Primitives / slate · 11 couleurs</span></td><td><span class="ligne-secondaire">Aucune</span></td></tr>`;
  panneau.querySelector('.liste-planche').replaceWith(M.el(`<table class="m-table"><thead><tr><th>Palette</th><th>Tokens Figma</th><th>Planche</th></tr></thead><tbody>${lignes}${duFichier}</tbody></table>`));
  panneau.querySelector('.gestes-globaux').innerHTML = '<button type="button" class="btn btn-primary"><span>Tout mettre à jour (2 palettes)</span></button>';
}

// ------------------------------------------------------------ les maquettes

const DEPLIER_LES_GARANTIES = '#panneau-palettes .carte[aria-label="Garanties de contraste"] .carte-bascule';
const OUVRIR_LE_VOLET = '.pied-de-la-palette .bouton-discret';

const MAQUETTES = [
  {
    id: 'M1',
    titre: 'Fichier vide',
    etat: 'premier-lancement',
    transformer: fichierVide,
    hauteur: 420,
    change: [
      'Un encart au fond bleuté remplace la ligne grise et la carte de création ouverte d’office.',
      '« Nouvelle palette » ouvre la carte de création actuelle, à la place de l’encart.',
      'Si les variables du fichier portent déjà des palettes, une ligne mène à Gestion ; sinon elle n’existe pas.',
    ],
    questions: ['S1 : les trois onglets et leurs noms.', 'S2 : l’encart, et la ligne vers Gestion.'],
  },
  {
    id: 'M2',
    titre: 'Création',
    etat: 'cartes-repliees',
    transformer: creation,
    hauteur: 760,
    change: [
      'La carte « Garanties de contraste » quitte l’onglet. Le reste ne bouge pas : configuration, aperçu, Réglage global, Color shift, Interface de test.',
      'Le pied garde le bilan de la palette. Son bouton devient « Vérifier » et ouvre Vérification sur la même palette ; le volet « Détails » disparaît.',
    ],
    questions: ['S3 : l’Interface de test reste-t-elle ici ?', 'S4 : le pied et son bouton « Vérifier ».'],
  },
  {
    id: 'M3',
    titre: 'Vérification, des garanties tenues et un point à vérifier',
    etat: 'planche-perimee',
    gestes: ['#onglet-palettes', DEPLIER_LES_GARANTIES, OUVRIR_LE_VOLET],
    transformer: verification,
    argument: { 1: 'succes', 2: 'succes' },
    hauteur: 760,
    change: [
      'Une puce par palette porte son verdict : elle choisit la palette, et les trois verdicts se lisent sans ouvrir de liste.',
      'Le verdict de la palette, puis ses messages, ceux du volet « Détails » actuel, puis la carte des garanties, toujours ouverte.',
      'Un lien de message ouvre Création sur le réglage qu’il nomme.',
      'Le pied mène à l’étape suivante.',
    ],
    questions: ['S5 : des puces ou la liste déroulante de Création.', 'S6 : le contenu de l’onglet et son ordre.'],
  },
  {
    id: 'M4',
    titre: 'Vérification, des garanties manquées',
    etat: 'promesses-manquees',
    gestes: [DEPLIER_LES_GARANTIES, OUVRIR_LE_VOLET],
    transformer: verification,
    argument: { 1: 'avertissement' },
    hauteur: 760,
    change: [
      'Le verdict passe au rouge, et les contrastes à corriger viennent en premier.',
      'Le pied ramène à Création. Gestion reste accessible : écrire une palette qui manque des garanties n’est pas interdit, la fiche le dit.',
    ],
    questions: ['S7 : une palette qui manque des garanties peut-elle s’écrire dans Figma ?'],
  },
  {
    id: 'M5',
    titre: 'Gestion, variante A : une fiche par palette',
    etat: 'planche-perimee',
    transformer: gestion,
    hauteur: 1190,
    change: [
      'Chaque fiche du plugin porte deux lignes, « Tokens Figma » et « Planche » : un état et un geste par sortie. La pastille de l’en-tête résume les deux.',
      '« Modifier » ramène à Création, « Soft ✓ · Vivid ✓ » à Vérification.',
      'Sous un filet, « Déjà dans le fichier » : les palettes lues dans les variables, en tirets, sans état ni geste d’écriture.',
      '« Tout mettre à jour » écrit les tokens et les planches en retard, après une seule confirmation.',
    ],
    questions: ['S8 : variante A ou B.', 'S9 : les états et leurs mots.', 'S12 : la détection des palettes du fichier.', 'S13 : « Reprendre dans le plugin ».'],
  },
  {
    id: 'M6',
    titre: 'Gestion : les deux décisions',
    etat: 'planche-perimee',
    transformer: gestionDecisions,
    hauteur: 860,
    change: [
      'Première écriture : la fiche dit combien de variables elle crée, dans quelle collection et sous quels noms, puis attend « Écrire ».',
      'Couleurs changées à la main dans Figma : la fiche les liste, valeur de Figma et valeur du plugin côte à côte, et propose deux choix pour la palette entière.',
      'Aucune modale, aucune revue : la décision se prend dans la fiche.',
    ],
    questions: ['S10 : la forme des variables écrites.', 'S11 : les deux choix quand Figma a changé.'],
  },
  {
    id: 'M7',
    titre: 'Gestion, variante B : un tableau',
    etat: 'planche-perimee',
    transformer: gestionEnTableau,
    hauteur: 480,
    change: [
      'Une ligne par palette, une colonne par sortie : la synchronisation se lit en croix.',
      'Plus dense : douze palettes tiennent dans la fenêtre par défaut. La rampe passe en miniature, et la référence, les garanties et le détail des variables ne se lisent plus ici.',
      'Une palette du fichier est une ligne du même tableau, marquée « Variables du fichier ».',
    ],
    questions: ['S8 : variante A ou B.'],
  },
];

// ------------------------------------------------------------ la page

/** Un texte posé dans un `<script type="text/plain">` : seule sa balise fermante se neutralise, et la page la rétablit. */
const enTexte = (texte) => texte.replace(/<\/script/gi, '<\\/script');

async function rendre(navigateur, maquette) {
  const page = await navigateur.newPage({ viewport: { width: LARGEUR, height: 720 } });
  await page.goto(pathToFileURL(path.join(DIST, 'galerie/clair', `${maquette.etat}.html`)).href);
  await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  for (const geste of maquette.gestes ?? []) await page.locator(geste).first().click();
  await page.evaluate(poserLesOutils);
  await page.evaluate(maquette.transformer, maquette.argument);
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
  return `<section class="maquette" id="${maquette.id}"><h2>${maquette.id} · ${maquette.titre}</h2><div class="rangee"><iframe title="${maquette.id}" width="${LARGEUR}" height="${maquette.hauteur}"></iframe><script type="text/plain" class="corps">${enTexte(corps)}</script><div class="notes"><h3>Ce qui change</h3>${liste(maquette.change)}<h3>À valider</h3>${liste(maquette.questions)}</div></div></section>`;
}

const navigateur = await chromium.launch();
const sections = [];
for (const maquette of MAQUETTES) sections.push(await rendre(navigateur, maquette));
await navigateur.close();

const sommaire = MAQUETTES.map((maquette) => `<a href="#${maquette.id}">${maquette.id} · ${maquette.titre}</a>`).join('');
const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UCM Palettes : maquettes de la direction simple</title>
<style>
  body { max-width: 1120px; margin: 0 auto; padding: 32px 24px 80px; background: #f3f4f6; color: #111827; font: 14px/1.5 system-ui, sans-serif; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  h2 { margin: 48px 0 12px; font-size: 18px; }
  h3 { margin: 0 0 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #4b5563; }
  nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  nav a { padding: 4px 10px; border: 1px solid #d1d5db; border-radius: 14px; background: #fff; color: #1d4ed8; text-decoration: none; }
  .rangee { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 24px; }
  iframe { flex: none; border: 1px solid #9ca3af; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); }
  .notes { min-width: 260px; flex: 1 1 260px; }
  .notes ul { margin: 0 0 20px; padding-left: 18px; }
  .notes li { margin-bottom: 6px; }
  .legende { margin: 12px 0 0; color: #4b5563; }
</style>
</head>
<body>
<h1>UCM Palettes : maquettes de la direction simple</h1>
<p>Trois onglets, Création, Vérification et Gestion, et un encart pour le fichier vide. Les questions S1 à S14 sont dans <a href="./PLAN-DIRECTION-SIMPLE.md">PLAN-DIRECTION-SIMPLE.md</a>.</p>
<p class="legende">Chaque cadre fait 560 px de large et défile comme le plugin. Il est statique : aucun bouton ne répond. Les écrans partent du plugin construit ; les couleurs des palettes du plugin sortent du moteur.</p>
<nav>${sommaire}</nav>
${sections.join('\n')}
<script type="text/plain" id="feuille">${enTexte(`${FEUILLE_DU_PLUGIN}\n${STYLES_DES_MAQUETTES}`)}</script>
<script>
  // La feuille du plugin n'est écrite qu'une fois : chaque cadre la reçoit avec son balisage.
  const retablir = (texte) => texte.replace(/<\\\\\\/script/gi, '</' + 'script');
  const feuille = retablir(document.getElementById('feuille').textContent);
  for (const maquette of document.querySelectorAll('.maquette')) {
    const corps = retablir(maquette.querySelector('.corps').textContent);
    maquette.querySelector('iframe').srcdoc = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>' + feuille + '</style></head><body>' + corps + '</body></html>';
  }
</script>
</body>
</html>
`;
writeFileSync(path.join(ICI, 'MAQUETTES-DIRECTION-SIMPLE.html'), page);
console.log(`MAQUETTES-DIRECTION-SIMPLE.html : ${MAQUETTES.length} maquettes, ${Math.round(page.length / 1024)} ko`);
