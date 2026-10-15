/**
 * Une réglette bornée par une limite dynamique ([DER-21], [UI-12]) : un
 * libellé, un champ, une piste peinte par le moteur et son pouce, puis un
 * bouton qui ramène la valeur de départ. Au-delà des bornes permises, la
 * piste est hachurée, et le pouce s'arrête sur la borne. Le Color shift et la
 * carte « Réglage global » l'emploient.
 *
 * Une réglette peut porter sa valeur par défaut ([UI-38]) : une marque sur la
 * piste, le libellé de la marque quand le pouce s'en éloigne de plus de 4
 * points de la course, deux mots aux bouts de la piste, une pastille après son
 * nom quand la valeur est modifiée. Un bout que le libellé chevauche se masque.
 * Harmonisation ([UI-42]) y ajoute des zones hachurées, où la palette réglée
 * est trop proche d'une autre, et un point par autre palette cochée.
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
  /** Le nom posé au-dessus du repère : celui de l'autre profil. */
  readonly nom?: Texte;
}

/** Une suite de valeurs où la palette réglée est trop proche d'une autre ([UI-42]). */
export interface ZoneDeReglette {
  readonly debut: number;
  readonly fin: number;
  readonly titre: Texte;
}

/** La valeur d'une autre palette cochée, et la couleur de son point ([UI-42]). */
export interface MarqueDePalette {
  readonly valeur: number;
  readonly couleur: string;
  readonly titre: Texte;
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
  /** Les zones trop proches, hachurées sur la piste ; le champ porte un cerne tant que la valeur y tombe, à 0,5 près. */
  readonly zones?: readonly ZoneDeReglette[];
  /** Un point au-dessus de la course par autre palette cochée. */
  readonly marques?: readonly MarqueDePalette[];
  /** La valeur par défaut : sa marque sur la piste, son survol, et le libellé qu'elle porte quand le pouce s'en éloigne. */
  readonly defaut?: { readonly valeur: number; readonly titre: Texte; readonly libelle: Texte };
  /** Les mots des deux bouts de la piste. */
  readonly bouts?: { readonly gauche: Texte; readonly droite: Texte };
  /** La valeur s'écarte de son défaut : une pastille suit le nom de la réglette. */
  readonly modifiee?: boolean;
  readonly desactivee: boolean;
  /** Une valeur rangée hors de sa plage sûre ([DER-23]) : le pouce se lit hachuré. */
  readonly horsDeLaPlage: boolean;
  /** Le bouton qui ramène la valeur de départ, « Tailwind » ou « Par défaut ». */
  readonly bouton: { readonly texte: Texte; readonly etiquette: Texte; readonly inactif: boolean; readonly titre?: Texte };
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

/** Une valeur à 0,5 de la zone en fait encore partie : c'est la largeur dont la zone déborde à chaque bout. */
const DEBORD_DE_LA_ZONE = 0.5;

/** Le libellé de la marque paraît quand le pouce s'en écarte de plus de 4 points de la course. */
const ECART_DU_LIBELLE = 4;
/** Un bout de piste se masque quand le libellé le frôle à moins de 6 px. */
const MARGE_DU_LIBELLE = 6;

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
    const pastille = document.createElement('span');
    pastille.className = 'pastille-reglee';
    pastille.setAttribute('aria-hidden', 'true');
    nom.append(pastille);
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
    const marque = document.createElement('span');
    marque.className = 'reglette-defaut';
    const legende = document.createElement('span');
    legende.className = 'reglette-legende';
    const boutGauche = document.createElement('span');
    boutGauche.className = 'reglette-bout gauche';
    const boutDroit = document.createElement('span');
    boutDroit.className = 'reglette-bout droite';
    // La marque précède le pouce dans le DOM : le pouce passe dessus.
    course.append(interditBas, interditHaut, marque, pouce, legende, boutGauche, boutDroit);
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
    /** La valeur que montre le pouce : celle de l'état, ou celle du geste en cours. */
    let affichee = 0;
    let titreDuBouton = false;
    let reperes: HTMLSpanElement[] = [];
    let zones: HTMLSpanElement[] = [];
    let marques: HTMLSpanElement[] = [];
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

