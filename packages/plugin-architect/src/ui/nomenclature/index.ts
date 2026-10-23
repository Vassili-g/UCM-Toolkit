/** Monte l'écran des noms dans l'hôte que l'interface d'Architect lui donne : la coquille reçoit ensuite les messages du sandbox. */
import type { MessageDeNomenclature, UiMessage } from '../../messages/nomenclature';
import type { MessageDeConfiguration } from '../../messages/configuration';
import { monterAAppliquer } from './aAppliquer';
import { monterATrancher } from './aTrancher';
import type { RegleRecue } from './reglesRecues';
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
  recevoirConfiguration(message: MessageDeConfiguration): void;
  /** Range dans l'Historique de la Configuration la création de `nombre` variables de `composant`, que « Annuler la création » défait. */
  noterLaCreation(nombre: number, composant: string, journal: boolean): void;
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
  /** Le bouton « Coller une préparation » de la Configuration : l'hôte ouvre la zone de texte du mode Composant. */
  readonly collerUnePreparation?: () => void;
}

export function monterNomenclature(hote: HTMLElement, envoyer: (message: UiMessage) => void, { appartient, enleverLeFiltre, rechercher, rechercherLeTerme, collerUnePreparation = () => {} }: OptionsDeNomenclature): NomenclatureMontee {
  const coquille = creerCoquille(hote, envoyer, { poignee: false, enleverLeFiltre, rechercher, rechercherLeTerme });
  monterPremierLancement(coquille);
  const renommages = monterAAppliquer(coquille, { appartient });
  const aTrancher = monterATrancher(coquille);
  const configuration = monterConfiguration(coquille, () => { coquille.fermerLaConfiguration(); collerUnePreparation(); });
  monterFeuilles(coquille, monterRegles(coquille));
  return { coquille, renommages, recevoir: (message) => coquille.frontiere.recevoir(message), recevoirConfiguration: configuration.recevoirConfiguration,
    noterLaCreation: configuration.noterLaCreation, poserLesReglesRecues: aTrancher.poserLesReglesRecues };
}
