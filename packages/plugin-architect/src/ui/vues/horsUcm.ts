/**
 * L'alerte d'un fichier que personne n'a déclaré UCM. Elle prend la place des
 * onglets de la barre latérale du mode Tokens : Corrections, Questions et À
 * faire dans Figma ne s'ouvrent qu'après la déclaration, que la Configuration
 * porte. Le bouton n'écrit rien.
 */
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import type { Application } from '../application';
import { TEXTES } from '../textes';

export function creerAlerteHorsUcm(app: Application): HTMLElement {
  const T = TEXTES.horsUcm;
  const colonne = document.createElement('div');
  colonne.className = 'container';
  colonne.hidden = true;
  const pile = document.createElement('div');
  pile.className = 'page-stack';
  const declarer = createButton({ label: T.declarer, variant: 'secondary', compact: true, onClick: () => app.ouvrirLaConfiguration() });
  pile.append(creerAlerte('info', { titre: T.titre, texte: T.texte, actions: [declarer] }));
  colonne.append(pile);
  return colonne;
}

/** Vrai quand le sandbox a annoncé un fichier sans déclaration UCM ; tant qu'il n'a rien annoncé, le fichier compte comme UCM. */
export const estHorsUcm = (architecture: string | null): boolean => architecture === 'absente' || architecture === 'libre';
