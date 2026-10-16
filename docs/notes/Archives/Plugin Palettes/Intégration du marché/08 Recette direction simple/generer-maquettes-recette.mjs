#!/usr/bin/env node
/**
 * Écrit MAQUETTES-RECETTE-DIRECTION-SIMPLE.html à côté de ce script, depuis la
 * racine du dépôt, après la galerie d'UCM Palettes :
 *
 *   npm run galerie --workspace ucm-palettes-plugin
 *   node "docs/notes/Recherches/Plugin Palettes/Intégration du marché/08 Recette direction simple/generer-maquettes-recette.mjs"
 *
 * Chaque cadre part d'un état de la galerie, donc du plugin construit : le
 * script l'ouvre dans Chromium, le transforme dans la page, puis recopie son
 * balisage et sa feuille dans un cadre de 560 px, en thème sombre. Ce qu'une
 * proposition ajoute porte une classe `m-`, stylée par `STYLES_DES_MAQUETTES` :
 * ces règles n'existent pas dans le plugin.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '../../../../../../');
const DIST = path.join(RACINE, 'packages/plugin-palettes/dist');
const LARGEUR = 560;
const THEME = 'sombre';
const CLASSE_DU_THEME = 'figma-dark';

/** Les règles que les propositions ajoutent. Leur préfixe `m-` les sépare de celles du plugin. */
const STYLES_DES_MAQUETTES = `
.m-compte { min-width: 20px; flex: none; padding: 0 6px; border-radius: 10px; background: var(--fond-note); color: var(--texte-second); font-size: 11px; font-weight: 600; line-height: 20px; text-align: center; }
.m-suite { display: flex; min-width: 0; align-items: center; gap: var(--espace-controle); margin-left: auto; }
.m-phrase { margin: 0; color: var(--texte-second); }

.m-section { display: grid; gap: var(--espace-controle); }
.m-section + .m-section { margin-top: var(--espace-bloc); padding-top: var(--espace-page); border-top: 1px solid var(--bordure); }
.m-section-tete { display: flex; min-height: 24px; align-items: center; gap: var(--espace-controle); }
.m-section .carte.connexion { margin-bottom: 0; }
.m-section .planche-tete { justify-content: space-between; }
.m-section + .carte { margin-top: var(--espace-bloc); }

.m-puits { display: grid; gap: var(--espace-controle); padding: var(--espace-bloc) var(--espace-controle) var(--espace-controle); border: 1px solid transparent; border-radius: 12px; background: color-mix(in srgb, var(--fond) 76%, black); }
.m-puits-tete { display: flex; min-height: 24px; flex-wrap: wrap; align-items: center; gap: var(--espace-controle); padding: 0 var(--espace-serre); }
.m-puits-titre { margin: 0; font-size: 13px; font-weight: 600; line-height: 20px; }
.m-puits > .m-phrase { margin-top: -4px; padding: 0 var(--espace-serre); }
.m-puits > .carte.connexion { margin: 0; padding: 0 var(--espace-serre); border: 0; }
.m-puits[data-ton='externe'] { border: 1px dashed var(--bordure); background: none; }
.m-puits[data-ton='externe'] .carte.fiche-du-fichier { border-style: solid; }

.m-pli { display: grid; gap: var(--espace-controle); padding-top: var(--espace-bloc); border-top: 1px solid var(--bordure); }
.m-pli:first-child { padding-top: 0; border-top: 0; }
.m-pli-tete { display: flex; min-height: 24px; align-items: center; gap: var(--espace-controle); }
.m-pli-bouton { display: inline-flex; flex: none; align-items: center; gap: var(--espace-controle); padding: 0; border: 0; background: none; color: var(--texte); cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; }
.m-chevron { display: inline-block; width: 10px; color: var(--texte-second); text-align: center; }
.m-pli[data-ouvert='true'] .m-chevron { transform: rotate(90deg); }
.m-pli-resume { overflow: hidden; color: var(--texte-second); white-space: nowrap; }
.m-pli-resume .mini-rampe span { width: 8px; height: 12px; }
.m-pli .carte.connexion { margin-bottom: 0; }
.m-pli-bilan { display: flex; flex-wrap: wrap; align-items: center; gap: var(--espace-serre); }
.m-pli-bilan .btn { margin-left: auto; }

.m-sous-onglets { display: grid; gap: 2px; padding: 2px; border: 1px solid var(--bordure); border-radius: 8px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.m-sous-onglet { display: flex; height: 28px; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 6px; background: none; color: var(--texte-second); cursor: pointer; font: inherit; font-weight: 600; white-space: nowrap; }
.m-sous-onglet[aria-selected='true'] { background: color-mix(in srgb, var(--fond-note) 85%, var(--texte)); color: var(--texte); }
.m-sous-onglet[aria-selected='true'] .m-compte { background: var(--fond); }
.m-barre { display: flex; min-height: 24px; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--espace-controle); }
.m-barre .m-phrase { margin-right: auto; }

.m-chemins { overflow: hidden; border: 1px solid var(--bordure); border-radius: 8px; background: color-mix(in srgb, var(--fond) 84%, black); }
.m-chemins-tete { display: flex; justify-content: space-between; gap: var(--espace-controle); padding: var(--espace-controle) var(--espace-bloc); border-bottom: 1px solid var(--bordure); font-weight: 600; }
.m-chemins-tete span + span { color: var(--texte-second); font-weight: 400; }
.m-chemins code { font-size: 11px; }
.m-chemin-cree { display: flex; min-height: 28px; align-items: center; justify-content: space-between; gap: var(--espace-controle); padding: 0 var(--espace-bloc); }
.m-chemin-cree span, .m-noeud span { color: var(--texte-second); font-variant-numeric: tabular-nums; }
.m-nuances { color: var(--texte-second); }
.m-gabarit { display: flex; flex-wrap: wrap; align-items: center; gap: var(--espace-serre) 6px; padding: var(--espace-bloc); }
.m-segment { padding: 2px 6px; border: 1px solid transparent; border-radius: 4px; background: var(--fond-note); }
.m-segment[data-variable] { border: 1px dashed var(--bordure); background: none; color: var(--texte-second); }
.m-exemple { margin: 0; padding: 0 var(--espace-bloc) var(--espace-bloc); color: var(--texte-second); }
.m-noeud { display: flex; min-height: 24px; align-items: center; justify-content: space-between; gap: var(--espace-controle); padding: 0 var(--espace-bloc) 0 calc(var(--espace-bloc) + var(--rang) * 16px); }
.m-noeud:last-child { margin-bottom: var(--espace-serre); }
`;

