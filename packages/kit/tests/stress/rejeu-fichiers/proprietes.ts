/**
 * Les cinq propriétés que le rejeu mesure sur un catalogue converti d'un fichier réel, avec les deux contrôles du mode Tokens comme
 * `packages/plugin-architect/src/sandbox/structure.ts` les appelle (`controlerLeCatalogue`, puis `controlerLIntegriteUcm` sans
 * écriture ni rôle ignoré, le premier constat de chaque identifiant). Une exception est un écart attrapé, jamais relancée.
 *
 * Chaque propriété rend `nombres` (comptes et codes, sans nom du fichier) et `nommes` (identifiants de variables, réservés aux
 * fichiers de `_local/`). R5 injecte des défauts que les opérateurs de F2 savent écrire sur un thème de base, mais choisis sur
 * n'importe quel catalogue : chaque injecteur reprend le code et la clé de rattachement de son opérateur et ne s'applique qu'où sa
 * précondition tient.
 */
import {
  controlerLIntegriteUcm, controlerLeCatalogue,
  type CatalogueDeReference, type Constat, type Correction, type VariableDuCatalogue,
} from '../../../src/controles/index.js';
import { estLaFamilleCouleur } from '../../../src/controles/nommage.js';
import { SUPPORT_DES_VARIABLES } from '../../../src/emplois/dossiers.js';
import { COLLECTIONS_SANS_PORTEE } from '../../../src/referentiel/architecture.js';
import { formeReconnue } from '../../../src/referentiel/reconnaissance.js';
import { modeDuThemeReconnu, variableDuThemeReconnue } from '../../../src/referentiel/theme.js';
import { echantillon, entier, graineDe, melanger, mulberry32 } from '../commun/prng.js';
import { cleAttendue, cleDeConstat, sansDoublon } from '../f2-structure/cas.js';

/** Les sortes que le domaine Structure d'Architect écrit (`estDeStructure` dans `packages/plugin-architect/src/sandbox/structure.ts`). */
const estDeStructureSimple = (correction: Correction): boolean => correction.sorte === 'scope' || correction.sorte === 'alias-de-mode' || correction.sorte === 'variable';

export const GRAINE_DU_REJEU = 7110;
export const BORNE_DES_LISTES = 200;

const bornee = <T>(liste: readonly T[]): T[] => liste.slice(0, BORNE_DES_LISTES);
const compter = (valeurs: readonly string[]): Record<string, number> => {
  const comptes: Record<string, number> = {};
  for (const valeur of [...valeurs].sort()) comptes[valeur] = (comptes[valeur] ?? 0) + 1;
  return comptes;
};

export interface Lecture { constats: Constat[]; erreur?: string }

/** Les constats que le mode Tokens montre pour ce catalogue. */
export function lire(catalogue: CatalogueDeReference): Lecture {
  try {
    return { constats: sansDoublon([...controlerLeCatalogue(catalogue), ...controlerLIntegriteUcm(catalogue, { ecriture: null, rolesIgnores: [] })]) };
  } catch (erreur) {
    return { constats: [], erreur: erreur instanceof Error ? erreur.message : String(erreur) };
  }
}

export const cleComplete = (constat: Constat): string => `${constat.code}|${cleDeConstat(constat)}`;
const genreDe = (constat: Constat): string => (typeof constat.faits.genre === 'string' ? constat.faits.genre : '-');
const sorteDe = (constat: Constat): string => constat.correction?.sorte ?? (constat.question ? 'question' : 'sans-correction');
const empreinteDeCorrection = (constat: Constat): string => JSON.stringify(constat.correction ?? null);

export interface Resultat { nombres: Record<string, unknown>; nommes: Record<string, unknown> }

// -------------------------------------------------------------------------------------------------------------------- R1

export function r1Base(lecture: Lecture): Resultat {
  const { constats } = lecture;
  return {
    nombres: {
      exceptions: lecture.erreur ? 1 : 0,
      constats: constats.length,
      parCode: compter(constats.map((c) => c.code)),
      parCodeEtGenre: compter(constats.map((c) => `${c.code}/${genreDe(c)}`)),
      parSorteDeCorrection: compter(constats.map(sorteDe)),
    },
    nommes: { erreur: lecture.erreur ?? null, exemples: bornee(constats.map((c) => c.id)) },
  };
}

// -------------------------------------------------------------------------------------------------------------------- R2

