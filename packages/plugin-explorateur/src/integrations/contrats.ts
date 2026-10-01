/**
 * L'intégration facultative des contrats UCM et de `tokens.json`, importés
 * explicitement par le designer et gardés en mémoire. Le socle de
 * l'explorateur ne lit jamais ce module : sans import, rien ne change.
 *
 * Les lecteurs Node du kit (`@ucm-kit/core/lecteurs`) tirent `ajv` et
 * `node:fs` et ne s'embarquent pas dans un plugin. Ce module reprend les
 * règles qu'il lui faut avec les seules portes du format : la référence
 * (`isTokenReference`), la version courante du contrat et du fichier de
 * tokens. `tests/contrats.test.ts` compare ses verdicts à ceux des lecteurs
 * du kit sur les mêmes entrées.
 */
import { CONTRACT_VERSION, etatDuFormatDeTokens, isTokenReference, normalizeName, versionDeContrat } from '@ucm-kit/core/format';
import { joinTokenPath } from 'ucm-plugin-socle/src/cheminsDeTokens';

import type { Index } from '../indexation';
import type { Couleur, ValeurSource, VariableRelevee } from '../modele';

/** Les bornes d'un import, en octets. */
export const TAILLE_MAXIMALE_D_UN_FICHIER = 20 * 1024 * 1024;
export const TAILLE_MAXIMALE_DE_L_ENSEMBLE = 50 * 1024 * 1024;

/**
 * La fenêtre de lecture des contrats : la majeure courante et la précédente,
 * comme `VERSION_CONTRAT_MINIMALE` et `VERSION_CONTRAT_MAXIMALE` du kit.
 */
export function versionDeContratLue(version: string): 'ok' | 'ancien' | 'recent' {
  const lue = /^(\d+)\.(\d+)$/.exec(version);
  const courante = /^(\d+)\.(\d+)$/.exec(CONTRACT_VERSION);
  if (!lue || !courante) return 'ancien';
  const [majeure, mineure] = [Number(lue[1]), Number(lue[2])];
  const [majeureCourante, mineureCourante] = [Number(courante[1]), Number(courante[2])];
  if (majeure < majeureCourante - 1) return 'ancien';
  if (majeure > majeureCourante || (majeure === majeureCourante && mineure > mineureCourante)) return 'recent';
  return 'ok';
}

/** Une référence citée par un contrat, avec son adresse exacte. */
export interface OccurrenceContractuelle {
  readonly reference: string;
  /** Le chemin JSON dans le contrat : `variants[2].tokens.background`. */
  readonly adresse: string;
  /** Les variants concernés : le variant de l'adresse, ou ceux dont la vue renvoie au catalogue visé. */
  readonly variants: readonly string[];
  /** La dernière clé de l'adresse, la propriété peinte ou mesurée. */
  readonly propriete: string;
}

export interface ContratImporte {
  readonly genre: 'contrat';
  readonly fichier: string;
  readonly version: string;
  readonly composant: string;
  readonly occurrences: readonly OccurrenceContractuelle[];
  readonly taille: number;
}

export interface FeuilleDeTokens {
  readonly $value: unknown;
  readonly $type?: string;
  readonly $extensions?: Readonly<Record<string, unknown>>;
}

export interface TokensImportes {
  readonly genre: 'tokens';
  readonly fichier: string;
  readonly version: string;
  readonly feuilles: ReadonlyMap<string, FeuilleDeTokens>;
  readonly taille: number;
}

export type Import = ContratImporte | TokensImportes;

export type RefusDImport =
  | { readonly raison: 'taille'; readonly limite: number }
  | { readonly raison: 'ensemble'; readonly limite: number }
  | { readonly raison: 'illisible' }
  | { readonly raison: 'inconnu' }
  | { readonly raison: 'version'; readonly version: string }
  | { readonly raison: 'structure'; readonly detail: string };

const estObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);

/** Le libellé d'un variant : son nom Figma, ou ses valeurs d'axes. */
function libelleDuVariant(contrat: Record<string, unknown>, variant: unknown): string {
  if (!estObjet(variant)) return '';
  if (typeof variant.figmaName === 'string') return variant.figmaName;
  const valeurs = estObjet(variant.values) ? variant.values : {};
  const etiquettes = estObjet(contrat.figmaVariantLabels) ? contrat.figmaVariantLabels : {};
  const axes = estObjet(etiquettes.axes) ? etiquettes.axes : {};
  const parValeur = estObjet(etiquettes.values) ? etiquettes.values : {};
  return Object.entries(valeurs).map(([axe, valeur]) => {
    const nomDAxe = typeof axes[axe] === 'string' ? axes[axe] : axe;
    const etiquette = estObjet(parValeur[axe]) && typeof parValeur[axe][String(valeur)] === 'string' ? parValeur[axe][String(valeur)] : valeur;
    return `${nomDAxe}=${etiquette}`;
  }).join(', ') || String(contrat.name ?? '');
}

