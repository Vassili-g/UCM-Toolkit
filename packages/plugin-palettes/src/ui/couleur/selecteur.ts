/**
 * Le sélecteur de couleur embarqué (W4.1, maquette W3.1) : une zone de
 * saturation et de luminosité, un curseur de teinte, le code en Hex à chaque
 * ouverture, puis les pastilles que le contrôle propose. Il remplace le
 * sélecteur du navigateur, qui s'ouvre en RGB dans Figma.
 *
 * Un seul sélecteur existe dans la page. Il s'ouvre sous le contrôle qui
 * l'appelle, par-dessus le contenu, et le contrôle garde la couleur : le
 * sélecteur ne fait que lui rendre des saisies. Un glisser prévisualise et sa
 * fin enregistre, comme les curseurs (V9.9) ; un code s'enregistre à Entrée ou
 * à la sortie du champ, et un code invalide reste dans son champ.
 */
import { ecrireHexa, lireHexa, type Rgb8 } from 'ucm-couleur';

import { memoriserVues, type Localisation, type Texte } from '../localisation';
import { FORMATS_DE_CODE, deplacer, ecrireCode, hsvVersRgb8, lireCode, positionDe, type FormatDeCode, type Hsv } from './formats';

export interface PastilleProposee {
  readonly hexa: string;
  readonly titre: Texte;
}

export interface OuvertureDuSelecteur {
  /** Le contrôle qui ouvre le sélecteur : il le place, et reprend le focus à Échap. */
  readonly ancre: HTMLElement;
  readonly hexa: string;
  /** Le nom accessible du sélecteur : ce qu'il règle. */
  readonly etiquette: Texte;
  /** Une ligne sous le code, comme la mention du fond commun. */
  readonly mention?: Texte;
  readonly titreDesPastilles?: Texte;
  readonly pastilles?: readonly PastilleProposee[];
  /** Une couleur choisie, en `#RRGGBB` ; `fin` à la fin du geste. */
  saisir(hexa: string, fin: boolean): void;
  /**
   * La fin d'un aperçu qui n'enregistre rien : Échap ou fermeture en plein
   * glisser. Le contrôle rend ce que l'aperçu avait différé,
   * sans ranger (Z4.6). Appelé une fois, après la dernière couleur transmise.
   */
  abandonner?(): void;
}

export interface PipetteUi {
  readonly bouton: HTMLButtonElement;
  /** Peint la pastille de la couleur relue, et la suit dans le sélecteur ouvert. */
  poser(hexa: string): void;
}