export function r2Determinisme(catalogue: CatalogueDeReference, base: Lecture): Resultat {
  const seconde = lire(catalogue);
  const vue = (lecture: Lecture): string[] => lecture.constats.map((c) => `${c.id}|${c.code}|${empreinteDeCorrection(c)}`);
  const a = vue(base);
  const b = vue(seconde);
  const differences = a.length === b.length ? a.flatMap((valeur, rang) => (valeur === b[rang] ? [] : [rang])) : [-1];
  return { nombres: { constatsPremier: a.length, constatsSecond: b.length, differences: differences.length }, nommes: { rangs: bornee(differences) } };
}

// -------------------------------------------------------------------------------------------------------------------- R3

function melangerLeCatalogue(catalogue: CatalogueDeReference, numero: number): CatalogueDeReference {
  const tirer = mulberry32(graineDe(GRAINE_DU_REJEU, `R3-${numero}`));
  const copie = structuredClone(catalogue);
  return { ...copie, variables: melanger(tirer, copie.variables), collections: melanger(tirer, copie.collections) };
}

export function r3Ordre(catalogue: CatalogueDeReference, base: Lecture, melanges = 5): Resultat {
  const reference = new Set(base.constats.map(cleComplete));
  const differences: string[] = [];
  let exceptions = 0;
  for (let numero = 0; numero < melanges; numero++) {
    const lecture = lire(melangerLeCatalogue(catalogue, numero));
    if (lecture.erreur) exceptions += 1;
    const cles = new Set(lecture.constats.map(cleComplete));
    for (const cle of cles) if (!reference.has(cle)) differences.push(`${numero}|apparu|${cle}`);
    for (const cle of reference) if (!cles.has(cle)) differences.push(`${numero}|disparu|${cle}`);
  }
  const codes = differences.map((d) => d.split('|')[2]);
  return {
    nombres: { melanges, exceptions, differences: differences.length, differencesParCode: compter(codes) },
    nommes: { differences: bornee(differences) },
  };
}

// -------------------------------------------------------------------------------------------------------------------- R4

/** La cible qu'une correction écrit : deux corrections de même cible se recoupent. */
function cibleDeCorrection(correction: Correction): string {
  if (correction.sorte === 'variable') return `variable|${correction.creation?.collection}|${correction.creation?.nom}`;
  return `${correction.sorte}|${correction.cible.variable}|${correction.cible.mode ?? ''}`;
}

/** Applique une correction de structure à la copie ; `false` quand le catalogue ne porte pas sa cible. */
export function appliquer(catalogue: CatalogueDeReference, correction: Correction): boolean {
  const variable = correction.cible.variable === undefined ? undefined : catalogue.variables.find((v) => v.cle === correction.cible.variable);
  if (correction.sorte === 'scope') {
    if (!variable) return false;
    variable.scopes = correction.apres.nom === '' ? [] : correction.apres.nom.split(',');
    return true;
  }
  if (correction.sorte === 'alias-de-mode') {
    if (!variable || !correction.cible.mode || !correction.apres.cle) return false;
    variable.valeurs = { ...variable.valeurs, [correction.cible.mode]: { alias: correction.apres.cle } };
    return true;
  }
  if (correction.sorte === 'variable' && correction.creation) {
    const { collection, nom, scopes, alias } = correction.creation;
    catalogue.variables.push({
      cle: `${collection}|${nom}`, nom, collection, type: 'COLOR', etat: 'presente', scopes: [...scopes],
      valeurs: Object.fromEntries(Object.entries(alias).map(([mode, cible]) => [mode, { alias: cible.cle }])),
    });
    return true;
  }
  return false;
}