    /** Le champ porte un cerne tant que la valeur montrée tombe dans une zone trop proche. */
    function marquerLeChamp(valeur: number): void {
      champ.classList.toggle('champ-proche', etat?.zones?.some(({ debut, fin }) => valeur >= debut - DEBORD_DE_LA_ZONE && valeur <= fin + DEBORD_DE_LA_ZONE) ?? false);
    }

    function placerLePouce(valeur: number): void {
      affichee = valeur;
      pouce.style.left = `${position(valeur)}%`;
      curseur.setAttribute('aria-valuenow', String(valeur));
      legende.hidden = !etat?.defaut || Math.abs(position(valeur) - position(etat.defaut.valeur)) <= ECART_DU_LIBELLE;
      marquerLeChamp(valeur);
    }

    /** Masque le bout de piste que le libellé de la marque chevauche, à 6 px près. Sans mise en page, les boîtes sont vides : rien ne se masque. */
    function eviter(): void {
      const boite = legende.hidden ? null : legende.getBoundingClientRect();
      for (const bout of [boutGauche, boutDroit]) {
        const bord = bout.getBoundingClientRect();
        const chevauche = boite !== null && bord.width > 0 && boite.width > 0 && bord.right + MARGE_DU_LIBELLE > boite.left && bord.left - MARGE_DU_LIBELLE < boite.right;
        bout.style.visibility = chevauche ? 'hidden' : '';
      }
    }
    // Le libellé et les bouts changent de largeur avec la langue, la course avec la fenêtre ou l'ouverture de la carte.
    const mesures = new ResizeObserver(eviter);
    for (const suivi of [course, legende, boutGauche, boutDroit]) mesures.observe(suivi);

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
        if (suivant.bouton.titre !== undefined || titreDuBouton) i18n.lier(bouton, 'title', suivant.bouton.titre ?? '');
        titreDuBouton = suivant.bouton.titre !== undefined;
        bouton.disabled = suivant.desactivee || suivant.bouton.inactif;
        const { defaut, bouts } = suivant;
        element.classList.toggle('avec-legende', defaut !== undefined || bouts !== undefined);
        marque.hidden = !defaut;
        if (defaut) {
          marque.style.left = `${position(defaut.valeur)}%`;
          legende.style.left = marque.style.left;
          i18n.lier(marque, 'title', defaut.titre);
          i18n.lier(legende, 'textContent', defaut.libelle);
        }
        legende.hidden = !defaut || Math.abs(position(affichee) - position(defaut.valeur)) <= ECART_DU_LIBELLE;
        boutGauche.hidden = boutDroit.hidden = !bouts;
        if (bouts) {
          i18n.lier(boutGauche, 'textContent', bouts.gauche);
          i18n.lier(boutDroit, 'textContent', bouts.droite);
        }
        pastille.hidden = !suivant.modifiee;
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
          if (repere.nom) i18n.lier(marque, 'textContent', repere.nom);
          course.insertBefore(marque, pouce);
          return marque;
        });
        for (const ancienne of [...zones, ...marques]) ancienne.remove();
        zones = (suivant.zones ?? []).map(({ debut, fin, titre }) => {
          const zone = document.createElement('span');
          zone.className = 'reglette-proche';
          const [de, a] = [position(debut - DEBORD_DE_LA_ZONE), position(fin + DEBORD_DE_LA_ZONE)];
          zone.style.left = `${de}%`;
          zone.style.width = `${a - de}%`;
          i18n.lier(zone, 'title', titre);
          course.insertBefore(zone, marque);
          return zone;
        });
        marques = (suivant.marques ?? []).map(({ valeur, couleur, titre }) => {
          const point = document.createElement('span');
          point.className = 'marque-palette';
          point.style.left = `${position(valeur)}%`;
          point.style.background = couleur;
          i18n.lier(point, 'title', titre);
          course.insertBefore(point, pouce);
          return point;
        });
        marquerLeChamp(affichee);
      },
    };
  }

  return { createReglette };
}

export const creerVuesReglette = memoriserVues(construireVues);
