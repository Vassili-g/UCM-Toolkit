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
 * sortie par fiche. `destination` ouvre la carte de la destination et ne
 * garde que la fiche d'une première écriture ; `modifiee` ne garde que la
 * fiche dont Figma a changé des couleurs.
 */
function gestion({ slate, emeraude, destination = false, modifiee = false }) {
  M.onglets('Gestion');
  const panneau = document.querySelector('#panneau-planche');
  const tete = panneau.querySelector('.planche-tete');
  panneau.querySelector('.planche-compte').textContent = 'Palettes du plugin · 3';
  tete.querySelector('.bouton-discret').textContent = 'Relire';
  tete.querySelector('.bascule').before(M.el('<div class="bascule" role="group" aria-label="Vue"><button type="button" class="bascule-option" aria-pressed="true">Complète</button><button type="button" class="bascule-option" aria-pressed="false">Condensée</button></div>'));
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
    // La destination, ouverte : une collection, un groupe, la place des thèmes, et le chemin qui en sort.
    liste.before(M.el('<section class="carte" aria-label="Destination des tokens"><div class="carte-tete"><h3 class="carte-titre">Destination des tokens</h3><span class="carte-resume">Pour toutes les palettes du plugin</span></div><div class="carte-corps"><div class="colonnes-de-base"><label class="champ-colonne"><span class="libelle-de-champ">Collection</span><select class="input"><option>primitives (nouvelle collection)</option><option>Primitives</option><option>Brand</option><option>Autre nom…</option></select><span class="ligne-secondaire">Une collection du fichier, ou une nouvelle.</span></label><label class="champ-colonne"><span class="libelle-de-champ">Groupe</span><input type="text" class="input" value="colors"><span class="ligne-secondaire">Le dossier des palettes dans la collection. Vide : à la racine.</span></label></div><div class="champ-colonne"><span class="libelle-de-champ">Thèmes Light et Dark</span><div class="bascule bascule-de-base" role="group"><button type="button" class="bascule-option" aria-pressed="true">Dans le chemin</button><button type="button" class="bascule-option" aria-pressed="false">En modes</button></div><span class="ligne-secondaire">Dans le chemin : une variable par thème, un seul mode.</span></div><div class="m-chemin"><span class="ligne-secondaire">Exemple</span><code>primitives</code><span>›</span><code>colors/ardoise/vivid/light/600</code></div><div class="confirmation-gestes"><button type="button" class="btn btn-secondary btn-compact"><span>Annuler</span></button><button type="button" class="btn btn-primary btn-compact"><span>Enregistrer</span></button></div></div></section>'));
    fiche('Bleu').remove();
    fiche('Jaune').remove();
    globaux.remove();
    recette.remove();
    return;
  }
  liste.before(M.el('<p class="m-chemin"><span class="ligne-secondaire">Tokens écrits dans</span><code>primitives</code><span>›</span><code>colors/…</code><button type="button" class="bouton-discret">Changer</button></p>'));
  if (modifiee) {
    fiche('Bleu').remove();
    fiche('Ardoise').remove();
    globaux.remove();
    recette.remove();
    return;
  }
  globaux.innerHTML = '<button type="button" class="btn btn-primary"><span>Tout mettre à jour (2 palettes)</span></button>';
  const duFichier = M.el('<div class="liste-planche"></div>');
  duFichier.append(
    M.ficheDuFichier('slate', 'Primitives / slate / 50 … 950', '11 couleurs · 1 mode', slate, 'Modifier dans le plugin'),
    M.ficheDuFichier('brand/emerald', 'Brand / brand / emerald / 50 … 950', '11 couleurs · modes Light, Dark', emeraude, 'Modifier dans le plugin'),
  );
  globaux.after(M.el('<div class="m-separation"><h3 class="m-titre-de-section">Déjà dans le fichier · 2</h3><p>Lues dans les variables du fichier, hors du plugin.</p></div>'), duFichier);
  panneau.append(recette);
}

