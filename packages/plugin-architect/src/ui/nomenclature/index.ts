/** Monte l'écran des noms dans l'hôte que l'interface d'Architect lui donne : la coquille reçoit ensuite les messages du sandbox. */
import type { MessageDeNomenclature, UiMessage } from '../../messages/nomenclature';
import type { MessageDeConfiguration } from '../../messages/configuration';
import type { MessageDePreparation } from '../../messages/preparation';
import type { PreparationVue } from '../../messages/preparation';
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { monterAAppliquer } from './aAppliquer';
import { monterATrancher } from './aTrancher';
import type { RegleRecue } from './reglesRecues';
import { monterConfiguration } from './configuration';
import { creerCoquille, type Coquille } from './coquille';
import { monterFeuilles } from './feuilles';
import { monterPremierLancement } from './premierLancement';
import type { Reserve } from './renommages';
import { monterRegles } from './regles';
import { TEXTES_PREPARATION } from '../textes/preparation';

export interface NomenclatureMontee {
  readonly coquille: Coquille;
  /** Les renommages cochés de Corrections, que la table des tokens montre dans le nom des variables. */
  readonly renommages: Reserve;
  recevoir(message: MessageDeNomenclature): void;
  recevoirConfiguration(message: MessageDeConfiguration): void;
  recevoirCreation(message: Extract<MessageDePreparation, { type: 'variables-creees' }>, composant?: string): void;
  recevoirPreparations(preparations: readonly PreparationVue[], ouvrir: (preparation: PreparationVue) => void): void;
  /** Pose les règles que le mode Composant a préparées, en tête de Questions. */
  poserLesReglesRecues(regles: readonly RegleRecue[]): void;
}

export interface OptionsDeNomenclature {
  /** Vrai quand le nom (une variable, ou une collection) fait partie de la collection de l'arbre. */
  readonly appartient: (identifiant: string, collection: string) => boolean;
  /** Le geste de la croix de la puce du filtre de l'arbre. */
  readonly enleverLeFiltre: () => void;
  /** Les liens qui écrivent dans la recherche de l'arbre. */
  readonly rechercher: (texte: string) => void;
  readonly rechercherLeTerme: (mot: string, formes: readonly string[]) => void;
}

export function monterNomenclature(hote: HTMLElement, envoyer: (message: UiMessage) => void, { appartient, enleverLeFiltre, rechercher, rechercherLeTerme }: OptionsDeNomenclature, ouvrirLaPreparation: () => void = () => {}): NomenclatureMontee {
  const coquille = creerCoquille(hote, envoyer, { poignee: false, enleverLeFiltre, rechercher, rechercherLeTerme });
  monterPremierLancement(coquille);
  const renommages = monterAAppliquer(coquille, { appartient });
  const aTrancher = monterATrancher(coquille);
  const configuration = monterConfiguration(coquille, () => { coquille.fermerLaConfiguration(); ouvrirLaPreparation(); });
  monterFeuilles(coquille, monterRegles(coquille));
  function recevoirPreparations(preparations: readonly PreparationVue[], ouvrir: (preparation: PreparationVue) => void): void {
    const preparation = preparations.find((item) => item.variables.some((variable) => variable.etat === 'a-creer'));
    if (!preparation) { coquille.poserAlerteDePreparation(null); return; }
    const nombre = preparation.variables.length;
    const voir = createButton({ label: TEXTES_PREPARATION.preparationVoirLesVariables(nombre), variant: 'secondary', compact: true, onClick: () => ouvrir(preparation) });
    voir.setAttribute('data-action', 'preparation-voir');
    coquille.poserAlerteDePreparation(creerAlerte('info', {
      titre: TEXTES_PREPARATION.preparationVariablesACreer(nombre, preparation.source.jeu.nom),
      texte: TEXTES_PREPARATION.preparationDansFichier,
      actions: [voir],
    }));
  }

  function recevoirCreation(message: Extract<MessageDePreparation, { type: 'variables-creees' }>, composant = 'Tag'): void {
    configuration.recevoirCreation(message, composant);
    if (message.refus !== null) {
      coquille.poserAlerteDePreparation(creerAlerte('info', { texte: TEXTES_PREPARATION.preparationRefus[message.refus] ?? TEXTES_PREPARATION.preparationRefus.inconnu }));
      return;
    }
    coquille.poserAlerteDePreparation(creerAlerte('tenu', {
      titre: TEXTES_PREPARATION.preparationVariablesCreees(message.creees, composant),
      texte: TEXTES_PREPARATION.preparationPublierCreation,
      meta: message.journal ? TEXTES_PREPARATION.preparationAnnulerCreation : TEXTES_PREPARATION.preparationRefus['journal-impossible'],
    }));
  }

  return { coquille, renommages, recevoir: (message) => coquille.frontiere.recevoir(message), recevoirConfiguration: configuration.recevoirConfiguration,
    recevoirCreation, recevoirPreparations, poserLesReglesRecues: aTrancher.poserLesReglesRecues };
}
