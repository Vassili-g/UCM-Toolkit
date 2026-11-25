/**
 * Les contrôles d'intégrité UCM du catalogue, sans composant. C82 trouve les variables que le thème prévoit et que `theme` n'a
 * pas, et propose de les créer quand la règle et le fichier donnent un seul résultat. Il juge aussi le cran que chaque variable
 * de `theme` vise, puis les couches, les valeurs directes, les scopes, les modes, le type et le rangement des variables.
 *
 * Une création n'est jamais devinée : sans jumelle aliasée, sans sens établi, sans écriture choisie ou avec une cible de
 * library, le constat reste sans correction et dit pourquoi dans le fait `raison`. Un cran n'est corrigé que si le sens de la
 * palette est établi ou si les deux sens donnent la même cible ; sinon la question porte les deux candidats.
 *
 * C82 juge aussi les liens de `brands` et de `utility` vers `primitives` (P21) : il n'écrit jamais une couleur, seulement des alias.
 * Un lien absent ou faux reçoit sa correction quand les autres variables de la branche visent toutes la même palette et que
 * `primitives` porte le cran voulu ; une branche absente en entier donne une question sur la palette, sans réponse cochée ; un cran
 * ou une palette absente de `primitives` renvoie vers Palettes. `layout` et `typography` ne reçoivent aucun constat.
 */
import {
  NIVEAUX_D_ELEVATION_DU_THEME, SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES,
  cibleDeLaVariable, cranDeLaVariable,
  type CibleDeVariable, type ModeDuTheme, type SensDuTheme, type VariableDePalette, type VariableDuTheme,
} from '../emplois/dossiers.js';
import type { EcritureChoisie } from '../protocoles/nommage.js';
import {
  COLLECTIONS_SANS_PORTEE, FAMILLES_BRANDS, FAMILLES_PRIMITIVES, FAMILLES_UTILITY, REGISTRE_COULEURS_ABSOLUES, REGISTRE_ELEVATIONS, ciblesAdmises,
} from '../referentiel/architecture.js';
import type { Casse, Convention, Separateur } from '../referentiel/conventions.js';
import { assembler, decouperSegment, frontieres, motsAvecCasse } from '../referentiel/ecriture-des-mots.js';
import { collectionUcmReconnue } from '../referentiel/normalisation.js';
import { formeDuChemin, formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { CIBLES_DE_L_ELEVATION } from '../referentiel/reference.js';
import { distanceUnOuEchange, memeConcept } from '../referentiel/termes-connus.js';
import { CRANS, MODES, PROFILS, REGISTRE_MODES, REGISTRE_PROFILS, REGISTRE_STATUTS } from '../referentiel/vocabulaire.js';
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
export interface Prefixe {
  readonly segments: readonly string[];
  /** Le premier segment des noms du groupe quand ils redisent la collection (`theme/primary/…`) : la variable créée le garde. */
  readonly collectionEcrite: string | undefined;
  /** La première variable de chaque rôle ; les suivantes sont dans `doublons`. */
  readonly presentes: Map<VariableDuTheme, VariableDuCatalogue>;
  /** Les variables qui jouent un rôle déjà tenu par une autre du même groupe (Q-F2-6). */
  readonly doublons: { readonly role: VariableDuTheme; readonly variable: VariableDuCatalogue }[];
  /** Le dossier de chaque rôle (`surface`, `page`…), tel que le fichier l'écrit, par sa forme reconnue. */
  readonly dossiers: Map<string, string>;
  readonly jumelles: Map<ModeDuTheme, Jumelles>;
}

/**
 * Les rampes que visent les variables d'un groupe dans un mode, et les crans qu'elles visent. `vise` ne garde que les variables qui
 * suivent la rampe de leur palette : une variable sur la rampe d'une autre palette est dans `etrangeres` et ne vote pas pour le sens.
 */
export interface Jumelles {
  readonly rampes: Map<string, Rampe>;
  readonly vise: Partial<Record<VariableDePalette, CibleDeVariable>>;
  /** La rampe que la majorité nette des variables vise, quand il y en a une. */
  readonly principale?: Rampe;
  /** Les clés des variables qui visent une autre rampe que `principale`. */
  readonly etrangeres: ReadonlySet<string>;
}

export interface Rampe { readonly collection: string; readonly segments: readonly string[]; readonly distante: boolean }

export interface ModeLu { readonly id: string; readonly nom: string; readonly ucm: ModeDuTheme }

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

/** Ce que l'écran dit quand UCM ne sait pas quel texte, blanc ou noir, la palette met sur ses boutons. */
export const INDICE_CRAN_SANS_SENS = 'UCM ne sait pas si cette palette met un texte blanc ou noir sur ses boutons.';

/** Les contrôles d'intégrité UCM du catalogue, sans composant. Rend [] sans collection `theme`, `brands` ni `utility` lue. */
export function controlerLIntegriteUcm(catalogue: CatalogueDeReference, options: OptionsDIntegrite = {}): Constat[] {
  const themes = catalogue.collections.filter((collection) => collection.role === 'theme' && collection.etat === 'lue');
  const liens = controlerLesLiensDeCouleur(catalogue, options);
  if (themes.length === 0) return [...(fichierUcmSansTheme(catalogue) ? [themeNonReconnu()] : []), ...liens];
  const index = indexerLesCibles(catalogue);
  return [
    ...themes.flatMap((theme) => controlerUnTheme(catalogue, theme, index, options)),
    ...liens,
    ...controlerLaStructure(catalogue, themes),
    ...controlerLesThemesEnDouble(catalogue, themes),
  ];
}

/** Le fichier reconnaît au moins une collection UCM mais aucune `theme`. Sans aucun rôle reconnu, le fichier est libre : rien n'est dit. */
const fichierUcmSansTheme = (catalogue: CatalogueDeReference): boolean =>
  catalogue.collections.some((collection) => collection.role !== null) && !catalogue.collections.some((collection) => collection.role === 'theme');

/**
 * Aucune collection du fichier n'est reconnue comme `theme` (QV-4, N-88) : l'intégrité UCM n'est donc pas contrôlée. Une collection
 * `theme` inaccessible est reconnue, et ne donne pas cette information.
 */
function themeNonReconnu(): Constat {
  return { id: 'C82:theme-non-reconnu', code: 'C82', type: 'info', famille: 'liaisons', variants: [], layers: [], faits: { genre: 'theme-non-reconnu' } };
}

/** Un nom de copie que Figma ou le designer ajoute à la fin d'un nom de collection : `(copy)`, `(copie)`, `copy 2`, `(2)`. */
const SUFFIXE_DE_COPIE = /\s*(?:\((?:copy|copie)(?:\s*\d+)?\)|\(\d+\)|(?:copy|copie)(?:\s*\d+)?)\s*$/iu;

/**
 * Une collection `theme` de plus (Q-F2-5). La première collection `theme` du catalogue est la référence ; chaque collection `theme`
 * suivante, et chaque copie dont le nom ne diffère que par un suffixe de copie, reçoit un constat sans correction : le kit ne sait
 * pas laquelle le fichier veut garder.
 */
function controlerLesThemesEnDouble(catalogue: CatalogueDeReference, themes: readonly CollectionDuCatalogue[]): Constat[] {
  const [reference, ...suivants] = themes;
  const copies = catalogue.collections.filter((collection) => collection.role === null && collection.etat === 'lue'
    && SUFFIXE_DE_COPIE.test(collection.nom) && collectionUcmReconnue(collection.nom.replace(SUFFIXE_DE_COPIE, '')) === 'theme');
  return [...suivants, ...copies].map((collection) => constatDeStructure('theme-en-double', collection.cle, { collection: collection.nom, reference: reference.nom }));
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
  const modes = modesDuTheme(theme);
  const modeInconnu = modes.length < theme.modes.length;
  const { prefixes, collectionEcrite, inconnues, nonChargees } = lesPrefixes(catalogue, theme);
  const ignores = new Set<VariableDuTheme>(options.rolesIgnores ?? []);
  const ecriture = options.ecriture ?? null;
  const constats: Constat[] = [];
  const cransAbsents = new Map<string, CranAbsent>();

  const noterLeCranAbsent = (rampe: readonly string[], cran: number, libelle: string): void => {
    const cle = `${formeDuChemin(rampe)}/${cran}`;
    const connu = cransAbsents.get(cle);
    if (connu) connu.variables.push(libelle); else cransAbsents.set(cle, { rampe, cran, variables: [libelle] });
  };

  // Un nom proche d'un rôle (Q-F2-1) : la question passe avant la création du rôle, qui doublonnerait la variable fautive.
  // Un rôle que le fichier écrit pour une variable non chargée n'est pas absent : le kit ne l'a pas lue (N-31).
  const protegees = new Set<string>(nonChargees);
  for (const variable of inconnues) {
    const proches = rolesProches(catalogue, variable, prefixes, ignores);
    if (proches.length === 0) continue;
    for (const { role, prefixe } of proches) protegees.add(`${formeDuChemin(prefixe)}\0${role}`);
    const id = `C82:variable-inconnue:${variable.cle}`;
    constats.push({
      id, code: 'C82', type: 'verifier', famille: 'liaisons', variants: [], layers: [],
      faits: { genre: 'variable-inconnue', variable: variable.nom, roles: proches.map(({ role }) => role).join(', ') },
      question: { id, candidats: proches.map(({ nom }) => ({ nom })) },
    });
  }

  const absente = (prefixe: Prefixe, groupe: boolean, role: VariableDuTheme): void => {
    if (protegees.has(`${formeDuChemin(prefixe.segments)}\0${role}`)) return;
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
  const racine: Prefixe = prefixes.get('') ?? { segments: [], collectionEcrite, presentes: new Map(), doublons: [], dossiers: new Map(), jumelles: new Map() };
  const globales: readonly VariableDuTheme[] = [...VARIABLES_GLOBALES, ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau): VariableDuTheme => `elevation/${niveau}`)];
  for (const role of globales) if (!ignores.has(role) && !racine.presentes.has(role)) absente(racine, false, role);

  const attendusDuNeutre = [...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE] as readonly VariableDuTheme[];
  for (const prefixe of prefixes.values()) {
    const groupe = prefixe.segments.length > 0;
    if (groupe && ![...prefixe.presentes.keys()].some(estUneVariableDePalette)) continue;
    const jugees: readonly VariableDuTheme[] = groupe ? attendusDuNeutre : VARIABLES_GLOBALES;
    const juger = (role: VariableDuTheme, variable: VariableDuCatalogue): void => {
      for (const mode of modes) {
        const jugement = jugerLeCran(catalogue, index, groupe ? lesJumelles(catalogue, prefixe, mode) : undefined, role, variable, mode);
        if (!jugement) continue;
        if (jugement.constat) constats.push(jugement.constat);
        if (jugement.cranAbsent) noterLeCranAbsent(jugement.cranAbsent.rampe, jugement.cranAbsent.cran, [...prefixe.segments, role].join('/'));
      }
    };
    for (const [role, variable] of prefixe.presentes) if (!ignores.has(role) && jugees.includes(role)) juger(role, variable);
    // Un rôle écrit deux fois est jugé pour chacune de ses variables, puis une seule question réunit toutes celles qui le jouent (Q-F2-6, N-29).
    const rolesEnDouble = new Set(prefixe.doublons.map(({ role }) => role));
    for (const { role, variable } of prefixe.doublons) if (!ignores.has(role) && jugees.includes(role)) juger(role, variable);
    for (const role of rolesEnDouble) {
      if (ignores.has(role)) continue;
      const variables = [prefixe.presentes.get(role)!, ...prefixe.doublons.filter((entree) => entree.role === role).map((entree) => entree.variable)]
        .sort((a, b) => (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0));
      const formeDuGroupe = formeDuChemin(prefixe.segments);
      const id = `C82:role-en-double:${theme.cle}:${formeDuGroupe ? `${formeDuGroupe}/` : ''}${role}`;
      constats.push({
        id, code: 'C82', type: 'verifier', famille: 'liaisons', variants: [], layers: [],
        faits: { genre: 'role-en-double', variable: role, groupe: prefixe.segments.join('/'), variables: variables.length },
        question: { id, candidats: variables.map(({ cle, nom }) => ({ cle, nom })) },
      });
    }
    if (groupe) {
      for (const mode of modes) {
        if (lireLeSens(mode.ucm, lesJumelles(catalogue, prefixe, mode).vise) === 'partage') constats.push(constatDeSensPartage(catalogue, index, theme, prefixe, mode));
      }
    }
  }

  for (const [cle, manque] of cransAbsents) {
    constats.push({
      id: `C82:cran-absent:${theme.cle}:${cle}`, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [],
      faits: { genre: 'cran-absent', rampe: manque.rampe.join('/'), cran: manque.cran, variables: manque.variables.join(', ') },
    });
  }
  return constats;
}