function construireVues(i18n: Localisation) {
  const { TEXTES_DU_SELECTEUR } = i18n.messages;

  /** La largeur de la maquette W3.1, et l'écart au contrôle. */
  const LARGEUR = 232;

  const ECART = 4;

  const MARGE = 8;

  const bornerA = (valeur: number, min: number, max: number): number => Math.min(max, Math.max(min, valeur));

  /** Quand l'abandon d'un aperçu part : tout de suite, après le clic qui a refermé le sélecteur, ou après la tâche en cours. */
  type MomentDeLAbandon = 'aussitot' | 'apresLeClic' | 'apresLaTache';

  let instance: ReturnType<typeof creer> | null = null;

  /** Le sélecteur de la page, créé à la première ouverture. */
  function selecteur(): ReturnType<typeof creer> {
    instance ??= creer();
    return instance;
  }

  /** Ouvre le sélecteur sous `ouverture.ancre` ; un second clic sur le même contrôle le referme. */
  function ouvrirLeSelecteur(ouverture: OuvertureDuSelecteur): void {
    selecteur().basculer(ouverture);
  }

  /** Recale la couleur montrée quand la valeur change ailleurs, sauf pendant un geste dans le sélecteur. */
  function suivreLaCouleur(ancre: HTMLElement, hexa: string): void {
    instance?.suivre(ancre, hexa);
  }

  /** Referme le sélecteur ; `rendreLeFocus` rend le focus au contrôle qui l'a ouvert. */
  function fermerLeSelecteur(rendreLeFocus = false): void {
    instance?.fermer(rendreLeFocus);
  }

  /**
   * La pastille carrée à gauche d'un code de couleur : un bouton qui ouvre le
   * sélecteur. `ouvrir` donne ce que le sélecteur propose au moment du clic.
   */
  function createPipette(etiquette: Texte, ouvrir: (bouton: HTMLButtonElement) => Omit<OuvertureDuSelecteur, 'ancre' | 'etiquette'> | null): PipetteUi {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'pipette';
    i18n.lier(bouton, 'aria-label', etiquette);
    bouton.setAttribute('aria-haspopup', 'dialog');
    bouton.setAttribute('aria-expanded', 'false');
    const teinte = document.createElement('span');
    teinte.className = 'pipette-teinte';
    teinte.setAttribute('aria-hidden', 'true');
    bouton.append(teinte);
    bouton.addEventListener('click', () => {
      const demande = ouvrir(bouton);
      if (demande) ouvrirLeSelecteur({ ...demande, ancre: bouton, etiquette });
    });
    return {
      bouton,
      poser(hexa) {
        const lue = lireHexa(hexa);
        teinte.style.background = lue ? ecrireHexa(lue) : 'transparent';
        if (lue) suivreLaCouleur(bouton, ecrireHexa(lue));
      },
    };
  }


  function creer() {
    const element = document.createElement('div');
    element.className = 'selecteur-de-couleur';
    element.setAttribute('role', 'dialog');
    element.hidden = true;

    const zone = document.createElement('div');
    zone.className = 'selecteur-zone';
    zone.tabIndex = 0;
    zone.setAttribute('role', 'slider');
    i18n.lier(zone, 'aria-label', TEXTES_DU_SELECTEUR.zone);
    const repereDeZone = document.createElement('div');
    repereDeZone.className = 'selecteur-repere';
    zone.append(repereDeZone);

    const teinte = document.createElement('div');
    teinte.className = 'selecteur-teinte';
    teinte.tabIndex = 0;
    teinte.setAttribute('role', 'slider');
    i18n.lier(teinte, 'aria-label', TEXTES_DU_SELECTEUR.teinte);
    teinte.setAttribute('aria-valuemin', '0');
    teinte.setAttribute('aria-valuemax', '359');
    const repereDeTeinte = document.createElement('div');
    repereDeTeinte.className = 'selecteur-repere';
    teinte.append(repereDeTeinte);

    const menuDeFormat = document.createElement('select');
    menuDeFormat.className = 'selecteur-format';
    i18n.lier(menuDeFormat, 'aria-label', TEXTES_DU_SELECTEUR.format);
    for (const format of FORMATS_DE_CODE) {
      const option = document.createElement('option');
      option.value = format;
      i18n.lier(option, 'textContent', TEXTES_DU_SELECTEUR.formats[format]);
      menuDeFormat.append(option);
    }
    const champsDuCode = document.createElement('div');
    champsDuCode.className = 'selecteur-code';
    const ligneDuCode = document.createElement('div');
    ligneDuCode.className = 'selecteur-ligne';
    ligneDuCode.append(menuDeFormat, champsDuCode);

    const mention = document.createElement('p');
    mention.className = 'selecteur-mention ligne-secondaire';
    const separation = document.createElement('div');
    separation.className = 'selecteur-separation';
    const titreDesPastilles = document.createElement('p');
    titreDesPastilles.className = 'selecteur-titre ligne-secondaire';
    const pastilles = document.createElement('div');
    pastilles.className = 'selecteur-pastilles';

    element.append(zone, teinte, ligneDuCode, mention, separation, titreDesPastilles, pastilles);
    document.body.append(element);

    let ouverture: OuvertureDuSelecteur | null = null;
    let position: Hsv = { h: 0, s: 0, v: 0 };
    let format: FormatDeCode = 'hex';
    let champs: HTMLInputElement[] = [];
    /** Vrai pendant un glisser : une valeur relue ailleurs ne déplace pas le repère sous le pointeur. */
    let glisse = false;
    let boutonsDesPastilles: { hexa: string; bouton: HTMLButtonElement }[] = [];

    const couleur = (): Rgb8 => hsvVersRgb8(position);

    function peindre(): void {
      const { h, s, v } = position;
      zone.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h.toFixed(1)}, 100%, 50%))`;
      repereDeZone.style.left = `${(s * 100).toFixed(2)}%`;
      repereDeZone.style.top = `${((1 - v) * 100).toFixed(2)}%`;
      repereDeZone.style.background = ecrireHexa(couleur());
      repereDeTeinte.style.left = `${((h / 360) * 100).toFixed(2)}%`;
      repereDeTeinte.style.background = `hsl(${h.toFixed(1)}, 100%, 50%)`;
      i18n.lier(zone, 'aria-valuetext', TEXTES_DU_SELECTEUR.valeurDeLaZone(Math.round(s * 100), Math.round(v * 100)));
      teinte.setAttribute('aria-valuenow', String(Math.round(h) % 360));
      i18n.lier(teinte, 'aria-valuetext', TEXTES_DU_SELECTEUR.valeurDeLaTeinte(Math.round(h) % 360));
      const hexa = ecrireHexa(couleur());
      for (const { hexa: proposee, bouton } of boutonsDesPastilles) bouton.setAttribute('aria-pressed', String(proposee === hexa));
    }

    /** Réécrit les champs du code. Pendant une frappe, aucun ne se réécrit : le designer lit ce qu'il tape. */
    function ecrireLesChamps(): void {
      const valeurs = ecrireCode(format, couleur());
      champs.forEach((champ, rang) => {
        champ.value = valeurs[rang];
        champ.removeAttribute('aria-invalid');
      });
    }

    function batirLesChamps(): void {
      champs = TEXTES_DU_SELECTEUR.champs[format].map((etiquette) => {
        const champ = document.createElement('input');
        champ.type = 'text';
        champ.className = 'input selecteur-champ';
        champ.spellcheck = false;
        i18n.lier(champ, 'aria-label', etiquette);
        champ.addEventListener('input', () => saisirLeCode(false));
        champ.addEventListener('change', () => saisirLeCode(true));
        return champ;
      });
      champsDuCode.dataset.format = format;
      champsDuCode.replaceChildren(...champs);
      ecrireLesChamps();
    }

    /** Vrai quand le contrôle a reçu un aperçu depuis la dernière couleur enregistrée : sa clôture sans fin l'abandonne. */
    let apercuSansFin = false;

    function transmettre(hexa: string, fin: boolean): void {
      if (!ouverture) return;
      apercuSansFin = !fin;
      ouverture.saisir(hexa, fin);
    }

    /** Une frappe prévisualise un code complet ; la validation l'enregistre, ou marque le champ invalide. */
    function saisirLeCode(fin: boolean): void {
      const lue = lireCode(format, champs.map((champ) => champ.value));
      for (const champ of champs) champ.setAttribute('aria-invalid', String(fin && lue === null));
      if (!lue) return;
      position = positionDe(lue, position);
      peindre();
      if (fin) ecrireLesChamps();
      transmettre(ecrireHexa(lue), fin);
    }

    /** Une position posée par la zone, le curseur ou le clavier. */
    function poser(suivante: Hsv, fin: boolean): void {
      position = suivante;
      peindre();
      ecrireLesChamps();
      if (fin || !glisse) {
        annulerLaSaisieEnAttente();
        transmettre(ecrireHexa(couleur()), fin);
      } else transmettreALImageSuivante(ecrireHexa(couleur()));
    }

    /*
     * Pendant un glisser, la zone et le code suivent chaque mouvement ; le
     * contrôle ne reçoit qu'une couleur par image, la dernière, parce que sa
     * saisie redessine l'aperçu (Z4.2). La fin du geste part aussitôt.
     */
    let saisieEnAttente: { hexa: string; image: number } | null = null;

    function transmettreALImageSuivante(hexa: string): void {
      if (saisieEnAttente) {
        saisieEnAttente.hexa = hexa;
        return;
      }
      const image = requestAnimationFrame(() => {
        const attente = saisieEnAttente;
        saisieEnAttente = null;
        if (attente) transmettre(attente.hexa, false);
      });
      saisieEnAttente = { hexa, image };
    }

    function annulerLaSaisieEnAttente(): void {
      if (saisieEnAttente) cancelAnimationFrame(saisieEnAttente.image);
      saisieEnAttente = null;
    }

    /** Retire le suivi du glisser en cours sur le document ; `null` hors d'un glisser. */
    let arreterLeSuivi: (() => void) | null = null;

    /*
     * Le glisser se suit sur le document, comme celui d'une réglette : dans
     * Figma, un mouvement arrive avec `buttons` à 0 et Chromium retire alors
     * la capture. Le geste ne lit donc ni `buttons` ni la capture pour
     * continuer. Il finit au relâcher, n'importe où dans le document, ou à la
     * sortie de la fenêtre quand la capture est perdue : le relâcher n'y
     * serait pas vu.
     */
    function suivrePointeur(commande: HTMLElement, lire: (x: number, y: number) => Hsv): void {
      const depuis = (evenement: PointerEvent): Hsv => {
        const cadre = commande.getBoundingClientRect();
        return lire(bornerA((evenement.clientX - cadre.left) / cadre.width, 0, 1), bornerA((evenement.clientY - cadre.top) / cadre.height, 0, 1));
      };
      let pointeur: number | null = null;
      const bouger = (evenement: PointerEvent): void => {
        if (glisse && evenement.pointerId === pointeur) poser(depuis(evenement), false);
      };
      const finir = (suivante: Hsv): void => {
        arreterLeSuivi?.();
        if (!glisse) return;
        glisse = false;
        poser(suivante, true);
      };
      const relacher = (evenement: PointerEvent): void => {
        if (evenement.pointerId === pointeur) finir(depuis(evenement));
      };
      const sortir = (evenement: PointerEvent): void => {
        if (evenement.pointerId !== pointeur || evenement.relatedTarget !== null) return;
        if (!commande.hasPointerCapture(evenement.pointerId)) finir(position);
      };
      commande.addEventListener('pointerdown', (evenement) => {
        if (evenement.button !== 0) return;
        evenement.preventDefault();
        arreterLeSuivi?.();
        commande.focus({ preventScroll: true });
        commande.setPointerCapture(evenement.pointerId);
        pointeur = evenement.pointerId;
        window.addEventListener('pointermove', bouger, true);
        window.addEventListener('pointerup', relacher, true);
        window.addEventListener('pointercancel', relacher, true);
        document.addEventListener('pointerout', sortir, true);
        arreterLeSuivi = () => {
          window.removeEventListener('pointermove', bouger, true);
          window.removeEventListener('pointerup', relacher, true);
          window.removeEventListener('pointercancel', relacher, true);
          document.removeEventListener('pointerout', sortir, true);
          pointeur = null;
          arreterLeSuivi = null;
        };
        glisse = true;
        poser(depuis(evenement), false);
      });
    }
    suivrePointeur(zone, (x, y) => ({ h: position.h, s: x, v: 1 - y }));
    suivrePointeur(teinte, (x) => ({ ...position, h: Math.min(x * 360, 359.9) }));

    // Flèches : 1 %, ou 1°, et dix fois plus avec Maj ; chaque pression est un geste fini.
    zone.addEventListener('keydown', (evenement) => {
      const pas = evenement.shiftKey ? 0.1 : 0.01;
      const deplacements: Record<string, [axe: 's' | 'v', pas: number]> = {
        ArrowLeft: ['s', -pas],
        ArrowRight: ['s', pas],
        ArrowUp: ['v', pas],
        ArrowDown: ['v', -pas],
      };
      const deplacement = deplacements[evenement.key];
      if (!deplacement) return;
      evenement.preventDefault();
      poser(deplacer(position, ...deplacement), true);
    });
    teinte.addEventListener('keydown', (evenement) => {
      const pas = evenement.shiftKey ? 10 : 1;
      const deplacements: Record<string, number> = { ArrowLeft: -pas, ArrowDown: -pas, ArrowRight: pas, ArrowUp: pas };
      if (evenement.key === 'Home' || evenement.key === 'End') {
        evenement.preventDefault();
        poser({ ...position, h: evenement.key === 'Home' ? 0 : 359 }, true);
        return;
      }
      if (!(evenement.key in deplacements)) return;
      evenement.preventDefault();
      poser(deplacer({ ...position, h: Math.round(position.h) }, 'h', deplacements[evenement.key]), true);
    });

    menuDeFormat.addEventListener('change', () => {
      format = menuDeFormat.value as FormatDeCode;
      batirLesChamps();
    });

    // Échap referme et rend le focus au contrôle, sans laisser la touche au reste de l'interface.
    element.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Escape') return;
      evenement.preventDefault();
      evenement.stopPropagation();
      fermer(true);
    });
    // Un clic hors du sélecteur et de son contrôle le referme ; le focus reste où le clic l'a mis.
    document.addEventListener('pointerdown', (evenement) => {
      const cible = evenement.target as Node | null;
      if (!ouverture || !cible || element.contains(cible) || ouverture.ancre.contains(cible)) return;
      fermer(false, 'apresLeClic');
    }, true);
    // Le focus qui sort par Tab le referme aussi ; l'abandon attend la fin de la tâche, qui a déjà posé le focus.
    element.addEventListener('focusout', (evenement) => {
      const suivant = evenement.relatedTarget as Node | null;
      if (!ouverture || !suivant || element.contains(suivant)) return;
      fermer(false, 'apresLaTache');
    });
    const replacer = (): void => { if (ouverture) placer(ouverture.ancre); };
    window.addEventListener('resize', replacer);
    document.addEventListener('scroll', replacer, true);

    /**
     * Sous le contrôle, aligné sur son bord gauche, ou sur son bord droit quand
     * la fenêtre est trop étroite ; au-dessus quand la place manque dessous et
     * qu'elle existe dessus.
     */
    function placer(ancre: HTMLElement): void {
      const cadre = ancre.getBoundingClientRect();
      const hauteur = element.offsetHeight;
      const largeurUtile = document.documentElement.clientWidth;
      const gauche = cadre.left + LARGEUR + MARGE <= largeurUtile ? cadre.left : cadre.right - LARGEUR;
      const dessous = cadre.bottom + ECART + hauteur <= window.innerHeight || cadre.top - ECART - hauteur < 0;
      const haut = dessous ? cadre.bottom + ECART : cadre.top - ECART - hauteur;
      element.style.left = `${Math.round(bornerA(gauche, MARGE, largeurUtile - LARGEUR - MARGE) + window.scrollX)}px`;
      element.style.top = `${Math.round(haut + window.scrollY)}px`;
    }

    function batirLesPastilles(liste: readonly PastilleProposee[]): void {
      boutonsDesPastilles = liste.flatMap(({ hexa, titre }) => {
        const lue = lireHexa(hexa);
        if (!lue) return [];
        const normalise = ecrireHexa(lue);
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'selecteur-pastille';
        bouton.style.background = normalise;
        i18n.lier(bouton, 'title', TEXTES_DU_SELECTEUR.pastille(titre, normalise));
        i18n.lier(bouton, 'aria-label', TEXTES_DU_SELECTEUR.pastille(titre, normalise));
        bouton.addEventListener('click', () => {
          position = positionDe(lue, position);
          peindre();
          ecrireLesChamps();
          transmettre(normalise, true);
        });
        return [{ hexa: normalise, bouton }];
      });
      pastilles.replaceChildren(...boutonsDesPastilles.map(({ bouton }) => bouton));
    }

    /**
     * Clôt la séquence du contrôle ouvert : la couleur en attente lui revient,
     * le glisser s'arrête, et un aperçu sans fin s'abandonne. Après un clic
     * hors du sélecteur, l'abandon attend la fin de ce clic : le rendu qu'il
     * déclenche reconstruirait l'élément visé, et le clic serait perdu. Après
     * une sortie par Tab, il attend la fin de la tâche.
     */
    function clore(quand: MomentDeLAbandon): void {
      const attente = saisieEnAttente;
      annulerLaSaisieEnAttente();
      if (attente) transmettre(attente.hexa, false);
      arreterLeSuivi?.();
      glisse = false;
      const abandon = apercuSansFin ? ouverture?.abandonner : undefined;
      apercuSansFin = false;
      if (!abandon) return;
      if (quand === 'aussitot') abandon();
      else if (quand === 'apresLaTache') setTimeout(abandon, 0);
      else apresLeClic(abandon);
    }

    function apresLeClic(action: () => void): void {
      const suite = (): void => {
        window.removeEventListener('pointerup', suite, true);
        window.removeEventListener('pointercancel', suite, true);
        setTimeout(action, 0);
      };
      window.addEventListener('pointerup', suite, true);
      window.addEventListener('pointercancel', suite, true);
    }

    function ouvrir(suivante: OuvertureDuSelecteur): void {
      // Une couleur en attente appartient au contrôle précédent : elle lui revient avant le changement.
      if (ouverture) {
        clore('aussitot');
        ouverture.ancre.setAttribute('aria-expanded', 'false');
      }
      ouverture = suivante;
      const lue = lireHexa(suivante.hexa) ?? [0, 0, 0];
      position = positionDe(lue);
      format = 'hex';
      menuDeFormat.value = format;
      i18n.lier(element, 'aria-label', suivante.etiquette);
      i18n.lier(mention, 'textContent', suivante.mention ?? '');
      mention.hidden = !suivante.mention;
      const avecPastilles = (suivante.pastilles?.length ?? 0) > 0;
      i18n.lier(titreDesPastilles, 'textContent', suivante.titreDesPastilles ?? '');
      separation.hidden = !avecPastilles;
      titreDesPastilles.hidden = !avecPastilles;
      pastilles.hidden = !avecPastilles;
      batirLesPastilles(suivante.pastilles ?? []);
      batirLesChamps();
      peindre();
      element.hidden = false;
      suivante.ancre.setAttribute('aria-expanded', 'true');
      placer(suivante.ancre);
      champs[0]?.focus({ preventScroll: true });
      champs[0]?.select();
    }

    function fermer(rendreLeFocus: boolean, quand: MomentDeLAbandon = 'aussitot'): void {
      if (!ouverture) return;
      // Échap pendant un glisser laisse l'aperçu au dernier mouvement, sans rien enregistrer.
      clore(quand);
      const { ancre } = ouverture;
      ouverture = null;
      element.hidden = true;
      ancre.setAttribute('aria-expanded', 'false');
      if (rendreLeFocus) ancre.focus({ preventScroll: true });
    }

    return {
      basculer(suivante: OuvertureDuSelecteur): void {
        // Le même contrôle referme le sélecteur.
        if (ouverture?.ancre !== suivante.ancre) ouvrir(suivante);
        else fermer(true);
      },
      suivre(ancre: HTMLElement, hexa: string): void {
        if (ouverture?.ancre !== ancre || glisse || champs.includes(document.activeElement as HTMLInputElement)) return;
        const lue = lireHexa(hexa);
        if (!lue) return;
        position = positionDe(lue, position);
        peindre();
        ecrireLesChamps();
      },
      fermer,
    };
  }
  return { ouvrirLeSelecteur, suivreLaCouleur, fermerLeSelecteur, createPipette };
}

export const creerVuesSelecteur = memoriserVues(construireVues);