// ------------------------------------------------------------ outils posés dans la page

/** Ce que chaque transformation emploie dans la page de la galerie. */
function poserLesOutils() {
  // Ce que l'écran cache ne se recopie pas : l'autre onglet, les cartes fermées, les listes vides.
  for (const cache of document.querySelectorAll('[hidden]')) cache.remove();
  const el = (html) => {
    const gabarit = document.createElement('template');
    gabarit.innerHTML = html.trim();
    return gabarit.content.firstElementChild;
  };
  const panneau = document.querySelector('#panneau-gestion');
  window.M = {
    el,
    panneau,
    PHRASE_DU_FICHIER: 'Lues dans les variables du fichier, hors du plugin.',
    PHRASE_DES_BIBLIOTHEQUES: 'Publiées par une bibliothèque activée. Le fichier ne les porte pas.',
    compte: (nombre) => `<span class="m-compte">${nombre}</span>`,
    /** Les blocs de l'onglet, dans son ordre. Les fiches hors du plugin sont rendues séparées : celles du fichier, celles des bibliothèques. */
    parties() {
      const connexion = panneau.querySelector(':scope > .connexion');
      return {
        connexion,
        heure: connexion.querySelector('.carte-tete .ligne-secondaire'),
        synchroniser: connexion.querySelector('.synchroniser'),
        bilan: connexion.querySelector('.connexion-bilan'),
        tete: panneau.querySelector(':scope > .planche-tete'),
        compte: panneau.querySelector('.planche-compte'),
        plugin: panneau.querySelector(':scope > .liste-planche'),
        separation: panneau.querySelector(':scope > .separation'),
        fichier: [...panneau.querySelectorAll('[data-du-fichier]')],
        bibliotheques: [...panneau.querySelectorAll('[data-bibliotheque]')],
        recette: panneau.querySelector(':scope > .carte[aria-label="Palettes et réglages"]'),
      };
    },
    liste(fiches) {
      const liste = el('<div class="liste-planche"></div>');
      liste.append(...fiches);
      return liste;
    },
    /** La rampe d'une fiche hors du plugin, en miniature. */
    miniRampe(fiche) {
      const couleurs = [...fiche.querySelectorAll('.fiche-pastille')].map((pastille) => pastille.style.background || 'transparent');
      return `<span class="mini-rampe">${couleurs.map((couleur) => `<span style="background:${couleur}"></span>`).join('')}</span>`;
    },
    /** Ce que la simulation d'aujourd'hui dit : la collection, le résumé, et le chemin de chaque groupe avec son nombre de nuances. */
    simulation() {
      const simulation = panneau.querySelector('.simulation');
      const deplies = simulation.querySelectorAll('.panneau-ligne').length + Number(simulation.querySelector('.panneau-suite').textContent.match(/\d+/)[0]);
      return {
        element: simulation,
        collection: simulation.querySelector('.panneau-tete span').textContent,
        resume: simulation.querySelector('.simulation-tete .ligne-secondaire').textContent,
        modes: simulation.querySelectorAll('.panneau-tete span').length - 1,
        groupes: [...simulation.querySelectorAll('.panneau-groupe')].map((groupe) => ({
          segments: groupe.querySelector('code').textContent.split(' / '),
          nuances: Number(groupe.querySelector('span')?.textContent ?? deplies),
        })),
      };
    },
    /** La carte de la destination seule : la barre des palettes et leurs fiches sortent du cadre. */
    destinationSeule() {
      for (const bloc of [...panneau.children]) if (!bloc.classList.contains('carte-ouverte')) bloc.remove();
    },
    /** Remplace le panneau de la simulation, et garde son titre et son résumé. */
    poserLaSimulation(simulation, html) {
      simulation.element.querySelector('.panneau').replaceWith(el(html));
    },
  };
}

