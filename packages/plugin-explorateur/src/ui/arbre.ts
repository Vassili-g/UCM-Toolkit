/**
 * L'arbre des collections et des groupes, sous la recherche qui porte sur
 * toutes les collections. Les lignes sont des boutons accessibles : le chevron
 * replie, le libellé choisit. Les deux gestes sont séparés : replier un parent
 * ne change pas la table. Les lignes sont virtualisées ; Haut et Bas déplacent
 * le focus d'un libellé à l'autre, Droite déplie et Gauche replie.
 */
import { lignesVisibles, type LigneDArbre } from '../groupes';
import type { Application, Composant } from './application';
import { creerPoignee } from './poignee';
import { TEXTES } from './textes';
import { creerListeVirtuelle } from './virtualisation';

export const HAUTEUR_DE_LIGNE_D_ARBRE = 28;

/** Les bornes de la largeur réglée, en pixels. La feuille la borne aussi à une part de la fenêtre. */
const LARGEUR_MINIMALE = 140;
const LARGEUR_MAXIMALE = 480;

export function creerArbre(app: Application): Composant {
  const element = document.createElement('nav');
  element.className = 'arbre';
  element.setAttribute('aria-label', TEXTES.arbreEtiquette);
  const titre = document.createElement('h2');
  titre.className = 'surtitre';
  titre.textContent = TEXTES.arbreEtiquette;
  const liste = creerListeVirtuelle(HAUTEUR_DE_LIGNE_D_ARBRE, 'list');
  liste.element.classList.add('arbre-lignes');
  const recherche = document.createElement('input');
  recherche.type = 'search';
  recherche.className = 'recherche';
  recherche.placeholder = TEXTES.rechercher;
  recherche.title = TEXTES.rechercheAide;
  recherche.setAttribute('aria-label', TEXTES.rechercheEtiquette);
  recherche.addEventListener('input', () => app.rechercher(recherche.value));
  recherche.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && recherche.value) {
      recherche.value = '';
      app.rechercher('');
    }
  });

  /** La largeur réglée se pose sur la racine : la grille de `.corps` la lit, et prend son défaut sans elle. */
  function poserLargeur(largeur: number | undefined): void {
    if (largeur === undefined) document.documentElement.style.removeProperty('--largeur-arbre');
    else document.documentElement.style.setProperty('--largeur-arbre', `${Math.max(LARGEUR_MINIMALE, Math.min(LARGEUR_MAXIMALE, largeur))}px`);
  }

  function rangerLargeur(largeur: number | undefined): void {
    const { arbre: _retiree, ...autres } = app.etat.preferences.largeurs;
    app.rangerPreferences({ ...app.etat.preferences, largeurs: largeur === undefined ? autres : { ...autres, arbre: largeur } });
  }

  const poignee = creerPoignee({
    etiquette: TEXTES.largeurDeLArbre,
    infobulle: TEXTES.largeurAide,
    min: LARGEUR_MINIMALE,
    max: LARGEUR_MAXIMALE,
    lire: () => element.getBoundingClientRect().width,
    poser(largeur, fin) {
      poserLargeur(largeur);
      if (fin) rangerLargeur(largeur);
    },
    retablir() {
      poserLargeur(undefined);
      rangerLargeur(undefined);
    },
  });
  element.append(titre, recherche, liste.element, poignee);

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
    rangee.style.setProperty('--profondeur', String(ligne.profondeur));
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
    choix.classList.toggle('arbre-groupe', ligne.profondeur > 0);
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
      poserLargeur(app.etat.preferences.largeurs.arbre);
      if (recherche.value !== app.etat.position.recherche) recherche.value = app.etat.position.recherche;
      recherche.disabled = !app.etat.index;
      lignes = lignesVisibles(app.etat.arbres, app.etat.replies);
      liste.poser(lignes.length, rendreLigne, true);
    },
  };
}
