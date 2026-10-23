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
  const ajusterResultatPreparation = (): void => {
    const resultatPreparation = preparation.element.hidden && preparation.panneau.classList.contains('prep-rangee');
    const resultatSansCibles = preparation.panneau.classList.contains('prep-sans-cibles');
    const resultatAutreComposant = preparation.panneau.classList.contains('prep-autre') || preparation.panneau.classList.contains('prep-liaisons');
    if (!resultatPreparation) {
      if (resultatSansCibles) {
        constats.element.hidden = true;
        ouvrirPreparation.hidden = true;
        if (preparation.panneau.style.top !== '16px') preparation.panneau.style.top = '16px';
        if (constats.element.classList.contains('prep-resultat')) constats.element.classList.remove('prep-resultat');
        if (constats.element.classList.contains('prep-autre')) constats.element.classList.remove('prep-autre');
        if (preparation.panneau.classList.contains('prep-resultat')) preparation.panneau.classList.remove('prep-resultat');
      } else if (resultatAutreComposant) {
        constats.element.hidden = false;
        constats.element.classList.add('prep-autre');
        if (preparation.panneau.style.top !== '53px') preparation.panneau.style.top = '53px';
        constats.element.querySelector('.onglets')?.remove();
        for (const selecteur of ['#panneau-corrections', '#panneau-questions', '#panneau-a-faire']) constats.element.querySelector(selecteur)?.remove();
        ouvrirPreparation.hidden = true;
      } else if (preparation.element.hidden && (constats.element.classList.contains('prep-resultat') || constats.element.classList.contains('prep-autre') || constats.element.hidden || preparation.panneau.classList.contains('prep-resultat'))) {
        constats.element.hidden = false;
        constats.element.classList.remove('prep-resultat');
        constats.element.classList.remove('prep-autre');
        preparation.panneau.classList.remove('prep-resultat');
        if (preparation.panneau.style.top !== '52px') preparation.panneau.style.top = '52px';
        constats.mettreAJour();
      }
      return;
    }
    constats.element.hidden = false;
    if (constats.element.classList.contains('prep-autre')) constats.element.classList.remove('prep-autre');
    constats.element.querySelector('.onglets')?.remove();
    for (const selecteur of ['#panneau-corrections', '#panneau-questions', '#panneau-a-faire']) constats.element.querySelector(selecteur)?.remove();
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
        const constatSansTokens = etat.analyse?.constats.find((constat) => constat.code === 'C16' && constat.type === 'corriger' && !constat.correction && !constat.question);
        if (constatSansTokens && etat.composant.lecture && etat.analyse) {
          const carte = Array.from(constats.panneauAFaire.querySelectorAll('.bloc-constat')).find((element) => element.querySelector('.bloc-phrase')?.textContent === 'Constat C16.');
          const phrase = carte?.querySelector('.bloc-phrase');
          if (phrase) phrase.textContent = TEXTES_PREPARATION.preparationAlerteTexte(etat.composant.lecture.sujet.nom);
          const meta = carte?.querySelector('.meta');
          if (meta) {
            meta.classList.add('prep-meta');
            const [resume, prochaineEtape] = TEXTES_PREPARATION.preparationAlerteMeta(etat.analyse.variants.length, etat.analyse.lecture?.layersLus ?? etat.composant.lecture.calques.length, etat.composant.lecture.sujet.nom);
            const premiereLigne = document.createElement('span'); premiereLigne.className = 'constat-lieu'; premiereLigne.textContent = resume;
            const secondeLigne = document.createElement('span'); secondeLigne.textContent = prochaineEtape;
            meta.replaceChildren(premiereLigne, secondeLigne);
          }
        }
        ouvrirPreparation.hidden = !etat.composant.lecture || !etat.analyse;
        const resume = panneau.querySelector('.arch-resume');
        const ligneResume = resume?.querySelector('.arch-resume-ligne');
        if (ligneResume && !ligneResume.contains(ouvrirPreparation)) ligneResume.append(ouvrirPreparation);
      }
      else constats.retirerLesLiaisonsDeLaVue();
    },
  };
}
