/**
 * L'onglet Harmonisation : son en-tête, son bilan et ses cartes lisent la
 * recette entière, sans palette ouverte. L'état de l'onglet vit ici, le temps
 * de la session ; les cartes le reçoivent à chaque rendu et lui rendent leurs
 * gestes.
 */
import { pairesTropProches, type Mode, type PaireTropProche, type Profil, type Recette } from 'ucm-couleur';

import { cocherPalette, comparerLaPaire, entrerEnHarmonisation, harmonisationInitiale, synchroniserHarmonisation, toutDecocher } from '../harmonisation';
import { creerVuesChoix } from './choix';
import { creerVuesCarteDeLaListe } from './harmonisation/carteListe';
import { creerVuesCarteDesPaires } from './harmonisation/cartePaires';
import { lireTexte, memoriserVues, type Localisation } from './localisation';
import type { PaletteOuverte } from './paletteOuverte';

function construireVues(i18n: Localisation) {
  const { createChoix } = creerVuesChoix(i18n);
  const { createCarteDesPaires } = creerVuesCarteDesPaires(i18n);
  const { createCarteDeLaListe } = creerVuesCarteDeLaListe(i18n);
  const { TEXTES, TEXTES_DE_L_HARMONISATION, NOM_DU_PROFIL } = i18n.messages;

  function createOngletHarmonisation(source: PaletteOuverte) {
    let etat = harmonisationInitiale();
    let actif = false;
    let nombre = 0;
    /** Les paires se recalculent quand la recette change, pas à chaque rendu. */
    let recette: Recette | null = null;
    let paires: readonly PaireTropProche[] = [];

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
      comparer(paire) {
        if (recette) etat = comparerLaPaire(etat, recette, paire);
        rendre();
      },
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
    element.append(tete, ligne, cartePaires.element, carteListe.element);

    /** Les cartes se repeignent seulement onglet visible : un onglet caché ne calcule pas les rampes. */
    function peindreLesCartes(): void {
      if (!recette) return;
      cartePaires.afficher(recette, paires);
      carteListe.afficher(recette, paires, etat);
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

    /** Le texte du socle se retraduit dans l'onglet ; le compteur en reste un enfant distinct. */
    function lierLeCompteur(onglet: HTMLElement): void {
      const pastille = document.createElement('span');
      pastille.className = 'compteur-de-verification';
      pastille.dataset.ton = 'avertissement';
      pastille.setAttribute('aria-hidden', 'true');
      const nom = { lire: () => nombre > 0
        ? `${lireTexte(TEXTES.ongletHarmonisation)} : ${lireTexte(TEXTES_DE_L_HARMONISATION.bilan(nombre))}`
        : lireTexte(TEXTES.ongletHarmonisation) };
      i18n.lier(onglet, 'aria-label', nom);
      function suivre(): void {
        const lue = source.recette();
        etat = synchroniserHarmonisation(etat, lue);
        if (lue !== recette) {
          recette = lue;
          paires = lue ? pairesTropProches(lue) : [];
        }
        nombre = paires.length;
        pastille.textContent = String(nombre);
        if (nombre > 0) {
          if (pastille.parentElement !== onglet) onglet.append(pastille);
          onglet.dataset.compteur = 'avertissement';
        } else {
          pastille.remove();
          delete onglet.dataset.compteur;
        }
        i18n.lier(onglet, 'aria-label', nom);
        rendre();
      }
      source.abonner(suivre);
      suivre();
    }

    return {
      element,
      lierLeCompteur,
      montrer(suivant: boolean): void {
        if (suivant && !actif) etat = entrerEnHarmonisation(etat);
        actif = suivant;
        if (actif) rendre();
      },
    };
  }
  return { createOngletHarmonisation };
}

export const creerVuesOngletHarmonisation = memoriserVues(construireVues);
