/**
 * La capture d'un composant et le banc de coût des lectures, pour un build de capture seulement.
 *
 * Rien ici ne tourne sans `capturer: true` dans la demande d'analyse. L'interface l'envoie seulement si
 * `globalThis.UCM_ARCHITECT_CAPTURER` vaut `true`, ce que pose la bannière du build de capture. La capture suit la fin de
 * l'analyse : elle ne fausse pas sa trace.
 *
 * Elle relève en JSON de quoi bâtir hors de Figma un double de nœuds sur lequel le relevé et le moteur rendent la même
 * sortie : chaque nœud atteint avec ses propriétés, ses plages de texte pour chaque jeu de champs que le code demande et
 * le maître de chaque instance, puis les variables, collections, styles, libraries et règles de page que l'analyse lit.
 * Le fichier contient des données du document : il reste hors de git, dans `_local/`.
 *
 * Encodage : une valeur JSON ordinaire se range telle quelle. Les autres portent une clé `$` :
 * `{ $: 'mixte' }` (`figma.mixed`), `{ $: 'indefini' }`, `{ $: 'erreur', message }` (la lecture a levé),
 * `{ $: 'noeud', id }` (référence de nœud), `{ $: 'nombre', valeur }` (NaN, infinis, -0) et, pour ce que JSON ne porte
 * pas, `symbole`, `fonction`, `octets`, `cycle` et `tronque`. `tests/outils/capture.ts` lit ce format et rebâtit le double.
 */import { CALQUES_DU_KIT_DE_REGLES, ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';
import { porteLeNom } from 'ucm-plugin-socle/src/composant/contract/extractRules';

import type { ImportsEnregistres } from '../lecture';
import { CLE_DU_NIVEAU } from './configuration';
import type { Contexte } from './contexte';

export const VERSION_DE_CAPTURE = 1;

/** Les propriétés qu'un nœud porte dans la capture : celles du relevé, de la vue Composant, du moteur et de la surveillance (inventaire 6.1). */
export const PROPRIETES_DE_NOEUD: readonly string[] = [
  'id', 'type', 'name', 'key', 'remote', 'removed', 'description', 'parent', 'children', 'defaultVariant', 'visible', 'opacity', 'blendMode', 'isMask',
  'absoluteBoundingBox', 'absoluteRenderBounds', 'relativeTransform', 'x', 'y', 'width', 'height', 'rotation', 'constraints',
  'layoutMode', 'layoutWrap', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'counterAxisAlignContent', 'counterAxisSpacing', 'itemSpacing',
  'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'layoutSizingHorizontal', 'layoutSizingVertical', 'layoutPositioning', 'layoutAlign', 'layoutGrow',
  'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'gridChildHorizontalAlign', 'gridChildVerticalAlign', 'gridColumnAnchorIndex', 'gridColumnCount', 'gridColumnGap', 'gridColumnSizes', 'gridColumnSpan',
  'gridRowAnchorIndex', 'gridRowCount', 'gridRowGap', 'gridRowSizes', 'gridRowSpan',
  'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
  'strokeWeight', 'strokeAlign', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'dashPattern',
  'fills', 'strokes', 'effects', 'effectStyleId', 'layoutGrids', 'boundVariables', 'resolvedVariableModes', 'explicitVariableModes',
  'characters', 'textStyleId', 'fontName', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textCase', 'textDecoration', 'textDecorationColor',
  'textDecorationOffset', 'textDecorationSkipInk', 'textDecorationStyle', 'textDecorationThickness', 'textWrapStyle', 'leadingTrim',
  'textAlignHorizontal', 'textAlignVertical', 'textAutoResize', 'textTruncation', 'maxLines', 'openTypeFeatures', 'listSpacing',
  'hangingList', 'hangingPunctuation', 'paragraphIndent', 'paragraphSpacing', 'hasMissingFont',
  'variantProperties', 'componentProperties', 'componentPropertyDefinitions', 'componentPropertyReferences', 'overrides', 'exposedInstances', 'preferredValues', 'slotSettings',
];

/** Les propriétés d'un nœud que le scan des règles de la page lit sur les nœuds qu'il ne descend pas. */
export const PROPRIETES_DE_PAGE: readonly string[] = ['id', 'type', 'name', 'characters', 'visible', 'parent'];

/** Les jeux de champs que le code passe à `getStyledTextSegments` : relevé, vue Composant, moteur seul et moteur groupé. */
export const JEUX_DE_SEGMENTS: readonly (readonly string[])[] = [
  ['fontSize', 'fontWeight', 'fills', 'boundVariables', 'textStyleId'],
  ['boundVariables', 'fills'],
  ['textStyleId'],
  ['listOptions', 'textStyleOverrides'],
  ['listOptions'],
  ['textStyleOverrides'],
];

export const cleDeSegments = (champs: readonly string[]): string => [...champs].sort().join(',');

export const PROPRIETES_DE_VARIABLE: readonly string[] = ['id', 'name', 'description', 'key', 'remote', 'hiddenFromPublishing', 'variableCollectionId', 'resolvedType', 'scopes', 'codeSyntax', 'valuesByMode'];
export const PROPRIETES_DE_COLLECTION: readonly string[] = ['id', 'name', 'key', 'remote', 'hiddenFromPublishing', 'isExtension', 'modes', 'defaultModeId', 'variableIds', 'parentVariableCollectionId', 'rootVariableCollectionId', 'variableOverrides'];
export const PROPRIETES_DE_STYLE: readonly string[] = [
  'id', 'name', 'type', 'key', 'remote', 'description', 'boundVariables', 'fontName', 'fontSize', 'lineHeight', 'letterSpacing', 'textCase', 'textDecoration',
  'paragraphSpacing', 'paragraphIndent', 'textWrapStyle', 'leadingTrim', 'paints', 'effects', 'layoutGrids',
];

const PLAFOND_DE_NOEUDS = 150_000;
const PLAFOND_DE_TEXTES_DE_PAGE = 30_000;
const PROFONDEUR_DE_VALEUR = 24;
const TOURS_DE_VARIABLES = 8;

export interface CaptureDeNoeud {
  readonly id: string;
  readonly type: string;
  readonly proprietes: Record<string, unknown>;
  /** Par `cleDeSegments` ; seulement pour un TEXT. */
  segments?: Record<string, unknown>;
  /** `getMainComponentAsync()` ; seulement pour une instance. */
  maitre?: unknown;
  /** Un nœud de la page ou un ancêtre : ses enfants ne sont pas capturés et `children` vaut `[]`. */
  superficiel?: true;
}

export interface CaptureDePage {
  readonly id: string;
  readonly proprietes: Record<string, unknown>;
  readonly selection: string[];
  /** Les identifiants rendus par `findAllWithCriteria({ types })`, par types joints par une virgule, ou l'erreur levée. */
  readonly criteres: Record<string, unknown>;
}

export interface CaptureArchitect {
  readonly version: typeof VERSION_DE_CAPTURE;
  readonly date: string;
  readonly fichier: {
    readonly nom: unknown;
    readonly fileKey: unknown;
    readonly profilDeCouleur: unknown;
    /** Les données partagées d'Architect à la racine, par clé. */
    readonly donneesPartagees: Record<string, unknown>;
    /** Ce que `clientStorage` rend pour le niveau d'accessibilité. */
    readonly niveau: unknown;
  };
  readonly jeu: string;
  readonly selection: readonly string[];
  readonly page: string;
  readonly pages: Record<string, CaptureDePage>;
  readonly noeuds: Record<string, CaptureDeNoeud>;
  /** `getNodeByIdAsync` pour les identifiants lus hors de l'arbre capturé : référence de nœud, `null` ou erreur. */
  readonly noeudsParIdentifiant: Record<string, unknown>;
  readonly variables: Record<string, unknown>;
  readonly collections: Record<string, unknown>;
  readonly locales: { readonly collections: unknown; readonly variables: unknown };
  readonly styles: Record<string, unknown>;
  readonly libraries: {
    readonly collections: unknown;
    readonly variables: Record<string, unknown>;
    readonly imports: Record<string, unknown>;
  } | null;
  readonly limites: { readonly noeudsTronques: boolean; readonly textesDePageTronques: boolean };
}

/** Ce que la capture lit de l'API Figma. */
interface ApiCapturee {
  readonly mixed?: unknown;
  readonly fileKey?: unknown;
  readonly currentPage: LecturePage;
  readonly root: LectureRacine;
  readonly getNodeByIdAsync: (id: string) => Promise<LectureNoeud | null>;
  readonly getStyleByIdAsync: (id: string) => Promise<Record<string, unknown> | null>;
  readonly variables: {
    getLocalVariableCollectionsAsync(): Promise<readonly Record<string, unknown>[]>;
    getLocalVariablesAsync(): Promise<readonly Record<string, unknown>[]>;
    getVariableByIdAsync(id: string): Promise<Record<string, unknown> | null>;
    getVariableCollectionByIdAsync(id: string): Promise<Record<string, unknown> | null>;
  };
  readonly teamLibrary?: {
    getAvailableLibraryVariableCollectionsAsync(): Promise<readonly { key: string }[]>;
    getVariablesInLibraryCollectionAsync(cle: string): Promise<unknown>;
  };
  readonly clientStorage: { getAsync(cle: string): Promise<unknown> };
}

type LectureNoeud = Record<string, unknown> & {
  readonly id: string;
  readonly type: string;
  getStyledTextSegments?(champs: string[]): unknown;
  getMainComponentAsync?(): Promise<LectureNoeud | null>;
};
type LecturePage = LectureNoeud & { readonly selection: readonly LectureNoeud[]; findAllWithCriteria?(criteres: { types: string[] }): readonly LectureNoeud[] };
type LectureRacine = Record<string, unknown> & {
  readonly name: string;
  readonly documentColorProfile: unknown;
  getSharedPluginData(espace: string, cle: string): string;
  getSharedPluginDataKeys(espace: string): string[];
};

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));
const erreurCapturee = (erreur: unknown) => ({ $: 'erreur', message: messageDe(erreur) });
const cederLaMain = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** L'identifiant d'une référence `{ $: 'noeud', id }`. */
const identifiantDeReference = (valeur: unknown): string | undefined => {
  const reference = valeur as { $?: unknown; id?: unknown } | null;
  return reference?.$ === 'noeud' && typeof reference.id === 'string' ? reference.id : undefined;
};

