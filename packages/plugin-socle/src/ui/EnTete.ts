/**
 * Ce que l'en-tête d'un plugin partage : le bouton en forme d'engrenage qui
 * ouvre la configuration, le bouton de retour, et la bascule entre la vue de
 * travail et la configuration. Chaque plugin compose le reste de son en-tête.
 */
import { creerSvgDuSigne } from './Signe';

/**
 * L'icône de réglages : le signe `reglages` du kit (Font Awesome Free Solid 6.7.2, gear), embarqué en SVG. Dans le sandbox
 * Figma, le kit distant ne remplace pas toujours les éléments `<i>`.
 */
function createSettingsIcon(): SVGSVGElement {
  const icon = creerSvgDuSigne('reglages', 12);
  icon.setAttribute('focusable', 'false');
  return icon;
}

/**
 * Les libellés de l'engrenage ; chaque plugin peut nommer sa configuration.
 * Avec `texte`, le bouton le montre à droite de l'engrenage et ce texte est son
 * nom accessible : `etiquette` n'est alors pas posée.
 */
export interface LibellesDeLEngrenage {
  readonly etiquette: string;
  readonly infobulle: string;
  readonly texte?: string;
}

/** Le bouton en forme d'engrenage qui ouvre la configuration ([ENT-21]). */
export function createSettingsButton(
  onSettings: () => void,
  libelles: LibellesDeLEngrenage = { etiquette: 'Ouvrir la configuration', infobulle: 'Configuration' },
): HTMLButtonElement {
  const settingsButton = document.createElement('button');
  settingsButton.type = 'button';
  settingsButton.className = 'icon-button';
  settingsButton.title = libelles.infobulle;
  settingsButton.appendChild(createSettingsIcon());
  if (libelles.texte === undefined) {
    settingsButton.setAttribute('aria-label', libelles.etiquette);
  } else {
    settingsButton.classList.add('avec-libelle');
    const texte = document.createElement('span');
    texte.textContent = libelles.texte;
    settingsButton.appendChild(texte);
  }
  settingsButton.addEventListener('click', () => onSettings());
  return settingsButton;
}

/** Le bouton qui ramène de la configuration à la vue de travail, masqué au départ. */
export function createBackButton(onBack: () => void, libelle = 'Retour'): HTMLButtonElement {
  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'header-back-button';
  backButton.textContent = libelle;
  backButton.hidden = true;
  backButton.addEventListener('click', () => onBack());
  return backButton;
}

/** Les quatre éléments que la bascule montre ou masque. */
export interface ElementsDeBascule {
  travail: HTMLElement;
  configuration: HTMLElement;
  settingsButton: HTMLButtonElement;
  backButton: HTMLButtonElement;
}

/**
 * Montre la configuration : la vue de travail et l'engrenage se masquent, le
 * retour apparaît.
 */
export function montrerConfiguration({ travail, configuration, settingsButton, backButton }: ElementsDeBascule): void {
  travail.hidden = true;
  configuration.hidden = false;
  settingsButton.hidden = true;
  backButton.hidden = false;
}

/** Montre la vue de travail, l'inverse de `montrerConfiguration`. */
export function montrerTravail({ travail, configuration, settingsButton, backButton }: ElementsDeBascule): void {
  configuration.hidden = true;
  travail.hidden = false;
  settingsButton.hidden = false;
  backButton.hidden = true;
}
