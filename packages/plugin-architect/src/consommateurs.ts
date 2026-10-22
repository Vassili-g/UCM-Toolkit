/**
 * Les liaisons de variables d'un calque ou d'un style, et les modes effectifs
 * d'un calque. La vue composant les lit calque par calque.
 *
 * La lecture porte sur les propriétés, les peintures et leurs arrêts de
 * dégradé, les effets, les grilles, les segments de texte et les propriétés
 * d'instance.
 */
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

/** Les liaisons d'un objet `boundVariables`, champ par champ ; un tableau rend une entrée par alias. */
function liaisonsDe(boundVariables: unknown, prefixe: string, ignorer: ReadonlySet<string> = new Set()): Array<{ propriete: string; variable: string }> {
  if (!estObjet(boundVariables)) return [];
  const liaisons: Array<{ propriete: string; variable: string }> = [];
  for (const [champ, valeur] of Object.entries(boundVariables)) {
    if (ignorer.has(champ)) continue;
    if (champ === 'componentProperties' && estObjet(valeur)) {
      for (const [propriete, alias] of Object.entries(valeur)) {
        const id = idDAlias(alias);
        if (id) liaisons.push({ propriete: `${prefixe}componentProperties.${propriete}`, variable: id });
      }
      continue;
    }
    for (const alias of Array.isArray(valeur) ? valeur : [valeur]) {
      const id = idDAlias(alias);
      if (id) liaisons.push({ propriete: `${prefixe}${champ}`, variable: id });
    }
  }
  return liaisons;
}

/** Les liaisons d'une liste de peintures, arrêts de dégradé compris. `figma.mixed` n'est pas un tableau et se saute. */
function liaisonsDesPeintures(peintures: unknown, prefixe: string): Array<{ propriete: string; variable: string }> {
  if (!Array.isArray(peintures)) return [];
  return peintures.flatMap((peinture, rang) => {
    if (!estObjet(peinture)) return [];
    const propres = liaisonsDe(peinture.boundVariables, `${prefixe}[${rang}].`).map((liaison) => ({ ...liaison, propriete: liaison.propriete.replace(/\.color$/, '') }));
    const arrets = Array.isArray(peinture.gradientStops)
      ? peinture.gradientStops.flatMap((arret, rangDArret) => (estObjet(arret) ? liaisonsDe(arret.boundVariables, `${prefixe}[${rang}].gradientStops[${rangDArret}].`) : []))
      : [];
    return [...propres, ...arrets];
  });
}

/** Les liaisons d'une liste d'effets ou de grilles. */
function liaisonsDesElements(elements: unknown, prefixe: string): Array<{ propriete: string; variable: string }> {
  if (!Array.isArray(elements)) return [];
  return elements.flatMap((element, rang) => (estObjet(element) ? liaisonsDe(element.boundVariables, `${prefixe}[${rang}].`) : []));
}

/** Les champs de `boundVariables` lus ailleurs : par les peintures, les effets, les grilles ou les segments de texte. */
const LUS_PAR_LEURS_OBJETS = new Set(['fills', 'strokes', 'effects', 'layoutGrids', 'textRangeFills']);
const CHAMPS_DE_TEXTE = new Set(['fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent']);

/** Toutes les liaisons d'un calque, une par couple propriété–variable. */
export function liaisonsDuNoeud(noeud: NoeudLu): Array<{ propriete: string; variable: string }> {
  const texte = noeud.type === 'TEXT' && typeof noeud.getStyledTextSegments === 'function';
  const ignorer = texte ? new Set([...LUS_PAR_LEURS_OBJETS, ...CHAMPS_DE_TEXTE]) : LUS_PAR_LEURS_OBJETS;
  const liaisons = [
    ...liaisonsDe(noeud.boundVariables, '', ignorer),
    ...liaisonsDesPeintures(noeud.fills, 'fills'),
    ...liaisonsDesPeintures(noeud.strokes, 'strokes'),
    ...liaisonsDesElements(noeud.effects, 'effects'),
    ...liaisonsDesElements(noeud.layoutGrids, 'layoutGrids'),
  ];
  if (texte && noeud.getStyledTextSegments) {
    for (const segment of noeud.getStyledTextSegments(['boundVariables', 'fills'])) {
      const plage = `texte[${segment.start}–${segment.end}]`;
      liaisons.push(...liaisonsDe(segment.boundVariables, `${plage}.`), ...liaisonsDesPeintures(segment.fills, `${plage}.fills`));
    }
  }
  const vues = new Set<string>();
  return liaisons.filter((liaison) => {
    const cle = `${liaison.propriete}\u0000${liaison.variable}`;
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
}

/** Les liaisons d'un style local. */
export function liaisonsDuStyle(style: StyleLu): Array<{ propriete: string; variable: string }> {
  return [
    ...liaisonsDesPeintures(style.paints, 'paints'),
    ...liaisonsDesElements(style.effects, 'effects'),
    ...liaisonsDesElements(style.layoutGrids, 'layoutGrids'),
    ...liaisonsDe(style.boundVariables, ''),
  ];
}

/** Les modes effectifs d'un calque, explicites ou hérités, sans contexte fictif. */
export function modesDuNoeud(noeud: NoeudLu): Record<string, ModeDeCalque> {
  const explicites = noeud.explicitVariableModes ?? {};
  return Object.fromEntries(Object.entries(noeud.resolvedVariableModes ?? {}).map(([collection, mode]) => [collection, { mode, explicite: explicites[collection] === mode }]));
}
