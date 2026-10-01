/**
 * La carte « Color shift » (section 12) : trois onglets choisissent la
 * grandeur, teinte, saturation ou luminosité, que le graphe et les deux
 * réglettes règlent aux deux bouts ([DER-18]). Le préréglage de la teinte, la
 * synchronisation des profils et « Tout rétablir » sont en tête ([DER-11],
 * [DER-12]).
 *
 * Chaque réglage s'arrête à sa limite dynamique ([DER-19]) : la limite se
 * calcule sur l'état du début du geste, à l'ouverture, au changement
 * d'onglet et au relâchement, étalée entre les images ; pendant un glisser,
 * elle reste figée comme l'échelle. Une ligne fixe dit la plage sûre, ou la
 * cause de la butée jusqu'au geste suivant ([DER-22]).
 *
 * Pendant un glisser, l'aperçu suit sans rien ranger ; le relâchement range
 * (D-D). Ctrl+Z ou Cmd+Z défait le dernier réglage quand le focus est dans la
 * carte, hors d'un champ texte : cinquante réglages, sans rétablissement
 * (E21).
 */
import {
  BORNES_DU_COLOR_SHIFT,
  PAS_DU_COLOR_SHIFT,
  aUneIntensite,
  balayerLaLimite,
  boutsDe,
  decalageDe,
  decalageRange,
  estPaletteGrise,
  fabriquerCran,
  partsDe,
  pivotDe,
  rampeDe,
  rampesDe,
  teinteA,
  verifierPromesses,
  type Ancrage,
  type Bout,
  type GrandeurDuColorShift,
  type Intensite,
  type Limite,
  type Mode,
  type Palette,
  type Profil,
  type Rampes,
  type Recette,
} from 'ucm-couleur';

import type { AnalyseDePalette } from '../../analyse';
import { lireNombre } from '../../configuration';
import { appliquerPrereglage, lierLesProfils, prereglageDe, reglerDecalage, toutRetablir } from '../../edition';
import { createCalculsDeLimites } from '../calculDesLimites';
import { creerVuesLigneFixe } from '../ligneFixe';
import { memoriserVues, type Localisation, type Texte } from '../localisation';
import { echelleDe, valeurDuGlisser } from './geometrie';
import { creerVuesGraphe } from './graphe';
import { creerVuesReglette, type Intervalle, type RegletteUi } from './reglette';

/** Ce que l'éditeur demande à l'onglet. */
export interface GestesDeLEditeur {
  /** Pendant un geste : l'aperçu suit, rien ne se range. */
  previsualiser(palette: Palette): void;
  /** À la fin d'un geste : la palette se range. */
  valider(palette: Palette): void;
}

export interface EditeurUi {
  element: HTMLDivElement;
  /**
   * Les rampes ancrées de la palette et son ancrage ([MOT-17]) ; `mode`, le
   * thème de l'aperçu, où se peignent les rampes sous le graphe ([DER-04]).
   */
  afficher(recette: Recette, palette: Palette, rampes: Rampes, ancrage: Ancrage, analyse: AnalyseDePalette, mode: Mode): void;
  /** Focalise l'onglet choisi, quand un message y mène ([VER-15]). */
  focaliser(): void;
}

const GRANDEURS: readonly GrandeurDuColorShift[] = ['teinte', 'saturation', 'clarte'];
const BOUTS: readonly Bout[] = ['clair', 'sombre'];

/** Le grand pas de chaque grandeur, avec Maj ([DER-07]) : 5°, 5 %, 0,02. */
const GRAND_PAS: { readonly [G in GrandeurDuColorShift]: number } = { teinte: 5, saturation: 0.05, clarte: 0.02 };

/** La profondeur de la pile d'annulation (E21). */
const PROFONDEUR = 50;

/** Une butée posée par un geste, que la ligne fixe nomme jusqu'au geste suivant ([DER-22]). */
interface Butee {
  readonly grandeur: GrandeurDuColorShift;
  readonly bout: Bout;
  readonly cote: keyof Intervalle;
}