const estUnNoeud = (valeur: object): valeur is LectureNoeud => {
  const candidat = valeur as Record<string, unknown>;
  return typeof candidat.id === 'string' && typeof candidat.type === 'string' && ('parent' in candidat || typeof candidat.findAll === 'function');
};

/**
 * L'encodeur d'une capture. `rencontres` garde les nœuds que les valeurs référencent, pour que la capture les visite ; un
 * nœud n'est jamais encodé en profondeur, seulement par sa référence.
 */
function creerLEncodeur(mixte: unknown) {
  const rencontres = new Map<string, LectureNoeud>();
  const encoder = (valeur: unknown, profondeur = 0, vus = new WeakSet<object>()): unknown => {
    if (valeur === undefined) return { $: 'indefini' };
    if (valeur === null || typeof valeur === 'boolean' || typeof valeur === 'string') return valeur;
    if (typeof valeur === 'number') {
      if (Number.isFinite(valeur) && !Object.is(valeur, -0)) return valeur;
      return { $: 'nombre', valeur: Object.is(valeur, -0) ? '-0' : String(valeur) };
    }
    if (typeof valeur === 'bigint') return { $: 'nombre', valeur: String(valeur) };
    if (typeof valeur === 'symbol') return valeur === mixte ? { $: 'mixte' } : { $: 'symbole', description: valeur.description ?? '' };
    if (typeof valeur === 'function') return { $: 'fonction' };
    if (ArrayBuffer.isView(valeur)) return { $: 'octets', longueur: valeur.byteLength };
    if (profondeur > PROFONDEUR_DE_VALEUR) return { $: 'tronque' };
    const objet = valeur as object;
    if (vus.has(objet)) return { $: 'cycle' };
    if (estUnNoeud(objet)) {
      rencontres.set(objet.id, objet);
      return { $: 'noeud', id: objet.id };
    }
    vus.add(objet);
    try {
      if (Array.isArray(objet)) return objet.map((element) => encoder(element, profondeur + 1, vus));
      const sortie: Record<string, unknown> = {};
      for (const cle of Object.keys(objet)) {
        try { sortie[cle] = encoder((objet as Record<string, unknown>)[cle], profondeur + 1, vus); }
        catch (erreur) { sortie[cle] = erreurCapturee(erreur); }
      }
      return sortie;
    } finally {
      vus.delete(objet);
    }
  };
  return { encoder, rencontres };
}

