/**
 * La fixture du banc de session : un jeu avec une instance d'un maître local, un style de texte, des variables liées et un
 * catalogue, que `paritesDeSession.test.ts` mute et que `projectionsDesControles.test.ts` lit.
 */
import type { CatalogueDeReference, LayerLu, ReleveDeComposant } from '@ucm-kit/core/controles';

export interface Fichier {
  variable: { id: string; cle: string; nom: string };
  valeur: number;
  niveau: 'AA' | 'AAA';
  library: { nom: string; cle: string } | null;
  layers: LayerLu[];
  maitre: { contenu: string; remote: boolean; imbrique: boolean };
  /** Les noms de composant que les conteneurs de règles de la page écrivent. */
  nomsDeLaPage: string[];
  style: { nom: string; taille: number; remote: boolean };
  /** Une variable du catalogue que Figma refuse de lire : l'entrée retenue est à relire. */
  catalogueIncomplet?: boolean;
}

export const base = (id: string, variable: Fichier['variable'], extra: Partial<LayerLu> = {}): LayerLu => ({
  id, nom: id, type: 'FRAME', parent: null, visible: true, opacite: 1,
  dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [],
  liaisons: [{ champ: 'cornerRadius', porteur: id, variable: { ...variable, collection: 'components', distante: false } }],
  valeursEnDur: [],
  ...extra,
});

export function fichierDeDepart(): Fichier {
  const variable = { id: 'VariableID:1', cle: 'k-rayon', nom: 'alert/size/radius' };
  return {
    variable,
    valeur: 12,
    niveau: 'AA',
    library: null,
    layers: [
      base('fond', variable),
      base('bord', variable),
      base('titre', variable, { type: 'TEXT', texte: { style: 'Body', plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 400, peintures: [], liaisons: [] }] } }),
      base('icone', variable, { type: 'INSTANCE', instanceDe: { cle: 'icone', nom: 'Icon', distante: false, pilotee: null } }),
    ],
    maitre: { contenu: 'rond', remote: false, imbrique: false },
    nomsDeLaPage: ['icon'],
    style: { nom: 'Body', taille: 14, remote: false },
  };
}

export const releveDe = (fichier: Fichier): ReleveDeComposant => structuredClone({
  version: 1 as const,
  jeu: { cle: 'Alert', id: 'jeu-Alert', nom: 'Alert' },
  proprietes: [],
  variants: [{ id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, layers: fichier.layers, modesEffectifs: {} }],
  lecture: { layersLus: fichier.layers.length, layersNonLus: 0, variantsNonLus: [], manquees: [] },
  espaceDeCouleur: 'srgb' as const,
});

export const catalogueDe = (fichier: Fichier): CatalogueDeReference => structuredClone({
  version: 1 as const, library: fichier.library,
  collections: [{ cle: 'c1', nom: 'components', role: 'components' as const, etat: 'lue' as const, modes: [{ id: 'Light', nom: 'Light' }] }],
  variables: [
    { cle: fichier.variable.cle, nom: fichier.variable.nom, collection: 'components', type: 'FLOAT' as const, etat: 'presente' as const, valeurs: { Light: { valeur: fichier.valeur } } },
    ...(fichier.catalogueIncomplet ? [{ cle: 'k-refusee', nom: 'alert/size/refusee', collection: 'components', type: 'FLOAT' as const, etat: 'inaccessible' as const }] : []),
  ],
});
