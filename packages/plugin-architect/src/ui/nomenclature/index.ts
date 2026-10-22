/** Monte l'écran des noms dans l'hôte que l'interface d'Architect lui donne : la coquille reçoit ensuite les messages du sandbox. */
import type { MessageDeNomenclature, UiMessage } from '../../messages/nomenclature';
import { monterAAppliquer } from './aAppliquer';
import { monterATrancher } from './aTrancher';
import { monterConfiguration } from './configuration';
import { creerCoquille, type Coquille } from './coquille';
import { monterFeuilles } from './feuilles';
import { monterPremierLancement } from './premierLancement';
import { monterRegles } from './regles';

export interface NomenclatureMontee {
  readonly coquille: Coquille;
  recevoir(message: MessageDeNomenclature): void;
}

export function monterNomenclature(hote: HTMLElement, envoyer: (message: UiMessage) => void): NomenclatureMontee {
  const coquille = creerCoquille(hote, envoyer, { poignee: false });
  monterPremierLancement(coquille);
  monterAAppliquer(coquille);
  monterATrancher(coquille);
  monterConfiguration(coquille);
  monterFeuilles(coquille, monterRegles(coquille));
  return { coquille, recevoir: (message) => coquille.frontiere.recevoir(message) };
}