// ------------------------------------------------------------ les sections de Gestion

/** L'écran d'aujourd'hui, sans retouche. */
function actuel() {}

/**
 * Proposition A : un titre de premier rang par section, son compte, et un
 * filet entre deux sections. Les fiches gardent leur facture.
 */
function titres() {
  const p = M.parties();
  const section = (titre, nombre, phrase, contenu) => {
    const bloc = M.el(`<section class="m-section"><div class="m-section-tete"><h2 class="titre-de-premier-rang">${titre}</h2>${nombre === null ? '' : M.compte(nombre)}</div>${phrase ? `<p class="m-phrase">${phrase}</p>` : ''}</section>`);
    bloc.append(...contenu);
    return bloc;
  };
  const connexion = section('Connexion à Figma', null, '', [p.connexion]);
  const suite = M.el('<span class="m-suite"></span>');
  suite.append(p.heure, p.synchroniser);
  connexion.querySelector('.m-section-tete').append(suite);
  p.connexion.querySelector('.carte-tete').remove();
  p.compte.remove();
  const sections = [
    connexion,
    section('Palettes du plugin', p.plugin.children.length, '', [p.tete, p.plugin]),
    section('Déjà dans le fichier', p.fichier.length, M.PHRASE_DU_FICHIER, [M.liste(p.fichier)]),
    section('Dans les bibliothèques', p.bibliotheques.length, M.PHRASE_DES_BIBLIOTHEQUES, [M.liste(p.bibliotheques)]),
  ];
  M.panneau.replaceChildren(...sections, p.recette);
}

/**
 * Proposition B : chaque section dans un panneau au fond plus sombre que la
 * page. Les palettes hors du plugin ont un panneau en tirets, sans fond.
 */
function panneaux() {
  const p = M.parties();
  const puits = (titre, nombre, ton, phrase, contenu) => {
    const bloc = M.el(`<section class="m-puits" data-ton="${ton}"><div class="m-puits-tete"><h2 class="m-puits-titre">${titre}</h2>${nombre === null ? '' : M.compte(nombre)}</div>${phrase ? `<p class="m-phrase">${phrase}</p>` : ''}</section>`);
    bloc.append(...contenu);
    return bloc;
  };
  const connexion = puits('Connexion à Figma', null, 'plugin', '', [p.connexion]);
  const suite = M.el('<span class="m-suite"></span>');
  suite.append(p.heure, p.synchroniser);
  connexion.querySelector('.m-puits-tete').append(suite);
  p.connexion.querySelector('.carte-tete').remove();
  p.compte.remove();
  const plugin = puits('Palettes du plugin', p.plugin.children.length, 'plugin', '', [p.plugin]);
  const bascules = M.el('<span class="m-suite"></span>');
  bascules.append(...p.tete.children);
  plugin.querySelector('.m-puits-tete').append(bascules);
  M.panneau.replaceChildren(
    connexion,
    plugin,
    puits('Déjà dans le fichier', p.fichier.length, 'externe', M.PHRASE_DU_FICHIER, [M.liste(p.fichier)]),
    puits('Dans les bibliothèques', p.bibliotheques.length, 'externe', M.PHRASE_DES_BIBLIOTHEQUES, [M.liste(p.bibliotheques)]),
    p.recette,
  );
}

/**
 * Proposition C : chaque section se replie. Repliée, sa ligne garde un
 * résumé : la destination et la page pour la connexion, les noms et les
 * rampes pour les palettes hors du plugin. Le bilan des états reste lisible.
 */
function replis() {
  const p = M.parties();
  const pli = (titre, nombre, ouvert, resume, contenu) => {
    const bloc = M.el(`<section class="m-pli" data-ouvert="${ouvert}"><div class="m-pli-tete"><button type="button" class="m-pli-bouton" aria-expanded="${ouvert}"><span class="m-chevron">›</span><span>${titre}</span></button>${nombre === null ? '' : M.compte(nombre)}<span class="m-suite m-pli-resume">${resume}</span></div></section>`);
    bloc.append(...contenu);
    return bloc;
  };
  const chemin = (ligne) => ligne.querySelector('.chemin').innerHTML;
  const [tokens, planches] = p.connexion.querySelectorAll('.connexion-ligne');
  const bilan = M.el('<div class="m-pli-bilan"></div>');
  bilan.append(...p.bilan.children);
  const connexion = pli('Connexion à Figma', null, false, `<span class="chemin">${chemin(tokens)}</span><span>·</span><span class="chemin">${chemin(planches)}</span>`, [bilan]);
  p.compte.remove();
  const bascules = M.el('<div class="m-barre"></div>');
  bascules.append(...p.tete.children);
  const plugin = pli('Palettes du plugin', p.plugin.children.length, true, '', [bascules, p.plugin]);
  const resume = (fiches) => fiches.map((fiche) => `${M.miniRampe(fiche)}<span>${fiche.getAttribute('aria-label')}</span>`).join('');
  const recette = pli('Palettes et réglages', null, false, 'Importer, exporter, rapport', []);
  M.panneau.replaceChildren(
    connexion,
    plugin,
    pli('Déjà dans le fichier', p.fichier.length, false, resume(p.fichier), []),
    pli('Dans les bibliothèques', p.bibliotheques.length, false, p.bibliotheques.map((fiche) => `<span>${fiche.getAttribute('aria-label')}</span>`).join(''), []),
    recette,
  );
}

