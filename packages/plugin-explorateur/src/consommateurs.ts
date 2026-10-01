/**
 * Les liaisons de variables des calques et des styles, dans un périmètre
 * choisi par le designer : la sélection, la page courante ou le document.
 * Les pages autres que la courante ne se chargent qu'au périmètre « document ».
 *
 * La lecture porte sur les propriétés, les peintures et leurs arrêts de
 * dégradé, les effets, les grilles, les segments de texte et les propriétés
 * d'instance. `NON_INSPECTE` nomme ce qu'elle ne lit pas : une absence de
 * consommateur ne vaut que pour le périmètre et les propriétés lus.
 */
import type { ModeDeCalque } from './resolution';

export type PerimetreDAnalyse = 'selection' | 'page' | 'document';

/** Ce que la lecture des calques ne couvre pas, affiché avec chaque résultat. */
export const NON_INSPECTE = ['reactions', 'valeurs-par-defaut', 'calques-masques-des-instances'] as const;

export type ProprieteNonInspectee = (typeof NON_INSPECTE)[number];

/** Ce que l'analyse lit d'un calque Figma. */
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
  getStyledTextSegments?(champs: string[]): ReadonlyArray<{ start: number; end: number; boundVariables?: unknown; fills?: unknown }>;
  findAll?(): readonly NoeudLu[];
}

export interface PageLue {
  readonly id: string;
  readonly name: string;
  loadAsync(): Promise<void>;
  findAll(): readonly NoeudLu[];
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

/** Le port de l'analyse : lectures seules, aucune écriture possible. */
export interface PortDesCalques {
  pageCourante(): PageLue;
  pages(): readonly PageLue[];
  selection(): readonly NoeudLu[];
  stylesLocaux(): Promise<readonly StyleLu[]>;
  /** Rend la main au moteur de Figma entre deux lots. */
  pause(): Promise<void>;
}

export interface OccurrenceDeVariable {
  readonly consommateur: string;
  readonly genre: 'calque' | 'style';
  readonly nom: string;
  readonly page: { readonly id: string; readonly nom: string } | null;
  /** Le chemin de la propriété : `fills[0]`, `effects[1].radius`, `texte[0–5].fontSize`, `componentProperties.Label`. */
  readonly propriete: string;
  readonly variable: string;
  /** Les modes effectifs du calque, explicites ou hérités, par identifiant de collection. */
  readonly modes: Readonly<Record<string, ModeDeCalque>>;
}

export interface ResultatDesConsommateurs {
  readonly perimetre: PerimetreDAnalyse;
  readonly pages: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  readonly calques: number;
  readonly styles: number;
  readonly occurrences: readonly OccurrenceDeVariable[];
  readonly erreurs: ReadonlyArray<{ readonly consommateur: string; readonly message: string }>;
  readonly nonInspecte: readonly ProprieteNonInspectee[];
}

export type IssueDesConsommateurs = { readonly statut: 'lu'; readonly resultat: ResultatDesConsommateurs } | { readonly statut: 'annule' };

/** Le nombre de calques lus entre deux pauses. */
const LOT = 400;

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

function pageDe(noeud: NoeudLu): { id: string; nom: string } | null {
  for (let courant: NoeudLu | null = noeud; courant; courant = courant.parent) {
    if (courant.type === 'PAGE') return { id: courant.id, nom: courant.name };
  }
  return null;
}

export interface SuiviDAnalyse {
  readonly annulee: () => boolean;
  readonly progression?: (fait: number, total: number) => void;
}

/**
 * Relève les occurrences de variables dans le périmètre. Un calque atteint
 * par deux chemins (un parent et son enfant sélectionnés) ne compte qu'une
 * fois. Une erreur sur un calque est rangée et l'analyse continue.
 */
export async function chercherLesConsommateurs(port: PortDesCalques, perimetre: PerimetreDAnalyse, suivi: SuiviDAnalyse): Promise<IssueDesConsommateurs> {
  const pages: PageLue[] = perimetre === 'document' ? [...port.pages()] : [port.pageCourante()];
  const noeuds = new Map<string, NoeudLu>();
  const pagesLues: Array<{ id: string; nom: string }> = [];
  if (perimetre === 'selection') {
    for (const choisi of port.selection()) {
      noeuds.set(choisi.id, choisi);
      for (const descendant of choisi.findAll?.() ?? []) noeuds.set(descendant.id, descendant);
    }
    const page = port.pageCourante();
    pagesLues.push({ id: page.id, nom: page.name });
  } else {
    for (const page of pages) {
      if (suivi.annulee()) return { statut: 'annule' };
      await page.loadAsync();
      for (const noeud of page.findAll()) noeuds.set(noeud.id, noeud);
      pagesLues.push({ id: page.id, nom: page.name });
      await port.pause();
    }
  }
  const occurrences: OccurrenceDeVariable[] = [];
  const erreurs: Array<{ consommateur: string; message: string }> = [];
  const liste = [...noeuds.values()];
  for (let rang = 0; rang < liste.length; rang += 1) {
    if (rang % LOT === 0) {
      if (suivi.annulee()) return { statut: 'annule' };
      suivi.progression?.(rang, liste.length);
      await port.pause();
    }
    const noeud = liste[rang];
    try {
      const liaisons = liaisonsDuNoeud(noeud);
      if (liaisons.length === 0) continue;
      const modes = modesDuNoeud(noeud);
      const page = pageDe(noeud);
      for (const liaison of liaisons) occurrences.push({ consommateur: noeud.id, genre: 'calque', nom: noeud.name, page, propriete: liaison.propriete, variable: liaison.variable, modes });
    } catch (erreur) {
      erreurs.push({ consommateur: noeud.id, message: erreur instanceof Error ? erreur.message : String(erreur) });
    }
  }
  let styles = 0;
  if (perimetre === 'document') {
    for (const style of await port.stylesLocaux()) {
      styles += 1;
      for (const liaison of liaisonsDuStyle(style)) occurrences.push({ consommateur: style.id, genre: 'style', nom: style.name, page: null, propriete: liaison.propriete, variable: liaison.variable, modes: {} });
    }
  }
  if (suivi.annulee()) return { statut: 'annule' };
  suivi.progression?.(liste.length, liste.length);
  return { statut: 'lu', resultat: { perimetre, pages: pagesLues, calques: liste.length, styles, occurrences, erreurs, nonInspecte: [...NON_INSPECTE] } };
}
