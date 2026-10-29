/**
 * Les contrôles d'intégrité UCM du catalogue, sans composant. C82 trouve les variables que le thème prévoit et que `theme` n'a
 * pas, et propose de les créer quand la règle et le fichier donnent un seul résultat.
 *
 * Une création n'est jamais devinée : sans jumelle aliasée, sans sens établi, sans écriture choisie ou avec une cible de
 * library, le constat reste sans correction et dit pourquoi dans le fait `raison`.
 */
import {
  NIVEAUX_D_ELEVATION_DU_THEME, SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES,
  cibleDeLaVariable, sensDeLaPalette,
  type CibleDeVariable, type ModeDuTheme, type VariableDePalette, type VariableDuTheme,
} from '../emplois/dossiers.js';
import type { EcritureChoisie } from '../protocoles/nommage.js';
import { FAMILLES_UTILITY } from '../referentiel/architecture.js';
import type { Convention } from '../referentiel/conventions.js';
import { assembler, decouperSegment, motsAvecCasse } from '../referentiel/ecriture-des-mots.js';
import { formeDuChemin, formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { modeDuThemeReconnu, variableDuThemeReconnue } from '../referentiel/theme.js';
import { cheminDansLaCollection, collectionParCle, variableParCle, type CatalogueDeReference, type CollectionDuCatalogue, type VariableDuCatalogue } from './catalogue.js';
import type { Constat, Correction } from './constat.js';

export interface OptionsDIntegrite {
  /** L'écriture choisie dans Nomenclature ; sans elle, aucune correction `variable`. */
  readonly ecriture?: EcritureChoisie | null;
  /** Les rôles que le fichier ignore partout (Q6) : aucun constat ne les cite. */
  readonly rolesIgnores?: readonly VariableDuTheme[];
}

/** Les variables d'un préfixe de `theme` : un groupe de palette quand il porte une variable de palette. */
interface Prefixe {
  readonly segments: readonly string[];
  /** Le premier segment des noms du groupe quand ils redisent la collection (`theme/primary/…`) : la variable créée le garde. */
  readonly collectionEcrite: string | undefined;
  readonly presentes: Map<VariableDuTheme, VariableDuCatalogue>;
  /** Le dossier de chaque rôle (`surface`, `page`…), tel que le fichier l'écrit, par sa forme reconnue. */
  readonly dossiers: Map<string, string>;
  readonly jumelles: Map<ModeDuTheme, Jumelles>;
}

/** Les rampes que visent les variables d'un groupe dans un mode, et les crans qu'elles visent. */
interface Jumelles {
  readonly rampes: Map<string, Rampe>;
  readonly vise: Partial<Record<VariableDePalette, CibleDeVariable>>;
}

interface Rampe { readonly collection: string; readonly segments: readonly string[]; readonly distante: boolean }

interface ModeLu { readonly id: string; readonly nom: string; readonly ucm: ModeDuTheme }

type Resolution =
  | { readonly etat: 'trouvee'; readonly cible: { readonly cle: string; readonly nom: string }; readonly vise: string | number }
  | { readonly etat: 'cran-absent'; readonly rampe: readonly string[]; readonly cran: number }
  | { readonly etat: 'sans-correction'; readonly raison: string; readonly vise?: string | number };

interface CranAbsent { readonly rampe: readonly string[]; readonly cran: number; readonly variables: string[] }

/** Les variables de `brands` et de `utility`, par collection et forme du chemin : la lecture se fait une fois par appel. */
interface IndexDesCibles {
  readonly parChemin: Map<string, VariableDuCatalogue[]>;
  readonly rampes: Map<string, readonly string[]>;
}

const NOMBRE = /^\d+$/;

/** Les contrôles d'intégrité UCM du catalogue, sans composant. Rend [] hors collection `theme` lue. */
export function controlerLIntegriteUcm(catalogue: CatalogueDeReference, options: OptionsDIntegrite = {}): Constat[] {
  const themes = catalogue.collections.filter((collection) => collection.role === 'theme' && collection.etat === 'lue');
  if (themes.length === 0) return [];
  const index = indexerLesCibles(catalogue);
  return themes.flatMap((theme) => controlerUnTheme(catalogue, theme, index, options));
}

function indexerLesCibles(catalogue: CatalogueDeReference): IndexDesCibles {
  const parChemin = new Map<string, VariableDuCatalogue[]>();
  const rampes = new Map<string, readonly string[]>();
  for (const variable of catalogue.variables) {
    if (variable.etat !== 'presente') continue;
    const role = collectionParCle(catalogue, variable.collection)?.role;
    if (role !== 'brands' && role !== 'utility') continue;
    const chemin = cheminDansLaCollection(variable, catalogue);
    const cle = `${variable.collection}\0${formeDuChemin(chemin)}`;
    const memes = parChemin.get(cle);
    if (memes) memes.push(variable); else parChemin.set(cle, [variable]);
    if (chemin.length > 1 && NOMBRE.test(chemin[chemin.length - 1])) {
      const prefixe = chemin.slice(0, -1);
      const cleDeRampe = `${variable.collection}\0${formeDuChemin(prefixe)}`;
      if (!rampes.has(cleDeRampe)) rampes.set(cleDeRampe, prefixe);
    }
  }
  return { parChemin, rampes };
}

function controlerUnTheme(catalogue: CatalogueDeReference, theme: CollectionDuCatalogue, index: IndexDesCibles, options: OptionsDIntegrite): Constat[] {
  const modes: ModeLu[] = [];
  let modeInconnu = false;
  for (const mode of theme.modes) {
    const ucm = modeDuThemeReconnu(mode.nom);
    if (ucm) modes.push({ id: mode.id, nom: mode.nom, ucm }); else modeInconnu = true;
  }
  const { prefixes, collectionEcrite } = lesPrefixes(catalogue, theme);
  const ignores = new Set<VariableDuTheme>(options.rolesIgnores ?? []);
  const ecriture = options.ecriture ?? null;
  const constats: Constat[] = [];
  const cransAbsents = new Map<string, CranAbsent>();

  const absente = (prefixe: Prefixe, groupe: boolean, role: VariableDuTheme): void => {
    const resolutions = modes.map((mode) => ({ mode, resolution: resoudre(catalogue, index, prefixe, groupe, role, mode) }));
    const manques = resolutions.flatMap(({ resolution }) => (resolution.etat === 'cran-absent' ? [resolution] : []));
    const nom = ecriture ? nomCree(prefixe, role, ecriture) : undefined;
    const libelle = [...prefixe.segments, role].join('/');
    if (manques.length > 0) {
      for (const manque of manques) {
        const cle = `${formeDuChemin(manque.rampe)}/${manque.cran}`;
        const connu = cransAbsents.get(cle);
        if (connu) connu.variables.push(libelle); else cransAbsents.set(cle, { rampe: manque.rampe, cran: manque.cran, variables: [libelle] });
      }
      return;
    }
    const formeDuGroupe = formeDuChemin(prefixe.segments);
    const id = `C82:variable-absente:${theme.cle}:${formeDuGroupe ? `${formeDuGroupe}/` : ''}${role}`;
    const faits: Constat['faits'] = { genre: 'variable-absente', variable: role, groupe: prefixe.segments.join('/'), ...(nom ? { nom } : {}) };
    let raison: string | undefined;
    for (const { mode, resolution } of resolutions) {
      if (resolution.etat === 'cran-absent') continue;
      const vise = resolution.vise;
      if (vise !== undefined) faits[`cran:${mode.nom}`] = vise;
      if (resolution.etat === 'sans-correction') raison ??= resolution.raison;
    }
    if (!raison && (modeInconnu || modes.length === 0)) raison = 'mode-sans-cible';
    if (!raison && !ecriture) raison = 'sans-ecriture';
    if (raison) faits.raison = raison;
    const constat: Constat = { id, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits };
    if (!raison && nom) constat.correction = correctionDeCreation(constat, theme, role, nom, resolutions, groupe);
    constats.push(constat);
  };

  for (const prefixe of prefixes.values()) {
    if (prefixe.segments.length === 0) continue;
    if (![...prefixe.presentes.keys()].some(estUneVariableDePalette)) continue;
    const attendues: readonly VariableDuTheme[] = estLeNeutre(prefixe.segments) ? [...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE] : VARIABLES_DE_PALETTE;
    for (const role of attendues) if (!ignores.has(role) && !prefixe.presentes.has(role)) absente(prefixe, true, role);
  }
  const racine: Prefixe = prefixes.get('') ?? { segments: [], collectionEcrite, presentes: new Map(), dossiers: new Map(), jumelles: new Map() };
  const globales: readonly VariableDuTheme[] = [...VARIABLES_GLOBALES, ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau): VariableDuTheme => `elevation/${niveau}`)];
  for (const role of globales) if (!ignores.has(role) && !racine.presentes.has(role)) absente(racine, false, role);

  for (const [cle, manque] of cransAbsents) {
    constats.push({
      id: `C82:cran-absent:${cle}`, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [],
      faits: { genre: 'cran-absent', rampe: manque.rampe.join('/'), cran: manque.cran, variables: manque.variables.join(', ') },
    });
  }
  return constats;
}

