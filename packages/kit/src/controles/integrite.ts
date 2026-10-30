/**
 * Les contrôles d'intégrité UCM du catalogue, sans composant. C82 trouve les variables que le thème prévoit et que `theme` n'a
 * pas, et propose de les créer quand la règle et le fichier donnent un seul résultat. Il juge aussi le cran que chaque variable
 * de `theme` vise, puis les couches, les valeurs directes, les scopes, les modes, le type et le rangement des variables.
 *
 * Une création n'est jamais devinée : sans jumelle aliasée, sans sens établi, sans écriture choisie ou avec une cible de
 * library, le constat reste sans correction et dit pourquoi dans le fait `raison`. Un cran n'est corrigé que si le sens de la
 * palette est établi ou si les deux sens donnent la même cible ; sinon la question porte les deux candidats.
 */
import {
  NIVEAUX_D_ELEVATION_DU_THEME, SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES,
  cibleDeLaVariable, sensDeLaPalette,
  type CibleDeVariable, type ModeDuTheme, type SensDeduit, type VariableDePalette, type VariableDuTheme,
} from '../emplois/dossiers.js';
import type { EcritureChoisie } from '../protocoles/nommage.js';
import { COLLECTIONS_SANS_PORTEE, FAMILLES_UTILITY, REGISTRE_COULEURS_ABSOLUES, ciblesAdmises } from '../referentiel/architecture.js';
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
  return [...themes.flatMap((theme) => controlerUnTheme(catalogue, theme, index, options)), ...controlerLaStructure(catalogue, themes)];
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

  const noterLeCranAbsent = (rampe: readonly string[], cran: number, libelle: string): void => {
    const cle = `${formeDuChemin(rampe)}/${cran}`;
    const connu = cransAbsents.get(cle);
    if (connu) connu.variables.push(libelle); else cransAbsents.set(cle, { rampe, cran, variables: [libelle] });
  };

  const absente = (prefixe: Prefixe, groupe: boolean, role: VariableDuTheme): void => {
    const resolutions = modes.map((mode) => ({ mode, resolution: resoudre(catalogue, index, prefixe, groupe, role, mode) }));
    const manques = resolutions.flatMap(({ resolution }) => (resolution.etat === 'cran-absent' ? [resolution] : []));
    const nom = ecriture ? nomCree(prefixe, role, ecriture) : undefined;
    const libelle = [...prefixe.segments, role].join('/');
    if (manques.length > 0) {
      for (const manque of manques) noterLeCranAbsent(manque.rampe, manque.cran, libelle);
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

  const attendusDuNeutre = [...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE] as readonly VariableDuTheme[];
  for (const prefixe of prefixes.values()) {
    const groupe = prefixe.segments.length > 0;
    if (groupe && ![...prefixe.presentes.keys()].some(estUneVariableDePalette)) continue;
    const jugees: readonly VariableDuTheme[] = groupe ? attendusDuNeutre : VARIABLES_GLOBALES;
    for (const [role, variable] of prefixe.presentes) {
      if (ignores.has(role) || !jugees.includes(role)) continue;
      for (const mode of modes) {
        const jugement = jugerLeCran(catalogue, index, groupe ? lesJumelles(catalogue, prefixe, mode) : undefined, role, variable, mode);
        if (!jugement) continue;
        if (jugement.constat) constats.push(jugement.constat);
        if (jugement.cranAbsent) noterLeCranAbsent(jugement.cranAbsent.rampe, jugement.cranAbsent.cran, [...prefixe.segments, role].join('/'));
      }
    }
  }

  for (const [cle, manque] of cransAbsents) {
    constats.push({
      id: `C82:cran-absent:${cle}`, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [],
      faits: { genre: 'cran-absent', rampe: manque.rampe.join('/'), cran: manque.cran, variables: manque.variables.join(', ') },
    });
  }
  return constats;
}

interface JugementDeCran { readonly constat?: Constat; readonly cranAbsent?: { readonly rampe: readonly string[]; readonly cran: number } }

const texteDeLaCible = (cible: CibleDeVariable): string => ('cran' in cible ? `le cran ${cible.cran}` : `la couleur ${cible.absolue}`);

/**
 * Le cran qu'une variable de `theme` vise dans un mode, contre celui que la table lui donne. Le sens de la palette vient de
 * toutes ses variables (`jumelles.vise`). Un sens inconnu ou ambigu ne tranche que si les deux sens donnent la même cible ; sinon
 * une cible lue dans l'une des deux tables passe sans bruit, et une cible lue dans aucune des deux devient une question.
 */
function jugerLeCran(
  catalogue: CatalogueDeReference, index: IndexDesCibles, jumelles: Jumelles | undefined,
  role: VariableDuTheme, variable: VariableDuCatalogue, mode: ModeLu,
): JugementDeCran | undefined {
  const lue = cibleLue(catalogue, variable, mode);
  const normal = cibleDeLaVariable(role, mode.ucm, 'normal');
  const inverse = cibleDeLaVariable(role, mode.ucm, 'inverse');
  if (!lue || !normal || !inverse || variable.distante) return undefined;
  const sens: SensDeduit = memeCible(normal, inverse) ? 'normal' : jumelles ? sensDeLaPalette(mode.ucm, jumelles.vise) : 'inconnu';
  const id = `C82:cran:${variable.cle}:${mode.id}`;
  const faits: Constat['faits'] = { genre: 'cran', variable: variable.nom, mode: mode.nom, avant: valeurVisee(lue.visee) };
  const constat: Constat = { id, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits };
  if (sens === 'ambigu' || sens === 'inconnu') {
    if (memeCible(lue.visee, normal) || memeCible(lue.visee, inverse)) return undefined;
    faits.attendu = `${valeurVisee(normal)} ou ${valeurVisee(inverse)}`;
    const candidats: { cle: string; nom: string }[] = [];
    for (const cible of [normal, inverse]) {
      const resolution = viser(catalogue, index, jumelles, lue, cible, mode, jumelles !== undefined);
      if (resolution.etat === 'trouvee' && !candidats.some(({ cle }) => cle === resolution.cible.cle)) candidats.push(resolution.cible);
    }
    if (candidats.length > 0) constat.question = { id, candidats, indice: 'UCM ne sait pas si cette palette met un texte blanc ou noir sur ses boutons.' };
    return { constat };
  }
  const attendue = sens === 'normal' ? normal : inverse;
  if (memeCible(lue.visee, attendue)) return undefined;
  faits.attendu = valeurVisee(attendue);
  const resolution = viser(catalogue, index, jumelles, lue, attendue, mode, jumelles !== undefined);
  if (resolution.etat === 'cran-absent') return { cranAbsent: { rampe: resolution.rampe, cran: resolution.cran } };
  if (resolution.etat === 'trouvee' && !lue.rampe.distante) {
    const sensDit = memeCible(normal, inverse) ? '' : ` dans le sens ${sens}`;
    constat.correction = {
      id, sorte: 'alias-de-mode', cible: { variable: variable.cle, mode: mode.id }, avant: lue.cible.cle,
      apres: { cle: resolution.cible.cle, nom: resolution.cible.nom },
      aRelire: { axes: { mode: mode.nom }, regle: `${role} vise ${texteDeLaCible(attendue)} en ${mode.nom}${sensDit}, d'après TABLE_DES_DOSSIERS.`, avant: lue.cible.cle },
    };
  }
  return { constat };
}

/**
 * La variable que vise une cible attendue : une couleur absolue de `utility/neutral`, ou le cran de la rampe que la variable lue
 * vise déjà. Une variable globale, ou une lecture absolue qui doit passer à un cran, cherche la rampe du neutre ou, dans un
 * groupe, l'unique rampe de ses jumelles.
 */
function viser(
  catalogue: CatalogueDeReference, index: IndexDesCibles, jumelles: Jumelles | undefined, lue: CibleLue, attendue: CibleDeVariable, mode: ModeLu, groupe: boolean,
): Resolution {
  if ('absolue' in attendue) return chercherDansUtility(catalogue, index, ['neutral', mode.ucm, attendue.absolue], attendue.absolue);
  if (!groupe) return chercherDansUtility(catalogue, index, ['neutral', mode.ucm, String(attendue.cran)], attendue.cran, attendue.cran);
  let rampe: Rampe | undefined = 'cran' in lue.visee ? lue.rampe : undefined;
  if (!rampe) {
    if (!jumelles || jumelles.rampes.size === 0) return { etat: 'sans-correction', raison: 'sans-jumelle', vise: attendue.cran };
    if (jumelles.rampes.size > 1) return { etat: 'sans-correction', raison: 'prefixes-multiples', vise: attendue.cran };
    rampe = [...jumelles.rampes.values()][0];
  }
  if (rampe.distante) return { etat: 'sans-correction', raison: 'cible-de-library', vise: attendue.cran };
  const trouvees = index.parChemin.get(`${rampe.collection}\0${formeDuChemin([...rampe.segments, String(attendue.cran)])}`) ?? [];
  if (trouvees.length === 0) return { etat: 'cran-absent', rampe: rampe.segments, cran: attendue.cran };
  return uneSeule(trouvees, attendue.cran);
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

/** Ce que l'alias d'une variable de `theme` vise dans un mode : un cran ou une couleur absolue d'une rampe de `brands` ou de `utility`. */
interface CibleLue {
  readonly cible: VariableDuCatalogue;
  readonly rampe: Rampe;
  readonly visee: CibleDeVariable;
}

/** `undefined` quand l'alias ne vise pas, dans la branche du même mode, un cran ou une couleur absolue : C60 juge la branche. */
function cibleLue(catalogue: CatalogueDeReference, variable: VariableDuCatalogue, mode: ModeLu): CibleLue | undefined {
  const valeur = variable.valeurs?.[mode.id];
  if (!valeur || !('alias' in valeur)) return undefined;
  const cible = variableParCle(catalogue, valeur.alias);
  if (!cible || cible.etat !== 'presente') return undefined;
  const collection = collectionParCle(catalogue, cible.collection);
  if (collection?.role !== 'brands' && collection?.role !== 'utility') return undefined;
  const chemin = cheminDansLaCollection(cible, catalogue);
  if (chemin.length < 2) return undefined;
  const dernier = chemin[chemin.length - 1];
  const segments = chemin.slice(0, -1);
  const modeDeLaCible = segments.map((segment) => modeDuThemeReconnu(segment)).find((reconnu) => reconnu !== undefined);
  if (modeDeLaCible !== mode.ucm) return undefined;
  const rampe = { collection: cible.collection, segments, distante: cible.distante === true };
  if (NOMBRE.test(dernier)) return { cible, rampe, visee: { cran: Number(dernier) } };
  const absolue = termeReconnu(REGISTRE_COULEURS_ABSOLUES, dernier)?.id;
  return absolue === 'white' || absolue === 'black' ? { cible, rampe, visee: { absolue } } : undefined;
}

/** Les variables du groupe qui visent une rampe de `brands` ou de `utility` dans ce mode, et ce qu'elles visent. */
function lesJumelles(catalogue: CatalogueDeReference, prefixe: Prefixe, mode: ModeLu): Jumelles {
  const connues = prefixe.jumelles.get(mode.ucm);
  if (connues) return connues;
  const rampes = new Map<string, Rampe>();
  const vise: Partial<Record<VariableDePalette, CibleDeVariable>> = {};
  for (const [role, variable] of prefixe.presentes) {
    if (variable.distante) continue;
    const lue = cibleLue(catalogue, variable, mode);
    if (!lue) continue;
    if ('cran' in lue.visee) {
      const cle = `${lue.rampe.collection}\0${formeDuChemin(lue.rampe.segments)}`;
      if (!rampes.has(cle)) rampes.set(cle, lue.rampe);
    }
    if (estUneVariableDePalette(role) && !(role in vise)) vise[role] = lue.visee;
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

function constatDeStructure(genre: string, id: string, faits: Constat['faits']): Constat {
  return { id: `C82:${genre}:${id}`, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: { genre, ...faits } };
}

/**
 * Les règles du profil UCM d'Architect sur le catalogue, par collection reconnue : couche visée, valeur directe, scopes d'une
 * couche sans portée, modes de `theme`, type et rangement d'une variable de palette. Les limites du profil ne se portent pas :
 * Nomenclature juge déjà les noms. `components` est jugé ici pour ses couches seulement ; C63 traite ses valeurs directes.
 */
function controlerLaStructure(catalogue: CatalogueDeReference, themes: readonly CollectionDuCatalogue[]): Constat[] {
  const constats: Constat[] = [];
  for (const theme of themes) {
    const reconnus = new Set(theme.modes.map(({ nom }) => modeDuThemeReconnu(nom)));
    const manques = (['light', 'dark'] as const).filter((mode) => !reconnus.has(mode));
    const manque = manques.length === 2 ? ['les-deux'] : manques;
    for (const m of manque) constats.push(constatDeStructure('mode-du-theme', `${theme.cle}:${m}`, { collection: theme.nom, manque: m }));
  }
  for (const variable of catalogue.variables) {
    if (variable.etat !== 'presente' || variable.distante) continue;
    const collection = collectionParCle(catalogue, variable.collection);
    const role = collection?.role;
    if (!collection || !role || collection.etat !== 'lue') continue;
    const nomDuMode = (id: string): string => collection.modes.find((mode) => mode.id === id)?.nom ?? id;
    if (variable.type === 'COLOR') {
      for (const [mode, valeur] of Object.entries(variable.valeurs ?? {})) {
        if ('alias' in valeur) {
          const cible = variableParCle(catalogue, valeur.alias);
          const coucheCible = cible && collectionParCle(catalogue, cible.collection)?.role;
          if (cible && coucheCible && !ciblesAdmises(role, 'couleur').includes(coucheCible)) {
            constats.push(constatDeStructure('couche', `${variable.cle}:${mode}`, { variable: variable.nom, mode: nomDuMode(mode), cible: cible.nom, coucheCible }));
          }
        } else if (valeur.valeur !== null && role !== 'primitives' && role !== 'components') {
          constats.push(constatDeStructure('valeur-directe', `${variable.cle}:${mode}`, { variable: variable.nom, mode: nomDuMode(mode) }));
        }
      }
      if ((COLLECTIONS_SANS_PORTEE as readonly string[]).includes(role) && variable.scopes && variable.scopes.length > 0) {
        const scopes = variable.scopes.join(',');
        const constat = constatDeStructure('scopes', variable.cle, { variable: variable.nom, scopes });
        constat.correction = {
          id: constat.id, sorte: 'scope', cible: { variable: variable.cle }, avant: scopes, apres: { nom: '' },
          aRelire: { regle: `Les variables de ${role} ne portent aucun scope (COLLECTIONS_SANS_PORTEE).`, avant: scopes },
        };
        constats.push(constat);
      }
    }
    if (role === 'theme') {
      if (variable.type !== 'COLOR' && variableDuThemeReconnue(variable.nom)) {
        constats.push(constatDeStructure('type', variable.cle, { variable: variable.nom, type: variable.type }));
      }
    } else if (role !== 'components' && variable.nom.includes('/')) {
      const reconnue = variableDuThemeReconnue(variable.nom);
      if (reconnue && estUneVariableDePalette(reconnue) && reconnue.includes('/')) {
        constats.push(constatDeStructure('mal-rangee', variable.cle, { variable: variable.nom, collection: collection.nom }));
      }
    }
  }
  return constats;
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
