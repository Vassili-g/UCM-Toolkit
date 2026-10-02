/**
 * La barre du haut : le produit, la bascule entre l'explorateur de tokens et
 * la vue composant, puis la lecture du relevé. Actualiser et Annuler portent
 * sur le relevé des variables : la disposition étroite ne les montre pas.
 */
import type { Disposition } from '../fenetre';
import type { Application, Composant } from './application';
import { TEXTES } from './textes';

const DISPOSITIONS: readonly Disposition[] = ['large', 'etroite'];

export function creerBarre(app: Application): Composant {
  const element = document.createElement('header');
  element.className = 'barre';

  const produit = document.createElement('div');
  produit.className = 'produit';
  const logo = document.createElement('span');
  logo.className = 'logo';
  logo.textContent = TEXTES.marque;
  logo.setAttribute('aria-hidden', 'true');
  const nom = document.createElement('h1');
  nom.className = 'produit-nom';
  nom.textContent = TEXTES.produit;
  produit.append(logo, nom);

  const bascule = document.createElement('div');
  bascule.className = 'bascule';
  bascule.setAttribute('role', 'group');
  bascule.setAttribute('aria-label', TEXTES.modes.etiquette);
  const choix = DISPOSITIONS.map((disposition) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bascule-choix';
    bouton.dataset.mode = disposition;
    bouton.textContent = TEXTES.modes.noms[disposition];
    bouton.title = TEXTES.modes.aides[disposition];
    bouton.addEventListener('click', () => app.changerDisposition(disposition));
    bascule.append(bouton);
    return { disposition, bouton };
  });

  const lecture = document.createElement('div');
  lecture.className = 'barre-lecture';

  const actualiser = document.createElement('button');
  actualiser.type = 'button';
  actualiser.className = 'bouton-discret';
  actualiser.textContent = TEXTES.actualiser;
  actualiser.title = TEXTES.actualiserAide;
  actualiser.addEventListener('click', () => app.actualiser());

  const annuler = document.createElement('button');
  annuler.type = 'button';
  annuler.className = 'bouton-discret';
  annuler.textContent = TEXTES.annuler;
  annuler.addEventListener('click', () => app.annulerLecture());

  lecture.append(actualiser, annuler);
  element.append(produit, bascule, lecture);

  return {
    element,
    mettreAJour() {
      const { etat } = app;
      for (const { disposition, bouton } of choix) bouton.setAttribute('aria-pressed', String(etat.disposition === disposition));
      lecture.hidden = etat.disposition === 'etroite';
      const enCours = etat.lecture.statut === 'en-cours';
      annuler.hidden = !enCours;
      actualiser.disabled = enCours;
    },
  };
}
