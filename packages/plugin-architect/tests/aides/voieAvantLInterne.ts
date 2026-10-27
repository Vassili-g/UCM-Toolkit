/**
 * La voie d'Architect telle qu'elle était avant 7.7, recopiée sans changement de
 * corps : le moteur publie son contrat, `lireLesRegles` en relit les `props` et
 * le `stateModel` par `JSON.parse(content)`. Le banc de parité installe ces deux
 * lecteurs à la place de ceux qui lisent le résultat interne ; la case 7.8
 * retire cette voie et ce fichier avec elle.
 */
import { extractRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import { analyserLeComposant, type ComponentExport } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { BUDGET_DE_LAYERS_PAR_DEFAUT } from 'ucm-plugin-socle/src/composant/contract/budget';
import { extractContractPropertyModel } from 'ucm-plugin-socle/src/composant/contract/parsers';
import { modeleDeRegles, restreindreAuParent } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ContratLu } from 'ucm-plugin-socle/src/composant/template/modele';
import type { InventairesDeLaDemande } from 'ucm-plugin-socle/src/composant/analyse/inventaires';
import { proprietesDuModele, type ReleveDesRegles } from '../../src/regles';
import { pageDuNoeud, type Lecteurs, type MoteurRetenu } from '../../src/sandbox/analyse';

function clesDeclarees(composant: ComponentNode | ComponentSetNode): ReadonlySet<string> | null {
  const porteur = composant.type === 'COMPONENT' && composant.parent?.type === 'COMPONENT_SET' ? composant.parent : composant;
  try {
    return new Set(Object.keys(extractContractPropertyModel(porteur.componentPropertyDefinitions, []).props));
  } catch {
    return null;
  }
}

function pageDe(node: BaseNode): PageNode {
  let courant: BaseNode | null = node;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return (courant as PageNode | null) ?? figma.currentPage;
}

export async function lireLesReglesAvant(
  composant: ComponentNode | ComponentSetNode,
  exportDuMoteur: Pick<ComponentExport, 'content' | 'imbriques'>,
  inventaires?: InventairesDeLaDemande,
): Promise<ReleveDesRegles> {
  const page = pageDe(composant);
  const scanDesRegles = () => extractRules(composant, page);
  const lues = await (inventaires ? inventaires.reglesDeLaPage(page, composant, scanDesRegles) : scanDesRegles());
  const contrat = JSON.parse(exportDuMoteur.content) as ContratLu;
  const declarees = clesDeclarees(composant);
  const surface = declarees ? new Set([...declarees, ...exportDuMoteur.imbriques.auParent]) : null;
  const modele = modeleDeRegles(composant.name, surface ? restreindreAuParent(contrat, surface) : contrat);
  return {
    composant: { id: composant.id, nom: composant.name },
    instancePresente: lues.releve.conteneurDuComposant,
    modele,
    proprietes: proprietesDuModele(modele),
    documentees: [...Object.keys(lues.propDescriptions), ...Object.keys(lues.booleanDescriptions)],
  };
}

/** Les contrats publiés, par résultat interne : l'ancienne voie relit le contrat de la même analyse. */
const publies = new WeakMap<MoteurRetenu, ComponentExport>();

/** Les lecteurs d'avant : le moteur publie, les règles se lisent dans le contrat publié. */
export const LECTEURS_AVANT: Pick<Lecteurs, 'moteur' | 'regles'> = {
  moteur: async (sujet, jeton, { figma }, progresser, cooperation, inventaires) => {
    const resultat = await analyserLeComposant(async (texte) => {
      progresser?.(texte.includes('variables') || texte.includes('exemples') || texte.includes('contrat') ? 'structure' : 'imbriques');
    }, {
      composant: sujet.noeud as unknown as ComponentSetNode,
      page: pageDuNoeud(sujet.noeud, figma.currentPage),
      budgetDeLayers: BUDGET_DE_LAYERS_PAR_DEFAUT,
      jeton,
      cooperation,
      inventaires,
      respirer: () => new Promise((resolve) => setTimeout(resolve, 0)),
    });
    if (resultat.etat === 'annulee') return resultat;
    publies.set(resultat.interne!, resultat.export);
    return { etat: 'calculee', interne: resultat.interne! };
  },
  regles: (sujet, interne, _contexte, inventaires) =>
    lireLesReglesAvant(sujet.noeud as unknown as ComponentSetNode, publies.get(interne)!, inventaires),
};
