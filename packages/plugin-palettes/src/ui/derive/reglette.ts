/**
 * Une réglette bornée par une limite dynamique ([DER-21], [UI-12]) : un
 * libellé, un champ, une piste peinte par le moteur et son pouce, puis un
 * bouton qui ramène la valeur de départ. Au-delà des bornes permises, la
 * piste est hachurée, et le pouce s'arrête sur la borne. Le Color shift et la
 * carte « Réglage global » l'emploient.
 *
 * Le curseur est un élément `role="slider"` : `aria-valuemin` et
 * `aria-valuemax` portent les bornes permises, que le clavier atteint par
 * Origine et Fin ([DER-09]). Le glisser se suit sur le document : dans Figma,
 * un mouvement arrive avec `buttons` à 0 et Chromium retire alors la capture,
 * si bien que le pointeur quitte la piste sans finir le geste. Le geste finit
 * au relâcher, n'importe où dans le document, ou à la sortie de la fenêtre.
 * Échap l'abandonne : le pouce garde la valeur d'avant jusqu'au relâcher.
 */
import { arrondir } from 'ucm-couleur';

import { lireTexte, memoriserVues, type Localisation, type Texte } from '../localisation';

/** Deux bornes, basse et haute. */
export interface Intervalle {
  readonly bas: number;
  readonly haut: number;
}

/** Un repère posé sur la piste : la valeur Tailwind, la saturation de la référence, l'autre profil. */
export interface RepereDeReglette {
  readonly valeur: number;
  readonly classe: 'reglette-repere' | 'repere-de-reference' | 'fantome-du-profil';
  readonly titre: Texte;
  /** La lettre posée au-dessus du repère : l'initiale de l'autre profil. */
  readonly lettre?: Texte;
}

/** Ce que la réglette montre ; l'appelant le pose à chaque rendu. */
export interface EtatDeLaReglette {
  readonly valeur: number;
  /** Les bornes fixes, qui font la longueur de la piste. */
  readonly bornes: Intervalle;
  /** Les bornes de la limite dynamique ; `null` tant qu'elle se calcule, la piste entière. */
  readonly permises: Intervalle | null;
  readonly pas: number;
  readonly grandPas: number;
  /** Le dégradé CSS de la piste. */
  readonly piste: string;
  /** Le texte du champ. */
  readonly texte: Texte;
  /** Le nom du curseur et du champ. */
  readonly etiquette: Texte;
  /** Ce que le curseur annonce : la valeur et la plage sûre. */
  readonly annonce: Texte;
  readonly reperes: readonly RepereDeReglette[];
  readonly desactivee: boolean;
  /** Une valeur rangée hors de sa plage sûre ([DER-23]) : le pouce se lit hachuré. */
  readonly horsDeLaPlage: boolean;
  /** Le bouton qui ramène la valeur de départ, « Tailwind » ou « Rétablir ». */
  readonly bouton: { readonly texte: Texte; readonly etiquette: Texte; readonly inactif: boolean };
}

/** Ce que la réglette demande à son appelant. */
export interface GestesDeLaReglette {
  /** Un geste commence : une limite en cours de calcul se termine avant lui. */
  commencer(): void;
  previsualiser(valeur: number): void;
  valider(valeur: number): void;
  /** Échap pendant un geste : l'appelant rend la palette d'avant. */
  annuler(): void;
  /** Le bouton, ou un double-clic sur la piste. */
  retablir(): void;
  /** La valeur d'une saisie, ou `null` quand elle ne se lit pas. */
  lire(saisie: string): number | null;
  /** Un geste a demandé une valeur au-delà d'une borne permise, et la réglette a posé la borne. */
  buter(cote: keyof Intervalle): void;
}

export interface RegletteUi {
  readonly element: HTMLDivElement;
  readonly curseur: HTMLDivElement;
  poser(etat: EtatDeLaReglette): void;
}

/** Le nombre de décimales d'un pas : 0 pour 1, 2 pour 0,01, 3 pour 0,005. */
const decimalesDu = (pas: number): number => Math.max(0, Math.ceil(-Math.log10(pas) - 1e-9));

