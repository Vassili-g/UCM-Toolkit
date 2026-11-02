/**
 * La carte d'un composant de base : pour chaque variant, layer et champ lié, le token que l'oracle attend.
 * Les opérateurs de dégradation et l'oracle lisent cette carte, jamais le relevé qu'ils dégradent, pour savoir ce qu'une
 * liaison juste vise. Le générateur la remplit en même temps que le relevé et le catalogue, d'où `verifierLaCarte`.
 */
import type { AxeDuComposant } from '../../../src/controles/nommage.js';
import type { CatalogueDeReference, ReleveDeComposant } from '../../../src/controles/index.js';

export const ROLES_DE_COULEUR = ['background', 'foreground', 'text', 'icon', 'border', 'ring'] as const;
export type RoleDeCouleur = (typeof ROLES_DE_COULEUR)[number];

export const PROPRIETES_DE_TAILLE = ['padding-x', 'padding-y', 'gap', 'radius', 'border-width'] as const;
export type ProprieteDeTaille = (typeof PROPRIETES_DE_TAILLE)[number];

/** Les layers de chaque variant ; les trois derniers n'existent qu'avec le drapeau « imbriqués ». */
export const NOMS_DE_LAYER = ['Root', 'Label', 'Icon', 'Ring', 'Glyph', '.Bar', 'SizeWrapper'] as const;
export type NomDeLayer = (typeof NOMS_DE_LAYER)[number];

/** Un axe de variant : ce que le kit en reconnaît, et la place de son segment dans les tokens. */
export interface AxeDeCarte {
  /** Le nom de la propriété de variant, tel que le relevé le porte. */
  readonly propriete: string;
  /** Le rôle que `axeDePropriete` lui reconnaît ; `null` pour `Type`, `Tone`, `Kind` : le kit n'en lit aucun segment. */
  readonly axe: AxeDuComposant | null;
  /** Le rôle de son segment dans le nom des tokens ; `null` si le nom des tokens ne le porte pas. */
  readonly segment: AxeDuComposant | null;
  readonly valeurs: readonly string[];
}

/** Une variable de `components` du composant, et la variable de `theme` ou de `layout` qu'elle vise. */
export interface JetonDeCarte {
  readonly cle: string;
  readonly nom: string;
  readonly nature: 'couleur' | 'taille';
  readonly role?: RoleDeCouleur;
  readonly propriete?: ProprieteDeTaille;
  /** Les valeurs d'axe que le nom du token porte, par nom de propriété de variant. Vide pour un jeu sans axe. */
  readonly valeurs: Readonly<Record<string, string>>;
  readonly cible: { readonly cle: string; readonly nom: string };
  /** La valeur en pixels d'un token de taille. */
  readonly pixels?: number;
}

/** Une liaison que le composant de base porte, avec le token juste. */
export interface LiaisonAttendue {
  readonly variant: string;
  readonly layer: string;
  readonly nomDuLayer: NomDeLayer;
  readonly champ: string;
  readonly indice?: number;
  readonly plage?: { readonly debut: number; readonly fin: number };
  /** L'identifiant du layer intérieur d'une instance que la surcharge lie. */
  readonly surcharge?: string;
  /**
   * `composant` : liaison du composant à l'un de ses tokens. `heritee` : liaison que l'instance tient de son composant
   * principal (`provenance: 'composant-principal'`), vers `theme` ou `layout`, jamais vers un token de ce jeu.
   */
  readonly origine: 'composant' | 'heritee';
  readonly nature: 'couleur' | 'taille';
  readonly role?: RoleDeCouleur;
  readonly propriete?: ProprieteDeTaille;
  /** Le token attendu (`origine: 'composant'`), ou la variable héritée (`origine: 'heritee'`). */
  readonly cle: string;
  readonly nom: string;
}

