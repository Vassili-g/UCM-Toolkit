/**
 * La dégradation réversible d'une copie de P0 et la « scène » des opérateurs. Une dégradation journalise chaque écriture :
 * `annuler()` défait le journal en sens inverse et rend la copie identique à la base.
 *
 * La scène isole ce qu'un cas mesure. Elle retire du variant cible `Label`, `Icon` et `Ring`, remplace le fond lié du `Root` par une
 * couleur en dur, et laisse au `Root` son trait lié (conforme sur la page et la carte, dans les deux modes). Le cas ajoute ensuite
 * ses propres layers sous le `Root` : seuls eux peuvent donner un constat.
 *
 * Les mémoires du kit (index des variables, fonds des variants) valent tant que les tableaux ne changent pas de longueur : toute
 * dégradation s'écrit avant le premier contrôle d'une copie, et une copie contrôlée ne sert plus.
 */
import type {
  CatalogueDeReference, CollectionDuCatalogue, LayerLu, LiaisonLue, PeintureLue, ReleveDeComposant, VariableDuCatalogue, VariantLu,
} from '../../../src/controles/index.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import type { Usage } from './cas.js';
import { couleurDeHex, type Couleur } from './oracleContraste.js';

export interface Materialise {
  readonly composant: ComposantDeContraste;
  readonly base: ComposantDeContraste;
  /** Défait la dégradation sur `composant`, en sens inverse. */
  readonly annuler: () => void;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Peintures

interface OptionsDePeinture {
  readonly alpha?: number;
  readonly opacite?: number;
  readonly visible?: boolean;
  readonly blendMode?: string;
  readonly champ?: 'fills' | 'strokes';
  readonly indice?: number;
}

/** Une peinture unie. `alpha` est celui de la couleur, `opacite` celui de la peinture. */
export function solide(hex: string, o: OptionsDePeinture = {}): PeintureLue {
  return {
    champ: o.champ ?? 'fills', indice: o.indice ?? 0, type: 'SOLID', visible: o.visible ?? true, opacite: o.opacite ?? 1,
    blendMode: o.blendMode ?? 'NORMAL', couleur: couleurDeHex(hex, o.alpha ?? 1),
  };
}

/** Une peinture qui n'est pas unie : dégradé, image, vidéo, motif. Le relevé ne porte pas de couleur pour elle. */
export function peintureDeType(type: string, o: OptionsDePeinture = {}): PeintureLue {
  return { champ: o.champ ?? 'fills', indice: o.indice ?? 0, type, visible: o.visible ?? true, opacite: o.opacite ?? 1, blendMode: o.blendMode ?? 'NORMAL' };
}

/** Un cadre de 48 px sous `parent`, avec ses peintures et son opacité. */
export function cadre(d: Degradation, nom: string, parent: LayerLu, peintures: PeintureLue[], opacite = 1): LayerLu {
  return d.ajouterUnLayer({ nom, type: 'FRAME', parent, peintures, opacite, dimensions: { x: 0, y: 0, largeur: 48, hauteur: 48 } });
}

export interface PlageDeTexte {
  readonly debut?: number;
  readonly fin?: number;
  readonly fontSize?: number;
  readonly fontWeight?: number;
  readonly peintures: PeintureLue[];
  readonly liaisons?: LiaisonLue[];
}

export interface SpecDeLayer {
  readonly nom: string;
  readonly type?: string;
  /** Défaut : le `Root`. `null` : un layer sans parent. */
  readonly parent?: LayerLu | null;
  readonly peintures?: PeintureLue[];
  readonly opacite?: number;
  readonly visible?: boolean;
  readonly strokeWeight?: number;
  readonly dimensions?: LayerLu['dimensions'];
  readonly plages?: readonly PlageDeTexte[];
  readonly liaisons?: LiaisonLue[];
  readonly variant?: VariantLu;
}

export class Degradation {
  readonly composant: ComposantDeContraste;
  private readonly journal: (() => void)[] = [];
  private creees = 0;

