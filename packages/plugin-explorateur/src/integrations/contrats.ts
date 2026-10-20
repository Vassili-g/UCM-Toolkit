/**
 * L'intégration facultative des contrats UCM et de `tokens.json`, importés
 * explicitement par le designer et gardés en mémoire. Le socle de
 * l'explorateur ne lit jamais ce module : sans import, rien ne change.
 *
 * Version, forme champ par champ, références et index DTCG viennent de la
 * porte `@ucm-kit/core/lecteurs/navigateur`, qui n'embarque ni `node:fs` ni
 * Ajv : un contrat se juge ici comme `ucm check` le juge. Le JSON Schema
 * reste dans la porte Node.
 */
import { courbeDeToken, dureeDeToken, etatDuFormatDeTokens, isTokenReference, normalizeName, poidsDeGraisse, versionDeContrat } from '@ucm-kit/core/format';
import {
  champsInvalidesDuContrat,
  comparerAuTokenPublie,
  indexerTokensDtcg,
  nomFigmaDuVariant,
  sansEchantillon,
  verdictDeVersion,
  type CauseNonComparable,
  type Comparaison,
  type ValeurFigmaPortable,
} from '@ucm-kit/core/lecteurs/navigateur';
import { joinTokenPath } from '@ucm-kit/core/format';

import type { Index } from '../indexation';
import { espaceDuReleve, type EspaceDuReleve, type ValeurTerminale, type VariableRelevee } from '../modele';

/** Les bornes d'un import, en octets. */
export const TAILLE_MAXIMALE_D_UN_FICHIER = 20 * 1024 * 1024;
export const TAILLE_MAXIMALE_DE_L_ENSEMBLE = 50 * 1024 * 1024;

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

/** Le libellé d'un variant : son nom Figma rebâti par le kit, ou ses valeurs d'axes. */
function libelleDuVariant(contrat: Record<string, unknown>, variant: unknown): string {
  if (!estObjet(variant)) return '';
  const nom = nomFigmaDuVariant(contrat, variant);
  if (typeof nom === 'string') return nom;
  const valeurs = estObjet(variant.values) ? variant.values : {};
  return Object.entries(valeurs).map(([axe, valeur]) => `${axe}=${String(valeur)}`).join(', ') || String(contrat.name ?? '');
}

/** La partie d'une vue exacte qui renvoie à chaque catalogue, comme `vueExacteDuVariant` du kit les lit. */
const PARTIE_DU_CATALOGUE: Readonly<Record<string, string>> = {
  viewStructures: 'structure',
  viewTypographies: 'typography',
  viewComposes: 'composes',
  viewIcons: 'icons',
  viewPaintPlacements: 'paintPlacements',
  viewEffects: 'effects',
};

/**
 * Les références normatives d'un contrat, situées. `samples` et `meta` sont
 * exclus : le texte d'une maquette n'est pas une référence de token.
 */