export interface VariantDeCarte {
  readonly id: string;
  readonly nom: string;
  readonly valeurs: Readonly<Record<string, string>>;
  /** L'identifiant de chaque layer du variant, par nom. */
  readonly layers: Readonly<Partial<Record<NomDeLayer, string>>>;
}

export interface CarteDuComposant {
  readonly jeu: string;
  readonly axes: readonly AxeDeCarte[];
  readonly variants: readonly VariantDeCarte[];
  readonly liaisons: readonly LiaisonAttendue[];
  readonly jetons: readonly JetonDeCarte[];
}

/** Ce qui désigne une liaison dans un variant : le même cinq-uplet que le relevé. */
export interface CritereDeLiaison {
  readonly variant: string;
  readonly layer: string;
  readonly champ: string;
  readonly indice?: number;
  readonly plage?: { readonly debut: number; readonly fin: number };
  readonly surcharge?: string;
}

export function cleDeLaLiaison(critere: CritereDeLiaison): string {
  const plage = critere.plage ? `${critere.plage.debut}-${critere.plage.fin}` : '';
  return [critere.variant, critere.layer, critere.surcharge ?? '', critere.champ, critere.indice ?? '', plage].join('|');
}

interface IndexDeCarte {
  readonly parLiaison: Map<string, LiaisonAttendue>;
  readonly parVariant: Map<string, LiaisonAttendue[]>;
  readonly parCle: Map<string, JetonDeCarte>;
}

const indexMemorises = new WeakMap<CarteDuComposant, IndexDeCarte>();

function indexer(carte: CarteDuComposant): IndexDeCarte {
  const connu = indexMemorises.get(carte);
  if (connu) return connu;
  const index: IndexDeCarte = { parLiaison: new Map(), parVariant: new Map(), parCle: new Map(carte.jetons.map((jeton) => [jeton.cle, jeton])) };
  for (const liaison of carte.liaisons) {
    index.parLiaison.set(cleDeLaLiaison(liaison), liaison);
    const memes = index.parVariant.get(liaison.variant);
    if (memes) memes.push(liaison); else index.parVariant.set(liaison.variant, [liaison]);
  }
  indexMemorises.set(carte, index);
  return index;
}

/** La liaison attendue à cet endroit, ou `undefined` si le composant de base n'y lie rien. */
export function liaisonAttendue(carte: CarteDuComposant, critere: CritereDeLiaison): LiaisonAttendue | undefined {
  return indexer(carte).parLiaison.get(cleDeLaLiaison(critere));
}

export function liaisonsDuVariant(carte: CarteDuComposant, variant: string): readonly LiaisonAttendue[] {
  return indexer(carte).parVariant.get(variant) ?? [];
}

export function jetonParCle(carte: CarteDuComposant, cle: string): JetonDeCarte | undefined {
  return indexer(carte).parCle.get(cle);
}

/** L'identifiant du layer de ce nom dans ce variant. */
export function layerDe(carte: CarteDuComposant, variant: string, nom: NomDeLayer): string | undefined {
  return carte.variants.find((entree) => entree.id === variant)?.layers[nom];
}

/**
 * Le token d'un rôle ou d'une propriété pour une combinaison de valeurs d'axe. `valeurs` peut être partielle : le premier
 * token dont le nom porte toutes ces valeurs répond, dans l'ordre du catalogue. Passer un axe que le nom ne porte pas
 * (une taille pour un token de couleur sans segment de taille) ne trouve rien.
 */
export function jetonDe(
  carte: CarteDuComposant, quoi: { readonly role: RoleDeCouleur } | { readonly propriete: ProprieteDeTaille },
  valeurs: Readonly<Record<string, string>> = {},
): JetonDeCarte | undefined {
  return carte.jetons.find((jeton) => ('role' in quoi ? jeton.role === quoi.role : jeton.propriete === quoi.propriete)
    && Object.entries(valeurs).every(([propriete, valeur]) => jeton.valeurs[propriete] === valeur));
}