/**
 * Les références normatives d'un contrat, situées. `samples` et `meta` sont
 * exclus : le texte d'une maquette n'est pas une référence de token.
 */
export function occurrencesDuContrat(contrat: Record<string, unknown>): OccurrenceContractuelle[] {
  const variants = Array.isArray(contrat.variants) ? contrat.variants : [];
  const vues = estObjet(contrat.variantViews) ? contrat.variantViews : {};
  /** Pour un catalogue `viewX` et sa clé, les variants dont la vue y renvoie. */
  const variantsDuCatalogue = (catalogue: string, cle: string): string[] => {
    const partie = catalogue.replace(/^view/, '').replace(/^./, (lettre) => lettre.toLowerCase());
    const vuesConcernees = new Set(Object.entries(vues).filter(([, vue]) => estObjet(vue) && vue[partie] === cle).map(([nom]) => nom));
    return variants.filter((variant) => estObjet(variant) && vuesConcernees.has(String(variant.view))).map((variant) => libelleDuVariant(contrat, variant));
  };
  const trouvees: OccurrenceContractuelle[] = [];
  const pile: Array<{ valeur: unknown; chemin: Array<string | number> }> = Object.entries(contrat)
    .filter(([cle]) => cle !== 'samples' && cle !== 'meta')
    .reverse()
    .map(([cle, valeur]) => ({ valeur, chemin: [cle] }));
  while (pile.length > 0) {
    const { valeur, chemin } = pile.pop()!;
    if (typeof valeur === 'string') {
      if (!isTokenReference(valeur)) continue;
      const [racine, second] = chemin;
      let concernes: string[] = [];
      if (racine === 'variants' && typeof second === 'number') concernes = [libelleDuVariant(contrat, variants[second])];
      else if (typeof racine === 'string' && racine.startsWith('view') && typeof second === 'string') concernes = variantsDuCatalogue(racine, second);
      const proprietes = chemin.filter((segment): segment is string => typeof segment === 'string');
      trouvees.push({ reference: valeur, adresse: adresseDe(chemin), variants: concernes, propriete: proprietes[proprietes.length - 1] ?? '' });
      continue;
    }
    if (Array.isArray(valeur)) {
      for (let rang = valeur.length - 1; rang >= 0; rang -= 1) pile.push({ valeur: valeur[rang], chemin: [...chemin, rang] });
    } else if (estObjet(valeur)) {
      for (const [cle, enfant] of Object.entries(valeur).reverse()) pile.push({ valeur: enfant, chemin: [...chemin, cle] });
    }
  }
  return trouvees;
}

function adresseDe(chemin: ReadonlyArray<string | number>): string {
  return chemin.map((segment, rang) => (typeof segment === 'number' ? `[${segment}]` : rang === 0 ? segment : `.${segment}`)).join('');
}

/** Les feuilles d'un arbre DTCG par chemin pointé, `$type` hérité du groupe le plus proche. */
export function feuillesDtcg(document: Record<string, unknown>): Map<string, FeuilleDeTokens> {
  const feuilles = new Map<string, FeuilleDeTokens>();
  const pile: Array<{ valeur: unknown; chemin: string; type: string | undefined }> = [{ valeur: document, chemin: '', type: undefined }];
  while (pile.length > 0) {
    const { valeur, chemin, type } = pile.pop()!;
    if (!estObjet(valeur)) continue;
    const typeLu = typeof valeur.$type === 'string' ? valeur.$type : type;
    if ('$value' in valeur) {
      feuilles.set(chemin, { ...(valeur as unknown as FeuilleDeTokens), ...(typeLu ? { $type: typeLu } : {}) });
      continue;
    }
    for (const [cle, enfant] of Object.entries(valeur).reverse()) {
      if (cle.startsWith('$')) continue;
      pile.push({ valeur: enfant, chemin: chemin ? `${chemin}.${cle}` : cle, type: typeLu });
    }
  }
  return feuilles;
}

/**
 * Classe un fichier importé. Un refus ne touche à aucun import précédent :
 * l'appelant ajoute le résultat seulement s'il est accepté.
 */
