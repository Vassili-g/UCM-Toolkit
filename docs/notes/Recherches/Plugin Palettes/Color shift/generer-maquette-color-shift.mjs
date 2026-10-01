#!/usr/bin/env node
/**
 * Écrit MAQUETTE-COLOR-SHIFT.html à côté de ce script, depuis la racine du
 * dépôt :
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/Color shift/generer-maquette-color-shift.mjs"
 *
 * La page embarque le moteur du dépôt, lié par esbuild, et le texte des
 * fonctions de `modele-color-shift.mjs` : couleurs, garanties et limites y
 * sortent du même code que la mesure. Les cartes de la maquette suivent les
 * rôles de couleur du socle des plugins. La planche des glyphes se dessine
 * depuis `GLYPHES`, les formes que le plugin pose sur ses cartes.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GLYPHES } from '../../../../../packages/plugin-palettes/src/ui/glyphes.ts';
import {
  ECART_MINIMAL,
  GRANDEURS,
  decalageNul,
  decalagesAvec,
  libelleDuMembre,
  limiteDe,
  ordreTenu,
  poidsA,
  promessesDecalees,
  rampeDecalee,
  rampesDecalees,
} from './modele-color-shift.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '../../../../../');

const FONCTIONS_DU_MODELE = [decalageNul, poidsA, rampeDecalee, rampesDecalees, libelleDuMembre, promessesDecalees, ordreTenu, decalagesAvec, limiteDe];

const REFERENCES = [
  { nom: 'Bleu', hexa: '#1E6FD9' },
  { nom: 'Vert', hexa: '#16A34A' },
  { nom: 'Rouge', hexa: '#DC2626' },
  { nom: 'Jaune', hexa: '#EAB308' },
  { nom: 'Sauge', hexa: '#A0B599' },
  { nom: 'Gris', hexa: '#808080' },
];

/** Les décisions retenues sur la première maquette, et celles qui restent ouvertes. */
const DECISIONS = [
  ['Q1', 'Nom', '« Color shift » en anglais et en français.'],
  ['Q2', 'Choix de la grandeur', 'Onglets et graphe.'],
  ['Q3', 'Bouts', '« Nuances claires » et « Nuances sombres », lues sur la luminosité.'],
  ['Q4', 'Saturation', 'Relative, de −100 % à +100 % de celle du profil.'],
  ['Q5', 'Préréglage', 'Tailwind règle la teinte seule ; aucun préréglage pour la saturation et la luminosité.'],
  ['Q7', 'Palette grise', 'Luminosité réglable, teinte et saturation désactivées.'],
  ['Q8', 'Carte globale', '« Réglage global », sous-titré « Teinte, saturation et luminosité de toute la rampe ».'],
  ['Q6', 'Limites du réglage global', 'Ses curseurs prennent la même limite que le Color shift. L’essai 4 montre ce qu’ils peuvent casser sans elle.'],
  ['Q9', 'Avertissements', 'Ligne fixe, pied de fenêtre et volet superposé. Les essais 5 et 6 font le même geste dans les deux mises en page.'],
  ['Q10', 'Glyphes', 'Chaque carte titrée reçoit un glyphe dans le style des deux cartes d’ajustement.'],
];
const OUVERTES = [];

/** Les cartes titrées et leur glyphe, dans l'ordre de leurs onglets ([UI-19]). */
const CARTES_DES_GLYPHES = [
  ['Onglet Création', [['configuration', 'Configuration de la palette'], ['reglageGlobal', 'Réglage global'], ['colorShift', 'Color shift'], ['garanties', 'Garanties de contraste'], ['interfaceDeTest', 'Interface de test'], ['creation', 'Nouvelle palette']]],
  ['Réglages communs', [['fonds', 'Couleurs de fond'], ['intensites', 'Intensités'], ['courbes', 'Luminosité des nuances'], ['minimums', 'Minimums des promesses'], ['proches', 'Détection des couleurs proches'], ['contenu', 'Contenu des planches']]],
  ['Onglet Palettes', [['palettesEtReglages', 'Palettes et réglages']]],
];

/** Le SVG d'un glyphe, avec les classes de rôle que la feuille du plugin peint. */
function svgDuGlyphe(nom) {
  const formes = GLYPHES[nom].map(({ element, attributs, role }) => {
    const valeurs = Object.entries(attributs).map(([cle, valeur]) => `${cle}="${valeur}"`).join(' ');
    return `<${element} ${valeurs} class="glyphe-${role}"/>`;
  });
  return `<svg viewBox="0 0 44 28" class="glyphe" aria-hidden="true">${formes.join('')}</svg>`;
}

/** La planche des glyphes, dans un thème de Figma : chaque carte, son glyphe et son titre. */
function plancheDesGlyphes(sombre) {
  const groupes = CARTES_DES_GLYPHES.map(([onglet, cartes]) => `<h3>${onglet}</h3><ul>${cartes
    .map(([nom, titre]) => `<li>${svgDuGlyphe(nom)}<span class="carte-titre">${titre}</span><span class="nom-du-glyphe">${nom}</span></li>`).join('')}</ul>`);
  return `<div class="planche-glyphes${sombre ? ' figma-dark' : ''}" aria-label="Glyphes, thème ${sombre ? 'sombre' : 'clair'} de Figma"><h2>Thème ${sombre ? 'sombre' : 'clair'} de Figma</h2>${groupes.join('')}</div>`;
}

// ------------------------------------------------------------ l'application

/**
 * L'application de la page. Elle ne lit que le moteur `M`, les fonctions du
 * modèle et les constantes injectées avant elle.
 */
