/**
 * L'aperçu compact d'une palette : les rampes de ses intensités peintes du
 * fond d'un thème, la référence marquée ◆, et le résultat de ses garanties
 * dans ce thème, comme la bascule des garanties le donne (V4.2). La fiche de
 * l'onglet Palettes (V8.1), la tête des Réglages communs (V9.3) et les cartes
 * du choix des intensités ([ENT-14]) le montrent. La tête des Réglages communs
 * y ajoute les trois boutons : `solid/default`, `solid/hover` et
 * `solid/pressed` de la palette, avec le texte des boutons du thème.
 */
import { COULEUR_DU_TEXTE_DES_BOUTONS, ETATS, TABLE_DES_DOSSIERS, lireHexa, rampeDe, sensDuTheme, type Intensite, type Mode, type Recette } from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { memoriserVues, type Localisation } from './localisation';
import { creerVuesNuancier } from './nuancier';

function construireVues(i18n: Localisation) {
  const { encresSur } = creerVuesNuancier(i18n);
  const { NOM_DU_PROFIL, TEXTES, TEXTES_DE_L_APERCU, resultatDuProfil, resultatDuProfilEnMots } = i18n.messages;

  /** Le nom de chaque état sur son bouton, celui que l'aperçu en bandes donne sous `default`, `hover` et `pressed`. */
  const NOM_SUR_LE_BOUTON = { default: TEXTES_DE_L_APERCU.noms.repos, hover: TEXTES_DE_L_APERCU.noms.survol, pressed: TEXTES_DE_L_APERCU.noms.appui } as const;

  /**
   * Les trois boutons de la palette dans le thème : `solid/default`, `hover` et
   * `pressed`, aux crans de la table du sens du thème, avec le texte des
   * boutons en blanc ou noir purs. Vivid quand la palette a deux intensités.
   */
  function boutonsDeLApercu(recette: Recette, analyse: AnalyseDePalette, mode: Mode): HTMLDivElement {
    const texte = recette.texteDesBoutons[mode];
    const table = TABLE_DES_DOSSIERS[sensDuTheme(mode, texte)];
    const rampe = rampeDe(analyse.rampes, analyse.intensites.includes('vivid') ? 'vivid' : 'unique')[mode];
    const boutons = document.createElement('div');
    boutons.className = 'fiche-boutons';
    for (const etat of ETATS) {
      const rang = analyse.grille.crans.indexOf(table[`solid/${etat}`]);
      const bouton = document.createElement('span');
      bouton.className = 'fiche-bouton';
      bouton.dataset.etat = etat;
      if (rang >= 0) bouton.style.background = rampe[rang].hexa;
      bouton.style.color = COULEUR_DU_TEXTE_DES_BOUTONS[texte];
      i18n.lier(bouton, 'textContent', NOM_SUR_LE_BOUTON[etat]);
      boutons.append(bouton);
    }
    return boutons;
  }

  /**
   * Les rampes des intensités présentes, peintes du fond du thème, la référence
   * marquée ◆ ; la rampe unique n'a pas de nom. Avec `avecLesBoutons`, les trois
   * boutons de la palette suivent les rampes ; une palette libre n'en a pas.
   */
  function apercuCompact(recette: Recette, analyse: AnalyseDePalette, mode: Mode, avecLesBoutons = false): HTMLDivElement {
    const surface = document.createElement('div');
    surface.className = 'fiche-apercu';
    surface.style.background = recette.fonds[mode];
    const encres = encresSur(lireHexa(recette.fonds[mode]) ?? [255, 255, 255]);
    surface.style.setProperty('--encre-surface', encres.encre);
    surface.style.setProperty('--bordure-surface', encres.bordure);
    surface.style.setProperty('--colonnes', String(analyse.grille.crans.length));
    surface.setAttribute('aria-hidden', 'true');
    for (const profil of analyse.intensites) {
      const rangee = document.createElement('div');
      rangee.className = 'fiche-rangee';
      rangee.dataset.intensite = profil;
      const nom = document.createElement('span');
      nom.className = 'fiche-profil';
      i18n.lier(nom, 'textContent', profil === 'unique' ? '' : NOM_DU_PROFIL[profil]);
      rangee.append(nom);
      rampeDe(analyse.rampes, profil)[mode].forEach((cran, rang) => {
        const pastille = document.createElement('span');
        pastille.className = 'fiche-pastille';
        pastille.style.background = cran.hexa;
        if (analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang) {
          pastille.dataset.reference = 'true';
          i18n.lier(pastille, 'textContent', '◆');
          pastille.style.color = encresSur(lireHexa(cran.hexa) ?? [255, 255, 255]).encre;
        }
        rangee.append(pastille);
      });
      surface.append(rangee);
    }
    if (avecLesBoutons && !analyse.libre) surface.append(boutonsDeLApercu(recette, analyse, mode));
    return surface;
  }

  /** Le nombre de garanties qu'une intensité manque dans un thème. */
  function garantiesManquees(analyse: AnalyseDePalette, profil: Intensite, mode: Mode): number {
    return analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.profil === profil && promesse.verdict === 'manquee').length;
  }

  /**
   * « Soft ✓ · Vivid ✗ 2 », ou « Garanties ✓ » pour une palette à une
   * intensité, dans un thème, chaque résultat dit en mots pour
   * l'assistance technique. Une palette libre n'a pas de garantie : zéro
   * manquée s'écrirait « ✓ », et le résultat dit « Palette libre · N nuances ».
   * En `button`, le résultat est un geste : la fiche de Gestion y ouvre
   * Vérification ([UI-26]).
   */
  function resultatsDesGaranties(analyse: AnalyseDePalette, mode: Mode, balise: 'p' | 'button' = 'p'): HTMLElement {
    const resultats = document.createElement(balise);
    if (resultats instanceof HTMLButtonElement) resultats.type = 'button';
    resultats.className = 'fiche-garanties';
    if (balise === 'button') resultats.classList.add('fiche-verification');
    if (analyse.libre) {
      i18n.lier(resultats, 'textContent', TEXTES.paletteLibre(analyse.grille.crans.length));
      return resultats;
    }
    for (const profil of analyse.intensites) {
      const manquees = garantiesManquees(analyse, profil, mode);
      const resultat = document.createElement('span');
      i18n.lier(resultat, 'textContent', resultatDuProfil(profil, manquees));
      resultat.dataset.verdict = manquees === 0 ? 'tenue' : 'manquee';
      i18n.lier(resultat, 'aria-label', resultatDuProfilEnMots(profil, manquees));
      resultats.append(resultat);
    }
    return resultats;
  }
  return { apercuCompact, garantiesManquees, resultatsDesGaranties };
}

export const creerVuesApercuCompact = memoriserVues(construireVues);
