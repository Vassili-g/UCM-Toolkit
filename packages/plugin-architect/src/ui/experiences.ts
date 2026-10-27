/**
 * Le côté interface du build d'expériences : `globalThis.ucmExperience('E1')` demande une expérience au sandbox, et l'interface
 * envoie un message toutes les 16 ms pendant E3. Le build normal n'a pas `UCM_ARCHITECT_EXPERIENCES` : rien n'est posé, rien
 * n'est envoyé, et les signaux du sandbox restent sans effet.
 */
export const experiencesActives = (globale: { UCM_ARCHITECT_EXPERIENCES?: unknown } = globalThis as { UCM_ARCHITECT_EXPERIENCES?: unknown }): boolean => globale.UCM_ARCHITECT_EXPERIENCES === true;

export const estUnSignalDExperience = (brut: unknown): brut is { type: 'experience-signal'; etat: 'debut' | 'fin' } =>
  typeof brut === 'object' && brut !== null && (brut as { type?: unknown }).type === 'experience-signal';

export interface OptionsDExperiencesDeLInterface {
  readonly actif?: boolean;
  readonly envoyer: (message: { type: 'experience'; code: string } | { type: 'experience-tic' }) => void;
  readonly globale?: Record<string, unknown>;
  readonly setInterval?: (rappel: () => void, ms: number) => unknown;
  readonly clearInterval?: (id: unknown) => void;
}

/** Pose `ucmExperience` et rend le récepteur des signaux du sandbox ; faux et sans effet hors du build d'expériences. */
export function installerLesExperiences(options: OptionsDExperiencesDeLInterface): { recevoir(brut: unknown): boolean } {
  if (!(options.actif ?? experiencesActives())) return { recevoir: () => false };
  const globale = options.globale ?? (globalThis as Record<string, unknown>);
  const demarrer = options.setInterval ?? ((rappel, ms) => setInterval(rappel, ms));
  const arreter = options.clearInterval ?? ((id) => clearInterval(id as ReturnType<typeof setInterval>));
  let tic: unknown = null;
  globale.ucmExperience = (code: string) => options.envoyer({ type: 'experience', code });
  return {
    recevoir(brut) {
      if (!estUnSignalDExperience(brut)) return false;
      if (brut.etat === 'debut' && tic === null) tic = demarrer(() => options.envoyer({ type: 'experience-tic' }), 16);
      if (brut.etat === 'fin' && tic !== null) { arreter(tic); tic = null; }
      return true;
    },
  };
}
