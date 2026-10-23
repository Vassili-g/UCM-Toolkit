/**
 * Ce que l'interface retient de l'analyse : les constats que le bouton
 * Constats compte, que la section Variants répartit par valeur et que le
 * panneau des constats range en onglets. Une seule analyse est retenue, sous
 * son identité (sujet, génération) : le message d'une autre identité est
 * ignoré, sauf celui qui ouvre une analyse.
 */
import type { ReleveDeComposant } from '@ucm-kit/core/controles';
import { TYPES_D_ALERTE, type TypeDAlerte } from '@ucm-kit/core/referentiel';

import type { LectureDeComposant } from '../../composant';
import type { PluginMessage } from '../../messages';
import type { CauseDePeremption } from '../../messages/analyse';
import type { Constat, IdentiteDAnalyse } from '../../messages/commun';
import type { Etat } from '../etat';

/** Les messages qui touchent l'analyse retenue. */
export type MessageRecuDeLAnalyse = Extract<PluginMessage, { type: 'analyse-commencee' | 'analyse-en-cours' | 'analyse' | 'perime' | 'occupe' | 'corrections-appliquees' | 'ignores' }>;

/** Le dernier lot écrit : la ligne de réussite du sandbox, et ce qui s'est écrit. */
export interface LotEcrit {
  readonly resume: string;
  readonly ecrites: number;
  /** Les identifiants des corrections envoyées que le sandbox n'a pas sautées. */
  readonly appliquees: readonly string[];
}

export interface AnalyseRecue {
  readonly identite: IdentiteDAnalyse;
  readonly statut: 'en-cours' | 'complete' | 'partielle' | 'annulee' | 'arretee';
  /** Les constats visibles : les ignorés n'y sont pas. */
  readonly constats: readonly Constat[];
  /** Tous les constats du message, ignorés compris. */
  readonly tous: readonly Constat[];
  readonly ignores: readonly string[];
  readonly variants: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  readonly lecture: ReleveDeComposant['lecture'] | null;
  /** Les variants lus sur le total, pendant l'analyse. */
  readonly progression: { readonly lus: number; readonly total: number } | null;
  /** Un changement du document ou de la sélection a rendu ces constats périmés ; l'interface les garde. */
  readonly perimee: boolean;
  readonly cause: CauseDePeremption | null;
  /** Le sandbox écrit un lot : la demande est partie, la réponse n'est pas revenue. */
  readonly ecriture: { readonly liaisons: number; readonly ids: readonly string[] } | null;
  readonly lot: LotEcrit | null;
  /** Les corrections déjà écrites pour cette analyse. */
  readonly appliquees: readonly string[];
  /** L'heure de réception, en millisecondes. */
  readonly recueA: number;
}

const memeIdentite = (a: IdentiteDAnalyse, b: IdentiteDAnalyse): boolean => a.sujet === b.sujet && a.generation === b.generation;

const visibles = (tous: readonly Constat[], ignores: readonly string[]): Constat[] => tous.filter((constat) => !ignores.includes(constat.id));