/**
 * Les préfixes de `theme`, par forme du chemin : le préfixe vide porte les variables globales. `collectionEcrite` est la
 * collection redite par la première variable reconnue, pour les variables globales que le fichier n'a pas encore.
 */
function lesPrefixes(catalogue: CatalogueDeReference, theme: CollectionDuCatalogue): { prefixes: Map<string, Prefixe>; collectionEcrite: string | undefined } {
  const prefixes = new Map<string, Prefixe>();
  let collectionDuTheme: string | undefined;
  let premiere = true;
  for (const variable of catalogue.variables) {
    if (variable.collection !== theme.cle || variable.etat !== 'presente') continue;
    const role = variableDuThemeReconnue(variable.nom);
    if (!role) continue;
    const chemin = cheminDansLaCollection(variable, catalogue);
    const longueur = role.split('/').length;
    if (chemin.length < longueur) continue;
    const segments = chemin.slice(0, chemin.length - longueur);
    const collectionEcrite = variable.nom.split('/').length > chemin.length ? variable.nom.split('/')[0] : undefined;
    if (premiere) { collectionDuTheme = collectionEcrite; premiere = false; }
    const forme = formeDuChemin(segments);
    let prefixe = prefixes.get(forme);
    if (!prefixe) {
      prefixe = { segments, collectionEcrite, presentes: new Map(), dossiers: new Map(), jumelles: new Map() };
      prefixes.set(forme, prefixe);
    }
    if (!prefixe.presentes.has(role)) prefixe.presentes.set(role, variable);
    if (longueur > 1) {
      const dossier = chemin[segments.length];
      const formeDuDossier = formeReconnue(dossier);
      if (!prefixe.dossiers.has(formeDuDossier)) prefixe.dossiers.set(formeDuDossier, dossier);
    }
  }
  return { prefixes, collectionEcrite: collectionDuTheme };
}

