/** Monte l'écran des noms dans l'hôte que l'interface d'Architect lui donne : la coquille reçoit ensuite les messages du sandbox. */
import type { MessageDeNomenclature, UiMessage } from '../../messages/nomenclature';
import { monterAAppliquer } from './aAppliquer';
import { monterATrancher } from './aTrancher';
import { monterConfiguration } from './configuration';
import { creerCoquille, type Coquille } from './coquille';
import { monterFeuilles } from './feuilles';
import { monterPremierLancement } from './premierLancement';
import type { Reserve } from './renommages';
import { monterRegles } from './regles';

export interface NomenclatureMontee {
  readonly coquille: Coquille;
  /** Les renommages cochés de Corrections, que la table des tokens montre dans le nom des variables. */
  readonly renommages: Reserve;
  recevoir(message: MessageDeNomenclature): void;
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

export function monterNomenclature(hote: HTMLElement, envoyer: (message: UiMessage) => void, { appartient, enleverLeFiltre, rechercher, rechercherLeTerme }: OptionsDeNomenclature): NomenclatureMontee {
  const coquille = creerCoquille(hote, envoyer, { poignee: false, enleverLeFiltre, rechercher, rechercherLeTerme });
  monterPremierLancement(coquille);
  const renommages = monterAAppliquer(coquille, { appartient });
  monterATrancher(coquille);
  monterConfiguration(coquille);
  monterFeuilles(coquille, monterRegles(coquille));
  return { coquille, renommages, recevoir: (message) => coquille.frontiere.recevoir(message) };
}
