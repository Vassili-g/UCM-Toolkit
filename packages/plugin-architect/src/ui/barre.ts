/**
 * La barre du haut : le produit, la bascule entre l'explorateur de tokens et
 * la vue composant, puis les gestes du mode. Le mode Tokens montre Actualiser,
 * Annuler et Configuration, qui portent sur le relevé et sur les noms des
 * variables. Le mode Composant montre Analyser (Actualiser après la première
 * analyse), le bouton Constats qui ouvre le panneau, et Configuration, sans son
 * mot tant que le panneau est fermé.
 */
import { creerPastilleDeCompte } from 'ucm-plugin-socle/src/ui/Alerte';
import { createSettingsButton } from 'ucm-plugin-socle/src/ui/EnTete';
import type { Disposition } from '../fenetre';
import type { Constat } from '../messages/commun';
import type { Application, Composant } from './application';
import { aDesLiaisonsPreparees, calculEnCours, aPreparer, libraryAChoisir, tonLePlusGrave } from './composant/analyse';
import { TEXTES } from './textes';
import { estHorsUcm } from './vues/horsUcm';

const ESPACE_SVG = 'http://www.w3.org/2000/svg';

/** L'icône d'un panneau latéral : un cadre coupé par un trait vertical. */
function iconeDuPanneau(): SVGSVGElement {
  const svg = document.createElementNS(ESPACE_SVG, 'svg');
  for (const [nom, valeur] of Object.entries({ viewBox: '0 0 16 16', width: '14', height: '14', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'aria-hidden': 'true' })) svg.setAttribute(nom, valeur);
  const cadre = document.createElementNS(ESPACE_SVG, 'rect');
  for (const [nom, valeur] of Object.entries({ x: '1.5', y: '2.5', width: '13', height: '11', rx: '1.5' })) cadre.setAttribute(nom, valeur);
  const trait = document.createElementNS(ESPACE_SVG, 'path');
  trait.setAttribute('d', 'M10 2.5v11');
  svg.append(cadre, trait);
  return svg;
}

const DISPOSITIONS: readonly Disposition[] = ['large', 'etroite'];

export function creerBarre(app: Application): Composant {
  const element = document.createElement('header');
  element.className = 'barre';

  const produit = document.createElement('div');
  produit.className = 'produit';
  const logo = document.createElement('span');
  logo.className = 'logo';
  logo.textContent = TEXTES.marque;
  logo.setAttribute('aria-hidden', 'true');
  const nom = document.createElement('h1');
  nom.className = 'produit-nom';
  nom.textContent = TEXTES.produit;
  produit.append(logo, nom);

  const bascule = document.createElement('div');
  bascule.className = 'bascule';
  bascule.setAttribute('role', 'group');
  bascule.setAttribute('aria-label', TEXTES.modes.etiquette);
  const choix = DISPOSITIONS.map((disposition) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bascule-choix';
    bouton.dataset.mode = disposition;
    bouton.textContent = TEXTES.modes.noms[disposition];
    bouton.title = TEXTES.modes.aides[disposition];
    bouton.addEventListener('click', () => app.changerDisposition(disposition));
    bascule.append(bouton);
    return { disposition, bouton };
  });

  const lecture = document.createElement('div');
  lecture.className = 'barre-lecture';

  const actualiser = document.createElement('button');
  actualiser.type = 'button';
  actualiser.className = 'bouton-discret';
  actualiser.textContent = TEXTES.actualiser;
  actualiser.title = TEXTES.actualiserAide;
  actualiser.addEventListener('click', () => app.actualiser());

  const annuler = document.createElement('button');
  annuler.type = 'button';
  annuler.className = 'bouton-discret';
  annuler.textContent = TEXTES.annuler;
  annuler.addEventListener('click', () => app.annulerLecture());

  const configuration = createSettingsButton(() => app.ouvrirLaConfiguration(), {
    etiquette: TEXTES.configuration,
    infobulle: TEXTES.configurationAide,
    texte: TEXTES.configuration,
  });

  const analyser = document.createElement('button');
  analyser.type = 'button';
  analyser.className = 'btn btn-compact';
  analyser.title = TEXTES.analyserAide;
  const analyserTexte = document.createElement('span');
  analyser.append(analyserTexte);
  analyser.addEventListener('click', () => app.analyser());

  const constats = document.createElement('button');
  constats.type = 'button';
  constats.className = 'btn btn-secondary btn-compact bouton-panneau';
  constats.setAttribute('aria-label', TEXTES.constats);
  const constatsTexte = document.createElement('span');
  constatsTexte.textContent = TEXTES.constats;
  let pastille: HTMLElement | null = null;
  constats.append(iconeDuPanneau(), constatsTexte);
  constats.addEventListener('click', () => app.basculerLePanneau());

  lecture.append(actualiser, annuler, analyser, constats, configuration);
  element.append(produit, bascule, lecture);

  return {
    element,
    mettreAJour() {
      const { etat } = app;
      for (const { disposition, bouton } of choix) bouton.setAttribute('aria-pressed', String(etat.disposition === disposition));
      const composant = etat.disposition === 'etroite';
      element.classList.toggle('barre-panneau-ouvert', etat.panneau.ouvert);
      const enCours = etat.lecture.statut === 'en-cours';
      actualiser.hidden = composant;
      annuler.hidden = composant || !enCours;
      actualiser.disabled = enCours;
      analyser.hidden = !composant || estHorsUcm(etat.architecture);
      constats.hidden = !composant;
      const analyse = etat.analyse;
      const analyseEnCours = analyse !== null && calculEnCours(analyse);
      const dejaAnalyse = analyse !== null && !analyseEnCours;
      analyser.classList.toggle('btn-primary', !dejaAnalyse);
      analyser.classList.toggle('btn-secondary', dejaAnalyse);
      analyserTexte.textContent = dejaAnalyse ? TEXTES.actualiser : TEXTES.analyser;
      // Pas de relance pendant une analyse ni pendant l'écriture d'un lot ; sans library choisie, l'analyse n'a rien à lire.
      analyser.disabled = analyseEnCours || (analyse?.ecriture ?? null) !== null || (!dejaAnalyse && libraryAChoisir(etat));
      constats.setAttribute('aria-pressed', String(etat.panneau.ouvert));
      constats.title = etat.panneau.ouvert ? TEXTES.constatsFermer : TEXTES.constatsOuvrir;
      // La carte « sans tokens » compte comme un constat à corriger, la carte des liaisons préparées comme une information.
      const constatsDuPanneau: Array<Pick<Constat, 'type'>> = analyse === null ? [] : [...analyse.constats, ...(aPreparer(analyse) ? [{ type: 'corriger' as const }] : []), ...(aDesLiaisonsPreparees(analyse) ? [{ type: 'info' as const }] : [])];
      const nombre = analyse && !analyseEnCours ? constatsDuPanneau.length : 0;
      const ton = analyse ? tonLePlusGrave(constatsDuPanneau) : null;
      pastille?.remove();
      pastille = nombre > 0 && ton ? creerPastilleDeCompte(nombre, ton) : null;
      if (pastille) constats.append(pastille);
      const fermee = composant && !etat.panneau.ouvert;
      const motDeLaConfiguration = configuration.querySelector('span');
      if (motDeLaConfiguration) motDeLaConfiguration.hidden = fermee;
      configuration.setAttribute('aria-label', TEXTES.configuration);
    },
  };
}
