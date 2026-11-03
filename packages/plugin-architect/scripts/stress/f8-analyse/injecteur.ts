/**
 * L'injecteur de pannes du stress test F8 et F9 : il enveloppe chaque lecteur de `Lecteurs` d'un point de passage nommé. Un plan
 * déclare, par passage, des actions exécutées dans l'ordre : lever une erreur, rendre une valeur à la place du lecteur, lever le jeton
 * d'annulation, appeler une fonction du cas (un événement du document, une seconde demande, une écriture). Le passage fixe l'ordre des
 * actions, ce qui rend les cas de concurrence déterministes.
 *
 * Un plan vide ne change rien : les lecteurs enveloppés rendent ce que rendent les lecteurs d'origine, dans le même ordre d'appel. La
 * trace du banc (`passages`) liste les passages dans l'ordre où l'analyse les a franchis. Chaque `injecter` crée sa propre trace : deux
 * cas de suite ne partagent aucun état. L'horloge et les pauses viennent de `OPTIONS_SANS_ATTENTE` (`scenarioDeBase.ts`).
 */
import type { JetonDAnnulation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import type { Lecteurs } from '../../../src/sandbox/analyse';

export type Passage = 'sujet' | 'releve' | 'bibliotheques' | 'catalogue' | 'moteur' | 'regles' | 'dependances' | 'niveau' | 'ignores' | 'prelecture';
export const PASSAGES: readonly Passage[] = ['sujet', 'releve', 'bibliotheques', 'catalogue', 'moteur', 'regles', 'dependances', 'niveau', 'ignores', 'prelecture'];

export type Action =
  | { readonly action: 'lever'; readonly erreur: unknown }
  | { readonly action: 'valeur'; readonly valeur: unknown }
  | { readonly action: 'jeton' }
  | { readonly action: 'appeler'; readonly faire: () => void | Promise<void> };

/** Quand l'action s'exécute par rapport au lecteur : avant son appel, ou après son retour (la valeur est alors celle du lecteur). */
export interface ActionPlacee {
  readonly quand: 'avant' | 'apres';
  readonly action: Action;
  /** Rang de l'appel du passage visé (1 par défaut). */
  readonly appel?: number;
}

export type Plan = Partial<Record<Passage, readonly ActionPlacee[]>>;

export interface Injection {
  readonly lecteurs: Lecteurs;
  /** Les passages franchis, dans l'ordre. */
  readonly passages: string[];
}

interface AvecJeton { readonly jeton?: JetonDAnnulation }

/** Le jeton que le lecteur reçoit, qu'il soit le deuxième ou le troisième argument. */
function jetonDes(args: readonly unknown[]): { leve: boolean } | undefined {
  return args.find((argument): argument is { leve: boolean } => typeof argument === 'object' && argument !== null && 'leve' in argument && typeof (argument as AvecJeton & { leve?: unknown }).leve === 'boolean');
}

/** Enveloppe chaque lecteur défini ; un lecteur absent reste absent (absence n'est pas refus). */
export function injecter(lecteurs: Lecteurs, plan: Plan = {}): Injection {
  const passages: string[] = [];
  const appels = new Map<Passage, number>();
  const envelopper = <A extends unknown[], R>(passage: Passage, lecteur: (...args: A) => Promise<R>) => async (...args: A): Promise<R> => {
    const rang = (appels.get(passage) ?? 0) + 1;
    appels.set(passage, rang);
    passages.push(`${passage}:${rang}`);
    const placees = (plan[passage] ?? []).filter((placee) => (placee.appel ?? 1) === rang);
    const jouer = async (quand: 'avant' | 'apres'): Promise<{ valeur: R } | null> => {
      for (const { action } of placees.filter((placee) => placee.quand === quand)) {
        if (action.action === 'lever') throw action.erreur;
        if (action.action === 'valeur') return { valeur: action.valeur as R };
        if (action.action === 'jeton') { const jeton = jetonDes(args); if (jeton) jeton.leve = true; } else await action.faire();
      }
      return null;
    };
    const avant = await jouer('avant');
    if (avant) return avant.valeur;
    const rendu = await lecteur(...args);
    const apres = await jouer('apres');
    return apres ? apres.valeur : rendu;
  };
  const enveloppes: Lecteurs = {
    sujet: envelopper('sujet', lecteurs.sujet),
    releve: envelopper('releve', lecteurs.releve),
    catalogue: envelopper('catalogue', lecteurs.catalogue),
    moteur: envelopper('moteur', lecteurs.moteur),
    ...(lecteurs.prelecture ? { prelecture: envelopper('prelecture', lecteurs.prelecture) } : {}),
    ...(lecteurs.bibliotheques ? { bibliotheques: envelopper('bibliotheques', lecteurs.bibliotheques) } : {}),
    ...(lecteurs.regles ? { regles: envelopper('regles', lecteurs.regles) } : {}),
    ...(lecteurs.dependances ? { dependances: envelopper('dependances', lecteurs.dependances) } : {}),
    ...(lecteurs.niveau ? { niveau: envelopper('niveau', lecteurs.niveau) } : {}),
    ...(lecteurs.ignores ? { ignores: envelopper('ignores', lecteurs.ignores) } : {}),
  };
  return { lecteurs: enveloppes, passages };
}

export const lever = (passage: Passage, erreur: unknown = new Error('Figma refuse la lecture'), appel = 1): Plan => ({ [passage]: [{ quand: 'avant', action: { action: 'lever', erreur }, appel }] });
export const rendre = (passage: Passage, valeur: unknown, appel = 1): Plan => ({ [passage]: [{ quand: 'avant', action: { action: 'valeur', valeur }, appel }] });
