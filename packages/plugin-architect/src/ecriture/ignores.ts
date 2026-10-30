/**
 * Ignorer : les constats que le designer écarte, rangés dans les données
 * partagées du nœud racine, sous la clé d'Ignorer de `ESPACE_ARCHITECT`, en
 * liste JSON de clés.
 *
 * Une clé est l'identifiant d'un constat (« Ignorer »), `proposition:` suivi de
 * cet identifiant (« Ne plus proposer » : le constat reste, sa correction ou sa
 * question disparaît), ou `role-ucm:` suivi d'un rôle du thème (« Dans tout le
 * fichier » : C82 n'en cite plus aucune palette). Un fichier qui ne déclare pas UCM ne reçoit rien. Un
 * constat `limite` ne s'ignore pas : une limite de lecture ne se range pas.
 */
import type { Constat } from '@ucm-kit/core/controles';
import { VARIABLES_DU_THEME, type VariableDuTheme } from '@ucm-kit/core/emplois';
import { CLE_ARCHITECTURE_DU_FICHIER, CLES_D_ARCHITECT, ESPACE_ARCHITECT, lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

export interface PortDIgnores {
  readonly root: {
    getSharedPluginData(espace: string, cle: string): string;
    setSharedPluginData(espace: string, cle: string, valeur: string): void;
  };
}

const PREFIXE = 'proposition:';
const PREFIXE_DU_ROLE = 'role-ucm:';

/** La clé qui retire la proposition d'un constat sans l'ignorer. */
export const cleDeLaProposition = (idDuConstat: string): string => `${PREFIXE}${idDuConstat}`;

/** Les clés rangées ; une donnée illisible ou une lecture qui lève n'en donne aucune. */
export function lireLesIgnores(api: PortDIgnores): string[] {
  try {
    const brut: unknown = JSON.parse(api.root.getSharedPluginData(ESPACE_ARCHITECT, CLES_D_ARCHITECT.ignorer) || '[]');
    return Array.isArray(brut) ? brut.filter((cle): cle is string => typeof cle === 'string') : [];
  } catch {
    return [];
  }
}

/** Les identifiants des constats ignorés parmi des clés : les clés de proposition n'en font pas partie. */
export const constatsIgnores = (cles: readonly string[]): string[] => cles.filter((cle) => !cle.startsWith(PREFIXE) && !cle.startsWith(PREFIXE_DU_ROLE));

/** La clé qui écarte un rôle du thème dans tout le fichier (Q6). */
export const cleDUnRoleIgnore = (role: VariableDuTheme): string => `${PREFIXE_DU_ROLE}${role}`;

/** Les rôles du thème que le fichier ignore partout, lus parmi des clés ; une clé dont le rôle n'existe pas au référentiel est écartée. */
export function rolesIgnoresDe(cles: readonly string[]): VariableDuTheme[] {
  return VARIABLES_DU_THEME.filter((role) => cles.includes(cleDUnRoleIgnore(role)));
}

/**
 * Écarte des constats ceux dont l'identifiant est rangé, et retire leur
 * correction et leur question à ceux dont la proposition l'est.
 */
export function separerLesIgnores(constats: readonly Constat[], cles: readonly string[]): { visibles: Constat[]; ignores: string[] } {
  const rangees = new Set(cles);
  const visibles: Constat[] = [];
  const ignores: string[] = [];
  for (const constat of constats) {
    if (rangees.has(constat.id)) ignores.push(constat.id);
    else if (rangees.has(cleDeLaProposition(constat.id))) visibles.push({ ...constat, correction: undefined, question: undefined });
    else visibles.push(constat);
  }
  return { visibles, ignores };
}

export type ResultatDIgnorer =
  | { readonly ecrit: true; readonly cles: string[] }
  | { readonly ecrit: false; readonly cles: string[]; readonly motif: 'non-ucm' | 'limite' | 'sans-proposition' | 'erreur' };

const estUcm = (api: PortDIgnores): boolean => lireLArchitectureDuFichier(api.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER)) === 'ucm';

/**
 * Range `constat` (portée `constat`) ou sa proposition (portée `proposition`).
 * Rien n'est écrit pour un constat `limite`, pour une proposition qui n'existe
 * pas, ni hors UCM.
 */
export function ignorerUnConstat(api: PortDIgnores, constat: Constat, portee: 'constat' | 'proposition'): ResultatDIgnorer {
  const rangees = lireLesIgnores(api);
  const refus = (motif: 'non-ucm' | 'limite' | 'sans-proposition'): ResultatDIgnorer => ({ ecrit: false, cles: rangees, motif });
  if (!estUcm(api)) return refus('non-ucm');
  if (constat.limite) return refus('limite');
  if (portee === 'proposition' && !constat.correction && !constat.question) return refus('sans-proposition');
  const cle = portee === 'constat' ? constat.id : cleDeLaProposition(constat.id);
  return ranger(api, rangees.includes(cle) ? rangees : [...rangees, cle]);
}

/** Retire l'identifiant du constat et sa proposition des clés rangées : le constat revient à la prochaine analyse. */
export function nePlusIgnorer(api: PortDIgnores, idDuConstat: string): ResultatDIgnorer {
  const rangees = lireLesIgnores(api);
  if (!estUcm(api)) return { ecrit: false, cles: rangees, motif: 'non-ucm' };
  return ranger(api, rangees.filter((cle) => cle !== idDuConstat && cle !== cleDeLaProposition(idDuConstat)));
}

/** Range le rôle : C82 ne le cite plus, dans aucune palette. Rien n'est écrit hors UCM. */
export function ignorerUnRole(api: PortDIgnores, role: VariableDuTheme): ResultatDIgnorer {
  const rangees = lireLesIgnores(api);
  if (!estUcm(api)) return { ecrit: false, cles: rangees, motif: 'non-ucm' };
  const cle = cleDUnRoleIgnore(role);
  return ranger(api, rangees.includes(cle) ? rangees : [...rangees, cle]);
}

/** Retire le rôle des clés rangées : C82 le cite de nouveau à la prochaine lecture. */
export function retablirUnRole(api: PortDIgnores, role: VariableDuTheme): ResultatDIgnorer {
  const rangees = lireLesIgnores(api);
  if (!estUcm(api)) return { ecrit: false, cles: rangees, motif: 'non-ucm' };
  const cle = cleDUnRoleIgnore(role);
  return ranger(api, rangees.filter((rangee) => rangee !== cle));
}

function ranger(api: PortDIgnores, cles: string[]): ResultatDIgnorer {
  try {
    api.root.setSharedPluginData(ESPACE_ARCHITECT, CLES_D_ARCHITECT.ignorer, JSON.stringify(cles));
    return { ecrit: true, cles };
  } catch {
    return { ecrit: false, cles: lireLesIgnores(api), motif: 'erreur' };
  }
}