  constructor(readonly base: ComposantDeContraste) {
    this.composant = structuredClone(base);
  }

  get releve(): ReleveDeComposant { return this.composant.releve; }
  get catalogue(): CatalogueDeReference { return this.composant.catalogue; }
  /** Le variant que les cas dégradent : le premier, `Palette=primary, Style=solid, State=Default, Size=small` pour P0. */
  get cible(): VariantLu { return this.releve.variants[0]; }

  // ---- journal

  /** Écrit une propriété ; `undefined` la supprime. */
  fixer<T extends object, K extends keyof T>(objet: T, cle: K, valeur: T[K] | undefined): void {
    const existait = Object.prototype.hasOwnProperty.call(objet, cle);
    const ancien = objet[cle];
    const entrees = Object.entries(objet);
    if (valeur === undefined) delete (objet as Record<PropertyKey, unknown>)[cle as PropertyKey];
    else objet[cle] = valeur;
    this.journal.push(() => {
      if (!existait) delete (objet as Record<PropertyKey, unknown>)[cle as PropertyKey];
      else if (valeur !== undefined) objet[cle] = ancien;
      else {
        // Une clé supprimée revient à sa place : l'ordre des clés fait partie du JSON que la copie rend.
        for (const [nom] of entrees) delete (objet as Record<string, unknown>)[nom];
        for (const [nom, v] of entrees) (objet as Record<string, unknown>)[nom] = v;
      }
    });
  }

  inserer<T>(liste: T[], element: T): void {
    liste.push(element);
    this.journal.push(() => { liste.splice(liste.lastIndexOf(element), 1); });
  }

  retirer<T>(liste: T[], element: T): void {
    const rang = liste.indexOf(element);
    if (rang < 0) throw new Error('retirer : élément absent');
    liste.splice(rang, 1);
    this.journal.push(() => { liste.splice(rang, 0, element); });
  }

  annuler(): void {
    for (let i = this.journal.length - 1; i >= 0; i--) this.journal[i]();
    this.journal.length = 0;
  }

  materialiser(): Materialise {
    return { composant: this.composant, base: this.base, annuler: () => this.annuler() };
  }

  // ---- lecture

  racine(variant: VariantLu = this.cible): LayerLu {
    const racine = variant.layers.find((layer) => layer.parent === null);
    if (!racine) throw new Error(`Variant ${variant.nom} sans racine`);
    return racine;
  }

  layer(nom: string, variant: VariantLu = this.cible): LayerLu {
    const layer = variant.layers.find((entree) => entree.nom === nom);
    if (!layer) throw new Error(`Layer ${nom} absent de ${variant.nom}`);
    return layer;
  }

  /** Le premier variant dont les valeurs portent tous ces couples. */
  variantOu(valeurs: Readonly<Record<string, string>>): VariantLu {
    const trouve = this.releve.variants.find((variant) => Object.entries(valeurs).every(([nom, valeur]) => variant.valeurs[nom] === valeur));
    if (!trouve) throw new Error(`Aucun variant ${JSON.stringify(valeurs)}`);
    return trouve;
  }

  // ---- layers

  /** Ajoute un layer à la fin de `variant.layers` : il est au-dessus de ses frères déjà posés. */
  ajouterUnLayer(spec: SpecDeLayer): LayerLu {
    const variant = spec.variant ?? this.cible;
    this.creees += 1;
    const parent = spec.parent === undefined ? this.racine(variant) : spec.parent;
    const layer: LayerLu = {
      id: `${variant.id}~${this.creees}`, nom: spec.nom, type: spec.type ?? 'RECTANGLE', parent: parent === null ? null : parent.id,
      visible: spec.visible ?? true, opacite: spec.opacite ?? 1, dimensions: spec.dimensions ?? { x: 12, y: 16, largeur: 24, hauteur: 16 },
      peintures: spec.peintures ?? [], liaisons: spec.liaisons ?? [], valeursEnDur: [],
      ...(spec.strokeWeight === undefined ? {} : { strokeWeight: spec.strokeWeight }),
      ...(spec.plages ? {
        texte: {
          style: null,
          plages: spec.plages.map((plage) => ({
            debut: plage.debut ?? 0, fin: plage.fin ?? 10, fontSize: plage.fontSize ?? 14, fontWeight: plage.fontWeight ?? 400,
            peintures: plage.peintures, liaisons: plage.liaisons ?? [],
          })),
        },
      } : {}),
    };
    this.inserer(variant.layers, layer);
    return layer;
  }