/** Parcourt une valeur encodée et rend chaque alias de variable qu'elle porte. */
function aliasDans(valeur: unknown, sortie: Set<string>): void {
  if (Array.isArray(valeur)) { for (const element of valeur) aliasDans(element, sortie); return; }
  if (typeof valeur !== 'object' || valeur === null) return;
  const objet = valeur as Record<string, unknown>;
  if (objet.type === 'VARIABLE_ALIAS' && typeof objet.id === 'string') sortie.add(objet.id);
  for (const element of Object.values(objet)) aliasDans(element, sortie);
}

/** Les identifiants de style que porte un nœud encodé, hors de ses plages. */
function stylesDans(proprietes: Record<string, unknown>, sortie: Set<string>): void {
  for (const [cle, valeur] of Object.entries(proprietes)) if (/StyleId$/.test(cle) && typeof valeur === 'string' && valeur !== '') sortie.add(valeur);
}

export interface OptionsDeCapture {
  /** Le jeu de variants analysé. */
  readonly jeu: object;
  /** La page qui le porte. */
  readonly page: object;
  /** Les imports de variables de library que l'analyse a faits ; sans eux, la capture n'en porte aucun. */
  readonly imports?: ImportsEnregistres | null;
}

/** Capture le composant, ses ressources et les règles de sa page. Ne lève pas : chaque lecture qui échoue est une erreur encodée. */
export async function capturerLeComposant(figma: PluginAPI, options: OptionsDeCapture): Promise<CaptureArchitect> {
  const api = figma as unknown as ApiCapturee;
  const jeu = options.jeu as LectureNoeud;
  const page = options.page as LectureNoeud;
  const { imports } = options;
  const { encoder, rencontres } = creerLEncodeur(api.mixed);
  const noeuds: Record<string, CaptureDeNoeud> = {};
  const pages: Record<string, CaptureDePage> = {};
  const aVisiter: { noeud: LectureNoeud; complet: boolean }[] = [];
  const limites = { noeudsTronques: false, textesDePageTronques: false };
  let depuisLaCession = 0;

  const demander = (noeud: LectureNoeud, complet: boolean): void => {
    const deja = noeuds[noeud.id];
    if (deja && (!deja.superficiel || !complet)) return;
    aVisiter.push({ noeud, complet });
  };

  const lire = (cible: Record<string, unknown>, propriete: string, enregistrer: (valeur: unknown) => void): void => {
    try {
      if (!(propriete in cible)) return;
      enregistrer(encoder(cible[propriete]));
    } catch (erreur) {
      enregistrer(erreurCapturee(erreur));
    }
  };

  const enregistrerUnePage = (page: LectureNoeud): void => {
    if (pages[page.id]) return;
    const proprietes: Record<string, unknown> = {};
    for (const propriete of ['id', 'type', 'name']) lire(page, propriete, (valeur) => { proprietes[propriete] = valeur; });
    pages[page.id] = { id: page.id, proprietes, selection: [], criteres: {} };
  };

  /** Lit un nœud : ses propriétés, puis ses plages, son maître et ses enfants si `complet`. */
  const capturerUnNoeud = async (noeud: LectureNoeud, complet: boolean): Promise<void> => {
    if (noeud.type === 'PAGE') { enregistrerUnePage(noeud); return; }
    if (noeud.type === 'DOCUMENT') return;
    const liste = complet ? PROPRIETES_DE_NOEUD : PROPRIETES_DE_PAGE;
    const capture: CaptureDeNoeud = { id: noeud.id, type: noeud.type, proprietes: {}, ...(complet ? {} : { superficiel: true as const }) };
    noeuds[noeud.id] = capture;
    for (const propriete of liste) {
      if (!complet && propriete === 'children') continue;
      lire(noeud, propriete, (valeur) => { capture.proprietes[propriete] = valeur; });
    }
    if (!complet) capture.proprietes.children = [];
    if (complet && noeud.type === 'TEXT' && typeof noeud.getStyledTextSegments === 'function') {
      capture.segments = {};
      for (const champs of JEUX_DE_SEGMENTS) {
        try { capture.segments[cleDeSegments(champs)] = encoder(noeud.getStyledTextSegments([...champs])); }
        catch (erreur) { capture.segments[cleDeSegments(champs)] = erreurCapturee(erreur); }
      }
    }
    if (complet && noeud.type === 'INSTANCE' && typeof noeud.getMainComponentAsync === 'function') {
      try { capture.maitre = encoder(await noeud.getMainComponentAsync()); }
      catch (erreur) { capture.maitre = erreurCapturee(erreur); }
    }
    // Les enfants, le maître, la variante par défaut et l'ensemble d'un variant se capturent entiers ; le parent et le reste, par leurs seuls identifiants.
    const entiers = new Set<string>();
    const noter = (valeur: unknown): void => { const id = identifiantDeReference(valeur); if (id !== undefined) entiers.add(id); };
    if (Array.isArray(capture.proprietes.children)) capture.proprietes.children.forEach(noter);
    noter(capture.maitre);
    noter(capture.proprietes.defaultVariant);
    const references = [...rencontres.values()];
    rencontres.clear();
    for (const reference of references) {
      if (reference.type === 'PAGE') enregistrerUnePage(reference);
      else demander(reference, complet && (entiers.has(reference.id) || (noeud.type === 'COMPONENT' && reference.type === 'COMPONENT_SET')));
    }
  };

  const viderLaFile = async (): Promise<void> => {
    while (aVisiter.length > 0) {
      const { noeud, complet } = aVisiter.pop()!;
      const deja = noeuds[noeud.id];
      if (deja && (!deja.superficiel || !complet)) continue;
      if (Object.keys(noeuds).length >= PLAFOND_DE_NOEUDS) { limites.noeudsTronques = true; aVisiter.length = 0; return; }
      await capturerUnNoeud(noeud, complet);
      depuisLaCession += 1;
      if (depuisLaCession >= 100) { depuisLaCession = 0; await cederLaMain(); }
    }
  };

  // Départ : le jeu et la sélection de la page courante.
  const pageCourante = api.currentPage;
  enregistrerUnePage(pageCourante);
  enregistrerUnePage(page);
  const selectionDeLaPage = [...pageCourante.selection];
  pages[pageCourante.id].selection.push(...selectionDeLaPage.map((noeud) => noeud.id));
  for (const noeud of [jeu, ...selectionDeLaPage]) demander(noeud, true);
  await viderLaFile();

  // Le scan des règles de la page du sujet : les textes, puis les instances et composants que le moteur parcourt.
  const pageDuSujet = page as LecturePage;
  const criteres = pages[pageDuSujet.id].criteres;
  const lireLesCriteres = (types: string[]): readonly LectureNoeud[] | null => {
    const cle = types.join(',');
    try {
      if (typeof pageDuSujet.findAllWithCriteria !== 'function') { criteres[cle] = { $: 'indefini' }; return null; }
      const trouves = pageDuSujet.findAllWithCriteria({ types });
      criteres[cle] = trouves.map((noeud) => ({ $: 'noeud', id: noeud.id }));
      return trouves;
    } catch (erreur) {
      criteres[cle] = erreurCapturee(erreur);
      return null;
    }
  };
  const textes = lireLesCriteres(['TEXT']) ?? [];
  const candidats = lireLesCriteres(['INSTANCE', 'COMPONENT']) ?? [];
  const conteneurs = new Set<string>();
  for (const texte of textes) {
    try {
      if (!porteLeNom(texte as unknown as { name: string }, CALQUES_DU_KIT_DE_REGLES.nomDuComposant)) continue;
      let parent = texte.parent as LectureNoeud | null;
      while (parent && parent !== (pageDuSujet as unknown)) {
        if (parent.type === 'INSTANCE') conteneurs.add(parent.id);
        parent = parent.parent as LectureNoeud | null;
      }
    } catch { /* un nom ou un parent illisible : le moteur le saute aussi */ }
  }
  textes.slice(0, PLAFOND_DE_TEXTES_DE_PAGE).forEach((texte) => demander(texte, false));
  if (textes.length > PLAFOND_DE_TEXTES_DE_PAGE) limites.textesDePageTronques = true;
  for (const candidat of candidats) demander(candidat, conteneurs.has(candidat.id));
  await viderLaFile();

  // Les identifiants que les surcharges nomment et que l'arbre capturé ne contient pas.
  const noeudsParIdentifiant: Record<string, unknown> = {};
  for (const capture of Object.values(noeuds)) {
    const surcharges = capture.proprietes.overrides;
    if (!Array.isArray(surcharges)) continue;
    for (const surcharge of surcharges as { id?: unknown }[]) {
      const id = surcharge?.id;
      if (typeof id !== 'string' || noeuds[id] || id in noeudsParIdentifiant) continue;
      try {
        const lu = await api.getNodeByIdAsync(id);
        if (lu === null) noeudsParIdentifiant[id] = null;
        else { noeudsParIdentifiant[id] = encoder(lu); demander(lu, true); }
      } catch (erreur) {
        noeudsParIdentifiant[id] = erreurCapturee(erreur);
      }
    }
  }
  await viderLaFile();

  // Les ressources : les alias et les styles que les nœuds portent, puis la fermeture des alias entre variables.
  const alias = new Set<string>();
  const identifiantsDeStyle = new Set<string>();
  for (const capture of Object.values(noeuds)) {
    aliasDans(capture.proprietes, alias);
    aliasDans(capture.segments, alias);
    stylesDans(capture.proprietes, identifiantsDeStyle);
    for (const segments of Object.values(capture.segments ?? {})) {
      if (!Array.isArray(segments)) continue;
      for (const segment of segments as { textStyleId?: unknown }[]) if (typeof segment?.textStyleId === 'string' && segment.textStyleId !== '') identifiantsDeStyle.add(segment.textStyleId);
    }
  }

  const lireUnObjet = (source: Record<string, unknown> | null, proprietes: readonly string[]): unknown => {
    if (source === null) return null;
    const sortie: Record<string, unknown> = {};
    for (const propriete of proprietes) lire(source, propriete, (valeur) => { sortie[propriete] = valeur; });
    return sortie;
  };

  const styles: Record<string, unknown> = {};
  for (const id of identifiantsDeStyle) {
    try { styles[id] = lireUnObjet(await api.getStyleByIdAsync(id), PROPRIETES_DE_STYLE); }
    catch (erreur) { styles[id] = erreurCapturee(erreur); }
    if (styles[id] && typeof styles[id] === 'object') aliasDans(styles[id], alias);
  }

  const locales: CaptureArchitect['locales'] = { collections: null, variables: null };
  const variablesLocales = new Map<string, unknown>();
  try {
    const lues = await api.variables.getLocalVariablesAsync();
    const encodees = lues.map((variable) => lireUnObjet(variable, PROPRIETES_DE_VARIABLE));
    (locales as { variables: unknown }).variables = encodees;
    for (const variable of encodees) { const id = (variable as { id?: unknown })?.id; if (typeof id === 'string') variablesLocales.set(id, variable); }
  } catch (erreur) { (locales as { variables: unknown }).variables = erreurCapturee(erreur); }
  try {
    (locales as { collections: unknown }).collections = (await api.variables.getLocalVariableCollectionsAsync()).map((collection) => lireUnObjet(collection, PROPRIETES_DE_COLLECTION));
  } catch (erreur) { (locales as { collections: unknown }).collections = erreurCapturee(erreur); }

  const variables: Record<string, unknown> = {};
  const collections: Record<string, unknown> = {};
  let attendus = new Set(alias);
  for (let tour = 0; tour < TOURS_DE_VARIABLES && attendus.size > 0; tour += 1) {
    const suivants = new Set<string>();
    for (const id of attendus) {
      if (id in variables) continue;
      try { variables[id] = lireUnObjet(await api.variables.getVariableByIdAsync(id), PROPRIETES_DE_VARIABLE); }
      catch (erreur) { variables[id] = erreurCapturee(erreur); }
      const cibles = new Set<string>();
      aliasDans(variables[id], cibles);
      for (const cible of cibles) if (!(cible in variables)) suivants.add(cible);
      const identifiantDeCollection = (variables[id] as { variableCollectionId?: unknown } | null)?.variableCollectionId;
      if (typeof identifiantDeCollection === 'string' && !(identifiantDeCollection in collections)) {
        try { collections[identifiantDeCollection] = lireUnObjet(await api.variables.getVariableCollectionByIdAsync(identifiantDeCollection), PROPRIETES_DE_COLLECTION); }
        catch (erreur) { collections[identifiantDeCollection] = erreurCapturee(erreur); }
      }
      depuisLaCession += 1;
      if (depuisLaCession >= 100) { depuisLaCession = 0; await cederLaMain(); }
    }
    attendus = suivants;
  }

  // Les libraries : ce que teamLibrary rend, puis les imports que l'analyse a faits.
  let libraries: CaptureArchitect['libraries'] = null;
  if (api.teamLibrary) {
    const bibliotheque = { collections: null as unknown, variables: {} as Record<string, unknown>, imports: {} as Record<string, unknown> };
    try {
      const disponibles = await api.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      bibliotheque.collections = encoder(disponibles);
      for (const collection of disponibles) {
        try { bibliotheque.variables[collection.key] = encoder(await api.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key)); }
        catch (erreur) { bibliotheque.variables[collection.key] = erreurCapturee(erreur); }
        depuisLaCession += 1;
        if (depuisLaCession >= 20) { depuisLaCession = 0; await cederLaMain(); }
      }
    } catch (erreur) {
      bibliotheque.collections = erreurCapturee(erreur);
    }
    // Les imports que l'analyse a faits, rendus par le port de lecture : la capture n'en demande aucun.
    for (const [cle, import_] of imports ?? []) {
      bibliotheque.imports[cle] = 'erreur' in import_ ? erreurCapturee(import_.erreur) : lireUnObjet(import_.valeur as Record<string, unknown>, PROPRIETES_DE_VARIABLE);
    }
    libraries = bibliotheque;
  }

  const racine = api.root;
  const donneesPartagees: Record<string, unknown> = {};
  try {
    for (const cle of racine.getSharedPluginDataKeys(ESPACE_ARCHITECT)) donneesPartagees[cle] = racine.getSharedPluginData(ESPACE_ARCHITECT, cle);
  } catch (erreur) { donneesPartagees.$erreur = erreurCapturee(erreur); }
  const racineLue = (propriete: string): unknown => { try { return encoder(racine[propriete]); } catch (erreur) { return erreurCapturee(erreur); } };
  let niveau: unknown;
  try { niveau = encoder(await api.clientStorage.getAsync(CLE_DU_NIVEAU)); } catch (erreur) { niveau = erreurCapturee(erreur); }

  return {
    version: VERSION_DE_CAPTURE,
    date: new Date().toISOString(),
    fichier: { nom: racineLue('name'), fileKey: encoder(api.fileKey), profilDeCouleur: racineLue('documentColorProfile'), donneesPartagees, niveau },
    jeu: jeu.id,
    selection: selectionDeLaPage.map((noeud) => noeud.id),
    page: pageCourante.id,
    pages,
    noeuds,
    noeudsParIdentifiant,
    variables,
    collections,
    locales,
    styles,
    libraries,
    limites,
  };
}

