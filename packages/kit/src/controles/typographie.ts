/**
 * Typographie et icônes d'un composant (C64 à C67) sur le dessin Figma relevé.
 * Un style ou une liaison « attendu » est celui que tous les autres variants
 * portent pour un layer de même nom, et seulement s'ils sont au moins deux et
 * unanimes : sinon aucun constat de régularité, jamais une proposition par
 * ressemblance. Une variable que le catalogue ne permet pas de situer n'est
 * jamais jugée.
 */
import { CHAMPS_DE_TYPOGRAPHIE } from '../referentiel/architecture.js';
import { estUneIcone, estUneInstanceDIcone } from '../referentiel/layers.js';
import { formeReconnue } from '../referentiel/reconnaissance.js';
import type { CatalogueDeReference } from './catalogue.js';
import { collectionDuCatalogue, variableDuCatalogue } from './catalogue.js';
import type { Constat } from './constat.js';
import { axesDuReleveParEtapes, estLaFamilleCouleur, memeValeurDAxe, roleDuToken, tailleReconnue, tokensDuComposantParEtapes, tokenVautPourLeLayer, type ProprieteDAxe, type TokenDuComposant } from './nommage.js';
import type { LayerLu, LiaisonLue, ReleveDeComposant, VariantLu } from './releve.js';
import { layersVisiblesDuVariant, peintureVisible } from './releve.js';

/** Au moins deux autres variants, pour qu'un « autre » ne soit pas simplement l'unique voisin. */
const AUTRES_MINIMUM = 2;
/** Les rôles de token dont la couleur est celle d'une icône (C17 les admet pour son fond, ou son trait sans fill visible). */
const ROLES_DE_PREMIER_PLAN: readonly string[] = ['icon', 'foreground'];

type Source = { variant: VariantLu; layer: LayerLu };

export function controlerLaTypographie(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const calcul = controlerLaTypographieParEtapes(releve, catalogue);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

export function* controlerLaTypographieParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const variants = releve.variants;
  const constats: Constat[] = [];
  const textes = yield* sources(variants, (l) => l.type === 'TEXT');
  const icones = yield* sources(variants, estUneIcone);
  constats.push(...(yield* controlerLesTextes(textes, releve, catalogue)));
  constats.push(...(yield* controlerLesLiaisonsDeTexte(textes, catalogue)));
  constats.push(...(yield* controlerLesIcones(icones, releve, catalogue)));
  constats.push(...(yield* controlerLesReglesIcones(icones, releve)));
  return constats;
}

function* sources(variants: VariantLu[], garde: (l: LayerLu) => boolean): Generator<void, Map<string, Source[]>> {
  const parNom = new Map<string, Source[]>();
  for (const variant of variants) {
    for (const layer of layersVisiblesDuVariant(variant)) {
      yield;
      if (!garde(layer)) continue;
      const liste = parNom.get(layer.nom) ?? [];
      liste.push({ variant, layer });
      parNom.set(layer.nom, liste);
    }
  }
  return parNom;
}

/** Une même sorte de constat sur plusieurs variants devient un seul constat. */
function ajouter(groupes: Map<string, Constat>, id: string, source: Source, faits: Constat['faits'], base: Omit<Constat, 'id' | 'variants' | 'layers' | 'faits'>): void {
  const existant = groupes.get(id);
  if (existant) {
    // Les variants d'un même constat n'attendent pas tous le même token : le constat ne nomme alors aucun token attendu.
    if (existant.faits.attendu !== undefined && existant.faits.attendu !== faits.attendu) delete existant.faits.attendu;
    if (!existant.variants.includes(source.variant.nom)) existant.variants.push(source.variant.nom);
    existant.layers.push(source.layer.id);
    return;
  }
  groupes.set(id, { ...base, id, variants: [source.variant.nom], layers: [source.layer.id], faits });
}

/** Les liaisons d'un champ, sur le layer ou sur ses plages de texte. */
function liaisonsDuChamp(layer: LayerLu, champs: readonly string[]): LiaisonLue[] {
  const plages = (layer.texte?.plages ?? []).flatMap((p) => p.liaisons);
  return [...layer.liaisons, ...plages].filter((l) => champs.includes(l.champ));
}

type Lieu = { collection: string; role: string | null } | null;

/** Une liaison illisible est liée, sans lieu connu : aucun contrôle ne la juge. */
function lieuDeLaVariable(catalogue: CatalogueDeReference, liaison: LiaisonLue): Lieu {
  if (liaison.illisible) return null;
  const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
  const cleDeCollection = variable === 'absente' ? liaison.variable.collection : variable.collection;
  const collection = collectionDuCatalogue(catalogue, cleDeCollection);
  if (collection === 'absente') return null;
  return { collection: collection.nom, role: collection.role };
}

