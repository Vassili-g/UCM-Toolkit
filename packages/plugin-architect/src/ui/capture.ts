/**
 * La capture du build de capture : le sandbox l'envoie sous `capture-architect`, hors de `PluginMessage`, et l'interface la
 * propose en téléchargement. Le build normal n'a pas `UCM_ARCHITECT_CAPTURER` et laisse le message sans effet.
 */
import type { MessageDeCapture } from '../sandbox/capture';
import { telecharger } from './telechargement';

export const estUneCapture = (brut: unknown): brut is MessageDeCapture => typeof brut === 'object' && brut !== null && (brut as { type?: unknown }).type === 'capture-architect';

export const captureActive = (globale: { UCM_ARCHITECT_CAPTURER?: unknown } = globalThis as { UCM_ARCHITECT_CAPTURER?: unknown }): boolean => globale.UCM_ARCHITECT_CAPTURER === true;

/**
 * Télécharge le fichier et écrit son résumé en console. Le contenu reste aussi dans `globalThis.UCM_ARCHITECT_CAPTURE`, de quoi
 * le copier depuis la console si le téléchargement échoue. Rend vrai quand le message a été pris.
 */
export function recevoirLaCapture(message: MessageDeCapture, options: { actif?: boolean; telecharger?: typeof telecharger; globale?: Record<string, unknown> } = {}): boolean {
  if (!(options.actif ?? captureActive())) return false;
  (options.globale ?? (globalThis as Record<string, unknown>)).UCM_ARCHITECT_CAPTURE = message.contenu;
  console.info('Capture : résumé', message.resume);
  (options.telecharger ?? telecharger)(message.nom, message.contenu, 'application/json');
  return true;
}
