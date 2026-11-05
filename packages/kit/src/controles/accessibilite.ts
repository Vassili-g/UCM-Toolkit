/**
 * Contraste et accessibilité d'un composant (C49 à C53) sur le dessin Figma
 * relevé. Les seuils WCAG sont jugés sans arrondi, par `atteintLeSeuil`. La
 * cible, l'anneau UCM et la taille du texte sont des recommandations : le
 * dessin ne prouve pas la cible réelle. Un fond ou une couleur que le relevé
 * ne permet pas de calculer rend une limite, jamais un verdict.
 */
import { GARANTIES } from '../emplois/garanties.js';
import { atteintLeSeuil, contraste, contrasteTronque } from '../emplois/contraste.js';
import { hexaDeFigma, versRgb8 } from '../emplois/couleur.js';
import { estUnAnneau, estUneIcone } from '../referentiel/layers.js';
import { RECOMMANDATIONS } from '../referentiel/recommandations.js';
import type { CatalogueDeReference, CollectionDuCatalogue, CouleurResolue, VariableDuCatalogue } from './catalogue.js';
import { collectionDuCatalogue, variableDuCatalogue } from './catalogue.js';
import { estLAxeDEtats, termeReconnu } from '../referentiel/reconnaissance.js';
import { variableDuThemeReconnue } from '../referentiel/theme.js';
import { REGISTRE_ROLES } from '../referentiel/vocabulaire.js';
import { etatReconnu } from './nommage.js';
import type { Constat } from './constat.js';
import { layersVisiblesDuVariant, lectureManquee, liaisonsPropres, peintureVisible, type LayerLu, type LiaisonLue, type PeintureLue, type ReleveDeComposant, type VariantLu } from './releve.js';

export type NiveauWcag = 'AA' | 'AAA';

/** Borne des mesures : variants × combinaisons de modes. Au-delà, un constat d'information compte le reste. */
export const BORNE_DE_COMBINAISONS = 5000;

/**
 * Entier naturel exact de taille quelconque, en tranches de six chiffres décimaux, la moins significative d'abord.
 * Le nombre de combinaisons de modes est un produit : au-delà de 2^53 un flottant l'arrondirait sans le dire.
 */
type Compte = number[];
const TRANCHE = 1_000_000;

const compte = (n: number): Compte => [n];
const estNul = (c: Compte): boolean => c.length === 1 && c[0] === 0;

function normaliser(c: Compte): Compte {
  while (c.length > 1 && c[c.length - 1] === 0) c.pop();
  return c;
}

/** `facteur` est un entier de moins de 2^31. */
function multiplier(c: Compte, facteur: number): Compte {
  const produit: Compte = [];
  let retenue = 0;
  for (const tranche of c) {
    const v = tranche * facteur + retenue;
    produit.push(v % TRANCHE);
    retenue = Math.floor(v / TRANCHE);
  }
  while (retenue > 0) {
    produit.push(retenue % TRANCHE);
    retenue = Math.floor(retenue / TRANCHE);
  }
  return normaliser(produit);
}

function additionner(a: Compte, b: Compte): Compte {
  const somme: Compte = [];
  let retenue = 0;
  for (let i = 0; i < Math.max(a.length, b.length) || retenue > 0; i++) {
    const v = (a[i] ?? 0) + (b[i] ?? 0) + retenue;
    somme.push(v % TRANCHE);
    retenue = Math.floor(v / TRANCHE);
  }
  return somme;
}

/** `petit` est un entier de moins d'une tranche, au plus égal à `c`. */
function retirer(c: Compte, petit: number): Compte {
  const reste = [...c];
  reste[0] -= petit;
  for (let i = 0; i < reste.length - 1 && reste[i] < 0; i++) {
    reste[i] += TRANCHE;
    reste[i + 1] -= 1;
  }
  return normaliser(reste);
}

/** Un nombre tant qu'il est exact (jusqu'à `Number.MAX_SAFE_INTEGER`), sinon la chaîne de ses chiffres. */
function compteEnFait(c: Compte): number | string {
  const chiffres = [...c].reverse().map((tranche, i) => (i === 0 ? String(tranche) : String(tranche).padStart(6, '0'))).join('');
  const maximum = String(Number.MAX_SAFE_INTEGER);
  return chiffres.length < maximum.length || (chiffres.length === maximum.length && chiffres <= maximum) ? Number(chiffres) : chiffres;
}

/** Seuils WCAG 2 : texte, grand texte, non-texte (1.4.11). */
export const SEUILS_D_ACCESSIBILITE = {
  texte: { AA: 4.5, AAA: 7 },
  grandTexte: { AA: 3, AAA: 4.5 },
  nonTexte: 3,
} as const;

/** Recommandations UCM, hors seuils WCAG : 24 px en constat, 44 px au tactile, 12 px de texte. */
export const CIBLE_MINIMALE_PX = 24;
export const CIBLE_TACTILE_PX = 44;
export const TEXTE_MINIMAL_PX = 12;

export type Cause = 'fond-indetermine' | 'degrade' | 'image' | 'peinture-superposee' | 'mode-illisible' | 'couleur-absente' | 'fond-de-repli' | 'couleur-hors-gamut';
export type Rgba = { r: number; g: number; b: number; a: number };
/**
 * Une combinaison de modes. `sansTheme` n'existe que si les modes du thème sont entrés dans le produit pour le seul repli : la même
 * combinaison sans eux, pour une cible qui ne se mesure pas sur le repli.
 */
export type Combinaison = { modes: Map<string, string>; etiquette: string; sansTheme?: { etiquette: string; cle: string } };
export type Pile = { couches: Rgba[] } | { limite: Cause };
type Cible = {
  layer: LayerLu; code: 'C49' | 'C50'; usage: 'texte' | 'grand-texte' | 'icone' | 'stroke' | 'anneau';
  champ: 'fills' | 'strokes'; peintures: PeintureLue[]; liaisons: LiaisonLue[]; seuil: number;
};
/** Un fond que le relevé ne permet pas de calculer. `sansRepli` : même la page et la carte du thème ne le remplacent pas. */
type LimiteDeFond = { limite: Cause; sansRepli?: true };

const OPAQUE = 1 - 1e-9;

/** Un canal ou un alpha de Figma tient dans [0, 1] ; NaN n'y tient pas. Une couleur qui en sort n'est jamais bornée en silence (Q-F7-5). */
const dansLeGamut = (x: number): boolean => x >= 0 && x <= 1;
const couleurDansLeGamut = (c: { r: number; g: number; b: number; a?: number }): boolean =>
  dansLeGamut(c.r) && dansLeGamut(c.g) && dansLeGamut(c.b) && dansLeGamut(c.a ?? 1);

