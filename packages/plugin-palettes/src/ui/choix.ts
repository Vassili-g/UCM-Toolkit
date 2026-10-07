/**
 * Le choix que toutes les cartes partagent pour désigner un thème, un profil
 * ou une vue : un libellé, puis des segments, avec le même style partout
 * (`.choix-d-affichage` dans `styles.css`). `createChoix` rend un choix de segments
 * quelconques ; `createChoixDuProfil` s'écrit au-dessus pour les profils : un
 * libellé qui dit la portée du choix, « Régler » quand les réglages modifient
 * le profil et « Afficher » quand il ne change que la rampe montrée, puis des
 * segments Soft, Vivid et Les deux, toujours dans cet ordre.
 *
 * Le composant ne garde pas la valeur choisie : la carte la possède, reçoit
 * `surChoix`, puis la rend avec `poser`.
 */
import type { Profil } from 'ucm-couleur';

import { memoriserVues, type Localisation, type Texte } from './localisation';

export type ValeurDuChoix = Profil | 'deux';

export type PorteeDuChoix = 'regler' | 'afficher';

const ORDRE: readonly ValeurDuChoix[] = ['soft', 'vivid', 'deux'];

/**
 * La rangée qui ouvre le corps d'une carte fixe : ses choix, calés à droite.
 * Elle se cache quand `cacher` a caché chacun de ses choix, et se montre dès
 * que l'un reparaît ; il en va de même de l'emplacement de l'en-tête d'une
 * carte repliable (`CarteUi.poserLesChoix`).
 */
export function createRangeeDesChoix(...choix: readonly { readonly element: HTMLElement }[]): HTMLDivElement {
  const rangee = document.createElement('div');
  rangee.className = 'rangee-des-choix';
  rangee.append(...choix.map(({ element }) => element));
  return rangee;
}

/** Ce qu'une carte pose sur un segment à la place du texte de son option. */
export interface SegmentDuChoix {
  readonly texte: Texte;
  /** Le nom accessible du segment, quand il diffère de son texte. */
  readonly nom?: Texte;
  /** Le verdict que le segment porte (`data-verdict`). */
  readonly verdict?: 'tenue' | 'manquee';
}

/** Un segment du choix : la valeur que `surChoix` reçoit et le texte qu'il montre. */
export interface OptionDuChoix<V extends string = string> {
  readonly valeur: V;
  readonly texte: Texte;
}

export interface ChoixArguments<V extends string = string> {
  readonly libelle: Texte;
  /** Le nom accessible du groupe de segments. */
  readonly nom: Texte;
  readonly options: readonly OptionDuChoix<V>[];
  readonly surChoix: (valeur: V) => void;
}

/** Le contenu d'un segment qui porte plus que le texte de son option ; `undefined` laisse le texte. */
export type SegmentDe<V extends string = string> = (valeur: V) => SegmentDuChoix | undefined;

export interface ChoixUi<V extends string = string> {
  element: HTMLDivElement;
  /** Marque `valeur` choisie, ou aucune avec `null` ; `segmentDe` remplace le contenu d'un segment. */
  poser(valeur: V | null, segmentDe?: SegmentDe<V>): void;
  cacher(oui: boolean): void;
  /** Le premier segment, que la carte focalise quand un message y mène. */
  premierSegment(): HTMLButtonElement;
}

export interface ChoixDuProfilArguments {
  readonly portee: PorteeDuChoix;
  readonly options: readonly ValeurDuChoix[];
  readonly surChoix: (valeur: ValeurDuChoix) => void;
  /** Le nom accessible du groupe ; « Profil à régler » pour la portée `regler` par défaut. */
  readonly nom?: Texte;
}

export interface ChoixDuProfilUi {
  element: HTMLDivElement;
  /**
   * Marque `valeur` choisie, ou aucune avec `null` ; `porteur` ajoute « ◆ »
   * au segment du profil qui porte la référence ; `segmentDe` remplace le
   * contenu d'un segment.
   */
  poser(valeur: ValeurDuChoix | null, porteur?: Profil | null, segmentDe?: SegmentDe<ValeurDuChoix>): void;
  cacher(oui: boolean): void;
  premierSegment(): HTMLButtonElement;
}

function construireVues(i18n: Localisation) {
  const { NOM_DU_PROFIL, TEXTES_DES_REGLAGES } = i18n.messages;

  function createChoix<V extends string>({ libelle, nom, options, surChoix }: ChoixArguments<V>): ChoixUi<V> {
    const element = document.createElement('div');
    element.className = 'choix-d-affichage';
    const texteDuLibelle = document.createElement('span');
    texteDuLibelle.className = 'choix-libelle';
    i18n.lier(texteDuLibelle, 'textContent', libelle);
    const segments = document.createElement('div');
    segments.className = 'bascule';
    segments.setAttribute('role', 'group');
    i18n.lier(segments, 'aria-label', nom);
    const boutons = options.map((option) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bascule-option';
      bouton.addEventListener('click', () => surChoix(option.valeur));
      segments.append(bouton);
      return { option, bouton };
    });
    element.append(texteDuLibelle, segments);

    return {
      element,
      poser(choisie, segmentDe) {
        for (const { option, bouton } of boutons) {
          const propre = segmentDe?.(option.valeur);
          i18n.lier(bouton, 'textContent', propre?.texte ?? option.texte);
          if (propre?.nom) i18n.lier(bouton, 'aria-label', propre.nom);
          if (propre?.verdict) bouton.dataset.verdict = propre.verdict;
          else delete bouton.dataset.verdict;
          bouton.setAttribute('aria-pressed', String(option.valeur === choisie));
        }
      },
      cacher(oui) {
        element.hidden = oui;
        const rangee = element.parentElement;
        if (rangee?.matches('.rangee-des-choix, .carte-choix')) rangee.hidden = Array.from(rangee.children).every((enfant) => (enfant as HTMLElement).hidden);
      },
      premierSegment: () => boutons[0].bouton,
    };
  }

  function createChoixDuProfil({ portee, options, surChoix, nom }: ChoixDuProfilArguments): ChoixDuProfilUi {
    const choix = createChoix<ValeurDuChoix>({
      libelle: portee === 'regler' ? TEXTES_DES_REGLAGES.regler : TEXTES_DES_REGLAGES.afficher,
      nom: nom ?? (portee === 'regler' ? TEXTES_DES_REGLAGES.cible : TEXTES_DES_REGLAGES.afficher),
      options: ORDRE.filter((valeur) => options.includes(valeur)).map((valeur) => ({
        valeur,
        texte: valeur === 'deux' ? TEXTES_DES_REGLAGES.lesDeux : NOM_DU_PROFIL[valeur],
      })),
      surChoix,
    });
    return {
      element: choix.element,
      poser(choisie, porteur = null, segmentDe) {
        choix.poser(choisie, (valeur) => segmentDe?.(valeur) ?? (valeur !== 'deux' && valeur === porteur ? { texte: i18n.composer`${NOM_DU_PROFIL[valeur]} ◆` } : undefined));
      },
      cacher: choix.cacher,
      premierSegment: choix.premierSegment,
    };
  }
  return { createChoix, createChoixDuProfil };
}

export const creerVuesChoix = memoriserVues(construireVues);