/** Valeurs d'un champ sur les sources d'un groupe, comptées une fois ; chaque source retire sa propre part à la lecture. */
export type Frequences<V> = { total: number; parValeur: Map<V, number> };

/** Cède toutes les 256 sources parcourues. */
export function* frequencesDuChamp<T, V>(sources: readonly T[], lire: (s: T) => V, retenue: (s: T) => boolean = () => true): Generator<void, Frequences<V>> {
  const parValeur = new Map<V, number>();
  let total = 0;
  let parcourues = 0;
  for (const source of sources) {
    parcourues += 1;
    if (parcourues % 256 === 0) yield;
    if (!retenue(source)) continue;
    const valeur = lire(source);
    parValeur.set(valeur, (parValeur.get(valeur) ?? 0) + 1);
    total += 1;
  }
  return { total, parValeur };
}

/**
 * Les autres sources portent toutes la même valeur : elle est rendue, sinon `undefined` (`null` reste une valeur).
 * `propre` est la valeur de la source jugée, qui doit figurer dans les fréquences.
 */
export function valeurUnanimeHorsContribution<V>(frequences: Frequences<V>, propre: V): V | undefined {
  if (frequences.total - 1 < AUTRES_MINIMUM) return undefined;
  const disparait = frequences.parValeur.get(propre) === 1;
  if (frequences.parValeur.size - (disparait ? 1 : 0) !== 1) return undefined;
  for (const [valeur, nombre] of frequences.parValeur) {
    if (valeur !== propre || nombre > 1) return valeur;
  }
  return undefined;
}

/** Toutes les sources comptées portent la même valeur, et elles sont au moins `AUTRES_MINIMUM`. */
function valeurUnanime<V>(frequences: Frequences<V>): V | undefined {
  if (frequences.total < AUTRES_MINIMUM || frequences.parValeur.size !== 1) return undefined;
  return frequences.parValeur.keys().next().value;
}

/* ---------- C64 ---------- */

const styleDuTexte = (s: Source): string | null => s.layer.texte?.style ?? null;

/**
 * Où un texte se compare : parmi les textes de même nom qui ont la même valeur de l'axe de taille (Q-F6-2, sans axe de taille, tous
 * ensemble), et au même rang parmi les layers de ce nom dans son variant (N-44). Deux layers homonymes d'un variant ne mêlent
 * donc pas leurs styles.
 */
function groupesDeComparaison(liste: readonly Source[], axeDeTaille: string | undefined): { cles: Map<Source, string>; groupes: Map<string, Source[]> } {
  const cles = new Map<Source, string>();
  const groupes = new Map<string, Source[]>();
  const rangs = new Map<string, number>();
  for (const source of liste) {
    const rang = rangs.get(source.variant.id) ?? 0;
    rangs.set(source.variant.id, rang + 1);
    const cle = `${axeDeTaille === undefined ? '' : source.variant.valeurs[axeDeTaille] ?? ''}|${rang}`;
    cles.set(source, cle);
    const groupe = groupes.get(cle) ?? [];
    groupe.push(source);
    groupes.set(cle, groupe);
  }
  return { cles, groupes };
}

function* controlerLesTextes(textes: Map<string, Source[]>, releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const groupes = new Map<string, Constat>();
  const base = { code: 'C64', type: 'verifier', famille: 'typographie' } as const;
  const information = { code: 'C64', type: 'info', famille: 'typographie' } as const;
  const axes = yield* axesDuReleveParEtapes(releve);
  // Un texte à styles mixtes ou sans style n'a pas de style à comparer : il ne pèse pas sur les fréquences. Le second reçoit son propre constat.
  const jugeable = (s: Source): boolean => s.layer.texte !== undefined && s.layer.texte.stylesMixtes !== true && styleDuTexte(s) !== null;
  for (const [nom, liste] of textes) {
    const comparaison = groupesDeComparaison(liste, axes.taille?.nom);
    const styles = new Map<string, Frequences<string | null>>();
    for (const [cle, groupe] of comparaison.groupes) styles.set(cle, yield* frequencesDuChamp(groupe, styleDuTexte, jugeable));
    for (const source of liste) {
      yield;
      const { layer } = source;
      if (layer.texte === undefined) continue;
      if (layer.texte.stylesMixtes === true) {
        ajouter(groupes, `C64:${nom}:styles-mixtes`, source, { calque: nom, motif: 'styles-mixtes' }, information);
        continue;
      }
      const typographie = liaisonsDuChamp(layer, CHAMPS_DE_TYPOGRAPHIE).some((l) => l.illisible || lieuDeLaVariable(catalogue, l)?.role === 'typography');
      const lu = layer.texte.style;
      if (lu === null && !typographie) {
        ajouter(groupes, `C64:${nom}:sans-style`, source, { calque: nom, motif: 'sans-style-ni-variables' }, base);
        continue;
      }
      const frequences = styles.get(comparaison.cles.get(source)!)!;
      // Un texte lié à des variables de typography, sans style, se compare à l'unanimité de ceux qui en ont un.
      const attendu = lu === null ? valeurUnanime(frequences) : valeurUnanimeHorsContribution(frequences, lu);
      if (attendu && lu !== attendu) {
        ajouter(groupes, `C64:${nom}:style:${attendu}:${lu ?? 'aucun'}`, source,
          { calque: nom, motif: 'style-different', styleAttendu: attendu, styleLu: lu ?? 'aucun' }, base);
      }
    }
  }
  return [...groupes.values()];
}

