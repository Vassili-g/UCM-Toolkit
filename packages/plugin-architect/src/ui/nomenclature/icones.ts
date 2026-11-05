/**
 * Les icônes des types de terme de la liste des règles, reprises de la maquette du vocabulaire (tour 2). Le gris dit ce qu'est un
 * terme ; seule l'icône de « À trancher » est ambre.
 */
import { creerSvgDuSigne } from 'ucm-plugin-socle/src/ui/Signe';
import type { TypeDeTerme } from '../../messages/nomenclature';

/** Le signe du kit de chaque type de terme : la famille `type-de-terme`, dont `question`, `applique`, `component` et `palette` sont repris. */
const SIGNE_DU_TYPE: Readonly<Record<TypeDeTerme, string>> = {
  'a-trancher': 'question',
  remplace: 'remplace',
  conforme: 'applique',
  'sans-regle': 'sans-regle',
  composant: 'component',
  palette: 'palette',
};

/**
 * L'icône d'un type dans son cadre de 16 px. Elle est décorative : le texte à côté, ou le titre de la section, nomme le type.
 * `titre`, quand il est donné, devient l'infobulle de l'icône.
 */
export function creerIconeDeType(type: TypeDeTerme, titre?: string): HTMLElement {
  const svg = creerSvgDuSigne(SIGNE_DU_TYPE[type], 16);
  const cadre = document.createElement('span');
  cadre.className = 'icone-type';
  cadre.classList.toggle('ambre', type === 'a-trancher');
  if (titre) cadre.title = titre;
  cadre.append(svg);
  return cadre;
}
