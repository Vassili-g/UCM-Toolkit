/**
 * Les jetons d'un renommage : un terme isolé dans une règle, rouge s'il part,
 * vert s'il reste, gris pour une forme d'écriture, rose ou olive pour sa place.
 * Les classes viennent de `langage.css`.
 */

export type TonDeJeton = 'retire' | 'retenu' | 'neutre' | 'groupe' | 'variable';

export interface OptionsDeJeton {
  /** Un cran de texte plus petit, pour une ligne de liste. */
  readonly petit?: boolean;
}

export function creerJeton(texte: string, ton: TonDeJeton, { petit = false }: OptionsDeJeton = {}): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'jeton';
  // Un littéral par classe : la loi des styles ne lit que les classes écrites en toutes lettres.
  if (ton === 'retire') element.classList.add('jeton-retire');
  if (ton === 'retenu') element.classList.add('jeton-retenu');
  if (ton === 'neutre') element.classList.add('jeton-neutre');
  if (ton === 'groupe') element.classList.add('jeton-groupe');
  if (ton === 'variable') element.classList.add('jeton-variable');
  if (petit) element.classList.add('petit');
  element.textContent = texte;
  return element;
}

/** La flèche entre l'avant et l'après, décorative. */
export function creerFleche(): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'fleche';
  element.setAttribute('aria-hidden', 'true');
  element.textContent = '→';
  return element;
}

/** Le terme qui part, la flèche, le terme qui le remplace. */
export function creerRenommage(ancien: string, nouveau: string): [HTMLSpanElement, HTMLSpanElement, HTMLSpanElement] {
  return [creerJeton(ancien, 'retire'), creerFleche(), creerJeton(nouveau, 'retenu')];
}

/** Un mot qui prend la couleur de sa place, sans fond : rose en groupe, olive en variable. */
export function creerMotDePlace(texte: string, place: 'groupe' | 'variable'): HTMLSpanElement {
  const element = document.createElement('span');
  if (place === 'groupe') element.className = 'mot-groupe';
  else element.className = 'mot-variable';
  element.textContent = texte;
  return element;
}