function estUneVariableDePalette(role: VariableDuTheme): role is VariableDePalette {
  return (VARIABLES_DE_PALETTE as readonly string[]).includes(role);
}

function estLeNeutre(segments: readonly string[]): boolean {
  return segments.length === 1 && termeReconnu(FAMILLES_UTILITY, segments[0])?.id === 'neutral';
}

function memeCible(gauche: CibleDeVariable, droite: CibleDeVariable): boolean {
  return 'cran' in gauche ? 'cran' in droite && gauche.cran === droite.cran : 'absolue' in droite && gauche.absolue === droite.absolue;
}

function valeurVisee(cible: CibleDeVariable): string | number {
  return 'cran' in cible ? cible.cran : cible.absolue;
}

/** Les variables du groupe qui visent une rampe de `brands` ou de `utility` dans ce mode, et leurs crans. */
function lesJumelles(catalogue: CatalogueDeReference, prefixe: Prefixe, mode: ModeLu): Jumelles {
  const connues = prefixe.jumelles.get(mode.ucm);
  if (connues) return connues;
  const rampes = new Map<string, Rampe>();
  const vise: Partial<Record<VariableDePalette, CibleDeVariable>> = {};
  for (const [role, variable] of prefixe.presentes) {
    if (variable.distante) continue;
    const valeur = variable.valeurs?.[mode.id];
    if (!valeur || !('alias' in valeur)) continue;
    const cible = variableParCle(catalogue, valeur.alias);
    if (!cible || cible.etat !== 'presente') continue;
    const collection = collectionParCle(catalogue, cible.collection);
    if (collection?.role !== 'brands' && collection?.role !== 'utility') continue;
    const chemin = cheminDansLaCollection(cible, catalogue);
    const dernier = chemin[chemin.length - 1];
    if (chemin.length < 2 || !NOMBRE.test(dernier)) continue;
    const modeDeLaCible = chemin.slice(0, -1).map((segment) => modeDuThemeReconnu(segment)).find((reconnu) => reconnu !== undefined);
    if (modeDeLaCible !== mode.ucm) continue;
    const segments = chemin.slice(0, -1);
    const cle = `${cible.collection}\0${formeDuChemin(segments)}`;
    if (!rampes.has(cle)) rampes.set(cle, { collection: cible.collection, segments, distante: cible.distante === true });
    if (estUneVariableDePalette(role) && !(role in vise)) vise[role] = { cran: Number(dernier) };
  }
  const jumelles = { rampes, vise };
  prefixe.jumelles.set(mode.ucm, jumelles);
  return jumelles;
}