export function r4PointFixe(catalogue: CatalogueDeReference, base: Lecture): Resultat {
  const copie = structuredClone(catalogue);
  const corrections = base.constats.flatMap((c) => (c.correction ? [c.correction] : []));
  const appliquees = new Set<string>();
  const nonAppliquees: string[] = [];
  for (const correction of corrections) {
    if (estDeStructureSimple(correction) && appliquer(copie, correction)) appliquees.add(cibleDeCorrection(correction));
    else nonAppliquees.push(correction.sorte);
  }
  const apres = lire(copie);
  const avantIds = new Set(base.constats.map((c) => c.id));
  const reviennent = apres.constats.flatMap((c) => (c.correction && appliquees.has(cibleDeCorrection(c.correction)) ? [c] : []));
  const nouveaux = apres.constats.filter((c) => !avantIds.has(c.id));
  const disparus = base.constats.filter((c) => c.correction && appliquees.has(cibleDeCorrection(c.correction)) && !apres.constats.some((a) => a.id === c.id));
  return {
    nombres: {
      corrections: corrections.length, appliquees: appliquees.size, nonAppliquees: compter(nonAppliquees),
      disparues: disparus.length, reviennentPourLaMemeCible: reviennent.length, reviennentParSorte: compter(reviennent.map((c) => c.correction!.sorte)),
      constatsNouveaux: nouveaux.length, constatsNouveauxParCode: compter(nouveaux.map((c) => c.code)),
      constatsNouveauxParCodeEtGenre: compter(nouveaux.map((c) => `${c.code}/${genreDe(c)}`)),
      exceptions: apres.erreur ? 1 : 0,
    },
    nommes: { reviennent: bornee(reviennent.map((c) => c.id)), nouveaux: bornee(nouveaux.map((c) => c.id)), erreur: apres.erreur ?? null },
  };
}

// -------------------------------------------------------------------------------------------------------------------- R5

interface Cible { readonly variable: VariableDuCatalogue; readonly mode?: string }
interface Attendu { readonly code: Constat['code']; readonly cle: string }

export interface Injecteur {
  readonly id: string;
  /** L'opérateur de F2 dont l'injecteur reprend le code et la clé. */
  readonly operateur: string;
  readonly code: Constat['code'];
  readonly cibles: (catalogue: CatalogueDeReference) => Cible[];
  readonly appliquer: (catalogue: CatalogueDeReference, cible: Cible) => Attendu[];
}

const presentes = (catalogue: CatalogueDeReference): VariableDuCatalogue[] =>
  catalogue.variables.filter((v) => v.etat === 'presente' && !v.distante && catalogue.collections.find((c) => c.cle === v.collection)?.etat === 'lue');
const collectionDe = (catalogue: CatalogueDeReference, variable: VariableDuCatalogue) => catalogue.collections.find((c) => c.cle === variable.collection)!;
const nomDuMode = (catalogue: CatalogueDeReference, variable: VariableDuCatalogue, mode: string): string =>
  collectionDe(catalogue, variable).modes.find((m) => m.id === mode)?.nom ?? mode;

/** Les couples variable et mode dont la valeur est un alias (`alias`) ou une valeur quelconque (`tout`). */
function parModes(catalogue: CatalogueDeReference, variables: readonly VariableDuCatalogue[], genre: 'alias' | 'tout'): Cible[] {
  return variables.flatMap((variable) => collectionDe(catalogue, variable).modes.flatMap((mode) => {
    const valeur = variable.valeurs?.[mode.id];
    return valeur && (genre === 'tout' || 'alias' in valeur) ? [{ variable, mode: mode.id }] : [];
  }));
}

/** Le mode UCM que le nom de la cible d'un alias porte, comme `controlerLesModes` le lit. */
function modeDeLaCible(catalogue: CatalogueDeReference, cle: string) {
  const cible = catalogue.variables.find((v) => v.cle === cle);
  const collection = cible && catalogue.collections.find((c) => c.cle === cible.collection);
  if (!cible || !collection) return undefined;
  const segments = cible.nom.split('/');
  const rang = segments.findIndex((segment) => collection.modes.some((m) => formeReconnue(m.nom) === formeReconnue(segment)));
  if (rang < 0) return undefined;
  const mode = collection.modes.find((m) => formeReconnue(m.nom) === formeReconnue(segments[rang]));
  return mode && modeDuThemeReconnu(mode.nom);
}

const rolesDuTheme = (catalogue: CatalogueDeReference): VariableDuCatalogue[] => presentes(catalogue).filter((v) =>
  collectionDe(catalogue, v).role === 'theme' && variableDuThemeReconnue(v.nom) !== undefined);

