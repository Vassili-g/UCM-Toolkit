/**
 * L'onglet Harmonisation : son en-tête, son bilan et ses cartes lisent la
 * recette entière, sans palette ouverte. L'état de l'onglet vit ici, le temps
 * de la session ; les cartes le reçoivent à chaque rendu et lui rendent leurs
 * gestes.
 *
 * Les réglages de la carte « Réglages » ([UI-42]) et les points de la carte
 * « Roue des teintes » ([UI-43]) passent par la recette que l'onglet
 * Création porte : un glisser la prévisualise, sa fin la range par la
 * frontière. L'onglet garde la recette et les départs d'avant un glisser et
 * d'avant les rangements en vol : un refus (de la validation, ou du sandbox
 * qui juge la recette invalide) les rend. Un conflit d'enregistrement ne rend
 * rien, pour que le brouillon reste exportable.
 */
import { pairesTropProches, validerRecette, type Mode, type Palette, type PaireTropProche, type Profil, type Recette, type Refus } from 'ucm-couleur';

import { remplacerPalette } from '../edition';
import { annulerLaPalette, basculerLaRoue, choisirAffichage, choisirLaVision, choisirPaletteARegler, cocherPalette, comparerLaPaire, entrerEnHarmonisation, harmonisationInitiale, memoriserLeDepart, saisirPalette, synchroniserHarmonisation, toutDecocher, type EtatHarmonisation } from '../harmonisation';
import { creerVuesChoix } from './choix';
import type { StatutDuRangement } from './frontiere';
import { creerVuesCarteDeComparaison } from './harmonisation/carteComparaison';
import { creerVuesCarteDeLaListe } from './harmonisation/carteListe';
import { creerVuesCarteDesPaires } from './harmonisation/cartePaires';
import { creerVuesCarteDesReglages } from './harmonisation/carteReglages';
import { creerVuesCarteDeLaRoue } from './harmonisation/carteRoue';
import { lireTexte, memoriserVues, type Localisation } from './localisation';
import type { PaletteOuverte } from './paletteOuverte';

/** Ce que l'onglet demande à l'onglet Création, qui porte la recette et la frontière. */
export interface GestesDeLOngletHarmonisation {
  /** Montre la recette sans la ranger : un glisser en cours. */
  previsualiser(recette: Recette): void;
  /** Montre la recette d'avant un geste abandonné ou un rangement refusé. */
  restaurer(recette: Recette): void;
  /** Range la recette. */
  ranger(recette: Recette): void;
}

/** La recette et les départs d'avant un geste, que son abandon ou un refus rend. */
interface Avant {
  readonly recette: Recette;
  readonly departs: EtatHarmonisation['departs'];
}

