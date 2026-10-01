/**
 * L'arbre des collections et des groupes, en boutons accessibles : le chevron
 * replie, le libellé choisit. Les deux gestes sont séparés : replier un parent
 * ne change pas la table. Les lignes sont virtualisées ; Haut et Bas déplacent
 * le focus d'un libellé à l'autre, Droite déplie et Gauche replie.
 */
import { lignesVisibles, type LigneDArbre } from '../groupes';
import type { Application, Composant } from './application';
import { TEXTES } from './textes';
import { creerListeVirtuelle } from './virtualisation';

export const HAUTEUR_DE_LIGNE_D_ARBRE = 24;

export function creerArbre(app: Application): Composant {
  const element = document.createElement('nav');
  element.className = 'arbre';
  element.setAttribute('aria-label', TEXTES.arbreEtiquette);
  const titre = document.createElement('h2');
  titre.className = 'surtitre';
  titre.textContent = TEXTES.arbreEtiquette;
  const liste = creerListeVirtuelle(HAUTEUR_DE_LIGNE_D_ARBRE, 'list');
  liste.element.classList.add('arbre-lignes');
  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = TEXTES.arbreNote;
  element.append(titre, liste.element, note);

  let lignes: LigneDArbre[] = [];

  function libelleDe(ligne: LigneDArbre): string {
    return ligne.noeud.libelle === '' ? TEXTES.segmentVide : ligne.noeud.libelle;
  }

  function cheminLisible(ligne: LigneDArbre): string {
    const collection = app.etat.index?.collections.get(ligne.noeud.collection)?.nom ?? '';
    return [collection, ...ligne.noeud.segments.map((segment) => segment || TEXTES.segmentVide)].join(' / ');
  }

  function rendreLigne(rang: number): HTMLElement {
    const ligne = lignes[rang];
    const { etat } = app;
    const rangee = document.createElement('div');
    rangee.className = 'arbre-ligne';
    rangee.setAttribute('role', 'listitem');
    rangee.style.paddingLeft = `${ligne.profondeur * 12}px`;
    if (ligne.aDesEnfants) {
      const chevron = document.createElement('button');
      chevron.type = 'button';
      chevron.className = 'chevron';
      chevron.textContent = ligne.deplie ? '▾' : '▸';
      chevron.setAttribute('aria-expanded', String(ligne.deplie));
      chevron.setAttribute('aria-label', ligne.deplie ? TEXTES.replier(cheminLisible(ligne)) : TEXTES.deplier(cheminLisible(ligne)));
      chevron.dataset.focus = `chevron:${ligne.noeud.cle}`;
      chevron.tabIndex = -1;
      chevron.addEventListener('click', () => app.basculerRepli(ligne.noeud.cle));
      rangee.append(chevron);
    } else {
      const espace = document.createElement('span');
      espace.className = 'chevron-vide';
      rangee.append(espace);
    }
    const choix = document.createElement('button');
    choix.type = 'button';
    choix.className = 'arbre-choix';
    choix.dataset.focus = `choix:${ligne.noeud.cle}`;
    choix.dataset.rang = String(rang);
    const actif = !etat.position.recherche && etat.position.collection === ligne.noeud.collection && etat.position.groupe.length === ligne.noeud.segments.length && etat.position.groupe.every((segment, profondeur) => segment === ligne.noeud.segments[profondeur]);
    if (actif) choix.setAttribute('aria-current', 'true');
    const libelle = document.createElement('span');
    libelle.className = 'arbre-libelle';
    libelle.classList.toggle('segment-vide', ligne.noeud.libelle === '');
    libelle.textContent = libelleDe(ligne);
    const compte = document.createElement('span');
    compte.className = 'arbre-compte';
    compte.textContent = String(ligne.noeud.total);
    choix.append(libelle);
    if (ligne.profondeur === 0) {
      const collection = etat.index?.collections.get(ligne.noeud.collection);
      if (collection?.distante || collection?.extension) {
        const marque = document.createElement('span');
        marque.className = 'pastille-texte';
        marque.textContent = collection.extension ? TEXTES.etendue : TEXTES.distante;
        choix.append(marque);
      }
    }
    choix.append(compte);
    choix.title = cheminLisible(ligne);
    choix.addEventListener('click', () => app.ouvrirGroupe(ligne.noeud.collection, ligne.noeud.segments));
    choix.addEventListener('keydown', (evenement) => {
      const deplacements: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
      if (evenement.key in deplacements) {
        evenement.preventDefault();
        const cible = Math.max(0, Math.min(lignes.length - 1, rang + deplacements[evenement.key]));
        liste.montrer(cible);
        liste.element.querySelector<HTMLElement>(`[data-rang="${cible}"]`)?.focus();
      } else if ((evenement.key === 'ArrowRight' && !ligne.deplie) || (evenement.key === 'ArrowLeft' && ligne.deplie)) {
        if (!ligne.aDesEnfants) return;
        evenement.preventDefault();
        app.basculerRepli(ligne.noeud.cle);
      }
    });
    rangee.append(choix);
    return rangee;
  }

  return {
    element,
    mettreAJour() {
      lignes = lignesVisibles(app.etat.arbres, app.etat.replies);
      liste.poser(lignes.length, rendreLigne, true);
    },
  };
}