/**
 * Compare la carte au relevé et au catalogue et rend les écarts, un message chacun. Une carte complète donne une liste vide :
 * chaque liaison du relevé a son entrée au même token, chaque entrée a sa liaison, chaque peinture visible d'un layer propre
 * est liée, chaque champ numérique d'une marge, d'un espacement, d'un rayon ou d'une épaisseur lié a son entrée, et chaque
 * token de la carte existe au catalogue avec le nom et la cible annoncés.
 */
export function verifierLaCarte(releve: ReleveDeComposant, catalogue: CatalogueDeReference, carte: CarteDuComposant): string[] {
  const ecarts: string[] = [];
  const variables = new Map(catalogue.variables.map((variable) => [variable.cle, variable]));
  const vues = new Set<string>();
  for (const variant of releve.variants) {
    const entree = carte.variants.find((candidate) => candidate.id === variant.id);
    if (!entree) { ecarts.push(`variant ${variant.id} absent de la carte`); continue; }
    for (const layer of variant.layers) {
      if (!Object.values(entree.layers).includes(layer.id)) ecarts.push(`layer ${layer.id} (${layer.nom}) absent de la carte du variant ${variant.id}`);
      for (const liaison of layer.liaisons) {
        const critere: CritereDeLiaison = { variant: variant.id, layer: layer.id, champ: liaison.champ, indice: liaison.indice, plage: liaison.plage, surcharge: liaison.surcharge?.id };
        const attendue = liaisonAttendue(carte, critere);
        const cle = cleDeLaLiaison(critere);
        vues.add(cle);
        if (!attendue) { ecarts.push(`liaison sans entrée : ${cle}`); continue; }
        if (attendue.cle !== liaison.variable.cle || attendue.nom !== liaison.variable.nom) ecarts.push(`${cle} lie ${liaison.variable.nom}, la carte attend ${attendue.nom}`);
        if ((liaison.provenance === 'composant-principal') !== (attendue.origine === 'heritee')) ecarts.push(`${cle} : la provenance ne suit pas l'origine de la carte`);
      }
      for (const peinture of layer.peintures) {
        const cle = cleDeLaLiaison({ variant: variant.id, layer: layer.id, champ: peinture.champ, indice: peinture.indice });
        if (peinture.visible && !vues.has(cle)) ecarts.push(`peinture visible sans liaison : ${cle}`);
      }
      for (const plage of layer.texte?.plages ?? []) {
        const cle = cleDeLaLiaison({ variant: variant.id, layer: layer.id, champ: 'fills', plage: { debut: plage.debut, fin: plage.fin } });
        if (!vues.has(cle)) ecarts.push(`plage de texte sans liaison : ${cle}`);
      }
    }
  }
  for (const liaison of carte.liaisons) {
    if (!vues.has(cleDeLaLiaison(liaison))) ecarts.push(`entrée de la carte sans liaison dans le relevé : ${cleDeLaLiaison(liaison)}`);
    if (liaison.origine === 'composant' && !carte.jetons.some((jeton) => jeton.cle === liaison.cle)) ecarts.push(`token ${liaison.nom} de la carte absent de ses jetons`);
  }
  for (const jeton of carte.jetons) {
    const variable = variables.get(jeton.cle);
    if (!variable) { ecarts.push(`jeton ${jeton.nom} absent du catalogue`); continue; }
    if (variable.nom !== jeton.nom) ecarts.push(`jeton ${jeton.cle} nommé ${variable.nom} au catalogue, ${jeton.nom} dans la carte`);
    const cibles = Object.values(variable.valeurs ?? {}).map((valeur) => ('alias' in valeur ? valeur.alias : null));
    if (cibles.length === 0 || cibles.some((cible) => cible !== jeton.cible.cle)) ecarts.push(`jeton ${jeton.nom} : l'alias du catalogue n'est pas ${jeton.cible.nom}`);
  }
  return ecarts;
}
