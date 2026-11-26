import type { SorteDImbrique } from '../referentiel/composition.js';
import type { LayerPourLesDefinitions } from '../referentiel/layers.js';
import { formeReconnue } from '../referentiel/reconnaissance.js';

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
  surcharge?: {
    id: string; nom: string; type: string;
    /** Les instances entre le layer lu et le calque peint, de la plus externe à la plus interne, sans l'un ni l'autre. Absentes : le relevé ne les a pas lues. */
    instances?: LayerPourLesDefinitions[];
  };
  /**
   * `composant-principal` : la liaison vient du composant principal de l'instance, sans changement. `instance` : l'hôte la pose ou la change.
   * `style` : le style appliqué au calque (`textStyleId`, `fillStyleId`, `strokeStyleId`) lie ce champ à cette variable ; le calque ne l'a pas liée lui-même.
   * Absente : l'origine n'est pas lue, la liaison se juge comme celle d'un layer de l'hôte.
   */
  provenance?: 'composant-principal' | 'instance' | 'style';
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
  /** Absents d'un relevé ancien qui ne lisait pas ces propriétés du layer. */
  blendMode?: string;
  flouArrierePlan?: boolean;
  dimensions: { x: number; y: number; largeur: number; hauteur: number };
  /**
   * Les rayons des coins, en pixels : haut gauche, haut droit, bas droit, bas gauche, liés ou non à une variable. Absents : le
   * relevé ne les a pas lus ou le layer n'a pas de coin, et la preuve du fond lit des coins droits (D17).
   */
  rayons?: readonly [number, number, number, number];
  peintures: PeintureLue[];
  /**
   * Les modes que le calque pose lui-même (`explicitVariableModes`), par nom de collection comme `modesEffectifs`. Absent : le calque
   * n'en pose aucun, ou la lecture a levé ; il suit alors le variant. Un mode posé sur un ancêtre s'hérite : C49 remonte la chaîne
   * des `parent`, sans la racine du variant, dont les modes sont `modesEffectifs` (D18).
   */
  modesExplicites?: Record<string, string>;
  strokeWeight?: number;
  liaisons: LiaisonLue[];
  valeursEnDur: { champ: string; valeur: number }[];
  texte?: {
    style: string | null;
    /** Le texte porte plusieurs text styles : `style` vaut alors `null`, sans que le texte soit sans style. Absent : le lecteur ne l'a pas lu. */
    stylesMixtes?: boolean;
    plages: { debut: number; fin: number; fontSize: number; fontWeight: number; peintures: PeintureLue[]; liaisons: LiaisonLue[] }[];
  };
  /** Posée sur le layer d'une instance de composant imbriqué ; les liaisons de ses descendants se jugent avec la sorte de l'instance la plus proche. */
  sorte?: SorteDImbrique;
  instanceDe?: {
    cle: string; nom: string; distante: boolean; pilotee: string | null;
    /** Les valeurs que l'instance donne aux propriétés de variant de son composant (`Size` vaut `Small`). Absentes : le lecteur ne les a pas lues, et aucun contrôle ne les juge. */
    valeurs?: Record<string, string>;
    /** Les deux faits de `LayerPourLesDefinitions.instanceDe` qui font d'une instance une icône sans nom d'icône ; absents, le lecteur ne les a pas lus. */
    dessin?: boolean;
    visibilitePar?: string | null;
  };
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
  /**
   * Vrai quand l'instance du wrapper a `isExposedInstance` dans au moins un variant de l'hôte : ses propriétés se choisissent depuis l'hôte.
   * Faux quand toutes les lectures disent faux. `'inconnu'` quand une lecture lève ou ne rend pas de booléen, sans lecture qui dise vrai.
   * Absent : le relevé ne l'a pas lu, comme `'inconnu'`. Le relevé d'Architect le remplit toujours.
   */
  expose?: boolean | 'inconnu';
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

/** Une peinture se voit quand elle n'est pas masquée et que son opacité n'est pas nulle. */
export function peintureVisible(p: { readonly visible?: boolean; readonly opacity?: number; readonly opacite?: number }): boolean {
  return p.visible !== false && (p.opacity ?? p.opacite ?? 1) > 0;
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
    // Un verdict masqué vaut pour toute la chaîne parcourue : chaque layer qu'elle contient est le masqué ou l'un de ses descendants.
    for (const l of chaine) verdicts.set(l.id, resultat);
    return resultat;
  };
  return variant.layers.filter(estVisible);
}

/** `chemin` : les noms depuis la racine du variant (racine exclue), sous leur forme reconnue. `rang` : celui du calque parmi ses homonymes de même parent. `cle` : le chemin avec le rang de chaque niveau, donc la place exacte du calque. */
export interface IdentiteDeCalque { chemin: readonly string[]; rang: number; cle: string }

const identites = new WeakMap<VariantLu, { layers: readonly LayerLu[]; taille: number; parId: Map<string, IdentiteDeCalque> }>();

/**
 * L'identité d'un calque dans son variant (D16) : les noms depuis la racine du variant, racine exclue, puis son rang parmi ses
 * homonymes de même parent. Deux calques de deux variants occupent la même place quand leur `cle` est égale : C21 et C64 les disent
 * homologues par `cle`, la propagation (C24, C81) par `chemin`, parce qu'elle pose une question quand deux homonymes partagent un chemin.
 * Le rang se compte sur tous les enfants lus, masqués ou non : masquer un autre calque ne change pas cette identité. Les noms se
 * comparent par `formeReconnue`. Un calque sans parent est lui-même la racine : il garde son nom dans son identité. Un parent absent du
 * variant, ou un cycle de parents, arrête le chemin.
 */
export function identiteDuCalque(variant: VariantLu, layer: LayerLu): IdentiteDeCalque {
  let lu = identites.get(variant);
  if (!lu || lu.layers !== variant.layers || lu.taille !== variant.layers.length) {
    lu = { layers: variant.layers, taille: variant.layers.length, parId: identitesDuVariant(variant) };
    identites.set(variant, lu);
  }
  return lu.parId.get(layer.id) ?? { chemin: [formeReconnue(layer.nom)], rang: 0, cle: JSON.stringify([[formeReconnue(layer.nom), 0]]) };
}

function identitesDuVariant(variant: VariantLu): Map<string, IdentiteDeCalque> {
  const parId = new Map(variant.layers.map((l) => [l.id, l]));
  const rangs = new Map<string, number>();
  const rangDe = new Map<string, number>();
  for (const layer of variant.layers) {
    const frere = JSON.stringify([layer.parent, formeReconnue(layer.nom)]);
    const rang = rangs.get(frere) ?? 0;
    rangs.set(frere, rang + 1);
    rangDe.set(layer.id, rang);
  }
  const niveau = (layer: LayerLu): [string, number] => [formeReconnue(layer.nom), rangDe.get(layer.id) ?? 0];
  const resultat = new Map<string, IdentiteDeCalque>();
  for (const layer of variant.layers) {
    const niveaux = [niveau(layer)];
    const vus = new Set([layer.id]);
    let parent = layer.parent === null ? undefined : parId.get(layer.parent);
    // La racine du variant (calque sans parent) n'entre pas dans le chemin de ses descendants.
    while (parent && parent.parent !== null && !vus.has(parent.id)) {
      vus.add(parent.id);
      niveaux.unshift(niveau(parent));
      parent = parId.get(parent.parent);
    }
    resultat.set(layer.id, { chemin: niveaux.map(([nom]) => nom), rang: niveaux[niveaux.length - 1][1], cle: JSON.stringify(niveaux) });
  }
  return resultat;
}
