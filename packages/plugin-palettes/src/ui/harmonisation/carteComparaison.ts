/**
 * La carte « Comparaison » d'Harmonisation ([UI-41]) : les palettes cochées,
 * par teinte comme la liste, sur le fond de page du thème de l'aperçu, leurs
 * nuances l'une sous l'autre, puis leurs composants en colonnes (plein,
 * contour, message, lien), puis les constats. Les rôles de chaque composant viennent de la table du kit. En
 * Niveaux de gris, chaque couleur de la surface devient le gris de même
 * clarté OKLab ; le texte des boutons pleins reste blanc ou noir. Une palette
 * libre n'a pas de composants : sa colonne le dit. Les constats lisent les
 * valeurs courantes de la recette.
 *
 * La carte ne se redessine que si la recette, ses paires, les cochées, le
 * thème, l'intensité ou l'affichage changent.
 */
import { estLibre, type Mode, type Palette, type PaireTropProche, type Profil, type Recette } from 'ucm-couleur';

import { constatsDeLaComparaison, type ConstatDeComparaison, type EtatHarmonisation } from '../../harmonisation';
import { rangerSelon } from '../../ordreDesPalettes';
import { createCarte } from '../carte';
import { creerVuesChoix } from '../choix';
import { memoriserVues, type Localisation, type Texte } from '../localisation';
import { couleurDuRoleVue, ENCRE_D_APERCU, enGris, nuancesVues, type AffichageDApercu, type RoleDApercu } from './apercu';

export interface GestesDeLaCarteDeComparaison {
  choisirAffichage(affichage: AffichageDApercu): void;
}

export interface CarteDeComparaisonUi {
  readonly element: HTMLElement;
  /** `ordre` range les palettes cochées par identifiant. */
  afficher(recette: Recette, paires: readonly PaireTropProche[], etat: EtatHarmonisation, ordre: readonly string[]): void;
}

const ICONES: Readonly<Record<ConstatDeComparaison['ton'], string>> = { avertissement: '!', succes: '✓', info: 'i' };

/** Les rangées de composants sous les noms : plein, contour, message, lien. */
const RANGEES_DE_COMPOSANTS = 4;