  /** Un TEXT d'une plage : taille, graisse et peintures en dur. */
  ajouterUnTexte(nom: string, plage: PlageDeTexte, spec: Omit<SpecDeLayer, 'nom' | 'type' | 'plages'> = {}): LayerLu {
    return this.ajouterUnLayer({ ...spec, nom, type: 'TEXT', plages: [plage] });
  }

  /** Remplace les peintures d'un champ par `peintures` ; les liaisons du champ sont retirées. */
  remplacerLesPeintures(layer: LayerLu, champ: 'fills' | 'strokes', peintures: PeintureLue[]): void {
    for (const peinture of layer.peintures.filter((p) => p.champ === champ)) this.retirer(layer.peintures, peinture);
    for (const liaison of layer.liaisons.filter((l) => l.champ === champ)) this.retirer(layer.liaisons, liaison);
    for (const peinture of peintures) this.inserer(layer.peintures, peinture);
  }

  /**
   * La scène : le variant ne garde que le `Root`, au fond en dur. Sans `fond`, le fond est blanc et opaque ; avec `null`, il n'y en
   * a aucun ; avec une couleur, c'est ce fond, translucide ou non. `racineEnDur` pose aussi un trait gris en dur, pour que seuls les
   * layers du cas atteignent des collections.
   */
  scene(o: { variant?: VariantLu; fond?: Couleur | null; racineEnDur?: boolean } = {}): LayerLu {
    const variant = o.variant ?? this.cible;
    const racine = this.racine(variant);
    for (const layer of variant.layers.filter((entree) => entree !== racine)) this.retirer(variant.layers, layer);
    const fond = o.fond === undefined ? couleurDeHex('#FFFFFF') : o.fond;
    this.remplacerLesPeintures(racine, 'fills', fond === null ? [] : [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: fond }]);
    if (o.racineEnDur) this.remplacerLesPeintures(racine, 'strokes', [solide('#808080', { champ: 'strokes' })]);
    return racine;
  }

  // ---- catalogue

  nouvelleCollection(nom: string, modes: readonly string[], role: CollectionDuCatalogue['role'] = null, etat: CollectionDuCatalogue['etat'] = 'lue'): CollectionDuCatalogue {
    this.creees += 1;
    const collection: CollectionDuCatalogue = { cle: `col-x${this.creees}`, nom, role, modes: modes.map((mode, rang) => ({ id: `9${this.creees}:${rang}`, nom: mode })), etat };
    this.inserer(this.catalogue.collections, collection);
    return collection;
  }

  /**
   * Une variable de couleur. `valeurs` suit l'ordre des modes de la collection : un hexadécimal (ou `[hex, alpha]`), `{ alias }`,
   * une valeur brute, ou `null` pour un mode sans valeur.
   */
  nouvelleVariable(o: {
    readonly nom: string; readonly collection: CollectionDuCatalogue;
    readonly valeurs: readonly (string | readonly [string, number] | { readonly alias: string } | { readonly brut: unknown } | null)[];
    readonly etat?: VariableDuCatalogue['etat']; readonly distante?: boolean; readonly type?: VariableDuCatalogue['type'];
  }): VariableDuCatalogue {
    this.creees += 1;
    const valeurs: NonNullable<VariableDuCatalogue['valeurs']> = {};
    o.valeurs.forEach((valeur, rang) => {
      const mode = o.collection.modes[rang].id;
      if (valeur === null) return;
      if (typeof valeur === 'string') valeurs[mode] = { valeur: couleurDeHex(valeur) };
      else if (Array.isArray(valeur)) valeurs[mode] = { valeur: couleurDeHex(valeur[0] as string, valeur[1] as number) };
      else if ('alias' in valeur) valeurs[mode] = { alias: valeur.alias };
      else valeurs[mode] = { valeur: (valeur as { brut: unknown }).brut };
    });
    const variable: VariableDuCatalogue = {
      cle: `kx${String(this.creees).padStart(5, '0')}`, nom: o.nom, collection: o.collection.cle, type: o.type ?? 'COLOR', etat: o.etat ?? 'presente',
      ...(o.distante ? { distante: true as const } : {}), valeurs,
    };
    this.inserer(this.catalogue.variables, variable);
    return variable;
  }