function application(M) {
  const BOUTS = ['clair', 'sombre'];
  const LISTE_DES_GRANDEURS = ['teinte', 'saturation', 'clarte'];
  const NOM_DE_GRANDEUR = { teinte: 'Teinte', saturation: 'Saturation', clarte: 'Luminosité' };
  const NOM_DU_BOUT = { clair: 'Nuances claires', sombre: 'Nuances sombres' };
  const NOM_DU_PROFIL = { soft: 'Soft', vivid: 'Vivid', unique: 'Palette' };
  const NOM_DU_MODE = { light: 'Light', dark: 'Dark' };
  const ECHELLES = { teinte: [30, 45, 60, 90], saturation: [0.25, 0.5, 1], clarte: [0.05, 0.1, 0.15] };
  const recetteVide = M.recetteParDefaut();

  const etat = {
    reference: REFERENCES[0].hexa,
    intensites: 2,
    miseEnPage: 'stable',
    figmaSombre: false,
    mode: 'light',
    grandeur: 'teinte',
    lien: true,
    profil: 'vivid',
    cibleGlobale: 'deux',
    globalOuvert: false,
    shiftOuvert: true,
    voletOuvert: false,
    recette: null,
    palette: null,
    decalages: null,
    limites: {},
    derniereButee: null,
  };
  const stable = () => etat.miseEnPage === 'stable';

  // ---------------------------------------------------------- écriture

  const virgule = (x, n) => x.toFixed(n).replace('.', ',');
  function signe(x, n) {
    const arrondi = Number(x.toFixed(n));
    if (arrondi === 0) return virgule(0, n);
    return `${arrondi > 0 ? '+' : '−'}${virgule(Math.abs(arrondi), n)}`;
  }
  function ecrireValeur(grandeur, valeur) {
    if (grandeur === 'teinte') return `${signe(valeur, Math.abs(valeur - Math.round(valeur)) > 0.04 ? 1 : 0)}°`;
    if (grandeur === 'saturation') return `${signe(valeur * 100, 0)} %`;
    return signe(valeur, 3);
  }
  const ecrireContraste = (x) => virgule(Math.floor(x * 100) / 100, 2);
  const echapper = (texte) => String(texte).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  function texteDePromesse(p) {
    return `${p.libelle} (${NOM_DU_PROFIL[p.intensite]}, ${NOM_DU_MODE[p.mode]}) : ${ecrireContraste(p.contraste)}:1, sous ${virgule(p.seuil, 1)}:1`;
  }
  function texteDAlerte(alerte) {
    if (alerte.code === 'profils-confondus') return `Soft et Vivid se confondent sur ${pluriel(alerte.crans.length, 'nuance')}`;
    if (alerte.code === 'reference-plus-terne') return `La référence est plus terne que Soft (${Math.round(alerte.part * 100)} % contre ${Math.round(alerte.partSoft * 100)} %)`;
    if (alerte.code === 'reference-plus-vive') return `La référence est plus vive que Vivid (${Math.round(alerte.part * 100)} % contre ${Math.round(alerte.partVivid * 100)} %)`;
    return alerte.code;
  }

  // ---------------------------------------------------------- modèle

  const une = () => etat.intensites === 1;
  const porteur = () => M.ancrageDe(etat.recette, etat.palette).profil;
  /** L'intensité que le Color shift montre et règle. */
  const intensiteEditee = () => (une() ? 'unique' : etat.lien ? porteur() : etat.profil);
  const cleEditee = () => (une() ? 'vivid' : intensiteEditee());
  const cibles = () => (une() ? ['vivid'] : etat.lien ? ['soft', 'vivid'] : [etat.profil]);
  const valeur = (grandeur, bout) => etat.decalages[cleEditee()][grandeur][bout];
  const grise = () => M.estPaletteGrise(etat.recette, etat.palette);
  const tailwind = () => M.prereglageDe(etat.recette, etat.palette);

  function segments() {
    const pivot = M.pivotDe(etat.recette, etat.palette, intensiteEditee());
    const bouts = M.boutsDe(etat.recette);
    return { clair: pivot.L <= bouts.clair, sombre: pivot.L >= bouts.sombre };
  }

  function grandeurActive(grandeur) {
    return grandeur === 'clarte' || !grise();
  }

  function nouvellePalette() {
    const palette = M.nouvellePalette(recetteVide, 'p-00000001', etat.reference, etat.intensites);
    etat.palette = palette;
    etat.recette = M.ajouter(recetteVide, palette);
    const derive = M.prereglageDe(etat.recette, palette);
    const de = () => ({ ...decalageNul(), teinte: { clair: derive.clair, sombre: derive.sombre } });
    etat.decalages = { soft: de(), vivid: de() };
    etat.derniereButee = null;
  }

  function origine() {
    const t = etat.decalages[cleEditee()].teinte;
    const tw = tailwind();
    if (Math.abs(t.clair - tw.clair) < 0.005 && Math.abs(t.sombre - tw.sombre) < 0.005) return 'tailwind';
    if (t.clair === 0 && t.sombre === 0) return 'constante';
    return 'libre';
  }

  function calculerLimites() {
    const grandeur = etat.grandeur;
    etat.limites = { [grandeur]: {} };
    for (const bout of BOUTS) {
      etat.limites[grandeur][bout] = limiteDe(M, etat.recette, etat.palette, etat.decalages, cibles(), grandeur, bout);
    }
  }

  /** Pose une valeur sur les cibles, bornée par la limite ; `fin` recalcule les limites. */
  function poser(grandeur, bout, voulue, fin) {
    const limite = etat.limites[grandeur]?.[bout];
    let bornee = voulue;
    let butee = null;
    if (limite) {
      if (voulue <= limite.bas.borne + 1e-9) {
        bornee = limite.bas.borne;
        if (limite.bas.cause && voulue < limite.bas.borne - 1e-9) butee = { grandeur, bout, ...limite.bas };
      } else if (voulue >= limite.haut.borne - 1e-9) {
        bornee = limite.haut.borne;
        if (limite.haut.cause && voulue > limite.haut.borne + 1e-9) butee = { grandeur, bout, ...limite.haut };
      }
    }
    etat.decalages = decalagesAvec(etat.decalages, cibles(), grandeur, bout, bornee);
    if (butee) etat.derniereButee = butee;
    else if (etat.derniereButee?.grandeur === grandeur && etat.derniereButee?.bout === bout) etat.derniereButee = null;
    if (fin) calculerLimites();
    actualiser();
  }

  function reglerGlobal(grandeur, valeurVoulue, fin) {
    const fonction = { teinte: M.reglerTeinte, saturation: M.reglerSaturation, clarte: M.reglerClarte }[grandeur];
    etat.palette = fonction(etat.recette, etat.palette, une() ? 'vivid' : etat.cibleGlobale, valeurVoulue);
    etat.recette = M.remplacerPalette(etat.recette, etat.palette);
    if (fin) calculerLimites();
    actualiser();
  }

  function valeurGlobale(grandeur) {
    const cle = une() ? 'vivid' : etat.cibleGlobale === 'deux' ? M.cleDuPorteur(etat.recette, etat.palette) : etat.cibleGlobale;
    if (grandeur === 'saturation') return M.partsDe(etat.recette, etat.palette)[une() ? 'unique' : cle];
    return etat.palette.reglages?.[grandeur]?.[cle] ?? 0;
  }

  /**
   * L'état de la carte globale, écrit sur une seule ligne : un réglage qui
   * déplacera la référence, une référence déjà déplacée, ou un réglage qui ne
   * la touche pas.
   */
  function etatDuGlobal() {
    const porteLaReference = une() || etat.cibleGlobale === 'deux' || etat.cibleGlobale === M.cleDuPorteur(etat.recette, etat.palette);
    if (!porteLaReference) return { texte: 'Ce réglage ne touche pas la couleur de référence.', ton: 'neutre' };
    if (M.aUnReglageDuPorteur(etat.recette, etat.palette)) return { texte: 'La couleur de référence a été déplacée par ce réglage.', ton: 'avertissement' };
    return { texte: 'Un réglage de teinte ou de luminosité déplacera la couleur de référence.', ton: 'avertissement' };
  }

  // ---------------------------------------------------------- peinture

  /** La couleur que le bout prendrait pour `v`, à la clarté du bout : la piste d'une réglette. */
  function couleurDePiste(grandeur, bout, v) {
    const intensite = intensiteEditee();
    const pivot = M.pivotDe(etat.recette, etat.palette, intensite);
    const bouts = M.boutsDe(etat.recette);
    const d = etat.decalages[cleEditee()];
    const L = bouts[bout];
    const part = M.partsDe(etat.recette, etat.palette)[intensite];
    const H = pivot.H + (grandeur === 'teinte' ? v : d.teinte[bout]);
    const s = grandeur === 'saturation' ? v : d.saturation[bout];
    const c = grandeur === 'clarte' ? v : d.clarte[bout];
    return M.fabriquerCran(Math.min(1, Math.max(0, L + c)), H, Math.min(1, Math.max(0, part * (1 + s))), etat.recette.gamut).hexa;
  }

  function degradeDePiste(grandeur, bout) {
    const { bas, haut } = GRANDEURS[grandeur];
    const arrets = Array.from({ length: 9 }, (_, rang) => bas + ((haut - bas) * rang) / 8);
    return `linear-gradient(90deg, ${arrets.map((v, rang) => `${couleurDePiste(grandeur, bout, v)} ${rang * 12.5}%`).join(', ')})`;
  }

  // ---------------------------------------------------------- la bulle

  /**
   * Le texte entier d'une ligne fixe, ouvert au clic dans une bulle posée
   * par-dessus les cartes : l'ouvrir ne déplace rien.
   */
  const bulle = document.createElement('div');
  bulle.className = 'bulle';
  bulle.hidden = true;
  let bulleDe = null;
  function basculerBulle(ligne) {
    if (bulleDe === ligne) {
      fermerBulle();
      return;
    }
    const cadre = racine.getBoundingClientRect();
    const ici = ligne.getBoundingClientRect();
    bulle.textContent = ligne.dataset.texteEntier || ligne.textContent;
    bulle.style.left = `${ici.left - cadre.left}px`;
    bulle.style.top = `${ici.bottom - cadre.top + 4}px`;
    bulle.style.width = `${ici.width}px`;
    bulle.hidden = false;
    bulleDe = ligne;
  }
  function fermerBulle() {
    bulle.hidden = true;
    bulleDe = null;
  }
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'Escape') return;
    fermerBulle();
    if (etat.voletOuvert) {
      etat.voletOuvert = false;
      actualiser();
    }
  });

  /** Une ligne fixe : une ligne, coupée par une ellipse ; le clic ouvre la bulle quand le texte dépasse. */
  function ligneFixe(classe) {
    const ligne = document.createElement('button');
    ligne.type = 'button';
    ligne.className = `ligne-fixe ${classe}`;
    ligne.addEventListener('click', () => basculerBulle(ligne));
    return ligne;
  }
  function poserLigne(ligne, texte, ton) {
    ligne.dataset.texteEntier = texte;
    ligne.textContent = texte;
    ligne.dataset.ton = ton;
    ligne.title = texte;
    if (bulleDe === ligne) bulle.textContent = texte;
  }

  // ---------------------------------------------------------- la réglette

  /** Une réglette à zones interdites : piste peinte, hachures hors limite, repère Tailwind, champ et « Rétablir ». */
  function creerReglette(grandeur, bout) {
    const ligne = document.createElement('div');
    ligne.className = 'reglette';
    const nom = `${NOM_DE_GRANDEUR[grandeur]}, ${NOM_DU_BOUT[bout].toLowerCase()}`;
    ligne.innerHTML = `
      <span class="reglette-libelle">${echapper(NOM_DU_BOUT[bout])}</span>
      <input class="input champ" type="text" inputmode="decimal" spellcheck="false" aria-label="${echapper(nom)}">
      <div class="curseur" role="slider" tabindex="0" aria-label="${echapper(nom)}">
        <div class="piste"></div>
        <div class="interdit interdit-bas"></div>
        <div class="interdit interdit-haut"></div>
        <div class="zero"></div>
        <div class="repere-tailwind" title="Valeur Tailwind"></div>
        <div class="pouce"></div>
      </div>
      <button type="button" class="bouton-discret retablir">Rétablir</button>
      <span class="plage"></span>`;
    const champ = ligne.querySelector('.champ');
    const curseur = ligne.querySelector('.curseur');
    const { bas, haut, pas, grandPas } = GRANDEURS[grandeur];
    const position = (v) => ((v - bas) / (haut - bas)) * 100;
    const depuisX = (x) => {
      const cadre = curseur.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (x - cadre.left) / cadre.width));
      return Math.round((bas + t * (haut - bas)) / pas) * pas;
    };
    let pointeur = null;
    curseur.addEventListener('pointerdown', (evenement) => {
      evenement.preventDefault();
      curseur.focus();
      curseur.setPointerCapture(evenement.pointerId);
      pointeur = evenement.pointerId;
      poser(grandeur, bout, depuisX(evenement.clientX), false);
    });
    curseur.addEventListener('pointermove', (evenement) => {
      if (evenement.pointerId === pointeur) poser(grandeur, bout, depuisX(evenement.clientX), false);
    });
    const relacher = (evenement) => {
      if (evenement.pointerId !== pointeur) return;
      pointeur = null;
      poser(grandeur, bout, valeur(grandeur, bout), true);
    };
    curseur.addEventListener('pointerup', relacher);
    curseur.addEventListener('pointercancel', relacher);
    curseur.addEventListener('keydown', (evenement) => {
      const limite = etat.limites[grandeur]?.[bout];
      const actuelle = valeur(grandeur, bout);
      const saut = evenement.shiftKey ? grandPas : pas;
      const suivantes = {
        ArrowUp: actuelle + saut, ArrowRight: actuelle + saut, ArrowDown: actuelle - saut, ArrowLeft: actuelle - saut,
        Home: limite ? limite.bas.borne : bas, End: limite ? limite.haut.borne : haut,
      };
      if (suivantes[evenement.key] === undefined) return;
      evenement.preventDefault();
      poser(grandeur, bout, Math.round(suivantes[evenement.key] / pas) * pas, true);
    });
    champ.addEventListener('change', () => {
      const nombre = Number(champ.value.replace(/[°%\s+]/g, '').replace('−', '-').replace(',', '.'));
      if (!Number.isFinite(nombre)) {
        actualiser();
        return;
      }
      poser(grandeur, bout, grandeur === 'saturation' ? nombre / 100 : nombre, true);
    });
    ligne.querySelector('.retablir').addEventListener('click', () => {
      poser(grandeur, bout, grandeur === 'teinte' ? tailwind()[bout] : 0, true);
    });
    return {
      element: ligne,
      actualiser() {
        const v = valeur(grandeur, bout);
        const limite = etat.limites[grandeur]?.[bout];
        ligne.classList.toggle('inactive', !grandeurActive(grandeur));
        if (document.activeElement !== champ) champ.value = ecrireValeur(grandeur, v);
        ligne.querySelector('.piste').style.background = degradeDePiste(grandeur, bout);
        ligne.querySelector('.pouce').style.left = `${position(v)}%`;
        ligne.querySelector('.zero').style.left = `${position(0)}%`;
        const repere = ligne.querySelector('.repere-tailwind');
        repere.hidden = grandeur !== 'teinte';
        if (grandeur === 'teinte') repere.style.left = `${position(tailwind()[bout])}%`;
        const basPermis = limite ? limite.bas.borne : bas;
        const hautPermis = limite ? limite.haut.borne : haut;
        const zoneBas = ligne.querySelector('.interdit-bas');
        const zoneHaut = ligne.querySelector('.interdit-haut');
        zoneBas.style.width = `${position(basPermis)}%`;
        zoneBas.hidden = basPermis <= bas + 1e-9;
        zoneHaut.style.left = `${position(hautPermis)}%`;
        zoneHaut.style.width = `${100 - position(hautPermis)}%`;
        zoneHaut.hidden = hautPermis >= haut - 1e-9;
        curseur.setAttribute('aria-valuemin', String(basPermis));
        curseur.setAttribute('aria-valuemax', String(hautPermis));
        curseur.setAttribute('aria-valuenow', String(v));
        curseur.setAttribute('aria-valuetext', `${ecrireValeur(grandeur, v)}, plage sûre de ${ecrireValeur(grandeur, basPermis)} à ${ecrireValeur(grandeur, hautPermis)}`);
        // Mise en page actuelle : la plage paraît sous la réglette quand une limite resserre la plage fixe.
        const restreinte = limite && (basPermis > bas + 1e-9 || hautPermis < haut - 1e-9);
        ligne.querySelector('.plage').textContent = !stable() && restreinte ? `Plage sûre : ${ecrireValeur(grandeur, basPermis)} à ${ecrireValeur(grandeur, hautPermis)}` : '';
        const zero = grandeur === 'teinte' ? tailwind()[bout] : 0;
        ligne.querySelector('.retablir').disabled = Math.abs(v - zero) < 1e-9;
        ligne.querySelector('.retablir').textContent = grandeur === 'teinte' ? 'Tailwind' : 'Rétablir';
      },
    };
  }

  // ---------------------------------------------------------- le graphe

  const CADRE = { largeur: 560, gauche: 44, droite: 16, haut: 12, trace: 150, bas: 22, rampe: 16 };

  function creerGraphe() {
    const conteneur = document.createElement('div');
    conteneur.className = 'graphe';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('role', 'group');
    conteneur.append(svg);
    let glisse = null;
    let echelleFigee = null;

    const hauteur = () => CADRE.haut + CADRE.trace + CADRE.bas + 2 * (CADRE.rampe + 6) + 8;
    const echelle = () => {
      if (echelleFigee !== null) return echelleFigee;
      const g = etat.grandeur;
      const plusGrand = Math.max(...BOUTS.map((b) => Math.abs(valeur(g, b))));
      return ECHELLES[g].find((e) => e > plusGrand + 1e-9) ?? ECHELLES[g][ECHELLES[g].length - 1];
    };
    const y = (v, e) => CADRE.haut + ((e - v) / (2 * e)) * CADRE.trace;
    const vDe = (py, e) => e - ((py - CADRE.haut) / CADRE.trace) * 2 * e;

    const pyDuPointeur = (evenement) => {
      const cadre = svg.getBoundingClientRect();
      return (evenement.clientY - cadre.top) * (hauteur() / cadre.height);
    };
    svg.addEventListener('pointerdown', (evenement) => {
      const poignee = evenement.target.closest?.('[data-bout]');
      if (!poignee) return;
      evenement.preventDefault();
      svg.setPointerCapture(evenement.pointerId);
      echelleFigee = echelle();
      glisse = { bout: poignee.dataset.bout, pointeur: evenement.pointerId };
    });
    svg.addEventListener('pointermove', (evenement) => {
      if (!glisse || evenement.pointerId !== glisse.pointeur) return;
      const { pas, grandPas } = GRANDEURS[etat.grandeur];
      const saut = evenement.shiftKey ? grandPas : pas;
      poser(etat.grandeur, glisse.bout, Math.round(vDe(pyDuPointeur(evenement), echelleFigee) / saut) * saut, false);
    });
    const relacher = (evenement) => {
      if (!glisse || evenement.pointerId !== glisse.pointeur) return;
      const { bout } = glisse;
      glisse = null;
      echelleFigee = null;
      poser(etat.grandeur, bout, valeur(etat.grandeur, bout), true);
    };
    svg.addEventListener('pointerup', relacher);
    svg.addEventListener('pointercancel', relacher);
    svg.addEventListener('keydown', (evenement) => {
      const bout = evenement.target.closest?.('[data-bout]')?.dataset.bout;
      if (!bout) return;
      const { pas, grandPas } = GRANDEURS[etat.grandeur];
      const saut = evenement.shiftKey ? grandPas : pas;
      const sens = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[evenement.key];
      if (!sens) return;
      evenement.preventDefault();
      poser(etat.grandeur, bout, Math.round((valeur(etat.grandeur, bout) + sens * saut) / pas) * pas, true);
      requestAnimationFrame(() => svg.querySelector(`[data-bout="${bout}"]`)?.focus());
    });

    function dessiner() {
      const g = etat.grandeur;
      const e = echelle();
      const H = hauteur();
      svg.setAttribute('viewBox', `0 0 ${CADRE.largeur} ${H}`);
      svg.setAttribute('aria-label', `Graphe du Color shift : ${NOM_DE_GRANDEUR[g].toLowerCase()} par nuance`);
      const { crans, courbes } = M.grilleDe(etat.recette, etat.palette);
      const n = crans.length;
      const colonne = (CADRE.largeur - CADRE.gauche - CADRE.droite) / n;
      const x = (rang) => CADRE.gauche + (rang + 0.5) * colonne;
      const intensite = intensiteEditee();
      const pivot = M.pivotDe(etat.recette, etat.palette, intensite);
      const bouts = M.boutsDe(etat.recette);
      const ancrage = M.ancrageDe(etat.recette, etat.palette);
      const seg = segments();
      const parties = [];
      parties.push(`<defs><pattern id="hachures" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="hachures-fond"/><line x1="0" y1="0" x2="0" y2="6" class="hachures-trait"/></pattern></defs>`);
      const graduations = g === 'teinte' ? [-e, -e / 2, 0, e / 2, e] : [-e, 0, e];
      for (const v of graduations) {
        parties.push(`<line x1="${CADRE.gauche}" x2="${CADRE.largeur - CADRE.droite}" y1="${y(v, e)}" y2="${y(v, e)}" class="${v === 0 ? 'axe-zero' : 'grille'}"/>`);
        parties.push(`<text x="${CADRE.gauche - 6}" y="${y(v, e) + 3.5}" class="graduation" text-anchor="end">${echapper(ecrireValeur(g, v))}</text>`);
      }
      // Rails des poignées : zone permise, zone interdite hachurée.
      const railDe = (bout, rang) => {
        const limite = etat.limites[g]?.[bout];
        if (!limite || !seg[bout]) return;
        const xr = x(rang) - 7;
        const borne = (v) => Math.max(-e, Math.min(e, v));
        const haut = borne(limite.haut.borne);
        const bas = borne(limite.bas.borne);
        if (haut < e) parties.push(`<rect x="${xr}" y="${y(e, e)}" width="14" height="${y(haut, e) - y(e, e)}" fill="url(#hachures)"/>`);
        if (bas > -e) parties.push(`<rect x="${xr}" y="${y(bas, e)}" width="14" height="${y(-e, e) - y(bas, e)}" fill="url(#hachures)"/>`);
        parties.push(`<rect x="${xr}" y="${y(haut, e)}" width="14" height="${y(bas, e) - y(haut, e)}" rx="3" class="rail-permis"/>`);
      };
      railDe('clair', 0);
      railDe('sombre', n - 1);
      // Ligne brisée : un sommet par nuance, et le pivot à 0.
      const sommets = (cle, rangAncre) => {
        const d = etat.decalages[cle][g];
        const points = courbes.light.map((L, rang) => {
          const { bout, poids } = poidsA(L, pivot, bouts);
          return { rang, v: rang === rangAncre ? 0 : d[bout] * poids };
        });
        const rangPivot = (() => {
          for (let rang = 0; rang < n - 1; rang += 1) {
            const a = courbes.light[rang];
            const b = courbes.light[rang + 1];
            if (pivot.L <= a && pivot.L >= b) return rang + (a - pivot.L) / (a - b);
          }
          return null;
        })();
        if (rangAncre === null && rangPivot !== null) points.push({ rang: rangPivot, v: 0 });
        return { points: points.sort((a, b) => a.rang - b.rang), rangPivot };
      };
      const estPorteur = intensite === ancrage.profil;
      const principal = sommets(cleEditee(), estPorteur ? ancrage.rangs.light : null);
      if (!une() && !etat.lien) {
        const autre = etat.profil === 'soft' ? 'vivid' : 'soft';
        const fantome = sommets(autre, autre === ancrage.profil ? ancrage.rangs.light : null);
        parties.push(`<polyline class="courbe-fantome" points="${fantome.points.map((p) => `${x(p.rang)},${y(Math.max(-e, Math.min(e, p.v)), e)}`).join(' ')}"/>`);
      }
      parties.push(`<polyline class="courbe" points="${principal.points.map((p) => `${x(p.rang)},${y(Math.max(-e, Math.min(e, p.v)), e)}`).join(' ')}"/>`);
      for (const p of principal.points) {
        if (Number.isInteger(p.rang) && p.rang !== 0 && p.rang !== n - 1) parties.push(`<circle cx="${x(p.rang)}" cy="${y(Math.max(-e, Math.min(e, p.v)), e)}" r="2" class="sommet"/>`);
      }
      const rangLosange = estPorteur ? ancrage.rangs.light : principal.rangPivot;
      if (rangLosange !== null) {
        const cx = x(rangLosange);
        const cy = y(0, e);
        parties.push(`<path d="M ${cx} ${cy - 7} L ${cx + 7} ${cy} L ${cx} ${cy + 7} L ${cx - 7} ${cy} Z" class="losange"><title>Référence : fixe, quel que soit le Color shift</title></path>`);
      }
      for (const [bout, rang] of [['clair', 0], ['sombre', n - 1]]) {
        if (!seg[bout]) continue;
        const v = valeur(g, bout);
        const cy = y(Math.max(-e, Math.min(e, v)), e);
        const texte = ecrireValeur(g, v);
        const ancre = bout === 'clair' ? 'start' : 'end';
        const dx = bout === 'clair' ? 12 : -12;
        parties.push(`<g data-bout="${bout}" class="poignee" tabindex="0" role="slider" aria-label="${echapper(`${NOM_DE_GRANDEUR[g]}, ${NOM_DU_BOUT[bout].toLowerCase()}`)}" aria-valuetext="${echapper(texte)}"><circle cx="${x(rang)}" cy="${cy}" r="12" class="poignee-cible"/><circle cx="${x(rang)}" cy="${cy}" r="6.5" class="poignee-rond"/></g>`);
        parties.push(`<text x="${x(rang) + dx}" y="${cy - 9}" text-anchor="${ancre}" class="etiquette-poignee">${echapper(texte)}</text>`);
      }
      const yNumeros = CADRE.haut + CADRE.trace + 15;
      crans.forEach((numero, rang) => parties.push(`<text x="${x(rang)}" y="${yNumeros}" text-anchor="middle" class="numero">${numero}</text>`));
      const sans = rampesDecalees(M, etat.recette, etat.palette, { soft: decalageNul(), vivid: decalageNul() })[intensite][etat.mode];
      const avec = rampesDecalees(M, etat.recette, etat.palette, etat.decalages)[intensite][etat.mode];
      const yRampe1 = CADRE.haut + CADRE.trace + CADRE.bas + 4;
      const yRampe2 = yRampe1 + CADRE.rampe + 6;
      parties.push(`<text x="${CADRE.gauche - 6}" y="${yRampe1 + 11.5}" text-anchor="end" class="graduation">Sans</text>`);
      parties.push(`<text x="${CADRE.gauche - 6}" y="${yRampe2 + 11.5}" text-anchor="end" class="graduation">Avec</text>`);
      const rangAncreMode = estPorteur ? ancrage.rangs[etat.mode] : -1;
      [[sans, yRampe1], [avec, yRampe2]].forEach(([rampe, yr]) => rampe.forEach((cran, rang) => {
        parties.push(`<rect x="${x(rang) - colonne / 2 + 1}" y="${yr}" width="${colonne - 2}" height="${CADRE.rampe}" rx="3" fill="${cran.hexa}"><title>${crans[rang]} · ${cran.hexa}</title></rect>`);
        if (rang === rangAncreMode) {
          const lum = M.rgb8VersOklch(cran.couleur).L;
          parties.push(`<text x="${x(rang)}" y="${yr + 12}" text-anchor="middle" class="losange-rampe" fill="${lum > 0.6 ? '#1e1e1e' : '#ffffff'}">◆</text>`);
        }
      }));
      svg.innerHTML = parties.join('');
      svg.style.aspectRatio = `${CADRE.largeur} / ${H}`;
    }

    return { element: conteneur, dessiner };
  }

  // ---------------------------------------------------------- les glyphes

  const GLYPHE_GLOBAL = `<svg viewBox="0 0 44 28" class="glyphe" aria-hidden="true"><g class="glyphe-avant">${Array.from({ length: 6 }, (_, i) => `<rect x="${3 + i * 6.6}" y="${6 + i * 2.2}" width="4.6" height="4" rx="1"/>`).join('')}</g><g class="glyphe-apres">${Array.from({ length: 6 }, (_, i) => `<rect x="${3 + i * 6.6}" y="${13 + i * 2.2}" width="4.6" height="4" rx="1"/>`).join('')}</g></svg>`;
  const GLYPHE_SHIFT = `<svg viewBox="0 0 44 28" class="glyphe" aria-hidden="true"><line x1="4" y1="14" x2="40" y2="14" class="glyphe-axe"/><polyline points="4,5 22,14 40,22" class="glyphe-ligne"/><circle cx="4" cy="5" r="2.6" class="glyphe-point"/><circle cx="40" cy="22" r="2.6" class="glyphe-point"/><path d="M22 10 L26 14 L22 18 L18 14 Z" class="glyphe-losange"/></svg>`;

  // ---------------------------------------------------------- construction

  const racine = document.getElementById('plugin');
  const refs = {};

  function construire() {
    fermerBulle();
    racine.classList.toggle('figma-dark', etat.figmaSombre);
    racine.classList.toggle('mise-en-page-stable', stable());
    const nom = REFERENCES.find((r) => r.hexa === etat.reference)?.nom ?? 'Palette';
    const defilement = racine.querySelector('.contenu')?.scrollTop ?? 0;
    racine.innerHTML = `
      <div class="entete-plugin"><span class="onglet actif">Création</span><span class="onglet">Palettes</span><span class="engrenage" aria-hidden="true">⚙</span></div>
      <div class="contenu">
        <h1 class="titre-palette">Palette ${echapper(nom)}</h1>
        <section class="carte">
          <div class="carte-tete"><span class="carte-titre">Aperçu</span><div class="bascule" role="group" aria-label="Thème de l'aperçu"><button type="button" class="bascule-option" data-mode="light">Light</button><button type="button" class="bascule-option" data-mode="dark">Dark</button></div></div>
          <div class="apercu"></div>
          <p class="bilan"></p>
        </section>
        <div class="messages-flux" hidden></div>
        <h2 class="titre-de-section">Ajuster la palette</h2>
        <p class="aide-de-section">Le réglage global déplace toute la rampe. Le Color shift écarte ensuite les nuances claires et sombres de la référence, qui ne bouge pas.</p>
        <section class="carte repliable ${etat.globalOuvert ? 'ouverte' : ''}" data-carte="global">
          <button type="button" class="carte-tete tete-repliable" aria-expanded="${etat.globalOuvert}">
            <span class="chevron" aria-hidden="true">›</span>${GLYPHE_GLOBAL}
            <span class="titres"><span class="carte-titre">Réglage global</span><span class="sous-titre">Teinte, saturation et luminosité de toute la rampe</span></span>
            <span class="resume resume-global"></span>
          </button>
          <div class="carte-corps corps-global"></div>
        </section>
        <section class="carte repliable ${etat.shiftOuvert ? 'ouverte' : ''}" data-carte="shift">
          <button type="button" class="carte-tete tete-repliable" aria-expanded="${etat.shiftOuvert}">
            <span class="chevron" aria-hidden="true">›</span>${GLYPHE_SHIFT}
            <span class="titres"><span class="carte-titre">Color shift</span><span class="sous-titre">Nuances claires et sombres, autour de la référence ◆</span></span>
            <span class="resume resume-shift"></span>
          </button>
          <div class="carte-corps corps-shift"></div>
        </section>
        <section class="carte"><div class="carte-tete"><span class="carte-titre">Garanties de contraste</span><span class="resume resume-garanties"></span></div></section>
      </div>
      <div class="pied-plugin">
        <span class="badge"></span><span class="pied-texte"></span>
        <button type="button" class="bouton-discret pied-details" aria-expanded="false">Détails</button>
      </div>
      <div class="volet" role="dialog" aria-label="Garanties et alertes" hidden>
        <div class="volet-tete"><strong>Garanties et alertes</strong><button type="button" class="bouton-discret volet-fermer" aria-label="Fermer">✕</button></div>
        <div class="volet-corps"></div>
      </div>`;
    racine.append(bulle);
    racine.querySelector('.contenu').scrollTop = defilement;
    racine.querySelector('.contenu').addEventListener('scroll', fermerBulle);
    racine.querySelectorAll('[data-mode]').forEach((bouton) => bouton.addEventListener('click', () => {
      etat.mode = bouton.dataset.mode;
      actualiser();
    }));
    racine.querySelectorAll('.tete-repliable').forEach((tete) => tete.addEventListener('click', () => {
      const carte = tete.closest('[data-carte]').dataset.carte;
      if (carte === 'global') etat.globalOuvert = !etat.globalOuvert;
      else etat.shiftOuvert = !etat.shiftOuvert;
      construire();
    }));
    racine.querySelector('.pied-details').addEventListener('click', () => {
      etat.voletOuvert = !etat.voletOuvert;
      actualiser();
    });
    racine.querySelector('.volet-fermer').addEventListener('click', () => {
      etat.voletOuvert = false;
      actualiser();
    });
    refs.apercu = racine.querySelector('.apercu');
    refs.bilan = racine.querySelector('.bilan');
    refs.messagesFlux = racine.querySelector('.messages-flux');
    refs.resumeGlobal = racine.querySelector('.resume-global');
    refs.resumeShift = racine.querySelector('.resume-shift');
    refs.resumeGaranties = racine.querySelector('.resume-garanties');
    refs.pied = racine.querySelector('.pied-plugin');
    refs.volet = racine.querySelector('.volet');
    construireGlobal(racine.querySelector('.corps-global'));
    construireShift(racine.querySelector('.corps-shift'));
    actualiser();
  }

  function construireGlobal(corps) {
    const choix = une() ? '' : `<div class="rangee"><span class="field-label">Régler</span><div class="bascule" role="group" aria-label="Profil à régler">${[['vivid', 'Vivid'], ['soft', 'Soft'], ['deux', 'Les deux']].map(([v, t]) => `<button type="button" class="bascule-option" data-cible="${v}" aria-pressed="${etat.cibleGlobale === v}">${t}</button>`).join('')}</div></div>`;
    corps.innerHTML = choix;
    refs.etatGlobal = stable() ? ligneFixe('etat-global') : Object.assign(document.createElement('p'), { className: 'avertissement' });
    corps.append(refs.etatGlobal);
    corps.insertAdjacentHTML('beforeend', `
      ${[['teinte', -30, 30, 1], ['saturation', 0, 1, 0.01], ['clarte', -0.05, 0.02, 0.005]].map(([g, min, max, pas]) => `
        <div class="reglage-global"><span class="reglette-libelle">${NOM_DE_GRANDEUR[g]}</span><input type="range" class="range-global" data-grandeur="${g}" min="${min}" max="${max}" step="${pas}" aria-label="${NOM_DE_GRANDEUR[g]} de toute la rampe"><span class="valeur-globale" data-valeur="${g}"></span></div>`).join('')}
      <p class="pied">Le Color shift s’applique ensuite, autour de la référence.</p>`);
    corps.querySelectorAll('[data-cible]').forEach((bouton) => bouton.addEventListener('click', () => {
      etat.cibleGlobale = bouton.dataset.cible;
      construire();
    }));
    corps.querySelectorAll('.range-global').forEach((range) => {
      range.addEventListener('input', () => reglerGlobal(range.dataset.grandeur, Number(range.value), false));
      range.addEventListener('change', () => reglerGlobal(range.dataset.grandeur, Number(range.value), true));
    });
    refs.rangesGlobaux = [...corps.querySelectorAll('.range-global')];
    refs.valeursGlobales = [...corps.querySelectorAll('[data-valeur]')];
  }

  function construireShift(corps) {
    refs.reglettes = [];
    corps.innerHTML = '';
    const description = document.createElement('p');
    description.className = 'aide';
    description.textContent = 'Chaque nuance s’écarte en proportion de sa distance à la référence. Les zones hachurées feraient manquer une garantie de contraste.';
    corps.append(description);

    const entete = document.createElement('div');
    entete.className = 'rangee entete-shift';
    entete.innerHTML = `
      <select class="input prereglage" aria-label="Préréglage de la teinte"><option value="tailwind">Teinte Tailwind</option><option value="constante">Teinte constante</option><option value="libre" disabled>Personnalisé</option></select>
      <label class="champ-ligne ${une() ? 'cache' : ''}"><input type="checkbox" class="lien" ${etat.lien ? 'checked' : ''}> Synchroniser Soft et Vivid</label>
      <div class="bascule ${une() || etat.lien ? 'cache' : ''}" role="group" aria-label="Profil réglé">${['soft', 'vivid'].map((p) => `<button type="button" class="bascule-option" data-profil="${p}" aria-pressed="${etat.profil === p}">${NOM_DU_PROFIL[p]}</button>`).join('')}</div>
      <button type="button" class="bouton-discret tout-retablir">Tout rétablir</button>`;
    corps.append(entete);
    entete.querySelector('.prereglage').addEventListener('change', (evenement) => {
      const t = evenement.target.value === 'tailwind' ? tailwind() : { clair: 0, sombre: 0 };
      etat.decalages = decalagesAvec(decalagesAvec(etat.decalages, cibles(), 'teinte', 'clair', t.clair), cibles(), 'teinte', 'sombre', t.sombre);
      calculerLimites();
      actualiser();
    });
    entete.querySelector('.lien').addEventListener('change', (evenement) => {
      etat.lien = evenement.target.checked;
      if (etat.lien) etat.decalages = { soft: etat.decalages.vivid, vivid: etat.decalages.vivid };
      calculerLimites();
      construire();
    });
    entete.querySelectorAll('[data-profil]').forEach((bouton) => bouton.addEventListener('click', () => {
      etat.profil = bouton.dataset.profil;
      calculerLimites();
      construire();
    }));
    entete.querySelector('.tout-retablir').addEventListener('click', () => {
      const tw = tailwind();
      for (const profil of cibles()) etat.decalages[profil] = { ...decalageNul(), teinte: { clair: tw.clair, sombre: tw.sombre } };
      etat.derniereButee = null;
      calculerLimites();
      actualiser();
    });
    refs.prereglage = entete.querySelector('.prereglage');

    const onglets = document.createElement('div');
    onglets.className = 'onglets-grandeur';
    onglets.setAttribute('role', 'tablist');
    onglets.setAttribute('aria-label', 'Grandeur réglée');
    for (const g of LISTE_DES_GRANDEURS) {
      const onglet = document.createElement('button');
      onglet.type = 'button';
      onglet.className = 'onglet-grandeur';
      onglet.setAttribute('role', 'tab');
      onglet.dataset.grandeur = g;
      onglet.setAttribute('aria-selected', String(etat.grandeur === g));
      onglet.disabled = !grandeurActive(g);
      onglet.innerHTML = `<span class="onglet-nom">${NOM_DE_GRANDEUR[g]}<span class="pastille-reglee" aria-hidden="true"></span></span><span class="onglet-valeurs"></span>`;
      onglet.addEventListener('click', () => {
        etat.grandeur = g;
        etat.derniereButee = null;
        calculerLimites();
        construire();
      });
      onglets.append(onglet);
    }
    corps.append(onglets);
    refs.onglets = [...onglets.children];
    refs.graphe = creerGraphe();
    corps.append(refs.graphe.element);
    const seg = segments();
    for (const bout of BOUTS) {
      if (!seg[bout]) continue;
      const reglette = creerReglette(etat.grandeur, bout);
      refs.reglettes.push(reglette);
      corps.append(reglette.element);
    }
    if (stable()) {
      refs.etatShift = ligneFixe('etat-shift');
      corps.append(refs.etatShift);
    } else {
      refs.etatShift = document.createElement('p');
      refs.etatShift.className = 'butee';
      corps.append(refs.etatShift);
    }
    const note = document.createElement('p');
    note.className = 'aide note-grise';
    corps.append(note);
    refs.noteGrise = note;
  }

  // ---------------------------------------------------------- actualisation

  function actualiser() {
    const { recette, palette } = etat;
    const rampes = rampesDecalees(M, recette, palette, etat.decalages);
    const promesses = promessesDecalees(M, recette, palette, rampes);
    const manquees = promesses.filter((p) => !p.tenue);
    // Les alertes viennent du moteur, sur les rampes sans Color shift : la maquette ne les recalcule pas.
    const alertes = M.alertesDePalette(recette, palette);
    const ancrage = M.ancrageDe(recette, palette);
    const { crans } = M.grilleDe(recette, palette);

    racine.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === etat.mode)));
    refs.apercu.style.background = recette.fonds[etat.mode];
    refs.apercu.classList.toggle('apercu-sombre', etat.mode === 'dark');
    refs.apercu.innerHTML = M.intensitesDe(palette).map((intensite) => `
      <div class="rangee-apercu"><span class="nom-rampe">${intensite === 'unique' ? '' : NOM_DU_PROFIL[intensite]}</span><div class="pastilles">${rampes[intensite][etat.mode].map((cran, rang) => {
        const encre = M.rgb8VersOklch(cran.couleur).L > 0.6 ? '#1e1e1e' : '#ffffff';
        const ref = intensite === ancrage.profil && rang === ancrage.rangs[etat.mode];
        return `<span class="pastille" style="background:${cran.hexa};color:${encre}" title="${crans[rang]} · ${cran.hexa}">${ref ? '◆' : ''}</span>`;
      }).join('')}</div></div>`).join('') + `<div class="rangee-apercu numeros"><span class="nom-rampe"></span><div class="pastilles">${crans.map((c) => `<span>${c}</span>`).join('')}</div></div>`;

    const resumeDesGaranties = manquees.length === 0 ? `${promesses.length} garanties tenues` : `${pluriel(manquees.length, 'garantie')} manquée${manquees.length > 1 ? 's' : ''} sur ${promesses.length}`;
    const resumeDesAlertes = alertes.length === 0 ? 'aucune alerte' : pluriel(alertes.length, 'alerte');
    const premier = manquees[0] ? texteDePromesse(manquees[0]) : alertes[0] ? texteDAlerte(alertes[0]) : '';
    refs.resumeGaranties.textContent = manquees.length === 0 ? `${promesses.length} tenues` : `${manquees.length} manquée${manquees.length > 1 ? 's' : ''}`;

    if (stable()) {
      // Mise en page proposée : une ligne dans le pied, le détail dans un volet superposé.
      refs.bilan.hidden = true;
      refs.messagesFlux.hidden = true;
      refs.pied.hidden = false;
      const badge = refs.pied.querySelector('.badge');
      badge.className = `badge ${manquees.length > 0 ? 'badge-ko' : alertes.length > 0 ? 'badge-alerte' : 'badge-ok'}`;
      badge.textContent = manquees.length > 0 ? '✗' : alertes.length > 0 ? '!' : '✓';
      const texte = `${resumeDesGaranties} · ${resumeDesAlertes}${premier ? ` · ${premier}` : ''}`;
      const pied = refs.pied.querySelector('.pied-texte');
      pied.textContent = texte;
      pied.title = texte;
      refs.pied.querySelector('.pied-details').setAttribute('aria-expanded', String(etat.voletOuvert));
      refs.volet.hidden = !etat.voletOuvert;
      refs.volet.querySelector('.volet-corps').innerHTML = `
        <p class="volet-groupe">Garanties manquées · ${manquees.length}</p>
        ${manquees.length === 0 ? '<p class="aide">Aucune.</p>' : manquees.map((p) => `<p class="volet-ligne">${echapper(texteDePromesse(p))}</p>`).join('')}
        <p class="volet-groupe">Alertes · ${alertes.length}</p>
        ${alertes.length === 0 ? '<p class="aide">Aucune.</p>' : alertes.map((a) => `<p class="volet-ligne">${echapper(texteDAlerte(a))}</p>`).join('')}`;
    } else {
      // Mise en page actuelle : le bilan et la liste des messages entrent dans le flux, au-dessus des réglages.
      refs.pied.hidden = true;
      refs.volet.hidden = true;
      refs.bilan.hidden = false;
      refs.bilan.innerHTML = manquees.length === 0
        ? `<span class="badge badge-ok">✓</span> ${promesses.length} garanties tenues`
        : `<span class="badge badge-ko">✗</span> ${resumeDesGaranties} : ${manquees.slice(0, 3).map((p) => echapper(texteDePromesse(p))).join(' · ')}`;
      const blocs = [];
      if (manquees.length > 0) blocs.push(`<p class="constats-titre">Promesses à corriger · ${manquees.length}</p>${manquees.map((p) => `<p class="constat">${echapper(texteDePromesse(p))}. Ajustez l’intensité ou le Color shift de cette palette, puis vérifiez cette association.</p>`).join('')}`);
      if (alertes.length > 0) blocs.push(`<p class="constats-titre">Alertes · ${alertes.length}</p>${alertes.map((a) => `<p class="constat">${echapper(texteDAlerte(a))}.</p>`).join('')}`);
      refs.messagesFlux.innerHTML = blocs.join('');
      refs.messagesFlux.hidden = blocs.length === 0;
    }

    // Réglage global.
    const cle = une() ? 'vivid' : M.cleDuPorteur(recette, palette);
    const t = palette.reglages?.teinte?.[cle] ?? 0;
    const l = palette.reglages?.clarte?.[cle] ?? 0;
    const parts = M.partsDe(recette, palette);
    const resumeGlobal = `${t === 0 && l === 0 ? 'Aucun décalage' : [t ? ecrireValeur('teinte', t) : '', l ? ecrireValeur('clarte', l) : ''].filter(Boolean).join(' ')} · ${Object.entries(parts).map(([i, p]) => `${i === 'unique' ? 'Saturation' : NOM_DU_PROFIL[i]} ${Math.round(p * 100)} %`).join(' · ')}`;
    refs.resumeGlobal.textContent = resumeGlobal;
    refs.resumeGlobal.title = resumeGlobal;
    for (const range of refs.rangesGlobaux ?? []) {
      if (document.activeElement !== range) range.value = String(valeurGlobale(range.dataset.grandeur));
    }
    for (const span of refs.valeursGlobales ?? []) {
      const g = span.dataset.valeur;
      span.textContent = g === 'saturation' ? `${Math.round(valeurGlobale(g) * 100)} %` : ecrireValeur(g, valeurGlobale(g));
    }
    const global = etatDuGlobal();
    if (stable()) poserLigne(refs.etatGlobal, global.texte, global.ton);
    else {
      refs.etatGlobal.textContent = global.texte;
      refs.etatGlobal.hidden = global.ton === 'neutre';
    }

    // Color shift.
    const d = etat.decalages[cleEditee()];
    const resume = LISTE_DES_GRANDEURS.filter((g) => g === 'teinte' || d[g].clair !== 0 || d[g].sombre !== 0)
      .map((g) => `${NOM_DE_GRANDEUR[g]} ${ecrireValeur(g, d[g].clair)} / ${ecrireValeur(g, d[g].sombre)}`);
    const resumeShift = `${origine() === 'tailwind' ? 'Tailwind · ' : ''}${resume.join(' · ')}${!une() && etat.lien ? ' · synchronisé' : ''}`;
    refs.resumeShift.textContent = resumeShift;
    refs.resumeShift.title = resumeShift;
    if (refs.prereglage) refs.prereglage.value = origine();
    for (const onglet of refs.onglets ?? []) {
      const g = onglet.dataset.grandeur;
      onglet.querySelector('.onglet-valeurs').textContent = `${ecrireValeur(g, d[g].clair)} · ${ecrireValeur(g, d[g].sombre)}`;
      const regle = g === 'teinte' ? origine() !== 'tailwind' && (d.teinte.clair !== 0 || d.teinte.sombre !== 0) : d[g].clair !== 0 || d[g].sombre !== 0;
      onglet.classList.toggle('reglee', regle);
    }
    refs.graphe?.dessiner();
    for (const reglette of refs.reglettes ?? []) reglette.actualiser();

    const b = etat.derniereButee;
    let texteDeButee = null;
    if (b && b.cause) {
      const cause = b.cause.ordre
        ? 'deux nuances voisines se rapprocheraient à moins de 0,01 de luminosité'
        : `${b.cause.promesse.libelle} (${NOM_DU_PROFIL[b.cause.promesse.intensite]}, ${NOM_DU_MODE[b.cause.promesse.mode]}) tomberait à ${ecrireContraste(b.cause.promesse.contraste)}:1, sous ${virgule(b.cause.promesse.seuil, 1)}:1`;
      texteDeButee = `⊣ ${NOM_DE_GRANDEUR[b.grandeur]}, ${NOM_DU_BOUT[b.bout].toLowerCase()} : limite atteinte à ${ecrireValeur(b.grandeur, b.borne)}. Au-delà, ${cause}.`;
    }
    if (stable()) {
      const limites = etat.limites[etat.grandeur] ?? {};
      const plages = BOUTS.filter((bout) => segments()[bout] && limites[bout])
        .map((bout) => `${NOM_DU_BOUT[bout].toLowerCase()} ${ecrireValeur(etat.grandeur, limites[bout].bas.borne)} à ${ecrireValeur(etat.grandeur, limites[bout].haut.borne)}`);
      poserLigne(refs.etatShift, texteDeButee ?? `Plage sûre · ${plages.join(' · ')}`, texteDeButee ? 'butee' : 'neutre');
    } else {
      refs.etatShift.textContent = texteDeButee ?? '';
      refs.etatShift.hidden = texteDeButee === null;
    }
    refs.noteGrise.textContent = grise() ? 'Cette palette est entièrement grise : teinte et saturation ne se voient pas. La luminosité reste réglable.' : '';
    refs.noteGrise.hidden = !grise();
    mesurerLeDeplacement();
  }

  // ---------------------------------------------------------- mesure du déplacement

  /** Le déplacement vertical du contrôle saisi, du début du geste à chaque rendu : 0 px dans une mise en page stable. */
  let suivi = null;
  document.addEventListener('pointerdown', (evenement) => {
    const controle = evenement.target.closest?.('.curseur, .range-global, .graphe svg');
    if (!controle || !racine.contains(controle)) return;
    suivi = { controle, depart: controle.getBoundingClientRect().top, plusGrand: 0 };
  }, true);
  document.addEventListener('pointerup', () => {
    if (!suivi) return;
    afficherLaMesure(suivi.plusGrand);
    suivi = null;
  }, true);
  function mesurerLeDeplacement() {
    if (!suivi || !suivi.controle.isConnected) return;
    suivi.plusGrand = Math.max(suivi.plusGrand, Math.abs(suivi.controle.getBoundingClientRect().top - suivi.depart));
    afficherLaMesure(suivi.plusGrand);
  }
  function afficherLaMesure(pixels) {
    const zone = document.getElementById('mesure');
    if (!zone) return;
    zone.dataset.ton = pixels > 0.5 ? 'mauvais' : 'bon';
    zone.textContent = `Pendant le dernier geste, le contrôle saisi a bougé de ${Math.round(pixels)} px.`;
  }

  // ---------------------------------------------------------- scénario

  function construireScenario() {
    const zone = document.getElementById('scenario');
    zone.innerHTML = `
      <h2>Scénario</h2>
      <div class="groupe"><span class="groupe-titre">Référence</span><div class="choix">${REFERENCES.map((r) => `<button type="button" data-reference="${r.hexa}" aria-pressed="${etat.reference === r.hexa}"><span class="puce" style="background:${r.hexa}"></span>${r.nom}</button>`).join('')}</div></div>
      <div class="groupe"><span class="groupe-titre">Intensités</span><div class="choix">${[[2, 'Deux'], [1, 'Une']].map(([n, t]) => `<button type="button" data-intensites="${n}" aria-pressed="${etat.intensites === n}">${t}</button>`).join('')}</div></div>
      <div class="groupe"><span class="groupe-titre">Avertissements</span><div class="choix">${[['stable', 'Ligne fixe (proposé)'], ['flux', 'Dans le flux (actuel)']].map(([v, t]) => `<button type="button" data-mise-en-page="${v}" aria-pressed="${etat.miseEnPage === v}">${t}</button>`).join('')}</div></div>
      <div class="groupe"><span class="groupe-titre">Thème de Figma</span><div class="choix">${[[false, 'Clair'], [true, 'Sombre']].map(([v, t]) => `<button type="button" data-figma="${v}" aria-pressed="${etat.figmaSombre === v}">${t}</button>`).join('')}</div></div>
      <p id="mesure" class="mesure" aria-live="polite">Saisissez un curseur : la page mesure de combien il bouge pendant le geste.</p>
      <div class="groupe"><span class="groupe-titre">Essais</span><div class="essais">
        <button type="button" data-essai="assombrir">1 · Assombrir les nuances claires jusqu’à la butée</button>
        <button type="button" data-essai="desaturer">2 · Désaturer les nuances claires de 40 %</button>
        <button type="button" data-essai="croise">3 · Éclaircir les nuances sombres jusqu’à la butée, puis ouvrir la teinte</button>
        <button type="button" data-essai="global">4 · Nuances sombres en butée, puis luminosité globale −0,03 : le réglage global fait manquer deux garanties</button>
        <button type="button" data-essai="flux">5 · Vert, avertissements dans le flux : glissez la luminosité globale entre 0 et +0,02</button>
        <button type="button" data-essai="stable">6 · Vert, ligne fixe : le même geste</button>
      </div></div>
      <h2>Décisions retenues</h2>
      <ul class="questions">${DECISIONS.map(([id, titre, texte]) => `<li><strong>${id} · ${titre}.</strong> ${texte}</li>`).join('')}</ul>
      ${OUVERTES.length === 0 ? '' : `<h2>À valider</h2>
      <ul class="questions">${OUVERTES.map(([id, titre, texte]) => `<li><strong>${id} · ${titre}.</strong> ${texte}</li>`).join('')}</ul>`}`;
    zone.querySelectorAll('[data-reference]').forEach((b) => b.addEventListener('click', () => { etat.reference = b.dataset.reference; recommencer(); }));
    zone.querySelectorAll('[data-intensites]').forEach((b) => b.addEventListener('click', () => { etat.intensites = Number(b.dataset.intensites); recommencer(); }));
    zone.querySelectorAll('[data-mise-en-page]').forEach((b) => b.addEventListener('click', () => {
      etat.miseEnPage = b.dataset.miseEnPage;
      etat.voletOuvert = false;
      construireScenario();
      construire();
    }));
    zone.querySelectorAll('[data-figma]').forEach((b) => b.addEventListener('click', () => {
      etat.figmaSombre = b.dataset.figma === 'true';
      construireScenario();
      construire();
    }));
    zone.querySelectorAll('[data-essai]').forEach((b) => b.addEventListener('click', () => essai(b.dataset.essai)));
  }

  function essai(nom) {
    if (nom === 'flux' || nom === 'stable') {
      etat.reference = '#16A34A';
      etat.miseEnPage = nom;
      etat.voletOuvert = false;
    }
    recommencerSansRendu();
    etat.shiftOuvert = true;
    etat.globalOuvert = false;
    if (nom === 'assombrir' || nom === 'croise') {
      etat.grandeur = 'clarte';
      calculerLimites();
      if (nom === 'assombrir') poser('clarte', 'clair', -0.15, true);
      else {
        poser('clarte', 'sombre', 0.15, true);
        etat.grandeur = 'teinte';
        calculerLimites();
      }
    } else if (nom === 'desaturer') {
      etat.grandeur = 'saturation';
      calculerLimites();
      poser('saturation', 'clair', -0.4, true);
    } else if (nom === 'global') {
      etat.globalOuvert = true;
      etat.cibleGlobale = 'deux';
      etat.grandeur = 'clarte';
      calculerLimites();
      poser('clarte', 'sombre', 0.15, true);
      etat.derniereButee = null;
      reglerGlobal('clarte', -0.03, true);
    } else if (nom === 'flux' || nom === 'stable') {
      etat.globalOuvert = true;
      etat.cibleGlobale = 'deux';
    }
    construireScenario();
    construire();
  }

  function recommencerSansRendu() {
    nouvellePalette();
    etat.lien = true;
    calculerLimites();
  }

  function recommencer() {
    recommencerSansRendu();
    construireScenario();
    construire();
  }

  recommencer();
}