function construireVues(i18n: Localisation) {
  /** `libelle` : le nom de la rangée, à gauche du champ ; `suffixe` suit le champ, comme la teinte absolue. */
  function createReglette(libelle: Texte, gestes: GestesDeLaReglette, suffixe?: HTMLElement): RegletteUi {
    const element = document.createElement('div');
    element.className = 'reglette';
    const nom = document.createElement('span');
    nom.className = 'field-label';
    i18n.lier(nom, 'textContent', libelle);
    const champ = document.createElement('input');
    champ.type = 'text';
    champ.inputMode = 'decimal';
    champ.spellcheck = false;
    champ.className = 'input champ-nombre';

    const curseur = document.createElement('div');
    curseur.className = 'reglette-curseur';
    curseur.setAttribute('role', 'slider');
    curseur.tabIndex = 0;
    const piste = document.createElement('span');
    piste.className = 'reglette-piste';
    const course = document.createElement('span');
    course.className = 'reglette-course';
    const interditBas = document.createElement('span');
    interditBas.className = 'reglette-interdit reglette-interdit-bas';
    const interditHaut = document.createElement('span');
    interditHaut.className = 'reglette-interdit reglette-interdit-haut';
    const pouce = document.createElement('span');
    pouce.className = 'reglette-pouce';
    course.append(interditBas, interditHaut, pouce);
    curseur.append(piste, course);

    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bouton-discret';
    bouton.addEventListener('click', () => gestes.retablir());
    curseur.addEventListener('dblclick', () => {
      if (!etat?.desactivee) gestes.retablir();
    });
    element.append(nom, champ, ...(suffixe ? [suffixe] : []), curseur, bouton);

    let etat: EtatDeLaReglette | null = null;
    let reperes: HTMLSpanElement[] = [];
    /** Le geste en cours : clavier, saisie ou glisser, la valeur et le texte d'avant, et le pointeur du glisser. */
    let geste: { avant: number; texte: Texte; pointeur: number | null } | null = null;
    let abandonne = false;
    /** La valeur que montre le pouce pendant un geste. */
    let enCours: number | null = null;

    const permises = (): Intervalle => etat?.permises ?? etat?.bornes ?? { bas: 0, haut: 0 };

    /**
     * La valeur bornée par les bornes permises. Le pointeur se pose au pas ;
     * le clavier avance d'un pas depuis la valeur, et une saisie garde ses
     * décimales ([DER-08]). `butee` dit quel côté l'a arrêtée.
     */
    function borner(valeur: number, auPas: boolean): { valeur: number; butee: keyof Intervalle | null } {
      if (!etat) return { valeur, butee: null };
      const { bas, haut } = permises();
      const auPasPres = auPas ? arrondir(Math.round(valeur / etat.pas) * etat.pas, decimalesDu(etat.pas)) : arrondir(valeur, 6);
      if (auPasPres < bas) return { valeur: bas, butee: bas > etat.bornes.bas ? 'bas' : null };
      if (auPasPres > haut) return { valeur: haut, butee: haut < etat.bornes.haut ? 'haut' : null };
      return { valeur: auPasPres, butee: null };
    }

    const position = (valeur: number): number => {
      if (!etat) return 0;
      const { bas, haut } = etat.bornes;
      return ((Math.min(haut, Math.max(bas, valeur)) - bas) / (haut - bas)) * 100;
    };

    function placerLePouce(valeur: number): void {
      pouce.style.left = `${position(valeur)}%`;
      curseur.setAttribute('aria-valuenow', String(valeur));
    }

    function commencer(pointeur: number | null): void {
      if (!etat) return;
      gestes.commencer();
      geste = { avant: etat.valeur, texte: etat.texte, pointeur };
      abandonne = false;
    }

    /** Une valeur demandée pendant un geste : bornée, montrée, prévisualisée. */
    function demander(valeur: number, auPas = false): void {
      if (!etat || abandonne) return;
      const { valeur: bornee, butee } = borner(valeur, auPas);
      if (butee) gestes.buter(butee);
      if (bornee === enCours) return;
      enCours = bornee;
      placerLePouce(bornee);
      gestes.previsualiser(bornee);
    }

    function finir(): void {
      const fini = geste;
      geste = null;
      const valeur = enCours;
      enCours = null;
      if (!fini || abandonne) {
        abandonne = false;
        return;
      }
      if (valeur === null || valeur === fini.avant) {
        if (valeur !== null) gestes.annuler();
        return;
      }
      gestes.valider(valeur);
    }

    function valeurSousLePointeur(evenement: PointerEvent): number {
      if (!etat) return 0;
      const cadre = course.getBoundingClientRect();
      const rapport = cadre.width > 0 ? Math.min(1, Math.max(0, (evenement.clientX - cadre.left) / cadre.width)) : 0;
      return etat.bornes.bas + rapport * (etat.bornes.haut - etat.bornes.bas);
    }

    function bouger(evenement: PointerEvent): void {
      if (geste?.pointeur === evenement.pointerId) demander(valeurSousLePointeur(evenement), true);
    }

    function relacher(evenement: PointerEvent): void {
      if (geste?.pointeur === evenement.pointerId) arreterLeGlisser();
    }

    /** Le pointeur quitte la fenêtre sans capture : le relâcher n'y serait pas vu. */
    function sortir(evenement: PointerEvent): void {
      if (geste?.pointeur !== evenement.pointerId || evenement.relatedTarget !== null) return;
      if (!curseur.hasPointerCapture(evenement.pointerId)) arreterLeGlisser();
    }

    function arreterLeGlisser(): void {
      window.removeEventListener('pointermove', bouger, true);
      window.removeEventListener('pointerup', relacher, true);
      window.removeEventListener('pointercancel', relacher, true);
      document.removeEventListener('pointerout', sortir, true);
      finir();
    }

    curseur.addEventListener('pointerdown', (evenement) => {
      if (evenement.button !== 0 || !etat || etat.desactivee) return;
      evenement.preventDefault();
      curseur.focus({ preventScroll: true });
      curseur.setPointerCapture(evenement.pointerId);
      commencer(evenement.pointerId);
      window.addEventListener('pointermove', bouger, true);
      window.addEventListener('pointerup', relacher, true);
      window.addEventListener('pointercancel', relacher, true);
      document.addEventListener('pointerout', sortir, true);
      demander(valeurSousLePointeur(evenement), true);
    });

    curseur.addEventListener('keydown', (evenement) => {
      if (!etat || etat.desactivee) return;
      if (evenement.key === 'Escape') {
        if (!geste) return;
        evenement.preventDefault();
        abandonne = true;
        enCours = null;
        placerLePouce(geste.avant);
        gestes.annuler();
        return;
      }
      const saut = evenement.shiftKey ? etat.grandPas : etat.pas;
      const depart = enCours ?? etat.valeur;
      const cibles: Record<string, number> = {
        ArrowUp: depart + saut,
        ArrowRight: depart + saut,
        ArrowDown: depart - saut,
        ArrowLeft: depart - saut,
        PageUp: depart + etat.grandPas,
        PageDown: depart - etat.grandPas,
        Home: permises().bas,
        End: permises().haut,
      };
      const cible = cibles[evenement.key];
      if (cible === undefined || geste?.pointeur) return;
      evenement.preventDefault();
      commencer(null);
      demander(cible);
      finir();
    });

    champ.addEventListener('input', () => {
      if (!etat) return;
      const valeur = gestes.lire(champ.value);
      const { bas, haut } = permises();
      if (valeur === null || valeur < bas || valeur > haut) return;
      if (!geste) commencer(null);
      demander(valeur);
    });
    champ.addEventListener('change', () => {
      if (!etat) return;
      const valeur = gestes.lire(champ.value);
      if (valeur === null) {
        champ.value = lireTexte(etat.texte);
        return;
      }
      if (!geste) commencer(null);
      demander(valeur);
      finir();
    });
    champ.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Escape' || !geste || !etat) return;
      evenement.preventDefault();
      abandonne = true;
      enCours = null;
      placerLePouce(geste.avant);
      champ.value = lireTexte(geste.texte);
      gestes.annuler();
    });

    return {
      element,
      curseur,
      poser(suivant) {
        etat = suivant;
        const { bas, haut } = permises();
        piste.style.background = suivant.piste;
        if (geste === null) placerLePouce(suivant.valeur);
        if (document.activeElement !== champ) champ.value = lireTexte(suivant.texte);
        i18n.lier(champ, 'aria-label', suivant.etiquette);
        i18n.lier(curseur, 'aria-label', suivant.etiquette);
        i18n.lier(curseur, 'aria-valuetext', suivant.annonce);
        curseur.setAttribute('aria-valuemin', String(bas));
        curseur.setAttribute('aria-valuemax', String(haut));
        curseur.setAttribute('aria-disabled', String(suivant.desactivee));
        curseur.tabIndex = suivant.desactivee ? -1 : 0;
        champ.disabled = suivant.desactivee;
        curseur.dataset.horsDeLaPlage = String(suivant.horsDeLaPlage);
        interditBas.hidden = bas <= suivant.bornes.bas;
        interditBas.style.width = `calc(${position(bas)}% + 7px)`;
        interditHaut.hidden = haut >= suivant.bornes.haut;
        interditHaut.style.left = `${position(haut)}%`;
        interditHaut.style.width = `calc(${100 - position(haut)}% + 7px)`;
        i18n.lier(bouton, 'textContent', suivant.bouton.texte);
        i18n.lier(bouton, 'aria-label', suivant.bouton.etiquette);
        bouton.disabled = suivant.desactivee || suivant.bouton.inactif;
        // Les repères se recréent : leur nombre change avec la cible du réglage global.
        for (const ancien of reperes) ancien.remove();
        reperes = suivant.reperes.map((repere) => {
          const marque = document.createElement('span');
          // Une classe littérale par nature de repère : la loi des styles lit les classes posées dans le texte.
          if (repere.classe === 'fantome-du-profil') marque.className = 'fantome-du-profil';
          else if (repere.classe === 'repere-de-reference') marque.className = 'reglette-repere repere-de-reference';
          else marque.className = 'reglette-repere';
          marque.setAttribute('aria-hidden', 'true');
          marque.style.left = `${position(repere.valeur)}%`;
          i18n.lier(marque, 'title', repere.titre);
          if (repere.lettre) i18n.lier(marque, 'textContent', repere.lettre);
          course.insertBefore(marque, pouce);
          return marque;
        });
      },
    };
  }

  return { createReglette };
}

export const creerVuesReglette = memoriserVues(construireVues);