  /** Lie le champ de couleur d'un layer (ou d'une de ses plages de texte) à une variable. */
  lier(layer: LayerLu, variable: Pick<VariableDuCatalogue, 'cle' | 'nom' | 'collection'> & { distante?: boolean }, o: { champ?: 'fills' | 'strokes'; indice?: number; plage?: number } = {}): LiaisonLue {
    const plage = o.plage === undefined ? undefined : layer.texte!.plages[o.plage];
    const liaison: LiaisonLue = {
      champ: o.champ ?? 'fills', ...(plage ? { plage: { debut: plage.debut, fin: plage.fin } } : o.indice === undefined ? {} : { indice: o.indice }),
      porteur: layer.id, variable: { id: `VariableID:${variable.cle}`, cle: variable.cle, nom: variable.nom, collection: variable.collection, distante: variable.distante === true },
    };
    this.inserer(layer.liaisons, liaison);
    if (plage) this.inserer(plage.liaisons, liaison);
    return liaison;
  }

  pageFigma(hex: string | null, alpha = 1): void {
    this.fixer(this.catalogue, 'fondDeLaPageFigma', hex === null ? undefined : (({ r, g, b }) => ({ r, g, b, a: alpha }))(couleurDeHex(hex)));
  }

  /**
   * Retire les fonds d'élévation : la page Figma, si elle est posée, sert de repli. Le trait du `Root` de chaque variant se mesure sur ce
   * repli ; il passe en gris en dur, sans quoi les traits clairs du mode `Dark` échoueraient sur une page blanche et brouilleraient le cas.
   */
  sansElevation(): void {
    this.fixer(this.catalogue, 'fondsDElevation', undefined);
    for (const variant of this.releve.variants) this.remplacerLesPeintures(this.racine(variant), 'strokes', [solide('#808080', { champ: 'strokes' })]);
  }

  /**
   * Pose sur la scène un premier plan en dur sur un fond opaque, du layer que l'usage désigne : `Texte` (14 px, ou 24 px en grand
   * texte), `Pictogramme` (VECTOR rempli), `Contour` (RECTANGLE tracé à 1 px) ou `Ring` (RECTANGLE tracé à 2 px).
   */
  poserLaPaire(usage: Usage, premierPlan: string, fond: string, o: { variant?: VariantLu; fontSize?: number; fontWeight?: number } = {}): LayerLu {
    const variant = o.variant ?? this.cible;
    this.scene({ variant, fond: couleurDeHex(fond) });
    switch (usage) {
      case 'texte': case 'grand-texte':
        return this.ajouterUnTexte('Texte', { peintures: [solide(premierPlan)], fontSize: o.fontSize ?? (usage === 'texte' ? 14 : 24), fontWeight: o.fontWeight ?? 400 }, { variant });
      case 'icone': return this.ajouterUnLayer({ nom: 'Pictogramme', type: 'VECTOR', peintures: [solide(premierPlan)], variant });
      case 'stroke': return this.ajouterUnLayer({ nom: 'Contour', peintures: [solide(premierPlan, { champ: 'strokes' })], strokeWeight: 1, variant });
      case 'anneau': return this.ajouterUnLayer({ nom: 'Ring', peintures: [solide(premierPlan, { champ: 'strokes' })], strokeWeight: 2, variant });
    }
  }
}