/** L'horloge la plus fine du sandbox : `performance.now` quand il existe, sinon `Date.now` (millisecondes entières). */
export interface Horloge {
  readonly nom: 'performance.now' | 'Date.now';
  maintenant(): number;
}

export function choisirLHorloge(globale: { performance?: { now?: () => number } } = globalThis): Horloge {
  const performance = globale.performance;
  if (performance && typeof performance.now === 'function') return { nom: 'performance.now', maintenant: () => performance.now!() };
  return { nom: 'Date.now', maintenant: () => Date.now() };
}

export interface MesureDeLecture {
  /** Le type du nœud mesuré, ou le nom de la méthode pour un appel. */
  readonly type: string;
  readonly lecture: string;
  readonly repetitions: number;
  readonly microsecondesParLecture: number;
  /** La première lecture a levé : la boucle mesure alors le coût d'une lecture qui lève. */
  readonly leve?: true;
}

export interface BancDeCout {
  readonly horloge: Horloge['nom'];
  readonly repetitionsParPropriete: number;
  readonly repetitionsParMethode: number;
  readonly mesures: readonly MesureDeLecture[];
  /** Les deux parcours du jeu entier ; absent quand le jeu n'a pas `findAll`. */
  readonly parcours?: ComparaisonDesParcours;
  readonly dureeMs: number;
}

