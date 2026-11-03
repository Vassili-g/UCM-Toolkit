/**
 * Le cadre des cas de stress test de structure (famille F2). Il porte le type d'un cas, la clé qui rattache un constat émis à un constat
 * attendu, la dégradation réversible d'une copie du thème de base, le registre qui numérote les cas `<opérateur>-<n>`, les
 * constats des deux contrôles du mode Tokens dédoublonnés comme le fait le sandbox du plugin, et les gabarits d'oracle que les
 * opérateurs de rôles, de crans et de modes partagent.
 *
 * Un opérateur copie le thème de base, dégrade la copie et rend un `CasDeStructure` dont les `attendus` viennent de la carte et
 * du référentiel (`TABLE_DES_DOSSIERS`, `SUPPORT_DES_VARIABLES`, `CIBLES_DES_COLLECTIONS`), jamais d'un appel aux contrôles. Le
 * journal de `Degradation` défait chaque écriture et `annuler()` redonne le catalogue de la base. Les contrôles du kit mémorisent
 * leur lecture d'un catalogue d'après la longueur de ses variables, donc `constatsDuCas` les lance sur une copie, pour qu'un cas
 * rejoué après `annuler` ne lise pas un index périmé.
 *
 * La clé d'un constat dit son genre, sa variable et son mode (`genre|variable|mode`), plus la raison d'une variable absente sans
 * correction. Un constat sans genre (C60, C63 `scopes`) porte `-`.
 */
import {
  SUPPORT_DES_VARIABLES, cranDeLaVariable,
  type ModeDuTheme, type SensDuTheme, type VariableDuTheme,
} from '../../../src/emplois/dossiers.js';
import { controlerLIntegriteUcm, controlerLeCatalogue, type CatalogueDeReference, type Constat, type VariableDuCatalogue } from '../../../src/controles/index.js';
import type { EcritureChoisie } from '../../../src/protocoles/nommage.js';
import { CRANS } from '../../../src/referentiel/vocabulaire.js';
import type { CasDeStress, ConstatAttendu, Ecart, Verdict } from '../commun/types.js';
import { MODES_DU_THEME, roleDeCarte, type PaletteDeCarte, type RoleDeCarte } from './carte.js';
import { GRAINE_PAR_DEFAUT, copierLeTheme, type ThemeDeBase } from './themeUcm.js';

/** La palette en sens normal et celle en sens inverse (sur les deux modes) que les opérateurs de P0 dégradent. */
export const PALETTE_NORMALE = 'primary';
export const PALETTE_INVERSE = 'secondary';
/** Une palette de `utility` qu'aucune couleur de `components` ne vise, si bien que retirer ses rôles ne casse aucun alias de composant. */
export const PALETTE_SANS_COMPOSANT = 'success/soft';

/** Ce qu'une dégradation touche, pour qu'une combinaison n'associe que des atomes de zones disjointes. */
export interface ZoneTouchee {
  /** `null` pour une variable globale, ou pour la collection `theme` entière. */
  readonly palette: string | null;
  readonly role: string;
  readonly mode: ModeDuTheme | 'les-deux';
}

export interface EntreeDeStructure {
  /** La copie dégradée de `base`. */
  readonly theme: ThemeDeBase;
  /** Le thème dont la copie part, qu'aucun cas ne modifie. */
  readonly base: ThemeDeBase;
  /** Défait la dégradation sur `theme`, en sens inverse. */
  readonly annuler: () => void;
  readonly zones: readonly ZoneTouchee[];
  /** Les clés des variables que la dégradation écrit ou retire, pour `--cas`. */
  readonly touchees: readonly string[];
  readonly description: string;
  /** L'écriture choisie dans Nomenclature ; `null` si aucune n'est choisie. */
  readonly ecriture: EcritureChoisie | null;
  readonly rolesIgnores: readonly VariableDuTheme[];
}

/** Ce qu'une correction attendue porte au-delà de `apres` (`comparer` ne lit que `apres.cle` et `apres.nom`). */
export interface DetailDeCorrection {
  /** `<code>|<cle>` du constat attendu. */
  readonly pour: string;
  /** L'`avant` de la correction, soit la cible que l'alias dégradé vise. */
  readonly avant?: string | null;
  /** La variable que la création écrit (collection, nom, scopes) et la clé visée dans chaque mode de `theme`. */
  readonly creation?: { readonly collection: string; readonly nom: string; readonly scopes: readonly string[]; readonly alias: Readonly<Record<string, string>> };
}

