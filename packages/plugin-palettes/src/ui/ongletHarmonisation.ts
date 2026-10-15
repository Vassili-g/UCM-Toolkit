/** L'en-tête d'Harmonisation et son bilan lisent la recette entière, sans palette ouverte. */
import { pairesTropProches, type Mode, type Profil } from 'ucm-couleur';

import { entrerEnHarmonisation, harmonisationInitiale, synchroniserHarmonisation } from '../harmonisation';
import { creerVuesChoix } from './choix';
import { lireTexte, memoriserVues, type Localisation } from './localisation';
import type { PaletteOuverte } from './paletteOuverte';

function construireVues(i18n: Localisation) {
  const { createChoix } = creerVuesChoix(i18n);
  const { TEXTES, TEXTES_DE_L_HARMONISATION, NOM_DU_PROFIL } = i18n.messages;

  function createOngletHarmonisation(source: PaletteOuverte) {
    let etat = harmonisationInitiale();
    let actif = false;
    let nombre = 0;

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
    element.append(tete, ligne);

    function rendre(): void {
      intensite.poser(etat.intensite);
      mode.poser(etat.mode);
      ligne.dataset.ton = nombre > 0 ? 'avertissement' : 'neutre';
      icone.textContent = nombre > 0 ? '!' : '✓';
      const bilan = TEXTES_DE_L_HARMONISATION.bilan(nombre);
      i18n.lier(texte, 'textContent', bilan);
      i18n.lier(texte, 'title', bilan);
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
        const recette = source.recette();
        etat = synchroniserHarmonisation(etat, recette);
        nombre = recette ? pairesTropProches(recette).length : 0;
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
