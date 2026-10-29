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
const LARGEUR_MINIMALE_DE_LA_VUE = 500;
const LARGEUR_MINIMALE_DU_PANNEAU = 640;
const PAS_AU_CLAVIER = 24;

/** Le corps du mode Composant, avec la place de la Configuration : l'hôte prend celle de la vue, ou celle du panneau quand il est ouvert. */
export interface CorpsDuComposant extends Composant {
  /** Pose l'hôte de la Configuration à la place du contenu, ou `null` pour rendre la vue et le panneau tels qu'ils étaient. */
  poserConfiguration(hote: HTMLElement | null): void;
  /** La sélection de Figma a changé : le panneau des constats ne tient plus ses layers pour sélectionnés. */
  oublierLaSelection(): void;
}

export function creerCorpsDuComposant(app: Application, vue: VueComposant, preparation: Preparation): CorpsDuComposant {
  const { etat } = app;
  const element = document.createElement('div');
  element.className = 'arch-corps-composant';
  const zoneDeLaVue = document.createElement('div');
  zoneDeLaVue.className = 'arch-zone-vue';
  zoneDeLaVue.append(vue.element);
  let hoteDeConfiguration: HTMLElement | null = null;
  /** Le défilement que la vue et le panneau avaient avant la Configuration : un `display: none` le perd. */
  let defilement: { vue: number; panneau: number } | null = null;

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
  const ouvrirPreparation = createButton({ label: TEXTES_PREPARATION.preparationOuvrirBouton, variant: 'secondary', compact: true, onClick: () => { constats.liste.hidden = true; preparation.ouvrir(); } });
  ouvrirPreparation.classList.add('prep-ouvrir');

  /** La largeur que la vue peut prendre sans écraser le panneau. */
  const borner = (largeur: number): number => Math.max(LARGEUR_MINIMALE_DE_LA_VUE, Math.min(largeur, element.clientWidth - poignee.offsetWidth - LARGEUR_MINIMALE_DU_PANNEAU));

  let geste: { pointeur: number; depart: number; largeur: number } | null = null;
  poignee.addEventListener('pointerdown', (evenement) => {
    if (evenement.button !== 0 || geste) return;
    evenement.preventDefault();
    geste = { pointeur: evenement.pointerId, depart: evenement.clientX, largeur: etat.panneau.largeurDeLaVue };
    document.documentElement.classList.add('reglage-en-cours');
    window.addEventListener('pointermove', bouger, true);
    window.addEventListener('pointerup', relacher, true);
    window.addEventListener('pointercancel', relacher, true);
    document.addEventListener('pointerout', sortir, true);
  });
  const bouger = (evenement: PointerEvent): void => {
    if (geste?.pointeur === evenement.pointerId) app.poserLaLargeurDeLaVue(borner(geste.largeur + evenement.clientX - geste.depart));
  };
  const finir = (): void => {
    geste = null;
    document.documentElement.classList.remove('reglage-en-cours');
    window.removeEventListener('pointermove', bouger, true);
    window.removeEventListener('pointerup', relacher, true);
    window.removeEventListener('pointercancel', relacher, true);
    document.removeEventListener('pointerout', sortir, true);
  };
  const relacher = (evenement: PointerEvent): void => {
    if (geste?.pointeur === evenement.pointerId) finir();
  };
  const sortir = (evenement: PointerEvent): void => {
    if (geste?.pointeur === evenement.pointerId && evenement.relatedTarget === null) finir();
  };
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
  let elementsMasques = false;
  const ajusterResultatPreparation = (): void => {
    const resultatPreparation = preparation.element.hidden && preparation.panneau.classList.contains('prep-rangee');
    const resultatColler = preparation.panneau.classList.contains('prep-mode-colle');
    const resultatSansCibles = preparation.panneau.classList.contains('prep-sans-cibles');
    const resultatAutreComposant = preparation.panneau.classList.contains('prep-autre');
    const resultatLiaisons = preparation.panneau.classList.contains('prep-liaisons');
    if (!resultatPreparation) {
      if (resultatAutreComposant) {
        cacherSiNecessaire(constats.sommaire, true);
        cacherSiNecessaire(constats.liste, true);
        elementsMasques = true;
      } else if (elementsMasques) {
        elementsMasques = false;
        cacherSiNecessaire(constats.sommaire, false);
        cacherSiNecessaire(constats.liste, false);
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
    cacherSiNecessaire(constats.sommaire, true);
    cacherSiNecessaire(constats.liste, true);
    elementsMasques = true;
    ouvrirPreparation.remove();
    preparation.panneau.querySelector('.prep-coller')?.remove();
    if (!constats.element.classList.contains('prep-resultat')) constats.element.classList.add('prep-resultat');
    if (!preparation.panneau.classList.contains('prep-resultat')) preparation.panneau.classList.add('prep-resultat');
  };
  const observateurPreparation = new MutationObserver(ajusterResultatPreparation);
  observateurPreparation.observe(preparation.panneau, { attributes: true, childList: true, subtree: true });
  observateurPreparation.observe(preparation.element, { attributes: true });
  preparation.element.querySelector('.feuille-fermer')?.addEventListener('click', () => { constats.liste.hidden = false; });
  panneau.append(preparation.panneau, constats.element);

  const defilementDeLaVue = (): HTMLElement | null => vue.element.querySelector('.vc-corps');

  const corps: CorpsDuComposant = {
    element,
    poserConfiguration(hote) {
      if (hote !== null && hoteDeConfiguration === null) {
        defilement = { vue: defilementDeLaVue()?.scrollTop ?? 0, panneau: panneau.scrollTop };
      }
      const ferme = hote === null && hoteDeConfiguration !== null;
      hoteDeConfiguration = hote;
      corps.mettreAJour();
      if (hote !== null) panneau.scrollTop = 0;
      if (ferme && defilement !== null) {
        const corpsDeLaVue = defilementDeLaVue();
        if (corpsDeLaVue) corpsDeLaVue.scrollTop = defilement.vue;
        panneau.scrollTop = defilement.panneau;
        defilement = null;
      }
    },
    oublierLaSelection: () => constats.oublierLaSelection(),
    mettreAJour() {
      const { ouvert, largeurDeLaVue } = etat.panneau;
      zoneDeLaVue.style.width = ouvert ? `${largeurDeLaVue}px` : '100%';
      vue.element.style.width = '100%';
      const configurationDansLaVue = hoteDeConfiguration !== null && !ouvert;
      zoneDeLaVue.classList.toggle('panneau-lateral', configurationDansLaVue);
      vue.element.style.display = configurationDansLaVue ? 'none' : '';
      constats.element.style.display = hoteDeConfiguration !== null && ouvert ? 'none' : '';
      preparation.panneau.style.display = hoteDeConfiguration !== null && ouvert ? 'none' : '';
      if (hoteDeConfiguration !== null) (ouvert ? panneau : zoneDeLaVue).append(hoteDeConfiguration);
      const enfants = ouvert ? [zoneDeLaVue, poignee, panneau] : [zoneDeLaVue];
      // Remettre la vue en place lui ferait perdre son défilement : la structure ne se refait que si elle change.
      if (element.children.length !== enfants.length || enfants.some((enfant, rang) => element.children[rang] !== enfant)) element.replaceChildren(...enfants);
      if (ouvert && hoteDeConfiguration === null) {
        constats.mettreAJour();
        ajusterResultatPreparation();
        ouvrirPreparation.hidden = !aPreparer(analyseDuComposant(etat, etat.composant.lecture));
        const resume = panneau.querySelector('.arch-resume');
        const ligneResume = resume?.querySelector('.arch-resume-ligne');
        if (ligneResume && !ligneResume.contains(ouvrirPreparation)) ligneResume.append(ouvrirPreparation);
      }
      else if (!ouvert) constats.retirerLesLiaisonsDeLaVue();
    },
  };
  return corps;
}