export function occurrencesDuContrat(contrat: Record<string, unknown>): OccurrenceContractuelle[] {
  const variants = Array.isArray(contrat.variants) ? contrat.variants : [];
  const vues = estObjet(contrat.variantViews) ? contrat.variantViews : {};
  /** Pour un catalogue de parties et sa clé, les variants dont la vue y renvoie. */
  const variantsDuCatalogue = (catalogue: string, cle: string): string[] => {
    const partie = PARTIE_DU_CATALOGUE[catalogue];
    if (!partie) return [];
    const vuesConcernees = new Set(Object.entries(vues).filter(([, vue]) => estObjet(vue) && vue[partie] === cle).map(([nom]) => nom));
    return variants.filter((variant) => estObjet(variant) && vuesConcernees.has(String(variant.view))).map((variant) => libelleDuVariant(contrat, variant));
  };
  const trouvees: OccurrenceContractuelle[] = [];
  const pile: Array<{ valeur: unknown; chemin: Array<string | number> }> = Object.entries(sansEchantillon(contrat) as Record<string, unknown>)
    .reverse()
    .map(([cle, valeur]) => ({ valeur, chemin: [cle] }));
  while (pile.length > 0) {
    const { valeur, chemin } = pile.pop()!;
    if (typeof valeur === 'string') {
      if (!isTokenReference(valeur)) continue;
      const [racine, second] = chemin;
      let concernes: string[] = [];
      if (racine === 'variants' && typeof second === 'number') concernes = [libelleDuVariant(contrat, variants[second])];
      else if (typeof racine === 'string' && typeof second === 'string') concernes = variantsDuCatalogue(racine, second);
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

/** Les feuilles d'un arbre DTCG par chemin pointé, `$type` hérité du groupe le plus proche, par l'index du kit. */
export function feuillesDtcg(document: Record<string, unknown>): Map<string, FeuilleDeTokens> {
  return indexerTokensDtcg(document) as Map<string, FeuilleDeTokens>;
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
    if (verdictDeVersion(version) !== 'ok') return { refus: { raison: 'version', version } };
    const invalides = champsInvalidesDuContrat(objet);
    if (invalides.length > 0) return { refus: { raison: 'structure', detail: invalides.slice(0, 3).join(', ') } };
    return { import: { genre: 'contrat', fichier, version, composant: String(objet.name), occurrences: occurrencesDuContrat(objet), taille } };
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

/**
 * Un mode que la comparaison n'a pas pu faire. `type-incompatible` n'y figure
 * pas : l'écart de type est relevé à part, et sans lui une valeur de la mauvaise
 * nature se relève comme `forme-inconnue`. `detail` porte l'unité ou l'espace
 * de couleur que l'export écrit, pour `unite-relative`, `unite-inconnue` et
 * `espace-inconnu`.
 */
export type LimiteDExport =
  | { readonly cause: 'mode-sans-valeur' | 'alias-a-opacite'; readonly mode: string }
  | { readonly cause: Exclude<CauseNonComparable, 'type-incompatible'>; readonly mode: string; readonly detail?: string };

export interface ComparaisonAvecLExport {
  readonly ecarts: ReadonlyArray<{ readonly ecart: EcartDExport; readonly mode?: string }>;
  readonly limites: readonly LimiteDExport[];
}

const ALIAS_PUBLIE = /^\{([^{}\s]+)\}$/;

/** Ce que l'export écrirait pour la valeur terminale d'une variable, sans les objets de Figma ; `null` quand sa nature ne va pas avec le type de la variable. */
function valeurPortable(variable: VariableRelevee, source: ValeurTerminale, espace: EspaceDuReleve): ValeurFigmaPortable | null {
  switch (variable.type) {
    case 'COLOR':
      return source.nature === 'couleur' ? { nature: 'couleur', espace, composantes: [source.couleur.r, source.couleur.g, source.couleur.b], alpha: source.couleur.a } : null;
    case 'FLOAT':
      return source.nature === 'nombre' ? { nature: 'nombre', nombre: source.nombre } : null;
    case 'TIMING':
      return source.nature === 'nombre' ? { nature: 'duree', secondes: dureeDeToken(source.nombre).value } : null;
    case 'EASING': {
      const brut = source.nature === 'courbe' ? source.courbe : source.nature === 'non-prise-en-charge' ? source.brut : null;
      if (brut === null) return null;
      let lue: unknown;
      try {
        lue = JSON.parse(brut);
      } catch {
        lue = undefined;
      }
      const courbe = courbeDeToken(lue);
      return { nature: 'courbe', points: 'courbe' in courbe ? courbe.courbe : null };
    }
    case 'STRING':
      return source.nature === 'texte' ? { nature: 'texte', texte: source.texte } : null;
    case 'BOOLEAN':
      return source.nature === 'booleen' ? { nature: 'booleen', booleen: source.booleen } : null;
  }
}

/**
 * Compare la valeur terminale d'un mode à la valeur publiée. Une variable
 * `STRING` publiée en `number` est une graisse numérique : l'exporteur écrit le
 * poids que `poidsDeGraisse` donne au nom, et garde le nom qu'elle ne connaît pas.
 */
function comparerLeTerminal(variable: VariableRelevee, source: ValeurTerminale, espace: EspaceDuReleve, type: string | undefined, publiee: unknown): Comparaison {
  const portable = valeurPortable(variable, source, espace);
  if (portable === null) return { etat: 'non-comparable', cause: 'forme-inconnue' };
  if (variable.type === 'STRING' && type === 'number' && portable.nature === 'texte') {
    const poids = poidsDeGraisse(portable.texte);
    return comparerAuTokenPublie(poids === null ? portable : { nature: 'nombre', nombre: poids }, 'fontWeight', publiee);
  }
  return comparerAuTokenPublie(portable, type, publiee);
}

/** L'unité ou l'espace de couleur que la valeur publiée écrit, quand la cause le demande. */
function detailDeLaLimite(cause: CauseNonComparable, publiee: unknown): string | undefined {
  if (!estObjet(publiee)) return undefined;
  if (cause === 'espace-inconnu') return typeof publiee.colorSpace === 'string' ? publiee.colorSpace : undefined;
  if (cause === 'unite-relative' || cause === 'unite-inconnue') return typeof publiee.unit === 'string' ? publiee.unit : undefined;
  return undefined;
}

/**
 * Figma comparé à l'export, mode par mode. Chaque mode de la collection donne
 * un seul résultat : un écart (mode absent de l'export, alias ou valeur
 * différents), une limite avec sa cause, ou une égalité qui ne laisse rien. Un
 * écart de type arrête la comparaison des valeurs : aucun mode n'est alors dit
 * égal. L'appelant annonce que l'export peut être antérieur aux modifications.
 */
export function ecartsAvecLExport(index: Index, variable: string, feuille: FeuilleDeTokens): ComparaisonAvecLExport {
  const trouvee = index.variables.get(variable);
  const collection = trouvee ? index.collections.get(trouvee.collection) : undefined;
  if (!trouvee || !collection) return { ecarts: [], limites: [] };
  const ecarts: Array<{ ecart: EcartDExport; mode?: string }> = [];
  const limites: LimiteDExport[] = [];
  const typeDifferent = Boolean(feuille.$type) && !TYPES_DTCG[trouvee.type].includes(feuille.$type!);
  if (typeDifferent) ecarts.push({ ecart: 'type' });
  const espace = espaceDuReleve(index.releve);
  const modesPublies = estObjet(feuille.$extensions?.['com.ucm.modes']) ? (feuille.$extensions!['com.ucm.modes'] as Record<string, unknown>) : null;
  for (const mode of collection.modes) {
    const source = trouvee.valeurs[mode.id];
    if (!source) {
      limites.push({ cause: 'mode-sans-valeur', mode: mode.nom });
      continue;
    }
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
    if (typeDifferent) continue;
    if (source.nature === 'alias') {
      // La forme que l'export donne à un alias avec opacité n'est pas établie.
      if (source.opacite !== undefined) {
        limites.push({ cause: 'alias-a-opacite', mode: mode.nom });
        continue;
      }
      if (publiee === null || publiee === undefined) {
        limites.push({ cause: 'forme-inconnue', mode: mode.nom });
        continue;
      }
      const publie = typeof publiee === 'string' ? ALIAS_PUBLIE.exec(publiee) : null;
      const cible = index.variables.get(source.cible);
      if (!publie || !cible || publie[1] !== cheminPublie(index, cible)) ecarts.push({ ecart: 'alias', mode: mode.nom });
      continue;
    }
    if (typeof publiee === 'string' && ALIAS_PUBLIE.test(publiee)) {
      ecarts.push({ ecart: 'valeur', mode: mode.nom });
      continue;
    }
    const comparaison = comparerLeTerminal(trouvee, source, espace, feuille.$type, publiee);
    if (comparaison.etat === 'different') ecarts.push({ ecart: 'valeur', mode: mode.nom });
    else if (comparaison.etat === 'non-comparable') {
      // Le type de la variable et le `$type` s'accordent ici : une nature qui ne va pas avec le `$type` reste une forme que la comparaison ne lit pas.
      const cause = comparaison.cause === 'type-incompatible' ? 'forme-inconnue' : comparaison.cause;
      const detail = detailDeLaLimite(cause, publiee);
      limites.push(detail === undefined ? { cause, mode: mode.nom } : { cause, mode: mode.nom, detail });
    }
  }
  return { ecarts, limites };
}

/** Les occurrences contractuelles d'une variable, par sa référence publiée. */
export function occurrencesDeLaVariable(index: Index, contrats: readonly ContratImporte[], variable: string): Array<{ contrat: ContratImporte; occurrence: OccurrenceContractuelle }> {
  const trouvee = index.variables.get(variable);
  if (!trouvee) return [];
  const reference = `{${cheminPublie(index, trouvee)}}`;
  return contrats.flatMap((contrat) => contrat.occurrences.filter((occurrence) => occurrence.reference === reference).map((occurrence) => ({ contrat, occurrence })));
}