export interface CasDeStructure extends CasDeStress<EntreeDeStructure> {
  readonly details?: readonly DetailDeCorrection[];
  /** L'hypothèse de la section 6.1 du plan que ce cas met à l'épreuve ; le rapport y rattache un manque. */
  readonly hypothese?: string;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Clés de rattachement

const SANS_GENRE = '-';
const texte = (valeur: string | number | undefined): string => (valeur === undefined ? '' : String(valeur));

/** La clé que `comparer` calcule pour un constat émis. */
export function cleDeConstat(constat: Constat): string {
  const { faits } = constat;
  const genre = typeof faits.genre === 'string' ? faits.genre : SANS_GENRE;
  if (genre === 'variable-absente') {
    const variable = [texte(faits.groupe), texte(faits.variable)].filter((segment) => segment !== '').join('/');
    return cleAttendue(genre, variable, '', typeof faits.raison === 'string' ? faits.raison : undefined);
  }
  if (genre === 'cran-absent') return cleAttendue(genre, `${texte(faits.rampe)}/${texte(faits.cran)}`);
  if (genre === 'mode-du-theme') return cleAttendue(genre, texte(faits.collection), texte(faits.manque));
  return cleAttendue(genre, texte(faits.variable ?? faits.cle), texte(faits.mode));
}

/** La clé d'un constat attendu, construite comme `cleDeConstat` lit un constat émis. */
export function cleAttendue(genre: string | null, variable: string, mode = '', raison?: string): string {
  return `${genre ?? SANS_GENRE}|${variable}|${mode}${raison ? `|${raison}` : ''}`;
}

export function attendu(
  code: ConstatAttendu['code'], genre: string | null, variable: string, mode: string, forme: ConstatAttendu['forme'],
  plus: { apres?: { cle?: string; nom?: string }; candidats?: readonly string[]; raison?: string } = {},
): ConstatAttendu {
  return {
    code, cle: cleAttendue(genre, variable, mode, plus.raison), forme,
    ...(plus.apres ? { apres: plus.apres } : {}), ...(plus.candidats ? { candidats: plus.candidats } : {}),
  };
}

export const cleComplete = (constat: ConstatAttendu): string => `${constat.code}|${constat.cle}`;

// ---------------------------------------------------------------------------------------------------------------------------
// Constats des deux contrôles

/**
 * Les constats de `controlerLeCatalogue` puis de `controlerLIntegriteUcm`, le premier de chaque identifiant, comme le fait
 * `sansDoublon` dans `packages/plugin-architect/src/sandbox/structure.ts`, sans importer le plugin.
 */
export function constatsDeStructure(catalogue: CatalogueDeReference, ecriture: EcritureChoisie | null, rolesIgnores: readonly VariableDuTheme[]): Constat[] {
  const vus = new Set<string>();
  return [...controlerLeCatalogue(catalogue), ...controlerLIntegriteUcm(catalogue, { ecriture, rolesIgnores })]
    .filter((constat) => !vus.has(constat.id) && vus.add(constat.id));
}

/** Les constats d'un cas, lus sur une copie du catalogue dégradé. */
export function constatsDuCas(cas: CasDeStructure): Constat[] {
  const { theme, ecriture, rolesIgnores } = cas.entree;
  return constatsDeStructure(structuredClone(theme.catalogue), ecriture, rolesIgnores);
}

/**
 * Ce que `comparer` ne lit pas, soit l'`avant` d'une correction et la variable qu'une création écrit (collection, nom, type, scopes,
 * alias par mode). Un écart rend une correction inexacte, comme P5.
 */
export function verifierLesDetails(cas: CasDeStructure, emis: readonly Constat[]): Ecart[] {
  const ecarts: Ecart[] = [];
  for (const detail of cas.details ?? []) {
    const constat = emis.find((entree) => `${entree.code}|${cleDeConstat(entree)}` === detail.pour);
    const correction = constat?.correction;
    if (!constat || !correction) continue;
    const ajouter = (message: string) => ecarts.push({ cas: cas.id, sorte: 'correction-inexacte', emis: constat, detail: `${detail.pour} : ${message}` });
    if (detail.avant !== undefined && correction.avant !== detail.avant) ajouter(`avant ${correction.avant}, attendu ${detail.avant}`);
    if (!detail.creation) continue;
    const creation = correction.creation;
    if (!creation) { ajouter('la correction ne crée aucune variable'); continue; }
    const attendue = detail.creation;
    if (creation.collection !== attendue.collection) ajouter(`collection ${creation.collection}, attendu ${attendue.collection}`);
    if (creation.nom !== attendue.nom) ajouter(`nom ${creation.nom}, attendu ${attendue.nom}`);
    if (creation.type !== 'COLOR') ajouter(`type ${creation.type}`);
    if ([...creation.scopes].sort().join(',') !== [...attendue.scopes].sort().join(',')) ajouter(`scopes ${creation.scopes.join(',')}, attendu ${attendue.scopes.join(',')}`);
    const alias = Object.fromEntries(Object.entries(creation.alias).map(([mode, cible]) => [mode, cible.cle]));
    if (JSON.stringify(Object.entries(alias).sort()) !== JSON.stringify(Object.entries(attendue.alias).sort())) {
      ajouter(`alias ${JSON.stringify(alias)}, attendu ${JSON.stringify(attendue.alias)}`);
    }
  }
  return ecarts;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Dégradation réversible

/** Une copie profonde du thème de base et le journal de ce qu'on y écrit. */
export class Degradation {
  readonly theme: ThemeDeBase;
  readonly zones: ZoneTouchee[] = [];
  readonly touchees = new Set<string>();
  ecriture: EcritureChoisie | null;
  rolesIgnores: VariableDuTheme[] = [];
  private readonly journal: (() => void)[] = [];

  constructor(readonly base: ThemeDeBase) {
    this.theme = copierLeTheme(base);
    this.ecriture = this.theme.ecriture;
  }

  get catalogue(): CatalogueDeReference { return this.theme.catalogue; }
  /** La carte de la base. Elle dit ce qui est juste, jamais ce que la dégradation écrit. */
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

  supprimer<T extends object>(objet: T, cle: keyof T): void {
    const ancien = objet[cle];
    delete objet[cle];
    this.journal.push(() => { objet[cle] = ancien; });
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

  variable(cle: string): VariableDuCatalogue {
    const variable = this.catalogue.variables.find((entree) => entree.cle === cle);
    if (!variable) throw new Error(`Variable ${cle} absente du catalogue`);
    return variable;
  }

  retirerLaVariable(cle: string): void {
    this.retirer(this.catalogue.variables, this.variable(cle));
    this.touchees.add(cle);
  }

  /** Écrit la valeur d'une variable dans un mode de sa collection, désigné par son identifiant. */
  ecrireLaValeur(cleDeLaVariable: string, idDeMode: string, valeur: { alias: string } | { valeur: unknown }): void {
    this.fixer(this.variable(cleDeLaVariable).valeurs!, idDeMode, valeur);
    this.touchees.add(cleDeLaVariable);
  }

  viserDansLeMode(cleDeLaVariable: string, idDeMode: string, cible: string): void {
    this.ecrireLaValeur(cleDeLaVariable, idDeMode, { alias: cible });
  }

  viser(cleDeLaVariable: string, mode: ModeDuTheme, cible: string): void {
    this.viserDansLeMode(cleDeLaVariable, this.carte.modes[mode].id, cible);
  }

  zone(zone: ZoneTouchee): void { this.zones.push(zone); }

  /** Le nom que la collection de cette clé donne à son premier mode. */
  nomDuPremierMode(collection: string): string {
    return this.catalogue.collections.find((entree) => entree.cle === collection)!.modes[0].nom;
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Registre des cas

export interface ResultatDeCas {
  readonly description: string;
  readonly attendus: readonly ConstatAttendu[];
  readonly details?: readonly DetailDeCorrection[];
  readonly verdict?: Verdict;
  readonly question?: string;
  readonly hypothese?: string;
}

/** Numérote les cas `<opérateur>-<n>`. */
export class Registre {
  readonly cas: CasDeStructure[] = [];
  private readonly compteurs = new Map<string, number>();

  constructor(readonly base: ThemeDeBase, readonly graine: number = GRAINE_PAR_DEFAUT, readonly famille = 'F2') {}

  degrader(): Degradation { return new Degradation(this.base); }

  ajouter(operateur: string, degradation: Degradation, resultat: ResultatDeCas): void {
    const rang = (this.compteurs.get(operateur) ?? 0) + 1;
    this.compteurs.set(operateur, rang);
    const { description, attendus, details, verdict = 'attendu', question, hypothese } = resultat;
    this.cas.push({
      id: `${operateur}-${rang}`, famille: this.famille, operateur, verdict, ...(question ? { question } : {}),
      entree: {
        theme: degradation.theme, base: degradation.base, annuler: () => degradation.annuler(), zones: degradation.zones,
        touchees: [...degradation.touchees], description, ecriture: degradation.ecriture, rolesIgnores: degradation.rolesIgnores,
      },
      attendus, ...(details ? { details } : {}), ...(hypothese ? { hypothese } : {}),
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Gabarits d'oracle

export const nomDuMode = (base: ThemeDeBase, mode: ModeDuTheme): string => base.carte.modes[mode].nom;

export const autreMode = (mode: ModeDuTheme): ModeDuTheme => (mode === 'light' ? 'dark' : 'light');

/** Le cran que la carte fait viser à ce rôle dans ce mode. */
export function cranDeLaCarte(role: RoleDeCarte, mode: ModeDuTheme): number {
  const vise = role.cibles[mode].vise;
  if (!vise || !('cran' in vise)) throw new Error(`${role.nom} ne vise aucun cran en ${mode}`);
  return vise.cran;
}

/** Le cran suivant dans l'échelle, ou le précédent au bout (le « pas » de K1). */
export function cranVoisin(cran: number): number {
  const rang = CRANS.indexOf(cran as (typeof CRANS)[number]);
  if (rang < 0) throw new Error(`Cran inconnu : ${cran}`);
  return CRANS[rang + 1] ?? CRANS[rang - 1];
}

/** Le cran que la table donne à ce rôle pour ce sens ; `undefined` pour une couleur absolue ou une élévation. */
export function cranDeTable(role: VariableDuTheme, mode: ModeDuTheme, sens: SensDuTheme): number | undefined {
  const cran = cranDeLaVariable(role, mode, sens);
  return typeof cran === 'number' ? cran : undefined;
}

export const autreSens = (sens: SensDuTheme): SensDuTheme => (sens === 'normal' ? 'inverse' : 'normal');

/** Vrai quand le rôle vise le même cran dans les deux sens, dans chaque mode, donc le sens de la palette ne change pas sa cible. */
export function memeCranDansLesDeuxSens(role: VariableDuTheme): boolean {
  return MODES_DU_THEME.every((mode) => {
    const normal = cranDeTable(role, mode, 'normal');
    return normal !== undefined && normal === cranDeTable(role, mode, 'inverse');
  });
}

/** Le nom de variable d'un rôle tel que le constat `variable-absente` le cite (le groupe de la palette, puis le rôle). */
export function nomDeLaVariableAbsente(palette: PaletteDeCarte | null, role: VariableDuTheme): string {
  return [...(palette?.groupe ?? []), role].join('/');
}

/**
 * Les constats `alias-supprime` qu'un retrait fait naître. Chaque couleur de `components` qui visait la variable retirée a
 * maintenant un alias sans cible, et l'oracle les déclare, puisque la règle de C63 le veut.
 */
export function attendusDAliasSupprime(base: ThemeDeBase, cleRetiree: string): ConstatAttendu[] {
  const composants = base.catalogue.collections.find((collection) => collection.cle === base.carte.collections.components.cle)!;
  return base.carte.composant.jetons
    .filter((jeton) => jeton.cible.cle === cleRetiree)
    .map((jeton) => attendu('C63', 'alias-supprime', jeton.nom, composants.modes[0].nom, 'a-faire'));
}

/** Les alias de la variable créée, un par mode de `theme`, vers la cible de la carte, qui suit la table pour le sens de la palette. */
export function aliasDeCreation(base: ThemeDeBase, role: RoleDeCarte): Record<string, string> {
  return Object.fromEntries(MODES_DU_THEME.map((mode) => [base.carte.modes[mode].id, role.cibles[mode].cle]));
}

/**
 * Le constat `variable-absente` d'un rôle retiré. Il porte une correction qui crée la variable sous son nom d'avant
 * et avec ses scopes quand `raison` manque, sinon aucune correction et la raison.
 */
export function attenduDeVariableAbsente(
  base: ThemeDeBase, palette: PaletteDeCarte | null, role: RoleDeCarte, raison?: string,
): { attendu: ConstatAttendu; detail?: DetailDeCorrection } {
  const variable = nomDeLaVariableAbsente(palette, role.role);
  if (raison) return { attendu: attendu('C82', 'variable-absente', variable, '', 'a-faire', { raison }) };
  const constat = attendu('C82', 'variable-absente', variable, '', 'correction', { apres: { nom: role.nom } });
  return {
    attendu: constat,
    detail: {
      pour: cleComplete(constat),
      creation: { collection: base.carte.collections.theme.cle, nom: role.nom, scopes: SUPPORT_DES_VARIABLES[role.role].portees, alias: aliasDeCreation(base, role) },
    },
  };
}

/** Un rôle de `theme` de la carte, par palette (`null` pour une variable globale). */
export function leRole(base: ThemeDeBase, palette: string | null, role: VariableDuTheme): RoleDeCarte {
  return roleDeCarte(base.carte, palette, role);
}