/** Retient le message du sandbox. `occupe` ne change que l'écriture en cours. */
export function recevoirUneAnalyse(etat: Etat, message: MessageRecuDeLAnalyse): void {
  const courante = etat.analyse;
  if (message.type === 'analyse-commencee') {
    etat.analyse = {
      identite: message.analyse, statut: 'en-cours', constats: [], tous: [], ignores: [], variants: [], lecture: null, progression: null,
      perimee: false, cause: null, ecriture: null, lot: null, appliquees: [], recueA: Date.now(),
    };
    return;
  }
  // Une analyse sans `analyse-commencee` ouvre la sienne quand sa génération est plus récente que celle retenue.
  if (message.type === 'analyse' && (!courante || message.analyse.generation > courante.identite.generation)) {
    etat.analyse = {
      identite: message.analyse, statut: message.statut, constats: visibles(message.constats, []), tous: message.constats, ignores: [], variants: message.variants,
      lecture: message.lecture, progression: null, perimee: false, cause: null, ecriture: null, lot: null, appliquees: [], recueA: Date.now(),
    };
    return;
  }
  if (!courante || !memeIdentite(courante.identite, message.analyse)) return;
  switch (message.type) {
    case 'analyse-en-cours':
      etat.analyse = { ...courante, progression: { lus: message.variantsLus, total: message.variantsTotal } };
      return;
    case 'analyse':
      etat.analyse = {
        ...courante, statut: message.statut, constats: visibles(message.constats, courante.ignores), tous: message.constats, variants: message.variants,
        lecture: message.lecture, progression: null, perimee: false, cause: null, recueA: Date.now(),
      };
      return;
    case 'ignores':
      etat.analyse = { ...courante, ignores: message.constats, constats: visibles(courante.tous, message.constats) };
      return;
    case 'perime':
      // Un changement du document après une écriture est un Ctrl+Z : la ligne « Ctrl+Z défait ce lot » n'a plus d'objet.
      etat.analyse = { ...courante, perimee: true, cause: message.cause, lot: message.cause === 'ecriture' ? courante.lot : null };
      return;
    case 'occupe':
      etat.analyse = { ...courante, ecriture: null };
      return;
    case 'corrections-appliquees':
      {
        const sautees = new Set(message.sautees.map(({ id }) => id));
        const ecrites = (courante.ecriture?.ids ?? []).filter((id) => !sautees.has(id));
        etat.analyse = { ...courante, ecriture: null, lot: { resume: message.resume, ecrites: message.ecrites, appliquees: ecrites }, appliquees: [...courante.appliquees, ...ecrites] };
      }
      return;
  }
}

/** Note les corrections que la demande d'écriture a envoyées, pour retirer de la liste celles que le sandbox n'a pas sautées. */
export function noterLEnvoi(etat: Etat, ids: readonly string[], liaisons: number): void {
  const { analyse } = etat;
  if (analyse) etat.analyse = { ...analyse, ecriture: { liaisons, ids }, lot: null };
}

/**
 * L'analyse retenue quand elle porte sur le composant lu (un de ses variants est un variant du jeu affiché), sinon `null`.
 * La section Variants s'appuie sur elle : sans constat, ou pendant l'écriture d'un lot, elle n'a rien à répartir.
 */
export function analyseDe(etat: Etat, lecture: LectureDeComposant | null): AnalyseRecue | null {
  const analyse = analyseDuComposant(etat, lecture);
  if (!analyse || analyse.ecriture !== null || analyse.constats.length === 0) return null;
  return analyse;
}

/** Comme `analyseDe`, mais aussi pour une analyse sans constat ou pendant l'écriture : le panneau en a besoin. */
export function analyseDuComposant(etat: Etat, lecture: LectureDeComposant | null): AnalyseRecue | null {
  const { analyse } = etat;
  if (!analyse || !lecture || analyse.statut === 'en-cours') return null;
  const ids = new Set([lecture.sujet.id, ...lecture.sujet.variants.map((variant) => variant.id)]);
  return analyse.variants.some((variant) => ids.has(variant.id)) ? analyse : null;
}

/** Vrai quand plusieurs libraries portent des variables et qu'aucune n'est liée au composant : l'analyse attend le choix de la Configuration. */
export const libraryAChoisir = (etat: Etat): boolean => etat.reference !== null && etat.reference.library === null && etat.reference.candidates > 1;

/** Le plus grave des types, dans l'ordre du kit ; `null` sans constat. */
export function tonLePlusGrave(constats: readonly Pick<Constat, 'type'>[]): TypeDAlerte | null {
  let meilleur: TypeDAlerte | null = null;
  let rang: number = TYPES_D_ALERTE.length;
  for (const { type } of constats) {
    const candidat = TYPES_D_ALERTE.findIndex((entree) => entree.id === type);
    if (candidat < rang) {
      rang = candidat;
      meilleur = type;
    }
  }
  return meilleur;
}
