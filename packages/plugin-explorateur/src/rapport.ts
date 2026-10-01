/**
 * Le rapport exporté des diagnostics : contexte, révision, portée, chaîne et
 * constat de chaque problème. Il garde les identifiants et les alias tels que
 * Figma les range. Ce n'est ni un contrat UCM, ni un export de tokens.
 */
import { nomComplet, nomDeMode, texteDeSource } from './copie';
import type { Diagnostic, NatureDeConstat } from './diagnostics';
import { familles, type Index } from './indexation';
import type { Contexte } from './resolution';

export const FORMAT_DU_RAPPORT = 'ucm-explorateur/rapport';
export const VERSION_DU_RAPPORT = 1;

export interface RapportDeDiagnostic {
  readonly format: typeof FORMAT_DU_RAPPORT;
  readonly version: typeof VERSION_DU_RAPPORT;
  readonly fichier: string;
  readonly revision: number;
  readonly luA: number;
  readonly contexte: ReadonlyArray<{ readonly collection: string; readonly nom: string; readonly mode: string; readonly nomDuMode: string }>;
  readonly portee: { readonly resolutions: number; readonly partiel: boolean; readonly manquees: readonly string[] };
  readonly constats: ReadonlyArray<{
    readonly nature: NatureDeConstat;
    readonly enCause: { readonly id: string; readonly nom: string };
    readonly mode?: string;
    readonly occurrences: ReadonlyArray<{ readonly depart: string; readonly nom: string; readonly mode: string; readonly nomDuMode: string }>;
    readonly chemin: ReadonlyArray<{ readonly variable: string; readonly nom: string; readonly mode: string; readonly nomDuMode: string; readonly source: string }>;
  }>;
}

export function rapportDeDiagnostic(index: Index, contexte: Contexte, diagnostic: Diagnostic): RapportDeDiagnostic {
  return {
    format: FORMAT_DU_RAPPORT,
    version: VERSION_DU_RAPPORT,
    fichier: index.releve.fichier,
    revision: index.releve.revision,
    luA: index.releve.luA,
    contexte: familles(index).filter((famille) => contexte[famille.id] !== undefined).map((famille) => ({ collection: famille.id, nom: famille.nom, mode: contexte[famille.id], nomDuMode: nomDeMode(index, contexte[famille.id]) })),
    portee: { resolutions: diagnostic.resolutions, partiel: diagnostic.partiel, manquees: index.releve.manquees.map((manquee) => manquee.id) },
    constats: diagnostic.constats.map((constat) => ({
      nature: constat.nature,
      enCause: { id: constat.enCause, nom: nomComplet(index, constat.enCause) },
      ...(constat.mode ? { mode: constat.mode } : {}),
      occurrences: constat.occurrences.map((occurrence) => ({ depart: occurrence.depart, nom: nomComplet(index, occurrence.depart), mode: occurrence.mode, nomDuMode: nomDeMode(index, occurrence.mode) })),
      chemin: constat.chemin.map((etape) => ({ variable: etape.variable, nom: nomComplet(index, etape.variable), mode: etape.mode, nomDuMode: nomDeMode(index, etape.mode), source: texteDeSource(index, etape.source) })),
    })),
  };
}
