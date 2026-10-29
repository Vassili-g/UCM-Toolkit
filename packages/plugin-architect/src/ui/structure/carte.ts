/**
 * Les pièces que « À faire dans Figma » et les corrections de modes et de scopes se partagent : la carte qui se déplie, l'intertitre, la
 * ligne de chemin et le texte qui mêle des mots et des chemins. Les feuilles de ces classes sont dans `styles/structure.css`.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerChevron } from 'ucm-plugin-socle/src/ui/Chevron';
import { creerCheminEnPhrase } from 'ucm-plugin-socle/src/ui/Chemin';
import { creerSigne } from 'ucm-plugin-socle/src/ui/Signe';
import { TEXTES } from '../textes';
import type { Morceau } from './lecture';

/** Du texte et des chemins en phrase, dans un seul conteneur. */
export function poserLesMorceaux(parent: Node, morceaux: readonly Morceau[]): void {
  for (const morceau of morceaux) parent.appendChild(typeof morceau === 'string' ? document.createTextNode(morceau) : creerCheminEnPhrase(morceau.chemin));
}

/** Un mot cité dans une phrase : le nom d'un dossier, en police de code. */
export function creerMotCite(mot: string): HTMLElement {
  const code = document.createElement('code');
  code.className = 'mot-cite';
  code.textContent = mot;
  return code;
}

export function creerIntertitre(texte: string): HTMLElement {
  const intertitre = document.createElement('div');
  intertitre.className = 'intertitre-structure';
  const titre = document.createElement('h2');
  titre.textContent = texte;
  intertitre.append(titre);
  return intertitre;
}

export interface OptionsDuBoutonSelectionner {
  /** Les layers que la carte vise ; sans layer, la carte n'a pas de bouton. */
  readonly layers: readonly string[];
  /** Les layers que le plugin a sélectionnés depuis le dernier changement de sélection de Figma. */
  readonly selectionnes: readonly string[];
  /** La phrase de la carte, pour le nom accessible du bouton. */
  readonly phrase: string;
  readonly inactif: boolean;
  readonly selectionner: (layers: readonly string[]) => void;
}

/**
 * Le bouton Sélectionner d'une carte qui vise des layers, avec le signe de la sélection de Figma. Une fois les layers sélectionnés par
 * le plugin il dit « Sélectionnés » et se désactive, jusqu'à ce que la sélection de Figma change. `null` quand la carte ne vise aucun layer.
 */
export function creerBoutonSelectionner({ layers, selectionnes, phrase, inactif, selectionner }: OptionsDuBoutonSelectionner): HTMLButtonElement | null {
  if (layers.length === 0) return null;
  const fait = layers.every((layer) => selectionnes.includes(layer));
  const T = TEXTES.elementsDuPanneau;
  const bouton = createButton({ label: fait ? T.selectionnes : T.selectionner, variant: 'secondary', compact: true, disabled: inactif || fait, onClick: () => selectionner(layers) });
  bouton.replaceChildren(creerSigne('selection', { taille: 14 }), ...Array.from(bouton.childNodes));
  bouton.setAttribute('aria-label', fait ? T.layersSelectionnes(phrase) : T.selectionnerLesLayers(phrase));
  bouton.classList.add('bouton-selectionner');
  return bouton;
}

/** La ligne d'actions d'une carte de constat : sous le texte, alignée à gauche, hors du corps qui se déplie. `null` sans bouton. */
export function creerLigneDActions(boutons: readonly (HTMLElement | null)[]): HTMLElement | null {
  const presents = boutons.filter((bouton): bouton is HTMLElement => bouton !== null);
  if (presents.length === 0) return null;
  const ligne = document.createElement('div');
  ligne.className = 'bloc-actions';
  ligne.append(...presents);
  return ligne;
}

export interface OptionsDeCarte {
  /** La première ligne : ce que la carte dit. */
  readonly tete: readonly (string | Node)[];
  /** La ligne grise sous la première. */
  readonly meta?: readonly (string | Node)[];
  /** La case qui coche la carte ; sans elle, la tête n'a pas de colonne de case. */
  readonly caseACocher?: HTMLInputElement;
  /** Ce que la carte dévoile ; `null` quand elle n'a rien à dévoiler, et elle ne se déplie pas. */
  readonly corps: HTMLElement | null;
  readonly deplie: boolean;
  /** Appelée à chaque dépliage ou repli, avec l'état d'arrivée. */
  readonly auBasculement?: (deplie: boolean) => void;
  /**
   * Un bouton de la carte, entre la phrase et le chevron. Un bouton ne peut pas en contenir un autre : le chevron sort alors de la
   * zone cliquable de la phrase et devient un second bouton, qui déplie comme elle. `nomDuChevron` le nomme.
   */
  readonly action?: HTMLElement;
  readonly nomDuChevron?: string;
}

export interface Carte {
  readonly element: HTMLElement;
}

export function creerCarte({ tete, meta, caseACocher, corps, deplie, auBasculement, action, nomDuChevron }: OptionsDeCarte): Carte {
  const element = document.createElement('div');
  element.className = 'bloc';
  const entete = document.createElement('div');
  entete.className = 'bloc-tete';
  if (!caseACocher) entete.classList.add('sans-coche');
  const peutSeDeplier = corps !== null;
  const bouton = document.createElement(peutSeDeplier ? 'button' : 'div');
  bouton.className = 'bloc-bouton';
  if (bouton instanceof HTMLButtonElement) bouton.type = 'button';
  const pile = document.createElement('div');
  pile.className = 'bloc-pile';
  const ligne = document.createElement('span');
  ligne.className = 'bloc-ligne';
  ligne.append(...tete);
  pile.append(ligne);
  if (meta) {
    const note = document.createElement('span');
    note.className = 'meta';
    note.append(...meta);
    pile.append(note);
  }
  const droite = document.createElement('span');
  droite.className = 'bloc-droite';
  if (peutSeDeplier && !action) droite.append(creerChevron());
  bouton.append(pile);
  if (!action) bouton.append(droite);
  entete.append(...(caseACocher ? [caseACocher] : []), bouton);
  let replier: HTMLButtonElement | null = null;
  if (action) {
    entete.classList.add('avec-action');
    entete.append(action);
    if (peutSeDeplier) {
      replier = document.createElement('button');
      replier.type = 'button';
      replier.className = 'bloc-replier';
      if (nomDuChevron) replier.setAttribute('aria-label', nomDuChevron);
      replier.append(creerChevron());
      entete.append(replier);
    }
  }
  element.append(entete);

  if (corps) {
    corps.classList.add('bloc-corps');
    const regler = (ouvert: boolean): void => {
      corps.hidden = !ouvert;
      bouton.setAttribute('aria-expanded', String(ouvert));
      replier?.setAttribute('aria-expanded', String(ouvert));
    };
    regler(deplie);
    const basculer = (): void => {
      regler(corps.hidden);
      auBasculement?.(!corps.hidden);
    };
    bouton.addEventListener('click', basculer);
    replier?.addEventListener('click', basculer);
    element.append(corps);
  }
  return { element };
}
