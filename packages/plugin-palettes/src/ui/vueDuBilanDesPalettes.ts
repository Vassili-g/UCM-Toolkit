/**
 * Le bilan des palettes de l'onglet Vérification sans palette ouverte : le
 * nuancier vérifié (`nuancierDesPalettes.ts`), les onglets « À corriger »,
 * « À vérifier » et « Conformes » en forme de bascule Light/Dark, puis une
 * ligne de détail par palette de l'onglet actif. Quand tout est conforme, une
 * phrase à la place des onglets.
 *
 * Le classement des palettes (`bilanDesPalettes.ts`) se calcule une fois par
 * recette lue : un rendu de la même recette ne le refait pas, et ne redessine
 * pas non plus ce qui n'a pas changé.
 */
import type { Recette } from 'ucm-couleur';

import {
  ETATS_DU_BILAN,
  bilanDesPalettes,
  ongletActifDuBilan,
  type BilanDesPalettes,
  type EtatDuBilan,
  type LigneDuBilan,
} from './bilanDesPalettes';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import { aplatsDeLaCarte, creerVuesNuancierDesPalettes } from './nuancierDesPalettes';

/** Ce que le bilan demande au reste de l'interface. */
export interface GestesDuBilan {
  /** Ouvre la vérification de la palette, comme le choix dans le sélecteur. */
  ouvrir(id: string): void;
}

export interface BilanDesPalettesUi {
  readonly element: HTMLDivElement;
  /** Montre le bilan de la recette ; la même recette ne le recalcule pas. */
  afficher(recette: Recette): void;
}

