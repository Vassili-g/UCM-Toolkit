/**
 * Conversion d'un export DTCG de tokens (`tokens.json`) en `CatalogueDeReference`, pour passer les deux contrôles du mode Tokens
 * (`controlerLIntegriteUcm`, `controlerLeCatalogue`) sur un fichier : `ucm check` et le rejeu des fichiers réels s'en servent.
 * Chaque racine sans `$` est une collection ; ses modes viennent de `com.ucm.axes[collection]` dans l'ordre, sinon un seul mode
 * `MODE_DE_BASE`. Chaque feuille (objet à `$value`) est une variable de nom `chemin/joint` et de clé `collection|nom`. Le bilan
 * saute et compte les types composés, que Figma ne porte pas en variable.
 *
 * Un alias entier `{a.b.c}` vise la clé de la feuille de ce chemin complet. Une cible absente garde l'alias vers la clé que le chemin
 * donnerait (`a|b/c`), pour que les contrôles la voient ; le bilan sépare l'alias vers un jeton absent de celui vers un jeton sauté.
 * Le bilan ne porte que des nombres : aucun nom du fichier n'en sort.
 */
import { cheminDeReference } from '../format/references.js';
import { EXTENSION_AXES_TOKENS, EXTENSION_AXE_TOKENS, EXTENSION_MODES_TOKENS, MODE_DE_BASE, valeurDuToken } from '../format/tokens.js';
import { collectionsDeReference, type CatalogueDeReference, type CollectionDuCatalogue, type VariableDuCatalogue } from './catalogue.js';

export interface BilanDeConversion {
  collections: number;
  variables: number;
  variablesParType: Record<string, number>;
  jetonsSautes: number;
  jetonsSautesParType: Record<string, number>;
  /** Les valeurs de mode qui n'ont pas de forme portable (espace colorimétrique autre que sRGB, forme inconnue) : posées à `null`. */
  valeursSautees: number;
  aliasTotal: number;
  aliasResolus: number;
  aliasNonResolus: number;
  /** Parmi les non résolus : la cible est un jeton sauté (type composé). */
  aliasVersJetonSaute: number;
  /** Les valeurs d'un mode que la feuille porte sans que l'axe de sa collection le déclare. */
  modesHorsAxe: number;
  collectionsAvecAxes: number;
}

export interface ConversionDeTokens { catalogue: CatalogueDeReference; bilan: BilanDeConversion }

const TYPES_PORTES: Readonly<Record<string, VariableDuCatalogue['type']>> = {
  color: 'COLOR', dimension: 'FLOAT', number: 'FLOAT', fontWeight: 'FLOAT', duration: 'FLOAT',
  fontFamily: 'STRING', string: 'STRING', boolean: 'BOOLEAN',
};

const OBJET = (valeur: unknown): valeur is Record<string, unknown> => valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);

interface Feuille { collection: string; chemin: string[]; type: string | undefined; brut: Record<string, unknown> }

function collecter(tokens: Record<string, unknown>): { feuilles: Feuille[]; racines: string[]; aLaRacine: number } {
  const feuilles: Feuille[] = [];
  const racines: string[] = [];
  let aLaRacine = 0;
  const visiter = (noeud: Record<string, unknown>, chemin: string[], collection: string, typeHerite: string | undefined): void => {
    const type = typeof noeud.$type === 'string' ? noeud.$type : typeHerite;
    for (const [cle, valeur] of Object.entries(noeud)) {
      if (cle.startsWith('$') || !OBJET(valeur)) continue;
      if ('$value' in valeur) {
        feuilles.push({ collection, chemin: [...chemin, cle], type: typeof valeur.$type === 'string' ? valeur.$type : type, brut: valeur });
      } else visiter(valeur, [...chemin, cle], collection, type);
    }
  };
  for (const [cle, racine] of Object.entries(tokens)) {
    if (cle.startsWith('$') || !OBJET(racine)) continue;
    if ('$value' in racine) { aLaRacine += 1; continue; }
    racines.push(cle);
    visiter(racine, [], cle, undefined);
  }
  return { feuilles, racines, aLaRacine };
}

function canal(valeur: unknown): number | undefined {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : undefined;
}

/** Une couleur que le catalogue sait porter : la forme du format, en sRGB. `display-p3` n'a pas de forme portable ici. */
function couleurDepuis(valeur: unknown): { r: number; g: number; b: number; a: number } | 'sautee' {
  const lue = valeurDuToken('color', valeur);
  if ('refus' in lue || lue.valeur.colorSpace !== 'srgb') return 'sautee';
  const [r, g, b] = lue.valeur.components;
  return { r, g, b, a: lue.valeur.alpha };
}

/** La valeur littérale d'un type porté ; `'sautee'` quand la forme n'est pas portable. */
function litteral(type: string, valeur: unknown): unknown {
  if (valeur === null) return null;
  switch (type) {
    case 'color': return couleurDepuis(valeur);
    case 'dimension': {
      const lue = valeurDuToken('dimension', valeur);
      return 'refus' in lue ? 'sautee' : lue.valeur.value;
    }
    case 'duration': return OBJET(valeur) && canal(valeur.value) !== undefined ? valeur.value : canal(valeur) ?? 'sautee';
    case 'number': case 'fontWeight': return canal(valeur) ?? (typeof valeur === 'string' ? valeur : 'sautee');
    case 'fontFamily': return typeof valeur === 'string' ? valeur : Array.isArray(valeur) ? valeur.join(', ') : 'sautee';
    case 'string': return typeof valeur === 'string' ? valeur : 'sautee';
    case 'boolean': return typeof valeur === 'boolean' ? valeur : 'sautee';
    default: return 'sautee';
  }
}

