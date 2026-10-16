/** Une lecture concurrente est refusée et un échec libère le geste suivant. */
import type { ConventionsParCategorie } from '@ucm-kit/core/referentiel';
import { analyserInventaire } from './analyse';
import { lireInventaire, type PortDeLecture } from './lecture';
import type { PluginMessage } from './messages';

/** Le résultat ne contient que des données clonables par postMessage. */
export function creerRoutage(options: {
  readonly lecture: PortDeLecture;
  readonly pause: () => Promise<void>;
  readonly envoyer: (message: PluginMessage) => void;
  readonly lireConventions?: () => Promise<ConventionsParCategorie>;
}) {
  let enVol = false;
  let derniereDemande = 0;
  return async (demande: number): Promise<void> => {
    if (demande <= derniereDemande) return;
    derniereDemande = demande;
    if (enVol) {
      options.envoyer({ type: 'erreur', demande, message: 'Une analyse est en cours. Attendez sa fin, puis relancez l’analyse.' });
      return;
    }
    enVol = true;
    try {
      const inventaire = await lireInventaire(options.lecture, {
        pause: options.pause,
        avancement: (avancement) => options.envoyer({ type: 'lecture', demande, avancement }),
      });
      const conventions = await options.lireConventions?.();
      options.envoyer({ type: 'pret', demande, analyse: analyserInventaire(inventaire, conventions) });
    } catch {
      options.envoyer({ type: 'erreur', demande, message: 'L’analyse du fichier n’a pas abouti. Relancez l’analyse.' });
    } finally {
      enVol = false;
    }
  };
}
