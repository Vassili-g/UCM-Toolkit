/**
 * Les gestes du sandbox qui ne lisent pas seulement : afficher un calque, et
 * demander à Figma la valeur d'une variable sur un calque. Ni l'un ni l'autre
 * ne modifie le document. Afficher change la page courante, la sélection et
 * la vue, à la demande du designer.
 */
import { convertirValeur } from './lecture';
import type { ValeurDeFigma } from './messages';

interface NoeudNavigable {
  readonly id: string;
  readonly type: string;
  readonly parent: NoeudNavigable | null;
  readonly removed?: boolean;
}

/** Le port de navigation : ce que `figma` offre pour retrouver et montrer un calque. */
export interface PortDeNavigation {
  getNodeByIdAsync(id: string): Promise<NoeudNavigable | null>;
  montrer(page: NoeudNavigable, calque: NoeudNavigable): Promise<void>;
}

/** Retrouve le calque avant de naviguer : un calque supprimé depuis l'analyse rend `introuvable`. */
export async function afficherCalque(port: PortDeNavigation, id: string): Promise<'affiche' | 'introuvable'> {
  let calque: NoeudNavigable | null;
  try {
    calque = await port.getNodeByIdAsync(id);
  } catch {
    return 'introuvable';
  }
  if (!calque || calque.removed || calque.type === 'PAGE' || calque.type === 'DOCUMENT') return 'introuvable';
  let page: NoeudNavigable | null = calque.parent;
  while (page && page.type !== 'PAGE') page = page.parent;
  if (!page) return 'introuvable';
  await port.montrer(page, calque);
  return 'affiche';
}

interface VariableConsultable {
  resolveForConsumer(consommateur: never): { value: unknown };
}

/** Le port de vérification : la variable et le calque, lus par identifiant. */
export interface PortDeVerification {
  getVariableByIdAsync(id: string): Promise<VariableConsultable | null>;
  getNodeByIdAsync(id: string): Promise<unknown>;
}

/** La valeur de chaque variable pour le calque, selon Figma. */
export async function valeursDeFigma(port: PortDeVerification, calque: string, variables: readonly string[]): Promise<ValeurDeFigma[]> {
  const noeud = await port.getNodeByIdAsync(calque).catch(() => null);
  if (!noeud) return variables.map((variable) => ({ variable, erreur: 'calque-introuvable' }));
  const valeurs: ValeurDeFigma[] = [];
  for (const variable of variables) {
    try {
      const trouvee = await port.getVariableByIdAsync(variable);
      if (!trouvee) {
        valeurs.push({ variable, erreur: 'variable-introuvable' });
        continue;
      }
      valeurs.push({ variable, valeur: convertirValeur(trouvee.resolveForConsumer(noeud as never).value) });
    } catch (erreur) {
      valeurs.push({ variable, erreur: erreur instanceof Error ? erreur.message : String(erreur) });
    }
  }
  return valeurs;
}
