/**
 * La chaîne au survol et au focus. Un élément qui porte `data-chaine` montre,
 * après 250 ms, toute la chaîne de sa variable dans le contexte de sa colonne
 * (`data-mode`) ou dans le contexte actif. Échap ferme la bulle ; cliquer sur
 * le nom épingle la variable dans l'inspecteur.
 */
import type { Application } from './application';
import { constatDeChaine, rendreChaine, rendreConstat } from './chaine';
import { TEXTES } from './textes';

export const DELAI_DU_SURVOL = 250;

export function installerSurvol(app: Application): HTMLDivElement {
  const bulle = document.createElement('div');
  bulle.className = 'bulle';
  bulle.id = 'bulle-chaine';
  bulle.setAttribute('role', 'tooltip');
  bulle.hidden = true;
  let minuterie: number | null = null;
  let source: HTMLElement | null = null;

  function fermer(): void {
    if (minuterie !== null) window.clearTimeout(minuterie);
    minuterie = null;
    bulle.hidden = true;
    source?.removeAttribute('aria-describedby');
    source = null;
  }

  function montrer(cible: HTMLElement): void {
    const variable = cible.dataset.chaine;
    if (!variable || !app.etat.index) return;
    const resultat = app.resultat(variable, cible.dataset.mode || null);
    const titre = document.createElement('strong');
    titre.className = 'bulle-titre';
    titre.textContent = TEXTES.chaineComplete;
    const constat = constatDeChaine(app, resultat);
    bulle.replaceChildren(titre, rendreChaine(app, resultat), ...(constat ? [rendreConstat(constat)] : []));
    bulle.hidden = false;
    cible.setAttribute('aria-describedby', bulle.id);
    const boite = cible.getBoundingClientRect();
    const taille = bulle.getBoundingClientRect();
    bulle.style.left = `${Math.max(8, Math.min(boite.left, window.innerWidth - taille.width - 8))}px`;
    const dessous = boite.bottom + 6;
    bulle.style.top = `${dessous + taille.height > window.innerHeight - 8 ? Math.max(8, boite.top - taille.height - 6) : dessous}px`;
  }

  function programmer(cible: HTMLElement): void {
    if (source === cible && !bulle.hidden) return;
    fermer();
    source = cible;
    minuterie = window.setTimeout(() => {
      minuterie = null;
      if (source === cible && cible.isConnected) montrer(cible);
    }, DELAI_DU_SURVOL);
  }

  const cibleDe = (evenement: Event): HTMLElement | null => (evenement.target instanceof Element ? evenement.target.closest<HTMLElement>('[data-chaine]') : null);

  document.addEventListener('mouseover', (evenement) => {
    const cible = cibleDe(evenement);
    if (cible) programmer(cible);
  });
  document.addEventListener('mouseout', (evenement) => {
    const cible = cibleDe(evenement);
    const vers = evenement.relatedTarget instanceof Node ? evenement.relatedTarget : null;
    if (cible && cible === source && !(vers && (cible.contains(vers) || bulle.contains(vers)))) fermer();
  });
  document.addEventListener('focusin', (evenement) => {
    const cible = cibleDe(evenement);
    if (cible) programmer(cible);
    else if (!(evenement.target instanceof Node && bulle.contains(evenement.target))) fermer();
  });
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && !bulle.hidden) fermer();
  });
  document.addEventListener('scroll', fermer, true);
  return bulle;
}