// ------------------------------------------------------------ la page

const STYLES = String.raw`
:root {
  color-scheme: light dark;
  --page: #f3f3f1; --page-texte: #1e1e1e; --page-second: #5b5b5b; --page-carte: #ffffff; --page-bordure: #dcdcd8; --page-accent: #0d6ec9; --page-bon: #168b52; --page-mauvais: #c2410c;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --page: #161616; --page-texte: #ededed; --page-second: #a9a9a9; --page-carte: #1f1f1f; --page-bordure: #3a3a3a; --page-accent: #7cc4f8; --page-bon: #85e0a3; --page-mauvais: #ffb38a; }
}
:root[data-theme="dark"] { --page: #161616; --page-texte: #ededed; --page-second: #a9a9a9; --page-carte: #1f1f1f; --page-bordure: #3a3a3a; --page-accent: #7cc4f8; --page-bon: #85e0a3; --page-mauvais: #ffb38a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--page-texte); font: 13px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
header.page { padding: 24px 24px 8px; max-width: 1480px; margin: 0 auto; }
header.page h1 { font-size: 20px; margin: 0 0 4px; }
header.page p { margin: 0; color: var(--page-second); max-width: 900px; }
.mise-en-page { display: grid; grid-template-columns: 300px 600px minmax(260px, 1fr); gap: 24px; padding: 16px 24px 48px; max-width: 1480px; margin: 0 auto; align-items: start; }
@media (max-width: 1260px) { .mise-en-page { grid-template-columns: 300px 600px; } .explications { grid-column: 1 / -1; } }
@media (max-width: 960px) { .mise-en-page { grid-template-columns: minmax(0, 1fr); padding: 16px; } }
#scenario, .explications { background: var(--page-carte); border: 1px solid var(--page-bordure); border-radius: 10px; padding: 16px; }
#scenario h2, .explications h2 { font-size: 14px; margin: 0 0 10px; }
#scenario h2:not(:first-child), .explications h2:not(:first-child) { margin-top: 20px; }
.groupe { margin-bottom: 12px; }
.groupe-titre { display: block; font-size: 11px; font-weight: 600; color: var(--page-second); margin-bottom: 4px; }
.choix { display: flex; flex-wrap: wrap; gap: 4px; }
.choix button, .essais button { font: inherit; font-size: 12px; border: 1px solid var(--page-bordure); background: transparent; color: var(--page-texte); border-radius: 6px; padding: 3px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
.choix button[aria-pressed="true"] { border-color: var(--page-accent); color: var(--page-accent); font-weight: 600; }
.essais { display: grid; gap: 4px; }
.essais button { text-align: left; }
.puce { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.mesure { margin: 0 0 12px; padding: 8px 10px; border-radius: 6px; border: 1px dashed var(--page-bordure); font-size: 12px; }
.mesure[data-ton="bon"] { border: 1px solid var(--page-bon); color: var(--page-bon); }
.mesure[data-ton="mauvais"] { border: 1px solid var(--page-mauvais); color: var(--page-mauvais); font-weight: 600; }
.questions { padding-left: 18px; margin: 0; display: grid; gap: 8px; font-size: 12px; }
.explications { font-size: 12.5px; }
.explications p { margin: 0 0 10px; }
.explications ul { margin: 0 0 10px; padding-left: 18px; }
.explications table { border-collapse: collapse; width: 100%; font-size: 11.5px; margin-bottom: 10px; }
.explications th, .explications td { border-bottom: 1px solid var(--page-bordure); text-align: left; padding: 4px 6px 4px 0; vertical-align: top; }
.schema { width: 100%; max-width: 360px; display: block; margin: 4px 0 12px; }
.schema text { fill: var(--page-second); font-size: 10px; }
.schema .s-axe { stroke: var(--page-bordure); }
.schema .s-avant { stroke: var(--page-second); stroke-dasharray: 3 3; fill: none; }
.schema .s-apres { stroke: var(--page-accent); stroke-width: 2; fill: none; }
.schema .s-ref { fill: var(--page-texte); }

/* Le plugin simulé : une fenêtre de 600 × 720, contenu défilant, sur les rôles de couleur du socle. */
#plugin {
  width: 600px; max-width: 100%; height: 720px; position: relative; display: grid; grid-template-rows: 40px minmax(0, 1fr) auto; grid-template-columns: minmax(0, 1fr);
  border-radius: 10px; overflow: hidden; border: 1px solid var(--page-bordure); box-shadow: 0 6px 24px rgba(0,0,0,.12);
  --fond: #ffffff; --fond-bloc: #f5f5f5; --fond-note: #ebebeb; --fond-survol: #f5f5f5; --fond-avertissement: #fff1d6;
  --bordure: #d2d2d2; --texte: #1e1e1e; --texte-second: #6b6b6b; --texte-marque: #007be5; --texte-danger: #dc3412; --texte-avertissement: #a55b00;
  --interdit: #dc3412; --ombre: 0 8px 24px rgba(0,0,0,.18);
  --fond-niveau-atteint: #CDEFD9; --texte-niveau-atteint: #14532D; --fond-niveau-manque: #F9D8D1; --texte-niveau-manque: #8A2A1B;
  background: var(--fond); color: var(--texte); font: 11px/16px Inter, ui-sans-serif, system-ui, sans-serif;
}
@media (max-width: 960px) { #plugin { height: 80vh; min-height: 520px; } }
#plugin.figma-dark {
  --fond: #2c2c2c; --fond-bloc: #383838; --fond-note: #4d4d4d; --fond-survol: #383838; --fond-avertissement: #4a3a10;
  --bordure: #5e5e5e; --texte: #ffffff; --texte-second: #b3b3b3; --texte-marque: #7cc4f8; --texte-danger: #ffafa3; --texte-avertissement: #ffc470;
  --interdit: #ff8a73; --ombre: 0 8px 24px rgba(0,0,0,.5);
}
#plugin button, #plugin select, #plugin input { font: inherit; color: inherit; }
#plugin [hidden] { display: none !important; }
.entete-plugin { display: flex; gap: 16px; align-items: center; padding: 0 16px; border-bottom: 1px solid var(--bordure); }
.onglet { font-size: 12px; color: var(--texte-second); }
.onglet.actif { color: var(--texte); font-weight: 600; box-shadow: inset 0 -2px 0 var(--texte); padding: 11px 0; }
.engrenage { margin-left: auto; color: var(--texte-second); }
.contenu { padding: 16px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-content: start; overflow-y: auto; overflow-anchor: none; }
.titre-palette { font-size: 15px; line-height: 20px; margin: 0; }
.titre-de-section { font-size: 12px; margin: 8px 0 -8px; }
.aide-de-section { margin: 0; color: var(--texte-second); }
.carte { border: 1px solid var(--bordure); border-radius: 6px; background: var(--fond); }
.carte-tete { display: flex; align-items: center; gap: 8px; padding: 8px 12px; min-height: 40px; width: 100%; background: none; border: 0; text-align: left; }
.tete-repliable { cursor: pointer; }
.tete-repliable:hover { background: var(--fond-survol); }
.carte-titre { font-size: 12px; font-weight: 600; }
.titres { display: grid; flex: 0 1 auto; min-width: 0; }
.sous-titre { color: var(--texte-second); }
.resume { margin-left: auto; color: var(--texte-second); text-align: right; max-width: 260px; }
.mise-en-page-stable .resume { min-width: 0; flex: 1 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chevron { display: inline-block; width: 10px; transition: transform .12s; color: var(--texte-second); font-size: 14px; }
.ouverte .chevron { transform: rotate(90deg); }
.carte-corps { display: none; padding: 4px 12px 12px; border-top: 1px solid var(--bordure); }
.ouverte .carte-corps { display: grid; gap: 8px; }
.glyphe { width: 38px; height: 24px; flex: none; }
/* La planche des glyphes : les rôles de couleur du plugin, dans chaque thème de Figma ([UI-19]). */
.planches-des-glyphes { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; padding: 0 24px 32px; }
.planches-des-glyphes > h2 { grid-column: 1 / -1; margin: 0; }
.planche-glyphes {
  --fond: #ffffff; --fond-bloc: #f5f5f5; --bordure: #d2d2d2; --texte: #1e1e1e; --texte-second: #6b6b6b; --texte-marque: #007be5;
  background: var(--fond-bloc); color: var(--texte); border: 1px solid var(--bordure); border-radius: 10px; padding: 12px 16px; font: 11px/16px Inter, ui-sans-serif, system-ui, sans-serif;
}
.planche-glyphes.figma-dark { --fond: #2c2c2c; --fond-bloc: #383838; --bordure: #5e5e5e; --texte: #ffffff; --texte-second: #b3b3b3; --texte-marque: #7cc4f8; }
.planche-glyphes h2 { font-size: 12px; margin: 0 0 4px; }
.planche-glyphes h3 { font-size: 11px; margin: 10px 0 4px; color: var(--texte-second); font-weight: 600; }
.planche-glyphes ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.planche-glyphes li { display: flex; align-items: center; gap: 8px; }
.planche-glyphes .nom-du-glyphe { margin-left: auto; color: var(--texte-second); font-family: ui-monospace, Consolas, monospace; font-size: 10px; }
.glyphe-trait { fill: none; stroke: var(--texte-second); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.glyphe-trait-marque { fill: none; stroke: var(--texte-marque); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.glyphe-aplat { fill: var(--texte-second); }
.glyphe-aplat-pale { fill: var(--texte-second); opacity: .35; }
.glyphe-aplat-marque { fill: var(--texte-marque); }
.glyphe-fond { fill: var(--fond); stroke: var(--texte-second); stroke-width: 1.8; stroke-linejoin: round; }
.glyphe-avant rect { fill: var(--texte-second); opacity: .35; }
.glyphe-apres rect { fill: var(--texte-marque); }
.glyphe-axe { stroke: var(--bordure); stroke-width: 1.2; }
.glyphe-ligne { stroke: var(--texte-marque); stroke-width: 1.8; fill: none; }
.glyphe-point { fill: var(--fond); stroke: var(--texte-marque); stroke-width: 1.6; }
.glyphe-losange { fill: var(--texte); }
.bascule { display: inline-flex; border: 1px solid var(--bordure); border-radius: 6px; overflow: hidden; }
.bascule-option { border: 0; background: none; padding: 0 10px; height: 24px; cursor: pointer; }
.bascule-option[aria-pressed="true"] { background: var(--fond-note); font-weight: 600; }
.carte-tete .bascule { margin-left: auto; }
.apercu { border-radius: 6px; padding: 10px 10px 4px; margin: 0 12px 12px; display: grid; gap: 4px; }
.rangee-apercu { display: grid; grid-template-columns: 40px 1fr; align-items: center; gap: 6px; }
.nom-rampe { color: #6b6b6b; font-size: 10px; }
.apercu-sombre .nom-rampe, .apercu-sombre .numeros span { color: #b3b3b3; }
.pastilles { display: grid; grid-template-columns: repeat(11, 1fr); gap: 3px; }
.pastille { height: 26px; border-radius: 4px; display: grid; place-items: center; font-size: 11px; }
.numeros span { font-size: 9.5px; text-align: center; color: #6b6b6b; }
.bilan { margin: -4px 12px 10px; }
.badge { display: inline-grid; place-items: center; width: 16px; height: 16px; border-radius: 8px; font-size: 10px; font-weight: 700; flex: none; vertical-align: -3px; margin-right: 4px; }
.badge-ok { background: var(--fond-niveau-atteint); color: var(--texte-niveau-atteint); }
.badge-ko { background: var(--fond-niveau-manque); color: var(--texte-niveau-manque); }
.badge-alerte { background: var(--fond-avertissement); color: var(--texte-avertissement); }
.messages-flux { display: grid; gap: 4px; }
.constats-titre { margin: 0; font-weight: 600; color: var(--texte-danger); }
.constat { margin: 0; padding: 6px 8px; border-radius: 4px; background: var(--fond-bloc); }
.rangee { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.field-label { color: var(--texte-second); }
.avertissement { margin: 0; padding: 6px 8px; background: var(--fond-avertissement); border-radius: 4px; color: var(--texte-avertissement); }
.pied, .aide { margin: 0; color: var(--texte-second); }
.reglage-global { display: grid; grid-template-columns: 76px 1fr 56px; align-items: center; gap: 8px; }
.range-global { width: 100%; }
.valeur-globale { text-align: right; font-variant-numeric: tabular-nums; }
.input { height: 24px; border: 1px solid var(--bordure); border-radius: 4px; background: var(--fond); padding: 0 6px; }
.cache { display: none !important; }
.champ-ligne { display: inline-flex; gap: 6px; align-items: center; }
.bouton-discret { border: 0; background: none; color: var(--texte-marque); cursor: pointer; padding: 0 4px; height: 24px; }
.bouton-discret:disabled { color: var(--texte-second); opacity: .5; cursor: default; }
.entete-shift .tout-retablir { margin-left: auto; }

/* La ligne fixe : une ligne de 24 px, toujours présente, coupée par une ellipse ; le clic ouvre la bulle. */
.ligne-fixe { display: block; width: 100%; height: 24px; line-height: 24px; padding: 0 8px; border: 0; border-radius: 4px; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; background: var(--fond-bloc); color: var(--texte-second); }
.ligne-fixe[data-ton="avertissement"] { background: var(--fond-avertissement); color: var(--texte-avertissement); }
.ligne-fixe[data-ton="butee"] { box-shadow: inset 3px 0 0 var(--interdit); color: var(--texte); }
.bulle { position: absolute; z-index: 5; padding: 8px 10px; border-radius: 6px; background: var(--fond); border: 1px solid var(--bordure); box-shadow: var(--ombre); }
.pied-plugin { display: flex; align-items: center; gap: 4px; height: 36px; padding: 0 12px 0 16px; border-top: 1px solid var(--bordure); background: var(--fond); }
.pied-texte { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.volet { position: absolute; z-index: 4; left: 8px; right: 8px; bottom: 44px; max-height: 55%; display: grid; grid-template-rows: auto minmax(0, 1fr); border: 1px solid var(--bordure); border-radius: 8px; background: var(--fond); box-shadow: var(--ombre); }
.volet-tete { display: flex; justify-content: space-between; align-items: center; padding: 8px 8px 4px 12px; }
.volet-corps { overflow-y: auto; padding: 0 12px 12px; display: grid; gap: 4px; align-content: start; }
.volet-groupe { margin: 8px 0 0; font-weight: 600; }
.volet-ligne { margin: 0; padding: 4px 8px; border-radius: 4px; background: var(--fond-bloc); }

.onglets-grandeur { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--bordure); border-radius: 6px; overflow: hidden; }
.onglet-grandeur { border: 0; border-right: 1px solid var(--bordure); background: none; padding: 6px 8px; text-align: left; cursor: pointer; display: grid; gap: 1px; }
.onglet-grandeur:last-child { border-right: 0; }
.onglet-grandeur[aria-selected="true"] { background: var(--fond-note); box-shadow: inset 0 -2px 0 var(--texte-marque); }
.onglet-grandeur:disabled { opacity: .45; cursor: not-allowed; }
.onglet-nom { font-weight: 600; display: inline-flex; gap: 5px; align-items: center; }
.onglet-valeurs { color: var(--texte-second); font-variant-numeric: tabular-nums; }
.pastille-reglee { width: 6px; height: 6px; border-radius: 3px; background: var(--texte-marque); display: none; }
.reglee .pastille-reglee { display: inline-block; }
.graphe svg { width: 100%; display: block; }
.graphe .grille { stroke: var(--bordure); stroke-width: .6; stroke-dasharray: 2 3; }
.graphe .axe-zero { stroke: var(--texte-second); stroke-width: .8; }
.graphe .graduation, .graphe .numero { fill: var(--texte-second); font-size: 9.5px; font-variant-numeric: tabular-nums; }
.graphe .courbe { stroke: var(--texte-marque); stroke-width: 2; fill: none; stroke-linejoin: round; }
.graphe .courbe-fantome { stroke: var(--texte-second); stroke-width: 1.4; fill: none; stroke-dasharray: 4 3; }
.graphe .sommet { fill: var(--texte-marque); }
.graphe .losange { fill: var(--texte); stroke: var(--fond); stroke-width: 1.5; }
.graphe .losange-rampe { font-size: 10px; }
.graphe .poignee { cursor: ns-resize; outline: none; }
.graphe .poignee-cible { fill: transparent; }
.graphe .poignee-rond { fill: var(--fond); stroke: var(--texte-marque); stroke-width: 2.5; }
.graphe .poignee:focus-visible .poignee-rond { stroke-width: 4; }
.graphe .etiquette-poignee { fill: var(--texte); font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums; }
.graphe .rail-permis { fill: var(--texte-marque); opacity: .14; }
.graphe .hachures-fond { fill: var(--fond); }
.graphe .hachures-trait { stroke: var(--interdit); stroke-width: 1.6; opacity: .55; }
.reglette { display: grid; grid-template-columns: 96px 64px 1fr 58px; align-items: center; gap: 8px; }
.reglette .plage { grid-column: 3 / 5; color: var(--texte-second); font-size: 10px; margin-top: -6px; }
.reglette .plage:empty { display: none; }
.reglette.inactive { opacity: .4; pointer-events: none; }
.champ { width: 100%; text-align: right; font-variant-numeric: tabular-nums; }
.curseur { position: relative; height: 24px; cursor: pointer; outline: none; touch-action: none; }
.curseur .piste { position: absolute; left: 0; right: 0; top: 7px; height: 10px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }
.curseur .interdit { position: absolute; top: 5px; height: 14px; background: repeating-linear-gradient(135deg, var(--interdit) 0 2px, transparent 2px 5px); opacity: .9; }
.curseur .interdit-bas { left: 0; border-radius: 5px 0 0 5px; border-right: 2px solid var(--interdit); }
.curseur .interdit-haut { border-radius: 0 5px 5px 0; border-left: 2px solid var(--interdit); }
.curseur .interdit::after { content: ''; position: absolute; inset: 0; background: var(--fond); opacity: .45; border-radius: inherit; }
.curseur .zero { position: absolute; top: 3px; width: 1px; height: 18px; background: var(--texte-second); opacity: .6; }
.curseur .repere-tailwind { position: absolute; top: 1px; width: 2px; height: 22px; margin-left: -1px; background: var(--texte); opacity: .7; border-radius: 1px; }
.curseur .pouce { position: absolute; top: 4px; width: 16px; height: 16px; margin-left: -8px; border-radius: 8px; background: #ffffff; box-shadow: 0 0 0 1.5px rgba(0,0,0,.55), 0 1px 3px rgba(0,0,0,.3); }
.curseur:focus-visible .pouce { box-shadow: 0 0 0 2.5px var(--texte-marque), 0 1px 3px rgba(0,0,0,.3); }
.butee { margin: 0; padding: 6px 8px; border-radius: 4px; background: var(--fond-bloc); border-left: 3px solid var(--interdit); }
@media (max-width: 560px) {
  .reglette { grid-template-columns: 1fr 64px; } .reglette .curseur { grid-column: 1 / -1; } .reglette .plage { grid-column: 1 / -1; margin-top: 0; }
  .resume { display: none; } .reglage-global { grid-template-columns: 70px 1fr 48px; }
}
`;

