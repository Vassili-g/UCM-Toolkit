/**
 * Le cadre des cas de stress test de variants (famille F5). Il porte le type d'un cas, la dégradation réversible d'une copie du
 * composant de base, la clé qui rattache un constat émis à un constat attendu, et le modèle de référence dont les opérateurs
 * tirent leurs oracles.
 *
 * Un opérateur copie la base, la dégrade, et rend un `CasDeVariants`. Ses `attendus` viennent du modèle, qui applique les règles
 * de l'inventaire 4.1 et 4.4 au relevé et au catalogue dégradés, en lisant les noms de tokens par position (le jeu, la famille,
 * un segment par rôle d'axe, le rôle de couleur ou la propriété de taille) et les équivalences par les registres du kit. Le modèle
 * n'appelle aucun contrôle et ne lit ni `lecture` ni `grammaire.ts`. Un opérateur dont la règle dépend d'une question du mainteneur
 * ajuste ou remplace ce que le modèle rend, par la proposition de la section 9.
 *
 * Un cas ne garde que des fermetures : `materialiser()` copie la base, applique la dégradation et rend la copie avec son
 * `annuler()`. Tenir 270 copies de P0 en mémoire coûterait plus que la mesure.
 */
import type { AxeDuComposant } from '../../../src/controles/nommage.js';
import type { Constat, LayerLu, LiaisonLue, ReleveDeComposant, VariableDuCatalogue, VariantLu } from '../../../src/controles/index.js';
import { REGISTRE_PALETTES_COMPOSANT } from '../../../src/referentiel/architecture.js';
import { formeReconnue, termeReconnu } from '../../../src/referentiel/reconnaissance.js';
import { termePourCategorie, type Registre } from '../../../src/referentiel/termes.js';
import { ecritureDuVariant } from '../../../src/referentiel/ecriture-des-mots.js';
import { REGISTRE_ETATS, REGISTRE_TAILLES } from '../../../src/referentiel/vocabulaire.js';
import { CODES_DE_LA_PORTEE } from './composantDeBase.js';
import type { CasDeStress, ConstatAttendu } from '../commun/types.js';
import type { ComposantDeBase } from './portF3.js';

export const BORNE_DE_COMBINAISONS = 4096;

/** Un couple (axe, valeur) qu'une dégradation touche, pour qu'une combinaison n'associe que des atomes de zones disjointes. */
export interface ZoneTouchee {
  readonly axe: string;
  readonly valeur: string;
}

/** Ce qu'un cas qui contrôle un composant rend à `mesurer.ts` : la copie dégradée, la base, et le moyen de revenir à la base. */
export interface Materialise {
  readonly composant: ComposantDeBase;
  readonly base: ComposantDeBase;
  /** Défait la dégradation sur `composant`, en sens inverse. */
  readonly annuler: () => void;
}

/** A1 et A2 : le rôle que `axeDePropriete` rend pour un nom, sans composant. */
export interface LectureDAxe {
  readonly nom: string;
  readonly attendu: AxeDuComposant | undefined;
}

export interface EntreeDeVariants {
  readonly description: string;
  readonly zones: readonly ZoneTouchee[];
  readonly lecture?: LectureDAxe;
  readonly materialiser?: () => Materialise;
  /** Une durée au-delà de laquelle le harnais abandonne le contrôle et le note. */
  readonly budgetMs?: number;
}

export interface CasDeVariants extends CasDeStress<EntreeDeVariants> {
  /** L'hypothèse de la section 6.1 du plan que ce cas met à l'épreuve (`H1` à `H11`). */
  readonly hypothese?: string;
  /** L'écart de l'inventaire auquel le cas se rattache (`E-27`, `E-33`, `E-44`). */
  readonly ecartConnu?: string;
}