/** Les modes de `theme` que l'écriture UCM reconnaît (`Light`, `dark`…), avec leur identifiant. */
export function modesDuTheme(theme: CollectionDuCatalogue): ModeLu[] {
  return theme.modes.flatMap((mode) => {
    const ucm = modeDuThemeReconnu(mode.nom);
    return ucm ? [{ id: mode.id, nom: mode.nom, ucm }] : [];
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Rôles proches (Q-F2-1)

type Proximite = 'exact' | 'proche';

/**
 * Les mots que le designer écrit pour un mot de rôle sans que le vocabulaire courant les relie : `text` pour `foreground`, `bg` pour
 * `default` (le fond d'un dossier), `focus` pour `ring`, `outline` pour `border`. `outline` reste hors de `SYNONYMES_COURANTS`, car
 * il nomme ailleurs un anneau de focus, un style ou `outline-weight` ; à la place d'un rôle du thème, il nomme le contour.
 * Les autres synonymes de rôle (`separator`, `muted`, `active`, `hovered`) viennent de `memeConcept`.
 */
const SYNONYMES_DE_ROLE: readonly (readonly string[])[] = [['foreground', 'text'], ['default', 'bg', 'background'], ['ring', 'focus'], ['border', 'outline']];

const memeMot = (lu: string, voulu: string): boolean =>
  lu === voulu || memeConcept(lu, voulu) || SYNONYMES_DE_ROLE.some((groupe) => groupe.includes(lu) && groupe.includes(voulu));

/**
 * Un segment qui n'est pas celui du rôle mais en reste proche : une lettre ajoutée, retirée, remplacée ou échangée, ou un
 * synonyme du vocabulaire ou de `SYNONYMES_DE_ROLE` (`hovered` pour `hover`, `outline` pour `border`). Un nombre n'est jamais proche (`scale/{cran}`).
 */
function proximiteDuSegment(segment: string, attendu: string): Proximite | undefined {
  const lu = formeReconnue(segment);
  const voulu = formeReconnue(attendu);
  if (lu === voulu) return 'exact';
  if (NOMBRE.test(lu)) return undefined;
  const motsLus = lu.split('-');
  const motsVoulus = voulu.split('-');
  if (motsLus.length === motsVoulus.length && motsLus.every((mot, rang) => memeMot(mot, motsVoulus[rang]))) return 'proche';
  if (lu.length < 3 || voulu.length < 4) return undefined;
  return distanceUnOuEchange(lu, voulu) ? 'proche' : undefined;
}

/** Le segment d'un rôle écrit comme le modèle : sa casse et son séparateur (`foreground-main` pour `Foreground-mian`). */
function ecrireCommeLeModele(modele: string, identifiant: string): string {
  const capitales = [...modele].filter((lettre) => lettre !== lettre.toLowerCase()).length;
  const premiereEnCapitale = /^\p{Lu}/u.test(modele);
  const casse: Casse = capitales === 0 ? 'minuscules' : premiereEnCapitale ? (capitales > 1 ? 'PascalCase' : 'initiale') : 'camelCase';
  const separateur: Separateur = modele.includes('_') ? 'tiret-bas' : modele.includes('-') ? 'tiret' : /\s/u.test(modele) ? 'espace'
    : frontieres(modele).includes('\0') ? 'camelCase' : 'tiret';
  return assembler(identifiant, motsAvecCasse(decouperSegment(identifiant), casse), separateur);
}

interface RoleProche { readonly role: VariableDuTheme; readonly prefixe: readonly string[]; readonly nom: string }

/**
 * Les rôles du thème dont une variable inconnue est proche, dans le même groupe : le dernier segment est proche et son dossier
 * exact, ou le dossier est proche et le dernier segment exact. Le groupe est une palette connue ou la racine (variables globales).
 * Une variable loin de tout rôle ne donne rien.
 */
function rolesProches(
  catalogue: CatalogueDeReference, variable: VariableDuCatalogue, prefixes: ReadonlyMap<string, Prefixe>, ignores: ReadonlySet<VariableDuTheme>,
): RoleProche[] {
  const chemin = cheminDansLaCollection(variable, catalogue);
  const segmentsDuNom = variable.nom.split('/');
  const trouves: RoleProche[] = [];
  for (const longueur of [1, 2]) {
    if (chemin.length < longueur) continue;
    const prefixe = chemin.slice(0, chemin.length - longueur);
    const groupe = prefixes.get(formeDuChemin(prefixe));
    let roles: readonly VariableDuTheme[];
    if (prefixe.length === 0) roles = [...VARIABLES_GLOBALES, ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau): VariableDuTheme => `elevation/${niveau}`)];
    else if (groupe && [...groupe.presentes.keys()].some(estUneVariableDePalette)) {
      roles = estLeNeutre(prefixe) ? [...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE.filter((role) => !role.startsWith('scale/'))] : VARIABLES_DE_PALETTE;
    } else continue;
    const queue = chemin.slice(chemin.length - longueur);
    for (const role of roles) {
      const attendus = role.split('/');
      if (attendus.length !== longueur || ignores.has(role)) continue;
      const proximites = attendus.map((attendu, rang) => proximiteDuSegment(queue[rang], attendu));
      const proches = proximites.filter((proximite) => proximite === 'proche').length;
      if (proximites.some((proximite) => proximite === undefined) || proches !== 1) continue;
      const debut = segmentsDuNom.length - longueur;
      const nom = [...segmentsDuNom.slice(0, debut), ...attendus.map((attendu, rang) => (proximites[rang] === 'exact' ? segmentsDuNom[debut + rang] : ecrireCommeLeModele(segmentsDuNom[debut + rang], attendu)))].join('/');
      trouves.push({ role, prefixe, nom });
    }
  }
  return trouves;
}

/** Le blanc et le noir de `utility/neutral` dans le mode : les deux réponses à une question sur le texte des boutons. */
function candidatsDuTexteDesBoutons(catalogue: CatalogueDeReference, index: IndexDesCibles, mode: ModeLu): { cle: string; nom: string }[] {
  return (['white', 'black'] as const).flatMap((absolue) => {
    const resolution = chercherDansUtility(catalogue, index, ['neutral', mode.ucm, absolue], absolue);
    return resolution.etat === 'trouvee' ? [resolution.cible] : [];
  });
}

/** La palette dont les variables se répartissent entre les deux sens (Q-F2-3) : la question porte le texte des boutons, jamais une correction. */
function constatDeSensPartage(catalogue: CatalogueDeReference, index: IndexDesCibles, theme: CollectionDuCatalogue, prefixe: Prefixe, mode: ModeLu): Constat {
  const groupe = prefixe.segments.join('/');
  const id = `C82:sens-partage:${theme.cle}:${formeDuChemin(prefixe.segments)}:${mode.id}`;
  return {
    id, code: 'C82', type: 'verifier', famille: 'liaisons', variants: [], layers: [],
    faits: { genre: 'sens-partage', variable: groupe, groupe, mode: mode.nom },
    question: { id, candidats: candidatsDuTexteDesBoutons(catalogue, index, mode) },
  };
}

/**
 * Une variable sur la rampe d'une autre palette (Q-F2-2) : le kit ne devine pas la palette voulue. La question propose la même
 * nuance dans la rampe de la palette, quand elle existe, et la rampe actuelle.
 */
function constatDeRampeEtrangere(index: IndexDesCibles, jumelles: Jumelles, variable: VariableDuCatalogue, mode: ModeLu, lue: CibleLue): Constat {
  const principale = jumelles.principale!;
  const id = `C82:rampe-autre-palette:${variable.cle}:${mode.id}`;
  const cran = 'cran' in lue.visee ? lue.visee.cran : undefined;
  const propres = cran === undefined ? [] : index.parChemin.get(`${principale.collection}\0${formeDuChemin([...principale.segments, String(cran)])}`) ?? [];
  const candidats = [...(propres.length === 1 && !propres[0].distante ? [propres[0]] : []), lue.cible].map(({ cle, nom }) => ({ cle, nom }));
  return {
    id, code: 'C82', type: 'verifier', famille: 'liaisons', variants: [], layers: [],
    faits: { genre: 'rampe-autre-palette', variable: variable.nom, mode: mode.nom, rampe: lue.rampe.segments.join('/'), rampeDeLaPalette: principale.segments.join('/') },
    question: { id, candidats },
  };
}

interface JugementDeCran { readonly constat?: Constat; readonly cranAbsent?: { readonly rampe: readonly string[]; readonly cran: number } }

const texteDeLaCible = (cible: CibleDeVariable): string => ('cran' in cible ? `le cran ${cible.cran}` : `la couleur ${cible.absolue}`);

/** Le sens que les crans d'une palette établissent dans un mode : `partage` quand les variables se répartissent entre les deux tables. */
export type SensLu = SensDuTheme | 'partage' | 'inconnu';

/**
 * Le sens d'une palette dans un mode, lu sur les crans de ses variables (Q-F2-3). Une variable dont le cran diffère entre les deux
 * tables vote pour le sens dont la table donne son cran ; une variable sur aucune des deux ne vote pas, ni `solid/foreground`, dont
 * la couleur est un choix du designer. Les votes d'un seul sens établissent ce sens. Une minorité d'une voix contre trois au
 * moins est une variable déplacée, et le sens reste celui de la majorité ; au-delà, la palette est `partage`.
 */
export function lireLeSens(mode: ModeDuTheme, vise: Jumelles['vise']): SensLu {
  let normal = 0;
  let inverse = 0;
  for (const [variable, cible] of Object.entries(vise) as [VariableDePalette, CibleDeVariable][]) {
    if (variable === 'solid/foreground' || !('cran' in cible)) continue;
    const pourLeNormal = cranDeLaVariable(variable, mode, 'normal');
    const pourLInverse = cranDeLaVariable(variable, mode, 'inverse');
    if (pourLeNormal === pourLInverse) continue;
    if (cible.cran === pourLeNormal) normal += 1;
    else if (cible.cran === pourLInverse) inverse += 1;
  }
  if (normal + inverse === 0) return 'inconnu';
  if (inverse === 0) return 'normal';
  if (normal === 0) return 'inverse';
  const majorite: SensDuTheme = normal > inverse ? 'normal' : 'inverse';
  return Math.max(normal, inverse) >= 3 && Math.min(normal, inverse) === 1 ? majorite : 'partage';
}

/**
 * Le cran qu'une variable de `theme` vise dans un mode, contre celui que la table lui donne. Le sens de la palette vient des
 * variables qui suivent sa rampe (`jumelles.vise`). Un sens inconnu ou partagé ne tranche que si les deux sens donnent la même
 * cible ; sinon une cible lue dans l'une des deux tables passe sans bruit (la palette partagée a sa propre question), et une cible
 * lue dans aucune des deux devient une question. Une variable sur la rampe d'une autre palette est une question de rampe, jamais un
 * cran. Le texte des boutons ne reçoit jamais de correction : à contre-sens des crans, il devient une question à deux réponses.
 */
function jugerLeCran(
  catalogue: CatalogueDeReference, index: IndexDesCibles, jumelles: Jumelles | undefined,
  role: VariableDuTheme, variable: VariableDuCatalogue, mode: ModeLu,
): JugementDeCran | undefined {
  const lue = cibleLue(catalogue, variable, mode);
  const normal = cibleDeLaVariable(role, mode.ucm, 'normal');
  const inverse = cibleDeLaVariable(role, mode.ucm, 'inverse');
  if (!lue || !normal || !inverse || variable.distante) return undefined;
  if (jumelles?.principale && jumelles.etrangeres.has(variable.cle)) return { constat: constatDeRampeEtrangere(index, jumelles, variable, mode, lue) };
  const sens: SensLu = memeCible(normal, inverse) ? 'normal' : jumelles ? lireLeSens(mode.ucm, jumelles.vise) : 'inconnu';
  const id = `C82:cran:${variable.cle}:${mode.id}`;
  const faits: Constat['faits'] = { genre: 'cran', variable: variable.nom, mode: mode.nom, avant: valeurVisee(lue.visee) };
  const constat: Constat = { id, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits };
  if (role === 'solid/foreground') {
    if (sens !== 'normal' && sens !== 'inverse') return undefined;
    const attendue = sens === 'normal' ? normal : inverse;
    if (memeCible(lue.visee, attendue)) return undefined;
    faits.attendu = valeurVisee(attendue);
    constat.type = 'verifier';
    constat.question = { id, candidats: candidatsDuTexteDesBoutons(catalogue, index, mode) };
    return { constat };
  }
  if (sens === 'partage' || sens === 'inconnu') {
    if (memeCible(lue.visee, normal) || memeCible(lue.visee, inverse)) return undefined;
    faits.attendu = `${valeurVisee(normal)} ou ${valeurVisee(inverse)}`;
    const candidats: { cle: string; nom: string }[] = [];
    for (const cible of [normal, inverse]) {
      const resolution = viser(catalogue, index, jumelles, lue, cible, mode, jumelles !== undefined);
      if (resolution.etat === 'trouvee' && !candidats.some(({ cle }) => cle === resolution.cible.cle)) candidats.push(resolution.cible);
    }
    if (candidats.length > 0) constat.question = { id, candidats, indice: INDICE_CRAN_SANS_SENS };
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
export function lesPrefixes(
  catalogue: CatalogueDeReference, theme: CollectionDuCatalogue,
): { prefixes: Map<string, Prefixe>; collectionEcrite: string | undefined; inconnues: VariableDuCatalogue[]; nonChargees: Set<string> } {
  const prefixes = new Map<string, Prefixe>();
  const inconnues: VariableDuCatalogue[] = [];
  /** Les rôles des variables de `theme` que le fichier nomme sans que le kit les ait lues : `forme du préfixe`, nul, rôle. */
  const nonChargees = new Set<string>();
  let collectionDuTheme: string | undefined;
  let premiere = true;
  for (const variable of catalogue.variables) {
    if (variable.collection !== theme.cle) continue;
    if (variable.etat === 'non-chargee') {
      const roleNonLu = variableDuThemeReconnue(variable.nom);
      const cheminNonLu = cheminDansLaCollection(variable, catalogue);
      const longueurNonLue = roleNonLu?.split('/').length ?? 0;
      if (roleNonLu && cheminNonLu.length >= longueurNonLue) nonChargees.add(`${formeDuChemin(cheminNonLu.slice(0, cheminNonLu.length - longueurNonLue))}\0${roleNonLu}`);
      continue;
    }
    if (variable.etat !== 'presente') continue;
    const role = variableDuThemeReconnue(variable.nom);
    if (!role) {
      if (!variable.distante) inconnues.push(variable);
      continue;
    }
    const chemin = cheminDansLaCollection(variable, catalogue);
    const longueur = role.split('/').length;
    if (chemin.length < longueur) continue;
    const segments = chemin.slice(0, chemin.length - longueur);
    const collectionEcrite = variable.nom.split('/').length > chemin.length ? variable.nom.split('/')[0] : undefined;
    if (premiere) { collectionDuTheme = collectionEcrite; premiere = false; }
    const forme = formeDuChemin(segments);
    let prefixe = prefixes.get(forme);
    if (!prefixe) {
      prefixe = { segments, collectionEcrite, presentes: new Map(), doublons: [], dossiers: new Map(), jumelles: new Map() };
      prefixes.set(forme, prefixe);
    }
    if (!prefixe.presentes.has(role)) prefixe.presentes.set(role, variable);
    else prefixe.doublons.push({ role, variable });
    if (longueur > 1) {
      const dossier = chemin[segments.length];
      const formeDuDossier = formeReconnue(dossier);
      if (!prefixe.dossiers.has(formeDuDossier)) prefixe.dossiers.set(formeDuDossier, dossier);
    }
  }
  return { prefixes, collectionEcrite: collectionDuTheme, inconnues, nonChargees };
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

/**
 * Les variables du groupe qui visent une rampe de `brands` ou de `utility` dans ce mode, et ce qu'elles visent. La rampe de la
 * palette est celle que trois variables au moins visent, avec plus du double de voix que toutes les autres rampes ensemble ; une
 * variable sur une autre rampe est étrangère et ne vote pas pour le sens.
 */
export function lesJumelles(catalogue: CatalogueDeReference, prefixe: Prefixe, mode: ModeLu): Jumelles {
  const connues = prefixe.jumelles.get(mode.ucm);
  if (connues) return connues;
  const rampes = new Map<string, Rampe>();
  const comptes = new Map<string, number>();
  const lues: { role: VariableDuTheme; variable: VariableDuCatalogue; visee: CibleDeVariable; rampe: string | undefined }[] = [];
  for (const [role, variable] of prefixe.presentes) {
    if (variable.distante) continue;
    const lue = cibleLue(catalogue, variable, mode);
    if (!lue) continue;
    let cleDeRampe: string | undefined;
    if ('cran' in lue.visee) {
      cleDeRampe = `${lue.rampe.collection}\0${formeDuChemin(lue.rampe.segments)}`;
      if (!rampes.has(cleDeRampe)) rampes.set(cleDeRampe, lue.rampe);
      comptes.set(cleDeRampe, (comptes.get(cleDeRampe) ?? 0) + 1);
    }
    lues.push({ role, variable, visee: lue.visee, rampe: cleDeRampe });
  }
  const [premiere] = [...comptes].sort((a, b) => b[1] - a[1]);
  const autres = premiere ? [...comptes.values()].reduce((somme, voix) => somme + voix, 0) - premiere[1] : 0;
  const cleDeLaPrincipale = premiere && premiere[1] >= 3 && premiere[1] > 2 * autres ? premiere[0] : undefined;
  const vise: Partial<Record<VariableDePalette, CibleDeVariable>> = {};
  const etrangeres = new Set<string>();
  for (const { role, variable, visee, rampe } of lues) {
    if (cleDeLaPrincipale !== undefined && rampe !== undefined && rampe !== cleDeLaPrincipale) etrangeres.add(variable.cle);
    else if (estUneVariableDePalette(role) && !(role in vise)) vise[role] = visee;
  }
  const jumelles: Jumelles = { rampes, vise, etrangeres, ...(cleDeLaPrincipale === undefined ? {} : { principale: rampes.get(cleDeLaPrincipale) }) };
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
    const sens = jumelles ? lireLeSens(mode.ucm, jumelles.vise) : 'inconnu';
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

// ---------------------------------------------------------------------------------------------------------------------------
// Les liens de couleur de `brands` et de `utility` vers `primitives` (P21, partie 4 de la proposition)
//
// Le contrôle ne crée jamais de couleur : il lit des alias vers `primitives` et ne propose que des alias. Une branche est une famille
// de `brands` (`primary`, `secondary`) dans un mode de marque, ou une famille de `utility`, avec ses thèmes et ses profils.

type FinDeCran = number | 'white' | 'black';

/** Ce qu'une variable de `primitives` désigne dans sa palette : un profil facultatif, un thème (absent pour `white` et `black`), un cran ou une absolue. */
interface Cible { readonly profil?: string; readonly theme?: ModeDuTheme; readonly fin: FinDeCran }

interface LuDePrimitive extends Cible { readonly palette: string; readonly nom: string; readonly variable: VariableDuCatalogue }

interface PaletteDePrimitives { readonly nom: string; readonly cellules: Map<string, LuDePrimitive> }

interface Cellule { readonly chemin: readonly string[]; readonly cible: Cible }

interface Branche {
  readonly id: string;
  /** `palette` : la palette se lit sur les alias de la branche. `elevation` : c'est celle du neutre, jamais une question. */
  readonly sorte: 'palette' | 'elevation';
  readonly cellules: readonly Cellule[];
}

type Lecture =
  | { readonly etat: 'manquant' }
  | { readonly etat: 'inconnu' }
  | { readonly etat: 'alias'; readonly lu: LuDePrimitive };

type Verdict =
  | { readonly etat: 'ok' }
  | { readonly etat: 'cible'; readonly cible: LuDePrimitive }
  | { readonly etat: 'rampe'; readonly palette: PaletteDePrimitives; readonly manque: string }
  | { readonly etat: 'sans-correction'; readonly raison: string };

interface IndexDesLiens {
  /** Les variables de `primitives` qui portent une couleur de palette, par clé de variable. */
  readonly primitives: Map<string, LuDePrimitive>;
  readonly palettes: Map<string, PaletteDePrimitives>;
  /** Les variables de `brands` et de `utility` (toutes celles que le fichier nomme), par collection et chemin canonique. */
  readonly parChemin: Map<string, VariableDuCatalogue>;
  /** Un segment canonique tel que le fichier l'écrit, par collection : une variable créée reprend l'écriture de ses voisines. */
  readonly ecrites: Map<string, string>;
  readonly collectionEcrite: Map<string, string | undefined>;
}

interface NoteDeRampe { readonly collection: CollectionDuCatalogue; readonly palette: PaletteDePrimitives; readonly manques: Set<string>; readonly cellules: Set<string> }

interface ModeDeLien { readonly id: string; readonly nom: string }

const ABSOLUES = REGISTRE_COULEURS_ABSOLUES.termes.map((terme) => terme.id as 'white' | 'black');
const STATUTS = REGISTRE_STATUTS.termes.map((terme) => terme.id);
const FAMILLES_DE_MARQUE = FAMILLES_BRANDS.termes.map((terme) => terme.id).filter((famille) => famille !== 'identity');
const REGISTRES_DES_LIENS = [FAMILLES_UTILITY, FAMILLES_BRANDS, REGISTRE_PROFILS, REGISTRE_MODES, REGISTRE_COULEURS_ABSOLUES, REGISTRE_ELEVATIONS] as const;

const cellulesDeCrans = (prefixe: readonly string[], profil: string | undefined): Cellule[] => MODES.flatMap((theme) => CRANS.map((cran): Cellule => ({
  chemin: [...prefixe, ...(profil === undefined ? [] : [profil]), theme, String(cran)], cible: { ...(profil === undefined ? {} : { profil }), theme, fin: cran },
})));

const BRANCHES = {
  brands: FAMILLES_DE_MARQUE.map((famille): Branche => ({ id: famille, sorte: 'palette', cellules: cellulesDeCrans([famille], undefined) })),
  utility: [
    {
      id: 'neutral', sorte: 'palette',
      cellules: [
        ...cellulesDeCrans(['neutral'], undefined),
        ...MODES.flatMap((theme) => ABSOLUES.map((absolue): Cellule => ({ chemin: ['neutral', theme, absolue], cible: { fin: absolue } }))),
      ],
    },
    ...STATUTS.map((statut): Branche => ({
      id: statut, sorte: 'palette', cellules: PROFILS.flatMap((profil) => cellulesDeCrans([statut], profil)),
    })),
    {
      id: 'elevation', sorte: 'elevation',
      cellules: MODES.flatMap((theme) => (Object.keys(CIBLES_DE_L_ELEVATION) as (keyof typeof CIBLES_DE_L_ELEVATION)[]).map((niveau): Cellule => {
        const cible = CIBLES_DE_L_ELEVATION[niveau][theme];
        return { chemin: ['elevation', theme, niveau], cible: 'cran' in cible ? { theme, fin: cible.cran } : { fin: cible.absolue } };
      })),
    },
  ],
} satisfies Readonly<Record<string, readonly Branche[]>>;

/** Les collections dont C82 juge les liens vers `primitives`. */
type CollectionDeLien = keyof typeof BRANCHES;

const canoniqueDuSegment = (segment: string): string => {
  for (const registre of REGISTRES_DES_LIENS) {
    const terme = termeReconnu(registre, segment);
    if (terme) return terme.id;
  }
  return formeReconnue(segment);
};

const texteDeLaPrimitive = (cible: Cible): string => [cible.profil, cible.theme, cible.fin].filter((partie) => partie !== undefined).join('/');
const cleDeLaCible = (cible: Cible): string => `${cible.profil ?? ''}|${cible.theme ?? ''}|${cible.fin}`;

/** Lit le chemin d'une variable de `primitives` : `color/<palette>/[<profil>/]<thème>/<cran>` ou `color/<palette>/white|black`. Les thèmes en modes ne sont pas lus. */
function lireLaPrimitive(segments: readonly string[], variable: VariableDuCatalogue): LuDePrimitive | undefined {
  if (segments.length < 3 || termeReconnu(FAMILLES_PRIMITIVES, segments[0])?.id !== 'color') return undefined;
  const reste = segments.slice(2);
  const dernier = reste[reste.length - 1];
  const palette = { palette: formeReconnue(segments[1]), nom: segments[1], variable };
  if (reste.length === 1) {
    const absolue = termeReconnu(REGISTRE_COULEURS_ABSOLUES, dernier)?.id;
    return absolue === 'white' || absolue === 'black' ? { ...palette, fin: absolue } : undefined;
  }
  if (!NOMBRE.test(dernier) || reste.length > 3) return undefined;
  const theme = modeDuThemeReconnu(reste[reste.length - 2]);
  const profil = reste.length === 3 ? termeReconnu(REGISTRE_PROFILS, reste[0])?.id : undefined;
  if (!theme || (reste.length === 3 && !profil)) return undefined;
  return { ...palette, ...(profil === undefined ? {} : { profil }), theme, fin: Number(dernier) };
}

function indexerLesLiens(catalogue: CatalogueDeReference): IndexDesLiens {
  const index: IndexDesLiens = { primitives: new Map(), palettes: new Map(), parChemin: new Map(), ecrites: new Map(), collectionEcrite: new Map() };
  for (const variable of catalogue.variables) {
    const collection = collectionParCle(catalogue, variable.collection);
    if (!collection || collection.etat !== 'lue') continue;
    const chemin = cheminDansLaCollection(variable, catalogue);
    if (collection.role === 'primitives') {
      if (variable.etat !== 'presente') continue;
      const lu = lireLaPrimitive(chemin, variable);
      if (!lu) continue;
      index.primitives.set(variable.cle, lu);
      let palette = index.palettes.get(lu.palette);
      if (!palette) { palette = { nom: lu.nom, cellules: new Map() }; index.palettes.set(lu.palette, palette); }
      if (!palette.cellules.has(cleDeLaCible(lu))) palette.cellules.set(cleDeLaCible(lu), lu);
    } else if (collection.role === 'brands' || collection.role === 'utility') {
      const canonique = chemin.map(canoniqueDuSegment);
      const cle = `${collection.cle}\0${canonique.join('/')}`;
      if (!index.parChemin.has(cle)) index.parChemin.set(cle, variable);
      chemin.forEach((segment, rang) => {
        const cleDuSegment = `${collection.cle}\0${canonique[rang]}`;
        if (!index.ecrites.has(cleDuSegment)) index.ecrites.set(cleDuSegment, segment);
      });
      if (!index.collectionEcrite.has(collection.cle)) index.collectionEcrite.set(collection.cle, variable.nom.split('/').length > chemin.length ? variable.nom.split('/')[0] : undefined);
    }
  }
  return index;
}

const variableDeLaCellule = (index: IndexDesLiens, collection: CollectionDuCatalogue, chemin: readonly string[]): VariableDuCatalogue | undefined =>
  index.parChemin.get(`${collection.cle}\0${chemin.join('/')}`);

/**
 * Ce qu'une variable porte dans un mode. `manquant` : la variable n'existe pas, ou le mode n'a aucune valeur alors que le fichier en lit
 * d'autres. `inconnu` : valeurs non lues, valeur directe, variable de library ou alias hors de `primitives` : un autre contrôle les juge,
 * et elles ne votent pas pour la palette.
 */
function lireLeLien(index: IndexDesLiens, variable: VariableDuCatalogue | undefined, mode: ModeDeLien): Lecture {
  if (!variable) return { etat: 'manquant' };
  if (variable.etat !== 'presente' || variable.distante || variable.valeurs === undefined) return { etat: 'inconnu' };
  const valeur = variable.valeurs[mode.id];
  if (valeur === undefined) return { etat: 'manquant' };
  const lu = 'alias' in valeur ? index.primitives.get(valeur.alias) : undefined;
  return lu ? { etat: 'alias', lu } : { etat: 'inconnu' };
}

interface ContexteDeBranche {
  readonly variables: (VariableDuCatalogue | undefined)[];
  readonly lectures: Lecture[];
  /** Les palettes que les alias de la branche visent, avec leur nombre de voix. */
  readonly votes: Map<string, number>;
}

function contexteDeLaBranche(index: IndexDesLiens, collection: CollectionDuCatalogue, branche: Branche, mode: ModeDeLien): ContexteDeBranche {
  const variables = branche.cellules.map((cellule) => variableDeLaCellule(index, collection, cellule.chemin));
  const lectures = variables.map((variable) => lireLeLien(index, variable, mode));
  const votes = new Map<string, number>();
  for (const lecture of lectures) if (lecture.etat === 'alias') votes.set(lecture.lu.palette, (votes.get(lecture.lu.palette) ?? 0) + 1);
  return { variables, lectures, votes };
}

const paletteUnique = (votes: ReadonlyMap<string, number>): string | undefined => (votes.size === 1 ? [...votes.keys()][0] : undefined);

/** Les palettes que visent les autres cellules de la branche : celles-là seules disent la palette voulue pour la cellule jugée. */
function palettesDesAutres(contexte: ContexteDeBranche, rang: number): Set<string> {
  const propre = contexte.lectures[rang];
  const autres = new Set<string>();
  for (const [palette, voix] of contexte.votes) if (voix - (propre.etat === 'alias' && propre.lu.palette === palette ? 1 : 0) > 0) autres.add(palette);
  return autres;
}

/**
 * Le verdict d'une cellule. Les autres cellules de la branche doivent viser toutes la même palette, ou aucune (la cellule jugée donne alors
 * la sienne). Une cellule sur une autre palette que les autres, ou une branche qui en vise plusieurs, ne reçoit jamais de correction.
 * `elevation` passe la palette du neutre comme seule autre palette.
 */
function jugerLaCellule(index: IndexDesLiens, cellule: Cellule, lecture: Lecture, autres: ReadonlySet<string>): Verdict {
  const lu = lecture.etat === 'alias' ? lecture.lu : undefined;
  if (lu && autres.size === 1 && !autres.has(lu.palette)) return { etat: 'sans-correction', raison: 'autre-palette' };
  if (lu && cleDeLaCible(lu) === cleDeLaCible(cellule.cible)) return { etat: 'ok' };
  let nomDeLaPalette: string;
  if (autres.size === 1) [nomDeLaPalette] = [...autres];
  else if (autres.size === 0 && lu) nomDeLaPalette = lu.palette;
  else return { etat: 'sans-correction', raison: autres.size === 0 ? 'sans-palette' : 'palettes-multiples' };
  const palette = index.palettes.get(nomDeLaPalette)!;
  const attendue = palette.cellules.get(cleDeLaCible(cellule.cible));
  if (!attendue) return { etat: 'rampe', palette, manque: texteDeLaPrimitive(cellule.cible) };
  if (attendue.variable.distante) return { etat: 'sans-correction', raison: 'cible-de-library' };
  return { etat: 'cible', cible: attendue };
}

/** Les palettes de `primitives` qui portent toutes les variables que la branche attend, sans variable de library. */
function palettesCandidates(index: IndexDesLiens, branche: Branche): PaletteDePrimitives[] {
  return [...index.palettes.values()]
    .filter((palette) => branche.cellules.every((cellule) => { const lu = palette.cellules.get(cleDeLaCible(cellule.cible)); return lu !== undefined && !lu.variable.distante; }))
    .sort((a, b) => (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0));
}

function ecrireLeNomDuLien(index: IndexDesLiens, collection: CollectionDuCatalogue, chemin: readonly string[], ecriture: EcritureChoisie): string {
  const debut = index.collectionEcrite.get(collection.cle);
  const segments = chemin.map((segment, rang) => index.ecrites.get(`${collection.cle}\0${segment}`) ?? ecrire(segment, rang === chemin.length - 1 ? ecriture.variables : ecriture.groupes));
  return [...(debut ? [debut] : []), ...segments].join('/');
}

const colonne = (collection: CollectionDuCatalogue, mode: ModeDeLien, faits: Constat['faits']): Constat['faits'] => ({
  collection: collection.nom, mode: mode.nom, ...faits, cleDeCollection: collection.cle, idDuMode: mode.id,
});

const regleDuLien = (variable: string, cible: Cible, palette: string): string =>
  `${variable} vise ${texteDeLaPrimitive(cible)} de la palette ${palette}, comme les autres variables de sa branche.`;

/** `variable` : l'alias d'un mode d'une variable qui existe. Sans elle : la création de la variable, avec son alias dans chaque mode donné, jamais de scope. */
function correctionDeLien(
  constat: Constat, collection: CollectionDuCatalogue, variable: VariableDuCatalogue | undefined, nom: string | undefined,
  alias: Record<string, { cle: string; nom: string }>, avant: string | null, regle: string,
): Correction | undefined {
  const [[idDuMode, cible] = []] = Object.entries(alias);
  if (!idDuMode || !cible) return undefined;
  if (variable) {
    const mode = collection.modes.find(({ id }) => id === idDuMode)!;
    return { id: constat.id, sorte: 'alias-de-mode', cible: { variable: variable.cle, mode: idDuMode }, avant, apres: { cle: cible.cle, nom: cible.nom }, aRelire: { axes: { mode: mode.nom }, regle, avant } };
  }
  if (!nom) return undefined;
  return {
    id: constat.id, sorte: 'variable', cible: {}, avant: null, apres: { nom, collection: collection.nom }, aRelire: { regle, avant: null },
    creation: { collection: collection.cle, nom, type: 'COLOR', scopes: [], alias },
  };
}

function notePourLaRampe(notes: Map<string, NoteDeRampe>, collection: CollectionDuCatalogue, palette: PaletteDePrimitives, manque: string, cellule: string): void {
  const cle = `${collection.cle}\0${formeReconnue(palette.nom)}`;
  let note = notes.get(cle);
  if (!note) { note = { collection, palette, manques: new Set(), cellules: new Set() }; notes.set(cle, note); }
  note.manques.add(manque);
  note.cellules.add(cellule);
}

const constatDeLien = (id: string, type: Constat['type'], faits: Constat['faits']): Constat => ({ id, code: 'C82', type, famille: 'liaisons', variants: [], layers: [], faits });

/**
 * Les liens de `brands` et de `utility` vers `primitives`, collection par collection et mode par mode. Une cellule sans lien reçoit la
 * création de son alias quand les autres cellules de sa branche visent toutes la même palette et que `primitives` porte le cran voulu ;
 * un lien qui vise le mauvais cran ou le mauvais thème de cette palette reçoit un alias corrigé. Une branche absente en entier donne une
 * question sur la palette, sans réponse cochée. Un cran ou une palette absente de `primitives` renvoie vers Palettes, sans correction.
 * Une variable qui vise une autre palette que ses voisines reste telle quelle, avec son constat.
 */
function controlerLesLiensDeCouleur(catalogue: CatalogueDeReference, options: OptionsDIntegrite): Constat[] {
  const collections = catalogue.collections.filter((collection): collection is CollectionDuCatalogue & { role: CollectionDeLien } =>
    (collection.role === 'brands' || collection.role === 'utility') && collection.etat === 'lue' && collection.modes.length > 0);
  if (collections.length === 0) return [];
  const index = indexerLesLiens(catalogue);
  const ecriture = options.ecriture ?? null;
  const constats: Constat[] = [];
  const notes = new Map<string, NoteDeRampe>();

  for (const collection of collections) {
    const branches = BRANCHES[collection.role];
    const contextes = new Map<string, ContexteDeBranche[]>();
    for (const branche of branches) contextes.set(branche.id, collection.modes.map((mode) => contexteDeLaBranche(index, collection, branche, mode)));
    const neutre = contextes.get('neutral')?.map(({ votes }) => paletteUnique(votes));

    for (const branche of branches) {
      const parMode = contextes.get(branche.id)!;
      const ecartes = new Set<number>();
      if (branche.sorte === 'palette') {
        collection.modes.forEach((mode, m) => {
          if (!parMode[m].lectures.every(({ etat }) => etat === 'manquant')) return;
          ecartes.add(m);
          constats.push(constatDeLaBrancheAbsente(index, collection, branche, mode));
        });
      }
      const autresDuMode = (m: number, rang: number): ReadonlySet<string> | undefined => {
        if (branche.sorte === 'palette') return palettesDesAutres(parMode[m], rang);
        const palette = neutre?.[m];
        return palette === undefined ? undefined : new Set([palette]);
      };

      branche.cellules.forEach((cellule, rang) => {
        const variable = parMode[0].variables[rang];
        const jugements = collection.modes.flatMap((mode, m) => {
          if (ecartes.has(m)) return [];
          const autres = autresDuMode(m, rang);
          const lecture = parMode[m].lectures[rang];
          if (!autres || lecture.etat === 'inconnu') return [];
          const verdict = jugerLaCellule(index, cellule, lecture, autres);
          if (verdict.etat === 'ok' || (lecture.etat === 'alias' && verdict.etat === 'sans-correction' && verdict.raison === 'palettes-multiples')) return [];
          return [{ mode, lecture, verdict }];
        });
        if (jugements.length === 0) return;
        const nomVoulu = cellule.chemin.join('/');
        const libelle = `${collection.cle}/${nomVoulu}`;
        for (const { verdict } of jugements) if (verdict.etat === 'rampe') notePourLaRampe(notes, collection, verdict.palette, verdict.manque, libelle);
        if (jugements.some(({ verdict }) => verdict.etat === 'rampe')) return;
        const palette = jugements.flatMap(({ verdict }) => (verdict.etat === 'cible' ? [verdict.cible.nom] : []))[0];

        if (!variable) {
          const nom = ecriture ? ecrireLeNomDuLien(index, collection, cellule.chemin, ecriture) : undefined;
          const faits: Constat['faits'] = { genre: 'lien-manquant', variable: nomVoulu, groupe: branche.id, collection: collection.nom, ...(palette ? { palette } : {}), ...(nom ? { nom } : {}) };
          const constat = constatDeLien(`C82:lien-manquant:${collection.cle}:${nomVoulu}`, 'corriger', faits);
          const sansCible = jugements.find(({ verdict }) => verdict.etat !== 'cible');
          const raison = sansCible && sansCible.verdict.etat === 'sans-correction' ? sansCible.verdict.raison : !ecriture ? 'sans-ecriture' : undefined;
          if (raison) faits.raison = raison;
          else {
            const alias: Record<string, { cle: string; nom: string }> = {};
            for (const { mode, verdict } of jugements) if (verdict.etat === 'cible') alias[mode.id] = { cle: verdict.cible.variable.cle, nom: verdict.cible.variable.nom };
            constat.correction = correctionDeLien(constat, collection, undefined, nom, alias, null, regleDuLien(libelle, cellule.cible, palette));
          }
          constats.push(constat);
          return;
        }

        for (const { mode, lecture, verdict } of jugements) {
          const manquant = lecture.etat === 'manquant';
          const genre = manquant ? 'lien-manquant' : 'lien-a-corriger';
          const faits: Constat['faits'] = {
            genre, variable: variable.nom, groupe: branche.id, ...colonne(collection, mode, {}),
            ...(lecture.etat === 'alias' ? { avant: texteDeLaPrimitive(lecture.lu), attendu: texteDeLaPrimitive(cellule.cible) } : {}),
          };
          const constat = constatDeLien(`C82:${genre}:${variable.cle}:${mode.id}`, 'corriger', faits);
          if (verdict.etat === 'sans-correction') faits.raison = verdict.raison;
          else if (verdict.etat === 'cible') {
            faits.palette = verdict.cible.nom;
            constat.correction = correctionDeLien(
              constat, collection, variable, undefined, { [mode.id]: { cle: verdict.cible.variable.cle, nom: verdict.cible.variable.nom } },
              lecture.etat === 'alias' ? lecture.lu.variable.cle : null, regleDuLien(libelle, cellule.cible, verdict.cible.nom),
            );
          }
          constats.push(constat);
        }
      });
    }

    if (collection.role === 'brands') constats.push(...questionsDeCharte(index, collection, contextes, notes));
  }

  for (const [cle, note] of notes) {
    constats.push(constatDeLien(`C82:rampe-a-completer:${cle.replace('\0', ':')}`, 'corriger', {
      genre: 'rampe-a-completer', collection: note.collection.nom, palette: note.palette.nom, manque: [...note.manques].join(', '), variables: note.cellules.size,
    }));
  }
  return constats;
}

/** Une branche sans aucune valeur dans le mode : la palette est un choix du designer, parmi celles de `primitives` qui ont la forme voulue. */
function constatDeLaBrancheAbsente(index: IndexDesLiens, collection: CollectionDuCatalogue, branche: Branche, mode: ModeDeLien): Constat {
  const candidates = palettesCandidates(index, branche);
  const faits = colonne(collection, mode, { groupe: branche.id });
  if (candidates.length === 0) return constatDeLien(`C82:rampe-a-completer:${collection.cle}:${mode.id}:${branche.id}`, 'corriger', { genre: 'rampe-a-completer', ...faits, manque: 'palette' });
  const id = `C82:palette-a-choisir:${collection.cle}:${mode.id}:${branche.id}`;
  return { ...constatDeLien(id, 'verifier', { genre: 'palette-a-choisir', ...faits }), question: { id, candidats: candidates.map(({ nom }) => ({ nom })) } };
}

/**
 * La couleur de charte (`identity/<famille>`) d'une marque vise un cran Light de la palette de la famille : le cran est un choix du
 * designer, la question liste les crans Light de la palette sans en cocher un. Sans palette établie pour la famille, rien n'est demandé.
 */
function questionsDeCharte(index: IndexDesLiens, collection: CollectionDuCatalogue, contextes: ReadonlyMap<string, ContexteDeBranche[]>, notes: Map<string, NoteDeRampe>): Constat[] {
  const constats: Constat[] = [];
  collection.modes.forEach((mode, m) => {
    for (const famille of FAMILLES_DE_MARQUE) {
      const nom = paletteUnique(contextes.get(famille)![m].votes);
      const palette = nom === undefined ? undefined : index.palettes.get(nom);
      if (!palette) continue;
      const chemin = ['identity', famille];
      if (lireLeLien(index, variableDeLaCellule(index, collection, chemin), mode).etat !== 'manquant') continue;
      const lights = CRANS.flatMap((cran) => { const lu = palette.cellules.get(cleDeLaCible({ theme: 'light', fin: cran })); return lu && !lu.variable.distante ? [lu] : []; });
      if (lights.length === 0) {
        for (const cran of CRANS) notePourLaRampe(notes, collection, palette, `light/${cran}`, `${collection.cle}/identity/${famille}`);
        continue;
      }
      const id = `C82:charte-a-choisir:${collection.cle}:${mode.id}:${famille}`;
      constats.push({
        ...constatDeLien(id, 'verifier', { genre: 'charte-a-choisir', ...colonne(collection, mode, { variable: chemin.join('/'), groupe: famille, palette: palette.nom }) }),
        question: { id, candidats: lights.map(({ variable }) => ({ cle: variable.cle, nom: variable.nom })) },
      });
    }
  });
  return constats;
}

/**
 * Les corrections que la réponse du designer rend exactes. `palette-a-choisir` : `choix` est le nom de la palette, une correction par
 * variable de la branche que le mode n'a pas (création si la variable n'existe pas et qu'une écriture est choisie, sinon alias du mode).
 * `charte-a-choisir` : `choix` est la clé du cran Light retenu. Un autre constat, ou un choix hors de la question, ne rend rien.
 */
export function corrigerLaQuestionDeLien(catalogue: CatalogueDeReference, constat: Constat, choix: string, options: OptionsDIntegrite = {}): Correction[] {
  const collection = collectionParCle(catalogue, String(constat.faits.cleDeCollection ?? ''));
  const mode = collection?.modes.find(({ id }) => id === constat.faits.idDuMode);
  if (!collection || !mode || (collection.role !== 'brands' && collection.role !== 'utility')) return [];
  const index = indexerLesLiens(catalogue);
  const ecriture = options.ecriture ?? null;
  const corriger = (chemin: readonly string[], cle: string, nom: string, regle: string): Correction | undefined => {
    const variable = variableDeLaCellule(index, collection, chemin);
    if (variable && lireLeLien(index, variable, mode).etat !== 'manquant') return undefined;
    const sortie: Constat = { ...constat, id: `${constat.id}:${chemin.join('/')}`, faits: {} };
    return correctionDeLien(sortie, collection, variable, ecriture ? ecrireLeNomDuLien(index, collection, chemin, ecriture) : undefined, { [mode.id]: { cle, nom } }, null, regle);
  };
  if (constat.faits.genre === 'charte-a-choisir') {
    const lu = index.primitives.get(choix);
    const groupe = String(constat.faits.groupe);
    const correction = lu && lu.theme === 'light' && lu.profil === undefined && lu.palette === formeReconnue(String(constat.faits.palette))
      ? corriger(['identity', groupe], lu.variable.cle, lu.variable.nom, `identity/${groupe} vise le cran ${lu.fin} Light de la palette ${lu.nom}, choisi par le designer.`) : undefined;
    return correction ? [correction] : [];
  }
  if (constat.faits.genre !== 'palette-a-choisir') return [];
  const branche = BRANCHES[collection.role].find(({ id }) => id === constat.faits.groupe);
  const palette = index.palettes.get(formeReconnue(choix));
  if (!branche || branche.sorte !== 'palette' || !palette || !palettesCandidates(index, branche).includes(palette)) return [];
  return branche.cellules.flatMap((cellule) => {
    const lu = palette.cellules.get(cleDeLaCible(cellule.cible))!;
    const correction = corriger(cellule.chemin, lu.variable.cle, lu.variable.nom, regleDuLien(`${collection.cle}/${cellule.chemin.join('/')}`, cellule.cible, palette.nom));
    return correction ? [correction] : [];
  });
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
    const manques = MODES.filter((mode) => !reconnus.has(mode));
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
            constats.push(constatDeStructure('couche', `${variable.cle}:${mode}`, { variable: variable.nom, mode: nomDuMode(mode), cible: cible.nom, coucheCible, collection: collection.nom }));
          }
        } else if (valeur.valeur !== null && role !== 'primitives' && role !== 'components') {
          constats.push(constatDeStructure('valeur-directe', `${variable.cle}:${mode}`, { variable: variable.nom, mode: nomDuMode(mode) }));
        }
      }
    }
    // Toute variable d'une couche sans portée est jugée, quel que soit son type : un scope sur un FLOAT de `primitives` passe sinon (N-32).
    if ((COLLECTIONS_SANS_PORTEE as readonly string[]).includes(role) && variable.scopes && variable.scopes.length > 0) {
      const scopes = variable.scopes.join(',');
      const constat = constatDeStructure('scopes', variable.cle, { variable: variable.nom, scopes });
      constat.correction = {
        id: constat.id, sorte: 'scope', cible: { variable: variable.cle }, avant: scopes, apres: { nom: '' },
        aRelire: { regle: `Les variables de ${role} ne portent aucun scope (COLLECTIONS_SANS_PORTEE).`, avant: scopes },
      };
      constats.push(constat);
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

/** Les constats `couche` d'un couple de collections : une collection source et la couche que ses variables visent (QV-3, N-87). */
export interface GroupeDeCouche {
  readonly id: string;
  /** Le nom de la collection dont les variables visent la couche. */
  readonly collection: string;
  readonly coucheCible: string;
  /** Les noms des variables, sans doublon, dans l'ordre des constats. */
  readonly variables: readonly string[];
  /** Les noms des modes, sans doublon. */
  readonly modes: readonly string[];
  /** Les identifiants des constats `couche` du groupe : Ignorer et Appliquer restent par constat. */
  readonly constats: readonly string[];
}

/** Regroupe les constats `couche` de C82 par collection source et par couche visée. Les autres constats n'y entrent pas. */
export function grouperLesCouches(constats: readonly Constat[]): GroupeDeCouche[] {
  const groupes = new Map<string, { collection: string; coucheCible: string; variables: Set<string>; modes: Set<string>; constats: string[] }>();
  for (const constat of constats) {
    if (constat.code !== 'C82' || constat.faits.genre !== 'couche') continue;
    const collection = String(constat.faits.collection ?? '');
    const coucheCible = String(constat.faits.coucheCible ?? '');
    const cle = `${collection}\0${coucheCible}`;
    let groupe = groupes.get(cle);
    if (!groupe) { groupe = { collection, coucheCible, variables: new Set(), modes: new Set(), constats: [] }; groupes.set(cle, groupe); }
    groupe.variables.add(String(constat.faits.variable));
    groupe.modes.add(String(constat.faits.mode));
    groupe.constats.push(constat.id);
  }
  return [...groupes.values()].map((groupe) => ({
    id: `C82:couches:${groupe.collection}:${groupe.coucheCible}`, collection: groupe.collection, coucheCible: groupe.coucheCible,
    variables: [...groupe.variables], modes: [...groupe.modes], constats: groupe.constats,
  }));
}