function construireVues(i18n: Localisation) {
  const { nuancierDesPalettes } = creerVuesNuancierDesPalettes(i18n);
  const { TEXTES_DU_BILAN_DES_PALETTES, TEXTES_DU_PIED, constatDAlerte, nomDeLaPalette } = i18n.messages;

  /** Le texte secondaire d'une ligne : la garantie manquée, la paire trop proche ou l'alerte, dans les mots de la vérification. */
  function texteDuConstat(ligne: LigneDuBilan, recette: Recette): Texte {
    const { constat } = ligne;
    switch (constat?.nature) {
      case 'garantie':
        return TEXTES_DU_BILAN_DES_PALETTES.garantie(constat.mode, constat.variable, constat.contraste);
      case 'proche':
        return TEXTES_DU_BILAN_DES_PALETTES.procheDe(nomDeLaPalette(constat.avec), constat.distance);
      case 'alerte':
        return constatDAlerte(constat.alerte, {
          recette,
          nomDe: (id) => {
            const trouvee = recette.palettes.find((candidate) => candidate.id === id);
            return trouvee ? nomDeLaPalette(trouvee) : id;
          },
        }).quoi;
      default:
        return '';
    }
  }

  function createBilanDesPalettes(gestes: GestesDuBilan): BilanDesPalettesUi {
    const element = document.createElement('div');
    element.className = 'bilan-des-palettes';
    element.setAttribute('role', 'region');
    i18n.lier(element, 'aria-label', TEXTES_DU_BILAN_DES_PALETTES.region);

    // Les onglets du bilan ont la forme de la bascule Light/Dark, sans libellé.
    const onglets = document.createElement('div');
    onglets.className = 'choix-d-affichage bilan-onglets';
    const bascule = document.createElement('div');
    bascule.className = 'bascule';
    bascule.setAttribute('role', 'group');
    i18n.lier(bascule, 'aria-label', TEXTES_DU_BILAN_DES_PALETTES.onglets);
    onglets.append(bascule);

    // Tout est conforme : une coche verte et deux phrases.
    const toutTient = document.createElement('div');
    toutTient.className = 'bilan-tout-conforme';
    const coche = document.createElement('span');
    coche.className = 'bilan-coche';
    coche.setAttribute('aria-hidden', 'true');
    coche.textContent = '✓';
    const phrases = document.createElement('div');
    const phrase = document.createElement('strong');
    const secondaire = document.createElement('span');
    secondaire.className = 'bilan-secondaire';
    i18n.lier(secondaire, 'textContent', TEXTES_DU_BILAN_DES_PALETTES.aucuneProche);
    phrases.append(phrase, secondaire);
    toutTient.append(coche, phrases);

    // Onglets ou phrase : une zone de hauteur fixe, pour que le nuancier ne bouge pas d'un cas à l'autre.
    const entete = document.createElement('div');
    entete.className = 'bilan-entete';
    entete.append(onglets, toutTient);

    const nuancier = nuancierDesPalettes((id) => gestes.ouvrir(id));
    const detail = document.createElement('div');
    detail.className = 'bilan-detail';
    element.append(entete, nuancier.element, detail);

    /** Le classement de la dernière recette lue. */
    let lu: { readonly recette: Recette; readonly bilan: BilanDesPalettes } | null = null;
    /** L'onglet que le designer a choisi, tant qu'il existe. */
    let choisi: EtatDuBilan | null = null;
    /** Ce que l'écran montre : la recette et l'onglet actif. */
    let dessine: { readonly recette: Recette; readonly actif: EtatDuBilan | null } | null = null;

    function onglet(etat: EtatDuBilan, compte: number, actif: boolean): HTMLButtonElement {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bascule-option';
      bouton.dataset.onglet = etat;
      bouton.setAttribute('aria-pressed', String(actif));
      if (etat !== 'conforme') {
        const point = document.createElement('i');
        point.className = 'bilan-point';
        point.dataset.etat = etat;
        point.setAttribute('aria-hidden', 'true');
        bouton.append(point);
      }
      const libelle = document.createElement('span');
      i18n.lier(libelle, 'textContent', TEXTES_DU_BILAN_DES_PALETTES.etats[etat]);
      const nombre = document.createElement('b');
      nombre.textContent = String(compte);
      bouton.append(libelle, nombre);
      bouton.addEventListener('click', () => {
        choisi = etat;
        if (lu) afficher(lu.recette);
        // L'onglet se redessine : le clavier garde sa place.
        bascule.querySelector<HTMLElement>(`[data-onglet="${etat}"]`)?.focus();
      });
      return bouton;
    }

    function ligneDeDetail(ligne: LigneDuBilan, recette: Recette): HTMLDivElement {
      const nom = nomDeLaPalette(ligne.palette);
      const rangee = document.createElement('div');
      rangee.className = 'bilan-ligne';
      rangee.dataset.palette = ligne.palette.id;
      const mini = document.createElement('span');
      mini.className = 'bilan-mini';
      for (const couleur of aplatsDeLaCarte(recette, ligne.palette)) {
        const aplat = document.createElement('i');
        aplat.style.background = couleur;
        mini.append(aplat);
      }
      const nomDeLaLigne = document.createElement('b');
      nomDeLaLigne.className = 'bilan-ligne-nom';
      nomDeLaLigne.textContent = nom;
      nomDeLaLigne.title = nom;
      const constat = texteDuConstat(ligne, recette);
      const texte = document.createElement('span');
      texte.className = 'bilan-ligne-constat';
      i18n.lier(texte, 'textContent', constat);
      i18n.lier(texte, 'title', constat);
      const verifier = document.createElement('button');
      verifier.type = 'button';
      verifier.className = 'bilan-verifier';
      i18n.lier(verifier, 'textContent', TEXTES_DU_PIED.verifier);
      i18n.lier(verifier, 'aria-label', TEXTES_DU_BILAN_DES_PALETTES.verifier(nom));
      verifier.addEventListener('click', () => gestes.ouvrir(ligne.palette.id));
      rangee.append(mini, nomDeLaLigne, texte, verifier);
      return rangee;
    }

    function afficher(recette: Recette): void {
      if (lu?.recette !== recette) {
        lu = { recette, bilan: bilanDesPalettes(recette) };
        dessine = null;
      }
      const { bilan } = lu;
      const actif = ongletActifDuBilan(bilan.comptes, choisi);
      // Un choix dont l'onglet a disparu ne revient pas de lui-même.
      if (choisi !== null && (actif === null || bilan.comptes[choisi] === 0)) choisi = null;
      if (dessine?.recette === recette && dessine.actif === actif) return;
      dessine = { recette, actif };

      onglets.hidden = actif === null;
      toutTient.hidden = actif !== null;
      detail.hidden = actif === null || actif === 'conforme';
      if (actif === null) {
        i18n.lier(phrase, 'textContent', TEXTES_DU_BILAN_DES_PALETTES.toutTient(bilan.lignes.length));
        bascule.replaceChildren();
      } else {
        bascule.replaceChildren(...ETATS_DU_BILAN.filter((etat) => bilan.comptes[etat] > 0).map((etat) => onglet(etat, bilan.comptes[etat], etat === actif)));
      }

      nuancier.afficher({
        recette,
        palettes: bilan.lignes.map((ligne) => ({
          palette: ligne.palette,
          ...(ligne.etat !== 'conforme' && actif !== null ? { etat: ligne.etat } : {}),
          attenuee: actif !== null && ligne.etat !== actif,
        })),
      });
      detail.replaceChildren(...(detail.hidden ? [] : bilan.lignes.filter((ligne) => ligne.etat === actif).map((ligne) => ligneDeDetail(ligne, recette))));
    }

    return { element, afficher };
  }
  return { createBilanDesPalettes };
}

export const creerVuesBilanDesPalettes = memoriserVues(construireVues);