export const HYPOTHESES: Readonly<Record<string, string>> = {
  H1: 'hypothèse 1 (Kind, Type, Tone, Emphasis, Hierarchy, Density, Shape ne sont pas des axes)',
  H2: 'hypothèse 2 (un axe Variant à valeurs de palette rend les tokens illisibles)',
  H3: 'hypothèse 3 (Status est toujours l\'axe d\'états)',
  H4: 'hypothèse 4 (un second axe du même rôle est ignoré)',
  H5: 'hypothèse 5 (les candidats de C12 et C13 comprennent les valeurs déjà présentes)',
  H6: 'hypothèse 6 (C9 est asymétrique selon le registre)',
  H7: 'hypothèse 7 (une forme tolérée de palette ne donne ni C8 ni C10)',
  H8: 'hypothèse 8 (C31 se tait au-delà de 4 096 combinaisons)',
  H9: 'hypothèse 9 (une matrice creuse à axes booléens dépasse la borne)',
  H10: 'hypothèse 10 (des valeurs dupliquées donnent des identifiants C31 dupliqués)',
  H11: 'hypothèse 11 (un token au nom illisible est sauté par C32 et C33)',
  H12: 'hypothèse 12 (une valeur à point ou à barre rend les tokens illisibles)',
};

// ---------------------------------------------------------------------------------------------------------------------------
// Dégradation réversible

export const ORDRE_DES_ROLES: readonly AxeDuComposant[] = ['palette', 'style', 'taille', 'etat'];

/** Les rôles d'axe des propriétés de la base, tels que ses tokens les écrivent : `null` pour un axe dont aucun segment n'est écrit. */
export function rolesDeLaBase(base: ComposantDeBase): Record<string, AxeDuComposant | null> {
  return Object.fromEntries(base.carte.axes.map((axe) => [axe.propriete, axe.segment]));
}

export class Degradation {
  readonly composant: ComposantDeBase;
  private readonly journal: (() => void)[] = [];
  private creees = 0;

  constructor(readonly base: ComposantDeBase) {
    this.composant = { ...base, releve: structuredClone(base.releve), catalogue: structuredClone(base.catalogue) };
  }

  get releve(): ReleveDeComposant { return this.composant.releve; }
  get catalogue() { return this.composant.catalogue; }
  /** La carte de la base : elle dit ce qui est juste, jamais ce que la dégradation écrit. */
  get carte() { return this.base.carte; }