/**
 * Le parcours natif (`findAll(() => true)`, un appel) et le parcours explicite (une pile, `children` lu par nœud, la main
 * passée dès que le calcul dépasse `BUDGET_DU_PARCOURS_MS`) sur le même jeu. `calculMs` exclut les cessions. `memeOrdre` dit
 * si les deux rendent les mêmes identifiants dans le même ordre : sans lui, les durées ne se comparent pas.
 */
export interface ComparaisonDesParcours {
  readonly natif: { readonly noeuds: number; readonly calculMs: number };
  readonly explicite: { readonly noeuds: number; readonly calculMs: number; readonly cessions: number };
  readonly memeOrdre: boolean;
}

export const BUDGET_DU_PARCOURS_MS = 25;

export const REPETITIONS_PAR_PROPRIETE = 10_000;
export const REPETITIONS_PAR_METHODE = 1_000;

/** Un nœud type de chaque sorte : le variant, puis le premier de chaque type dans ses descendants, un cadre à auto layout de préférence. */
export function noeudsTypes(variant: LectureNoeud): LectureNoeud[] {
  const trouves = new Map<string, LectureNoeud>();
  const noter = (noeud: LectureNoeud): void => {
    const retenu = trouves.get(noeud.type);
    if (!retenu || (noeud.type === 'FRAME' && retenu.layoutMode === 'NONE' && noeud.layoutMode !== 'NONE')) trouves.set(noeud.type, noeud);
  };
  noter(variant);
  const descendants = typeof variant.findAll === 'function' ? (variant.findAll as (filtre: () => boolean) => LectureNoeud[])(() => true) : [];
  for (const noeud of descendants) noter(noeud);
  return [...trouves.values()];
}

