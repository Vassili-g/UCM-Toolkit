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
  // La console de Figma s'ouvre sur un autre contexte que l'iframe de l'interface : des boutons évitent de le chercher.
  if (typeof document !== 'undefined' && document.body) poserLePanneau((code) => options.envoyer({ type: 'experience', code }));
  return {
    recevoir(brut) {
      if (!estUnSignalDExperience(brut)) return false;
      if (brut.etat === 'debut' && tic === null) tic = demarrer(() => options.envoyer({ type: 'experience-tic' }), 16);
      if (brut.etat === 'fin' && tic !== null) { arreter(tic); tic = null; }
      return true;
    },
  };
}

const CODES_DU_PANNEAU = ['E1', 'E2', 'E3', 'E4', 'E4-fin', 'E5', 'E5-fin', 'E6'] as const;

/** Une rangée de boutons fixée en bas de la fenêtre, un par expérience ; les résultats restent dans la console. */
function poserLePanneau(lancer: (code: string) => void): void {
  const panneau = document.createElement('div');
  panneau.setAttribute('style', 'position:fixed;left:4px;bottom:4px;z-index:99999;display:flex;gap:4px;flex-wrap:wrap;padding:4px;background:#222;border-radius:4px;');
  for (const code of CODES_DU_PANNEAU) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.textContent = code;
    bouton.setAttribute('style', 'font:11px sans-serif;padding:2px 6px;');
    bouton.addEventListener('click', () => lancer(code));
    panneau.append(bouton);
  }
  document.body.append(panneau);
}
