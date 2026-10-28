/**
 * Le côté interface du build d'expériences : `globalThis.ucmExperience('E1')` demande une expérience au sandbox, et l'interface
 * envoie un message toutes les 16 ms pendant E3. Le build normal n'a pas `UCM_ARCHITECT_EXPERIENCES` : rien n'est posé, rien
 * n'est envoyé, et les signaux du sandbox restent sans effet.
 */
export const experiencesActives = (globale: { UCM_ARCHITECT_EXPERIENCES?: unknown } = globalThis as { UCM_ARCHITECT_EXPERIENCES?: unknown }): boolean => globale.UCM_ARCHITECT_EXPERIENCES === true;

export const estUnSignalDExperience = (brut: unknown): brut is { type: 'experience-signal'; etat: 'debut' | 'fin' } =>
  typeof brut === 'object' && brut !== null && (brut as { type?: unknown }).type === 'experience-signal';

export const estUneSortieDExperience = (brut: unknown): brut is { type: 'experience-sortie'; objet: Record<string, unknown> } =>
  typeof brut === 'object' && brut !== null && (brut as { type?: unknown }).type === 'experience-sortie';

export interface OptionsDExperiencesDeLInterface {
  readonly actif?: boolean;
  readonly envoyer: (message: { type: 'experience'; code: string } | { type: 'experience-tic' }) => void;
  readonly globale?: Record<string, unknown>;
  readonly setInterval?: (rappel: () => void, ms: number) => unknown;
  readonly clearInterval?: (id: unknown) => void;
}

interface Panneau {
  lance(code: string): void;
  recoit(objet: Record<string, unknown>): void;
}

/** Pose `ucmExperience` et rend le récepteur des signaux du sandbox ; faux et sans effet hors du build d'expériences. */
export function installerLesExperiences(options: OptionsDExperiencesDeLInterface): { recevoir(brut: unknown): boolean } {
  if (!(options.actif ?? experiencesActives())) return { recevoir: () => false };
  const globale = options.globale ?? (globalThis as Record<string, unknown>);
  const demarrer = options.setInterval ?? ((rappel, ms) => setInterval(rappel, ms));
  const arreter = options.clearInterval ?? ((id) => clearInterval(id as ReturnType<typeof setInterval>));
  let tic: unknown = null;
  // La console de Figma s'ouvre sur un autre contexte que l'iframe de l'interface : des boutons évitent de le chercher.
  const panneau = typeof document !== 'undefined' && document.body ? poserLePanneau((code) => lancer(code)) : null;
  function lancer(code: string): void {
    panneau?.lance(code);
    options.envoyer({ type: 'experience', code });
  }
  globale.ucmExperience = lancer;
  return {
    recevoir(brut) {
      if (estUneSortieDExperience(brut)) { panneau?.recoit(brut.objet); return true; }
      if (!estUnSignalDExperience(brut)) return false;
      if (brut.etat === 'debut' && tic === null) tic = demarrer(() => options.envoyer({ type: 'experience-tic' }), 16);
      if (brut.etat === 'fin' && tic !== null) { arreter(tic); tic = null; }
      return true;
    },
  };
}

const CODES_DU_PANNEAU = ['E1', 'E1-froid', 'E2', 'E3', 'E4', 'E4-fin', 'E5', 'E5-fin', 'E6'] as const;

const AIDES_DU_PANNEAU: Readonly<Record<(typeof CODES_DU_PANNEAU)[number], string>> = {
  E1: 'Sélectionnez le Button, cliquez, attendez quelques minutes.',
  'E1-froid': 'Rouvrez le fichier Figma, sélectionnez le Button, cliquez, attendez environ une minute.',
  E2: 'Sélectionnez le Button et cliquez. Refaites-le après une mise à jour de library non acceptée.',
  E3: 'Sélectionnez le Button, cliquez, ne touchez à rien.',
  E4: 'Cliquez, puis faites les six gestes affichés sur le Button.',
  'E4-fin': 'Cliquez après les six gestes de E4.',
  E5: 'Cliquez, republiez l\'icône dans sa library, puis acceptez la mise à jour ici.',
  'E5-fin': 'Cliquez après avoir accepté la mise à jour.',
  E6: 'Cliquez et attendez environ 7 minutes, sans toucher au fichier.',
};

/**
 * Une rangée de boutons fixée en bas de la fenêtre, un par expérience, l'état de la dernière lancée et les objets reçus, à
 * copier. Une expérience longue (E1, E6) ne rend rien avant sa fin : l'état dit qu'elle tourne.
 */
function poserLePanneau(lancer: (code: string) => void): Panneau {
  const panneau = document.createElement('div');
  panneau.setAttribute('style', 'position:fixed;left:4px;right:4px;bottom:4px;z-index:99999;display:flex;flex-direction:column;gap:4px;padding:4px;background:#222;color:#eee;border-radius:4px;font:11px sans-serif;');
  const boutons = document.createElement('div');
  boutons.setAttribute('style', 'display:flex;gap:4px;flex-wrap:wrap;align-items:center;');
  for (const code of CODES_DU_PANNEAU) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.textContent = code;
    bouton.title = AIDES_DU_PANNEAU[code];
    bouton.setAttribute('style', 'font:11px sans-serif;padding:2px 6px;');
    bouton.addEventListener('click', () => lancer(code));
    boutons.append(bouton);
  }
  const copier = document.createElement('button');
  copier.type = 'button';
  copier.textContent = 'Copier';
  copier.title = 'Copie tous les résultats, à coller dans _local/vitesse-analyse/.';
  copier.setAttribute('style', 'font:11px sans-serif;padding:2px 6px;margin-left:auto;');
  const etat = document.createElement('span');
  etat.textContent = 'Prêt.';
  const sorties = document.createElement('textarea');
  sorties.readOnly = true;
  sorties.setAttribute('style', 'display:none;height:90px;font:10px monospace;background:#111;color:#eee;border:0;resize:vertical;');
  copier.addEventListener('click', () => {
    sorties.select();
    // `navigator.clipboard` est refusé dans l'iframe d'un plugin.
    document.execCommand('copy');
    etat.textContent = 'Copié.';
  });
  boutons.append(copier);
  panneau.append(boutons, etat, sorties);
  document.body.append(panneau);
  return {
    lance(code) { etat.textContent = `${code} en cours… (E1 et E6 durent plusieurs minutes)`; },
    recoit(objet) {
      const code = String(objet.experience ?? '?');
      etat.textContent = 'erreur' in objet ? `${code} : erreur, ${String(objet.erreur)}` : `${code} : résultat reçu.`;
      sorties.style.display = 'block';
      sorties.value += `${JSON.stringify(objet)}\n`;
      sorties.scrollTop = sorties.scrollHeight;
    },
  };
}
