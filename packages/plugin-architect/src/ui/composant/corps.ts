/**
 * Le corps du mode Composant : la vue seule quand le panneau des constats est
 * fermé, la vue, la frontière et le panneau quand il est ouvert. La frontière
 * se tire à la souris ou aux flèches ; elle change la largeur de la vue, pas
 * celle de la fenêtre. Le panneau ne montre ici que le résumé du composant et
 * ce que l'analyse lira ; ses onglets viennent avec les constats.
 */
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { creerPoigneeDeSeparation } from 'ucm-plugin-socle/src/ui/PoigneeDeSeparation';

import type { Application, Composant } from '../application';
import { TEXTES } from '../textes';
import { analyseDe } from './analyse';
import type { VueComposant } from '../vues/composant';

const T = TEXTES.panneau;

/** Les largeurs que la frontière laisse à la vue et au panneau, en pixels. */
const LARGEUR_MINIMALE_DE_LA_VUE = 320;
const LARGEUR_MINIMALE_DU_PANNEAU = 320;
const PAS_AU_CLAVIER = 24;

const heure = (millisecondes: number): string => new Date(millisecondes).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

export function creerCorpsDuComposant(app: Application, vue: VueComposant): Composant {
  const { etat } = app;
  const element = document.createElement('div');
  element.className = 'arch-corps-composant';

  const poignee = creerPoigneeDeSeparation(TEXTES.frontiereDuPanneau);
  poignee.title = TEXTES.frontiereDuPanneau;
  poignee.tabIndex = 0;
  const panneau = document.createElement('aside');
  panneau.className = 'arch-laterale panneau-lateral';
  panneau.style.flex = '1 1 auto';

  /** La largeur que la vue peut prendre sans écraser le panneau. */
  const borner = (largeur: number): number => Math.max(LARGEUR_MINIMALE_DE_LA_VUE, Math.min(largeur, element.clientWidth - poignee.offsetWidth - LARGEUR_MINIMALE_DU_PANNEAU));

  let geste: { pointeur: number; depart: number; largeur: number } | null = null;
  poignee.addEventListener('pointerdown', (evenement) => {
    if (evenement.button !== 0 || geste) return;
    evenement.preventDefault();
    poignee.setPointerCapture(evenement.pointerId);
    geste = { pointeur: evenement.pointerId, depart: evenement.clientX, largeur: etat.panneau.largeurDeLaVue };
  });
  poignee.addEventListener('pointermove', (evenement) => {
    if (geste?.pointeur === evenement.pointerId) app.poserLaLargeurDeLaVue(borner(geste.largeur + evenement.clientX - geste.depart));
  });
  const finir = (evenement: PointerEvent): void => {
    if (geste?.pointeur === evenement.pointerId) geste = null;
  };
  poignee.addEventListener('pointerup', finir);
  poignee.addEventListener('pointercancel', finir);
  poignee.addEventListener('keydown', (evenement) => {
    const sens = evenement.key === 'ArrowLeft' ? -1 : evenement.key === 'ArrowRight' ? 1 : 0;
    if (sens === 0) return;
    evenement.preventDefault();
    app.poserLaLargeurDeLaVue(borner(etat.panneau.largeurDeLaVue + sens * PAS_AU_CLAVIER));
  });

  /** Le résumé du composant, puis ce que l'analyse lit tant qu'elle n'a pas eu lieu. */
  function contenuDuPanneau(): HTMLElement {
    const { lecture } = etat.composant;
    const colonne = document.createElement('div');
    colonne.className = 'container';
    const pile = document.createElement('div');
    pile.className = 'page-stack';
    colonne.append(pile);
    if (!lecture) return colonne;

    const variants = Math.max(1, lecture.sujet.variants.length);
    const analyse = analyseDe(etat, lecture);
    const enCours = etat.analyse?.statut === 'en-cours';
    const resume = document.createElement('div');
    resume.className = 'arch-resume';
    const ligne = document.createElement('div');
    ligne.className = 'arch-resume-ligne';
    const titre = document.createElement('span');
    titre.className = 'arch-resume-titre';
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = T.resume(variants, analyse ? T.analyseA(heure(analyse.recueA)) : enCours ? T.enCours : T.pasAnalyse);
    titre.append(`${lecture.sujet.nom} `, meta);
    ligne.append(titre);
    resume.append(ligne);
    pile.append(resume);
    if (!analyse && !enCours) pile.append(creerAlerte('info', { texte: T.avantAnalyse(variants, lecture.sujet.nom), meta: T.duree }));
    return colonne;
  }

  return {
    element,
    mettreAJour() {
      const { ouvert, largeurDeLaVue } = etat.panneau;
      vue.element.style.width = ouvert ? `${largeurDeLaVue}px` : '100%';
      const enfants = ouvert ? [vue.element, poignee, panneau] : [vue.element];
      // Remettre la vue en place lui ferait perdre son défilement : la structure ne se refait que si elle change.
      if (element.children.length !== enfants.length || enfants.some((enfant, rang) => element.children[rang] !== enfant)) element.replaceChildren(...enfants);
      if (ouvert) panneau.replaceChildren(contenuDuPanneau());
    },
  };
}