/**
 * Proposition D : la connexion reste en tête, puis trois sous-onglets, un
 * par origine. Une seule liste se lit à la fois ; `choisi` nomme laquelle.
 */
function sousOnglets(choisi) {
  const p = M.parties();
  const origines = [
    ['plugin', 'Du plugin', p.plugin.children.length],
    ['fichier', 'Du fichier', p.fichier.length],
    ['bibliotheques', 'Des bibliothèques', p.bibliotheques.length],
  ];
  const onglets = M.el(`<div class="m-sous-onglets" role="tablist" aria-label="Origine des palettes">${origines.map(([code, nom, nombre]) => `<button type="button" class="m-sous-onglet" role="tab" aria-selected="${code === choisi}">${nom}${M.compte(nombre)}</button>`).join('')}</div>`);
  const barre = M.el('<div class="m-barre"></div>');
  p.compte.remove();
  if (choisi === 'plugin') barre.append(...p.tete.children);
  else barre.append(M.el(`<p class="m-phrase">${choisi === 'fichier' ? M.PHRASE_DU_FICHIER : M.PHRASE_DES_BIBLIOTHEQUES}</p>`));
  const liste = choisi === 'plugin' ? p.plugin : M.liste(choisi === 'fichier' ? p.fichier : p.bibliotheques);
  M.panneau.replaceChildren(p.connexion, onglets, barre, liste, p.recette);
}

// ------------------------------------------------------------ le fichier sans variables

/**
 * Un fichier sans variable locale, avec une bibliothèque activée. Les trois
 * palettes du plugin n'ont pas encore de tokens : leurs lignes reprennent
 * celles d'Ardoise. `propose` range la palette de la bibliothèque sous son
 * propre titre ; sinon elle reste sous « Déjà dans le fichier », comme
 * aujourd'hui.
 */
function sansVariables(propose) {
  const p = M.parties();
  for (const fiche of p.fichier) fiche.remove();
  const fiches = [...p.plugin.children];
  const modele = fiches.at(-1);
  for (const fiche of fiches.slice(0, -1)) {
    fiche.querySelector('.tete-gestes .pastille-d-etat').replaceWith(modele.querySelector('.tete-gestes .pastille-d-etat').cloneNode(true));
    fiche.querySelector('.sortie').replaceWith(modele.querySelector('.sortie').cloneNode(true));
  }
  const comptes = p.bilan.querySelector('.connexion-comptes');
  const pasEncore = modele.querySelector('.tete-gestes .pastille-d-etat').cloneNode(true);
  pasEncore.textContent = `${fiches.length} pas encore sur Figma`;
  comptes.replaceChildren(pasEncore);
  p.bilan.querySelector('.btn span').textContent = `Tout mettre à jour (${fiches.length})`;
  p.separation.querySelector('.titre-de-section').textContent = propose ? `Dans les bibliothèques · ${p.bibliotheques.length}` : `Déjà dans le fichier · ${p.bibliotheques.length}`;
  if (propose) p.separation.querySelector('p').textContent = M.PHRASE_DES_BIBLIOTHEQUES;
}

// ------------------------------------------------------------ la simulation

/** La carte de la destination d'aujourd'hui, seule dans son cadre. */
function destinationActuelle() {
  M.destinationSeule();
}

/** Les modes de la collection, écrits à droite de son nom quand les thèmes sont en modes. */
const MODES_ECRITS = 'modes Light, Dark';

/** Proposition S-A : un chemin par ligne, de la première à la dernière nuance, sans valeur. */
function simulationEnListe(modesEcrits) {
  M.destinationSeule();
  const simulation = M.simulation();
  const lignes = simulation.groupes.map(({ segments, nuances }) => `<div class="m-chemin-cree"><code>${segments.join(' / ')} / <span class="m-nuances">50 … 950</span></code><span>${nuances}</span></div>`).join('');
  M.poserLaSimulation(simulation, `<div class="m-chemins"><div class="m-chemins-tete"><span>${simulation.collection}</span><span>${simulation.modes > 1 ? modesEcrits : ''}</span></div>${lignes}</div>`);
}

/**
 * Proposition S-B : une seule ligne, le gabarit du chemin. Un segment fixe
 * est plein ; un segment qui change d'une variable à l'autre est en tirets
 * et liste ses valeurs. Dessous, un exemple.
 */
