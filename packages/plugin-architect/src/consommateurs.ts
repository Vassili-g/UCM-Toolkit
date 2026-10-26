/**
 * Les liaisons de variables d'un calque ou d'un style, et les modes effectifs
 * d'un calque. La vue composant les lit calque par calque.
 *
 * La lecture porte sur les propriétés, les peintures et leurs arrêts de
 * dégradé, les effets, les grilles, les segments de texte et les propriétés
 * d'instance.
 */
import type { EtatEcrit, PeintureLue as PeintureCopiee } from 'ucm-plugin-socle/src/composant/analyse/faits';
import type { ContexteCooperatif } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import type { ModeDeCalque } from './resolution';

/** Ce que la lecture prend d'un calque Figma. */
export interface NoeudLu {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly parent: NoeudLu | null;
  readonly removed?: boolean;
  readonly boundVariables?: unknown;
  readonly fills?: unknown;
  readonly strokes?: unknown;
  readonly effects?: unknown;
  readonly layoutGrids?: unknown;
  readonly resolvedVariableModes?: Readonly<Record<string, string>>;
  readonly explicitVariableModes?: Readonly<Record<string, string>>;
  getStyledTextSegments?(champs: string[]): ReadonlyArray<{ start: number; end: number; boundVariables?: unknown; fills?: unknown; textStyleId?: string }>;
  findAll?(): readonly NoeudLu[];
  /** Ce que la vue composant lit en plus. Une propriété mixte porte un symbole, d'où `unknown`. */
  readonly children?: readonly NoeudLu[];
  readonly overrides?: ReadonlyArray<{ readonly id: string; readonly overriddenFields: readonly string[] }>;
  readonly textStyleId?: unknown;
  getMainComponentAsync?(): Promise<NoeudLu | null>;
  readonly defaultVariant?: NoeudLu;
  readonly absoluteBoundingBox?: RectangleLu | null;
  readonly absoluteRenderBounds?: RectangleLu | null;
  readonly cornerRadius?: unknown;
  readonly topLeftRadius?: unknown;
  readonly topRightRadius?: unknown;
  readonly bottomLeftRadius?: unknown;
  readonly bottomRightRadius?: unknown;
  readonly strokeWeight?: unknown;
  readonly layoutMode?: unknown;
  readonly itemSpacing?: unknown;
  readonly paddingLeft?: unknown;
  readonly paddingRight?: unknown;
  readonly paddingTop?: unknown;
  readonly paddingBottom?: unknown;
  readonly fontSize?: unknown;
}

