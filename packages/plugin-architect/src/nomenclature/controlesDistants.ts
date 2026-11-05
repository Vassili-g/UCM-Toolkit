/**
 * Les contrôles de structure du côté sandbox : `controler` confie les deux contrôles du kit au Worker de l'interface, par le port du calcul
 * des noms (`distant.ts`), et les mène lui-même quand le Worker manque ou ne répond pas. Le repli est celui de G1b : port absent, Worker
 * impossible, démarrage muet, échec ou délai. Les deux voies appellent `controlesDeStructure.ts`, donc rendent les mêmes constats, dans le
 * même ordre.
 *
 * Le port est celui de `sandbox/nomenclature.ts` : l'interface renvoie toutes les réponses du Worker sous les types `noms-calcules` et
 * `noms-non-calcules`, et un seul port les range. Les demandes de contrôle prennent donc un numéro de plus de `DEMANDES_DE_CONTROLE`, pour ne
 * jamais croiser celui d'une demande de Nomenclature : les deux domaines numérotent chacun à part.
 *
 * Le journal du mode Tokens note les deux contrôles (`controler-le-catalogue`, `controler-l-integrite`) avec la voie qui les a menés et, pour
 * le Worker, `worker-transfert`, `worker-demarrage` et `worker-retour`. Il ne note pas `worker-calcul` : les deux contrôles le couvrent déjà.
 *
 * Le module n'importe pas `figma`.
 */
import { noterUnPassageDeTokens, type PassageANoter, type VoieDuCalcul } from '../lecture';
import type { CauseDeRepli } from '../messages/calculDesNoms';
import { controlerEtMesurer, type ConstatsDeStructure, type EntreeDesControles, type HeuresDesControles } from './controlesDeStructure';
import type { PortDeCalculDistant } from './distant';

/** Les numéros des demandes de contrôle commencent ici ; les demandes de Nomenclature restent très en dessous. */
export const DEMANDES_DE_CONTROLE = 2 ** 30;

/**
 * Le délai, en millisecondes, après lequel le sandbox mène les contrôles lui-même. Les contrôles de 2 415 variables prennent 2,6 s dans le
 * sandbox de Figma : attendre 120 s un Worker muet coûterait plus que le calcul qu'il remplace.
 */
export const DELAI_DES_CONTROLES_DISTANTS = 15_000;

export interface IssueDesControles {
  readonly constats: ConstatsDeStructure;
  /** Qui a mené les contrôles. */
  readonly voie: VoieDuCalcul;
  /** Pourquoi le sandbox les a menés quand le Worker avait été tenté. */
  readonly repli?: CauseDeRepli;
}

export interface OptionsDesControlesDistants {
  /** Le port du calcul hors du sandbox ; `null` quand le sandbox n'en a pas, les contrôles s'y font alors. */
  readonly port: PortDeCalculDistant | null;
  readonly delai?: number;
  readonly maintenant?: () => number;
  /** Range un passage dans le journal du mode Tokens. */
  readonly noter?: (passage: PassageANoter) => void;
}

export interface ControlesDistants {
  /** Les constats des deux contrôles de `entree`, pour la demande de structure `demande`. Ne lève que si le contrôle du kit lève, comme avant le Worker. */
  controler(demande: number, entree: EntreeDesControles): Promise<IssueDesControles>;
}

export function creerControlesDistants(options: OptionsDesControlesDistants): ControlesDistants {
  const maintenant = options.maintenant ?? Date.now;
  const noter = options.noter ?? noterUnPassageDeTokens;
  const delai = options.delai ?? DELAI_DES_CONTROLES_DISTANTS;

  const noterLesControles = (demande: number, heures: HeuresDesControles, voie: VoieDuCalcul, repli?: CauseDeRepli): void => {
    const suite = { demande, voie, ...(repli ? { repli } : {}) };
    noter({ phase: 'controler-le-catalogue', debut: heures.catalogue.debut, fin: heures.catalogue.fin, ...suite });
    noter({ phase: 'controler-l-integrite', debut: heures.integrite.debut, fin: heures.integrite.fin, ...suite });
  };

  return {
    async controler(demande, entree) {
      let repli: CauseDeRepli | undefined;
      if (options.port) {
        try {
          const requete = options.port.calculer({ demande: DEMANDES_DE_CONTROLE + demande, generation: demande, travail: { sorte: 'controler', entree }, delai });
          const issue = await requete.issue;
          if (issue.type === 'calcule' && issue.resultat.sorte === 'constats') {
            const { mesure, envoyeA, recuA, resultat } = issue;
            // Le transfert court jusqu'au Worker quand il tournait déjà ; sinon il s'arrête à l'interface et le démarrage prend la suite.
            noter({ phase: 'worker-transfert', debut: envoyeA, fin: mesure.demarrage ? mesure.recuA : mesure.travailleurRecuA, demande });
            if (mesure.demarrage) noter({ phase: 'worker-demarrage', debut: mesure.recuA, fin: mesure.travailleurRecuA, demande });
            noterLesControles(demande, resultat.heures, 'worker');
            noter({ phase: 'worker-retour', debut: mesure.calculFinA, fin: recuA, demande });
            return { constats: { catalogue: resultat.catalogue, integrite: resultat.integrite }, voie: 'worker' };
          }
          repli = issue.type === 'repli' ? issue.cause : 'echec';
        } catch {
          repli = 'echec';
        }
      }
      const { heures, ...constats } = controlerEtMesurer(entree, maintenant);
      noterLesControles(demande, heures, 'sandbox', repli);
      return { constats, voie: 'sandbox', ...(repli ? { repli } : {}) };
    },
  };
}