const EXPLICATIONS = `
<h2>Deux cartes, deux gestes</h2>
<p><strong>Réglage global.</strong> Toute la rampe bouge du même écart. Le décalage de luminosité translate la courbe ; celui du profil porteur déplace la référence.</p>
<svg class="schema" viewBox="0 0 360 100" aria-label="Schéma du réglage global : la courbe se translate">
  <line x1="20" y1="88" x2="350" y2="88" class="s-axe"/><text x="20" y="12">luminosité</text><text x="20" y="99">50</text><text x="332" y="99">950</text>
  <polyline points="20,18 120,34 190,48 260,62 350,74" class="s-avant"/>
  <polyline points="20,26 120,42 190,56 260,70 350,82" class="s-apres"/>
</svg>
<p><strong>Color shift.</strong> Les deux bouts s’écartent, la référence ◆ reste fixe. Chaque nuance prend le décalage de son bout, en proportion de sa distance à la référence.</p>
<svg class="schema" viewBox="0 0 360 100" aria-label="Schéma du Color shift : la courbe pivote autour de la référence">
  <line x1="20" y1="88" x2="350" y2="88" class="s-axe"/><text x="20" y="12">luminosité</text><text x="20" y="99">50</text><text x="332" y="99">950</text>
  <polyline points="20,18 120,34 190,48 260,62 350,74" class="s-avant"/>
  <polyline points="20,28 120,40 190,48 260,58 350,66" class="s-apres"/>
  <path d="M190 42 L196 48 L190 54 L184 48 Z" class="s-ref"/>
</svg>
<h2>Des avertissements qui ne déplacent rien</h2>
<p>Pendant un glisser, le plugin repeint la palette à chaque image. Aujourd’hui, un message qui apparaît au-dessus du curseur pousse la carte vers le bas ; près d’un seuil, il apparaît et disparaît à chaque pixel, et l’interface clignote.</p>
<ul>
<li>Chaque avertissement tient sur une ligne de hauteur fixe, présente même sans avertissement.</li>
<li>Le texte entier s’ouvre au clic, dans une bulle ou un volet posés par-dessus les cartes.</li>
<li>Le bilan des garanties et des alertes passe dans le pied de la fenêtre, visible à toute position de défilement.</li>
<li>Les résumés d’en-tête tiennent sur une ligne.</li>
</ul>
<p>La page mesure le déplacement du contrôle saisi pendant chaque geste. L’essai 5 le montre dans la mise en page actuelle, l’essai 6 dans la proposée.</p>
<h2>Le modèle</h2>
<table>
<tr><th>Grandeur</th><th>Au bout</th><th>Sur une nuance</th></tr>
<tr><td>Teinte</td><td>degrés, ±90°</td><td>l’interpolation actuelle de <code>teinteA</code></td></tr>
<tr><td>Saturation</td><td>% de la saturation du profil, ±100 %</td><td>part × (1 + s × poids), bornée à [0, 1]</td></tr>
<tr><td>Luminosité</td><td>clarté OKLCH, ±0,15</td><td>L + c × poids</td></tr>
</table>
<p>Le poids vaut 0 à la clarté du pivot et 1 au bout. Le cran porteur garde les octets de la référence.</p>
<h2>Ce que la mesure a trouvé</h2>
<p>Sur la recette par défaut et six références, teinte et saturation ne font manquer aucune garantie sur toute leur plage. La luminosité se borne entre −0,015 et −0,060 côté clair, entre +0,045 et +0,060 côté sombre. Le 50 atteint le blanc vers +0,040.</p>
<p>Les limites se croisent : la luminosité posée en butée, la teinte du même bout se borne à son tour. Une limite se calcule en 28 ms en moyenne.</p>
`;

