/**
 * Ce qui change et ce qui vient de changer : les deux colonnes Aujourd'hui et
 * Après l'application, une ligne de diff, la ligne verte d'une écriture réussie
 * et la carte qu'un clic ailleurs vient d'ouvrir. Les classes viennent de
 * `langage.css`.
 */
import type { Contenu } from './Alerte';

/** La légende des deux colonnes d'un diff. */
export function creerColonnes(avant: string, apres: string, { avecCase = true }: { avecCase?: boolean } = {}): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'colonnes-tete';
  if (!avecCase) element.classList.add('sans-case');
  if (avecCase) element.append(document.createElement('span'));
  const colonneAvant = document.createElement('span');
  colonneAvant.textContent = avant;
  const colonneApres = document.createElement('span');
  colonneApres.textContent = apres;
  element.append(colonneAvant, colonneApres);
  return element;
}

export interface OptionsDeLigneDeDiff {
  /** Cochée ou non ; `null` pour une ligne sans case. */
  readonly coche?: boolean | null;
  /** Un nom que l'annulation ne touchera pas : gris. */
  readonly reste?: boolean;
  /** Une ligne de règle, sur deux colonnes de jetons. */
  readonly regle?: boolean;
}

/** Une ligne de diff : le nom actuel, le nom après l'application. */
export function creerLigneDeDiff(avant: Contenu, apres: Contenu, { coche = true, reste = false, regle = false }: OptionsDeLigneDeDiff = {}): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'diff';
  if (coche === null) element.classList.add('sans-case');
  if (reste) element.classList.add('reste');
  if (regle) element.classList.add('regle');
  if (coche !== null) {
    const caseACocher = document.createElement('input');
    caseACocher.type = 'checkbox';
    caseACocher.className = 'case';
    caseACocher.checked = coche;
    element.append(caseACocher);
  }
  const colonneAvant = document.createElement('span');
  colonneAvant.className = 'chemin';
  colonneAvant.append(avant);
  const colonneApres = document.createElement('span');
  colonneApres.className = 'chemin-apres';
  const fleche = document.createElement('span');
  fleche.className = 'fleche-ligne';
  fleche.textContent = '→ ';
  colonneApres.append(fleche, apres);
  element.append(colonneAvant, colonneApres);
  return element;
}

/** Une écriture réussie : une ligne verte, puis comment la défaire. */
export function creerResultat(texte: Contenu, meta?: Contenu): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'resultat';
  element.setAttribute('role', 'status');
  const corps = document.createElement('div');
  corps.className = 'resultat-corps';
  const ligne = document.createElement('span');
  const coche = document.createElement('span');
  coche.setAttribute('aria-hidden', 'true');
  coche.textContent = '✓ ';
  ligne.append(coche, texte);
  corps.append(ligne);
  if (meta !== undefined) {
    const suite = document.createElement('span');
    suite.className = 'meta';
    suite.append(meta);
    corps.append(suite);
  }
  element.append(corps);
  return element;
}

/** La carte qu'un clic ailleurs vient d'ouvrir. */
export function marquerCarteCiblee(carte: Element): void {
  carte.classList.add('carte-ciblee');
}