export const INJECTEURS: readonly Injecteur[] = [
  {
    id: 'alias-supprime', operateur: 'L1', code: 'C63',
    cibles: (catalogue) => parModes(catalogue, presentes(catalogue), 'alias'),
    appliquer: (catalogue, { variable, mode }) => {
      variable.valeurs![mode!] = { alias: `${variable.collection}|cible-supprimee-rejeu` };
      return [{ code: 'C63', cle: cleAttendue('alias-supprime', variable.nom, nomDuMode(catalogue, variable, mode!)) }];
    },
  },
  {
    id: 'sans-valeur-en-mode', operateur: 'L4', code: 'C63',
    cibles: (catalogue) => parModes(catalogue, presentes(catalogue), 'tout'),
    appliquer: (catalogue, { variable, mode }) => {
      delete variable.valeurs![mode!];
      return [{ code: 'C63', cle: cleAttendue('sans-valeur-en-mode', variable.nom, nomDuMode(catalogue, variable, mode!)) }];
    },
  },
  {
    id: 'scope-du-theme', operateur: 'S1', code: 'C63',
    cibles: (catalogue) => rolesDuTheme(catalogue)
      .filter((v) => (SUPPORT_DES_VARIABLES[variableDuThemeReconnue(v.nom)!].portees as readonly string[]).join(',') !== 'ALL_SCOPES')
      .map((variable) => ({ variable })),
    appliquer: (_catalogue, { variable }) => {
      variable.scopes = ['ALL_SCOPES'];
      return [{ code: 'C63', cle: cleAttendue(null, variable.nom, '') }];
    },
  },
  {
    id: 'scope-sans-portee', operateur: 'S2', code: 'C82',
    // `controlerLIntegriteUcm` rend [] sans collection `theme` lue : sans elle, C82 `scopes` ne s'exécute pas.
    cibles: (catalogue) => !catalogue.collections.some((c) => c.role === 'theme' && c.etat === 'lue') ? [] : presentes(catalogue)
      .filter((v) => v.type === 'COLOR' && (COLLECTIONS_SANS_PORTEE as readonly string[]).includes(collectionDe(catalogue, v).role ?? '') && !(v.scopes && v.scopes.length > 0))
      .map((variable) => ({ variable })),
    appliquer: (_catalogue, { variable }) => {
      variable.scopes = ['ALL_SCOPES'];
      return [{ code: 'C82', cle: cleAttendue('scopes', variable.nom, '') }];
    },
  },
  {
    id: 'couleur-sans-alias', operateur: 'L5', code: 'C63',
    cibles: (catalogue) => parModes(catalogue, presentes(catalogue).filter((v) =>
      v.type === 'COLOR' && collectionDe(catalogue, v).role === 'components' && v.nom.split('/').some(estLaFamilleCouleur)), 'alias'),
    appliquer: (catalogue, { variable, mode }) => {
      variable.valeurs![mode!] = { valeur: { r: 0.2, g: 0.4, b: 0.6, a: 1 } };
      return [{ code: 'C63', cle: cleAttendue('couleur-sans-alias', variable.nom, nomDuMode(catalogue, variable, mode!)) }];
    },
  },
  {
    id: 'alias-de-mode-croise', operateur: 'M1', code: 'C60',
    cibles: (catalogue) => rolesDuTheme(catalogue).flatMap((variable) => {
      const modes = collectionDe(catalogue, variable).modes.filter((m) => modeDuThemeReconnu(m.nom) !== undefined);
      if (modes.length !== 2 || modeDuThemeReconnu(modes[0].nom) === modeDuThemeReconnu(modes[1].nom)) return [];
      const [a, b] = modes.map((m) => variable.valeurs?.[m.id]);
      if (!a || !b || !('alias' in a) || !('alias' in b) || a.alias === b.alias) return [];
      const juste = modes.every((m, rang) => modeDeLaCible(catalogue, (rang === 0 ? a : b).alias) === modeDuThemeReconnu(m.nom));
      return juste ? [{ variable }] : [];
    }),
    appliquer: (catalogue, { variable }) => {
      const modes = collectionDe(catalogue, variable).modes.filter((m) => modeDuThemeReconnu(m.nom) !== undefined);
      const [a, b] = modes.map((m) => variable.valeurs![m.id]);
      variable.valeurs![modes[0].id] = b;
      variable.valeurs![modes[1].id] = a;
      return modes.map((m) => ({ code: 'C60' as const, cle: cleAttendue(null, variable.nom, m.nom) }));
    },
  },
  {
    id: 'type-du-theme', operateur: 'Y3', code: 'C82',
    cibles: (catalogue) => rolesDuTheme(catalogue).filter((v) => v.type === 'COLOR').map((variable) => ({ variable })),
    appliquer: (_catalogue, { variable }) => {
      variable.type = 'FLOAT';
      return [{ code: 'C82', cle: cleAttendue('type', variable.nom, '') }];
    },
  },
];

export const TIRAGES_DE_R5 = 20;
export const DEFAUTS_PAR_TIRAGE = 5;

