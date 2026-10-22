/**
 * Les signaux de chemin : un chemin de token, un variant cité dans une phrase,
 * un segment qui part ou qui arrive, la pastille d'une couleur. Un chemin reste
 * gris tant que l'écran n'a rien à en montrer ; seul un terme désigné prend une
 * couleur. Les classes viennent de `langage.css`.
 */

export interface OptionsDeChemin {
  /** Les termes à mettre en avant : rose pour un groupe, olive pour la variable. */
  readonly vus?: readonly string[];
  /** Les segments qui arrivent, en vert. */
  readonly ajouts?: readonly string[];
  /** Les segments qui arrivent ouvrent la carte qui les propose. */
  readonly lien?: boolean;
  /** Le segment sous le pointeur, parmi les ajouts. */
  readonly survol?: string | null;
  /** Le chemin sert de titre : un cran plus grand. */
  readonly titre?: boolean;
  /** Le chemin est cité dans une phrase : un fond discret le sépare du texte. */
  readonly enPhrase?: boolean;
}

function segment(texte: string, estVariable: boolean, options: OptionsDeChemin): HTMLSpanElement {
  const { vus = [], ajouts = [], lien = false, survol = null } = options;
  const element = document.createElement('span');
  element.textContent = texte;
  // Un littéral par classe : la loi des styles ne lit que les classes écrites en toutes lettres.
  if (ajouts.includes(texte)) {
    element.className = 'ch-ajout';
    if (lien) element.classList.add('ch-lien');
    if (texte === survol) element.classList.add('survol');
  } else if (vus.includes(texte)) {
    if (estVariable) element.className = 'ch-variable-vu';
    else element.className = 'ch-groupe-vu';
  } else if (estVariable) {
    element.className = 'ch-variable';
  } else {
    element.className = 'ch-groupe';
  }
  return element;
}

/** Un chemin montré comme objet : groupes en gris, variable en gris clair. */
export function creerChemin(nom: string, options: OptionsDeChemin = {}): HTMLSpanElement {
  const racine = document.createElement('span');
  racine.className = 'ch';
  if (options.titre) racine.classList.add('ch-titre');
  if (options.enPhrase) racine.classList.add('ch-inline');
  const segments = nom.split('/');
  segments.forEach((texte, rang) => {
    if (rang > 0) {
      const barre = document.createElement('span');
      barre.className = 'ch-groupe';
      barre.textContent = '/';
      racine.append(barre);
    }
    racine.append(segment(texte, rang === segments.length - 1, options));
  });
  return racine;
}

/** Un chemin cité au milieu d'un texte. */
export function creerCheminEnPhrase(nom: string, options: OptionsDeChemin = {}): HTMLSpanElement {
  return creerChemin(nom, { ...options, enPhrase: true });
}

/** Un variant écrit comme Figma le nomme (`Severity=info, Variant=standard`), cité dans une phrase. */
export function creerVariantEnPhrase(...paires: readonly string[]): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'ch ch-inline ch-variant';
  element.textContent = paires.join(', ');
  return element;
}

/** Un chemin écrit dans une cellule, en police de code, dont des segments peuvent partir ou arriver. */
export function creerCheminLigne(...parties: readonly (string | Node)[]): HTMLElement {
  const element = document.createElement('code');
  element.className = 'chemin-ligne';
  element.append(...parties);
  return element;
}

/** Le segment remplacé : rouge, barré. */
export function creerSegmentAncien(texte: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'seg-ancien';
  element.textContent = texte;
  return element;
}

/** Le segment nouveau : vert. */
export function creerSegmentNouveau(texte: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'seg-nouveau';
  element.textContent = texte;
  return element;
}

/** La pastille carrée d'une couleur ; `couleur` est une valeur CSS. */
export function creerPastilleDeCouleur(couleur: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'puce-couleur';
  element.style.background = couleur;
  return element;
}