export function catalogueDepuisTokens(tokens: unknown, architecture: 'ucm' | 'libre' = 'ucm'): ConversionDeTokens {
  if (!OBJET(tokens)) throw new Error('Le fichier de tokens n\'est pas un objet.');
  const extensions = OBJET(tokens.$extensions) ? tokens.$extensions : {};
  const axes = OBJET(extensions[EXTENSION_AXES_TOKENS]) ? extensions[EXTENSION_AXES_TOKENS] as Record<string, unknown> : {};
  const modesDeAxe = (axe: string): string[] | undefined => {
    const declaration = axes[axe];
    return OBJET(declaration) && Array.isArray(declaration.modes) ? declaration.modes.filter((mode): mode is string => typeof mode === 'string') : undefined;
  };

  const { feuilles, racines } = collecter(tokens);
  const bilan: BilanDeConversion = {
    collections: racines.length, variables: 0, variablesParType: {}, jetonsSautes: 0, jetonsSautesParType: {}, valeursSautees: 0,
    aliasTotal: 0, aliasResolus: 0, aliasNonResolus: 0, aliasVersJetonSaute: 0, modesHorsAxe: 0, collectionsAvecAxes: 0,
  };

  // Les modes de chaque collection : l'axe de la racine, sinon l'unique axe que ses feuilles nomment.
  const modesParCollection = new Map<string, string[]>();
  for (const racine of racines) {
    const propres = modesDeAxe(racine);
    if (propres && propres.length > 0) { modesParCollection.set(racine, propres); continue; }
    const nommes = new Set(feuilles.filter((f) => f.collection === racine)
      .flatMap((f) => (OBJET(f.brut.$extensions) && typeof f.brut.$extensions[EXTENSION_AXE_TOKENS] === 'string' ? [f.brut.$extensions[EXTENSION_AXE_TOKENS] as string] : [])));
    const unique = nommes.size === 1 ? modesDeAxe([...nommes][0]) : undefined;
    modesParCollection.set(racine, unique && unique.length > 0 ? unique : [MODE_DE_BASE]);
  }
  bilan.collectionsAvecAxes = [...modesParCollection.values()].filter((modes) => !(modes.length === 1 && modes[0] === MODE_DE_BASE)).length;

  // Les chemins complets des feuilles portées et des feuilles sautées.
  const cleParChemin = new Map<string, string>();
  const sautes = new Set<string>();
  const portees: (Feuille & { nom: string; cle: string; type: VariableDuCatalogue['type']; typeDtcg: string })[] = [];
  for (const feuille of feuilles) {
    const complet = [feuille.collection, ...feuille.chemin].join('.');
    const portee = feuille.type === undefined ? undefined : TYPES_PORTES[feuille.type];
    if (!portee) {
      bilan.jetonsSautes += 1;
      const type = feuille.type ?? '(sans type)';
      bilan.jetonsSautesParType[type] = (bilan.jetonsSautesParType[type] ?? 0) + 1;
      sautes.add(complet);
      continue;
    }
    const nom = feuille.chemin.join('/');
    const cle = `${feuille.collection}|${nom}`;
    cleParChemin.set(complet, cle);
    portees.push({ ...feuille, nom, cle, type: portee, typeDtcg: feuille.type! });
    bilan.variables += 1;
    bilan.variablesParType[portee] = (bilan.variablesParType[portee] ?? 0) + 1;
  }

  const variables: VariableDuCatalogue[] = portees.map((feuille) => {
    const modes = modesParCollection.get(feuille.collection)!;
    const parMode = OBJET(feuille.brut.$extensions) && OBJET(feuille.brut.$extensions[EXTENSION_MODES_TOKENS])
      ? feuille.brut.$extensions[EXTENSION_MODES_TOKENS] as Record<string, unknown> : {};
    bilan.modesHorsAxe += Object.keys(parMode).filter((mode) => !modes.includes(mode)).length;
    const typeDtcg = feuille.typeDtcg;
    const valeurs: Record<string, { alias: string } | { valeur: unknown }> = {};
    for (const mode of modes) {
      const brut = mode in parMode ? parMode[mode] : feuille.brut.$value;
      const cible = cheminDeReference(brut);
      if (cible !== null) {
        bilan.aliasTotal += 1;
        const cle = cleParChemin.get(cible);
        if (cle) { bilan.aliasResolus += 1; valeurs[mode] = { alias: cle }; continue; }
        bilan.aliasNonResolus += 1;
        if (sautes.has(cible)) bilan.aliasVersJetonSaute += 1;
        const [racine, ...reste] = cible.split('.');
        valeurs[mode] = { alias: `${racine}|${reste.join('/')}` };
        continue;
      }
      const valeur = litteral(typeDtcg, brut);
      if (valeur === 'sautee') { bilan.valeursSautees += 1; valeurs[mode] = { valeur: null }; } else valeurs[mode] = { valeur };
    }
    const scopes = OBJET(feuille.brut.$extensions) ? feuille.brut.$extensions['com.figma.scopes'] : undefined;
    return {
      cle: feuille.cle, nom: feuille.nom, collection: feuille.collection, type: feuille.type, etat: 'presente' as const, valeurs,
      ...(Array.isArray(scopes) ? { scopes: scopes.filter((scope): scope is string => typeof scope === 'string') } : {}),
    };
  });

  const collections: CollectionDuCatalogue[] = collectionsDeReference(
    racines.map((racine) => ({
      cle: racine, nom: racine, etat: 'lue' as const, modes: modesParCollection.get(racine)!.map((mode) => ({ id: mode, nom: mode })),
    })),
    architecture,
  );
  return { catalogue: { version: 1, library: null, collections, variables }, bilan };
}