function resoudre(catalogue: CatalogueDeReference, index: IndexDesCibles, prefixe: Prefixe, groupe: boolean, role: VariableDuTheme, mode: ModeLu): Resolution {
  if (role.startsWith('elevation/')) return chercherDansUtility(catalogue, index, ['elevation', mode.ucm, role.split('/')[1]], undefined);
  const normal = cibleDeLaVariable(role, mode.ucm, 'normal');
  const inverse = cibleDeLaVariable(role, mode.ucm, 'inverse');
  if (!normal || !inverse) return { etat: 'sans-correction', raison: 'cible-introuvable' };
  const aUnCran = 'cran' in normal;
  let rampe: Rampe | undefined;
  let jumelles: Jumelles | undefined;
  if (groupe) {
    jumelles = lesJumelles(catalogue, prefixe, mode);
    if (aUnCran) {
      if (jumelles.rampes.size === 0) return { etat: 'sans-correction', raison: 'sans-jumelle' };
      if (jumelles.rampes.size > 1) return { etat: 'sans-correction', raison: 'prefixes-multiples' };
      rampe = [...jumelles.rampes.values()][0];
    }
  }
  let cible = normal;
  if (!memeCible(normal, inverse)) {
    const sens = jumelles ? sensDeLaPalette(mode.ucm, jumelles.vise) : 'inconnu';
    if (sens !== 'normal' && sens !== 'inverse') return { etat: 'sans-correction', raison: 'sens-inconnu' };
    cible = sens === 'normal' ? normal : inverse;
  }
  const vise = valeurVisee(cible);
  if ('absolue' in cible) return chercherDansUtility(catalogue, index, ['neutral', mode.ucm, cible.absolue], vise);
  if (!rampe) return chercherDansUtility(catalogue, index, ['neutral', mode.ucm, String(cible.cran)], vise, cible.cran);
  if (rampe.distante) return { etat: 'sans-correction', raison: 'cible-de-library', vise };
  const trouvees = index.parChemin.get(`${rampe.collection}\0${formeDuChemin([...rampe.segments, String(cible.cran)])}`) ?? [];
  if (trouvees.length === 0) return { etat: 'cran-absent', rampe: rampe.segments, cran: cible.cran };
  return uneSeule(trouvees, vise);
}