/** Gestion, vue condensée : une ligne par palette, un état par sortie, aucun geste. */
function gestionCondensee({ slate, emeraude }) {
  M.onglets('Gestion');
  const panneau = document.querySelector('#panneau-planche');
  const tete = panneau.querySelector('.planche-tete');
  panneau.querySelector('.planche-compte').textContent = 'Palettes du plugin · 3';
  tete.querySelector('.bouton-discret').textContent = 'Relire';
  tete.querySelector('.bascule').replaceWith(M.el('<div class="bascule" role="group" aria-label="Vue"><button type="button" class="bascule-option" aria-pressed="false">Complète</button><button type="button" class="bascule-option" aria-pressed="true">Condensée</button></div>'));
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
    id: 'M8',
    titre: 'Vérification : la liste déroulante et ses verdicts',
    etat: 'planche-perimee',
    gestes: [VERS_CREATION, DEPLIER_LES_GARANTIES, OUVRIR_LE_VOLET, OUVRIR_LA_LISTE],
    transformer: verification,
    argument: { 1: 'avertissement', 2: 'succes' },
    hauteur: 760,
    change: [
      'La barre est celle de Création : liste déroulante, « Nouvelle palette », menu. Ouverte ici, la liste porte le verdict de chaque palette, ✓, ! ou ✗ ; le bouton porte celui de la palette ouverte.',
      'Le point à vérifier perd sa ligne de mesure, « Écart le plus faible : … ΔEok » : il garde où, quoi, le geste et le lien.',
    ],
    questions: ['S5 : la place et la forme du verdict dans la liste.', 'S6 : le message simplifié.'],
  },
  {
    id: 'M9',
    titre: 'Gestion, vue complète',
    etat: 'planche-perimee',
    transformer: gestion,
    argument: RAMPES_DU_FICHIER,
    hauteur: 1250,
    change: [
      'Une bascule « Complète · Condensée » en tête ; la vue complète est celle de l’ouverture.',
      'Sous la tête, une ligne dit où les tokens s’écrivent, et « Changer » ouvre la carte de M11.',
      'Une palette du fichier porte « Modifier dans le plugin ».',
    ],
    questions: ['S8 : la bascule des deux vues.', 'S13 : ce que fait « Modifier dans le plugin ».', 'S15 : la ligne de la destination.'],
  },
  {
    id: 'M10',
    titre: 'Gestion, vue condensée',
    etat: 'planche-perimee',
    transformer: gestionCondensee,
    argument: RAMPES_DU_FICHIER,
    hauteur: 420,
    change: [
      'Une ligne par palette : son nom, sa rampe en miniature, l’état de ses tokens, l’état de sa planche. Aucun geste.',
      'Une palette du fichier est une ligne du même tableau, marquée « Variables du fichier ».',
      'Un clic sur une ligne ouvre la vue complète sur cette palette.',
    ],
    questions: ['S8 : ce que la vue condensée montre.', 'S16 : « Tout mettre à jour » absent de cette vue.'],
  },
  {
    id: 'M11',
    titre: 'Gestion : où les variables s’écrivent',
    etat: 'planche-perimee',
    transformer: gestion,
    argument: { ...RAMPES_DU_FICHIER, destination: true },
    hauteur: 860,
    change: [
      'Une carte « Destination des tokens », réglée une fois pour le fichier : la collection, choisie parmi celles du fichier ou créée, le groupe, et la place des thèmes Light et Dark.',
      'L’exemple montre le chemin d’une variable avec ces choix.',
      'La confirmation d’une première écriture reprend la destination : collection, premier et dernier chemin, nombre de variables.',
    ],
    questions: ['S15 : une destination pour le fichier, réglée dans Gestion.', 'S10 : les thèmes dans le chemin ou en modes.'],
  },
  {
    id: 'M12',
    titre: 'Gestion : des couleurs changées dans Figma',
    etat: 'planche-perimee',
    transformer: gestion,
    argument: { ...RAMPES_DU_FICHIER, modifiee: true },
    hauteur: 520,
    change: ['La fiche liste les couleurs changées à la main, valeur de Figma et valeur du plugin côte à côte, et propose deux choix pour la palette entière.'],
    questions: ['S11 : les deux choix.'],
  },
  {
    id: 'M1',
    titre: 'Fichier vide',
    validee: true,
    etat: 'premier-lancement',
    transformer: fichierVide,
    hauteur: 420,
    change: ['Un encart au fond bleuté, et « Nouvelle palette » qui ouvre la carte de création à sa place.', 'La ligne vers Gestion ne paraît que si les variables du fichier portent des palettes.'],
    questions: ['S1 et S2.'],
  },
  {
    id: 'M2',
    titre: 'Création',
    validee: true,
    etat: 'cartes-repliees',
    transformer: creation,
    hauteur: 760,
    change: ['L’onglet actuel sans la carte « Garanties de contraste » ; l’interface de test reste.', 'Le pied garde le bilan, et son bouton « Vérifier » ouvre Vérification.'],
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
    change: ['Le verdict passe au rouge, les contrastes à corriger viennent en premier.', 'Une palette qui manque des garanties s’écrit quand même depuis Gestion.'],
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
<p>Second passage, en thème sombre. Les questions sont dans <a href="./PLAN-DIRECTION-SIMPLE.md">PLAN-DIRECTION-SIMPLE.md</a>.</p>
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