function construireVues(i18n: Localisation) {
  const { TEXTES_DE_LA_DERIVE, buteeDuColorShift, decalageEcrit, grandeurAuBout, horsDeLaPlage, plageSure, repereTailwind, retablirAuBout, valeurDePoignee } = i18n.messages;
  const { CADRE, HAUTEUR_TOTALE, createGraphe } = creerVuesGraphe(i18n);
  const { createReglette } = creerVuesReglette(i18n);
  const { createLigneFixe } = creerVuesLigneFixe(i18n);

  function bouton(texte: Texte, classe: 'bouton-discret' | 'bascule-option'): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    if (classe === 'bouton-discret') element.className = 'bouton-discret';
    else element.className = 'bascule-option';
    i18n.lier(element, 'textContent', texte);
    return element;
  }

  /** La valeur d'une grandeur à un bout : la teinte en degrés, la saturation et la luminosité rangées, zéro absentes. */
  const valeurAuBout = (palette: Palette, profil: Profil, grandeur: GrandeurDuColorShift, bout: Bout): number =>
    (grandeur === 'teinte' ? palette.derive[profil][bout] : decalageRange(palette.derive[profil], grandeur)[bout]);

  /** La valeur de départ d'une grandeur ([DER-18]) : la teinte Tailwind, zéro pour les deux autres. */
  const depart = (recette: Recette, palette: Palette, grandeur: GrandeurDuColorShift, bout: Bout): number =>
    (grandeur === 'teinte' ? prereglageDe(recette, palette)[bout] : 0);

  /** La valeur d'une saisie : des degrés, un pourcentage pour la saturation, un décalage de clarté. */
  function lire(grandeur: GrandeurDuColorShift, saisie: string): number | null {
    const nombre = lireNombre(saisie.replace(/[°%\s+]/g, '').replace('−', '-'));
    if (nombre === null) return null;
    return grandeur === 'saturation' ? nombre / 100 : nombre;
  }

  function createEditeur(gestes: GestesDeLEditeur): EditeurUi {
    const element = document.createElement('div');
    element.className = 'editeur-derive';

    let recette: Recette | null = null;
    let palette: Palette | null = null;
    let rampes: Rampes | null = null;
    let analyse: AnalyseDePalette | null = null;
    let ancrage: Ancrage | null = null;
    let mode: Mode = 'light';
    let profil: Profil = 'vivid';
    /** L'onglet choisi ; il dure la session ([DER-18]). */
    let grandeur: GrandeurDuColorShift = 'teinte';
    let confirmationOuverte = false;
    /** La palette d'avant le geste en cours : glisser, réglette ou champ. */
    let avantLeGeste: Palette | null = null;
    const pile: Palette[] = [];
    let butee: Butee | null = null;

    // Les limites de la grandeur affichée, pour le profil réglé, et la clé de l'état qu'elles jugent.
    let limites: Record<Bout, Limite | null> = { clair: null, sombre: null };
    let horsDeLaPlageAuBout: Record<Bout, boolean> = { clair: false, sombre: false };
    let cleDesLimites: { readonly etat: string; readonly grandeur: GrandeurDuColorShift; readonly profil: Profil } | null = null;
    // Une carte repliée ne se redessine pas : son dépliage la redessine ([DER-01]).
    const calculs = createCalculsDeLimites(() => {
      if (element.offsetParent !== null) dessiner();
    });

    function empiler(avant: Palette): void {
      pile.push(avant);
      if (pile.length > PROFONDEUR) pile.shift();
    }

    /**
     * Un geste fini : la palette d'avant entre dans la pile, la nouvelle se
     * range. Un geste arrêté sur sa borne ne change rien : la carte se
     * redessine pour annoncer la butée ([DER-22]).
     */
    function terminer(suivante: Palette): void {
      const avant = avantLeGeste ?? palette;
      avantLeGeste = null;
      if (!avant || JSON.stringify(avant.derive) === JSON.stringify(suivante.derive)) {
        if (butee) dessiner();
        return;
      }
      empiler(avant);
      gestes.valider(suivante);
    }

    /**
     * Un geste commence : la limite en calcul se termine, et la butée d'avant
     * se tait. Le glisser d'une poignée lit la limite sans redessiner : un
     * redessin entre les deux clics d'un double-clic remplacerait la poignée.
     * Une réglette relit ses bornes permises : `parLaReglette` la redessine.
     */
    function commencer(parLaReglette = false): void {
      const termine = calculs.terminer();
      butee = null;
      if (!avantLeGeste) avantLeGeste = palette;
      if (termine && parLaReglette) dessiner();
    }

    /** La grandeur que la carte montre : une palette grise ne règle que sa luminosité ([DER-15]). */
    const grandeurAffichee = (): GrandeurDuColorShift => (recette && palette && estPaletteGrise(recette, palette) ? 'clarte' : grandeur);

    const permisesDe = (bout: Bout): Intervalle | null => {
      const limite = limites[bout];
      return limite ? { bas: limite.bas.valeur, haut: limite.haut.valeur } : null;
    };

    /** La valeur demandée, bornée par la limite ; une borne atteinte devient la butée qu'annonce la ligne fixe. */
    function borner(bout: Bout, valeur: number): number {
      const affichee = grandeurAffichee();
      const fixe = BORNES_DU_COLOR_SHIFT[affichee];
      const permises = permisesDe(bout) ?? { bas: -fixe, haut: fixe };
      if (valeur < permises.bas) {
        if (limites[bout]?.bas.cause) butee = { grandeur: affichee, bout, cote: 'bas' };
        return permises.bas;
      }
      if (valeur > permises.haut) {
        if (limites[bout]?.haut.cause) butee = { grandeur: affichee, bout, cote: 'haut' };
        return permises.haut;
      }
      return valeur;
    }

    function regler(bout: Bout, valeur: number, fin: boolean): void {
      if (!recette || !palette) return;
      if (!fin && !avantLeGeste) avantLeGeste = palette;
      const suivante = reglerDecalage(recette, palette, profil, grandeurAffichee(), bout, borner(bout, valeur));
      if (fin) terminer(suivante);
      else gestes.previsualiser(suivante);
    }

    // L'aide, puis l'en-tête : préréglage de la teinte, synchronisation, profil réglé, « Tout rétablir ».
    const aide = document.createElement('p');
    aide.className = 'ligne-secondaire';
    i18n.lier(aide, 'textContent', TEXTES_DE_LA_DERIVE.aide);
    const entete = document.createElement('div');
    entete.className = 'editeur-entete';
    const choixDuPrereglage = document.createElement('select');
    choixDuPrereglage.className = 'input champ-prereglage';
    i18n.lier(choixDuPrereglage, 'aria-label', TEXTES_DE_LA_DERIVE.prereglage);
    for (const [valeur, texte] of [['tailwind', TEXTES_DE_LA_DERIVE.tailwind], ['constante', TEXTES_DE_LA_DERIVE.constante], ['libre', TEXTES_DE_LA_DERIVE.libre]] as const) {
      const option = document.createElement('option');
      option.value = valeur;
      i18n.lier(option, 'textContent', texte);
      // « Personnalisé » s'affiche dès qu'une teinte s'écarte du préréglage ; il ne se choisit pas ([DER-11]).
      option.disabled = valeur === 'libre';
      choixDuPrereglage.append(option);
    }
    choixDuPrereglage.addEventListener('change', () => {
      if (!recette || !palette) return;
      const choisi = choixDuPrereglage.value;
      if (choisi === 'tailwind' || choisi === 'constante') terminer(appliquerPrereglage(recette, palette, profil, choisi));
    });
    // Synchroniser se coche : l'état se lit sur la case, et la recocher confirme avant de remplacer soft ([DER-12]).
    const lien = document.createElement('input');
    lien.type = 'checkbox';
    lien.className = 'case-a-cocher';
    const etiquetteDuLien = document.createElement('label');
    etiquetteDuLien.className = 'champ-ligne';
    const texteDuLien = document.createElement('span');
    i18n.lier(texteDuLien, 'textContent', TEXTES_DE_LA_DERIVE.lien);
    etiquetteDuLien.append(lien, texteDuLien);
    lien.addEventListener('change', () => {
      if (!palette) return;
      if (lien.checked) {
        if (JSON.stringify(palette.derive.soft) === JSON.stringify(palette.derive.vivid)) terminer(lierLesProfils(palette, true));
        else {
          lien.checked = false;
          confirmationOuverte = true;
          dessiner();
        }
        return;
      }
      terminer(lierLesProfils(palette, false));
    });
    const profils = document.createElement('div');
    profils.className = 'bascule';
    profils.setAttribute('role', 'group');
    i18n.lier(profils, 'aria-label', TEXTES_DE_LA_DERIVE.profilRegle);
    const boutonsDeProfil = (['soft', 'vivid'] as const).map((valeur) => {
      const choix = bouton(valeur, 'bascule-option');
      choix.addEventListener('click', () => {
        profil = valeur;
        dessiner();
      });
      profils.append(choix);
      return { valeur, choix };
    });
    const retablirTout = bouton(TEXTES_DE_LA_DERIVE.toutRetablir, 'bouton-discret');
    retablirTout.addEventListener('click', () => {
      if (recette && palette) terminer(toutRetablir(recette, palette, profil));
    });
    entete.append(choixDuPrereglage, etiquetteDuLien, profils, retablirTout);

    const confirmation = document.createElement('div');
    confirmation.className = 'confirmation';
    const texteDeConfirmation = document.createElement('p');
    i18n.lier(texteDeConfirmation, 'textContent', TEXTES_DE_LA_DERIVE.confirmationDuLien);
    const gestesDeConfirmation = document.createElement('div');
    gestesDeConfirmation.className = 'confirmation-gestes';
    const aligner = bouton(TEXTES_DE_LA_DERIVE.aligner, 'bouton-discret');
    aligner.addEventListener('click', () => {
      confirmationOuverte = false;
      if (palette) terminer(lierLesProfils(palette, true));
    });
    const renoncer = bouton(TEXTES_DE_LA_DERIVE.annuler, 'bouton-discret');
    renoncer.addEventListener('click', () => {
      confirmationOuverte = false;
      dessiner();
    });
    gestesDeConfirmation.append(aligner, renoncer);
    confirmation.append(texteDeConfirmation, gestesDeConfirmation);

    // Les onglets de grandeur ([DER-18]) : le nom, les deux valeurs, et une pastille quand la grandeur s'écarte de son départ.
    const onglets = document.createElement('div');
    onglets.className = 'onglets-de-grandeur';
    onglets.setAttribute('role', 'tablist');
    i18n.lier(onglets, 'aria-label', TEXTES_DE_LA_DERIVE.onglets);
    const boutonsDOnglet = GRANDEURS.map((valeur) => {
      const onglet = document.createElement('button');
      onglet.type = 'button';
      onglet.className = 'onglet-de-grandeur';
      onglet.setAttribute('role', 'tab');
      onglet.dataset.grandeur = valeur;
      const nom = document.createElement('span');
      nom.className = 'onglet-de-grandeur-nom';
      i18n.lier(nom, 'textContent', TEXTES_DE_LA_DERIVE.grandeurs[valeur]);
      const pastille = document.createElement('span');
      pastille.className = 'pastille-reglee';
      pastille.setAttribute('aria-hidden', 'true');
      const valeurs = document.createElement('span');
      valeurs.className = 'onglet-de-grandeur-valeurs';
      onglet.append(nom, pastille, valeurs);
      onglet.addEventListener('click', () => {
        if (grandeur === valeur) return;
        grandeur = valeur;
        butee = null;
        dessiner();
      });
      onglets.append(onglet);
      return { valeur, onglet, pastille, valeurs };
    });
    onglets.addEventListener('keydown', (evenement) => {
      const sens = { ArrowRight: 1, ArrowLeft: -1 }[evenement.key];
      if (!sens) return;
      const actifs = boutonsDOnglet.filter(({ onglet }) => !onglet.disabled);
      const rang = actifs.findIndex(({ onglet }) => onglet === document.activeElement);
      if (rang < 0) return;
      evenement.preventDefault();
      const suivant = actifs[(rang + sens + actifs.length) % actifs.length];
      suivant.onglet.focus();
      suivant.onglet.click();
    });

    // Le graphe : glisser, double-clic et clavier sur les poignées.
    const graphe = createGraphe();
    const svg = graphe.element;
    graphe.surLargeur(() => dessiner());
    const panneau = document.createElement('div');
    panneau.className = 'panneau-de-grandeur';
    panneau.setAttribute('role', 'tabpanel');
    let glisse: { bout: Bout; pointeur: number } | null = null;
    /** L'échelle figée pendant un glisser : la poignée ne saute pas sous le pointeur ([DER-01]). */
    let echelleFigee: number | null = null;
    const echelleCourante = (): number => {
      if (echelleFigee !== null) return echelleFigee;
      const affichee = grandeurAffichee();
      if (!palette) return BORNES_DU_COLOR_SHIFT[affichee];
      return echelleDe(affichee, (['soft', 'vivid'] as const).flatMap((cible) => BOUTS.map((bout) => valeurAuBout(palette!, cible, affichee, bout))));
    };
    /** La capture du pointeur fait viser le SVG aux clics suivants : le double-clic lit le bout pressé. */
    let boutPresse: Bout | null = null;
    const boutDe = (cible: EventTarget | null): Bout | null => {
      const poignee = (cible as Element | null)?.closest?.('.derive-poignee') as SVGGElement | null;
      const bout = poignee?.dataset.bout;
      return bout === 'clair' || bout === 'sombre' ? bout : null;
    };
    const ordonneeDuPointeur = (evenement: PointerEvent): number => {
      const cadre = svg.getBoundingClientRect();
      return (evenement.clientY - cadre.top) * (HAUTEUR_TOTALE / cadre.height);
    };
    svg.addEventListener('pointerdown', (evenement) => {
      const bout = boutDe(evenement.target);
      if (!bout) return;
      evenement.preventDefault();
      commencer();
      // Le graphe se redessine à chaque mouvement : la capture tient sur le SVG, pas sur la poignée.
      svg.setPointerCapture(evenement.pointerId);
      echelleFigee = echelleCourante();
      glisse = { bout, pointeur: evenement.pointerId };
      boutPresse = bout;
    });
    svg.addEventListener('pointermove', (evenement) => {
      if (!glisse || evenement.pointerId !== glisse.pointeur) return;
      const affichee = grandeurAffichee();
      const pas = evenement.shiftKey ? GRAND_PAS[affichee] : PAS_DU_COLOR_SHIFT[affichee];
      regler(glisse.bout, valeurDuGlisser(ordonneeDuPointeur(evenement), CADRE, pas, echelleCourante()), false);
    });
    const relacher = (evenement: PointerEvent) => {
      if (!glisse || evenement.pointerId !== glisse.pointeur) return;
      glisse = null;
      echelleFigee = null;
      if (palette) terminer(palette);
    };
    svg.addEventListener('pointerup', relacher);
    svg.addEventListener('pointercancel', relacher);
    svg.addEventListener('dblclick', (evenement) => {
      const bout = boutDe(evenement.target) ?? boutPresse;
      if (!bout || !recette || !palette) return;
      commencer();
      regler(bout, depart(recette, palette, grandeurAffichee(), bout), true);
    });
    svg.addEventListener('keydown', (evenement) => {
      const bout = boutDe(evenement.target);
      if (!bout || !palette) return;
      const affichee = grandeurAffichee();
      const actuel = valeurAuBout(palette, profil, affichee, bout);
      const pas = evenement.shiftKey ? GRAND_PAS[affichee] : PAS_DU_COLOR_SHIFT[affichee];
      const fixe = BORNES_DU_COLOR_SHIFT[affichee];
      const permises = permisesDe(bout) ?? { bas: -fixe, haut: fixe };
      // Origine et Fin vont aux bornes permises ([DER-09]).
      const cibles: Record<string, number> = {
        ArrowUp: actuel + pas,
        ArrowRight: actuel + pas,
        ArrowDown: actuel - pas,
        ArrowLeft: actuel - pas,
        Home: permises.bas,
        End: permises.haut,
      };
      const cible = cibles[evenement.key];
      if (cible === undefined) return;
      evenement.preventDefault();
      commencer();
      regler(bout, cible, true);
    });

    // Les réglettes : une par bout, liée au graphe ([DER-08], [DER-21]).
    const reglettes = {} as Record<Bout, RegletteUi>;
    for (const bout of BOUTS) {
      reglettes[bout] = createReglette(TEXTES_DE_LA_DERIVE.bout[bout], {
        commencer: () => commencer(true),
        previsualiser: (valeur) => regler(bout, valeur, false),
        valider: (valeur) => regler(bout, valeur, true),
        annuler() {
          const avant = avantLeGeste;
          avantLeGeste = null;
          if (avant) gestes.previsualiser(avant);
        },
        retablir() {
          if (!recette || !palette) return;
          commencer();
          regler(bout, depart(recette, palette, grandeurAffichee(), bout), true);
        },
        lire: (saisie) => lire(grandeurAffichee(), saisie),
        buter(cote) {
          butee = { grandeur: grandeurAffichee(), bout, cote };
        },
      });
    }
    const zoneDesReglettes = document.createElement('div');
    zoneDesReglettes.className = 'reglettes';
    zoneDesReglettes.append(reglettes.clair.element, reglettes.sombre.element);
    const ligneDeLaPlage = createLigneFixe();
    panneau.append(svg, zoneDesReglettes, ligneDeLaPlage.element);

    const note = document.createElement('p');
    note.className = 'ligne-secondaire note-du-color-shift';

    element.append(aide, entete, confirmation, onglets, panneau, note);

    // Ctrl+Z ou Cmd+Z défait le dernier réglage, hors d'un champ texte (E21).
    element.addEventListener('keydown', (evenement) => {
      if (!(evenement.ctrlKey || evenement.metaKey) || evenement.key.toLowerCase() !== 'z') return;
      const cible = evenement.target as HTMLElement;
      if (cible instanceof HTMLInputElement && cible.type === 'text') return;
      evenement.preventDefault();
      const precedente = pile.pop();
      if (precedente) gestes.valider(precedente);
    });

    /**
     * Lance le calcul des limites quand l'état jugé a changé, jamais pendant un
     * geste ([DER-20]). Une autre grandeur ou un autre profil efface les
     * limites d'avant ; sinon elles restent montrées jusqu'aux nouvelles.
     */
    function lancerLesLimites(recetteLue: Recette, paletteLue: Palette, affichee: GrandeurDuColorShift, sansSegment: Record<Bout, boolean>): void {
      if (avantLeGeste) return;
      const etat = JSON.stringify([{ ...recetteLue, palettes: [] }, paletteLue]);
      if (cleDesLimites?.etat === etat && cleDesLimites.grandeur === affichee && cleDesLimites.profil === profil) return;
      if (cleDesLimites?.grandeur !== affichee || cleDesLimites.profil !== profil) {
        limites = { clair: null, sombre: null };
        horsDeLaPlageAuBout = { clair: false, sombre: false };
      }
      cleDesLimites = { etat, grandeur: affichee, profil };
      const reglee = profil;
      const fixe = BORNES_DU_COLOR_SHIFT[affichee];
      for (const bout of BOUTS) {
        if (sansSegment[bout]) {
          limites[bout] = null;
          continue;
        }
        const candidate = (valeur: number): Palette => reglerDecalage(recetteLue, paletteLue, reglee, affichee, bout, valeur);
        calculs.lancer(bout, balayerLaLimite({
          recette: recetteLue,
          palette: paletteLue,
          candidate,
          valeur: valeurAuBout(paletteLue, reglee, affichee, bout),
          bornes: { bas: -fixe, haut: fixe },
          pas: PAS_DU_COLOR_SHIFT[affichee],
          ordre: affichee === 'clarte',
        }), (limite) => {
          limites[bout] = limite;
          horsDeLaPlageAuBout[bout] = sortieDeLaPlage(recetteLue, paletteLue, candidate(depart(recetteLue, paletteLue, affichee, bout)));
        });
      }
    }

    /**
     * Vrai quand une garantie manquée l'est à cause du réglage du bout : elle
     * serait tenue à sa valeur de départ ([DER-23]). Un autre réglage a
     * resserré la plage autour de la valeur rangée.
     */
    function sortieDeLaPlage(recetteLue: Recette, paletteLue: Palette, auDepart: Palette): boolean {
      const cle = (promesse: { mode: Mode; profil: Intensite; paire: { numero: number } }) => `${promesse.mode}/${promesse.profil}/${promesse.paire.numero}`;
      const tenuesAuDepart = new Set(verifierPromesses(recetteLue, auDepart).filter((promesse) => promesse.verdict === 'tenue').map(cle));
      return verifierPromesses(recetteLue, paletteLue).some((promesse) => promesse.verdict === 'manquee' && tenuesAuDepart.has(cle(promesse)));
    }

    /** La piste d'une réglette ([DER-21]) : la couleur que le bout prendrait pour chaque valeur, à la clarté du bout. */
    function piste(recetteLue: Recette, paletteLue: Palette, intensite: Intensite, affichee: GrandeurDuColorShift, bout: Bout): string {
      const pivot = pivotDe(recetteLue, paletteLue, intensite);
      const derive = paletteLue.derive[profil];
      const clarte = boutsDe(recetteLue)[bout];
      const part = partsDe(recetteLue, paletteLue)[intensite] ?? 0;
      const fixe = BORNES_DU_COLOR_SHIFT[affichee];
      const couleurs = Array.from({ length: 9 }, (_, rang) => {
        const x = -fixe + (2 * fixe * rang) / 8;
        const teinte = pivot.H + (affichee === 'teinte' ? x : derive[bout]);
        const saturation = affichee === 'saturation' ? x : decalageRange(derive, 'saturation')[bout];
        const decalage = affichee === 'clarte' ? x : decalageRange(derive, 'clarte')[bout];
        const L = Math.min(1, Math.max(0, clarte + decalageDe(paletteLue, intensite) + decalage));
        return fabriquerCran(L, teinte, Math.min(1, Math.max(0, part * (1 + saturation))), recetteLue.gamut).hexa;
      });
      return `linear-gradient(to right, ${couleurs.join(', ')})`;
    }

    function dessiner(): void {
      if (!recette || !palette || !rampes || !ancrage || !analyse) return;
      const lue = recette;
      const courante = palette;
      const focalisee = boutDe(document.activeElement);
      const une = aUneIntensite(courante);
      const lie = courante.derive.lien;
      // Synchronisés, les deux profils se règlent ensemble : la carte montre le porteur de la référence.
      if (lie || une) profil = ancrage.profil === 'unique' ? 'vivid' : ancrage.profil;
      const intensite: Intensite = une ? 'unique' : profil;
      const grise = estPaletteGrise(lue, courante);
      const affichee = grandeurAffichee();
      const reference = pivotDe(lue, courante, intensite);
      const bouts = boutsDe(lue);
      // Un segment se juge sur les bouts de la dérive, aux numéros 50 et 950, et non sur les extrémités de la liste (W6).
      const sansSegment: Record<Bout, boolean> = { clair: reference.L > bouts.clair, sombre: reference.L < bouts.sombre };
      lancerLesLimites(lue, courante, affichee, sansSegment);

      const derive = courante.derive[profil];
      choixDuPrereglage.value = derive.origine;
      choixDuPrereglage.disabled = grise;
      lien.checked = lie;
      etiquetteDuLien.hidden = une;
      profils.hidden = lie || une;
      for (const { valeur, choix } of boutonsDeProfil) choix.setAttribute('aria-pressed', String(valeur === profil));
      confirmation.hidden = !confirmationOuverte;

      for (const { valeur, onglet, pastille, valeurs } of boutonsDOnglet) {
        const choisi = valeur === affichee;
        onglet.setAttribute('aria-selected', String(choisi));
        onglet.tabIndex = choisi ? 0 : -1;
        // Une palette grise ne montre ni teinte ni saturation ([DER-15]).
        onglet.disabled = grise && valeur !== 'clarte';
        const clair = valeurAuBout(courante, profil, valeur, 'clair');
        const sombre = valeurAuBout(courante, profil, valeur, 'sombre');
        pastille.hidden = clair === depart(lue, courante, valeur, 'clair') && sombre === depart(lue, courante, valeur, 'sombre');
        i18n.lier(valeurs, 'textContent', i18n.composer`${decalageEcrit(valeur, clair)} · ${decalageEcrit(valeur, sombre)}`);
      }
      i18n.lier(panneau, 'aria-label', TEXTES_DE_LA_DERIVE.grandeurs[affichee]);

      const sans = rampesDe(lue, { ...courante, derive: { ...courante.derive, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } } });
      graphe.afficher({
        recette: lue,
        palette: courante,
        grandeur: affichee,
        profil,
        rampes: { sans: rampeDe(sans, intensite)[mode], avec: rampeDe(rampes, intensite)[mode] },
        ancrage,
        grille: analyse.grille,
        echelle: echelleCourante(),
        permises: { clair: permisesDe('clair'), sombre: permisesDe('sombre') },
      });
      // Le graphe s'est redessiné : la poignée qui avait le focus le reprend.
      if (focalisee) graphe.poignees()[focalisee]?.focus();

      const fixe = BORNES_DU_COLOR_SHIFT[affichee];
      const tailwind = prereglageDe(lue, courante);
      for (const bout of BOUTS) {
        const reglette = reglettes[bout];
        // Un bout que la référence dépasse n'a pas de segment à régler ([DER-14]).
        reglette.element.hidden = sansSegment[bout];
        const valeur = valeurAuBout(courante, profil, affichee, bout);
        const permises = permisesDe(bout);
        const teinte = teinteA(bouts[bout], reference, derive, bouts);
        const auDepart = valeur === depart(lue, courante, affichee, bout);
        reglette.poser({
          valeur,
          bornes: { bas: -fixe, haut: fixe },
          permises,
          pas: PAS_DU_COLOR_SHIFT[affichee],
          grandPas: GRAND_PAS[affichee],
          piste: piste(lue, courante, intensite, affichee, bout),
          texte: decalageEcrit(affichee, valeur),
          etiquette: grandeurAuBout(affichee, bout),
          annonce: valeurDePoignee(affichee, valeur, teinte, permises),
          // Le repère Tailwind reste visible même quand la teinte est personnalisée ([DER-06]).
          reperes: affichee === 'teinte' ? [{ valeur: tailwind[bout], classe: 'reglette-repere', titre: repereTailwind(tailwind[bout]) }] : [],
          desactivee: false,
          horsDeLaPlage: horsDeLaPlageAuBout[bout],
          bouton: { texte: affichee === 'teinte' ? TEXTES_DE_LA_DERIVE.boutonTailwind : TEXTES_DE_LA_DERIVE.retablir, etiquette: retablirAuBout(affichee, bout), inactif: auDepart },
        });
      }

      // La ligne fixe : la butée du dernier geste, sinon un bout sorti de sa plage, sinon la plage sûre.
      const cause = butee && butee.grandeur === affichee ? limites[butee.bout]?.[butee.cote] : null;
      const sorti = BOUTS.find((bout) => !sansSegment[bout] && horsDeLaPlageAuBout[bout]);
      const plages = BOUTS.filter((bout) => !sansSegment[bout] && limites[bout])
        .map((bout) => ({ bout, bas: limites[bout]!.bas.valeur, haut: limites[bout]!.haut.valeur }));
      if (butee && cause?.cause) ligneDeLaPlage.poser(buteeDuColorShift(affichee, butee.bout, cause.valeur, cause.cause), 'butee');
      else if (sorti) ligneDeLaPlage.poser(horsDeLaPlage(sorti), 'avertissement');
      else ligneDeLaPlage.poser(plages.length > 0 ? plageSure(affichee, plages) : '');

      // L'état du calcul des limites, que les tests d'interface attendent avant un geste.
      element.dataset.limites = calculs.enCours() ? 'en-cours' : 'pretes';

      const texteDeLaNote = grise ? TEXTES_DE_LA_DERIVE.grise
        : sansSegment.clair ? TEXTES_DE_LA_DERIVE.sansSegmentClair
          : sansSegment.sombre ? TEXTES_DE_LA_DERIVE.sansSegmentSombre : '';
      i18n.lier(note, 'textContent', texteDeLaNote);
      note.hidden = texteDeLaNote === '';
    }

    return {
      element,
      focaliser() {
        boutonsDOnglet.find(({ onglet }) => onglet.getAttribute('aria-selected') === 'true')?.onglet.focus();
      },
      afficher(recetteLue, paletteLue, rampesLues, ancrageLu, analyseLue, modeLu) {
        if (palette && paletteLue.id !== palette.id) {
          confirmationOuverte = false;
          butee = null;
          calculs.abandonner();
          cleDesLimites = null;
        }
        analyse = analyseLue;
        recette = recetteLue;
        palette = paletteLue;
        rampes = rampesLues;
        ancrage = ancrageLu;
        mode = modeLu;
        dessiner();
      },
    };
  }
  return { createEditeur };
}

export const creerVuesEditeur = memoriserVues(construireVues);