export interface OptionsDuBanc {
  readonly horloge?: Horloge;
  readonly ceder?: () => Promise<void>;
  readonly repetitionsParPropriete?: number;
  readonly repetitionsParMethode?: number;
}

/**
 * Lit chaque propriété `repetitionsParPropriete` fois sur un nœud type de chaque sorte du premier variant, appelle chaque
 * méthode coûteuse `repetitionsParMethode` fois, et rend la durée moyenne par lecture. La main passe entre deux propriétés et
 * entre deux lots d'appels. Les durées des lots s'additionnent : l'attente entre deux lots n'en fait pas partie.
 */
export async function mesurerLeCoutDesLectures(jeuAMesurer: object, options: OptionsDuBanc = {}): Promise<BancDeCout> {
  const horloge = options.horloge ?? choisirLHorloge();
  const ceder = options.ceder ?? cederLaMain;
  const parPropriete = options.repetitionsParPropriete ?? REPETITIONS_PAR_PROPRIETE;
  const parMethode = options.repetitionsParMethode ?? REPETITIONS_PAR_METHODE;
  const debut = horloge.maintenant();
  const mesures: MesureDeLecture[] = [];
  let puits: unknown;

  const noter = (type: string, lecture: string, repetitions: number, dureeMs: number, leve: boolean): void => {
    mesures.push({ type, lecture, repetitions, microsecondesParLecture: (dureeMs * 1000) / repetitions, ...(leve ? { leve: true as const } : {}) });
  };

  const mesurerUnePropriete = async (noeud: LectureNoeud, propriete: string): Promise<void> => {
    let leve = false;
    try { puits = noeud[propriete]; } catch { leve = true; }
    const t0 = horloge.maintenant();
    for (let i = 0; i < parPropriete; i += 1) {
      try { puits = noeud[propriete]; } catch { /* la lecture qui lève compte dans la durée */ }
    }
    noter(noeud.type, propriete, parPropriete, horloge.maintenant() - t0, leve);
    await ceder();
  };

  const mesurerUneMethode = async (type: string, lecture: string, tailleDeLot: number, appeler: () => unknown, asynchrone: boolean): Promise<void> => {
    let total = 0;
    for (let faites = 0; faites < parMethode; faites += tailleDeLot) {
      const lot = Math.min(tailleDeLot, parMethode - faites);
      const t0 = horloge.maintenant();
      for (let i = 0; i < lot; i += 1) puits = asynchrone ? await appeler() : appeler();
      total += horloge.maintenant() - t0;
      await ceder();
    }
    noter(type, lecture, parMethode, total, false);
  };

  const jeu = jeuAMesurer as LectureNoeud;
  const premierVariant = Array.isArray(jeu.children) && jeu.type === 'COMPONENT_SET' ? (jeu.children as LectureNoeud[])[0] : jeu;
  for (const noeud of noeudsTypes(premierVariant)) {
    for (const propriete of PROPRIETES_DE_NOEUD) {
      let presente = false;
      try { presente = propriete in noeud; } catch { presente = false; }
      if (presente) await mesurerUnePropriete(noeud, propriete);
    }
    if (noeud.type === 'TEXT' && typeof noeud.getStyledTextSegments === 'function') {
      for (const champs of JEUX_DE_SEGMENTS) {
        await mesurerUneMethode('TEXT', `getStyledTextSegments(${champs.join(',')})`, 100, () => noeud.getStyledTextSegments!([...champs]), false);
      }
    }
    if (noeud.type === 'INSTANCE' && typeof noeud.getMainComponentAsync === 'function') {
      await mesurerUneMethode('INSTANCE', 'getMainComponentAsync()', 100, () => noeud.getMainComponentAsync!(), true);
    }
  }
  if (typeof premierVariant.findAll === 'function') {
    await mesurerUneMethode(premierVariant.type, 'findAll(() => true)', 5, () => (premierVariant.findAll as (filtre: () => boolean) => unknown)(() => true), false);
  }
  const parcours = typeof jeu.findAll === 'function' ? await comparerLesParcours(jeu, horloge, ceder) : undefined;
  return { horloge: horloge.nom, repetitionsParPropriete: parPropriete, repetitionsParMethode: parMethode, mesures, ...(parcours ? { parcours } : {}), dureeMs: horloge.maintenant() - debut };
}