export function classerImport(fichier: string, texte: string, tailleDesAutres: number): { import: Import } | { refus: RefusDImport } {
  const taille = texte.length;
  if (taille > TAILLE_MAXIMALE_D_UN_FICHIER) return { refus: { raison: 'taille', limite: 20 } };
  if (tailleDesAutres + taille > TAILLE_MAXIMALE_DE_L_ENSEMBLE) return { refus: { raison: 'ensemble', limite: 50 } };
  let objet: unknown;
  try {
    objet = JSON.parse(texte);
  } catch {
    return { refus: { raison: 'illisible' } };
  }
  if (!estObjet(objet)) return { refus: { raison: 'inconnu' } };
  const version = versionDeContrat(objet);
  if (version !== null) {
    if (versionDeContratLue(version) !== 'ok') return { refus: { raison: 'version', version } };
    if (typeof objet.name !== 'string') return { refus: { raison: 'structure', detail: 'name' } };
    if (!Array.isArray(objet.variants)) return { refus: { raison: 'structure', detail: 'variants' } };
    return { import: { genre: 'contrat', fichier, version, composant: objet.name, occurrences: occurrencesDuContrat(objet), taille } };
  }
  const etat = etatDuFormatDeTokens(objet);
  const feuilles = feuillesDtcg(objet);
  if (feuilles.size === 0) return { refus: { raison: 'inconnu' } };
  if (etat.etat === 'future') return { refus: { raison: 'version', version: String(etat.version) } };
  if (etat.etat === 'invalide') return { refus: { raison: 'structure', detail: 'com.ucm.formatVersion' } };
  return { import: { genre: 'tokens', fichier, version: etat.etat === 'origine' ? 'origine' : String(etat.version), feuilles, taille } };
}

/** Le chemin publié d'une variable, celui qu'UCM Exporter écrit. */
export function cheminPublie(index: Index, variable: VariableRelevee): string {
  return joinTokenPath(index.collections.get(variable.collection)?.nom ?? '', variable.nom);
}

export type Correspondance =
  | { readonly statut: 'unique'; readonly chemin: string }
  | { readonly statut: 'absente'; readonly chemin: string }
  /** Plusieurs variables du relevé donnent ce chemin : aucune conclusion n'est tirée. */
  | { readonly statut: 'ambigue'; readonly chemin: string; readonly variables: readonly string[] };

/** Les variables par chemin publié, pour repérer les collisions. */
export function variablesParChemin(index: Index): Map<string, string[]> {
  const parChemin = new Map<string, string[]>();
  for (const variable of index.releve.variables) {
    const chemin = cheminPublie(index, variable);
    const liste = parChemin.get(chemin);
    if (liste) liste.push(variable.id);
    else parChemin.set(chemin, [variable.id]);
  }
  return parChemin;
}

/** Rapproche une variable d'un fichier de tokens, par son chemin et jamais par sa valeur. */
export function correspondance(index: Index, parChemin: ReadonlyMap<string, readonly string[]>, tokens: TokensImportes, variable: string): Correspondance | null {
  const trouvee = index.variables.get(variable);
  if (!trouvee) return null;
  const chemin = cheminPublie(index, trouvee);
  const homonymes = parChemin.get(chemin) ?? [];
  if (homonymes.length > 1) return { statut: 'ambigue', chemin, variables: homonymes };
  return tokens.feuilles.has(chemin) ? { statut: 'unique', chemin } : { statut: 'absente', chemin };
}

/** Les `$type` qu'UCM Exporter peut écrire pour chaque type Figma. */
const TYPES_DTCG: Readonly<Record<VariableRelevee['type'], readonly string[]>> = {
  COLOR: ['color'],
  FLOAT: ['dimension', 'number'],
  STRING: ['string', 'fontFamily', 'number'],
  BOOLEAN: ['boolean'],
  TIMING: ['duration', 'string'],
  EASING: ['cubicBezier', 'string'],
};

export type EcartDExport = 'type' | 'alias' | 'valeur' | 'mode';

/** Une valeur DTCG ramenée à une forme comparable à la valeur Figma ; `null` quand la forme est inconnue. */
function valeurDtcg(valeur: unknown): { nature: 'alias'; chemin: string } | { nature: 'couleur'; couleur: Couleur } | { nature: 'nombre'; nombre: number } | { nature: 'texte'; texte: string } | { nature: 'booleen'; booleen: boolean } | null {
  if (typeof valeur === 'string') {
    const alias = /^\{([^{}\s]+)\}$/.exec(valeur);
    if (alias) return { nature: 'alias', chemin: alias[1] };
    const hexa = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(valeur);
    if (hexa) {
      const octet = (rang: number) => parseInt(hexa[1].slice(rang * 2, rang * 2 + 2), 16) / 255;
      return { nature: 'couleur', couleur: { r: octet(0), g: octet(1), b: octet(2), a: hexa[2] ? parseInt(hexa[2], 16) / 255 : 1 } };
    }
    const pixels = /^(-?\d+(?:\.\d+)?)px$/.exec(valeur);
    if (pixels) return { nature: 'nombre', nombre: Number(pixels[1]) };
    return { nature: 'texte', texte: valeur };
  }
  if (typeof valeur === 'number') return { nature: 'nombre', nombre: valeur };
  if (typeof valeur === 'boolean') return { nature: 'booleen', booleen: valeur };
  if (estObjet(valeur)) {
    if (Array.isArray(valeur.components) && valeur.components.length === 3) {
      const [r, g, b] = valeur.components as number[];
      return { nature: 'couleur', couleur: { r, g, b, a: typeof valeur.alpha === 'number' ? valeur.alpha : 1 } };
    }
    if (typeof valeur.value === 'number') return { nature: 'nombre', nombre: valeur.value };
  }
  return null;
}

