import type { SorteDImbrique } from '../referentiel/composition.js';

/** Les faits lus dans Figma avant tout jugement sur un composant. */

export interface PeintureLue {
  champ: 'fills' | 'strokes';
  indice: number;
  type: string;
  visible: boolean;
  opacite: number;
  blendMode: string;
  couleur?: { r: number; g: number; b: number; a: number };
}

export interface LiaisonLue {
  champ: string;
  indice?: number;
  plage?: { debut: number; fin: number };
  porteur: string;
  /** Le layer de l'instance que la surcharge lie, quand ce n'est pas l'instance elle-même : `porteur` reste l'instance, seule lue. */
  surcharge?: { id: string; nom: string; type: string };
  /**
   * `composant-principal` : la liaison vient du composant principal de l'instance, sans changement. `instance` : l'hôte la pose ou la change.
   * Absente : l'origine n'est pas lue, la liaison se juge comme celle d'un layer de l'hôte.
   */
  provenance?: 'composant-principal' | 'instance';
  /** La variable liée ne s'est pas lue : seul `variable.id` est sûr, `cle`, `nom` et `collection` sont vides. */
  illisible?: true;
  variable: { id: string; cle: string; nom: string; collection: string; distante: boolean };
}

export interface LayerLu {
  id: string;
  nom: string;
  type: string;
  parent: string | null;
  visible: boolean;
  opacite: number;
  dimensions: { x: number; y: number; largeur: number; hauteur: number };
  peintures: PeintureLue[];
  strokeWeight?: number;
  liaisons: LiaisonLue[];
  valeursEnDur: { champ: string; valeur: number }[];
  texte?: {
    style: string | null;
    plages: { debut: number; fin: number; fontSize: number; fontWeight: number; peintures: PeintureLue[]; liaisons: LiaisonLue[] }[];
  };
  /** Posée sur le layer d'une instance de composant imbriqué ; les liaisons de ses descendants se jugent avec la sorte de l'instance la plus proche. */
  sorte?: SorteDImbrique;
  instanceDe?: { cle: string; nom: string; distante: boolean; pilotee: string | null };
}

export interface VariantLu {
  id: string;
  nom: string;
  valeurs: Record<string, string>;
  layers: LayerLu[];
  modesEffectifs: Record<string, string>;
}

/**
 * Un jeu de variants de dimensions que le composant instancie : ses axes et les liaisons de ses variants, sans le
 * reste des layers. Le wrapper fait partie du composant : les tokens de ses tailles se lient dans ses variants, pas dans
 * ceux de l'hôte.
 */
export interface WrapperLu {
  id: string;
  cle: string;
  nom: string;
  proprietes: ReleveDeComposant['proprietes'];
  variants: { id: string; nom: string; valeurs: Record<string, string>; liaisons: LiaisonLue[] }[];
}

export interface ReleveDeComposant {
  version: 1;
  jeu: { cle: string; id: string; nom: string };
  proprietes: { nom: string; type: 'VARIANT' | 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP'; valeurs?: string[]; defaut: string | boolean }[];
  variants: VariantLu[];
  /** Absent d'un relevé qui ne lit pas les wrappers : il reste lisible, sans leurs liaisons. */
  wrappers?: WrapperLu[];
  lecture: {
    layersLus: number;
    layersNonLus: number | 'inconnu';
    variantsNonLus: string[];
    manquees: { layer?: string; champ?: string; motif: string }[];
  };
  espaceDeCouleur: 'srgb' | 'display-p3';
}

/** Les liaisons que le layer porte sur ses propres champs : sans celles qu'une surcharge pose dans son instance. */
export function liaisonsPropres(layer: Pick<LayerLu, 'liaisons'>): LiaisonLue[] {
  return layer.liaisons.filter((liaison) => !liaison.surcharge);
}

/** Une lecture a échoué sur ce champ de ce layer : ce qu'il porte dans le relevé n'est pas un fait. */
export function lectureManquee(releve: Pick<ReleveDeComposant, 'lecture'>, layerId: string, champ: string): boolean {
  return releve.lecture.manquees.some((manquee) => manquee.layer === layerId && manquee.champ === champ);
}

/**
 * Les layers que le designer voit : le layer et tous ses ancêtres sont visibles.
 * `LayerLu.visible` ne porte que la visibilité propre ; un layer sous un parent
 * masqué reste donc `visible: true` dans le relevé. Tout contrôle qui juge ce
 * que le designer voit (accessibilité, typographie, et les lecteurs qui
 * suivront) passe par cette règle. Un parent absent du variant ne masque pas ;
 * un cycle de `parent` s'arrête au premier layer déjà rencontré.
 */
export function layersVisiblesDuVariant(variant: VariantLu): LayerLu[] {
  const parId = new Map(variant.layers.map((l) => [l.id, l]));
  const verdicts = new Map<string, boolean>();
  const estVisible = (layer: LayerLu): boolean => {
    const chaine: LayerLu[] = [];
    const vus = new Set<string>();
    let courant: LayerLu | undefined = layer;
    let resultat = true;
    while (courant) {
      const connu = verdicts.get(courant.id);
      if (connu !== undefined) { resultat = connu; break; }
      if (vus.has(courant.id)) break;
      vus.add(courant.id);
      chaine.push(courant);
      if (!courant.visible) { resultat = false; break; }
      courant = courant.parent === null ? undefined : parId.get(courant.parent);
    }
    // Un layer n'est masqué que par lui-même ou un ancêtre : on mémorise le verdict de la chaîne parcourue.
    if (resultat) for (const l of chaine) verdicts.set(l.id, true);
    else {
      let masque = false;
      for (let i = chaine.length - 1; i >= 0; i--) {
        if (!chaine[i].visible) masque = true;
        verdicts.set(chaine[i].id, !masque);
      }
    }
    return resultat;
  };
  return variant.layers.filter(estVisible);
}
