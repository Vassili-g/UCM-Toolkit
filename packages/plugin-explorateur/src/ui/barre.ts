/**
 * La barre du haut : le produit, Retour, le contexte des collections, la
 * recherche globale et la lecture du relevé. Le contexte propose un choix par
 * famille qui a plus d'un mode ; une famille à un seul mode n'a rien à choisir.
 */
import { familles, modesDeFamille, type Index } from '../indexation';
import type { Contexte } from '../resolution';
import type { Application, Composant } from './application';
import { TEXTES } from './textes';

/** Les sélecteurs de mode d'un contexte, un par famille à plusieurs modes. */
export function selecteursDeContexte(index: Index, contexte: Contexte, cote: 'A' | 'B', changer: (famille: string, mode: string) => void): HTMLElement[] {
  return familles(index).flatMap((famille) => {
    const modes = modesDeFamille(index, famille.id);
    if (modes.length < 2) return [];
    const champ = document.createElement('label');
    champ.className = 'contexte-champ';
    const nom = document.createElement('span');
    nom.className = 'contexte-nom';
    nom.textContent = famille.nom;
    const choix = document.createElement('select');
    choix.className = 'choix';
    choix.dataset.famille = famille.id;
    choix.dataset.cote = cote;
    choix.setAttribute('aria-label', cote === 'A' ? TEXTES.contexteDeFamille(famille.nom) : TEXTES.contexteBEtiquette(famille.nom));
    const retenu = contexte[famille.id] ?? famille.modeParDefaut;
    for (const { collection, mode } of modes) {
      const option = document.createElement('option');
      option.value = mode.id;
      const libelle = collection.id === famille.id ? mode.nom : `${collection.nom} · ${mode.nom}`;
      option.textContent = mode.id === famille.modeParDefaut ? TEXTES.defautDeFamille(libelle) : libelle;
      option.selected = mode.id === retenu;
      choix.append(option);
    }
    choix.addEventListener('change', () => changer(famille.id, choix.value));
    champ.append(nom, choix);
    return [champ];
  });
}

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

  const retour = document.createElement('button');
  retour.type = 'button';
  retour.className = 'bouton-discret';
  retour.textContent = TEXTES.retour;
  retour.title = TEXTES.retourAide;
  retour.addEventListener('click', () => app.retour());

  const contextes = document.createElement('div');
  contextes.className = 'contextes';
  contextes.setAttribute('role', 'group');
  contextes.setAttribute('aria-label', TEXTES.contexteEtiquette);

  const recherche = document.createElement('input');
  recherche.type = 'search';
  recherche.className = 'recherche';
  recherche.placeholder = TEXTES.rechercher;
  recherche.setAttribute('aria-label', TEXTES.rechercheEtiquette);
  recherche.addEventListener('input', () => app.rechercher(recherche.value));
  recherche.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && recherche.value) {
      recherche.value = '';
      app.rechercher('');
    }
  });

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

  element.append(produit, retour, contextes, recherche, actualiser, annuler);

  return {
    element,
    mettreAJour() {
      const { etat } = app;
      retour.disabled = etat.historique.length === 0;
      const enCours = etat.lecture.statut === 'en-cours';
      annuler.hidden = !enCours;
      actualiser.disabled = enCours;
      if (recherche.value !== etat.position.recherche) recherche.value = etat.position.recherche;
      recherche.disabled = !etat.index;
      const focus = document.activeElement instanceof HTMLSelectElement && contextes.contains(document.activeElement) ? document.activeElement.dataset.famille : undefined;
      contextes.replaceChildren(...(etat.index ? selecteursDeContexte(etat.index, etat.contexte, 'A', (famille, mode) => app.changerContexte(famille, mode, 'A')) : []));
      if (focus) contextes.querySelector<HTMLSelectElement>(`select[data-famille="${CSS.escape(focus)}"]`)?.focus();
    },
  };
}
