/**
 * Le corps du mode Composant : la vue seule quand le panneau des constats est
 * fermé, la vue, la frontière et le panneau quand il est ouvert. La frontière
 * se tire à la souris ou aux flèches ; elle change la largeur de la vue, pas
 * celle de la fenêtre. Le panneau est celui de `../analyse`.
 */
import { creerPoigneeDeSeparation } from 'ucm-plugin-socle/src/ui/PoigneeDeSeparation';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import type { Application, Composant } from '../application';
import { TEXTES } from '../textes';
import { monterLePanneau } from '../analyse';
import { analyseDuComposant, aPreparer } from './analyse';
import type { VueComposant } from '../vues/composant';
import type { Preparation } from '../preparation';
import { TEXTES_PREPARATION } from '../textes/preparation';

/** Les largeurs que la frontière laisse à la vue et au panneau, en pixels. */
const LARGEUR_MINIMALE_DE_LA_VUE = 320;
const LARGEUR_MINIMALE_DU_PANNEAU = 320;
const PAS_AU_CLAVIER = 24;

export function creerCorpsDuComposant(app: Application, vue: VueComposant, preparation: Preparation): Composant {
  const { etat } = app;
  const element = document.createElement('div');
  element.className = 'arch-corps-composant';

  const poignee = creerPoigneeDeSeparation(TEXTES.frontiereDuPanneau);
  poignee.title = TEXTES.frontiereDuPanneau;
  poignee.tabIndex = 0;
  const panneau = document.createElement('aside');
  panneau.className = 'arch-laterale panneau-lateral';
  panneau.style.flex = '1 1 auto';
  panneau.style.position = 'relative';
  preparation.panneau.style.position = 'absolute';
  preparation.panneau.style.top = '52px';
  preparation.panneau.style.left = '16px';
  preparation.panneau.style.right = '16px';
  preparation.panneau.style.margin = '0';
  const ouvrirPreparation = createButton({ label: TEXTES_PREPARATION.preparationOuvrirBouton, variant: 'secondary', compact: true, onClick: () => { constats.panneauAFaire.hidden = true; preparation.ouvrir(); } });
  ouvrirPreparation.classList.add('prep-ouvrir');

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

  const constats = monterLePanneau(app, vue);
  const cacherSiNecessaire = (cible: HTMLElement, cacher: boolean): void => {
    if (cible.hidden !== cacher) cible.hidden = cacher;
  };
  const classeSiNecessaire = (cible: Element, classe: string, ajouter: boolean): void => {
    if (cible.classList.contains(classe) !== ajouter) cible.classList.toggle(classe, ajouter);
  };
  let ongletsMasques = false;
  const ajusterResultatPreparation = (): void => {
    const resultatPreparation = preparation.element.hidden && preparation.panneau.classList.contains('prep-rangee');
    const resultatColler = preparation.panneau.classList.contains('prep-mode-colle');
    const resultatSansCibles = preparation.panneau.classList.contains('prep-sans-cibles');
    const resultatAutreComposant = preparation.panneau.classList.contains('prep-autre');
    const resultatLiaisons = preparation.panneau.classList.contains('prep-liaisons');
    if (!resultatPreparation) {
      const onglets = constats.element.querySelector<HTMLElement>('.onglets');
      const panneaux = ['#panneau-corrections', '#panneau-questions', '#panneau-a-faire']
        .map((selecteur) => constats.element.querySelector<HTMLElement>(selecteur));
      if (resultatAutreComposant) {
        if (onglets) cacherSiNecessaire(onglets, true);
        for (const element of panneaux) if (element) cacherSiNecessaire(element, true);
        ongletsMasques = true;
      } else if (ongletsMasques) {
        ongletsMasques = false;
        if (onglets) cacherSiNecessaire(onglets, false);
        for (const element of panneaux) if (element) cacherSiNecessaire(element, false);
        constats.mettreAJour();
      }
      if (resultatColler) {
        cacherSiNecessaire(constats.element, true);
        cacherSiNecessaire(ouvrirPreparation, true);
        if (constats.element.classList.contains('prep-resultat')) constats.element.classList.remove('prep-resultat');
        classeSiNecessaire(constats.element, 'prep-autre', false);
        if (preparation.panneau.style.top !== '12px') preparation.panneau.style.top = '12px';
      } else if (resultatSansCibles) {
        cacherSiNecessaire(constats.element, true);
        cacherSiNecessaire(ouvrirPreparation, true);
        if (preparation.panneau.style.top !== '16px') preparation.panneau.style.top = '16px';
        if (constats.element.classList.contains('prep-resultat')) constats.element.classList.remove('prep-resultat');
        if (constats.element.classList.contains('prep-autre')) constats.element.classList.remove('prep-autre');
        if (preparation.panneau.classList.contains('prep-resultat')) preparation.panneau.classList.remove('prep-resultat');
      } else if (resultatAutreComposant) {
        cacherSiNecessaire(constats.element, false);
        classeSiNecessaire(constats.element, 'prep-autre', true);
        if (preparation.panneau.style.top !== '53px') preparation.panneau.style.top = '53px';
        cacherSiNecessaire(ouvrirPreparation, true);
      } else if (resultatLiaisons) {
        cacherSiNecessaire(constats.element, false);
        if (constats.element.classList.contains('prep-resultat')) constats.element.classList.remove('prep-resultat');
        classeSiNecessaire(constats.element, 'prep-autre', false);
        if (!constats.element.classList.contains('constats-preparation-liaisons')) constats.element.classList.add('constats-preparation-liaisons');
        if (preparation.panneau.classList.contains('prep-resultat')) preparation.panneau.classList.remove('prep-resultat');
        if (preparation.panneau.style.top !== '52px') preparation.panneau.style.top = '52px';
        cacherSiNecessaire(ouvrirPreparation, true);
      } else if (preparation.element.hidden && (constats.element.classList.contains('prep-resultat') || constats.element.classList.contains('prep-autre') || constats.element.classList.contains('constats-preparation-liaisons') || constats.element.hidden || preparation.panneau.classList.contains('prep-resultat'))) {
        cacherSiNecessaire(constats.element, false);
        if (constats.element.classList.contains('prep-resultat')) constats.element.classList.remove('prep-resultat');
        classeSiNecessaire(constats.element, 'prep-autre', false);
        if (constats.element.classList.contains('constats-preparation-liaisons')) constats.element.classList.remove('constats-preparation-liaisons');
        if (preparation.panneau.classList.contains('prep-resultat')) preparation.panneau.classList.remove('prep-resultat');
        if (preparation.panneau.style.top !== '52px') preparation.panneau.style.top = '52px';
      }
      return;
    }
    cacherSiNecessaire(constats.element, false);
    classeSiNecessaire(constats.element, 'prep-autre', false);
    const onglets = constats.element.querySelector<HTMLElement>('.onglets');
    const panneaux = ['#panneau-corrections', '#panneau-questions', '#panneau-a-faire']
      .map((selecteur) => constats.element.querySelector<HTMLElement>(selecteur));
    if (onglets) cacherSiNecessaire(onglets, true);
    for (const element of panneaux) if (element) cacherSiNecessaire(element, true);
    ongletsMasques = true;
    ouvrirPreparation.remove();
    preparation.panneau.querySelector('.prep-coller')?.remove();
    if (!constats.element.classList.contains('prep-resultat')) constats.element.classList.add('prep-resultat');
    if (!preparation.panneau.classList.contains('prep-resultat')) preparation.panneau.classList.add('prep-resultat');
  };
  const observateurPreparation = new MutationObserver(ajusterResultatPreparation);
  observateurPreparation.observe(preparation.panneau, { attributes: true, childList: true, subtree: true });
  observateurPreparation.observe(preparation.element, { attributes: true });
  preparation.element.querySelector('.feuille-fermer')?.addEventListener('click', () => { constats.panneauAFaire.hidden = false; });
  panneau.append(preparation.panneau, constats.element);

  return {
    element,
    mettreAJour() {
      const { ouvert, largeurDeLaVue } = etat.panneau;
      vue.element.style.width = ouvert ? `${largeurDeLaVue}px` : '100%';
      const enfants = ouvert ? [vue.element, poignee, panneau] : [vue.element];
      // Remettre la vue en place lui ferait perdre son défilement : la structure ne se refait que si elle change.
      if (element.children.length !== enfants.length || enfants.some((enfant, rang) => element.children[rang] !== enfant)) element.replaceChildren(...enfants);
      if (ouvert) {
        constats.mettreAJour();
        ajusterResultatPreparation();
        ouvrirPreparation.hidden = !aPreparer(analyseDuComposant(etat, etat.composant.lecture));
        const resume = panneau.querySelector('.arch-resume');
        const ligneResume = resume?.querySelector('.arch-resume-ligne');
        if (ligneResume && !ligneResume.contains(ouvrirPreparation)) ligneResume.append(ouvrirPreparation);
      }
      else constats.retirerLesLiaisonsDeLaVue();
    },
  };
}
