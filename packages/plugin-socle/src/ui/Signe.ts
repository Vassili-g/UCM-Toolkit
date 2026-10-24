/**
 * La tuile d'un signe : la sorte d'objet qu'une ligne ou une bande désigne
 * (padding, radius, component, @usage…). Le kit porte le tracé (`SIGNES`,
 * `svgDuSigne`) et la teinte de chaque famille ; ce fichier pose la tuile.
 * Les classes viennent de `langage.css`.
 *
 * Un signe est gris quand il montre seulement, dans la couleur de sa famille
 * quand il porte une information (`informe`). Une valeur de couleur de token
 * remplit la tuile (`valeur`) et prend le pas sur la teinte.
 */
import {
  FAMILLES_DE_SIGNES,
  REPRISES_DE_SIGNES,
  SIGNES,
  svgDuSigne,
  type IdDeFamilleDeSignes,
  type TeinteDeFamille,
} from '@ucm-kit/core/referentiel';

export type TailleDeSigne = 14 | 16 | 24;

export interface OptionsDeSigne {
  /** 16 px par défaut : la ligne de token. 24 px pour une bande de section, 14 px dans un texte ou un bouton. */
  readonly taille?: TailleDeSigne;
  /** La tuile prend la couleur de la famille. Sans teinte de famille, elle reste grise. */
  readonly informe?: boolean;
  /** Une couleur de token, écrite comme CSS la lit : elle remplit la tuile (un anneau pour `usage-stroke`). */
  readonly valeur?: string;
  /** La valeur est claire : l'encre du tracé est sombre. Sans cela, l'encre est blanche. */
  readonly clair?: boolean;
  /** Le nom du signe, quand rien d'écrit à côté ne le dit. Sans nom, la tuile est décorative. */
  readonly titre?: string;
  /** La famille qui montre le signe quand elle ne le définit pas (`REPRISES_DE_SIGNES`) : elle donne la teinte. */
  readonly famille?: IdDeFamilleDeSignes;
}

/** Le côté du tracé dans la tuile, par taille de tuile. */
const COTE_DU_TRACE: Readonly<Record<TailleDeSigne, number>> = { 14: 11, 16: 12, 24: 15 };

/** La teinte que la famille d'un signe lui donne, ou celle de la famille qui le reprend. */
export function teinteDuSigne(id: string, famille?: IdDeFamilleDeSignes): TeinteDeFamille | null {
  const signe = SIGNES.find((candidat) => candidat.id === id);
  if (!signe) throw new Error(`Signe inconnu : « ${id} ». Les identifiants admis sont ceux de SIGNES.`);
  const contexte = famille ?? signe.famille;
  if (contexte !== signe.famille && !REPRISES_DE_SIGNES.some((reprise) => reprise.famille === contexte && reprise.reprend.some((repris) => repris.id === id))) {
    throw new Error(`La famille « ${contexte} » ne montre pas le signe « ${id} » : ni elle ne le définit, ni elle ne le reprend.`);
  }
  const teinte: TeinteDeFamille | null | undefined = FAMILLES_DE_SIGNES.find((candidat) => candidat.id === contexte)?.teinte;
  return teinte ?? null;
}

export function creerSigne(id: string, { taille = 16, informe = false, valeur, clair = false, titre, famille }: OptionsDeSigne = {}): HTMLSpanElement {
  const teinte = informe && valeur === undefined ? teinteDuSigne(id, famille) : null;
  const element = document.createElement('span');
  element.className = 'signe';
  // Un littéral par classe : la loi des styles ne lit que les classes écrites en toutes lettres.
  if (taille === 14) element.classList.add('signe-14');
  if (taille === 24) element.classList.add('signe-24');
  if (valeur !== undefined) {
    element.style.setProperty('--signe-valeur', valeur);
    if (id === 'usage-stroke') element.classList.add('signe-contour');
    else element.classList.add('signe-valeur');
    if (clair) element.classList.add('signe-clair');
    else element.classList.add('signe-sombre');
  } else if (id === 'a-creer') {
    element.classList.add('signe-absent');
  }
  if (teinte) element.classList.add('signe-informe');
  if (teinte === 'couleurs') element.classList.add('signe-teinte-couleurs');
  if (teinte === 'tailles') element.classList.add('signe-teinte-tailles');
  if (teinte === 'texte') element.classList.add('signe-teinte-texte');
  if (teinte === 'tokens') element.classList.add('signe-teinte-tokens');
  if (teinte === 'variants') element.classList.add('signe-teinte-variants');
  if (teinte === 'regles') element.classList.add('signe-teinte-regles');
  if (teinte === 'a11y') element.classList.add('signe-teinte-a11y');
  if (titre) {
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', titre);
    element.setAttribute('title', titre);
  }
  // Le tracé vient du kit, jamais d'un utilisateur : l'insertion en HTML est sûre.
  element.innerHTML = svgDuSigne(id, COTE_DU_TRACE[taille]);
  return element;
}