function simulationEnGabarit(modesEcrits) {
  M.destinationSeule();
  const simulation = M.simulation();
  const chemins = simulation.groupes.map((groupe) => groupe.segments);
  // Le segment de la palette suit le groupe : il change d'une palette à l'autre, pas d'un groupe à l'autre.
  const rangDeLaPalette = chemins[0].findIndex((_, rang) => new Set(chemins.map((chemin) => chemin[rang])).size > 1) - 1;
  const segments = chemins[0].map((segment, rang) => {
    const valeurs = [...new Set(chemins.map((chemin) => chemin[rang]))];
    if (rang === rangDeLaPalette) return '<code class="m-segment" data-variable>palette</code>';
    return valeurs.length > 1 ? `<code class="m-segment" data-variable>${valeurs.join(' · ')}</code>` : `<code class="m-segment">${segment}</code>`;
  });
  segments.push('<code class="m-segment" data-variable>50 … 950</code>');
  const exemple = [...chemins.at(-1), '600'].join(' / ');
  M.poserLaSimulation(simulation, `<div class="m-chemins"><div class="m-chemins-tete"><span>${simulation.collection}</span><span>${simulation.modes > 1 ? modesEcrits : ''}</span></div><div class="m-gabarit">${segments.join('<span class="m-nuances">/</span>')}</div><p class="m-exemple">Par exemple <code>${exemple}</code></p></div>`);
}

/** Proposition S-C : l'arborescence des groupes, un segment par ligne, le nombre de variables au bout de chaque branche. */
function simulationEnArbre(modesEcrits) {
  M.destinationSeule();
  const simulation = M.simulation();
  const lignes = [];
  let precedent = [];
  for (const { segments, nuances } of simulation.groupes) {
    segments.forEach((segment, rang) => {
      if (precedent.slice(0, rang + 1).join('/') === segments.slice(0, rang + 1).join('/')) return;
      const feuille = rang === segments.length - 1;
      lignes.push(`<div class="m-noeud" style="--rang:${rang}"><code>${segment}</code>${feuille ? `<span>50 … 950 · ${nuances}</span>` : ''}</div>`);
    });
    precedent = segments;
  }
  M.poserLaSimulation(simulation, `<div class="m-chemins"><div class="m-chemins-tete"><span>${simulation.collection}</span><span>${simulation.modes > 1 ? modesEcrits : ''}</span></div>${lignes.join('')}</div>`);
}

// ------------------------------------------------------------ les maquettes

const EN_CHEMIN = { etat: 'destination-ouverte', legende: 'Thèmes dans le chemin', argument: MODES_ECRITS };
const EN_MODES = { etat: 'destination-en-modes', legende: 'Thèmes en modes', argument: MODES_ECRITS };

