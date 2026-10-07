/**
 * Le choix du profil que partagent les cartes de réglage et d'affichage : un
 * libellé qui dit la portée du choix, « Régler » quand les réglages modifient
 * le profil et « Afficher » quand il ne change que la rampe montrée, puis des
 * segments Soft, Vivid et Les deux. Les options demandées se rendent toujours
 * dans cet ordre, quel que soit l'ordre où la carte les liste.
 *
 * Le composant ne garde pas la valeur choisie : la carte la possède, reçoit
 * `surChoix`, puis la rend avec `poser`.
 */
import type { Profil } from 'ucm-couleur';

import { memoriserVues, type Localisation, type Texte } from './localisation';

export type ValeurDuChoix = Profil | 'deux';

export type PorteeDuChoix = 'regler' | 'afficher';

const ORDRE: readonly ValeurDuChoix[] = ['soft', 'vivid', 'deux'];

/** Ce qu'une carte pose sur un segment à la place du nom du profil. */
export interface SegmentDuChoix {
  readonly texte: Texte;
  /** Le nom accessible du segment, quand il diffère de son texte. */
  readonly nom?: Texte;
  /** Le verdict que le segment porte (`data-verdict`). */
  readonly verdict?: 'tenue' | 'manquee';
}

export interface ChoixDuProfilArguments {
  readonly portee: PorteeDuChoix;
  readonly options: readonly ValeurDuChoix[];
  readonly surChoix: (valeur: ValeurDuChoix) => void;
  /** Le nom accessible du groupe ; « Profil à régler » pour la portée `regler` par défaut. */
  readonly nom?: Texte;
}

/** Le contenu d'un segment qui porte plus que le nom de son profil ; `undefined` laisse le nom. */
export type SegmentDe = (valeur: ValeurDuChoix) => SegmentDuChoix | undefined;

export interface ChoixDuProfilUi {
  element: HTMLDivElement;
  /**
   * Marque `valeur` choisie, ou aucune avec `null` ; `porteur` ajoute « ◆ »
   * au segment du profil qui porte la référence ; `segmentDe` remplace le
   * contenu d'un segment.
   */
  poser(valeur: ValeurDuChoix | null, porteur?: Profil | null, segmentDe?: SegmentDe): void;
  cacher(oui: boolean): void;
  /** Le premier segment, que la carte focalise quand un message y mène. */
  premierSegment(): HTMLButtonElement;
}

function construireVues(i18n: Localisation) {
  const { NOM_DU_PROFIL, TEXTES_DES_REGLAGES } = i18n.messages;

  function createChoixDuProfil({ portee, options, surChoix, nom }: ChoixDuProfilArguments): ChoixDuProfilUi {
    const element = document.createElement('div');
    element.className = 'choix-du-profil';
    const libelle = document.createElement('span');
    libelle.className = 'field-label';
    i18n.lier(libelle, 'textContent', portee === 'regler' ? TEXTES_DES_REGLAGES.regler : TEXTES_DES_REGLAGES.afficher);
    const segments = document.createElement('div');
    segments.className = 'bascule';
    segments.setAttribute('role', 'group');
    i18n.lier(segments, 'aria-label', nom ?? (portee === 'regler' ? TEXTES_DES_REGLAGES.cible : TEXTES_DES_REGLAGES.afficher));
    const boutons = ORDRE.filter((valeur) => options.includes(valeur)).map((valeur) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bascule-option';
      bouton.addEventListener('click', () => surChoix(valeur));
      segments.append(bouton);
      return { valeur, bouton };
    });
    element.append(libelle, segments);

    return {
      element,
      poser(choisie, porteur = null, segmentDe) {
        for (const { valeur, bouton } of boutons) {
          const propre = segmentDe?.(valeur);
          const nomDuProfil = valeur === 'deux' ? TEXTES_DES_REGLAGES.lesDeux : NOM_DU_PROFIL[valeur];
          i18n.lier(bouton, 'textContent', propre?.texte ?? (valeur === porteur ? i18n.composer`${nomDuProfil} ◆` : nomDuProfil));
          if (propre?.nom) i18n.lier(bouton, 'aria-label', propre.nom);
          if (propre?.verdict) bouton.dataset.verdict = propre.verdict;
          else delete bouton.dataset.verdict;
          bouton.setAttribute('aria-pressed', String(valeur === choisie));
        }
      },
      cacher(oui) {
        element.hidden = oui;
      },
      premierSegment: () => boutons[0].bouton,
    };
  }
  return { createChoixDuProfil };
}

export const creerVuesChoixDuProfil = memoriserVues(construireVues);