/* ---------- C65 ---------- */

const liaisonLee = (s: Source, champ: string): 'liee' | null => (liaisonsDuChamp(s.layer, [champ]).length > 0 ? 'liee' : null);

/** Les huit champs de `CHAMPS_DE_TYPOGRAPHIE` se jugent comme la taille et la graisse (Q-F6-7). */
function* controlerLesLiaisonsDeTexte(textes: Map<string, Source[]>, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const groupes = new Map<string, Constat>();
  const base = { code: 'C65', type: 'verifier', famille: 'typographie' } as const;
  for (const [nom, liste] of textes) {
    const liees = new Map<string, Frequences<'liee' | null>>();
    for (const champ of CHAMPS_DE_TYPOGRAPHIE) liees.set(champ, yield* frequencesDuChamp(liste, (s) => liaisonLee(s, champ)));
    for (const source of liste) {
      yield;
      for (const champ of CHAMPS_DE_TYPOGRAPHIE) {
        const liaisons = liaisonsDuChamp(source.layer, [champ]);
        for (const liaison of liaisons) {
          const lieu = lieuDeLaVariable(catalogue, liaison);
          if (lieu === null || lieu.role === null || lieu.role === 'typography') continue;
          ajouter(groupes, `C65:${nom}:${champ}:mauvaise-collection:${liaison.variable.nom}`, source,
            { calque: nom, champ, motif: 'mauvaise-collection', variable: liaison.variable.nom, collection: lieu.collection, collectionAttendue: 'typography' }, base);
        }
        if (liaisons.length > 0) continue;
        const parVariant = valeurUnanimeHorsContribution(liees.get(champ)!, liaisonLee(source, champ));
        if (parVariant === 'liee') {
          ajouter(groupes, `C65:${nom}:${champ}:sans-liaison`, source, { calque: nom, champ, motif: 'sans-liaison-comme-les-autres' }, base);
        }
      }
    }
  }
  return [...groupes.values()];
}

/* ---------- C66 ---------- */

/**
 * L'icône est une instance d'`Icon`, son remplissage suit un token de premier plan du composant, et sa propriété `Size` suit la taille
 * du variant (Q-F6-1, option A). Sa taille ne se lie plus à `layout` : l'instance la tient de `Size`.
 */
function* controlerLesIcones(icones: Map<string, Source[]>, releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const groupes = new Map<string, Constat>();
  const base = { code: 'C66', type: 'verifier', famille: 'typographie' } as const;
  if (icones.size === 0) return [];
  const axes = yield* axesDuReleveParEtapes(releve);
  const tokens = yield* tokensDuComposantParEtapes(releve, catalogue);
  const parCle = new Map(tokens.map((token) => [token.variable.cle, token]));
  const candidats = new Map<string, string>();
  /** Les tokens de premier plan qui valent pour ce layer de ce variant, par nom et séparés par une virgule. */
  const attenduPour = (source: Source): string => {
    const cle = `${source.variant.id}|${formeReconnue(source.layer.nom)}`;
    let noms = candidats.get(cle);
    if (noms === undefined) {
      noms = tokens
        .filter((token) => estUnTokenDePremierPlan(token) && tokenVautPourLeLayer(token, axes, source.variant, source.layer.nom))
        .map((token) => token.variable.nom).join(',');
      candidats.set(cle, noms);
    }
    return noms;
  };
  for (const [nom, liste] of icones) {
    for (const source of liste) {
      yield;
      const { layer } = source;
      if (!estUneInstanceDIcone(layer)) {
        const composant = layer.instanceDe?.nom;
        ajouter(groupes, `C66:${nom}:${composant === undefined ? 'pas-une-instance' : `autre-composant:${composant}`}`, source,
          { calque: nom, motif: composant === undefined ? 'pas-une-instance' : 'autre-composant', ...(composant === undefined ? {} : { composant }) }, base);
      }
      const taille = tailleEcriteParLInstance(layer, axes.taille);
      const duVariant = axes.taille ? source.variant.valeurs[axes.taille.nom] : undefined;
      if (taille !== undefined && duVariant !== undefined && !memeValeurDAxe('taille', taille, duVariant)) {
        ajouter(groupes, `C66:${nom}:taille:${taille}:${duVariant}`, source, { calque: nom, motif: 'taille-differente', valeur: taille, taille: duVariant }, base);
      }
      // Sans fill visible, le trait d'une icône à tracé tient lieu de couleur (Q-F6-5).
      const champ = tientLieuDeCouleur(layer) ? 'strokes' : 'fills';
      const couleurs = layer.liaisons.filter((l) => l.champ === champ);
      const attendu = attenduPour(source);
      if (couleurs.length === 0) {
        ajouter(groupes, `C66:${nom}:couleur-sans-variable`, source, { calque: nom, motif: 'couleur-sans-variable', ...(attendu ? { attendu } : {}) }, base);
      }
      for (const liaison of couleurs) {
        if (estUnPremierPlan(catalogue, parCle, liaison) !== false) continue;
        ajouter(groupes, `C66:${nom}:couleur:${liaison.variable.nom}`, source,
          { calque: nom, motif: 'couleur-hors-premier-plan', variable: liaison.variable.nom, ...(attendu ? { attendu } : {}) }, base);
      }
    }
  }
  return [...groupes.values()];
}