  fixer<T extends object, K extends keyof T>(objet: T, cle: K, valeur: T[K]): void {
    const existait = Object.prototype.hasOwnProperty.call(objet, cle);
    const ancien = objet[cle];
    objet[cle] = valeur;
    this.journal.push(() => {
      if (existait) objet[cle] = ancien;
      else delete (objet as Record<PropertyKey, unknown>)[cle as PropertyKey];
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

  propriete(nom: string): ReleveDeComposant['proprietes'][number] {
    const propriete = this.releve.proprietes.find((entree) => entree.nom === nom);
    if (!propriete) throw new Error(`Propriété ${nom} absente`);
    return propriete;
  }

  /** Les variants dont les valeurs portent tous ces couples (axe, valeur). */
  variantsOu(valeurs: Readonly<Record<string, string>>): VariantLu[] {
    return this.releve.variants.filter((variant) => Object.entries(valeurs).every(([nom, valeur]) => variant.valeurs[nom] === valeur));
  }

  /** La variable de ce nom, dans la collection `components`. */
  variable(cle: string): VariableDuCatalogue {
    const variable = this.catalogue.variables.find((entree) => entree.cle === cle);
    if (!variable) throw new Error(`Variable ${cle} absente du catalogue`);
    return variable;
  }

  /** Les variables de `components` que la carte de la base range sous ces valeurs d'axe (et ce rôle ou cette propriété). */
  jetons(critere: { readonly nature?: 'couleur' | 'taille'; readonly role?: string; readonly propriete?: string; readonly valeurs?: Readonly<Record<string, string>> } = {}): VariableDuCatalogue[] {
    return this.carte.jetons
      .filter((jeton) => (critere.nature === undefined || jeton.nature === critere.nature)
        && (critere.role === undefined || jeton.role === critere.role) && (critere.propriete === undefined || jeton.propriete === critere.propriete)
        && Object.entries(critere.valeurs ?? {}).every(([nom, valeur]) => jeton.valeurs[nom] === valeur))
      .map((jeton) => this.variable(jeton.cle));
  }

  /** Le rang du segment d'un rôle d'axe dans le nom d'un token de cette famille (`color` ou `size`), ou -1. */
  rangDuSegment(famille: 'color' | 'size', role: AxeDuComposant): number {
    const presents = ORDRE_DES_ROLES.filter((candidat) => this.carte.axes.some((axe) => axe.segment === candidat));
    if (famille === 'size') return role === 'taille' && presents.includes('taille') ? 2 : -1;
    const rang = presents.indexOf(role);
    return rang < 0 ? -1 : 2 + rang;
  }

  /** Les tokens que la carte de la base range sous cette valeur d'axe, avec leur famille. */
  jetonsDe(axe: string, valeur: string): { variable: VariableDuCatalogue; famille: 'color' | 'size' }[] {
    return this.carte.jetons.filter((jeton) => jeton.valeurs[axe] === valeur)
      .map((jeton) => ({ variable: this.variable(jeton.cle), famille: jeton.nature === 'couleur' ? 'color' as const : 'size' as const }));
  }

  /** Réécrit le segment de cette valeur d'axe dans le nom de chacun des tokens qui la portent (couleur et taille). */
  reecrireLeSegment(axe: string, valeur: string, transformer: (segment: string) => string): void {
    const role = this.carte.axes.find((entree) => entree.propriete === axe)?.segment;
    if (!role) throw new Error(`L'axe ${axe} n'écrit aucun segment`);
    for (const { variable, famille } of this.jetonsDe(axe, valeur)) {
      const rang = this.rangDuSegment(famille, role);
      this.renommerLeSegment(variable, rang, transformer(variable.nom.split('/')[rang]));
    }
  }

  /** Le nom du token dont le segment de rang `rang` est remplacé. */
  renommerLeSegment(variable: VariableDuCatalogue, rang: number, nouveau: string): void {
    const segments = variable.nom.split('/');
    segments[rang] = nouveau;
    this.fixer(variable, 'nom', segments.join('/'));
  }

  /** Renomme une valeur d'axe dans la propriété et dans chaque variant (valeurs et nom), sans toucher aux tokens. */
  renommerLaValeur(nomDeLaPropriete: string, ancienne: string, nouvelle: string): void {
    const propriete = this.propriete(nomDeLaPropriete);
    const valeurs = propriete.valeurs ?? [];
    const rang = valeurs.indexOf(ancienne);
    if (rang < 0) throw new Error(`Valeur ${ancienne} absente de ${nomDeLaPropriete}`);
    this.fixer(valeurs, rang, nouvelle);
    if (propriete.defaut === ancienne) this.fixer(propriete, 'defaut', nouvelle);
    for (const variant of this.variantsOu({ [nomDeLaPropriete]: ancienne })) {
      this.fixer(variant.valeurs, nomDeLaPropriete, nouvelle);
      this.fixer(variant, 'nom', variant.nom.replace(`${nomDeLaPropriete}=${ancienne}`, `${nomDeLaPropriete}=${nouvelle}`));
    }
  }

  /** Une copie du variant aux valeurs changées, d'identifiants neufs, que `inserer` range à la fin. */
  copierLeVariant(variant: VariantLu, changements: Readonly<Record<string, string>> = {}): VariantLu {
    this.creees += 1;
    const id = `${variant.id}~${this.creees}`;
    const copie = structuredClone(variant);
    copie.id = id;
    copie.valeurs = { ...copie.valeurs, ...changements };
    for (const [nom, valeur] of Object.entries(changements)) copie.nom = copie.nom.replace(new RegExp(`${nom}=[^,]*`), `${nom}=${valeur}`);
    for (const layer of copie.layers) {
      layer.id = `${id}/${layer.id}`;
      layer.parent = layer.parent === null ? null : `${id}/${layer.parent}`;
      for (const liaison of layer.liaisons) liaison.porteur = layer.id;
    }
    this.inserer(this.releve.variants, copie);
    return copie;
  }

  /** Retire du relevé les liaisons de ce layer à une variable, dans le layer et dans les plages de son texte. */
  delier(cle: string): void {
    const retirerDe = (liaisons: LiaisonLue[]): void => {
      for (const liaison of [...liaisons].filter((entree) => entree.variable.cle === cle)) this.retirer(liaisons, liaison);
    };
    const parcourir = (layers: LayerLu[]): void => {
      for (const layer of layers) {
        retirerDe(layer.liaisons);
        for (const plage of layer.texte?.plages ?? []) retirerDe(plage.liaisons);
      }
    };
    for (const variant of this.releve.variants) parcourir(variant.layers);
    for (const wrapper of this.releve.wrappers ?? []) for (const variant of wrapper.variants) retirerDe(variant.liaisons);
  }

  /** Une copie de la variable sous une autre clé et un autre nom, ajoutée à la fin du catalogue. */
  cloner(modele: VariableDuCatalogue, nom: string): VariableDuCatalogue {
    this.creees += 1;
    const copie: VariableDuCatalogue = { ...structuredClone(modele), cle: `kz${String(this.creees).padStart(5, '0')}`, nom };
    this.inserer(this.catalogue.variables, copie);
    return copie;
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Clés de rattachement

const trier = (valeurs: Readonly<Record<string, string>>): string =>
  Object.entries(valeurs).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([axe, valeur]) => `${axe}=${valeur}`).join('|');

/** La clé d'une combinaison d'axes, indépendante de l'ordre des propriétés. */
export const cleDeCombinaison = trier;

/** La clé que `comparer` calcule pour un constat émis. */
export function cleDeConstat(constat: Constat): string {
  const { faits } = constat;
  switch (constat.code) {
    case 'C7': return `${faits.axe}=${faits.valeur}`;
    case 'C8': case 'C10': return faits.cote === 'variant' ? `variant|${faits.propriete}=${faits.valeur}>${faits.attendu}` : `${faits.segment}>${faits.attendu}`;
    case 'C9': return `${faits.segment}>${faits.valeur}`;
    case 'C12': case 'C13': return `${faits.propriete}=${faits.avant}`;
    case 'C31':
      if (faits.genre === 'au-dela-de-la-borne') return `information-de-borne|total=${faits.combinaisons}|variants=${faits.variants}`;
      if (faits.genre === 'et-autres') return `et-autres|autres=${faits.autres}`;
      return trier(faits as Record<string, string>);
    case 'C32': return `${faits.token}|${faits.motif}`;
    case 'C33': return `${constat.variants[0]}|${faits.famille}`;
    default: return constat.id;
  }
}

export function attendu(code: ConstatAttendu['code'], cle: string, plus: { candidats?: readonly string[] } = {}): ConstatAttendu {
  return { code, cle, forme: plus.candidats ? 'question' : 'a-faire', ...(plus.candidats ? { candidats: plus.candidats } : {}) };
}

export const c7 = (axe: string, valeur: string): ConstatAttendu => attendu('C7', `${axe}=${valeur}`);
export const c8 = (segment: string, canonique: string): ConstatAttendu => attendu('C8', `${segment}>${canonique}`);
export const c9 = (segment: string, valeur: string): ConstatAttendu => attendu('C9', `${segment}>${valeur}`);
export const c10 = (segment: string, canonique: string): ConstatAttendu => attendu('C10', `${segment}>${canonique}`);
/** La valeur d'un variant qui s'écrit autrement qu'en toutes lettres (`S`, `Error`) : C10 pour la taille, C8 pour la palette (Q-F5-5, Q-F5-6). */
export const variantCorrige = (code: 'C8' | 'C10', propriete: string, valeur: string, mot: string, avecCorrection = true): ConstatAttendu => ({
  ...attendu(code, `variant|${propriete}=${valeur}>${mot}`),
  ...(avecCorrection ? { forme: 'correction' as const, apres: { nom: mot } } : {}),
});
/** Deux axes portent le style : un constat à faire, sans fusion (Q-F5-3). */
export const c63DeuxAxesDeStyle = (jeu: string): ConstatAttendu => attendu('C63', `C63:${jeu}:deux-axes-de-style`);
export const question = (axe: string, valeur: string, candidats: readonly string[]): ConstatAttendu =>
  attendu(candidats.length === 1 ? 'C12' : 'C13', `${axe}=${valeur}`, { candidats });
export const c31 = (combinaison: Readonly<Record<string, string>>): ConstatAttendu => attendu('C31', trier(combinaison));
export const c32 = (token: string, motif: 'sans-variant' | 'inutilise' | 'nom-illisible'): ConstatAttendu => attendu('C32', `${token}|${motif}`);
export const c33 = (variant: string, famille: string): ConstatAttendu => attendu('C33', `${variant}|${famille}`);
/** L'information au-delà de la borne (Q-F5-7) : le total des combinaisons et le nombre de variants. */
export const informationDeBorne = (total: number, variants: number): ConstatAttendu =>
  attendu('C31', `information-de-borne|total=${total}|variants=${variants}`);
export const PLAFOND_DE_C31 = 200;
export const etAutres = (autres: number): ConstatAttendu => attendu('C31', `et-autres|autres=${autres}`);
/** Sous la borne : un C31 par combinaison absente jusqu'à 200, puis une ligne qui compte les autres (Q-F5-7). */
export const c31Plafonnes = (absentes: readonly Readonly<Record<string, string>>[]): ConstatAttendu[] => [
  ...absentes.slice(0, PLAFOND_DE_C31).map((combinaison) => c31(combinaison)),
  ...(absentes.length > PLAFOND_DE_C31 ? [etAutres(absentes.length - PLAFOND_DE_C31)] : []),
];

// ---------------------------------------------------------------------------------------------------------------------------
// Modèle de référence

export interface OptionsDuModele {
  /** Le rôle du segment de chaque propriété de variant ; absent ou `null` : aucune règle ne la lit. */
  readonly roles: Readonly<Record<string, AxeDuComposant | null>>;
  /** Les noms de tokens que le cas rend illisibles : le modèle les ignore. */
  readonly illisibles?: ReadonlySet<string>;
}

interface AxeDuModele { readonly nom: string; readonly valeurs: readonly string[]; readonly role: AxeDuComposant | null }
interface TokenDuModele {
  readonly cle: string;
  readonly nom: string;
  readonly famille: 'color' | 'size';
  readonly segment: string;
  readonly segments: Partial<Record<AxeDuComposant, string>>;
}

const FAMILLES_DE_COULEUR_TOLEREES = ['colors', 'colour'];
const formeDeFamille = (segment: string): 'color' | 'size' | null => {
  const forme = formeReconnue(segment);
  if (forme === 'color' || FAMILLES_DE_COULEUR_TOLEREES.includes(forme) || forme === 'colours') return 'color';
  return forme === 'size' ? 'size' : null;
};

function registreDuRole(role: AxeDuComposant): Registre | undefined {
  if (role === 'etat') return REGISTRE_ETATS;
  if (role === 'taille') return REGISTRE_TAILLES;
  if (role === 'palette') return REGISTRE_PALETTES_COMPOSANT;
  return undefined;
}

/** Même valeur d'axe : même forme, ou même terme du registre du rôle. Deux valeurs hors registre ne sont égales que par la forme. */
export function egale(role: AxeDuComposant, segment: string, valeur: string): boolean {
  if (formeReconnue(segment) === formeReconnue(valeur)) return true;
  // Le point et la barre d'une valeur deviennent un tiret dans le token (Q-F5-10).
  if (formeReconnue(valeur.replace(/[./]/g, '-')) === formeReconnue(segment)) return true;
  const registre = registreDuRole(role);
  const terme = registre && termeReconnu(registre, segment)?.id;
  return !!terme && terme === termeReconnu(registre, valeur)?.id;
}

const dedoublonner = (valeurs: readonly string[]): string[] => [...new Set(valeurs)];

/**
 * Les constats que les règles 4.1 et 4.4 attendent du composant dégradé. Au-delà de 4 096 combinaisons déclarées, une information
 * remplace les C31 ; en deçà, 200 C31 au plus. `lecture complete` coupe C31, C32 et C33 (P9).
 */
export function attendusDuModele(composant: ComposantDeBase, options: OptionsDuModele): ConstatAttendu[] {
  const { releve, catalogue } = composant;
  const roleDe = (nom: string): AxeDuComposant | null => options.roles[nom] ?? null;
  const axes: AxeDuModele[] = releve.proprietes.filter((p) => p.type === 'VARIANT')
    .map((p) => ({ nom: p.nom, valeurs: dedoublonner(p.valeurs ?? []), role: roleDe(p.nom) }));
  const axeDuRole = (role: AxeDuComposant): AxeDuModele | undefined => axes.find((axe) => axe.role === role);
  const presents = ORDRE_DES_ROLES.filter((role) => Object.values(options.roles).includes(role));

  const collection = catalogue.collections.find((entree) => entree.role === 'components');
  const jeu = formeReconnue(releve.jeu.nom);
  const tokens: TokenDuModele[] = [];
  for (const variable of catalogue.variables) {
    if (variable.collection !== collection?.cle || options.illisibles?.has(variable.nom)) continue;
    const segments = variable.nom.split('/');
    if (formeReconnue(segments[0]) !== jeu) continue;
    const famille = formeDeFamille(segments[1] ?? '');
    if (!famille) throw new Error(`Modèle : famille illisible dans ${variable.nom} (la déclarer dans \`illisibles\`)`);
    const roles = famille === 'color' ? presents : presents.filter((role) => role === 'taille');
    if (segments.length !== 2 + roles.length + 1) throw new Error(`Modèle : ${variable.nom} n'a pas ${roles.length} segments d'axe (la déclarer dans \`illisibles\`)`);
    tokens.push({ cle: variable.cle, nom: variable.nom, famille, segment: segments[1], segments: Object.fromEntries(roles.map((role, rang) => [role, segments[2 + rang]])) });
  }

  const constats: ConstatAttendu[] = [];
  const dedoublonnes = new Set<string>();
  const ajouter = (constat: ConstatAttendu): void => {
    const cle = `${constat.code}|${constat.cle}`;
    if (!dedoublonnes.has(cle)) { dedoublonnes.add(cle); constats.push(constat); }
  };

  // C7 : une valeur d'axe qu'aucun token ne nomme, alors que d'autres tokens nomment l'axe.
  const axesOuverts = new Set<AxeDuModele>();
  for (const axe of axes) {
    if (!axe.role) continue;
    const segments = tokens.map((token) => token.segments[axe.role!]).filter((segment): segment is string => segment !== undefined);
    if (!segments.length) continue;
    for (const valeur of axe.valeurs) {
      if (segments.some((segment) => egale(axe.role!, segment, valeur))) continue;
      axesOuverts.add(axe);
      ajouter(c7(axe.nom, valeur));
    }
  }

  // C8, C9 et C10 : un constat par segment à renommer.
  for (const token of tokens) {
    if (token.famille === 'color' && formeReconnue(token.segment) !== 'color' && FAMILLES_DE_COULEUR_TOLEREES.includes(formeReconnue(token.segment))) ajouter(c8(token.segment, 'color'));
    for (const [role, segment] of Object.entries(token.segments) as [AxeDuComposant, string][]) {
      const registre = registreDuRole(role);
      const terme = registre && termeReconnu(registre, segment);
      if (terme && (role === 'etat' || role === 'taille' || role === 'palette')) {
        // Un token écrit une taille par son identifiant (`sm`), un état par sa forme de dossier, une palette par son identifiant.
        const canonique = role === 'taille' || role === 'palette' ? terme.id : termePourCategorie(terme, 'groupes').id;
        if (formeReconnue(segment) !== formeReconnue(canonique)) ajouter(role === 'taille' ? c10(segment, canonique) : c8(segment, canonique));
        continue;
      }
      if (terme) continue;
      const valeur = axeDuRole(role)?.valeurs.find((candidate) => formeReconnue(candidate) === formeReconnue(segment));
      if (valeur !== undefined && valeur !== segment) ajouter(c9(segment, valeur));
    }
  }

  const covient = (token: TokenDuModele, valeurs: Readonly<Record<string, string>>, sauf?: AxeDuComposant): boolean =>
    axes.every((axe) => {
      if (!axe.role || axe.role === sauf || axeDuRole(axe.role) !== axe) return true;
      const segment = token.segments[axe.role];
      if (segment === undefined) return sauf === undefined;
      return valeurs[axe.nom] !== undefined && egale(axe.role, segment, valeurs[axe.nom]);
    });

  // C12 et C13 : une valeur de variant qu'aucun token ne couvre, alors que les autres axes concordent. Les candidats sont les segments que nul variant ne porte.
  // Avec deux axes ouverts, C7 reste seul (Q-F5-4).
  for (const axe of axesOuverts.size > 1 ? [] : axes) {
    if (!axe.role || axeDuRole(axe.role) !== axe) continue;
    const role = axe.role;
    const portees = dedoublonner(releve.variants.map((variant) => variant.valeurs[axe.nom]).filter((valeur): valeur is string => !!valeur && axe.valeurs.includes(valeur)));
    for (const valeur of portees) {
      const variants = releve.variants.filter((variant) => variant.valeurs[axe.nom] === valeur);
      const accordeAuxAutresAxes = (token: TokenDuModele): boolean => token.segments[role] !== undefined && variants.some((variant) => covient(token, variant.valeurs, role));
      if (tokens.some((token) => token.segments[role] !== undefined && egale(role, token.segments[role]!, valeur) && accordeAuxAutresAxes(token))) continue;
      const voisins = tokens.filter(accordeAuxAutresAxes);
      const orphelins = dedoublonner(voisins.map((token) => token.segments[role]!))
        .filter((segment) => !releve.variants.some((variant) => variant.valeurs[axe.nom] !== undefined && egale(role, segment, variant.valeurs[axe.nom])));
      if (orphelins.length) ajouter(question(axe.nom, valeur, orphelins));
    }
  }

  // Une taille ou une palette de variant s'écrit en toutes lettres : `S`, `sm`, `Middle` et `Error` se corrigent (Q-F5-5, Q-F5-6).
  for (const axe of axes) {
    if (axe.role !== 'taille' && axe.role !== 'palette') continue;
    for (const valeur of axe.valeurs) {
      const ecriture = ecritureDuVariant(axe.role, valeur);
      if (!ecriture?.correction) continue;
      // La correction renomme la valeur dans le jeu ; elle manque quand le mot entier est déjà une valeur de l'axe.
      const renommable = !!releve.jeu.id && !axe.valeurs.includes(ecriture.variant) && releve.variants.some((variant) => variant.valeurs[axe.nom] === valeur);
      ajouter(variantCorrige(axe.role === 'taille' ? 'C10' : 'C8', axe.nom, valeur, ecriture.variant, renommable));
    }
  }

  // C31, C32 et C33 : seulement si tous les variants et layers sont lus.
  const lectureComplete = releve.lecture.variantsNonLus.length === 0 && releve.lecture.layersNonLus === 0;
  if (!lectureComplete) return constats;

  const declarees = axes.filter((axe) => axe.valeurs.length > 0);
  const total = declarees.reduce((produit, axe) => produit * axe.valeurs.length, 1);
  if (declarees.length > 0 && total <= BORNE_DE_COMBINAISONS) {
    const presentes = new Set(releve.variants.map((variant) => trier(Object.fromEntries(declarees.map((axe) => [axe.nom, variant.valeurs[axe.nom] ?? ''])))));
    let combinaisons: Record<string, string>[] = [{}];
    for (const axe of declarees) combinaisons = combinaisons.flatMap((debut) => axe.valeurs.map((valeur) => ({ ...debut, [axe.nom]: valeur })));
    for (const constat of c31Plafonnes(combinaisons.filter((combinaison) => !presentes.has(trier(combinaison))))) ajouter(constat);
  } else if (declarees.length > 0) ajouter(informationDeBorne(total, releve.variants.length));

  if (collection?.etat !== 'lue') return constats;
  const liees = new Set<string>();
  for (const variant of releve.variants) for (const layer of variant.layers) for (const liaison of layer.liaisons) liees.add(liaison.variable.cle);
  // Un rôle que l'hôte n'a pas, un wrapper le porte : le token ne vaut que si un variant du wrapper a ce segment.
  const porteurs = new Map<AxeDuComposant, { wrapper: NonNullable<ReleveDeComposant['wrappers']>[number]; nom: string }[]>();
  for (const wrapper of releve.wrappers ?? []) {
    for (const propriete of wrapper.proprietes.filter((p) => p.type === 'VARIANT')) {
      const role = roleDe(propriete.nom);
      if (!role || axeDuRole(role)) continue;
      porteurs.set(role, [...(porteurs.get(role) ?? []), { wrapper, nom: propriete.nom }]);
    }
  }
  for (const token of tokens) {
    let sansVariant = !releve.variants.some((variant) => covient(token, variant.valeurs));
    const wrappers = new Set<NonNullable<ReleveDeComposant['wrappers']>[number]>();
    for (const [role, segment] of Object.entries(token.segments) as [AxeDuComposant, string][]) {
      const portes = porteurs.get(role);
      if (!portes) continue;
      let porte = false;
      for (const { wrapper, nom } of portes) {
        wrappers.add(wrapper);
        if (wrapper.variants.some((variant) => variant.valeurs[nom] !== undefined && egale(role, segment, variant.valeurs[nom]))) porte = true;
      }
      if (!porte) sansVariant = true;
    }
    const liee = liees.has(token.cle) || [...wrappers].some((wrapper) => wrapper.variants.some((variant) => variant.liaisons.some((liaison) => liaison.variable.cle === token.cle)));
    if (sansVariant || !liee) ajouter(c32(token.nom, sansVariant ? 'sans-variant' : 'inutilise'));
  }
  const familles = dedoublonner(tokens.map((token) => token.famille));
  for (const variant of releve.variants) {
    for (const famille of familles) {
      if (!tokens.some((token) => token.famille === famille && covient(token, variant.valeurs))) ajouter(c33(variant.id, famille));
    }
  }
  return constats;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Fabrique de cas

export interface SpecDeCas {
  readonly id: string;
  readonly operateur: string;
  readonly description: string;
  readonly zones: readonly ZoneTouchee[];
  readonly degrader: (degradation: Degradation) => void;
  readonly verdict?: 'attendu' | 'mesure';
  readonly question?: string;
  readonly hypothese?: string;
  readonly ecartConnu?: string;
  /** Les noms de tokens que `degrader` rend illisibles. */
  readonly illisibles?: ReadonlySet<string>;
  /** Les rôles des propriétés, quand ils diffèrent de ceux de la base. */
  readonly roles?: Readonly<Record<string, AxeDuComposant | null>>;
  /** Retouche ce que le modèle attend : la proposition de la section 9 d'un cas `mesure`, ou un oracle qui sort du modèle. */
  readonly ajuster?: (attendus: ConstatAttendu[]) => ConstatAttendu[];
  /** Remplace l'oracle du modèle. */
  readonly attendus?: readonly ConstatAttendu[];
  readonly codesJuges?: readonly string[];
}

/**
 * Un cas qui dégrade une copie de `base`. L'oracle du modèle se calcule au premier accès à `attendus`, sur une copie qu'il défait
 * aussitôt : lister les cas pour les compter ne coûte donc aucune copie.
 */
export function casDegrade(base: ComposantDeBase, spec: SpecDeCas): CasDeVariants {
  const roles = spec.roles ?? rolesDeLaBase(base);
  let memoire: readonly ConstatAttendu[] | undefined = spec.attendus;
  const calculer = (): readonly ConstatAttendu[] => {
    const degradation = new Degradation(base);
    spec.degrader(degradation);
    const attendus = attendusDuModele(degradation.composant, { roles, illisibles: spec.illisibles });
    return spec.ajuster ? spec.ajuster([...attendus]) : attendus;
  };
  return {
    id: spec.id, famille: 'F5', operateur: spec.operateur, verdict: spec.verdict ?? 'attendu',
    ...(spec.question ? { question: spec.question } : {}),
    get attendus() { return (memoire ??= calculer()); },
    // Les deux contrôles de F5 émettent aussi les constats C63 de Q-F5-3, que les cas A3 et les tests du kit jugent à part.
    codesJuges: spec.codesJuges ?? CODES_DE_LA_PORTEE,
    ...(spec.hypothese ? { hypothese: spec.hypothese } : {}), ...(spec.ecartConnu ? { ecartConnu: spec.ecartConnu } : {}),
    entree: {
      description: `${spec.operateur} : ${spec.description}`, zones: spec.zones,
      materialiser: () => { const degradation = new Degradation(base); spec.degrader(degradation); return degradation.materialiser(); },
    },
  };
}

/** Numérote les cas d'un opérateur `<opérateur>-<n>` dans l'ordre où ils sont rendus. */
export class Numerotation {
  private readonly compteurs = new Map<string, number>();
  prochain(operateur: string): string {
    const n = (this.compteurs.get(operateur) ?? 0) + 1;
    this.compteurs.set(operateur, n);
    return `${operateur}-${n}`;
  }
}