export function controlerLAccessibilite(
  releve: ReleveDeComposant,
  catalogue: CatalogueDeReference,
  options: { niveau: NiveauWcag },
): Constat[] {
  const calcul = controlerLAccessibiliteParEtapes(releve, catalogue, options);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Le même calcul, découpé : une étape par variant, par cible et par combinaison de modes. */
export function* controlerLAccessibiliteParEtapes(
  releve: ReleveDeComposant,
  catalogue: CatalogueDeReference,
  options: { niveau: NiveauWcag },
): Generator<void, Constat[]> {
  const constats: Constat[] = [];
  const limites = new Map<string, Constat>();
  const groupes = new Map<string, GroupeMesure>();
  const desactives = releve.variants.filter((v) => etatDuVariant(v) === 'disabled');
  const mesures = releve.variants.filter((v) => etatDuVariant(v) !== 'disabled');

  if (desactives.length > 0) {
    constats.push({
      id: 'C53', code: 'C53', type: 'info', famille: 'contraste',
      variants: desactives.map((v) => v.nom), layers: [], faits: { variantsExclus: desactives.length },
    });
  }

  let reste = BORNE_DE_COMBINAISONS;
  let nonMesurees = compte(0);
  let mesureesTotal = 0;
  let variantsNonMesures = 0;
  for (const variant of mesures) {
    yield;
    const cibles = yield* ciblesDeContraste(variant, options.niveau, catalogue);
    const { prises, total } = yield* combinaisonsDeModes(variant, catalogue, Math.max(0, reste), cibles);
    reste -= prises.length;
    mesureesTotal += prises.length;
    const sansMesure = retirer(total, prises.length);
    if (!estNul(sansMesure)) variantsNonMesures++;
    nonMesurees = additionner(nonMesurees, sansMesure);
    if (prises.length > 0) yield* mesurerLeVariant(variant, cibles, prises, catalogue, options.niveau, groupes, limites);
  }
  constats.push(...[...groupes.values()].map((g) => g.constat), ...limites.values());
  if (!estNul(nonMesurees)) {
    constats.push({
      id: 'C49:borne', code: 'C49', type: 'info', famille: 'contraste', variants: [], layers: [], limite: true,
      faits: { borne: BORNE_DE_COMBINAISONS, combinaisonsMesurees: mesureesTotal, combinaisonsNonMesurees: compteEnFait(nonMesurees), variantsNonMesures },
    });
  }

  constats.push(...yield* controlerLesCibles(mesures, estInteractif(releve), releve));
  constats.push(...yield* controlerLeTexteMinimal(mesures));
  constats.push(...yield* controlerLAnneau(mesures, catalogue));
  return constats;
}

function etatDuVariant(variant: VariantLu): string | null {
  for (const [axe, valeur] of Object.entries(variant.valeurs)) if (estLAxeDEtats(axe)) return etatReconnu(valeur) ?? valeur.toLowerCase();
  return null;
}

function estInteractif(releve: ReleveDeComposant): boolean {
  return releve.proprietes.some((p) => p.type === 'VARIANT' && estLAxeDEtats(p.nom)
    && (p.valeurs ?? []).some((v) => {
      const etat = etatReconnu(v);
      return etat !== undefined && etat !== 'default' && etat !== 'disabled';
    }));
}

/** Les layers visibles d'un variant, calculés une fois pour tous les contrôles d'accessibilité ; la liste est gelée. */
function layersVisibles(variant: VariantLu): readonly LayerLu[] {
  const memoire = memoireDuVariant(variant);
  memoire.visibles ??= Object.freeze(layersVisiblesDuVariant(variant));
  return memoire.visibles;
}

/** Le grand texte commence à 24 px, ou à 14 pt (56/3 px) en graisse 700 ou plus ; 18,66 px reste un petit texte (Q-F7-3). */
function estGrandTexte(fontSize: number, fontWeight: number): boolean {
  return fontSize >= 24 || (fontSize >= 56 / 3 && fontWeight >= 700);
}

function aUnePeintureVisible(layer: LayerLu, champ: 'fills' | 'strokes'): boolean {
  return layer.peintures.some((p) => p.champ === champ && peintureVisible(p));
}

/* ---------- Couleurs et modes ---------- */

/** `variables` reçoit, par collection, les variables que les chaînes d'alias atteignent. */
function collectionsAtteintes(
  catalogue: CatalogueDeReference, cle: string, vues: Set<string>, atteintes: Map<string, CollectionDuCatalogue>,
  variables?: Map<string, VariableDuCatalogue[]>,
): void {
  if (vues.has(cle)) return;
  vues.add(cle);
  const variable = variableDuCatalogue(catalogue, cle);
  if (variable === 'absente') return;
  const collection = collectionDuCatalogue(catalogue, variable.collection);
  if (collection !== 'absente') {
    atteintes.set(collection.cle, collection);
    if (variables) variables.set(collection.cle, [...(variables.get(collection.cle) ?? []), variable]);
  }
  for (const valeur of Object.values(variable.valeurs ?? {})) {
    if ('alias' in valeur) collectionsAtteintes(catalogue, valeur.alias, vues, atteintes, variables);
  }
}

/** Aucun mode de la collection ne change une valeur que les variables atteintes lisent : elle sort du produit des modes (Q-F7-11). */
function collectionInerte(collection: CollectionDuCatalogue, variables: readonly VariableDuCatalogue[]): boolean {
  if (collection.modes.length < 2 || collection.etat !== 'lue') return false;
  return variables.every((variable) => {
    if (variable.etat !== 'presente' || !variable.valeurs) return false;
    const valeurs = collection.modes.map((mode) => variable.valeurs![mode.id]);
    if (valeurs.some((valeur) => valeur === undefined)) return false;
    const signature = JSON.stringify(valeurs[0]);
    return valeurs.every((valeur) => JSON.stringify(valeur) === signature);
  });
}

/** Un fond de page ou d'élévation du thème sert à mesurer une cible dont les ancêtres ne portent aucun fond opaque. */
function leRepliSertA(variant: VariantLu, cible: Cible, catalogue: CatalogueDeReference): boolean {
  if (!catalogue.fondsDElevation || Object.keys(catalogue.fondsDElevation).length === 0) return false;
  const fond = fondEffectif(variant, cible.layer, catalogue, { modes: new Map(), etiquette: '' });
  return 'limite' in fond && fond.limite === 'fond-indetermine' && !fond.sansRepli;
}

function liaisonsDeCouleur(layer: LayerLu): LiaisonLue[] {
  const plages = (layer.texte?.plages ?? []).flatMap((p) => p.liaisons);
  return [...layer.liaisons, ...plages].filter((l) => l.champ === 'fills' || l.champ === 'strokes');
}

function modeEffectif(variant: VariantLu, collection: CollectionDuCatalogue): string | null {
  const brut = variant.modesEffectifs[collection.cle] ?? variant.modesEffectifs[collection.nom];
  if (brut === undefined) return null;
  return collection.modes.find((m) => m.id === brut || m.nom === brut)?.id ?? null;
}

/**
 * Le mode effectif du variant d'abord, puis les autres modes de chaque collection atteinte.
 * Rend les `limite` premières combinaisons dans l'ordre du produit (la première collection varie le plus lentement) et le
 * nombre total, calculé sans produire le produit : l'espace suit `limite`, pas le produit.
 * Le total est un `Compte` exact : un produit peut dépasser les entiers qu'un flottant représente.
 */
function* combinaisonsDeModes(
  variant: VariantLu, catalogue: CatalogueDeReference, limite: number, cibles: readonly Cible[],
): Generator<void, { prises: Combinaison[]; total: Compte }> {
  const atteintes = new Map<string, CollectionDuCatalogue>();
  const variables = new Map<string, VariableDuCatalogue[]>();
  const vues = new Set<string>();
  for (const layer of layersVisibles(variant)) {
    for (const liaison of liaisonsDeCouleur(layer)) collectionsAtteintes(catalogue, liaison.variable.cle, vues, atteintes, variables);
  }
  for (const [cle, collection] of atteintes) if (collectionInerte(collection, variables.get(cle) ?? [])) atteintes.delete(cle);
  // Dès que le repli sert, les modes du thème entrent dans le produit, même si aucune couleur ne les atteint (Q-F7-6).
  const theme = catalogue.collections.find((c) => c.role === 'theme' && c.etat === 'lue');
  const themeDuRepli = theme && !atteintes.has(theme.cle) && cibles.some((cible) => leRepliSertA(variant, cible, catalogue)) ? theme : null;
  if (themeDuRepli) atteintes.set(themeDuRepli.cle, themeDuRepli);
  const colonnes: { collection: CollectionDuCatalogue; modes: CollectionDuCatalogue['modes'] }[] = [];
  let total = compte(1);
  for (const collection of atteintes.values()) {
    const effectif = modeEffectif(variant, collection);
    const modes = [...collection.modes].sort((a, b) => Number(b.id === effectif) - Number(a.id === effectif));
    if (modes.length === 0) continue;
    colonnes.push({ collection, modes });
    total = multiplier(total, modes.length);
  }
  const prises: Combinaison[] = [];
  const rangs = colonnes.map(() => 0);
  const voulues = total.length === 1 ? Math.min(total[0], limite) : limite;
  for (let n = 0; n < voulues; n++) {
    yield;
    const modes = new Map<string, string>();
    const etiquettes: string[] = [];
    const sansTheme: string[] = [];
    const sansThemeModes: string[] = [];
    for (let i = 0; i < colonnes.length; i++) {
      const { collection } = colonnes[i];
      const mode = colonnes[i].modes[rangs[i]];
      modes.set(collection.cle, mode.id);
      etiquettes.push(`${collection.nom} en ${mode.nom}`);
      if (collection !== themeDuRepli) { sansTheme.push(etiquettes[i]); sansThemeModes.push(mode.id); }
    }
    prises.push({
      modes, etiquette: etiquettes.join(', '),
      ...(themeDuRepli ? { sansTheme: { etiquette: sansTheme.join(', '), cle: sansThemeModes.join(SEPARATEUR) } } : {}),
    });
    for (let i = colonnes.length - 1; i >= 0; i--) {
      rangs[i] += 1;
      if (rangs[i] < colonnes[i].modes.length) break;
      rangs[i] = 0;
    }
  }
  return { prises, total };
}

interface MemoireDesCouleurs {
  readonly variables: readonly VariableDuCatalogue[];
  readonly nombreDeVariables: number;
  readonly collections: readonly CollectionDuCatalogue[];
  readonly nombreDeCollections: number;
  readonly clotures: Map<string, CollectionDuCatalogue[]>;
  readonly couleurs: Map<string, Rgba | 'mode-illisible'>;
}

const memoiresDesCouleurs = new WeakMap<CatalogueDeReference, MemoireDesCouleurs>();
/** Séparateur des éléments d'une clé de mémoire, et marque d'une collection sans mode : aucun identifiant ne les contient. */
const SEPARATEUR = String.fromCharCode(1);
const SANS_MODE = String.fromCharCode(2);
/** Au-delà, la mémoire des couleurs est vidée en entier. */
const PLAFOND_DE_COULEURS = 100_000;

/** Même règle de validité que l'index des variables : les tableaux `variables` et `collections`, avec leurs longueurs. */
function memoireDesCouleurs(catalogue: CatalogueDeReference): MemoireDesCouleurs {
  const { variables, collections } = catalogue;
  const connue = memoiresDesCouleurs.get(catalogue);
  if (connue && connue.variables === variables && connue.nombreDeVariables === variables.length
    && connue.collections === collections && connue.nombreDeCollections === collections.length) return connue;
  const neuve = {
    variables, nombreDeVariables: variables.length, collections, nombreDeCollections: collections.length,
    clotures: new Map<string, CollectionDuCatalogue[]>(), couleurs: new Map<string, Rgba | 'mode-illisible'>(),
  };
  memoiresDesCouleurs.set(catalogue, neuve);
  return neuve;
}

/** Le mode qu'une combinaison choisit pour une collection : le sien, sinon l'effectif du variant, sinon le premier. */
function modeDeLaCollection(variant: VariantLu, combinaison: Combinaison, collection: CollectionDuCatalogue): string | undefined {
  return combinaison.modes.get(collection.cle) ?? modeEffectif(variant, collection) ?? collection.modes[0]?.id;
}

/** Les collections que la chaîne d'alias d'une variable peut atteindre, tous modes confondus, calculées une fois par catalogue. */
function clotureDeLaVariable(catalogue: CatalogueDeReference, memoire: MemoireDesCouleurs, cle: string): CollectionDuCatalogue[] {
  let cloture = memoire.clotures.get(cle);
  if (!cloture) {
    const atteintes = new Map<string, CollectionDuCatalogue>();
    collectionsAtteintes(catalogue, cle, new Set(), atteintes);
    cloture = [...atteintes.values()];
    memoire.clotures.set(cle, cloture);
  }
  return cloture;
}

/**
 * La couleur d'une liaison dans une combinaison, alias suivis jusqu'à 10 renvois. Elle ne dépend, pour un catalogue donné, que de
 * la variable, du nombre de renvois déjà faits et du mode choisi pour chaque collection que sa chaîne d'alias peut atteindre
 * (`collectionsAtteintes`, tous modes confondus) : deux combinaisons ou deux variants qui s'accordent sur ces modes partagent le
 * résultat, rendu gelé.
 */
export function couleurDeLiaison(
  catalogue: CatalogueDeReference, variant: VariantLu, combinaison: Combinaison, cle: string, profondeur = 0,
): Rgba | 'mode-illisible' {
  if (profondeur > 10) return 'mode-illisible';
  const memoire = memoireDesCouleurs(catalogue);
  const contexte = clotureDeLaVariable(catalogue, memoire, cle).map((collection) => modeDeLaCollection(variant, combinaison, collection) ?? SANS_MODE).join(SEPARATEUR);
  const signature = `${profondeur}${SEPARATEUR}${cle}${SEPARATEUR}${contexte}`;
  const connue = memoire.couleurs.get(signature);
  if (connue !== undefined) return connue;
  const couleur = resoudreLaCouleur(catalogue, variant, combinaison, cle, profondeur);
  if (memoire.couleurs.size >= PLAFOND_DE_COULEURS) memoire.couleurs.clear();
  memoire.couleurs.set(signature, couleur);
  return couleur;
}

function resoudreLaCouleur(
  catalogue: CatalogueDeReference, variant: VariantLu, combinaison: Combinaison, cle: string, profondeur: number,
): Rgba | 'mode-illisible' {
  const variable = variableDuCatalogue(catalogue, cle);
  if (variable === 'absente' || variable.etat !== 'presente' || !variable.valeurs) return 'mode-illisible';
  const collection = collectionDuCatalogue(catalogue, variable.collection);
  if (collection === 'absente' || collection.etat !== 'lue') return 'mode-illisible';
  const modeId = modeDeLaCollection(variant, combinaison, collection);
  const valeur = modeId !== undefined ? variable.valeurs[modeId] : undefined;
  if (!valeur) return 'mode-illisible';
  if ('alias' in valeur) return couleurDeLiaison(catalogue, variant, combinaison, valeur.alias, profondeur + 1);
  const c = valeur.valeur as Partial<Rgba> | null;
  if (!c || typeof c !== 'object' || typeof c.r !== 'number' || typeof c.g !== 'number' || typeof c.b !== 'number') return 'mode-illisible';
  return Object.freeze({ r: c.r, g: c.g, b: c.b, a: typeof c.a === 'number' ? c.a : 1 });
}

/**
 * Les couches unies d'une liste de peintures, de la plus haute à la première opaque. `opaciteDuLayer` est l'opacité effective du
 * layer : le produit de la sienne et de celles de ses ancêtres. Une peinture d'alpha effectif nul n'est pas une couche.
 */
export function pileDePeintures(
  peintures: PeintureLue[], liaisons: LiaisonLue[], opaciteDuLayer: number,
  catalogue: CatalogueDeReference, variant: VariantLu, combinaison: Combinaison,
): Pile {
  const couches: Rgba[] = [];
  for (let i = peintures.length - 1; i >= 0; i--) {
    const p = peintures[i];
    if (!peintureVisible(p)) continue;
    if (p.type !== 'SOLID') {
      if (couches.length > 0) return { limite: 'peinture-superposee' };
      return { limite: p.type.startsWith('GRADIENT') ? 'degrade' : p.type === 'IMAGE' || p.type === 'VIDEO' ? 'image' : 'peinture-superposee' };
    }
    if (p.blendMode !== 'NORMAL' && p.blendMode !== 'PASS_THROUGH') return { limite: 'peinture-superposee' };
    const liaison = liaisons.find((l) => l.champ === p.champ && (l.indice ?? 0) === p.indice);
    let couleur: Rgba | undefined = p.couleur;
    if (liaison?.illisible) return { limite: 'mode-illisible' };
    if (liaison) {
      const lue = couleurDeLiaison(catalogue, variant, combinaison, liaison.variable.cle);
      if (lue === 'mode-illisible') return { limite: 'mode-illisible' };
      couleur = lue;
    }
    if (!couleur) return { limite: 'couleur-absente' };
    const a = couleur.a * p.opacite * opaciteDuLayer;
    if (!couleurDansLeGamut(couleur) || !dansLeGamut(a)) return { limite: 'couleur-hors-gamut' };
    if (a === 0) continue;
    couches.push({ r: couleur.r, g: couleur.g, b: couleur.b, a });
    if (a >= OPAQUE) break;
  }
  return { couches };
}

/** Compose des couches (de la plus haute à la plus basse) sur une base ; sans base, la dernière doit être opaque. */
export function composer(couches: Rgba[], base: Rgba | null): Rgba | null {
  let resultat = base;
  for (let i = couches.length - 1; i >= 0; i--) {
    const c = couches[i];
    if (!resultat) {
      if (c.a < OPAQUE) return null;
      resultat = { ...c, a: 1 };
      continue;
    }
    resultat = {
      r: c.r * c.a + resultat.r * (1 - c.a), g: c.g * c.a + resultat.g * (1 - c.a),
      b: c.b * c.a + resultat.b * (1 - c.a), a: 1,
    };
  }
  return resultat;
}

/**
 * Mémoire d'un variant : ses layers par identifiant, les layers visibles et les fonds déjà calculés. Elle vaut tant que le tableau
 * `layers` est le même avec la même longueur ; un layer modifié en place sans changer le tableau n'est pas vu.
 */
interface MemoireDuVariant {
  readonly layers: readonly LayerLu[];
  readonly nombreDeLayers: number;
  readonly parId: Map<string, LayerLu>;
  /** L'opacité effective de chaque layer déjà demandée : le produit des opacités de la chaîne qui monte jusqu'à la racine. */
  readonly opacites: Map<string, number>;
  /** Par identifiant de layer : ses frères plus bas qui peuvent lui servir de fond, du plus proche au plus bas. */
  readonly freres: Map<string, readonly FrereDeFond[]>;
  visibles?: readonly LayerLu[];
  /** Le rang de chaque layer parmi ses frères, et les frères qui peuvent faire fond, par parent. */
  ordre?: { readonly rang: ReadonlyMap<string, number>; readonly candidats: ReadonlyMap<string, readonly { frere: LayerLu; rang: number }[]> };
  fonds?: FondsMemorises;
}

/** Un frère plus bas dans l'ordre d'empilement qui recouvre la boîte du layer, en entier ou en partie. */
interface FrereDeFond { readonly frere: LayerLu; readonly recouvre: 'tout' | 'partie' }

/** Les fonds d'un variant pour un catalogue, avec la même règle de validité que l'index des variables. */
interface FondsMemorises {
  readonly catalogue: CatalogueDeReference;
  readonly variables: readonly VariableDuCatalogue[];
  readonly nombreDeVariables: number;
  readonly collections: readonly CollectionDuCatalogue[];
  readonly nombreDeCollections: number;
  /** Par identifiant du premier ancêtre : les collections que les liaisons de remplissage de sa chaîne peuvent atteindre. */
  readonly chaines: Map<string, CollectionDuCatalogue[]>;
  readonly fonds: Map<string, Rgba | LimiteDeFond>;
}

const memoiresDesVariants = new WeakMap<VariantLu, MemoireDuVariant>();
/** Au-delà, les fonds d'un variant sont vidés en entier. */
const PLAFOND_DE_FONDS = 50_000;

function memoireDuVariant(variant: VariantLu): MemoireDuVariant {
  const { layers } = variant;
  const connue = memoiresDesVariants.get(variant);
  if (connue && connue.layers === layers && connue.nombreDeLayers === layers.length) return connue;
  const neuve: MemoireDuVariant = {
    layers, nombreDeLayers: layers.length, parId: new Map(layers.map((l) => [l.id, l] as const)), opacites: new Map(), freres: new Map(),
  };
  memoiresDesVariants.set(variant, neuve);
  return neuve;
}

/** L'opacité qui s'applique à un layer : la sienne multipliée par celles de tous ses ancêtres (Q-F7-2). Un cycle de `parent` s'arrête au premier layer déjà vu. */
function opaciteEffective(variant: VariantLu, layer: LayerLu): number {
  const memoire = memoireDuVariant(variant);
  const connue = memoire.opacites.get(layer.id);
  if (connue !== undefined) return connue;
  let produit = 1;
  const vus = new Set<string>();
  let courant: LayerLu | undefined = layer;
  while (courant && !vus.has(courant.id)) {
    vus.add(courant.id);
    produit *= courant.opacite;
    courant = courant.parent ? memoire.parId.get(courant.parent) : undefined;
  }
  memoire.opacites.set(layer.id, produit);
  return produit;
}

const TYPES_DE_FOND = new Set(['RECTANGLE', 'FRAME', 'ELLIPSE', 'COMPONENT', 'INSTANCE']);
/** Les boîtes du relevé sont absolues et en pixels ; cette tolérance absorbe l'arrondi des flottants. */
const TOLERANCE_DE_BOITE = 0.01;

const boiteLue = (d: LayerLu['dimensions'] | undefined): d is LayerLu['dimensions'] =>
  d !== undefined && [d.x, d.y, d.largeur, d.hauteur].every(Number.isFinite) && d.largeur > 0 && d.hauteur > 0;

/**
 * Les frères d'un layer, plus bas que lui dans l'ordre d'empilement (l'ordre du tableau `layers` est celui de Figma, du bas vers le
 * haut), qui montrent un remplissage visible sous sa boîte, du plus proche au plus bas. Seuls les rectangles, cadres, ellipses et
 * instances comptent comme fond. Une boîte que le relevé n'a pas lue (sans position) ne donne aucun frère (Q-F7-4).
 */
function freresDeFond(variant: VariantLu, layer: LayerLu): readonly FrereDeFond[] {
  const memoire = memoireDuVariant(variant);
  const connus = memoire.freres.get(layer.id);
  if (connus) return connus;
  if (!memoire.ordre) {
    const rang = new Map<string, number>();
    const candidats = new Map<string, { frere: LayerLu; rang: number }[]>();
    const compteurs = new Map<string, number>();
    for (const l of variant.layers) {
      const parent = l.parent ?? '';
      const n = compteurs.get(parent) ?? 0;
      compteurs.set(parent, n + 1);
      rang.set(l.id, n);
      if (!TYPES_DE_FOND.has(l.type) || !l.visible || !aUnePeintureVisible(l, 'fills') || opaciteEffective(variant, l) === 0 || !boiteLue(l.dimensions)) continue;
      const liste = candidats.get(parent);
      if (liste) liste.push({ frere: l, rang: n });
      else candidats.set(parent, [{ frere: l, rang: n }]);
    }
    memoire.ordre = { rang, candidats };
  }
  const trouves: FrereDeFond[] = [];
  const boite = layer.dimensions;
  const candidats = memoire.ordre.candidats.get(layer.parent ?? '') ?? [];
  const mien = memoire.ordre.rang.get(layer.id) ?? 0;
  if (boiteLue(boite)) {
    for (let i = candidats.length - 1; i >= 0; i--) {
      if (candidats[i].rang >= mien) continue;
      const frere = candidats[i].frere;
      const autre = frere.dimensions;
      const largeur = Math.min(autre.x + autre.largeur, boite.x + boite.largeur) - Math.max(autre.x, boite.x);
      const hauteur = Math.min(autre.y + autre.hauteur, boite.y + boite.hauteur) - Math.max(autre.y, boite.y);
      if (largeur <= TOLERANCE_DE_BOITE || hauteur <= TOLERANCE_DE_BOITE) continue;
      const tout = largeur >= boite.largeur - TOLERANCE_DE_BOITE && hauteur >= boite.hauteur - TOLERANCE_DE_BOITE;
      trouves.push({ frere, recouvre: tout ? 'tout' : 'partie' });
    }
  }
  memoire.freres.set(layer.id, trouves);
  return trouves;
}

function fondsDuVariant(memoire: MemoireDuVariant, catalogue: CatalogueDeReference): FondsMemorises {
  const { variables, collections } = catalogue;
  const connus = memoire.fonds;
  if (connus && connus.catalogue === catalogue && connus.variables === variables && connus.nombreDeVariables === variables.length
    && connus.collections === collections && connus.nombreDeCollections === collections.length) return connus;
  const neufs: FondsMemorises = {
    catalogue, variables, nombreDeVariables: variables.length, collections, nombreDeCollections: collections.length,
    chaines: new Map(), fonds: new Map(),
  };
  memoire.fonds = neufs;
  return neufs;
}

/** Les collections des variables liées aux remplissages de tous les ancêtres de départ, dans l'ordre de la chaîne. */
function collectionsDeLaChaine(
  parId: ReadonlyMap<string, LayerLu>, depart: string, catalogue: CatalogueDeReference,
): CollectionDuCatalogue[] {
  const memoireDesModes = memoireDesCouleurs(catalogue);
  const collections = new Map<string, CollectionDuCatalogue>();
  const vus = new Set<string>();
  let courant = depart ? parId.get(depart) : undefined;
  while (courant && !vus.has(courant.id)) {
    vus.add(courant.id);
    for (const liaison of liaisonsPropres(courant)) {
      if (liaison.champ !== 'fills') continue;
      for (const collection of clotureDeLaVariable(catalogue, memoireDesModes, liaison.variable.cle)) collections.set(collection.cle, collection);
    }
    courant = courant.parent ? parId.get(courant.parent) : undefined;
  }
  return [...collections.values()];
}

/**
 * Le fond d'un layer : les remplissages de ses frères plus bas qui recouvrent sa boîte, puis ceux de ses ancêtres, composés jusqu'à
 * la première couche opaque. Sans frère de fond, il ne dépend que de la chaîne des ancêtres, donc du premier d'entre eux, et du mode
 * choisi pour chaque collection que leurs liaisons peuvent atteindre : les layers de même parent, dans toute combinaison qui s'accorde
 * sur ces modes, partagent le résultat, rendu gelé. Avec un frère de fond, le résultat se calcule à chaque appel. Opacités, peintures
 * et visibilités sont celles du tableau `layers` du variant.
 */
export function fondEffectif(
  variant: VariantLu, layer: LayerLu, catalogue: CatalogueDeReference, combinaison: Combinaison,
): Rgba | LimiteDeFond {
  const memoire = memoireDuVariant(variant);
  const freres = freresDeFond(variant, layer);
  if (freres.length > 0) return Object.freeze(calculerLeFond(variant, layer, freres, catalogue, combinaison));
  const fonds = fondsDuVariant(memoire, catalogue);
  const depart = layer.parent || '';
  let collections = fonds.chaines.get(depart);
  if (!collections) {
    collections = collectionsDeLaChaine(memoire.parId, depart, catalogue);
    fonds.chaines.set(depart, collections);
  }
  const signature = [depart, ...collections.map((collection) => modeDeLaCollection(variant, combinaison, collection) ?? SANS_MODE)].join(SEPARATEUR);
  const connu = fonds.fonds.get(signature);
  if (connu !== undefined) return connu;
  const fond = Object.freeze(calculerLeFond(variant, layer, freres, catalogue, combinaison));
  if (fonds.fonds.size >= PLAFOND_DE_FONDS) fonds.fonds.clear();
  fonds.fonds.set(signature, fond);
  return fond;
}

function calculerLeFond(
  variant: VariantLu, layer: LayerLu, freres: readonly FrereDeFond[], catalogue: CatalogueDeReference, combinaison: Combinaison,
): Rgba | LimiteDeFond {
  const pile = couchesDuFond(variant, layer, freres, catalogue, combinaison);
  if ('limite' in pile) return pile;
  return composer(pile.couches, null) ?? { limite: 'fond-indetermine' };
}

/**
 * Les couches sous un layer, de la plus haute à la première opaque comprise : ses frères de fond, du plus proche au plus bas, puis
 * ses ancêtres. Un frère qui ne recouvre la boîte qu'en partie laisse le fond indéterminé, et la page du thème ne le remplace pas.
 */
function couchesDuFond(
  variant: VariantLu, layer: LayerLu, freres: readonly FrereDeFond[], catalogue: CatalogueDeReference, combinaison: Combinaison,
): { couches: Rgba[] } | LimiteDeFond {
  const couches: Rgba[] = [];
  for (const { frere, recouvre } of freres) {
    if (recouvre === 'partie') return { limite: 'fond-indetermine', sansRepli: true };
    const pile = pileDePeintures(frere.peintures.filter((p) => p.champ === 'fills'), liaisonsPropres(frere), opaciteEffective(variant, frere), catalogue, variant, combinaison);
    if ('limite' in pile) return pile;
    couches.push(...pile.couches);
    if (pile.couches.some((c) => c.a >= OPAQUE)) return { couches };
  }
  const ancetres = couchesDesAncetres(variant, memoireDuVariant(variant).parId, layer.parent || '', catalogue, combinaison);
  if ('limite' in ancetres) return ancetres;
  return { couches: [...couches, ...ancetres.couches] };
}

/** Les couches des ancêtres, de la plus haute à la première opaque comprise. */
function couchesDesAncetres(
  variant: VariantLu, parId: ReadonlyMap<string, LayerLu>, depart: string, catalogue: CatalogueDeReference, combinaison: Combinaison,
): Pile {
  const couches: Rgba[] = [];
  let courant = depart ? parId.get(depart) : undefined;
  const vus = new Set<string>();
  while (courant && !vus.has(courant.id)) {
    vus.add(courant.id);
    if (courant.visible) {
      const fills = courant.peintures.filter((p) => p.champ === 'fills');
      const pile = pileDePeintures(fills, liaisonsPropres(courant), opaciteEffective(variant, courant), catalogue, variant, combinaison);
      if ('limite' in pile) return pile;
      couches.push(...pile.couches);
      if (pile.couches.some((c) => c.a >= OPAQUE)) break;
    }
    courant = courant.parent ? parId.get(courant.parent) : undefined;
  }
  return { couches };
}

type NomDeFond = 'page' | 'carte' | 'page-figma';
/** Un fond de mesure : `nom` est absent quand le fond vient des fills du variant. */
type FondDeMesure = { nom?: NomDeFond; couleur: Rgba };

const enOpaque = (c: CouleurResolue): Rgba => ({ r: c.r, g: c.g, b: c.b, a: 1 });

/** Un fond de page ou d'élévation d'alpha inférieur à 1 n'est pas un fond : il laisse voir ce qu'il y a dessous (Q-F7-1). */
function causeDuFondDeRepli(fonds: readonly CouleurResolue[]): Cause | null {
  if (!fonds.every(couleurDansLeGamut)) return 'couleur-hors-gamut';
  return fonds.some((fond) => (fond.a ?? 1) < OPAQUE) ? 'fond-indetermine' : null;
}

/**
 * Les fonds que le thème ou la page Figma offrent à un layer sans fond opaque, `null` quand le catalogue n'en donne aucun, ou la
 * limite quand celui qui s'applique n'est pas lisible comme fond. Les fonds d'élévation du mode priment, même translucides : la page
 * Figma ne les remplace pas.
 */
function fondsDeRepli(catalogue: CatalogueDeReference, variant: VariantLu, combinaison: Combinaison): FondDeMesure[] | { limite: Cause } | null {
  const theme = catalogue.collections.find((c) => c.role === 'theme' && c.etat === 'lue');
  const mode = theme ? modeDeLaCollection(variant, combinaison, theme) : undefined;
  const elevation = mode !== undefined ? catalogue.fondsDElevation?.[mode] : undefined;
  if (elevation) {
    const cause = causeDuFondDeRepli([elevation.page, elevation.carte]);
    if (cause) return { limite: cause };
    return [{ nom: 'page', couleur: enOpaque(elevation.page) }, { nom: 'carte', couleur: enOpaque(elevation.carte) }];
  }
  if (catalogue.fondDeLaPageFigma) {
    const cause = causeDuFondDeRepli([catalogue.fondDeLaPageFigma]);
    if (cause) return { limite: cause };
    return [{ nom: 'page-figma', couleur: enOpaque(catalogue.fondDeLaPageFigma) }];
  }
  return null;
}

/**
 * Les fonds sur lesquels mesurer un layer : celui des fills du variant s'il est opaque, sinon la page et la carte du thème dans le
 * mode de la combinaison, sinon la page Figma. Les couches translucides des ancêtres se composent sur chacun.
 */
function fondsDeMesure(
  variant: VariantLu, layer: LayerLu, catalogue: CatalogueDeReference, combinaison: Combinaison,
): { fonds: FondDeMesure[] } | { limite: Cause } {
  const fond = fondEffectif(variant, layer, catalogue, combinaison);
  if (!('limite' in fond)) return { fonds: [{ couleur: fond }] };
  if (fond.limite !== 'fond-indetermine' || fond.sansRepli) return { limite: fond.limite };
  const bases = fondsDeRepli(catalogue, variant, combinaison);
  if (!bases) return { limite: fond.limite };
  if ('limite' in bases) return bases;
  const pile = couchesDuFond(variant, layer, freresDeFond(variant, layer), catalogue, combinaison);
  const couches = 'couches' in pile ? pile.couches : [];
  return { fonds: bases.map((base) => ({ nom: base.nom, couleur: composer(couches, base.couleur) ?? base.couleur })) };
}

/** La variable du thème que l'alias du premier plan atteint, dans le mode de la combinaison. */
function variableDuThemeAtteinte(
  catalogue: CatalogueDeReference, variant: VariantLu, combinaison: Combinaison, cle: string,
): string | null {
  for (let profondeur = 0; profondeur <= 10; profondeur++) {
    const variable = variableDuCatalogue(catalogue, cle);
    if (variable === 'absente') return null;
    const collection = collectionDuCatalogue(catalogue, variable.collection);
    if (collection !== 'absente' && collection.role === 'theme') return variableDuThemeReconnue(variable.nom) ?? null;
    if (collection === 'absente') return null;
    const mode = modeDeLaCollection(variant, combinaison, collection);
    const valeur = mode !== undefined ? variable.valeurs?.[mode] : undefined;
    if (!valeur || !('alias' in valeur)) return null;
    cle = valeur.alias;
  }
  return null;
}

/**
 * Garanti seulement quand la garantie de la variable du thème vise le même type de seuil (texte ou non-texte), le niveau demandé
 * et ce fond. Les garanties du thème se jugent au niveau AA : un texte demandé en AAA n'est pas couvert. La page Figma n'est jamais
 * garantie (Q-F7-7).
 */
function estGaranti(variableDuTheme: string | null, fond: NomDeFond, usage: Cible['usage'], niveau: NiveauWcag): boolean {
  if (!variableDuTheme || fond === 'page-figma') return false;
  const texte = usage === 'texte' || usage === 'grand-texte';
  if (texte && niveau !== 'AA') return false;
  return GARANTIES.some((g) => g.premier.variable === variableDuTheme
    && g.seuil === (texte ? 'texte' : 'nonTexte')
    && g.fonds.some((f) => (fond === 'page' ? 'fondDeLaPage' in f : 'fondDeLaCarte' in f)));
}

/* ---------- C49 et C50 ---------- */

/** Le rôle de chaque token que le layer lie lui-même (une surcharge d'instance n'est pas le layer) ; c'est la seconde moitié de la définition d'un anneau (Q-F7-9). */
function rolesLiesDuLayer(layer: LayerLu, catalogue: CatalogueDeReference): string[] {
  const roles: string[] = [];
  for (const liaison of liaisonsPropres(layer)) {
    const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
    if (variable === 'absente') continue;
    const role = termeReconnu(REGISTRE_ROLES, variable.nom.split('/').at(-1) ?? '')?.id;
    if (role) roles.push(role);
  }
  return roles;
}

/**
 * Cède par layer visible et par plage de texte ; la liste rendue est celle de la voie synchrone. Un layer d'opacité effective nulle
 * et une plage vide n'ont rien à mesurer.
 */
function* ciblesDeContraste(variant: VariantLu, niveau: NiveauWcag, catalogue: CatalogueDeReference): Generator<void, Cible[]> {
  const cibles: Cible[] = [];
  for (const layer of layersVisibles(variant)) {
    yield;
    if (opaciteEffective(variant, layer) === 0) continue;
    if (layer.type === 'TEXT') {
      for (const plage of layer.texte?.plages ?? []) {
        yield;
        if (plage.fin <= plage.debut) continue;
        const grand = estGrandTexte(plage.fontSize, plage.fontWeight);
        cibles.push({
          layer, code: 'C49', usage: grand ? 'grand-texte' : 'texte', champ: 'fills',
          peintures: plage.peintures, liaisons: plage.liaisons,
          seuil: grand ? SEUILS_D_ACCESSIBILITE.grandTexte[niveau] : SEUILS_D_ACCESSIBILITE.texte[niveau],
        });
      }
      continue;
    }
    const anneau = estUnAnneau(layer, rolesLiesDuLayer(layer, catalogue));
    if (estUneIcone(layer) && !anneau && aUnePeintureVisible(layer, 'fills')) {
      cibles.push({
        layer, code: 'C49', usage: 'icone', champ: 'fills', peintures: layer.peintures.filter((p) => p.champ === 'fills'),
        liaisons: liaisonsPropres(layer), seuil: SEUILS_D_ACCESSIBILITE.nonTexte,
      });
    }
    if (aUnePeintureVisible(layer, 'strokes') && (layer.strokeWeight ?? 0) > 0) {
      cibles.push({
        layer, code: 'C50', usage: anneau ? 'anneau' : 'stroke', champ: 'strokes',
        peintures: layer.peintures.filter((p) => p.champ === 'strokes'), liaisons: liaisonsPropres(layer), seuil: SEUILS_D_ACCESSIBILITE.nonTexte,
      });
    }
  }
  return cibles;
}

type GroupeMesure = { constat: Constat; pire: number };

/** Les combinaisons qui ne diffèrent que par le mode du thème n'en font qu'une, la première, étiquetée sans le thème. */
function sansLeTheme(combinaisons: Combinaison[]): Combinaison[] {
  const vues = new Set<string>();
  const gardees: Combinaison[] = [];
  for (const combinaison of combinaisons) {
    const { etiquette, cle } = combinaison.sansTheme!;
    if (vues.has(cle)) continue;
    vues.add(cle);
    gardees.push({ modes: combinaison.modes, etiquette });
  }
  return gardees;
}

function* mesurerLeVariant(
  variant: VariantLu, cibles: readonly Cible[], toutes: Combinaison[], catalogue: CatalogueDeReference, niveau: NiveauWcag,
  groupes: Map<string, GroupeMesure>, limites: Map<string, Constat>,
): Generator<void, void> {
  for (const cible of cibles) {
    yield;
    // Les modes du thème n'entrent dans la mesure d'une cible que si le repli la mesure ; sinon ils ne changent rien à ce qu'elle lit.
    const combinaisons = !toutes[0]?.sansTheme || leRepliSertA(variant, cible, catalogue) ? toutes : sansLeTheme(toutes);
    type Mesure = { pire: { rapport: number; etiquette: string; premierPlan: string; fond: string; combinaison: Combinaison } | null; echecs: number; rapports: [string, number][] };
    const mesures = new Map<NomDeFond | '', Mesure>();
    const causes = new Set<Cause>();
    let enRepli = false;
    for (const combinaison of combinaisons) {
      yield;
      const choisis = fondsDeMesure(variant, cible.layer, catalogue, combinaison);
      if ('limite' in choisis) { causes.add(choisis.limite); continue; }
      const pile = pileDePeintures(cible.peintures, cible.liaisons, opaciteEffective(variant, cible.layer), catalogue, variant, combinaison);
      if ('limite' in pile) { causes.add(pile.limite); continue; }
      if (pile.couches.length === 0) continue;
      for (const fond of choisis.fonds) {
        const premier = composer(pile.couches, fond.couleur);
        if (!premier) continue;
        if (fond.nom === 'page-figma') enRepli = true;
        const rapport = contraste(versRgb8(premier), versRgb8(fond.couleur));
        const mesure = mesures.get(fond.nom ?? '') ?? { pire: null, echecs: 0, rapports: [] };
        mesures.set(fond.nom ?? '', mesure);
        mesure.rapports.push([combinaison.etiquette, contrasteTronque(rapport)]);
        if (atteintLeSeuil(rapport, cible.seuil)) continue;
        mesure.echecs++;
        if (!mesure.pire || rapport < mesure.pire.rapport) {
          mesure.pire = { rapport, etiquette: combinaison.etiquette, premierPlan: hexaDeFigma(premier), fond: hexaDeFigma(fond.couleur), combinaison };
        }
      }
    }
    if (enRepli) {
      const existant = limites.get('fond-de-repli');
      if (existant) {
        if (!existant.variants.includes(variant.nom)) existant.variants.push(variant.nom);
        if (!existant.layers.includes(cible.layer.id)) existant.layers.push(cible.layer.id);
      } else {
        limites.set('fond-de-repli', {
          id: 'fond-de-repli', code: cible.code, type: 'info', famille: 'contraste', variants: [variant.nom], layers: [cible.layer.id],
          faits: { cause: 'fond-de-repli', fond: hexaDeFigma(enOpaque(catalogue.fondDeLaPageFigma!)) }, limite: true,
        });
      }
    }
    // L'identifiant ne porte ni la plage de texte ni le niveau : un constat ignoré le reste quand le texte ou le niveau change (Q-F7-12).
    const base = `${cible.code}:${cible.layer.nom}:${cible.usage}`;
    for (const cause of causes) {
      const cle = `${base}:limite:${cause}`;
      const existant = limites.get(cle);
      if (existant) {
        if (!existant.variants.includes(variant.nom)) existant.variants.push(variant.nom);
        if (!existant.layers.includes(cible.layer.id)) existant.layers.push(cible.layer.id);
      } else {
        limites.set(cle, {
          id: cle, code: cible.code, type: 'info', famille: 'contraste', variants: [variant.nom], layers: [cible.layer.id],
          faits: { cause, champ: cible.champ, usage: cible.usage, calque: cible.layer.nom }, limite: true,
        });
      }
    }
    for (const [nom, { pire, echecs, rapports }] of mesures) {
      if (!pire) continue;
      const cle = `${base}${nom ? `:${nom}` : ''}`;
      const existant = groupes.get(cle);
      const sur = nom ? surUnFondNomme(cible, nom, niveau, catalogue, variant, pire.combinaison) : null;
      if (existant) {
        if (!existant.constat.variants.includes(variant.nom)) existant.constat.variants.push(variant.nom);
        if (!existant.constat.layers.includes(cible.layer.id)) existant.constat.layers.push(cible.layer.id);
        if (pire.rapport >= existant.pire) continue;
        existant.pire = pire.rapport;
        existant.constat.faits = faitsDeContraste(cible, niveau, pire, echecs, rapports, sur?.faits);
        existant.constat.type = sur?.type ?? 'corriger';
        continue;
      }
      groupes.set(cle, {
        pire: pire.rapport,
        constat: {
          id: cle, code: cible.code, type: sur?.type ?? 'corriger', famille: 'contraste', variants: [variant.nom], layers: [cible.layer.id],
          faits: faitsDeContraste(cible, niveau, pire, echecs, rapports, sur?.faits),
        },
      });
    }
  }
}

/** Sévérité et faits d'un échec sur la page, la carte ou la page Figma : le garanti se corrige, le reste se vérifie. */
function surUnFondNomme(
  cible: Cible, fond: NomDeFond, niveau: NiveauWcag, catalogue: CatalogueDeReference, variant: VariantLu, combinaison: Combinaison,
): { type: 'corriger' | 'verifier'; faits: Record<string, string> } {
  let variableDuTheme: string | null = null;
  for (const liaison of cible.liaisons) {
    if (liaison.champ !== cible.champ) continue;
    variableDuTheme = variableDuThemeAtteinte(catalogue, variant, combinaison, liaison.variable.cle);
    if (variableDuTheme) break;
  }
  const garanti = estGaranti(variableDuTheme, fond, cible.usage, niveau);
  return {
    type: garanti ? 'corriger' : 'verifier',
    faits: { fondNomme: fond, variableDuTheme: variableDuTheme ?? '', garanti: garanti ? 'oui' : 'non' },
  };
}

function faitsDeContraste(
  cible: Cible, niveau: NiveauWcag, pire: { rapport: number; etiquette: string; premierPlan: string; fond: string },
  echecs: number, rapports: [string, number][], sur: Record<string, string> = {},
): Constat['faits'] {
  return {
    ...sur,
    usage: cible.usage, champ: cible.champ, calque: cible.layer.nom, rapport: contrasteTronque(pire.rapport),
    seuil: cible.seuil, niveau, mode: pire.etiquette, autresModes: echecs - 1,
    premierPlan: pire.premierPlan, fond: pire.fond, rapports: JSON.stringify(rapports),
  };
}

/* ---------- C50 (anneau absent) et C51 ---------- */

function estEnFocus(variant: VariantLu): boolean {
  return etatDuVariant(variant)?.startsWith('focus') ?? false;
}

function* anneauxDuVariant(variant: VariantLu, catalogue: CatalogueDeReference): Generator<void, LayerLu[]> {
  const anneaux: LayerLu[] = [];
  for (const layer of layersVisibles(variant)) {
    yield;
    if (estUnAnneau(layer, rolesLiesDuLayer(layer, catalogue)) && layer.type !== 'TEXT' && opaciteEffective(variant, layer) !== 0
      && layer.peintures.some((p) => peintureVisible(p) && (layer.liaisons.some((l) => l.champ === p.champ && (l.indice ?? 0) === p.indice) || (p.couleur?.a ?? 1) !== 0))) anneaux.push(layer);
  }
  return anneaux;
}

function* controlerLAnneau(variants: VariantLu[], catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const constats: Constat[] = [];
  const recommandation = RECOMMANDATIONS.find((r) => r.id === 'anneau-de-focus');
  const epaisseur = Number(recommandation?.parametres.epaisseur ?? 2);
  const espace = Number(recommandation?.parametres.espace ?? 2);
  const sansAnneau: VariantLu[] = [];
  for (const variant of variants) {
    yield;
    if (estEnFocus(variant) && (yield* anneauxDuVariant(variant, catalogue)).length === 0) sansAnneau.push(variant);
  }
  if (sansAnneau.length > 0) {
    const racines: LayerLu[] = [];
    const noms: string[] = [];
    const identifiants: string[] = [];
    for (const variant of sansAnneau) {
      yield;
      noms.push(variant.nom);
      for (const layer of variant.layers) {
        yield;
        if (layer.parent !== null) continue;
        racines.push(layer);
        identifiants.push(layer.id);
      }
    }
    constats.push({
      id: 'C50:sans-anneau', code: 'C50', type: 'corriger', famille: 'contraste',
      variants: noms, layers: identifiants,
      faits: { anneauVisible: 0, variantsEnFocus: sansAnneau.length, ...(racines[0] ? { calque: racines[0].nom } : {}) },
    });
  }
  const fins = new Map<string, Constat>();
  for (const variant of variants) {
    yield;
    const anneaux = yield* anneauxDuVariant(variant, catalogue);
    for (const anneau of anneaux) {
      yield;
      if (anneau.strokeWeight === undefined || anneau.strokeWeight === epaisseur) continue;
      const id = `C51:${anneau.nom}:${anneau.strokeWeight}`;
      const existant = fins.get(id);
      if (existant) {
        if (!existant.variants.includes(variant.nom)) existant.variants.push(variant.nom);
        existant.layers.push(anneau.id);
        continue;
      }
      fins.set(id, {
        id, code: 'C51', type: 'verifier', famille: 'contraste', variants: [variant.nom], layers: [anneau.id],
        faits: { calque: anneau.nom, strokeWeight: anneau.strokeWeight, epaisseurRecommandee: epaisseur, espaceRecommande: espace },
      });
    }
  }
  constats.push(...fins.values());
  return constats;
}

/* ---------- C52 et texte sous 12 px ---------- */

function* controlerLesCibles(variants: VariantLu[], interactif: boolean, releve: ReleveDeComposant): Generator<void, Constat[]> {
  if (!interactif) return [];
  const groupes = new Map<string, Constat>();
  for (const variant of variants) {
    yield;
    let racine: LayerLu | undefined;
    for (const layer of variant.layers) {
      yield;
      if (layer.parent === null) { racine = layer; break; }
    }
    if (!racine || lectureManquee(releve, racine.id, 'dimensions')) continue;
    const { largeur, hauteur } = racine.dimensions;
    const minimum = Math.min(largeur, hauteur);
    const seuil = minimum < CIBLE_MINIMALE_PX ? CIBLE_MINIMALE_PX : minimum < CIBLE_TACTILE_PX ? CIBLE_TACTILE_PX : null;
    if (seuil === null) continue;
    const id = `C52:${largeur}x${hauteur}:${seuil}`;
    const existant = groupes.get(id);
    if (existant) { existant.variants.push(variant.nom); existant.layers.push(racine.id); continue; }
    groupes.set(id, {
      id, code: 'C52', type: seuil === CIBLE_MINIMALE_PX ? 'corriger' : 'verifier', famille: 'contraste',
      variants: [variant.nom], layers: [racine.id], faits: { largeur, hauteur, seuil },
    });
  }
  return [...groupes.values()];
}

function* controlerLeTexteMinimal(variants: VariantLu[]): Generator<void, Constat[]> {
  const groupes = new Map<string, Constat>();
  for (const variant of variants) {
    yield;
    for (const layer of layersVisibles(variant)) {
      yield;
      if (layer.type !== 'TEXT') continue;
      for (const plage of layer.texte?.plages ?? []) {
        yield;
        if (plage.fin <= plage.debut || plage.fontSize >= TEXTE_MINIMAL_PX) continue;
        const id = `C49:taille:${layer.nom}:${plage.fontSize}`;
        const existant = groupes.get(id);
        if (existant) {
          if (!existant.variants.includes(variant.nom)) existant.variants.push(variant.nom);
          existant.layers.push(layer.id);
          continue;
        }
        groupes.set(id, {
          id, code: 'C49', type: 'verifier', famille: 'contraste', variants: [variant.nom], layers: [layer.id],
          faits: { calque: layer.nom, fontSize: plage.fontSize, seuil: TEXTE_MINIMAL_PX },
        });
      }
    }
  }
  return [...groupes.values()];
}