function estUnTokenDePremierPlan(token: TokenDuComposant): boolean {
  const { variable } = token;
  return variable.type === 'COLOR' && variable.etat === 'presente' && token.lecture.length > 0
    && estLaFamilleCouleur(token.segments[1] ?? '') && ROLES_DE_PREMIER_PLAN.includes(roleDuToken(token) ?? '');
}

/** Un layer sans fill visible dont un trait se voit : ce trait porte la couleur de l'icône. */
function tientLieuDeCouleur(layer: LayerLu): boolean {
  return !layer.peintures.some((p) => p.champ === 'fills' && peintureVisible(p)) && layer.peintures.some((p) => p.champ === 'strokes' && peintureVisible(p));
}

/** La valeur de `Size` que l'instance écrit, quand le lecteur l'a lue et qu'elle dit une taille : un terme du registre ou une valeur de l'axe de taille. */
function tailleEcriteParLInstance(layer: LayerLu, axeDeTaille: ProprieteDAxe | undefined): string | undefined {
  const valeurs = layer.instanceDe?.valeurs;
  if (!valeurs || !axeDeTaille) return undefined;
  const nom = Object.keys(valeurs).find((propriete) => formeReconnue(propriete) === 'size');
  const valeur = nom === undefined ? undefined : valeurs[nom];
  if (valeur === undefined) return undefined;
  const dit = tailleReconnue(valeur) !== undefined || (axeDeTaille.valeurs ?? []).some((autre) => memeValeurDAxe('taille', valeur, autre));
  return dit ? valeur : undefined;
}

/**
 * Vrai si la liaison vise un token de premier plan du composant. `null` quand la variable ne se situe pas : un fichier sans rôle de
 * collection ou une variable absente du catalogue n'est jamais jugé.
 */
function estUnPremierPlan(catalogue: CatalogueDeReference, tokens: ReadonlyMap<string, TokenDuComposant>, liaison: LiaisonLue): boolean | null {
  const lieu = lieuDeLaVariable(catalogue, liaison);
  if (lieu === null || lieu.role === null) return null;
  const token = tokens.get(liaison.variable.cle);
  return token !== undefined && estUnTokenDePremierPlan(token);
}

/* ---------- C67 ---------- */

/** Le relevé ne porte pas les règles `@icons` : il ne juge que la propriété qui pilote l'icône, et dit sa limite pour le reste. */
function* controlerLesReglesIcones(icones: Map<string, Source[]>, releve: ReleveDeComposant): Generator<void, Constat[]> {
  const groupes = new Map<string, Constat>();
  const declarees = new Set(releve.proprietes.filter((p) => p.type === 'INSTANCE_SWAP').map((p) => p.nom));
  for (const [nom, liste] of icones) {
    for (const source of liste) {
      yield;
      const propriete = source.layer.instanceDe?.pilotee ?? null;
      if (propriete !== null && !declarees.has(propriete)) {
        ajouter(groupes, `C67:${nom}:propriete-absente`, source,
          { calque: nom, motif: 'propriete-absente', propriete }, { code: 'C67', type: 'corriger', famille: 'regles' });
        continue;
      }
      const faits: Constat['faits'] = propriete === null
        ? { calque: nom, cause: 'icone-non-pilotee' }
        : { calque: nom, cause: 'icones-permises-non-lues', propriete };
      ajouter(groupes, `C67:${nom}:limite:${String(faits.cause)}`, source, faits,
        { code: 'C67', type: 'info', famille: 'regles', limite: true });
    }
  }
  return [...groupes.values()];
}