/** Compare une valeur Figma rangée à une valeur DTCG ; un hexadécimal compare au 8 bits près. */
function memeValeur(index: Index, source: ValeurSource, publiee: unknown): boolean | null {
  const dtcg = valeurDtcg(publiee);
  if (!dtcg) return null;
  if (source.nature === 'alias') {
    const cible = index.variables.get(source.cible);
    return dtcg.nature === 'alias' && cible !== undefined && dtcg.chemin === cheminPublie(index, cible);
  }
  if (dtcg.nature === 'alias') return false;
  if (source.nature === 'couleur' && dtcg.nature === 'couleur') {
    const proche = (a: number, b: number) => Math.abs(a - b) <= 0.5 / 255 + 1e-9;
    return proche(source.couleur.r, dtcg.couleur.r) && proche(source.couleur.g, dtcg.couleur.g) && proche(source.couleur.b, dtcg.couleur.b) && proche(source.couleur.a, dtcg.couleur.a);
  }
  if (source.nature === 'nombre' && dtcg.nature === 'nombre') return source.nombre === dtcg.nombre;
  if (source.nature === 'booleen' && dtcg.nature === 'booleen') return source.booleen === dtcg.booleen;
  if (source.nature === 'texte' && dtcg.nature === 'texte') return source.texte === dtcg.texte;
  // Une graisse publiée en poids, une durée ou une courbe : la forme diffère sans écart démontré.
  return null;
}

/**
 * Les écarts entre une variable et sa feuille publiée : type, alias ou valeur
 * par mode, mode absent. La structure se compare avant les valeurs résolues ;
 * l'appelant annonce que l'export peut être antérieur aux modifications.
 */
export function ecartsAvecLExport(index: Index, variable: string, feuille: FeuilleDeTokens): Array<{ ecart: EcartDExport; mode?: string }> {
  const trouvee = index.variables.get(variable);
  const collection = trouvee ? index.collections.get(trouvee.collection) : undefined;
  if (!trouvee || !collection) return [];
  const ecarts: Array<{ ecart: EcartDExport; mode?: string }> = [];
  if (feuille.$type && !TYPES_DTCG[trouvee.type].includes(feuille.$type)) ecarts.push({ ecart: 'type' });
  const modesPublies = estObjet(feuille.$extensions?.['com.ucm.modes']) ? (feuille.$extensions!['com.ucm.modes'] as Record<string, unknown>) : null;
  for (const mode of collection.modes) {
    const source = trouvee.valeurs[mode.id];
    if (!source) continue;
    const cle = normalizeName(mode.nom);
    let publiee: unknown;
    if (modesPublies) {
      if (!(cle in modesPublies)) {
        ecarts.push({ ecart: 'mode', mode: mode.nom });
        continue;
      }
      publiee = modesPublies[cle];
    } else if (mode.id === collection.modeParDefaut) {
      publiee = feuille.$value;
    } else {
      ecarts.push({ ecart: 'mode', mode: mode.nom });
      continue;
    }
    const egale = memeValeur(index, source, publiee);
    if (egale === false) ecarts.push({ ecart: source.nature === 'alias' ? 'alias' : 'valeur', mode: mode.nom });
  }
  return ecarts;
}

/** Les occurrences contractuelles d'une variable, par sa référence publiée. */
export function occurrencesDeLaVariable(index: Index, contrats: readonly ContratImporte[], variable: string): Array<{ contrat: ContratImporte; occurrence: OccurrenceContractuelle }> {
  const trouvee = index.variables.get(variable);
  if (!trouvee) return [];
  const reference = `{${cheminPublie(index, trouvee)}}`;
  return contrats.flatMap((contrat) => contrat.occurrences.filter((occurrence) => occurrence.reference === reference).map((occurrence) => ({ contrat, occurrence })));
}