function construireVues(i18n: Localisation) {
  const { createChoix } = creerVuesChoix(i18n);
  const { TEXTES_DE_L_HARMONISATION: { comparaison: TEXTES }, nomDeLaPalette } = i18n.messages;

  function createCarteDeComparaison(gestes: GestesDeLaCarteDeComparaison): CarteDeComparaisonUi {
    const carte = createCarte({ titre: TEXTES.titre, sousTitre: TEXTES.sousTitre, repliable: { ouverte: true } }, i18n);
    const affichage = createChoix<AffichageDApercu>({
      libelle: '', nom: TEXTES.affichage,
      options: [{ valeur: 'couleurs', texte: TEXTES.couleurs }, { valeur: 'gris', texte: TEXTES.gris }],
      surChoix: (valeur) => gestes.choisirAffichage(valeur),
    });
    carte.poserLesChoix(affichage);
    const surface = document.createElement('div');
    surface.className = 'surface';
    const constats = document.createElement('div');
    constats.className = 'constats-de-comparaison';
    constats.dataset.hauteurTenue = '';
    constats.setAttribute('role', 'status');
    carte.corps.append(surface, constats);
    let dessinee: { readonly recette: Recette; readonly paires: readonly PaireTropProche[]; readonly cochees: string; readonly mode: Mode; readonly intensite: Profil; readonly affichage: AffichageDApercu } | null = null;

    const nom = (recette: Recette, id: string): string => nomDeLaPalette(recette.palettes.find((palette) => palette.id === id)!);

    function nuances(recette: Recette, cochees: readonly Palette[], etat: EtatHarmonisation): HTMLDivElement {
      const element = document.createElement('div');
      element.className = 'nuances';
      const numeros = document.createElement('span');
      numeros.className = 'numeros';
      for (const cran of recette.crans) {
        const numero = document.createElement('span');
        numero.textContent = String(cran);
        numeros.append(numero);
      }
      element.append(document.createElement('span'), numeros);
      for (const palette of cochees) {
        const titre = document.createElement('b');
        titre.textContent = nomDeLaPalette(palette);
        titre.title = nomDeLaPalette(palette);
        const rampe = document.createElement('span');
        rampe.className = 'rampe-continue';
        for (const { hexa } of nuancesVues(recette, palette, etat.intensite, etat.mode)) {
          const aplat = document.createElement('i');
          aplat.style.background = etat.affichage === 'gris' ? enGris(hexa) : hexa;
          rampe.append(aplat);
        }
        element.append(titre, rampe);
      }
      return element;
    }

    /** Un texte posé dans la colonne et la rangée de la grille ; l'appelant lui donne sa classe et ses couleurs. */
    function composant(texte: Texte, colonne: number, rangee: number): HTMLSpanElement {
      const element = document.createElement('span');
      element.style.gridColumn = String(colonne);
      element.style.gridRow = String(rangee);
      i18n.lier(element, 'textContent', texte);
      return element;
    }

    function composants(recette: Recette, cochees: readonly Palette[], etat: EtatHarmonisation): HTMLDivElement {
      const element = document.createElement('div');
      element.className = 'composants';
      element.style.gridTemplateColumns = `repeat(${cochees.length}, minmax(0, 1fr))`;
      element.style.color = ENCRE_D_APERCU[etat.mode];
      cochees.forEach((palette, rang) => {
        const colonne = rang + 1;
        const titre = document.createElement('b');
        titre.textContent = nomDeLaPalette(palette);
        titre.title = nomDeLaPalette(palette);
        titre.style.gridColumn = String(colonne);
        titre.style.gridRow = '1';
        element.append(titre);
        if (estLibre(palette)) {
          const libre = composant(TEXTES.libre, colonne, 2);
          libre.className = 'composants-libre';
          libre.style.gridRow = `2 / span ${RANGEES_DE_COMPOSANTS}`;
          element.append(libre);
          return;
        }
        const couleur = (role: RoleDApercu): string => couleurDuRoleVue(recette, palette, role, etat.mode, etat.intensite, etat.affichage) ?? '';
        const [plein, contour, message, lien] = [
          composant(TEXTES.valider, colonne, 2),
          composant(TEXTES.annuler, colonne, 3),
          composant(TEXTES.message, colonne, 4),
          composant(TEXTES.lien, colonne, 5),
        ];
        plein.className = 'btn-c';
        contour.className = 'btn-c';
        message.className = 'message';
        lien.className = 'lien';
        plein.style.background = couleur('solid/default');
        plein.style.color = couleur('solid/foreground');
        contour.style.borderColor = couleur('page/border');
        contour.style.color = couleur('page/foreground');
        message.style.background = couleur('surface/default');
        message.style.color = couleur('surface/foreground');
        lien.style.color = couleur('page/foreground');
        element.append(plein, contour, message, lien);
      });
      return element;
    }

    /** Les segments d'un constat : les rangs impairs sont des noms de palettes, en gras. */
    function segments(recette: Recette, constat: ConstatDeComparaison): readonly Texte[] {
      switch (constat.genre) {
        case 'paire': return TEXTES.constats.paire(nom(recette, constat.palettes[0]), nom(recette, constat.palettes[1]), constat.role, constat.mode, constat.sansSortie);
        case 'separee': return TEXTES.constats.separee(nom(recette, constat.palettes[0]), nom(recette, constat.palettes[1]));
        case 'distinctes': return [TEXTES.constats.distinctes];
        case 'saturation': return TEXTES.constats.saturation(constat.intensite, nom(recette, constat.terne), nom(recette, constat.vive));
        case 'luminosite': return TEXTES.constats.luminosite(constat.intensite, nom(recette, constat.palette), constat.sens);
      }
    }

    function ligneDeConstat(recette: Recette, constat: ConstatDeComparaison): HTMLDivElement {
      const element = document.createElement('div');
      element.className = 'constat-de-comparaison';
      element.dataset.ton = constat.ton;
      const icone = document.createElement('i');
      icone.setAttribute('aria-hidden', 'true');
      icone.textContent = ICONES[constat.ton];
      const texte = document.createElement('span');
      segments(recette, constat).forEach((segment, rang) => {
        const morceau = document.createElement(rang % 2 === 1 ? 'b' : 'span');
        i18n.lier(morceau, 'textContent', segment);
        texte.append(morceau);
      });
      element.append(icone, texte);
      return element;
    }

    return {
      element: carte.element,
      afficher(recette, paires, etat, ordre) {
        const cochees = rangerSelon(etat.cochees.flatMap((id) => recette.palettes.find((palette) => palette.id === id) ?? []), ordre, ({ id }) => id);
        carte.element.hidden = cochees.length < 2;
        if (cochees.length < 2) {
          dessinee = null;
          return;
        }
        affichage.poser(etat.affichage);
        const identifiants = cochees.map(({ id }) => id).join(' ');
        if (dessinee?.recette === recette && dessinee.paires === paires && dessinee.cochees === identifiants
          && dessinee.mode === etat.mode && dessinee.intensite === etat.intensite && dessinee.affichage === etat.affichage) return;
        dessinee = { recette, paires, cochees: identifiants, mode: etat.mode, intensite: etat.intensite, affichage: etat.affichage };
        carte.poserResume(TEXTES.resume(cochees.length));
        surface.style.background = recette.fonds[etat.mode];
        surface.style.color = ENCRE_D_APERCU[etat.mode];
        surface.replaceChildren(nuances(recette, cochees, etat), composants(recette, cochees, etat));
        constats.replaceChildren(...constatsDeLaComparaison(recette, etat, paires).map((constat) => ligneDeConstat(recette, constat)));
      },
    };
  }
  return { createCarteDeComparaison };
}

export const creerVuesCarteDeComparaison = memoriserVues(construireVues);
