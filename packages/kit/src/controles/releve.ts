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
  instanceDe?: { cle: string; nom: string; distante: boolean; pilotee: string | null };
}

export interface VariantLu {
  id: string;
  nom: string;
  valeurs: Record<string, string>;
  layers: LayerLu[];
  modesEffectifs: Record<string, string>;
}

export interface ReleveDeComposant {
  version: 1;
  jeu: { cle: string; id: string; nom: string };
  proprietes: { nom: string; type: 'VARIANT' | 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP'; valeurs?: string[]; defaut: string | boolean }[];
  variants: VariantLu[];
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