/** Un rectangle dans le repère de la page, tel que Figma le donne. */
export interface RectangleLu {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface StyleLu {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly paints?: unknown;
  readonly effects?: unknown;
  readonly layoutGrids?: unknown;
  readonly boundVariables?: unknown;
}

const estObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null;
const idDAlias = (valeur: unknown): string | null => (estObjet(valeur) && valeur.type === 'VARIABLE_ALIAS' && typeof valeur.id === 'string' ? valeur.id : null);

type LiaisonBrute = { propriete: string; variable: string };

function* liaisonsDe(boundVariables: unknown, prefixe: string, ignorer: ReadonlySet<string> = new Set()): Generator<LiaisonBrute | undefined> {
  if (!estObjet(boundVariables)) return;
  for (const champ of Object.keys(boundVariables)) {
    yield;
    if (ignorer.has(champ)) continue;
    const valeur = boundVariables[champ];
    if (champ === 'componentProperties' && estObjet(valeur)) {
      for (const propriete of Object.keys(valeur)) {
        yield;
        const id = idDAlias(valeur[propriete]);
        if (id) yield { propriete: `${prefixe}componentProperties.${propriete}`, variable: id };
      }
      continue;
    }
    for (const alias of Array.isArray(valeur) ? valeur : [valeur]) {
      yield;
      const id = idDAlias(alias);
      if (id) yield { propriete: `${prefixe}${champ}`, variable: id };
    }
  }
}

function* liaisonsDesPeintures(peintures: unknown, prefixe: string): Generator<LiaisonBrute | undefined> {
  if (!Array.isArray(peintures)) return;
  for (let rang = 0; rang < peintures.length; rang += 1) {
    yield;
    const peinture = peintures[rang];
    if (!estObjet(peinture)) continue;
    for (const liaison of liaisonsDe(peinture.boundVariables, `${prefixe}[${rang}].`)) {
      yield liaison ? { ...liaison, propriete: liaison.propriete.replace(/\.color$/, '') } : undefined;
    }
    if (!Array.isArray(peinture.gradientStops)) continue;
    for (const [rangDArret, arret] of peinture.gradientStops.entries()) {
      yield;
      if (estObjet(arret)) yield* liaisonsDe(arret.boundVariables, `${prefixe}[${rang}].gradientStops[${rangDArret}].`);
    }
  }
}

function* liaisonsDesElements(elements: unknown, prefixe: string): Generator<LiaisonBrute | undefined> {
  if (!Array.isArray(elements)) return;
  for (const [rang, element] of elements.entries()) {
    yield;
    if (estObjet(element)) yield* liaisonsDe(element.boundVariables, `${prefixe}[${rang}].`);
  }
}

/** Les champs de `boundVariables` lus ailleurs : par les peintures, les effets, les grilles ou les segments de texte. */
const LUS_PAR_LEURS_OBJETS = new Set(['fills', 'strokes', 'effects', 'layoutGrids', 'textRangeFills']);
const CHAMPS_DE_TEXTE = new Set(['fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent']);

const valeurSiAcquise = <V>(etat: EtatEcrit<V>): V | undefined => (etat.etat === 'acquis' ? etat.valeur : undefined);

/** Les peintures d'un nœud que l'appelant a déjà lues : leurs liaisons s'en tirent sans relire `fills` ni `strokes`. */
export type PeinturesCopiees = { readonly fills: EtatEcrit<readonly PeintureCopiee[]>; readonly strokes: EtatEcrit<readonly PeintureCopiee[]> };

function* liaisonsDuNoeudParEtapes(noeud: NoeudLu, copiees?: PeinturesCopiees): Generator<LiaisonBrute | undefined> {
  const texte = noeud.type === 'TEXT' && typeof noeud.getStyledTextSegments === 'function';
  const ignorer = texte ? new Set([...LUS_PAR_LEURS_OBJETS, ...CHAMPS_DE_TEXTE]) : LUS_PAR_LEURS_OBJETS;
  yield* liaisonsDe(noeud.boundVariables, '', ignorer);
  yield* liaisonsDesPeintures(copiees ? valeurSiAcquise(copiees.fills) : noeud.fills, 'fills');
  yield* liaisonsDesPeintures(copiees ? valeurSiAcquise(copiees.strokes) : noeud.strokes, 'strokes');
  yield* liaisonsDesElements(noeud.effects, 'effects');
  yield* liaisonsDesElements(noeud.layoutGrids, 'layoutGrids');
  if (texte && noeud.getStyledTextSegments) {
    for (const segment of noeud.getStyledTextSegments(['boundVariables', 'fills'])) {
      yield;
      const plage = `texte[${segment.start}–${segment.end}]`;
      yield* liaisonsDe(segment.boundVariables, `${plage}.`);
      yield* liaisonsDesPeintures(segment.fills, `${plage}.fills`);
    }
  }
}

function retenirLaLiaison(liaison: LiaisonBrute | undefined, vues: Set<string>, liaisons: LiaisonBrute[]): void {
  if (!liaison) return;
  const cle = `${liaison.propriete}\u0000${liaison.variable}`;
  if (vues.has(cle)) return;
  vues.add(cle);
  liaisons.push(liaison);
}

/** Toutes les liaisons d'un calque, une par couple propriété–variable. */
export function liaisonsDuNoeud(noeud: NoeudLu): LiaisonBrute[] {
  const liaisons: LiaisonBrute[] = [];
  const vues = new Set<string>();
  for (const liaison of liaisonsDuNoeudParEtapes(noeud)) retenirLaLiaison(liaison, vues, liaisons);
  return liaisons;
}

/**
 * Même lecture ordonnée que `liaisonsDuNoeud`, interruptible dans les peintures et les plages. Avec `copiees`, `fills` et
 * `strokes` ne se relisent pas ; une peinture mixte ou refusée n'a alors aucune liaison, comme une valeur qui n'est pas une liste.
 */
export async function liaisonsDuNoeudCooperatives(noeud: NoeudLu, cooperation: ContexteCooperatif, copiees?: PeinturesCopiees): Promise<LiaisonBrute[]> {
  const liaisons: LiaisonBrute[] = [];
  const vues = new Set<string>();
  for (const liaison of liaisonsDuNoeudParEtapes(noeud, copiees)) {
    await cooperation.cederSiBesoin();
    retenirLaLiaison(liaison, vues, liaisons);
  }
  return liaisons;
}

/** Les liaisons d'un style local. */
export function liaisonsDuStyle(style: StyleLu): Array<{ propriete: string; variable: string }> {
  return [
    ...liaisonsDesPeintures(style.paints, 'paints'),
    ...liaisonsDesElements(style.effects, 'effects'),
    ...liaisonsDesElements(style.layoutGrids, 'layoutGrids'),
    ...liaisonsDe(style.boundVariables, ''),
  ].filter((liaison): liaison is LiaisonBrute => liaison !== undefined);
}

/** Les modes effectifs d'un calque, explicites ou hérités, sans contexte fictif. */
export function modesDuNoeud(noeud: NoeudLu): Record<string, ModeDeCalque> {
  const explicites = noeud.explicitVariableModes ?? {};
  return Object.fromEntries(Object.entries(noeud.resolvedVariableModes ?? {}).map(([collection, mode]) => [collection, { mode, explicite: explicites[collection] === mode }]));
}
