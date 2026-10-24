/**
 * Les pièces que « À faire dans Figma » et les corrections de modes et de scopes se partagent : la carte qui se déplie, l'intertitre, la
 * ligne de chemin et le texte qui mêle des mots et des chemins. Les feuilles de ces classes sont dans `styles/structure.css`.
 */
import { creerChevron } from 'ucm-plugin-socle/src/ui/Chevron';
import { creerCheminEnPhrase } from 'ucm-plugin-socle/src/ui/Chemin';
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