/** Le préordre de `findAll` : chaque nœud avant ses enfants, les enfants dans leur ordre, instances descendues. */
export async function comparerLesParcours(jeu: LectureNoeud, horloge: Horloge, ceder: () => Promise<void>): Promise<ComparaisonDesParcours> {
  const t0 = horloge.maintenant();
  const natifs = (jeu.findAll as (filtre: () => boolean) => readonly LectureNoeud[])(() => true);
  const natifMs = horloge.maintenant() - t0;
  const idsNatifs = natifs.map((noeud) => noeud.id);
  await ceder();

  const explicites: string[] = [];
  let calculMs = 0;
  let cessions = 0;
  let tranche = horloge.maintenant();
  const pile: LectureNoeud[] = [];
  const empiler = (noeud: LectureNoeud): void => {
    let enfants: unknown;
    try { enfants = noeud.children; } catch { enfants = undefined; }
    if (Array.isArray(enfants)) for (let i = enfants.length - 1; i >= 0; i -= 1) pile.push(enfants[i] as LectureNoeud);
  };
  empiler(jeu);
  while (pile.length > 0) {
    const noeud = pile.pop()!;
    explicites.push(noeud.id);
    empiler(noeud);
    const maintenant = horloge.maintenant();
    if (maintenant - tranche >= BUDGET_DU_PARCOURS_MS) {
      calculMs += maintenant - tranche;
      cessions += 1;
      await ceder();
      tranche = horloge.maintenant();
    }
  }
  calculMs += horloge.maintenant() - tranche;
  const memeOrdre = idsNatifs.length === explicites.length && idsNatifs.every((id, rang) => id === explicites[rang]);
  return { natif: { noeuds: idsNatifs.length, calculMs: natifMs }, explicite: { noeuds: explicites.length, calculMs, cessions }, memeOrdre };
}