const GABARIT = ({ moteur, fonctions, donnees, app }) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maquette Color shift</title>
<style>${STYLES}</style>
</head>
<body>
<header class="page">
  <h1>UCM Palettes · Maquette du Color shift, version 2</h1>
  <p>Teinte, saturation et luminosité aux deux bouts de la rampe, référence fixe, limites qui gardent les garanties de contraste ; des avertissements qui tiennent sur une ligne. Le plugin simulé fait 600 × 720 ; l’étude est dans ETUDE-COLOR-SHIFT.md.</p>
</header>
<div class="mise-en-page">
  <aside id="scenario" aria-label="Scénario"></aside>
  <main><div id="plugin" aria-label="Plugin UCM Palettes simulé"></div></main>
  <aside class="explications">${EXPLICATIONS}</aside>
</div>
<section class="planches-des-glyphes" aria-label="Planche des glyphes">
  <h2>Planche des glyphes</h2>
  ${plancheDesGlyphes(false)}
  ${plancheDesGlyphes(true)}
</section>
<script id="moteur-ucm">${moteur}</script>
<script>
${donnees}
${fonctions}
(${app})(UCM);
</script>
</body>
</html>
`;

/** Lie le moteur du dépôt en un script autonome, exposé sous `UCM`. */
async function lierLeMoteur() {
  const { build } = await import('esbuild');
  const resultat = await build({
    stdin: {
      contents: [
        "export * from './packages/couleur/src/index.ts';",
        "export { nouvellePalette, ajouter, remplacerPalette, reglerTeinte, reglerSaturation, reglerClarte, prereglageDe } from './packages/plugin-palettes/src/edition.ts';",
      ].join('\n'),
      resolveDir: RACINE,
      sourcefile: 'moteur-color-shift.ts',
    },
    bundle: true, write: false, format: 'iife', globalName: 'UCM', minify: true, legalComments: 'none', target: 'es2020',
  });
  return resultat.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}

export async function ecrireLaMaquette() {
  const moteur = await lierLeMoteur();
  const fonctions = FONCTIONS_DU_MODELE.map((f) => f.toString()).join('\n\n');
  const donnees = [
    `var GRANDEURS = ${JSON.stringify(GRANDEURS)};`,
    `var ECART_MINIMAL = ${JSON.stringify(ECART_MINIMAL)};`,
    `var REFERENCES = ${JSON.stringify(REFERENCES)};`,
    `var DECISIONS = ${JSON.stringify(DECISIONS)};`,
    `var OUVERTES = ${JSON.stringify(OUVERTES)};`,
  ].join('\n');
  const html = GABARIT({ moteur, fonctions, donnees, app: application.toString() });
  const cible = path.join(ICI, 'MAQUETTE-COLOR-SHIFT.html');
  writeFileSync(cible, html);
  return { cible, octets: Buffer.byteLength(html) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { cible, octets } = await ecrireLaMaquette();
  console.log(`Écrit : ${path.relative(RACINE, cible)} (${Math.round(octets / 1024)} ko)`);
}