const PARTIES = [
  {
    id: 'sections',
    titre: '1. Les sections de l’onglet Gestion',
    texte: [
      'L’onglet porte trois sections : la connexion à Figma et son bilan, les palettes du plugin, les palettes déjà dans le fichier. Aujourd’hui, leurs titres ont le poids d’un titre de carte, 12 px en gras : ils ne se distinguent pas du nom d’une palette.',
      'Les quatre propositions rangent aussi les palettes de bibliothèque sous leur propre titre, comme la partie 2 le demande.',
      '<strong>Recommandation : C.</strong> Les deux listes hors du plugin tiennent chacune sur une ligne tant que le designer ne les ouvre pas, et les palettes du plugin remontent sous le bilan. A demande le moins de code : elle garde l’écran d’aujourd’hui et change trois titres.',
    ],
    maquettes: [
      {
        id: 'G0',
        titre: 'Aujourd’hui',
        cadres: [{ etat: 'bibliotheques', transformer: actuel }],
        notes: [['Constat', [
          '« Connexion à Figma », « Palettes du plugin · 3 » et « Déjà dans le fichier · 3 » ont la taille et la graisse de « Bleu », « Jaune » et « slate ».',
          'La carte de la connexion a la bordure et le rayon d’une fiche de palette.',
          'Un filet sépare « Déjà dans le fichier » des fiches du plugin. Aucun filet ne sépare la connexion des palettes du plugin.',
        ]]],
      },
      {
        id: 'GA',
        titre: 'Proposition A · Titres de premier rang',
        cadres: [{ etat: 'bibliotheques', transformer: titres }],
        notes: [
          ['Ce qui change', [
            'Chaque section a un titre de premier rang, 16 px, celui de « Palette [nom] » dans Création. Son compte suit dans une pastille grise.',
            'Un filet et 28 px séparent deux sections.',
            '« Synchronisé… » et « Synchroniser » montent sur la ligne du titre. Les bascules de vue et de thème ont leur ligne, sous le titre.',
          ]],
          ['Coût', ['`ongletGestion.ts`, `connexion.ts` et `styles.css`. Aucun comportement ne change.']],
          ['Limite', ['La page s’allonge de 60 px. Les trois listes restent toutes dépliées.']],
        ],
      },
      {
        id: 'GB',
        titre: 'Proposition B · Panneaux',
        cadres: [{ etat: 'bibliotheques', transformer: panneaux }],
        notes: [
          ['Ce qui change', [
            'Chaque section est un panneau au fond plus sombre que la page. Son titre, son compte et ses gestes sont sur sa première ligne.',
            'La connexion perd sa bordure de carte : ses lignes sont posées dans le panneau.',
            'Les palettes hors du plugin ont un panneau en tirets, sans fond. Leurs fiches reprennent une bordure pleine.',
          ]],
          ['Coût', ['`ongletGestion.ts`, `connexion.ts` et `styles.css`. Aucun comportement ne change.']],
          ['Limite', [
            'Chaque fiche perd 16 px de largeur.',
            'CONTRIBUTING.md limite les surfaces : un panneau qui contient des cartes ajoute un niveau de surface.',
          ]],
        ],
      },
      {
        id: 'GC',
        titre: 'Proposition C · Sections repliables',
        cadres: [{ etat: 'bibliotheques', transformer: replis }],
        notes: [
          ['Ce qui change', [
            'Chaque section a un en-tête à chevron, comme les cartes repliables de Création.',
            'La connexion est repliée : sa ligne dit la destination des tokens et la page des planches. Le bilan des états et « Tout mettre à jour » restent sous elle. Dépliée, elle montre les deux lignes « Tokens » et « Planches », leurs « Changer » et « Synchroniser ».',
            '« Déjà dans le fichier » et « Dans les bibliothèques » sont repliées à l’ouverture : leur ligne montre la rampe et le nom de chaque palette.',
            '« Palettes et réglages » prend le même en-tête.',
          ]],
          ['Coût', ['`ongletGestion.ts`, `connexion.ts`, `styles.css`, et l’état replié de chaque section à ranger dans `preferences.ts`.']],
          ['Limite', ['« Modifier dans le plugin » et « Changer » demandent un clic de plus.']],
        ],
      },
      {
        id: 'GD',
        titre: 'Proposition D · Sous-onglets par origine',
        cadres: [
          { etat: 'bibliotheques', transformer: sousOnglets, argument: 'plugin', legende: '« Du plugin » choisi' },
          { etat: 'bibliotheques', transformer: sousOnglets, argument: 'fichier', legende: '« Du fichier » choisi' },
        ],
        notes: [
          ['Ce qui change', [
            'Sous la connexion, trois sous-onglets : « Du plugin », « Du fichier », « Des bibliothèques », chacun avec son compte. Une seule liste se lit à la fois.',
            'Les bascules de vue et de thème ne paraissent que sous « Du plugin ».',
            'Un sous-onglet dont le compte est à zéro ne paraît pas. Sans palette hors du plugin, la rangée entière disparaît.',
          ]],
          ['Coût', ['`ongletGestion.ts`, `styles.css`, le sous-onglet choisi dans `preferences.ts`, et le tableau de la vue condensée, qui ne liste plus que les palettes du plugin.']],
          ['Limite', ['Deux rangées d’onglets se suivent : Création, Vérification, Gestion, puis les origines.']],
        ],
      },
    ],
  },
  {
    id: 'sans-variables',
    titre: '2. Un fichier sans variables',
    texte: [
      'Aujourd’hui, `ongletGestion.ts` additionne les palettes des variables du fichier et celles des bibliothèques activées sous « Déjà dans le fichier ». Dans un fichier sans variable, une bibliothèque activée suffit à faire paraître ce titre, sa phrase « Lues dans les variables du fichier » et une fiche.',
      'Proposé : « Déjà dans le fichier » ne compte que les palettes des variables locales, et ne paraît pas quand il n’y en a aucune. Les palettes de bibliothèque ont leur titre, « Dans les bibliothèques », et leur phrase.',
    ],
    maquettes: [
      {
        id: 'F1',
        titre: 'Fichier sans variable, une bibliothèque activée',
        cadres: [
          { etat: 'bibliotheques', transformer: sansVariables, argument: false, legende: 'Aujourd’hui' },
          { etat: 'bibliotheques', transformer: sansVariables, argument: true, legende: 'Proposé' },
        ],
        notes: [
          ['Ce qui change', [
            'Le titre dit l’origine de la palette : « Dans les bibliothèques · 1 ».',
            'La phrase dit que le fichier ne porte pas ces palettes.',
            'Sans bibliothèque activée, rien ne suit les fiches du plugin : ni filet, ni titre.',
          ]],
          ['Coût', ['`ongletGestion.ts` : un second titre et une seconde liste, chacun caché quand son compte est à zéro. Deux textes dans `fr.ts` et `en.ts`.']],
          ['À trancher', ['Le lien de l’onglet Création, « Ce fichier porte déjà N palettes dans ses variables », compte-t-il les palettes de bibliothèque ? Proposé : non.']],
        ],
      },
    ],
  },
  {
    id: 'simulation',
    titre: '3. La simulation de la destination',
    texte: [
      'Aujourd’hui, la simulation imite le panneau des variables de Figma : une colonne de valeurs, trois nuances dépliées avec leur couleur et leur code, « 8 autres nuances », puis trois groupes repliés avec leur compte.',
      'Les trois propositions retirent les couleurs et les valeurs. Il reste la collection, les chemins créés, et le nombre de variables.',
      '<strong>Recommandation : S-A.</strong> Chaque ligne est un chemin tel que Figma l’écrira, et la bascule « Dans le chemin · En modes » change le nombre de lignes de quatre à deux. S-B est plus courte, et vaut pour toutes les palettes à la fois.',
    ],
    maquettes: [
      {
        id: 'S0',
        titre: 'Aujourd’hui',
        cadres: [{ ...EN_CHEMIN, transformer: destinationActuelle }],
        notes: [['Constat', [
          'Le designer lit cinq formes de ligne : en-tête de colonnes, groupe déplié, nuance avec sa valeur, « 8 autres nuances », groupe replié avec son compte.',
          'Les couleurs ne dépendent pas de la destination : elles ne répondent pas à la question de la carte.',
        ]]],
      },
      {
        id: 'SA',
        titre: 'Proposition S-A · Un chemin par ligne',
        cadres: [{ ...EN_CHEMIN, transformer: simulationEnListe }, { ...EN_MODES, transformer: simulationEnListe }],
        notes: [
          ['Ce qui change', [
            'Une ligne par groupe créé : son chemin, de la première à la dernière nuance, puis son nombre de variables.',
            'En modes, les modes de la collection suivent son nom : « modes Light, Dark ».',
          ]],
          ['Coût', ['`destination.ts` et `styles.css`. `simulationDeLaDestination` rend déjà les chemins et les nuances.']],
          ['Limite', ['La simulation ne montre que la première palette de la recette, comme aujourd’hui.']],
        ],
      },
      {
        id: 'SB',
        titre: 'Proposition S-B · Le gabarit du chemin',
        cadres: [{ ...EN_CHEMIN, transformer: simulationEnGabarit }, { ...EN_MODES, transformer: simulationEnGabarit }],
        notes: [
          ['Ce qui change', [
            'Une seule ligne. Un segment fixe est plein : le groupe saisi. Un segment en tirets change d’une variable à l’autre et liste ses valeurs.',
            'Le segment « palette » vaut pour toutes les palettes de la recette.',
            'Dessous, un chemin en exemple.',
          ]],
          ['Coût', ['`destination.ts`, `styles.css`, et dans `gestion.ts` les valeurs de chaque segment.']],
          ['Limite', ['Le designer doit lire la convention des tirets. Le nombre de variables par groupe ne se lit plus.']],
        ],
      },
      {
        id: 'SC',
        titre: 'Proposition S-C · L’arborescence',
        cadres: [{ ...EN_CHEMIN, transformer: simulationEnArbre }, { ...EN_MODES, transformer: simulationEnArbre }],
        notes: [
          ['Ce qui change', [
            'Un segment par ligne, en retrait sous son parent, comme la colonne des groupes du panneau des variables de Figma.',
            'Le bout de chaque branche porte ses nuances et son nombre de variables.',
          ]],
          ['Coût', ['`destination.ts` et `styles.css`.']],
          ['Limite', ['Neuf lignes pour quatre groupes. Le chemin entier ne se lit sur aucune ligne.']],
        ],
      },
    ],
  },
];