/** Ce que l'interface télécharge : le nom du fichier, son contenu, et de quoi résumer la capture en console. */
export interface MessageDeCapture {
  readonly type: 'capture-architect';
  readonly nom: string;
  readonly contenu: string;
  readonly resume: ResumeDeCapture;
}

export interface ResumeDeCapture {
  readonly octets: number;
  readonly noeuds: number;
  readonly noeudsSuperficiels: number;
  readonly variables: number;
  readonly styles: number;
  readonly importsDeLibrary: number;
  readonly captureMs: number;
  readonly bancMs: number;
  readonly horloge: Horloge['nom'];
  readonly limites: CaptureArchitect['limites'];
}

export const nomDeLaCapture = (date: Date): string => `capture-architect-${date.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;

/**
 * Lance la capture puis le banc de coût quand la demande les réclame, après la fin de l'analyse. Sans `capturer: true`, ou
 * sans canal d'envoi, rien ne se lit. Chacun est chronométré à part ; un échec se dit en console et ne touche pas
 * l'analyse.
 */
export async function capturerSiDemande(demande: { readonly capturer?: boolean }, contexte: Contexte, sujet: { readonly noeud: unknown; readonly page: unknown; readonly imports?: ImportsEnregistres | null } | null, optionsDuBanc: OptionsDuBanc = {}): Promise<void> {
  const horloge = optionsDuBanc.horloge ?? choisirLHorloge();
  if (demande.capturer !== true || !contexte.envoyerLaCapture || sujet === null) return;
  try {
    const jeu = sujet.noeud as LectureNoeud;
    const debutDeLaCapture = horloge.maintenant();
    const capture = await capturerLeComposant(contexte.figma, { jeu, page: sujet.page as LectureNoeud, imports: sujet.imports });
    const captureMs = horloge.maintenant() - debutDeLaCapture;
    const banc = await mesurerLeCoutDesLectures(jeu, { ...optionsDuBanc, horloge });
    const contenu = JSON.stringify({ capture, banc });
    const noeuds = Object.values(capture.noeuds);
    const resume: ResumeDeCapture = {
      octets: contenu.length,
      noeuds: noeuds.length,
      noeudsSuperficiels: noeuds.filter((noeud) => noeud.superficiel).length,
      variables: Object.keys(capture.variables).length,
      styles: Object.keys(capture.styles).length,
      importsDeLibrary: Object.keys(capture.libraries?.imports ?? {}).length,
      captureMs: Math.round(captureMs),
      bancMs: Math.round(banc.dureeMs),
      horloge: banc.horloge,
      limites: capture.limites,
    };
    contexte.envoyerLaCapture({ type: 'capture-architect', nom: nomDeLaCapture(new Date()), contenu, resume });
  } catch (erreur) {
    console.error('Capture : échec', erreur);
  }
}
