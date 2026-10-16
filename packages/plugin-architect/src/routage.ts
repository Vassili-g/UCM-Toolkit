/** L'analyse courante constitue la seule autorité sur les noms que le document peut recevoir. */
import type { ConventionsParCategorie } from '@ucm-kit/core/referentiel';
import { analyserInventaire, type Analyse } from './analyse';
import { lireInventaire, relireInventaireAvantEcriture, type PortDeLecture } from './lecture';
import type { DemandeArchitect, PluginMessage } from './messages';
import { lireChoix } from './conventions';
import { appliquerNoms, type PortEcriture } from './ecriture';

/** Un recalcul conserve l'inventaire ; une application le relit avant toute mutation. */
export function creerRoutage(options: {
  readonly lecture: PortDeLecture;
  readonly ecriture?: PortEcriture;
  readonly pause: () => Promise<void>;
  readonly envoyer: (message: PluginMessage) => void;
  readonly lireConventions?: () => Promise<ConventionsParCategorie>;
  readonly lireConventionsRangees?: () => string;
}) {
  let enVol = false;
  let derniereDemande = 0;
  let analyseId = 0;
  let analyse: Analyse | undefined;
  let conventionsLues = '';
  return async (message: DemandeArchitect | number): Promise<void> => {
    const action: DemandeArchitect = typeof message === 'number' ? { type: 'analyser', demande: message } : message;
    const { demande } = action;
    if (demande <= derniereDemande) return;
    derniereDemande = demande;
    if (enVol) {
      options.envoyer({ type: 'erreur', demande, message: 'Une analyse est en cours. Attendez sa fin, puis relancez l’analyse.' });
      return;
    }
    if (action.type !== 'analyser' && (!analyse || action.analyseId !== analyseId)) {
      options.envoyer({ type: 'erreur', demande, message: 'Le fichier a changé. Relancez l’analyse avant d’appliquer ces noms.' });
      return;
    }
    enVol = true;
    try {
      if (action.type === 'appliquer') {
        if (!options.ecriture || action.ids.some((id) => !analyse!.normalisation.propositions.some((p) => p.id === id))) {
          options.envoyer({ type: 'erreur', demande, message: 'Le fichier a changé. Relancez l’analyse avant d’appliquer ces noms.' });
          return;
        }
        const session = await options.ecriture.ouvrir(analyse!.inventaire);
        const inventaire = await relireInventaireAvantEcriture(options.lecture);
        const resultat = appliquerNoms({ analyse: analyse!, inventaire, ids: action.ids, session, conventionsLues });
        analyse = undefined;
        options.envoyer({ type: 'application', demande, analyseId, resultat });
      } else {
        if (action.type === 'recalculer') {
          analyse = analyserInventaire(analyse!.inventaire, action.conventions, action.termesUcm);
        } else {
          analyse = undefined;
          conventionsLues = options.lireConventionsRangees?.() ?? '';
          const choix = lireChoix(conventionsLues);
          const inventaire = await lireInventaire(options.lecture, {
            pause: options.pause,
            avancement: (avancement) => options.envoyer({ type: 'lecture', demande, avancement }),
          });
          const conventions = choix?.conventions ?? await options.lireConventions?.();
          analyse = analyserInventaire(inventaire, conventions, choix?.termesUcm);
        }
        analyseId++;
        options.envoyer({ type: 'pret', demande, analyseId, analyse });
      }
    } catch {
      analyse = undefined;
      options.envoyer({ type: 'erreur', demande, message: 'L’analyse du fichier n’a pas abouti. Relancez l’analyse.' });
    } finally { enVol = false; }
  };
}