export function r5DefautsMeles(catalogue: CatalogueDeReference, base: Lecture, tirages = TIRAGES_DE_R5): Resultat {
  const clesDeBase = new Set(base.constats.map(cleComplete));
  const idsDeBase = new Set(base.constats.map((c) => c.id));
  // Une variable que la base accuse déjà n'est pas une cible : son défaut ne se distinguerait pas de celui qui est là.
  const accusees = new Set(base.constats.flatMap((c) => [c.faits.variable, c.faits.cle].filter((v): v is string => typeof v === 'string')));
  const parInjecteur: Record<string, { tires: number; injectes: number; nonApplicables: number; detectes: number; manques: number }> = {};
  for (const injecteur of INJECTEURS) parInjecteur[injecteur.id] = { tires: 0, injectes: 0, nonApplicables: 0, detectes: 0, manques: 0 };
  const manques: string[] = [];
  const disparus: string[] = [];
  let exceptions = 0;
  let inattendus = 0;
  const inattendusParCode: string[] = [];

  for (let numero = 0; numero < tirages; numero++) {
    const tirer = mulberry32(graineDe(GRAINE_DU_REJEU, `R5-${numero}`));
    const copie = structuredClone(catalogue);
    const retenus = echantillon(tirer, INJECTEURS, Math.min(DEFAUTS_PAR_TIRAGE, INJECTEURS.length));
    const touchees = new Set<string>();
    const attendus: { injecteur: Injecteur; attendus: Attendu[]; variable: string }[] = [];
    for (const injecteur of retenus) {
      parInjecteur[injecteur.id].tires += 1;
      const eligibles = injecteur.cibles(copie).filter(({ variable }) => !accusees.has(variable.nom) && !accusees.has(variable.cle) && !touchees.has(variable.cle));
      if (eligibles.length === 0) { parInjecteur[injecteur.id].nonApplicables += 1; continue; }
      const cible = eligibles[entier(tirer, 0, eligibles.length - 1)];
      touchees.add(cible.variable.cle);
      attendus.push({ injecteur, attendus: injecteur.appliquer(copie, cible), variable: cible.variable.cle });
      parInjecteur[injecteur.id].injectes += 1;
    }
    const lecture = lire(copie);
    if (lecture.erreur) { exceptions += 1; continue; }
    const cles = new Set(lecture.constats.map(cleComplete));
    for (const { injecteur, attendus: liste, variable } of attendus) {
      if (liste.every(({ code, cle }) => cles.has(`${code}|${cle}`))) parInjecteur[injecteur.id].detectes += 1;
      else { parInjecteur[injecteur.id].manques += 1; manques.push(`${numero}|${injecteur.id}|${variable}`); }
    }
    const nomsTouches = new Set([...touchees].map((cle) => copie.variables.find((v) => v.cle === cle)?.nom));
    const attendusPlats = new Set(attendus.flatMap(({ attendus: liste }) => liste.map(({ code, cle }) => `${code}|${cle}`)));
    const idsApres = new Set(lecture.constats.map((c) => c.id));
    for (const constat of base.constats) {
      const variable = constat.faits.variable;
      const touche = touchees.has(String(constat.faits.cle)) || (typeof variable === 'string' && nomsTouches.has(variable));
      if (!idsApres.has(constat.id) && !touche) disparus.push(`${numero}|${constat.id}`);
    }
    for (const constat of lecture.constats) {
      if (idsDeBase.has(constat.id) || clesDeBase.has(cleComplete(constat)) || attendusPlats.has(cleComplete(constat))) continue;
      inattendus += 1;
      inattendusParCode.push(`${constat.code}/${genreDe(constat)}`);
    }
  }

  const totaux = Object.values(parInjecteur).reduce((somme, c) => ({
    injectes: somme.injectes + c.injectes, nonApplicables: somme.nonApplicables + c.nonApplicables, detectes: somme.detectes + c.detectes, manques: somme.manques + c.manques,
  }), { injectes: 0, nonApplicables: 0, detectes: 0, manques: 0 });
  return {
    nombres: {
      tirages, defautsParTirage: DEFAUTS_PAR_TIRAGE, graine: GRAINE_DU_REJEU, exceptions, ...totaux,
      parInjecteur, constatsDeBaseDisparus: disparus.length, constatsNouveauxInattendus: inattendus, constatsNouveauxInattendusParCode: compter(inattendusParCode),
    },
    nommes: { manques: bornee(manques), disparus: bornee(disparus) },
  };
}