function construireVues(i18n: Localisation) {
  const { createChoix } = creerVuesChoix(i18n);
  const { createCarteDesPaires } = creerVuesCarteDesPaires(i18n);
  const { createCarteDeLaListe } = creerVuesCarteDeLaListe(i18n);
  const { createCarteDeComparaison } = creerVuesCarteDeComparaison(i18n);
  const { createCarteDesReglages } = creerVuesCarteDesReglages(i18n);
  const { createCarteDeLaRoue } = creerVuesCarteDeLaRoue(i18n);
  const { TEXTES, TEXTES_DE_L_HARMONISATION, NOM_DU_PROFIL } = i18n.messages;

  function createOngletHarmonisation(source: PaletteOuverte, gestes: GestesDeLOngletHarmonisation) {
    let etat = harmonisationInitiale();
    let actif = false;
    let nombre = 0;
    /** Les paires se recalculent quand la recette change, pas à chaque rendu. */
    let recette: Recette | null = null;
    let paires: readonly PaireTropProche[] = [];
    /** Le bouton de l'onglet, une fois le compteur lié. */
    let boutonDeLOnglet: HTMLElement | null = null;
    /** La recette et les départs d'avant le glisser en cours. */
    let avantLeGeste: Avant | null = null;
    /** La recette et les départs d'avant le premier des rangements que le sandbox n'a pas encore jugés. */
    let enVol: Avant | null = null;

    const element = document.createElement('div');
    element.className = 'page-stack colonne vue-de-la-palette harmonisation';
    const tete = document.createElement('div');
    tete.className = 'tete-de-la-palette';
    const titre = document.createElement('h2');
    titre.className = 'titre-de-premier-rang';
    i18n.lier(titre, 'textContent', TEXTES.ongletHarmonisation);
    const intensite = createChoix<Profil>({
      libelle: '', nom: TEXTES_DE_L_HARMONISATION.intensite,
      options: [{ valeur: 'soft', texte: NOM_DU_PROFIL.soft }, { valeur: 'vivid', texte: NOM_DU_PROFIL.vivid }],
      surChoix(valeur) { etat = { ...etat, intensite: valeur }; rendre(); },
    });
    const mode = createChoix<Mode>({
      libelle: '', nom: TEXTES.modesDeLApercu,
      options: [{ valeur: 'light', texte: TEXTES.modeClairCourt }, { valeur: 'dark', texte: TEXTES.modeSombreCourt }],
      surChoix(valeur) { etat = { ...etat, mode: valeur }; rendre(); },
    });
    tete.append(titre, intensite.element, mode.element);

    const ligne = document.createElement('div');
    ligne.className = 'ligne-fixe';
    ligne.setAttribute('role', 'status');
    const icone = document.createElement('span');
    icone.className = 'ligne-fixe-icone';
    icone.setAttribute('aria-hidden', 'true');
    const texte = document.createElement('span');
    texte.className = 'ligne-fixe-texte';
    ligne.append(icone, texte);
    const cartePaires = createCarteDesPaires({
      comparer: comparerLaPaireChoisie,
    });
    const carteListe = createCarteDeLaListe({
      cocher(id) {
        if (recette) etat = cocherPalette(etat, recette, id);
        rendre();
      },
      toutDecocher() {
        etat = toutDecocher(etat);
        rendre();
      },
    });
    const carteComparaison = createCarteDeComparaison({
      choisirAffichage(affichage) {
        etat = choisirAffichage(etat, affichage);
        rendre();
      },
    });
    const carteReglages = createCarteDesReglages({
      choisir(id) {
        etat = choisirPaletteARegler(etat, id);
        rendre();
      },
      previsualiser: previsualiserLaPalette,
      valider: validerLaPalette,
      abandonner,
      annulerLesModifications,
    });
    const carteRoue = createCarteDeLaRoue({
      saisir(id) {
        if (!recette) return false;
        etat = saisirPalette(etat, recette, id);
        rendre();
        return etat.regler === id;
      },
      choisirLaVision(vision) {
        etat = choisirLaVision(etat, vision);
        rendre();
      },
      basculer(ouverte) {
        etat = basculerLaRoue(etat, ouverte);
        rendre();
      },
      previsualiser: previsualiserLaPalette,
      valider: validerLaPalette,
      abandonner,
    });
    element.append(tete, ligne, cartePaires.element, carteListe.element, carteComparaison.element, carteReglages.element, carteRoue.element);

    /** Coche la paire et choisit la palette à régler, depuis la carte des paires ou le bilan de Vérification. */
    function comparerLaPaireChoisie(paire: PaireTropProche): void {
      if (recette) etat = comparerLaPaire(etat, recette, paire);
      rendre();
    }

    /** Les cartes se repeignent seulement onglet visible : un onglet caché ne calcule pas les rampes. */
    function peindreLesCartes(): void {
      if (!recette) return;
      cartePaires.afficher(recette, paires);
      carteListe.afficher(recette, paires, etat);
      carteComparaison.afficher(recette, paires, etat);
      carteReglages.afficher(recette, etat, avantLeGeste !== null);
      carteRoue.afficher(recette, paires, etat, avantLeGeste !== null);
    }

    function rendre(): void {
      intensite.poser(etat.intensite);
      mode.poser(etat.mode);
      ligne.dataset.ton = nombre > 0 ? 'avertissement' : 'neutre';
      icone.textContent = nombre > 0 ? '!' : '✓';
      const bilan = TEXTES_DE_L_HARMONISATION.bilan(nombre);
      i18n.lier(texte, 'textContent', bilan);
      i18n.lier(texte, 'title', bilan);
      if (actif) peindreLesCartes();
    }

    /** Le compteur de l'onglet : un enfant distinct, pour que le texte du socle se retraduise sans l'effacer. */
    const pastille = document.createElement('span');
    pastille.className = 'compteur-de-verification';
    pastille.dataset.ton = 'avertissement';
    pastille.setAttribute('aria-hidden', 'true');
    const nomDeLOnglet = { lire: () => nombre > 0
      ? `${lireTexte(TEXTES.ongletHarmonisation)} : ${lireTexte(TEXTES_DE_L_HARMONISATION.bilan(nombre))}`
      : lireTexte(TEXTES.ongletHarmonisation) };

    /**
     * Met l'état d'accord avec la recette de l'onglet Création. Les paires et
     * le compteur se recalculent quand elle a changé, y compris sous un
     * glisser de la carte « Réglages ».
     */
    function relire(): void {
      const lue = source.recette();
      etat = synchroniserHarmonisation(etat, lue);
      if (lue !== recette) {
        recette = lue;
        paires = lue ? pairesTropProches(lue) : [];
      }
      nombre = paires.length;
      if (!boutonDeLOnglet) return;
      pastille.textContent = String(nombre);
      if (nombre > 0) {
        if (pastille.parentElement !== boutonDeLOnglet) boutonDeLOnglet.append(pastille);
        boutonDeLOnglet.dataset.compteur = 'avertissement';
      } else {
        pastille.remove();
        delete boutonDeLOnglet.dataset.compteur;
      }
      i18n.lier(boutonDeLOnglet, 'aria-label', nomDeLOnglet);
    }

    function lierLeCompteur(onglet: HTMLElement): void {
      boutonDeLOnglet = onglet;
      source.abonner(() => {
        relire();
        rendre();
      });
      relire();
      rendre();
    }

    /** Montre la recette réglée sans la ranger, à chaque image d'un glisser. */
    function previsualiserLaPalette(palette: Palette): void {
      const lue = source.recette();
      const ancienne = lue?.palettes.find(({ id }) => id === palette.id);
      if (!lue || !ancienne) return;
      avantLeGeste ??= { recette: lue, departs: etat.departs };
      etat = memoriserLeDepart(etat, ancienne);
      gestes.previsualiser(remplacerPalette(lue, palette));
      relire();
      rendre();
    }

    /** Rend la recette et les départs d'avant. */
    function restaurer(avant: Avant): void {
      etat = { ...etat, departs: avant.departs };
      gestes.restaurer(avant.recette);
      relire();
      rendre();
    }

    function ranger(suivante: Recette, avant: Avant): void {
      enVol ??= avant;
      gestes.ranger(suivante);
      relire();
      rendre();
    }

    /**
     * La fin d'un glisser, d'une saisie ou d'un « Par défaut » : la validation
     * de la recette décide, puis elle se range. Un refus rend la recette et les
     * départs d'avant le geste.
     */
    function validerLaPalette(palette: Palette): Refus | null {
      const lue = source.recette();
      const avant = avantLeGeste ?? (lue ? { recette: lue, departs: etat.departs } : null);
      const ancienne = avant?.recette.palettes.find(({ id }) => id === palette.id);
      avantLeGeste = null;
      if (!lue || !avant || !ancienne) return null;
      const suivante = remplacerPalette(lue, palette);
      const jugee = validerRecette(suivante);
      if ('refus' in jugee) {
        restaurer(avant);
        return jugee.refus[0];
      }
      etat = memoriserLeDepart(etat, ancienne);
      ranger(suivante, avant);
      return null;
    }

    /** Échap pendant un glisser : la recette et les départs d'avant. */
    function abandonner(): void {
      const avant = avantLeGeste;
      avantLeGeste = null;
      if (avant) restaurer(avant);
    }

    /**
     * « Annuler les modifications » : la palette à régler reprend les réglages
     * de son départ dans l'onglet, elle seule. La pile d'annulation de la
     * session et ce qui a changé dans Création n'y entrent pas. Un refus laisse
     * la recette et les départs tels quels.
     */
    function annulerLesModifications(): Refus | null {
      const lue = source.recette();
      const issue = lue && etat.regler !== null ? annulerLaPalette(lue, etat, etat.regler) : null;
      if (!lue || !issue) return null;
      if ('refus' in issue) return issue.refus;
      ranger(issue.recette, { recette: lue, departs: etat.departs });
      return null;
    }

    return {
      element,
      lierLeCompteur,
      comparer: comparerLaPaireChoisie,
      montrer(suivant: boolean): void {
        if (suivant && !actif) etat = entrerEnHarmonisation(etat);
        actif = suivant;
        if (actif) rendre();
      },
      /** Le sandbox a jugé un rangement : une recette invalide rend l'état d'avant, tout autre statut clôt l'attente. */
      poserStatut(statut: StatutDuRangement): void {
        if (statut === 'en-cours') return;
        const avant = statut === 'invalide' ? enVol : null;
        enVol = null;
        if (avant) restaurer(avant);
      },
    };
  }
  return { createOngletHarmonisation };
}

export const creerVuesOngletHarmonisation = memoriserVues(construireVues);