/** Une variable de `utility` désignée par la forme de son chemin : une seule doit répondre. */
function chercherDansUtility(
  catalogue: CatalogueDeReference, index: IndexDesCibles, chemin: readonly string[], vise: string | number | undefined, cranDeRampe?: number,
): Resolution {
  const forme = formeDuChemin(chemin);
  const rampe = formeDuChemin(chemin.slice(0, -1));
  const trouvees: VariableDuCatalogue[] = [];
  let rampeLue: readonly string[] | undefined;
  for (const collection of catalogue.collections) {
    if (collection.role !== 'utility' || collection.etat !== 'lue') continue;
    trouvees.push(...index.parChemin.get(`${collection.cle}\0${forme}`) ?? []);
    rampeLue ??= index.rampes.get(`${collection.cle}\0${rampe}`);
  }
  if (trouvees.length === 0) {
    if (cranDeRampe !== undefined && rampeLue) return { etat: 'cran-absent', rampe: rampeLue, cran: cranDeRampe };
    return { etat: 'sans-correction', raison: 'cible-introuvable', ...(vise === undefined ? {} : { vise }) };
  }
  return uneSeule(trouvees, vise);
}

function uneSeule(trouvees: readonly VariableDuCatalogue[], vise: string | number | undefined): Resolution {
  const complement = vise === undefined ? {} : { vise };
  if (trouvees.length > 1) return { etat: 'sans-correction', raison: 'cible-ambigue', ...complement };
  const [cible] = trouvees;
  if (cible.distante) return { etat: 'sans-correction', raison: 'cible-de-library', ...complement };
  return { etat: 'trouvee', cible: { cle: cible.cle, nom: cible.nom }, vise: vise ?? '' };
}

function ecrire(identifiant: string, convention: Convention): string {
  return assembler(identifiant, motsAvecCasse(decouperSegment(identifiant), convention.casse), convention.separateur);
}

/**
 * Le nom de la variable créée : la collection redite, le préfixe et le dossier tels que le fichier les écrit déjà (en écrire un
 * autrement créerait un second dossier), le dernier segment selon l'écriture des variables. Un dossier sans variable voisine suit l'écriture des groupes.
 */
function nomCree(prefixe: Prefixe, role: VariableDuTheme, ecriture: EcritureChoisie): string {
  const [dossier, ...reste] = role.split('/');
  const debut = [...(prefixe.collectionEcrite ? [prefixe.collectionEcrite] : []), ...prefixe.segments];
  if (reste.length === 0) return [...debut, ecrire(dossier, ecriture.variables)].join('/');
  const dossierEcrit = prefixe.dossiers.get(formeReconnue(dossier)) ?? ecrire(dossier, ecriture.groupes);
  return [...debut, dossierEcrit, ...reste.map((segment) => ecrire(segment, ecriture.variables))].join('/');
}

function correctionDeCreation(
  constat: Constat, theme: CollectionDuCatalogue, role: VariableDuTheme, nom: string,
  resolutions: readonly { readonly mode: ModeLu; readonly resolution: Resolution }[], groupe: boolean,
): Correction | undefined {
  const alias: Record<string, { cle: string; nom: string }> = {};
  for (const { mode, resolution } of resolutions) {
    if (resolution.etat !== 'trouvee') return undefined;
    alias[mode.id] = resolution.cible;
  }
  if (Object.keys(alias).length === 0) return undefined;
  const regle = groupe
    ? `${role} est prévue dans chaque palette du thème : un alias par mode, vers le cran que TABLE_DES_DOSSIERS lui donne dans la rampe des autres variables de la palette.`
    : `${role} est prévue une fois dans le thème : un alias par mode, vers la variable de utility que le kit désigne.`;
  return {
    id: constat.id, sorte: 'variable', cible: {}, avant: null, apres: { nom, collection: theme.nom },
    aRelire: { regle, avant: null },
    creation: { collection: theme.cle, nom, type: 'COLOR', scopes: [...SUPPORT_DES_VARIABLES[role].portees], alias },
  };
}