// ------------------------------------------------------------ la page

/** Un texte posé dans un `<script type="text/plain">` : seule sa balise fermante se neutralise, et la page la rétablit. */
const enTexte = (texte) => texte.replace(/<\/script/gi, '<\\/script');

/** Les accents graves d'une note entourent un nom de fichier ou de fonction. */
const enHtml = (texte) => texte.replace(/`([^`]+)`/g, '<code>$1</code>');

/** La feuille de la page de galerie, variables du thème de Figma comprises : la même pour chaque état. */
let feuilleDuPlugin = '';

async function rendreLeCadre(navigateur, cadre) {
  const page = await navigateur.newPage({ viewport: { width: LARGEUR, height: 720 } });
  await page.goto(pathToFileURL(path.join(DIST, 'galerie', THEME, `${cadre.etat}.html`)).href);
  await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  await page.evaluate(poserLesOutils);
  await page.evaluate(cadre.transformer, cadre.argument);
  feuilleDuPlugin ||= await page.evaluate(() => [...document.querySelectorAll('style')].map((style) => style.textContent).join('\n'));
  const { corps, hauteur } = await page.evaluate(() => {
    for (const script of document.querySelectorAll('script')) script.remove();
    for (const banc of document.querySelectorAll('.resize-grip, .largeur-fenetre')) banc.remove();
    // Une valeur saisie vit dans la propriété du champ : l'attribut la porte dans la copie.
    for (const champ of document.querySelectorAll('input')) {
      champ.setAttribute('value', champ.value);
      if (champ.checked) champ.setAttribute('checked', '');
    }
    for (const cache of document.querySelectorAll('[hidden]')) cache.remove();
    // Le cadre prend la hauteur de son contenu : deux propositions se comparent sans défiler.
    const dernier = document.querySelector('#panneau-gestion').lastElementChild;
    return { corps: document.body.innerHTML, hauteur: Math.ceil(dernier.getBoundingClientRect().bottom + window.scrollY) + 20 };
  });
  await page.close();
  const legende = cadre.legende ? `<figcaption>${cadre.legende}</figcaption>` : '';
  return `<figure class="cadre">${legende}<iframe title="${cadre.legende ?? cadre.etat}" width="${LARGEUR}" height="${hauteur}"></iframe><script type="text/plain" class="corps">${enTexte(corps)}</script></figure>`;
}

async function rendreLaMaquette(navigateur, maquette) {
  const cadres = [];
  for (const cadre of maquette.cadres) cadres.push(await rendreLeCadre(navigateur, cadre));
  const notes = maquette.notes.map(([titre, lignes]) => `<h4>${titre}</h4><ul>${lignes.map((ligne) => `<li>${enHtml(ligne)}</li>`).join('')}</ul>`).join('');
  return `<section class="maquette" id="${maquette.id}"><h3>${maquette.titre}</h3><div class="rangee"><div class="cadres">${cadres.join('')}</div><div class="notes">${notes}</div></div></section>`;
}

const navigateur = await chromium.launch();
const parties = [];
let cadres = 0;
for (const partie of PARTIES) {
  const maquettes = [];
  for (const maquette of partie.maquettes) {
    maquettes.push(await rendreLaMaquette(navigateur, maquette));
    cadres += maquette.cadres.length;
  }
  const liens = partie.maquettes.map((maquette) => `<a href="#${maquette.id}">${maquette.titre}</a>`).join('');
  parties.push(`<h2 class="partie" id="${partie.id}">${partie.titre}</h2>${partie.texte.map((ligne) => `<p>${enHtml(ligne)}</p>`).join('')}<nav>${liens}</nav>${maquettes.join('\n')}`);
}
await navigateur.close();

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UCM Palettes : maquettes de la recette de la direction simple</title>
<style>
  body { max-width: 1120px; margin: 0 auto; padding: 32px 24px 80px; background: #17181c; color: #e5e7eb; font: 14px/1.5 system-ui, sans-serif; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  h2.partie { margin: 64px 0 12px; padding-top: 24px; border-top: 1px solid #3f4350; font-size: 21px; }
  h3 { margin: 48px 0 12px; font-size: 18px; }
  h4 { margin: 0 0 4px; color: #9ca3af; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; }
  p { max-width: 820px; }
  a { color: #7cc4ff; }
  code { padding: 1px 4px; border-radius: 4px; background: #2a2d35; font-size: 12px; }
  nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  nav a { padding: 4px 10px; border: 1px solid #3f4350; border-radius: 14px; background: #23252b; text-decoration: none; }
  .rangee { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 24px; }
  .cadres { display: grid; flex: none; gap: 24px; }
  .cadre { margin: 0; }
  figcaption { margin-bottom: 6px; color: #9ca3af; font-weight: 600; }
  iframe { display: block; border: 1px solid #4b5060; border-radius: 8px; background: #2c2c2c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
  .notes { min-width: 260px; flex: 1 1 260px; position: sticky; top: 16px; }
  .notes ul { margin: 0 0 20px; padding-left: 18px; }
  .notes li { margin-bottom: 6px; }
  .legende { color: #9ca3af; }
</style>
</head>
<body>
<h1>UCM Palettes : maquettes de la recette de la direction simple</h1>
<p>Trois retours de la recette de l’onglet Gestion : les sections se distinguent mal, « Déjà dans le fichier » paraît dans un fichier sans variable, la simulation de la destination est trop chargée. Chaque partie montre l’écran d’aujourd’hui, puis ses propositions.</p>
<p class="legende">Chaque cadre fait 560 px de large, en thème sombre, à la hauteur de son contenu. Il est statique : aucun bouton ne répond. Les écrans partent du plugin construit ; ce qu’une proposition ajoute n’existe pas dans le code.</p>
<nav>${PARTIES.map((partie) => `<a href="#${partie.id}">${partie.titre}</a>`).join('')}</nav>
${parties.join('\n')}
<script type="text/plain" id="feuille">${enTexte(`${feuilleDuPlugin}\n${STYLES_DES_MAQUETTES}`)}</script>
<script>
  // La feuille du plugin n'est écrite qu'une fois : chaque cadre la reçoit avec son balisage.
  const retablir = (texte) => texte.replace(/<\\\\\\/script/gi, '</' + 'script');
  const feuille = retablir(document.getElementById('feuille').textContent);
  for (const cadre of document.querySelectorAll('.cadre')) {
    const corps = retablir(cadre.querySelector('.corps').textContent);
    const fenetre = cadre.querySelector('iframe');
    // La hauteur mesurée à la génération est reprise sur le contenu rendu : aucun cadre ne défile.
    fenetre.addEventListener('load', () => { fenetre.height = fenetre.contentDocument.documentElement.scrollHeight; });
    fenetre.srcdoc = '<!doctype html><html lang="fr" class="${CLASSE_DU_THEME}"><head><meta charset="utf-8"><style>' + feuille + '</style></head><body>' + corps + '</body></html>';
  }
</script>
</body>
</html>
`;
writeFileSync(path.join(ICI, 'MAQUETTES-RECETTE-DIRECTION-SIMPLE.html'), page);
console.log(`MAQUETTES-RECETTE-DIRECTION-SIMPLE.html : ${cadres} cadres, ${Math.round(page.length / 1024)} ko`);
